import { describe, it, expect } from "vitest";
import {
  GitHubSkillSource,
  SkillsMpSkillSource,
  searchSkills,
  type FetchLike,
} from "../src/discovery.js";

function jsonResponse(body: unknown, status = 200): ReturnType<FetchLike> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("GitHubSkillSource", () => {
  it("maps repo search results and requests recency sort", async () => {
    let calledUrl = "";
    const fetchImpl: FetchLike = (url) => {
      calledUrl = url;
      return jsonResponse({
        items: [
          {
            name: "cool-skill",
            full_name: "acme/cool-skill",
            html_url: "https://github.com/acme/cool-skill",
            stargazers_count: 42,
            pushed_at: "2026-07-01T00:00:00Z",
            description: "A cool skill",
          },
        ],
      });
    };
    const source = new GitHubSkillSource(fetchImpl, undefined);
    const results = await source.search("testing", { sort: "recent", limit: 5 });

    expect(calledUrl).toContain("topic%3Aclaude-skill");
    expect(calledUrl).toContain("sort=updated");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "cool-skill",
      fullName: "acme/cool-skill",
      stars: 42,
      updatedAt: "2026-07-01T00:00:00Z",
      source: "github",
    });
  });

  it("gives a helpful error on unauthenticated rate limit", async () => {
    const fetchImpl: FetchLike = () => jsonResponse({}, 403);
    const source = new GitHubSkillSource(fetchImpl, undefined);
    await expect(source.search("x", {})).rejects.toThrow(/rate limit/i);
  });
});

describe("SkillsMpSkillSource", () => {
  it("normalizes unix-seconds updatedAt to ISO and requires a query", async () => {
    const fetchImpl: FetchLike = () =>
      jsonResponse({
        success: true,
        data: {
          skills: [
            {
              name: "testing",
              author: "alice",
              description: "TDD helper",
              githubUrl: "https://github.com/alice/testing",
              stars: 3,
              updatedAt: "1783074096",
            },
          ],
        },
      });
    const source = new SkillsMpSkillSource(fetchImpl, undefined);

    expect(await source.search("", {})).toEqual([]); // no wildcard search

    const results = await source.search("testing", { sort: "recent" });
    expect(results[0]).toMatchObject({
      name: "testing",
      fullName: "alice/testing",
      stars: 3,
      source: "skillsmp",
    });
    expect(results[0]?.updatedAt).toBe(new Date(1783074096 * 1000).toISOString());
  });
});

describe("searchSkills aggregation", () => {
  const github = new GitHubSkillSource(
    () =>
      jsonResponse({
        items: [
          {
            name: "b",
            full_name: "o/b",
            html_url: "u",
            stargazers_count: 1,
            pushed_at: "2026-07-02T00:00:00Z",
          },
        ],
      }),
    undefined,
  );
  const failing = {
    name: "skillsmp",
    async search() {
      throw new Error("boom");
    },
  };

  it("merges, sorts by recency, and collects per-source errors", async () => {
    const { candidates, errors } = await searchSkills([github, failing], "q", {
      sort: "recent",
      limit: 10,
    });
    expect(candidates.map((c) => c.name)).toEqual(["b"]);
    expect(errors).toEqual([{ source: "skillsmp", message: "boom" }]);
  });
});
