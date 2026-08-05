import { useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem("data-agent-theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  });
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(preference));

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const next = resolve(preference);
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.style.colorScheme = next;
    };
    update();
    localStorage.setItem("data-agent-theme", preference);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  return { preference, resolved, setPreference };
}
