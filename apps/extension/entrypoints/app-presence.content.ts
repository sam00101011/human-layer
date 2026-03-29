const appUrl = __HUMAN_LAYER_APP_URL__ as string;
const appOrigin = new URL(appUrl).origin;

export default defineContentScript({
  matches: [`${appOrigin}/*`],
  runAt: "document_idle",
  main(ctx) {
    function announceInstalled() {
      window.postMessage(
        {
          type: "human-layer-extension-installed"
        },
        appOrigin
      );
    }

    announceInstalled();

    ctx.addEventListener(window, "wxt:locationchange", () => {
      announceInstalled();
    });
  }
});
