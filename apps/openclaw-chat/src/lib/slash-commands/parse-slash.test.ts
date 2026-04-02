import { describe, it, expect } from "vitest";
import {
  getBuiltinCommands,
  parseSlashTrigger,
  computeComposerMenuState,
} from "./composer-slash-registry";

describe("composer-slash-registry", () => {
  describe("getBuiltinCommands", () => {
    it("returns at least the expected commands", () => {
      const cmds = getBuiltinCommands();
      const names = cmds.map((c) => c.name);
      expect(names).toContain("/think");
      expect(names).toContain("/focus");
      expect(names).toContain("/model");
      expect(names).toContain("/skill");
    });
  });

  describe("parseSlashTrigger", () => {
    it("detects slash command at line start", () => {
      const state = parseSlashTrigger("/foc", 4);
      expect(state?.type).toBe("slash");
      expect(state?.query).toBe("foc");
    });

    it("detects slash command after space", () => {
      const state = parseSlashTrigger("hello /mod", 10);
      expect(state?.type).toBe("slash");
      expect(state?.query).toBe("mod");
    });

    it("returns null when no trigger", () => {
      expect(parseSlashTrigger("hello world", 11)).toBeNull();
    });

    it("returns null for unmatched slash with query but no items", () => {
      // /xyzzy doesn't exist
      const state = parseSlashTrigger("/xyzzy", 6);
      // with empty query filter on non-empty input → null
      expect(state).toBeNull();
    });

    it("detects @ skill trigger", () => {
      const state = parseSlashTrigger("use @web", 8);
      expect(state?.type).toBe("skill");
      expect(state?.query).toBe("web");
    });
  });

  describe("computeComposerMenuState", () => {
    it("delegates to parseSlashTrigger", () => {
      const state = computeComposerMenuState("/foc", 4);
      expect(state?.type).toBe("slash");
    });
  });
});
