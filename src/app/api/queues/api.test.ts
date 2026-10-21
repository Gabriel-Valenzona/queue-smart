import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetQueueStore } from "@/server/queue";
import { GET as listQueues } from "./route";
import { GET as getQueue, PATCH as setOpen } from "./[serviceId]/route";
import { POST as join } from "./[serviceId]/entries/route";
import { DELETE as leave, PATCH as move } from "./[serviceId]/entries/[entryId]/route";
import { POST as serve } from "./[serviceId]/serve/route";
import { GET as participation } from "../participants/[userId]/queue/route";
import { POST as reset } from "../demo/reset/route";

const params = <T,>(value: T) => ({ params: Promise.resolve(value) });

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const blank = () => new Request("http://test");
const student = params({ serviceId: "student-services" });

beforeEach(() => {
  resetQueueStore();
});

describe("GET /api/queues", () => {
  it("lists every service with its queue length", async () => {
    const response = await listQueues();
    expect(response.status).toBe(200);
    const { queues } = await response.json();
    expect(queues.map((queue: { id: string; length: number }) => [queue.id, queue.length])).toEqual([
      ["student-services", 3],
      ["technology-support", 2],
      ["academic-advising", 0],
    ]);
  });
});

describe("GET /api/queues/:serviceId", () => {
  it("returns the ordered entries", async () => {
    const body = await (await getQueue(blank(), student)).json();
    expect(body.entries.map((entry: { userName: string }) => entry.userName)).toEqual([
      "Jordan Lee",
      "Taylor Nguyen",
      "Alex Morgan",
    ]);
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
    const response = await setOpen(jsonRequest({ open: false }, "PATCH"), student);
    expect(response.status).toBe(200);
    expect((await response.json()).service.open).toBe(false);

    const joinResponse = await join(jsonRequest({ userId: "new-user", userName: "New" }), student);
    expect(joinResponse.status).toBe(409);
    expect((await joinResponse.json()).error.code).toBe("queue_closed");
  });

  it("rejects a non-boolean open value", async () => {
    const response = await setOpen(jsonRequest({ open: "no" }, "PATCH"), student);
    expect(response.status).toBe(400);
  });
});

describe("POST /api/queues/:serviceId/entries", () => {
  it("joins a queue and returns 201 with position and wait", async () => {
    const response = await join(
      jsonRequest({ userId: "sam", userName: "Sam" }),
      params({ serviceId: "technology-support" }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.entry).toMatchObject({ userName: "Sam", position: 3, estimatedWaitMinutes: 30 });
    expect(body.events[0].type).toBe("joined");
  });

  it("returns 400 with field errors for invalid input", async () => {
    const response = await join(jsonRequest({ userId: 5 }), student);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: "validation_error",
      fields: { userId: "userId must be a string.", userName: "userName is required." },
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await join(jsonRequest("{not json"), student);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_json");
  });

  it("returns 409 when the user is already waiting", async () => {
    const response = await join(
      jsonRequest({ userId: "alex-morgan", userName: "Alex Morgan" }),
      params({ serviceId: "technology-support" }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("already_in_queue");
  });
});

describe("entry routes", () => {
  async function entryIdFor(name: string) {
    const { entries } = await (await getQueue(blank(), student)).json();
    return entries.find((entry: { userName: string }) => entry.userName === name).id as string;
  }

  it("DELETE removes an entry and records it as canceled", async () => {
    const entryId = await entryIdFor("Alex Morgan");
    const response = await leave(blank(), params({ serviceId: "student-services", entryId }));
    expect(response.status).toBe(200);
    expect((await response.json()).record.outcome).toBe("canceled");
    const status = await (await participation(blank(), params({ userId: "alex-morgan" }))).json();
    expect(status.current).toBeNull();
  });

  it("DELETE returns 404 for a missing entry", async () => {
    const response = await leave(blank(), params({ serviceId: "student-services", entryId: "gone" }));
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
      served.push((await (await serve(blank(), student)).json()).record.userName);
    expect(served).toEqual(["Jordan Lee", "Taylor Nguyen", "Alex Morgan"]);

    const empty = await serve(blank(), student);
    expect(empty.status).toBe(409);
    expect((await empty.json()).error.code).toBe("queue_empty");
  });
});

describe("GET /api/participants/:userId/queue", () => {
  it("reports position changes as the queue is served", async () => {
    const before = await (await participation(blank(), params({ userId: "alex-morgan" }))).json();
    expect(before.current.position).toBe(3);
    await serve(blank(), student);
    const after = await (await participation(blank(), params({ userId: "alex-morgan" }))).json();
    expect(after.current).toMatchObject({ position: 2, estimatedWaitMinutes: 10 });
  });
});

describe("POST /api/demo/reset", () => {
  it("restores the seeded queues", async () => {
    await serve(blank(), student);
    const { queues } = await (await reset()).json();
    expect(queues[0].length).toBe(3);
  });
});

describe("unexpected errors", () => {
  it("returns a generic 500 without leaking details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { params: Promise.reject(new Error("boom")) };
    const response = await getQueue(blank(), broken as never);
    expect(response.status).toBe(500);
    expect((await response.json()).error).toEqual({
      code: "internal_error",
      message: "Something went wrong.",
    });
    spy.mockRestore();
  });
});
