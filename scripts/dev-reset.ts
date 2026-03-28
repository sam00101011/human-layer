import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, openSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const rootDir = resolve(process.cwd());
const outputDir = join(rootDir, "output", "dev");

type DevProcess = {
  command: string;
  pid: number;
};

function listWorkspaceDevProcesses() {
  const output = execFileSync("ps", ["-axo", "pid=,command="], {
    cwd: rootDir,
    encoding: "utf8"
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.*)$/);
      if (!match) return null;
      return { pid: Number(match[1]), command: match[2] } satisfies DevProcess;
    })
    .filter((entry): entry is DevProcess => Boolean(entry))
    .filter((entry) => {
      if (!entry.command.includes(rootDir)) return false;
      return (
        entry.command.includes("@human-layer/web dev") ||
        entry.command.includes("next dev -H 127.0.0.1 -p 3000") ||
        entry.command.includes("@human-layer/extension dev") ||
        entry.command.includes("pnpm exec wxt")
      );
    });
}

function stopWorkspaceDevProcesses() {
  const processes = listWorkspaceDevProcesses();
  for (const processInfo of processes) {
    try {
      process.kill(processInfo.pid, "SIGTERM");
    } catch {}
  }
}

function cleanArtifacts() {
  rmSync(join(rootDir, "apps", "web", ".next"), { force: true, recursive: true });
  rmSync(join(rootDir, "apps", "extension", ".output"), { force: true, recursive: true });

  const extensionDir = join(rootDir, "apps", "extension");
  for (const entry of readdirSync(extensionDir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith(".output.stale.")) {
      rmSync(join(extensionDir, entry.name), { force: true, recursive: true });
    }
  }
}

function startProcess(name: string, args: string[], env?: Record<string, string>) {
  mkdirSync(outputDir, { recursive: true });
  const logPath = join(outputDir, name + ".log");
  writeFileSync(logPath, "");
  const logFd = openSync(logPath, "a");
  const child = spawn("corepack", args, {
    cwd: rootDir,
    detached: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", logFd, logFd]
  });
  child.unref();
  return { logPath, pid: child.pid ?? -1 };
}

async function waitForHttp(url: string, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await fetch(url);
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error("Timed out waiting for " + url);
}

async function main() {
  console.log("Stopping existing Human Layer dev processes...");
  stopWorkspaceDevProcesses();
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));

  console.log("Clearing web and extension build artifacts...");
  cleanArtifacts();

  console.log("Starting web and extension dev servers...");
  const web = startProcess("web", ["pnpm", "--filter", "@human-layer/web", "dev"]);
  const extension = startProcess(
    "extension",
    ["pnpm", "--filter", "@human-layer/extension", "dev"],
    { WXT_APP_URL: "http://127.0.0.1:3000" }
  );

  await waitForHttp("http://127.0.0.1:3000/", 30000);
  const lookupResponse = await waitForHttp(
    "http://127.0.0.1:3000/api/pages/lookup?url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js",
    30000
  );
  await waitForHttp("http://127.0.0.1:3001/", 30000).catch(() => null);

  if (!lookupResponse.ok) {
    throw new Error(
      "Lookup route is still unhealthy (" + lookupResponse.status + "). See " + web.logPath
    );
  }

  console.log("");
  console.log("Human Layer dev reset complete.");
  console.log("Web PID: " + web.pid + "  Log: " + web.logPath);
  console.log("Extension PID: " + extension.pid + "  Log: " + extension.logPath);
  console.log(
    "Reload the unpacked extension from apps/extension/.output/chrome-mv3-dev if Chrome still looks stale."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
