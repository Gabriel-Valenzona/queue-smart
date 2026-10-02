import { createPopulatedUserDemo, demoServices } from "@/data/user-demo";
import type { NewNotification } from "@/data/notifications";
import type {
  DemoParticipation,
  UserDemoAction,
  UserDemoState,
} from "@/types/user-demo";

export function getQueueSnapshot(current: DemoParticipation | null) {
  if (!current) return null;
  return (
    demoServices.find((service) => service.id === current.serviceId)?.snapshots[
      current.stage
    ] ?? null
  );
}

export function isActiveParticipation(current: DemoParticipation | null) {
  const snapshot = getQueueSnapshot(current);
  return !!snapshot && snapshot.status !== "served";
}

export function getJoinError(state: UserDemoState, serviceId: string) {
  if (!serviceId) return "Select a service to join its queue.";
  const service = demoServices.find((item) => item.id === serviceId);
  if (!service)
    return "This service is not available. Select a listed service.";
  if (!service.open) return "This queue is closed. Select an open service.";
  if (isActiveParticipation(state.current))
    return "You already have an active queue. Leave it or finish being served before joining another.";
}

export function formatDemoDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso));
}

type UserDemoTransition = {
  state: UserDemoState;
  accepted: boolean;
  notification?: NewNotification;
};

/** Pure A2 transition; the event handler sends accepted updates to the shared feed. */
export function transitionUserDemo(
  state: UserDemoState,
  action: UserDemoAction,
): UserDemoTransition {
  if (action.type === "reset") {
    const initial = createPopulatedUserDemo();
    // A fresh identity prevents an old confirmation from affecting the reset demo.
    return {
      accepted: true,
      state: {
        ...initial,
        current: initial.current ? { ...initial.current, id: action.id } : null,
      },
    };
  }
  if (action.type === "join") {
    const error = getJoinError(state, action.serviceId);
    if (error)
      return {
        accepted: false,
        state: { ...state, feedback: { kind: "error", message: error } },
      };
    const service = demoServices.find((item) => item.id === action.serviceId)!;
    const first = service.snapshots[0];
    return {
      accepted: true,
      state: {
        ...state,
        current: {
          id: action.id,
          serviceId: service.id,
          joinedAt: action.at,
          stage: 0,
        },
        feedback: {
          kind: "success",
          message: `You joined the example queue for ${service.name}.`,
        },
      },
      notification: {
        category: "queue-update",
        tone: "info",
        title: "Demo · You’re in the queue",
        detail: `${service.name}: position ${first.position}, estimated wait ${first.waitMinutes} minutes.`,
        service: service.name,
        time: "Demo · Just now",
        createdAt: action.at,
      },
    };
  }
  const current = state.current;
  if (
    !current ||
    current.id !== action.participationId ||
    current.stage !== action.expectedStage ||
    !isActiveParticipation(current)
  )
    return { state, accepted: false };
  const service = demoServices.find((item) => item.id === current.serviceId)!;
  const nextSnapshot = service.snapshots[current.stage + 1];
  if (action.type === "advance" && !nextSnapshot)
    return { state, accepted: false };
  const completed = action.type === "leave" || nextSnapshot.status === "served";
  const outcome = action.type === "leave" ? "canceled" : "served";
  const title =
    action.type === "leave"
      ? "Queue canceled"
      : nextSnapshot.status === "served"
        ? "You’ve been served"
        : nextSnapshot.status === "almost-ready"
          ? "You’re almost ready"
          : "Queue updated";
  const message =
    action.type === "leave"
      ? `You left the example queue for ${service.name}.`
      : nextSnapshot.status === "served"
        ? `${service.name} has completed your example participation.`
        : `${service.name}: position ${nextSnapshot.position}, estimated wait ${nextSnapshot.waitMinutes} minutes.`;
  return {
    accepted: true,
    state: {
      ...state,
      current:
        action.type === "leave"
          ? null
          : { ...current, stage: current.stage + 1 },
      history: completed
        ? [
            {
              id: current.id,
              serviceId: current.serviceId,
              joinedAt: current.joinedAt,
              completedAt: action.at,
              outcome,
            },
            ...state.history,
          ]
        : state.history,
      feedback: { kind: "success", message },
    },
    notification: {
      category:
        completed || nextSnapshot.status === "almost-ready"
          ? "status-change"
          : "queue-update",
      tone:
        action.type === "leave"
          ? "warning"
          : nextSnapshot.status === "served"
            ? "success"
            : nextSnapshot.status === "almost-ready"
              ? "warning"
              : "info",
      title: `Demo · ${title}`,
      detail: message,
      service: service.name,
      time: "Demo · Just now",
      createdAt: action.at,
    },
  };
}
