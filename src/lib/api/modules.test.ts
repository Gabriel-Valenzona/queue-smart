import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./queues";
import { historyApi } from "./history";
import { servicesApi } from "./services";
import { moduleRequest } from "./module-request";

function respond(body: unknown, status = 200, raw = false) {
  const mock = vi
    .fn()
    .mockResolvedValue(
      new Response(raw ? String(body) : JSON.stringify(body), { status }),
    );
  vi.stubGlobal("fetch", mock);
  return mock;
}
afterEach(() => vi.unstubAllGlobals());

describe("module API clients", () => {
  const input = {
    name: "Service",
    description: "Help",
    duration: 2,
    priority: "low" as const,
  };
  it("loads history without a client user selector, forwarding cancellation and credentials", async () => {
    const mock = respond({ history: [{ entryId: "visit" }] });
    const signal = new AbortController().signal;
    expect(await historyApi.list(signal)).toEqual([{ entryId: "visit" }]);
    expect(mock).toHaveBeenCalledWith(
      "/api/history",
      expect.objectContaining({
        signal,
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
  });
  it("lists, creates, and updates service data through their API contracts", async () => {
    const list = respond({ services: [{ id: "a" }] });
    expect(await servicesApi.list()).toEqual([{ id: "a" }]);
    expect(list.mock.calls[0][0]).toBe("/api/services");
    const create = respond({ service: { id: "server-id", ...input } }, 201);
    expect((await servicesApi.create(input)).id).toBe("server-id");
    expect(create.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify(input),
    });
    expect(create.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "application/json",
    );
    const update = respond({ service: { id: "a", ...input } });
    await servicesApi.update("a b", input);
    expect(update.mock.calls[0][0]).toBe("/api/services/a%20b");
    expect(update.mock.calls[0][1].method).toBe("PUT");
  });
  it("retains API status, field errors, and dependency failures", async () => {
    respond(
      {
        error: {
          code: "validation_error",
          message: "Correct fields",
          fields: { duration: "Whole minutes" },
        },
      },
      400,
    );
    await expect(servicesApi.create(input)).rejects.toMatchObject({
      status: 400,
      code: "validation_error",
      fields: { duration: "Whole minutes" },
    });
    respond(
      { error: { code: "history_not_ready", message: "Unavailable" } },
      503,
    );
    await expect(historyApi.list()).rejects.toMatchObject({
      status: 503,
      code: "history_not_ready",
    });
  });
  it("handles non-JSON failures and invalid success responses without inventing empty results", async () => {
    respond("bad gateway", 502, true);
    await expect(historyApi.list()).rejects.toBeInstanceOf(ApiError);
    await expect(historyApi.list()).rejects.toMatchObject({
      code: "unknown_error",
    });
    respond("not json", 200, true);
    await expect(historyApi.list()).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
  it("preserves supplied headers and propagates network errors", async () => {
    const mock = respond({});
    await moduleRequest("/test", { headers: { "X-Test": "present" } });
    expect(mock.mock.calls[0][1].headers.get("X-Test")).toBe("present");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(historyApi.list()).rejects.toThrow("offline");
  });
});
