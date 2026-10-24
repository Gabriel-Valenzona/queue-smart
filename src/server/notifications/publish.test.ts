import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetQueueStore } from "@/server/queue/store";
import { publishQueueNotifications } from "./publish";
import { createEmptyNotificationStore, type NotificationStore } from "./store";

beforeEach(() => {
  resetQueueStore();
});

describe("publishQueueNotifications", () => {
  it("stores what a change raises for the accounts it affects", async () => {
    const store = createEmptyNotificationStore();
    const created = await publishQueueNotifications({
      events: [],
      serviceIds: ["student-services"],
      actorId: "usr_admin_001",
      store,
    });
    expect(created.map((item) => [item.userId, item.title, item.detail])).toEqual([
      ["usr_demo_003", "Estimated wait updated", "Student services: position 1, about 5 minutes."],
      ["taylor-nguyen", "Estimated wait updated", "Student services: position 2, about 10 minutes."],
      ["usr_alex_002", "Estimated wait updated", "Student services: position 3, about 15 minutes."],
    ]);
    expect(store.notifications).toHaveLength(3);
    expect(Object.values(store.waitBaselines)).toEqual([5, 10, 15]);
  });

  it("does not announce the same estimate twice", async () => {
    const store = createEmptyNotificationStore();
    const options = { events: [], serviceIds: ["student-services"], store };
    await publishQueueNotifications(options);
    await expect(publishQueueNotifications(options)).resolves.toEqual([]);
    expect(store.notifications).toHaveLength(3);
  });

  it("never fails a queue operation when delivery breaks", async () => {
    // A frozen store makes the write throw, standing in for any delivery fault.
    const store = Object.freeze(createEmptyNotificationStore()) as NotificationStore;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      publishQueueNotifications({
        events: [],
        serviceIds: ["student-services"],
        store,
      }),
    ).resolves.toEqual([]);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
