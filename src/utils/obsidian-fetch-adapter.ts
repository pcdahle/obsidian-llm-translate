import { requestUrl } from "obsidian";
import { AbortError } from "./abort-error";

/**
 * A `fetch` implementation backed by Obsidian's `requestUrl`, which
 * sidesteps CORS restrictions.
 */
export const obsidianFetchAdapter: typeof fetch = async (url, options) => {
  if (options?.signal?.aborted) {
    throw new AbortError();
  }

  const urlString = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
  const bodyString = typeof options?.body === "string" ? options.body : "";

  const response = await requestWithAbort(
    requestUrl({
      url: urlString,
      method: options?.method ?? "GET",
      headers: mapHeaders(options?.headers),
      body: bodyString,
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
