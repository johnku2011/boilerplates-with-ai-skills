"use client";

import { useChat } from "ai/react";

export default function Home() {
  const { messages, input, setInput, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
  });

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: "0.25rem" }}>nextjs-ai-app</h1>
      <p style={{ color: "#444", marginTop: 0 }}>
        Scaffolded by <strong>boilerplates-with-ai-skills</strong> with Vercel AI SDK
        chat + Zod tools.
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          minHeight: 240,
          marginBottom: "1rem",
          background: "#fafafa",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#666" }}>Ask something — try “Weather in Lisbon?”</p>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: "0.75rem" }}>
            <strong>{m.role === "user" ? "You" : "Assistant"}</strong>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {error && <p style={{ color: "#b00020" }}>{error.message}</p>}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          disabled={isLoading}
          style={{ flex: 1, padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: "0.6rem 1rem",
            borderRadius: 6,
            border: "1px solid #222",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>
    </main>
  );
}
