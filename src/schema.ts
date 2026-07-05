import { z } from "zod";
import { KNOWN_AGENTS } from "./agents.js";

const agentEnum = z.enum(KNOWN_AGENTS as [string, ...string[]]);

export const boilerplateManifestSchema = z.object({
  name: z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "name must be lowercase alphanumeric words separated by single hyphens",
    ),
  description: z.string().min(1).max(1024),
  stack: z.string().min(1),
  version: z.string().min(1),
  defaultAgents: z.array(agentEnum).nonempty(),
  skills: z
    .array(
      z.object({
        name: z
          .string()
          .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "skill name must be lowercase-hyphen-case"),
        /** `local` = boilerplates/<name>/skills/; `shared` = shared/skills/ (catalog-only). */
        source: z.enum(["local", "shared"]).default("local"),
      }),
    )
    .default([]),
});

export type BoilerplateManifest = z.infer<typeof boilerplateManifestSchema>;

export const scanStatusSchema = z.enum(["pending", "passed", "failed", "skipped"]);
export type ScanStatus = z.infer<typeof scanStatusSchema>;

export const lockedSkillSchema = z.object({
  name: z.string(),
  source: z.string(),
  sha256: z.string(),
  installedTo: z.array(z.string()),
  scan: z.object({
    status: scanStatusSchema,
    riskScore: z.number().nullable(),
    scanMode: z.enum(["static", "llm"]).nullable(),
    threshold: z.number(),
    scannedAt: z.string().nullable(),
  }),
});

export type LockedSkill = z.infer<typeof lockedSkillSchema>;

export const skillsLockSchema = z.object({
  lockfileVersion: z.literal(1),
  boilerplate: z.string(),
  generatedAt: z.string(),
  agents: z.array(agentEnum),
  skills: z.array(lockedSkillSchema),
});

export type SkillsLock = z.infer<typeof skillsLockSchema>;
