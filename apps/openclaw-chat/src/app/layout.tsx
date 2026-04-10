import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "OpenClaw IDE",
  description: "OpenClaw IDE - AI-powered development environment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="h-full">
        {children}
      </body>
    </html>
  );
}
