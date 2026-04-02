import { describe, it, expect } from "vitest";
import { isOpenClawCliExecAction, getOpenClawCliExecArgv } from "./openclaw-cli-actions";

describe("openclaw-cli-actions", () => {
  describe("isOpenClawCliExecAction", () => {
    const allowed = [
      "status",
      "version",
      "config show",
      "models list",
      "skills list",
      "agents list",
      "sessions list",
    ];

    it("returns true for allowed actions", () => {
      for (const action of allowed) {
        expect(isOpenClawCliExecAction(action)).toBe(true);
      }
    });

    it("returns true for allowed actions (case insensitive)", () => {
      expect(isOpenClawCliExecAction("STATUS")).toBe(true);
      expect(isOpenClawCliExecAction("Version")).toBe(true);
    });

    it("returns false for disallowed actions", () => {
      expect(isOpenClawCliExecAction("run")).toBe(false);
      expect(isOpenClawCliExecAction("exec rm -rf")).toBe(false);
      expect(isOpenClawCliExecAction("")).toBe(false);
    });
  });

  describe("getOpenClawCliExecArgv", () => {
    it("returns command words", () => {
      expect(getOpenClawCliExecArgv("status")).toEqual(["status"]);
      expect(getOpenClawCliExecArgv("config show")).toEqual(["config", "show"]);
    });

    it("appends boolean flags from params", () => {
      expect(getOpenClawCliExecArgv("status", { verbose: true })).toContain("--verbose");
    });

    it("appends key=value from string params", () => {
      const argv = getOpenClawCliExecArgv("config show", { format: "json" });
      expect(argv).toContain("--format");
      expect(argv).toContain("json");
    });
  });
});
