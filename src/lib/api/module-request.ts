import { ApiError } from "./queues";

/** Shared by the History and Service Management clients, not a second API error contract. */
export async function moduleRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      body?.error?.code ?? "unknown_error",
      body?.error?.message ?? "The request could not be completed.",
      body?.error?.fields,
    );
  if (body === null)
    throw new ApiError(
      502,
      "invalid_response",
      "The server returned an invalid response.",
    );
  return body as T;
}
