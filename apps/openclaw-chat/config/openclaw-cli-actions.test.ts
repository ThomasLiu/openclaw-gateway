/**
 * openclaw-cli-actions.test.ts
 * CLI 白名单安全测试
 */

import { describe, it, expect } from "vitest";
import {
  isOpenClawCliExecAction,
  getOpenClawCliExecArgv,
  getAllowedCliActions,
  ALLOWED_CLI_ACTIONS,
} from "./openclaw-cli-actions";

describe("openclaw-cli-actions", () => {
  describe("isOpenClawCliExecAction", () => {
    it("正确识别白名单动作", () => {
      expect(isOpenClawCliExecAction("agents")).toBe(true);
      expect(isOpenClawCliExecAction("agents list")).toBe(true);
      expect(isOpenClawCliExecAction("status")).toBe(true);
      expect(isOpenClawCliExecAction("version")).toBe(true);
      expect(isOpenClawCliExecAction("health")).toBe(true);
      expect(isOpenClawCliExecAction("logs")).toBe(true);
      expect(isOpenClawCliExecAction("logs tail")).toBe(true);
      expect(isOpenClawCliExecAction("config")).toBe(true);
      expect(isOpenClawCliExecAction("config get")).toBe(true);
      expect(isOpenClawCliExecAction("models")).toBe(true);
      expect(isOpenClawCliExecAction("models list")).toBe(true);
      expect(isOpenClawCliExecAction("skills")).toBe(true);
      expect(isOpenClawCliExecAction("skills list")).toBe(true);
      expect(isOpenClawCliExecAction("skills status")).toBe(true);
      expect(isOpenClawCliExecAction("sessions")).toBe(true);
      expect(isOpenClawCliExecAction("sessions list")).toBe(true);
      expect(isOpenClawCliExecAction("sessions show")).toBe(true);
    });

    it("大小写不敏感", () => {
      expect(isOpenClawCliExecAction("AGENTS")).toBe(true);
      expect(isOpenClawCliExecAction("Agents List")).toBe(true);
      expect(isOpenClawCliExecAction("STATUS")).toBe(true);
    });

    it("拒绝非白名单动作", () => {
      expect(isOpenClawCliExecAction("run")).toBe(false);
      expect(isOpenClawCliExecAction("exec")).toBe(false);
      expect(isOpenClawCliExecAction("shell")).toBe(false);
      expect(isOpenClawCliExecAction("bash")).toBe(false);
      expect(isOpenClawCliExecAction("sh")).toBe(false);
      expect(isOpenClawCliExecAction("delete")).toBe(false);
      expect(isOpenClawCliExecAction("rm")).toBe(false);
      expect(isOpenClawCliExecAction("install")).toBe(false);
      expect(isOpenClawCliExecAction("sudo")).toBe(false);
      expect(isOpenClawCliExecAction("--help")).toBe(false);
    });

    it("拒绝命令注入尝试", () => {
      expect(isOpenClawCliExecAction("agents; rm -rf /")).toBe(false);
      expect(isOpenClawCliExecAction("status && echo pwned")).toBe(false);
      expect(isOpenClawCliExecAction("version | sh")).toBe(false);
      expect(isOpenClawCliExecAction("agents\nrm -rf")).toBe(false);
      expect(isOpenClawCliExecAction("`rm -rf /`")).toBe(false);
    });

    it("边界情况", () => {
      expect(isOpenClawCliExecAction("")).toBe(false);
      expect(isOpenClawCliExecAction("   ")).toBe(false);
      expect(isOpenClawCliExecAction(" agents ")).toBe(true); // trim 后有效
      expect(isOpenClawCliExecAction(undefined as unknown as string)).toBe(false);
      expect(isOpenClawCliExecAction(null as unknown as string)).toBe(false);
    });
  });

  describe("getOpenClawCliExecArgv", () => {
    it("正确构造参数", () => {
      const argv = getOpenClawCliExecArgv("agents");
      expect(argv).toContain("agents");
      expect(argv[0]).toBe("openclaw");
    });

    it("支持带空格的 action", () => {
      const argv = getOpenClawCliExecArgv("agents list");
      expect(argv).toContain("agents");
      expect(argv).toContain("list");
    });

    it("附加额外参数", () => {
      const argv = getOpenClawCliExecArgv("agents", ["--json", "--limit=10"]);
      expect(argv).toContain("--json");
      expect(argv).toContain("--limit=10");
    });

    it("过滤空参数", () => {
      const argv = getOpenClawCliExecArgv("status", ["", "  ", "verbose"]);
      expect(argv).not.toContain("");
      expect(argv).not.toContain("  ");
      expect(argv).toContain("verbose");
    });

    it("OPENCLAW_CLI_PATH 环境变量生效", () => {
      // 注意：在测试中需要 process.env 被 mock
      const original = process.env.OPENCLAW_CLI_PATH;
      process.env.OPENCLAW_CLI_PATH = "/custom/path/openclaw";
      const argv = getOpenClawCliExecArgv("version");
      expect(argv[0]).toBe("/custom/path/openclaw");
      if (original !== undefined) {
        process.env.OPENCLAW_CLI_PATH = original;
      } else {
        delete process.env.OPENCLAW_CLI_PATH;
      }
    });
  });

  describe("getAllowedCliActions", () => {
    it("返回非空数组", () => {
      const actions = getAllowedCliActions();
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it("返回的 action 均被 isOpenClawCliExecAction 接受", () => {
      const actions = getAllowedCliActions();
      for (const action of actions) {
        expect(isOpenClawCliExecAction(action)).toBe(true);
      }
    });
  });

  describe("ALLOWED_CLI_ACTIONS", () => {
    it("包含预期的最小集合", () => {
      const actions = [...ALLOWED_CLI_ACTIONS];
      expect(actions).toContain("agents");
      expect(actions).toContain("status");
      expect(actions).toContain("version");
      expect(actions).toContain("health");
    });
  });
});
