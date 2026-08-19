import type { ErrorNotificationOptions } from "../ui/user-notifications";

function handleAuthenticationError(): ErrorNotificationOptions {
  return {
    title: "🔑 Authentication failed",
    message: "The API key is invalid or has expired.",
    suggestions: [
      "Check the active provider's API key in Settings → TranslateNote",
      "Generate a new key in the provider's dashboard",
      "Make sure the key was copied in full, with no stray spaces or line breaks",
    ],
  };
}

function handleRateLimitError(): ErrorNotificationOptions {
  return {
    title: "⏱️ Rate limit reached",
    message: "You are calling the provider faster than it allows. Wait a moment and try again.",
    suggestions: [
      "Check the provider's rate limit policy",
      "Space out your requests",
    ],
  };
}

function handleModelNotFoundError(): ErrorNotificationOptions {
  return {
    title: "🤖 Model not found",
    suggestions: [
      "Check the model name in the settings for typos",
      "Make sure the base URL points to the right provider",
    ],
  };
}

function handleInsufficientQuotaError(): ErrorNotificationOptions {
  return {
    title: "💰 Insufficient credit",
    message: "The provider account has run out of credit.",
    suggestions: ["Sign in to the provider's dashboard to check your balance and top up"],
  };
}

function handleBadRequestError(): ErrorNotificationOptions {
  return {
    title: "❌ Bad request",
    message: "The request was rejected, likely because of the model name or a parameter.",
    suggestions: ["Check the base URL and model name of the active provider"],
  };
}

function handlePermissionDeniedError(): ErrorNotificationOptions {
  return {
    title: "🚫 Permission denied",
    message: "This account is not allowed to use the requested model.",
    suggestions: [
      "Check whether the model is enabled for your account",
      "Ask the provider to grant access to it",
      "Switch to a model your account can use",
    ],
  };
}

const STATUS_CODE_HANDLERS: Record<number, () => ErrorNotificationOptions> = {
  401: handleAuthenticationError,
  429: handleRateLimitError,
  404: handleModelNotFoundError,
  402: handleInsufficientQuotaError,
  400: handleBadRequestError,
  403: handlePermissionDeniedError,
};

export function mapLlmErrorToReadable(
  error: unknown,
): ErrorNotificationOptions {
  if (isStatusCodeError(error)) {
    const handler = STATUS_CODE_HANDLERS[error.status];
    if (handler) {
      return handler();
    }
  }

  return {
    title:
      "❌ Unknown error" +
      (error instanceof Error ? ": " + error.message : ""),
    suggestions: [
      "Check the plugin settings",
      "Try reloading the plugin",
      "Check your network connection to the provider's endpoint",
    ],
  };
}

function isStatusCodeError(error: unknown): error is { status: number } {
  return (
    error != null &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  );
}
