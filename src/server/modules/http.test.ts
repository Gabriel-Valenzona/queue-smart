import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getSession } from "@/app/api/auth/me/route";
import { QueueError } from "@/server/queue/errors";
import { moduleHandler } from "./http";
import { NextResponse } from "next/server";
import type { AuthApiResponse } from "@/types/auth";

vi.mock("@/app/api/auth/me/route", () => ({ GET: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe("module response boundary", () => {
  it("masks unexpected session failures and malformed success responses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const response of [
      NextResponse.json<AuthApiResponse>(
        { success: false, message: "Failed" },
        { status: 500 },
      ),
      NextResponse.json<AuthApiResponse>({
        success: true,
        message: "Missing user",
      }),
    ]) {
      vi.mocked(getSession).mockResolvedValueOnce(response);
      const run = vi.fn();
      const result = await moduleHandler(new Request("http://test"), run);
      expect(result.status).toBe(500);
      expect(result.headers.get("Cache-Control")).toBe("no-store");
      expect((await result.json()).error).toEqual({
        code: "internal_error",
        message: "Something went wrong.",
      });
      expect(run).not.toHaveBeenCalled();
    }
  });
  it("uses existing queue error conventions without changing them", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(
      NextResponse.json<AuthApiResponse>({
        success: true,
        message: "Session",
        user: {
          id: "a",
          name: "A",
          email: "a@example.com",
          role: "user",
          createdAt: "2026-10-01T10:00:00Z",
          updatedAt: "2026-10-01T10:00:00Z",
        },
      }),
    );
    const response = await moduleHandler(new Request("http://test"), () => {
      throw new QueueError("validation_error", "Invalid", { name: "Required" });
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toEqual({ name: "Required" });
  });
});
