type ProcessEnvShape = {
  WXT_APP_URL?: string;
  APP_URL?: string;
};

function getBuildEnv(): ProcessEnvShape | undefined {
  if (typeof import.meta === "undefined") {
    return undefined;
  }

  return (import.meta as ImportMeta & { env?: ProcessEnvShape }).env;
}

export function resolveAppUrl(processEnv: ProcessEnvShape | undefined): string {
  return processEnv?.WXT_APP_URL ?? processEnv?.APP_URL ?? "http://127.0.0.1:3000";
}

export const appUrl = resolveAppUrl(getBuildEnv());
