import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetQueueStore } from "@/server/queue";
import { GET as listQueues } from "./route";
import { GET as getQueue, PATCH as setOpen } from "./[serviceId]/route";
import { POST as join } from "./[serviceId]/entries/route";
import {
  DELETE as leave,
  PATCH as move,
} from "./[serviceId]/entries/[entryId]/route";
import { POST as serve } from "./[serviceId]/serve/route";
import { GET as participation } from "../participants/[userId]/queue/route";
import { POST as reset } from "../demo/reset/route";
import { authService } from "@/lib/auth/auth-service";
import { getQueueStore } from "@/server/queue/store";
import { GET as history } from "../history/route";

const params = <T>(value: T) => ({ params: Promise.resolve(value) });

const adminId = "usr_admin_001";
const alexId = "usr_alex_002";
const jordanId = "usr_demo_003";
const tokens: Record<string, string> = {};

function jsonRequest(body: unknown, method = "POST", actor = adminId) {
  return new Request("http://test", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens[actor]}`,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const blank = (actor = adminId) =>
  new Request("http://test", {
    headers: { Authorization: `Bearer ${tokens[actor]}` },
  });
const student = params({ serviceId: "student-services" });

beforeEach(async () => {
  resetQueueStore();
  for (const id of [adminId, alexId, jordanId]) {
    tokens[id] = authService.createSessionToken(
      (await authService.getUserById(id))!,
    );
  }
});

describe("GET /api/queues", () => {
  it("lists every service with its queue length", async () => {
    const response = await listQueues(blank());
    expect(response.status).toBe(200);
    const { queues } = await response.json();
    expect(
      queues.map((queue: { id: string; length: number }) => [
        queue.id,
        queue.length,
      ]),
    ).toEqual([
      ["student-services", 3],
      ["technology-support", 2],
      ["academic-advising", 0],
    ]);
  });
});

describe("GET /api/queues/:serviceId", () => {
  it("returns the ordered entries", async () => {
    const body = await (await getQueue(blank(), student)).json();
    expect(
      body.entries.map((entry: { userName: string }) => entry.userName),
    ).toEqual(["Jordan Lee", "Taylor Nguyen", "Alex Morgan"]);
  });

  it("returns 404 for an unknown service", async () => {
    const response = await getQueue(blank(), params({ serviceId: "unknown" }));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("service_not_found");
  });

  it("returns 400 for an invalid service id", async () => {
    const response = await getQueue(blank(), params({ serviceId: "bad id!" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toEqual({
      serviceId: "serviceId is not a valid identifier.",
    });
  });
});

describe("PATCH /api/queues/:serviceId", () => {
  it("closes a queue so new users cannot join", async () => {
    const response = await setOpen(
      jsonRequest({ open: false }, "PATCH"),
      student,
    );
    expect(response.status).toBe(200);
    expect((await response.json()).service.open).toBe(false);

    const joinResponse = await join(
      jsonRequest({ userId: adminId, userName: "Admin" }),
      student,
    );
    expect(joinResponse.status).toBe(409);
    expect((await joinResponse.json()).error.code).toBe("queue_closed");
  });

  it("rejects a non-boolean open value", async () => {
    const response = await setOpen(
      jsonRequest({ open: "no" }, "PATCH"),
      student,
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/queues/:serviceId/entries", () => {
  it("joins a queue and returns 201 with position and wait", async () => {
    const response = await join(
      jsonRequest({ userId: adminId, userName: "Untrusted display name" }),
      params({ serviceId: "technology-support" }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.entry).toMatchObject({
      userId: adminId,
      userName: "QueueSmart Administrator",
      position: 3,
      estimatedWaitMinutes: 30,
    });
    expect(body.events[0].type).toBe("joined");
  });

  it("returns 400 with field errors for invalid input", async () => {
    const response = await join(jsonRequest({ userId: 5 }), student);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: "validation_error",
      fields: {
        userId: "userId must be a string.",
        userName: "userName is required.",
      },
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await join(jsonRequest("{not json"), student);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_json");
  });

  it("returns 409 when the user is already waiting", async () => {
    const response = await join(
      jsonRequest({ userId: alexId, userName: "Alex Morgan" }, "POST", alexId),
      params({ serviceId: "technology-support" }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("already_in_queue");
  });
});

describe("entry routes", () => {
  async function entryIdFor(name: string) {
    const { entries } = await (await getQueue(blank(), student)).json();
    return entries.find(
      (entry: { userName: string }) => entry.userName === name,
    ).id as string;
  }

  it("DELETE removes an entry and records it as canceled", async () => {
    const entryId = await entryIdFor("Alex Morgan");
    const response = await leave(
      blank(),
      params({ serviceId: "student-services", entryId }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).record.outcome).toBe("canceled");
    const status = await (
      await participation(blank(alexId), params({ userId: alexId }))
    ).json();
    expect(status.current).toBeNull();
  });

  it("DELETE returns 404 for a missing entry", async () => {
    const response = await leave(
      blank(),
      params({ serviceId: "student-services", entryId: "gone" }),
    );
    expect(response.status).toBe(404);
  });

  it("PATCH moves an entry up", async () => {
    const entryId = await entryIdFor("Alex Morgan");
    const response = await move(
      jsonRequest({ direction: "up" }, "PATCH"),
      params({ serviceId: "student-services", entryId }),
    );
    expect(response.status).toBe(200);
    const { entries } = await response.json();
    expect(entries[1].userName).toBe("Alex Morgan");
  });

  it("PATCH rejects an invalid direction", async () => {
    const entryId = await entryIdFor("Alex Morgan");
    const response = await move(
      jsonRequest({ direction: "sideways" }, "PATCH"),
      params({ serviceId: "student-services", entryId }),
    );
    expect(response.status).toBe(400);
  });

  it("PATCH returns 409 when moving the first entry up", async () => {
    const entryId = await entryIdFor("Jordan Lee");
    const response = await move(
      jsonRequest({ direction: "up" }, "PATCH"),
      params({ serviceId: "student-services", entryId }),
    );
    expect(response.status).toBe(409);
  });
});

describe("POST /api/queues/:serviceId/serve", () => {
  it("serves users in order until the queue is empty", async () => {
    const served = [];
    for (let i = 0; i < 3; i++)
      served.push(
        (await (await serve(blank(), student)).json()).record.userName,
      );
    expect(served).toEqual(["Jordan Lee", "Taylor Nguyen", "Alex Morgan"]);

    const empty = await serve(blank(), student);
    expect(empty.status).toBe(409);
    expect((await empty.json()).error.code).toBe("queue_empty");
  });
});

describe("GET /api/participants/:userId/queue", () => {
  it("reports position changes as the queue is served", async () => {
    const before = await (
      await participation(blank(alexId), params({ userId: alexId }))
    ).json();
    expect(before.current.position).toBe(3);
    await serve(blank(), student);
    const after = await (
      await participation(blank(alexId), params({ userId: alexId }))
    ).json();
    expect(after.current).toMatchObject({
      position: 2,
      estimatedWaitMinutes: 10,
    });
  });
});

describe("POST /api/demo/reset", () => {
  it("restores the seeded queues", async () => {
    await serve(blank(), student);
    const { queues } = await (await reset(blank())).json();
    expect(queues[0].length).toBe(3);
  });
});

describe("queue identity and role integration", () => {
  it("requires authentication before reading or changing queue data", async () => {
    const anonymous = new Request("http://test");
    const entry = params({ serviceId: "student-services", entryId: "seed-3" });
    const before = structuredClone(getQueueStore());
    const responses = await Promise.all([
      listQueues(anonymous),
      getQueue(anonymous, student),
      setOpen(anonymous, student),
      join(anonymous, student),
      leave(anonymous, entry),
      move(anonymous, entry),
      serve(anonymous, student),
      reset(anonymous),
      participation(anonymous, params({ userId: alexId })),
    ]);
    expect(responses.map((r) => r.status)).toEqual(Array(9).fill(401));
    expect(getQueueStore()).toEqual(before);
  });

  it("allows authenticated summaries but rejects administrator operations for normal users", async () => {
    const before = structuredClone(getQueueStore());
    expect((await listQueues(blank(alexId))).status).toBe(200);
    const responses = await Promise.all([
      getQueue(blank(alexId), student),
      setOpen(jsonRequest({ open: false }, "PATCH", alexId), student),
      move(
        jsonRequest({ direction: "up" }, "PATCH", alexId),
        params({ serviceId: "student-services", entryId: "seed-3" }),
      ),
      serve(blank(alexId), student),
      reset(blank(alexId)),
    ]);
    expect(responses.map((r) => r.status)).toEqual(Array(5).fill(403));
    expect(getQueueStore()).toEqual(before);
  });

  it("rejects joining, viewing participation, or removing entries as another account", async () => {
    const before = structuredClone(getQueueStore());
    const responses = [
      await join(
        jsonRequest({ userId: alexId, userName: "Alex" }, "POST", jordanId),
        student,
      ),
      await participation(blank(jordanId), params({ userId: alexId })),
      await participation(blank(), params({ userId: alexId })),
      await leave(
        blank(jordanId),
        params({ serviceId: "student-services", entryId: "seed-3" }),
      ),
    ];
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403]);
    expect(getQueueStore()).toEqual(before);
  });

  it("lets an owner leave and retrieve the completed visit through independent authenticated history requests", async () => {
    const result = await leave(
      blank(alexId),
      params({ serviceId: "student-services", entryId: "seed-3" }),
    );
    expect(result.status).toBe(200);
    const first = await history(blank(alexId));
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.history).toEqual([
      expect.objectContaining({
        entryId: "seed-3",
        serviceName: "Student services",
        outcome: "canceled",
      }),
    ]);
    expect(await (await history(blank(alexId))).json()).toEqual(body);
    expect(
      (
        await leave(
          blank(alexId),
          params({ serviceId: "student-services", entryId: "seed-3" }),
        )
      ).status,
    ).toBe(404);
    expect((await (await history(blank(jordanId))).json()).history).toEqual([]);
  });

  it("serves through the administrator API and returns a usable history name to the user", async () => {
    await serve(blank(), student);
    await serve(blank(), student);
    const response = await serve(blank(), student);
    expect(response.status).toBe(200);
    expect((await response.json()).record).toMatchObject({
      userId: alexId,
      serviceName: "Student services",
      outcome: "served",
    });
    expect((await (await history(blank(alexId))).json()).history).toHaveLength(
      1,
    );
    expect(
      (await participation(blank(alexId), params({ userId: "bad id" }))).status,
    ).toBe(400);
  });
});

describe("unexpected errors", () => {
  it("returns a generic 500 without leaking details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { params: Promise.reject(new Error("boom")) };
    void broken.params.catch(() => {});
    const response = await getQueue(blank(), broken as never);
    expect(response.status).toBe(500);
    expect((await response.json()).error).toEqual({
      code: "internal_error",
      message: "Something went wrong.",
    });
    spy.mockRestore();
  });
});
