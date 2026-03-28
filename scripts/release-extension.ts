import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Args = {
  appUrl: string;
  version?: string;
};

type ExtensionPackageJson = {
  name: string;
  private: boolean;
  version: string;
  type: string;
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const rootDir = resolve(process.cwd());
const extensionDir = join(rootDir, "apps", "extension");
const extensionPackageJsonPath = join(extensionDir, "package.json");
const releaseArtifactDir = join(rootDir, "release-artifacts");
const extensionOutputDir = join(extensionDir, ".output", "chrome-mv3");
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function parseArgs(argv: string[]): Args {
  let appUrl = process.env.WXT_APP_URL ?? process.env.APP_URL ?? "";
  let version: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextArgument = argv[index + 1];

    if (argument === "--app-url" && nextArgument) {
      appUrl = nextArgument;
      index += 1;
      continue;
    }

    if (argument.startsWith("--app-url=")) {
      appUrl = argument.slice("--app-url=".length);
      continue;
    }

    if (argument === "--version" && nextArgument) {
      version = nextArgument;
      index += 1;
      continue;
    }

    if (argument.startsWith("--version=")) {
      version = argument.slice("--version=".length);
    }
  }

  if (!appUrl) {
    throw new Error("Missing app URL. Pass --app-url <url> or set WXT_APP_URL.");
  }

  try {
    new URL(appUrl);
  } catch {
    throw new Error("Invalid app URL: " + appUrl);
  }

  if (version && !versionPattern.test(version)) {
    throw new Error("Invalid extension version: " + version);
  }

  return { appUrl, version };
}

function readExtensionPackageJson() {
  return JSON.parse(readFileSync(extensionPackageJsonPath, "utf8")) as ExtensionPackageJson;
}

function writeExtensionVersion(nextVersion: string) {
  const packageJson = readExtensionPackageJson();
  if (packageJson.version === nextVersion) {
    return nextVersion;
  }

  const nextPackageJson = {
    ...packageJson,
    version: nextVersion
  };

  writeFileSync(extensionPackageJsonPath, JSON.stringify(nextPackageJson, null, 2) + "\n");
  return nextVersion;
}

function buildExtension(appUrl: string) {
  execFileSync("corepack", ["pnpm", "--filter", "@human-layer/extension", "build"], {
    cwd: rootDir,
    env: {
      ...process.env,
      WXT_APP_URL: appUrl,
      APP_URL: appUrl
    },
    stdio: "inherit"
  });
}

function readManifestVersion() {
  const manifestPath = join(extensionOutputDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version: string };
  return manifest.version;
}

function createReleaseArtifact(version: string, appUrl: string) {
  mkdirSync(releaseArtifactDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const shortSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8"
  }).trim();

  const zipFileName = `human-layer-extension-prod-${date}-v${version}-${shortSha}.zip`;
  const metadataFileName = `human-layer-extension-prod-${date}-v${version}-${shortSha}.json`;
  const zipPath = join(releaseArtifactDir, zipFileName);
  const metadataPath = join(releaseArtifactDir, metadataFileName);

  rmSync(zipPath, { force: true });
  rmSync(metadataPath, { force: true });

  execFileSync("zip", ["-qr", zipPath, "."], {
    cwd: extensionOutputDir,
    stdio: "inherit"
  });

  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        version,
        appUrl,
        gitCommit: shortSha,
        builtAt: new Date().toISOString(),
        artifact: zipFileName
      },
      null,
      2
    ) + "\n"
  );

  return { zipPath, metadataPath, shortSha };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const currentPackageJson = readExtensionPackageJson();
  const releaseVersion = args.version ?? currentPackageJson.version;

  writeExtensionVersion(releaseVersion);

  console.log("Building extension v" + releaseVersion + " against " + args.appUrl + "...");
  buildExtension(args.appUrl);

  const manifestVersion = readManifestVersion();
  if (manifestVersion !== releaseVersion) {
    throw new Error(
      "Manifest version mismatch. Expected " + releaseVersion + " but built " + manifestVersion
    );
  }

  const artifact = createReleaseArtifact(releaseVersion, args.appUrl);

  console.log("");
  console.log("Extension release bundle ready.");
  console.log("Version: " + releaseVersion);
  console.log("Commit: " + artifact.shortSha);
  console.log("App URL: " + args.appUrl);
  console.log("Zip: " + artifact.zipPath);
  console.log("Metadata: " + artifact.metadataPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
