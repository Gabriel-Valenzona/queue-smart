"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types/auth";

const USER_STORAGE_KEY = "queuesmart_current_user";

/**
 * Retrieves the currently active user from local storage (if present).
 */
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Sets the active user in local storage.
 */
export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Clears the active user from local storage and calls backend logout.
 */
export async function logoutUser(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  try {
    await fetch("/api/auth/logout", { credentials: "same-origin", method: "POST" });
  } catch {
    // ignore network errors on logout
  }
}

/**
 * Hook to access and listen to current authenticated user.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredUser();
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return !getStoredUser();
  });

  useEffect(() => {
    // Verify session with backend /api/auth/me
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.user) {
          setUser(data.user);
          setStoredUser(data.user);
        } else if (!getStoredUser()) {
          setUser(null);
        }
      })
      .catch(() => {
        // network or server error, retain local state if available
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { user, loading };
}
