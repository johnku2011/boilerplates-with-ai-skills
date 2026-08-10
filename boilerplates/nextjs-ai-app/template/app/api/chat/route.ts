import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { demoTools } from "../../../lib/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY. Copy .env.example to .env.local." },
      { status: 500 },
    );
  }

  const { messages } = (await req.json()) as {
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  };

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system:
      "You are a helpful assistant in a Next.js AI starter. Prefer concise answers. Use tools when they improve accuracy.",
    messages,
    tools: demoTools,
    maxSteps: 3,
  });

  return result.toDataStreamResponse();
}
