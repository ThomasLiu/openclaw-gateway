/**
 * CLI 网关状态探测
 *
 * 当 WebSocket 探测失败时，通过 CLI 命令探测网关状态
 *
 * server-only
 */

import { spawn } from "child_process";

export type CliGatewayStatus = {
  running: boolean;
  message?: string;
  version?: string;
};

/**
 * 尝试通过 openclaw CLI 检测网关状态
 */
export async function tryGatewayStatusViaCli(): Promise<CliGatewayStatus> {
  return new Promise((resolve) => {
    const cliPath = process.env.OPENCLAW_CLI_PATH ?? "openclaw";
    const proc = spawn(cliPath, ["status"], { timeout: 8000 });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", () => {
      resolve({ running: false, message: "openclaw CLI not found" });
    });

    proc.on("close", (code) => {
      const output = stdout + stderr;

      if (code === 0) {
        // 提取版本信息
        const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
        resolve({
          running: true,
          message: output.trim(),
          version: versionMatch ? versionMatch[1] : undefined,
        });
      } else if (
        output.includes("not running") ||
        output.includes("not found") ||
        output.includes("error")
      ) {
        resolve({
          running: false,
          message: output.trim(),
        });
      } else {
        resolve({
          running: false,
          message: `CLI exited with code ${code}: ${output.trim()}`,
        });
      }
    });

    setTimeout(() => {
      proc.kill();
      resolve({
        running: false,
        message: "CLI status check timed out",
      });
    }, 8000);
  });
}
