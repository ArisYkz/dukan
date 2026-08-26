import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { KAZAKHSTAN_CITIES } from "@/constants/kazakhstanCities";

interface CityDropdownProps {
  value: string;
  onChange: (city: string) => void;
  placeholder: string;
  searchPlaceholder: string;
}

const CityDropdown = ({ value, onChange, placeholder, searchPlaceholder }: CityDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full border-b border-border py-3 outline-none text-left flex justify-between items-center bg-transparent ${value ? "text-foreground" : "text-muted-foreground"}`}
      >
        <span className="text-sm">{value || placeholder}</span>
        <ChevronDown size={16} className={`transition-transform text-foreground ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
          <input
            placeholder={searchPlaceholder}
            className="w-full px-3 py-2 border-b border-border text-sm outline-none bg-card text-foreground sticky top-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {KAZAKHSTAN_CITIES.filter((c) => c.toLowerCase().includes(search.toLowerCase())).map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => { onChange(city); setOpen(false); setSearch(""); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors text-foreground"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityDropdown;
