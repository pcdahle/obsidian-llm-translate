import { requestUrl } from "obsidian";
import { AbortError } from "./abort-error";

/**
 * 用 Obsidian 的 requestUrl 实现 fetch，避免 CORS 问题。
 */
export const obsidianFetchAdapter: typeof fetch = async (url, options) => {
  if (options?.signal?.aborted) {
    throw new AbortError();
  }

  const response = await requestWithAbort(
    requestUrl({
      url: url.toString(),
      method: options?.method ?? "GET",
      headers: mapHeaders(options?.headers),
      body: options?.body?.toString() ?? "",
      throw: false,
    }),
    options?.signal,
  );

  return new Response(response.text, {
    status: response.status,
    headers: response.headers,
  });
};

async function requestWithAbort<T>(
  request: Promise<T>,
  signal?: AbortSignal | null,
): Promise<T> {
  if (!signal) {
    return request;
  }

  if (signal.aborted) {
    throw new AbortError();
  }

  let rejectOnAbort: (() => void) | undefined;
  const abortPromise = new Promise<never>((_, reject) => {
    rejectOnAbort = () => reject(new AbortError());
    signal.addEventListener("abort", rejectOnAbort);
  });

  try {
    return await Promise.race([request, abortPromise]);
  } finally {
    if (rejectOnAbort) {
      signal.removeEventListener("abort", rejectOnAbort);
    }
  }
}

function mapHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  } else if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return {};
}
