import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@openedit/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenEdit with Next.js",
  description: "The OpenEdit rich text editor in a Next.js App Router page.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
