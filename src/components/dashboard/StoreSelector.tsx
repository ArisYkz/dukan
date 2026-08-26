import { Check, ChevronDown, Plus, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StoreRow } from "@/types/store";

interface StoreSelectorProps {
  stores: StoreRow[];
  currentStoreId: string;
  onSelect: (storeId: string) => void;
  onCreateNew: () => void;
}

const StoreSelector = ({ stores, currentStoreId, onSelect, onCreateNew }: StoreSelectorProps) => {
  const current = stores.find((s) => s.id === currentStoreId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-sm font-mono transition-colors opacity-70 hover:opacity-100">
        <Store className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate hidden sm:inline">
          {current?.name ?? "Select store"}
        </span>
        <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {stores.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex items-center justify-between font-mono text-sm"
          >
            <span className="truncate">{s.name}</span>
            {s.id === currentStoreId && <Check className="w-3.5 h-3.5" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateNew} className="font-mono text-sm">
          <Plus className="w-3.5 h-3.5 mr-2" />
          Create new store
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StoreSelector;
