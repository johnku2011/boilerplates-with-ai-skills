export type SortOrder = "recent" | "stars";

export interface SkillCandidate {
  /** Short skill/repo name. */
  name: string;
  /** owner/name or author/name identifier. */
  fullName: string;
  /** Canonical URL (usually a GitHub URL). */
  url: string;
  stars: number;
  /** ISO 8601 last-updated timestamp, or null if unknown. */
  updatedAt: string | null;
  source: string;
  description?: string;
}

export interface SearchOptions {
  sort?: SortOrder;
  limit?: number;
}

export interface SkillSource {
  readonly name: string;
  search(query: string, opts: SearchOptions): Promise<SkillCandidate[]>;
}

/** Minimal fetch signature so tests can inject a fake implementation. */
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

const defaultFetch: FetchLike = (url, init) => fetch(url, init) as unknown as ReturnType<FetchLike>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Discover skill repositories via the GitHub Search API. Uses repo search
 * (works unauthenticated) filtered by the `claude-skill` topic, sorted by most
 * recently pushed. Honors an optional token for higher rate limits.
 */
export class GitHubSkillSource implements SkillSource {
  readonly name = "github";

  constructor(
    private readonly fetchImpl: FetchLike = defaultFetch,
    private readonly token: string | undefined = process.env.GITHUB_TOKEN,
  ) {}

  async search(query: string, opts: SearchOptions): Promise<SkillCandidate[]> {
    const limit = clampLimit(opts.limit);
    const sort = opts.sort === "stars" ? "stars" : "updated";
    const q = [query.trim(), "topic:claude-skill"].filter(Boolean).join(" ");
    const url =
      `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}` +
      `&sort=${sort}&order=desc&per_page=${limit}`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "boilerplates-with-ai-skills",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await this.fetchImpl(url, { headers });
    if (!res.ok) {
      if (res.status === 403 && !this.token) {
        throw new Error(
          "GitHub API rate limit reached (unauthenticated). Set GITHUB_TOKEN for a higher limit.",
        );
      }
      throw new Error(`GitHub search failed: HTTP ${res.status}`);
    }
    const body = asRecord(await res.json());
    const items = Array.isArray(body.items) ? body.items : [];
    return items.slice(0, limit).map((raw): SkillCandidate => {
      const item = asRecord(raw);
      return {
        name: str(item.name) ?? "unknown",
        fullName: str(item.full_name) ?? "unknown",
        url: str(item.html_url) ?? "",
        stars: num(item.stargazers_count),
        updatedAt: str(item.pushed_at) ?? str(item.updated_at) ?? null,
        source: this.name,
        description: str(item.description),
      };
    });
  }
}

/** Discover skills via the SkillsMP marketplace REST API. */
export class SkillsMpSkillSource implements SkillSource {
  readonly name = "skillsmp";

  constructor(
    private readonly fetchImpl: FetchLike = defaultFetch,
    private readonly apiKey: string | undefined = process.env.SKILLSMP_API_KEY,
  ) {}

  async search(query: string, opts: SearchOptions): Promise<SkillCandidate[]> {
    const q = query.trim();
    if (!q) {
      // SkillsMP requires a keyword; wildcard searches are unsupported.
      return [];
    }
    const limit = clampLimit(opts.limit);
    const sortBy = opts.sort === "stars" ? "stars" : "recent";
    const url =
      `https://skillsmp.com/api/v1/skills/search?q=${encodeURIComponent(q)}` +
      `&sortBy=${sortBy}&limit=${limit}`;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const res = await this.fetchImpl(url, { headers });
    if (!res.ok) {
      throw new Error(`SkillsMP search failed: HTTP ${res.status}`);
    }
    const body = asRecord(await res.json());
    const data = asRecord(body.data);
    const skills = Array.isArray(data.skills) ? data.skills : [];
    return skills.slice(0, limit).map((raw): SkillCandidate => {
      const skill = asRecord(raw);
      const author = str(skill.author) ?? "unknown";
      const name = str(skill.name) ?? "unknown";
      return {
        name,
        fullName: `${author}/${name}`,
        url: str(skill.githubUrl) ?? str(skill.skillUrl) ?? "",
        stars: num(skill.stars),
        updatedAt: toIso(skill.updatedAt),
        source: this.name,
        description: str(skill.description),
      };
    });
  }
}

/** SkillsMP returns updatedAt as a unix-seconds string; normalize to ISO. */
function toIso(value: unknown): string | null {
  const raw = typeof value === "string" ? Number.parseInt(value, 10) : num(value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return new Date(raw * 1000).toISOString();
}

function clampLimit(limit: number | undefined): number {
  const n = limit ?? 10;
  if (Number.isNaN(n)) return 10;
  return Math.min(Math.max(1, Math.trunc(n)), 100);
}

export interface AggregateResult {
  candidates: SkillCandidate[];
  errors: Array<{ source: string; message: string }>;
}

/** Run all sources, merge, sort, and collect per-source errors without failing. */
export async function searchSkills(
  sources: SkillSource[],
  query: string,
  opts: SearchOptions,
): Promise<AggregateResult> {
  const candidates: SkillCandidate[] = [];
  const errors: AggregateResult["errors"] = [];

  const settled = await Promise.allSettled(sources.map((s) => s.search(query, opts)));
  settled.forEach((result, index) => {
    const sourceName = sources[index]?.name ?? "unknown";
    if (result.status === "fulfilled") {
      candidates.push(...result.value);
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push({ source: sourceName, message });
    }
  });

  candidates.sort((a, b) => {
    if (opts.sort === "stars") return b.stars - a.stars;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });

  const limit = clampLimit(opts.limit);
  return { candidates: candidates.slice(0, limit), errors };
}
