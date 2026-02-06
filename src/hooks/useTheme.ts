// Theme hook for accessing and changing theme
import { useTheme as useNextTheme } from "next-themes";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();
  
  return {
    theme: (theme as Theme) || "system",
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    resolvedTheme: resolvedTheme as "light" | "dark" | undefined,
    systemTheme: systemTheme as "light" | "dark" | undefined,
    isDark: resolvedTheme === "dark",
    isLight: resolvedTheme === "light",
  };
}
