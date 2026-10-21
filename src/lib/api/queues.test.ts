import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, queueApi } from "./queues";

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body === undefined ? "not json" : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("queueApi", () => {
  it("unwraps the queue list", async () => {
    const fetchMock = mockFetch(200, { queues: [{ id: "a" }] });
    await expect(queueApi.list()).resolves.toEqual([{ id: "a" }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/queues", expect.objectContaining({ cache: "no-store" }));
  });

  it("sends JSON bodies with the right method and encoded path", async () => {
    const fetchMock = mockFetch(201, { entry: {}, events: [] });
    await queueApi.join("a b", { userId: "u", userName: "U" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/queues/a%20b/entries",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "u", userName: "U" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it.each([
    ["get", () => queueApi.get("s"), "/api/queues/s", undefined],
    ["setOpen", () => queueApi.setOpen("s", true), "/api/queues/s", "PATCH"],
    ["leave", () => queueApi.leave("s", "e"), "/api/queues/s/entries/e", "DELETE"],
    ["move", () => queueApi.move("s", "e", "up"), "/api/queues/s/entries/e", "PATCH"],
    ["serveNext", () => queueApi.serveNext("s"), "/api/queues/s/serve", "POST"],
    ["participation", () => queueApi.participation("u"), "/api/participants/u/queue", undefined],
    ["resetDemo", () => queueApi.resetDemo(), "/api/demo/reset", "POST"],
  ])("%s calls the expected endpoint", async (_name, call, path, method) => {
    const fetchMock = mockFetch(200, { queues: [] });
    await call();
    expect(fetchMock.mock.calls[0][0]).toBe(path);
    expect(fetchMock.mock.calls[0][1].method).toBe(method);
  });

  it("throws ApiError with the server's code, message, and fields", async () => {
    mockFetch(400, {
      error: { code: "validation_error", message: "Bad", fields: { userId: "required" } },
    });
    const error = await queueApi.join("s", { userId: "", userName: "" }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "validation_error",
      message: "Bad",
      fields: { userId: "required" },
    });
  });

  it("falls back to a generic error when the response is not JSON", async () => {
    mockFetch(502, undefined);
    await expect(queueApi.list()).rejects.toMatchObject({
      status: 502,
      code: "unknown_error",
      message: "The request could not be completed.",
    });
  });
});
