type ProcessEnvShape = {
  WXT_APP_URL?: string;
  APP_URL?: string;
};

function getProcessEnv(): ProcessEnvShape | undefined {
  const maybeProcess = (globalThis as { process?: { env?: ProcessEnvShape } }).process;
  return maybeProcess?.env;
}

export function resolveAppUrl(processEnv: ProcessEnvShape | undefined): string {
  return processEnv?.WXT_APP_URL ?? processEnv?.APP_URL ?? "http://127.0.0.1:3000";
}

export const appUrl = resolveAppUrl(getProcessEnv());
