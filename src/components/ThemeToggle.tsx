import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const ThemeToggle = () => {
  const { dark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-sm transition-colors opacity-70 hover:opacity-100"
      title={dark ? "Жарық режим" : "Қараңғы режим"}
    >
      {dark ? (
        <Sun className="w-5 h-5" strokeWidth={1} />
      ) : (
        <Moon className="w-5 h-5" strokeWidth={1} />
      )}
    </button>
  );
};

export default ThemeToggle;
