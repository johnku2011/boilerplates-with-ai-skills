/**
 * Parse and validate agentskills.io SKILL.md frontmatter.
 * @see https://agentskills.io/specification
 */

export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  /** Experimental: space-separated pre-approved tools. */
  "allowed-tools"?: string;
}

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;
const MAX_COMPATIBILITY = 500;
/** Soft guidance from the Agent Skills progressive-disclosure model. */
export const RECOMMENDED_BODY_CHARS = 20_000;

export class SkillFrontmatterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillFrontmatterError";
  }
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Extract YAML frontmatter between leading `---` fences.
 * Supports flat scalar fields and a one-level `metadata:` string map.
 */
export function parseSkillFrontmatter(skillMd: string): SkillFrontmatter {
  const match = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    throw new SkillFrontmatterError("SKILL.md must start with YAML frontmatter (--- ... ---).");
  }

  const block = match[1] ?? "";
  const fields: Record<string, string> = {};
  const metadata: Record<string, string> = {};
  let inMetadata = false;

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const metaItem = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (inMetadata && metaItem) {
      metadata[metaItem[1]!] = unquote(metaItem[2] ?? "");
      continue;
    }

    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!top) {
      throw new SkillFrontmatterError(`Invalid frontmatter line: ${line}`);
    }
    const key = top[1]!;
    const value = top[2] ?? "";
    if (key === "metadata") {
      inMetadata = true;
      if (value.trim() !== "" && value.trim() !== "|" && value.trim() !== ">") {
        throw new SkillFrontmatterError(
          "metadata must be a nested map (metadata: then indented keys).",
        );
      }
      continue;
    }
    inMetadata = false;
    fields[key] = unquote(value);
  }

  const name = fields.name?.trim() ?? "";
  const description = fields.description?.trim() ?? "";
  if (!name) throw new SkillFrontmatterError("Frontmatter requires non-empty name.");
  if (!description) throw new SkillFrontmatterError("Frontmatter requires non-empty description.");

  const result: SkillFrontmatter = { name, description };
  if (fields.license) result.license = fields.license;
  if (fields.compatibility) result.compatibility = fields.compatibility;
  if (fields["allowed-tools"]) result["allowed-tools"] = fields["allowed-tools"];
  if (Object.keys(metadata).length > 0) result.metadata = metadata;
  return result;
}

export interface AssertSkillCompliantOptions {
  /** Directory name must match frontmatter name (agentskills.io). */
  directoryName?: string;
  /** When true, require at least one of license | compatibility | metadata | allowed-tools. */
  requireEnrichment?: boolean;
}

/** Validate frontmatter against agentskills.io constraints. */
export function assertSkillCompliant(
  skillMd: string,
  opts: AssertSkillCompliantOptions = {},
): SkillFrontmatter {
  const fm = parseSkillFrontmatter(skillMd);

  if (fm.name.length > MAX_NAME) {
    throw new SkillFrontmatterError(`name exceeds ${MAX_NAME} characters.`);
  }
  if (!NAME_RE.test(fm.name)) {
    throw new SkillFrontmatterError(
      `name must be lowercase alphanumeric with single hyphens (got "${fm.name}").`,
    );
  }
  if (opts.directoryName && opts.directoryName !== fm.name) {
    throw new SkillFrontmatterError(
      `name "${fm.name}" must match directory name "${opts.directoryName}".`,
    );
  }
  if (fm.description.length > MAX_DESCRIPTION) {
    throw new SkillFrontmatterError(`description exceeds ${MAX_DESCRIPTION} characters.`);
  }
  if (fm.compatibility && fm.compatibility.length > MAX_COMPATIBILITY) {
    throw new SkillFrontmatterError(`compatibility exceeds ${MAX_COMPATIBILITY} characters.`);
  }

  if (opts.requireEnrichment) {
    const enriched =
      Boolean(fm.license) ||
      Boolean(fm.compatibility) ||
      Boolean(fm["allowed-tools"]) ||
      Boolean(fm.metadata && Object.keys(fm.metadata).length > 0);
    if (!enriched) {
      throw new SkillFrontmatterError(
        "Catalog skills should declare at least one of: license, compatibility, metadata, allowed-tools.",
      );
    }
  }

  const body = skillMd.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  if (body.length > RECOMMENDED_BODY_CHARS) {
    throw new SkillFrontmatterError(
      `SKILL.md body is ${body.length} chars; keep under ~${RECOMMENDED_BODY_CHARS} and move depth to references/.`,
    );
  }

  return fm;
}
