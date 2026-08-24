import { z } from "zod";
import { KNOWN_AGENTS } from "./agents.js";

const agentEnum = z.enum(KNOWN_AGENTS as [string, ...string[]]);
const catalogNameSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "name must be lowercase-hyphen-case");

export const boilerplateManifestSchema = z.object({
  name: catalogNameSchema,
  description: z.string().min(1).max(1024),
  stack: z.string().min(1),
  version: z.string().min(1),
  defaultAgents: z.array(agentEnum).nonempty(),
  skills: z
    .array(
      z.object({
        name: catalogNameSchema,
        /** `local` = boilerplates/<name>/skills/; `shared` = shared/skills/ (catalog-only). */
        source: z.enum(["local", "shared"]).default("local"),
      }),
    )
    .default([]),
  workflow: z
    .object({
      name: catalogNameSchema,
      /** `local` → boilerplates/<name>/workflow/; `shared` → shared/workflows/ (catalog-only). */
      source: z.enum(["local", "shared"]).default("shared"),
    })
    .optional(),
});

export type BoilerplateManifest = z.infer<typeof boilerplateManifestSchema>;

export const workflowManifestSchema = z
  .object({
    schemaVersion: z.string().min(1),
    name: catalogNameSchema,
    version: z.string().min(1),
    description: z.string().min(1),
    skills: z.array(z.object({ source: z.string().min(1), repo: z.string().min(1).optional() })),
    steps: z.array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        skill: z.string().min(1),
        gate: z.string().min(1).optional(),
      }),
    ),
  })
  .superRefine((workflow, ctx) => {
    const seen = new Set<string>();
    for (const [index, step] of workflow.steps.entries()) {
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", index, "id"],
          message: "step id must be unique",
        });
      }
      seen.add(step.id);
    }
  });

export type WorkflowManifest = z.infer<typeof workflowManifestSchema>;

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
