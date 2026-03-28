declare const __HUMAN_LAYER_APP_URL__: string | undefined;

type ProcessEnvShape = {
  WXT_APP_URL?: string;
  APP_URL?: string;
};

function getInjectedAppUrl() {
  return typeof __HUMAN_LAYER_APP_URL__ === "string" && __HUMAN_LAYER_APP_URL__.length > 0
    ? __HUMAN_LAYER_APP_URL__
    : undefined;
}

export function resolveAppUrl(
  processEnv: ProcessEnvShape | undefined,
  injectedAppUrl?: string
): string {
  return injectedAppUrl ?? processEnv?.WXT_APP_URL ?? processEnv?.APP_URL ?? "http://127.0.0.1:3000";
}

export const appUrl = resolveAppUrl(undefined, getInjectedAppUrl());
