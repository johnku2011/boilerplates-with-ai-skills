import { z } from "zod";
import { tool } from "ai";

/** Example tool with a Zod schema — replace with product tools. */
export const getWeather = tool({
  description: "Get a short weather summary for a city (demo tool).",
  parameters: z.object({
    city: z.string().min(1).describe("City name"),
  }),
  execute: async ({ city }) => {
    return {
      city,
      summary: `Demo forecast for ${city}: mild, partly cloudy.`,
      celsius: 22,
    };
  },
});

export const demoTools = {
  getWeather,
};
