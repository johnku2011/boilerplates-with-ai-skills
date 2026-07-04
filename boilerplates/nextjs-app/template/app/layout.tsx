import type { ReactNode } from "react";

export const metadata = {
  title: "nextjs-app",
  description: "Scaffolded by boilerplates-with-ai-skills",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
