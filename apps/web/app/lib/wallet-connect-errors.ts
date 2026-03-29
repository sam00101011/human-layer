export function getWalletConnectErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const shortMessage = "shortMessage" in error ? error.shortMessage : null;
    if (typeof shortMessage === "string" && shortMessage.trim()) {
      if (/user rejected/i.test(shortMessage)) {
        return "Passkey wallet connection was canceled.";
      }
      return shortMessage;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('dependency "@coinbase/wallet-sdk" not found')) {
      return "Coinbase Smart Wallet SDK is missing from this build. Refresh the page after the latest deploy and try again.";
    }

    if (/user rejected|user denied|request rejected|user closed modal/i.test(error.message)) {
      return "Passkey wallet connection was canceled.";
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  return "Could not connect your passkey wallet.";
}
