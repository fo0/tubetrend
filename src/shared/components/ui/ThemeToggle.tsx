import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();

  const nextTheme = () => {
    // cycle: system -> light -> dark -> system
    const order: Array<"system" | "light" | "dark"> = ["system", "light", "dark"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  };

  const title = (() => {
    if (theme === "system") return `${t("theme.system")} (${t(`theme.${resolvedTheme}`)})`;
    return theme === "dark" ? t("theme.dark") : t("theme.light");
  })();

  return (
    <button
      type="button"
      onClick={nextTheme}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors \
                 border-slate-300 text-slate-700 hover:bg-slate-100 \
                 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      title={`${t("theme.label")}: ${title} (${t("theme.clickToCycle")})`}
      aria-label={`${t("theme.label")}: ${title}`}
    >
      {theme === "system" ? (
        <Monitor className="w-3 h-3" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="w-3 h-3" />
      ) : (
        <Sun className="w-3 h-3" />
      )}
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
};
