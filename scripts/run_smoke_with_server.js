import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = String(process.env.PLAYWRIGHT_SMOKE_PORT || 5199);

function waitForServerReady(serverProc, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Server start timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    serverProc.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Server exited before ready (code=${code}, signal=${signal})`));
    });

    serverProc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (text.includes(`http://localhost:${port}`) && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    });

    serverProc.stderr.on("data", (chunk) => {
      process.stderr.write(chunk.toString());
    });
  });
}

function runPlaywrightSmoke() {
  return new Promise((resolve, reject) => {
    const args = [
      "scripts/web_game_playwright_client.js",
      "--url",
      `http://localhost:${port}`,
      "--actions-file",
      "references/action_payloads.json",
      "--click-selector",
      "#start-btn",
      "--iterations",
      "2",
      "--pause-ms",
      "250",
      "--screenshot-dir",
      "output/web-game/smoke-prepush",
    ];

    const testProc = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
    });

    testProc.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Playwright smoke failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const serverProc = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: { ...process.env, PORT: port },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServerReady(serverProc, 7000);
    await runPlaywrightSmoke();
  } finally {
    if (!serverProc.killed) {
      serverProc.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
