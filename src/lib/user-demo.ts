import { createPopulatedUserDemo, demoServices } from "@/data/user-demo";
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

/** Pure UI simulation: snapshots, history, and notifications move together. */
export function userDemoReducer(
  state: UserDemoState,
  action: UserDemoAction,
): UserDemoState {
  if (action.type === "reset") {
    const initial = createPopulatedUserDemo();
    // A fresh identity prevents an old confirmation from affecting the reset demo.
    return {
      ...initial,
      current: initial.current ? { ...initial.current, id: action.id } : null,
    };
  }
  if (action.type === "join") {
    const error = getJoinError(state, action.serviceId);
    if (error) return { ...state, feedback: { kind: "error", message: error } };
    const service = demoServices.find((item) => item.id === action.serviceId)!;
    const first = service.snapshots[0];
    return {
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
      notifications: [
        {
          id: `${action.id}-join`,
          title: "Demo · You’re in the queue",
          detail: `${service.name}: position ${first.position}, estimated wait ${first.waitMinutes} minutes.`,
          time: "Demo · Just now",
          unread: true,
        },
        ...state.notifications,
      ],
    };
  }
  const current = state.current;
  if (
    !current ||
    current.id !== action.participationId ||
    current.stage !== action.expectedStage ||
    !isActiveParticipation(current)
  )
    return state;
  const service = demoServices.find((item) => item.id === current.serviceId)!;
  const nextSnapshot = service.snapshots[current.stage + 1];
  if (action.type === "advance" && !nextSnapshot) return state;
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
    ...state,
    current:
      action.type === "leave" ? null : { ...current, stage: current.stage + 1 },
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
    notifications: [
      {
        id: action.id,
        title: `Demo · ${title}`,
        detail: message,
        time: "Demo · Just now",
        unread: true,
      },
      ...state.notifications,
    ],
  };
}
