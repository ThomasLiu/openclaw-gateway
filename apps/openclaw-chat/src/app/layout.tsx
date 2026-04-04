import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// eslint-disable-next-line react-refresh/only-export-components -- Next.js App Router layout convention
export const metadata: Metadata = {
  title: "OpenClaw Gateway",
  description: "OpenClaw Gateway Chat Interface",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
