import type { ErrorNotificationOptions } from "../ui/user-notifications";

function handleAuthenticationError(): ErrorNotificationOptions {
  return {
    title: "🔑 认证失败",
    message: "API Key 无效或已过期。",
    suggestions: [
      "在「设置 → 翻译插件」里检查当前服务商的 API Key",
      "去服务商后台重新生成一个 Key",
      "确认 Key 完整复制，没有多余空格或换行",
    ],
  };
}

function handleRateLimitError(): ErrorNotificationOptions {
  return {
    title: "⏱️ 触发限流",
    message: "调用频率超过服务商限制，稍等一会儿再试。",
    suggestions: [
      "查看服务商的限流政策",
      "减少连续调用频率",
    ],
  };
}

function handleModelNotFoundError(): ErrorNotificationOptions {
  return {
    title: "🤖 模型不存在",
    suggestions: [
      "检查设置里的模型名拼写",
      "确认 Base URL 指向正确的服务商",
    ],
  };
}

function handleInsufficientQuotaError(): ErrorNotificationOptions {
  return {
    title: "💰 余额不足",
    message: "服务商账户额度已用完。",
    suggestions: ["登录服务商后台检查余额并充值"],
  };
}

function handleBadRequestError(): ErrorNotificationOptions {
  return {
    title: "❌ 请求参数错误",
    message: "请求格式不正确，可能是模型名或参数配置问题。",
    suggestions: ["检查当前服务商的 Base URL 和模型名"],
  };
}

function handlePermissionDeniedError(): ErrorNotificationOptions {
  return {
    title: "🚫 权限不足",
    message: "当前账户没有使用该模型的权限。",
    suggestions: [
      "检查账户是否开通了该模型",
      "联系服务商开通对应权限",
      "换一个账户有权限的模型",
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
      "❌ 未知错误" +
      (error instanceof Error ? "：" + error.message : ""),
    suggestions: [
      "检查插件设置",
      "尝试重启插件",
      "检查到服务商端点的网络连接",
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
