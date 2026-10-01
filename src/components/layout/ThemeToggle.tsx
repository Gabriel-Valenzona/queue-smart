"use client";
import { useSyncExternalStore } from "react";
import Sun from "@/components/icons/Sun";
import Moon from "@/components/icons/Moon";
import { IconButton } from "@/components/ui/Button";

function subscribe(callback: () => void) {
  window.addEventListener("queuesmart-theme", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("queuesmart-theme", callback);
    window.removeEventListener("storage", callback);
  };
}
function getTheme() {
  return document.documentElement.classList.contains("dark");
}
export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getTheme, () => false);
  function toggle() {
    document.documentElement.classList.toggle("dark", !dark);
    document.documentElement.style.colorScheme = dark ? "light" : "dark";
    try {
      localStorage.setItem("queuesmart-theme", dark ? "light" : "dark");
    } catch {
      /* Theme still works when storage is unavailable. */
    }
    window.dispatchEvent(new Event("queuesmart-theme"));
  }
  return (
    <IconButton
      label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {dark ? <Sun /> : <Moon />}
    </IconButton>
  );
}
