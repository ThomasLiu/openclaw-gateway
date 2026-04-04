// page.tsx - Next.js App Router 页面，直接渲染客户端组件 ChatApp
// 'use client' 指令在 ChatApp 组件内部
import ChatApp from "@/components/ChatApp";

export default function HomePage() {
  return <ChatApp />;
}
