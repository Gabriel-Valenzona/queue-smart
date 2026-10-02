"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createPopulatedUserDemo,
  createUserDemoNotifications,
} from "@/data/user-demo";
import { transitionUserDemo } from "@/lib/user-demo";
import { useNotifications } from "@/components/notifications/NotificationsProvider";
import type { UserDemoAction, UserDemoState } from "@/types/user-demo";

type UserDemoContextValue = {
  state: UserDemoState;
  joinQueue: (serviceId: string) => void;
  leaveQueue: (participationId: string, expectedStage: number) => void;
  advanceQueue: (participationId: string, expectedStage: number) => void;
  resetDemo: () => void;
};
const UserDemoContext = createContext<UserDemoContextValue | null>(null);

export default function UserDemoProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: UserDemoState;
}) {
  const [state, setState] = useState(
    () => initialState ?? createPopulatedUserDemo(),
  );
  const latestState = useRef(state);
  const { notify, resetNotifications } = useNotifications();
  const router = useRouter();

  function applyAction(action: UserDemoAction) {
    // Event handlers see the last accepted state even before React renders a batch.
    const result = transitionUserDemo(latestState.current, action);
    latestState.current = result.state;
    setState(result.state);
    if (result.accepted) {
      if (action.type === "reset")
        resetNotifications(createUserDemoNotifications());
      else if (result.notification) notify(result.notification);
    }
    return result.accepted;
  }

  function eventDetails() {
    return { id: crypto.randomUUID(), at: new Date().toISOString() };
  }
  function joinQueue(serviceId: string) {
    const accepted = applyAction({
      type: "join",
      serviceId,
      ...eventDetails(),
    });
    if (accepted) router.push("/user/queue-status");
  }
  return (
    <UserDemoContext.Provider
      value={{
        state,
        joinQueue,
        leaveQueue: (participationId, expectedStage) =>
          applyAction({
            type: "leave",
            participationId,
            expectedStage,
            ...eventDetails(),
          }),
        advanceQueue: (participationId, expectedStage) =>
          applyAction({
            type: "advance",
            participationId,
            expectedStage,
            ...eventDetails(),
          }),
        resetDemo: () =>
          applyAction({ type: "reset", id: crypto.randomUUID() }),
      }}
    >
      {children}
    </UserDemoContext.Provider>
  );
}

export function useUserDemo() {
  const value = useContext(UserDemoContext);
  if (!value) throw new Error("User screens must be inside UserDemoProvider.");
  return value;
}
