"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPopulatedUserDemo } from "@/data/user-demo";
import { getJoinError, userDemoReducer } from "@/lib/user-demo";
import type { UserDemoState } from "@/types/user-demo";

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
  const [state, dispatch] = useReducer(
    userDemoReducer,
    initialState,
    (seed) => seed ?? createPopulatedUserDemo(),
  );
  const router = useRouter();
  function eventDetails() {
    return { id: crypto.randomUUID(), at: new Date().toISOString() };
  }
  function joinQueue(serviceId: string) {
    const valid = !getJoinError(state, serviceId);
    dispatch({ type: "join", serviceId, ...eventDetails() });
    if (valid) router.push("/user/queue-status");
  }
  return (
    <UserDemoContext.Provider
      value={{
        state,
        joinQueue,
        leaveQueue: (participationId, expectedStage) =>
          dispatch({
            type: "leave",
            participationId,
            expectedStage,
            ...eventDetails(),
          }),
        advanceQueue: (participationId, expectedStage) =>
          dispatch({
            type: "advance",
            participationId,
            expectedStage,
            ...eventDetails(),
          }),
        resetDemo: () => dispatch({ type: "reset", id: crypto.randomUUID() }),
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
