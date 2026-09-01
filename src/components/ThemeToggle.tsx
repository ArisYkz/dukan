import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLabels } from "@/hooks/useLabels";

const ThemeToggle = () => {
  const { dark, toggle } = useTheme();
  const { MISC } = useLabels();

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-sm transition-colors opacity-70 hover:opacity-100"
      title={dark ? MISC.LIGHT_MODE : MISC.DARK_MODE}
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
