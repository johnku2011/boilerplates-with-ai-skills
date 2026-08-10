import type { ReactNode } from "react";

export const metadata = {
  title: "nextjs-ai-app",
  description: "AI product starter scaffolded by boilerplates-with-ai-skills",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
