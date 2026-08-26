import { useSyncExternalStore, useCallback } from "react";

// Shared theme store so every component sees the same value
let listeners: Array<() => void> = [];

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function emitChange() {
  listeners.forEach((l) => l());
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  if (dark) {
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
  emitChange();
}

// Initialise on first import
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot);
  const toggle = useCallback(() => applyTheme(!dark), [dark]);
  return { dark, toggle };
}
