"use client";

import { useState, useEffect, useCallback } from "react";

// ==================== 断点常量 ====================

export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1200,
} as const;

export type Breakpoint = "mobile" | "tablet" | "desktop";

export interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: "portrait" | "landscape";
  shouldShowLeftSidebar: boolean;
  shouldShowRightSidebar: boolean;
}

function getOrientation(): "portrait" | "landscape" {
  return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
}

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.MOBILE) return "mobile";
  if (width < BREAKPOINTS.TABLET) return "tablet";
  return "desktop";
}

function detectTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints
    navigator.msMaxTouchPoints > 0
  );
}

function computeState(): ResponsiveState {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const bp = getBreakpoint(w);

  return {
    width: w,
    height: h,
    breakpoint: bp,
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop",
    isTouchDevice: detectTouchDevice(),
    orientation: getOrientation(),
    shouldShowLeftSidebar: bp !== "mobile",
    shouldShowRightSidebar: bp === "desktop",
  };
}

const initialState: ResponsiveState = {
  width: 0,
  height: 0,
  breakpoint: "desktop",
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouchDevice: false,
  orientation: "landscape",
  shouldShowLeftSidebar: true,
  shouldShowRightSidebar: true,
};

// ==================== useResponsive Hook ====================

/**
 * 响应式布局 Hook
 *
 * 功能：
 * - 监听窗口尺寸变化，自动计算当前断点（mobile/tablet/desktop）
 * - 提供侧边栏显示建议（shouldShowLeftSidebar / shouldShowRightSidebar）
 * - 检测触摸设备能力
 * - 提供屏幕方向信息
 *
 * 断点规则：
 * - mobile:   < 768px   → 左右侧栏均为抽屉模式
 * - tablet:   768-1199px → 左侧栏图标模式，右侧栏隐藏
 * - desktop:  >= 1200px  → 三栏完整展示
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(initialState);

  useEffect(() => {
    setState(computeState());

    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setState(computeState());
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    // Also listen for orientation change on mobile
    window.addEventListener("orientationchange", handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return state;
}

export default useResponsive;
