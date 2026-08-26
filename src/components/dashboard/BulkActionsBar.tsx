import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderTree, Tag, Trash2, Package, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLabels } from "@/hooks/useLabels";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  categories: string[];
  onClear: () => void;
  onSelectAll: () => void;
  onMoveToCategory: (categoryId: string | null) => void;
  onUpdatePrice: (newPrice: number) => void;
  onUpdateStock: (newStock: number) => void;
  onDelete: () => void;
  isLoading: boolean;
}

const BulkActionsBar = ({
  selectedCount,
  totalCount,
  categories,
  onClear,
  onSelectAll,
  onMoveToCategory,
  onUpdatePrice,
  onUpdateStock,
  onDelete,
  isLoading,
}: BulkActionsBarProps) => {
  const { ACTIONS, PRODUCTS_TAB } = useLabels();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCategoryPopover, setShowCategoryPopover] = useState(false);
  const [showPricePopover, setShowPricePopover] = useState(false);
  const [showStockPopover, setShowStockPopover] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [stockInput, setStockInput] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handlePriceUpdate = () => {
    const price = parseFloat(priceInput);
    if (!isNaN(price) && price >= 0) {
      onUpdatePrice(price);
      setPriceInput("");
      setShowPricePopover(false);
    }
  };

  const handleStockUpdate = () => {
    const stock = parseInt(stockInput, 10);
    if (!isNaN(stock) && stock >= 0) {
      onUpdateStock(stock);
      setStockInput("");
      setShowStockPopover(false);
    }
  };

  const allSelected = selectedCount === totalCount;

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      >
        {/* Floating close button — above the bar, right-aligned */}
        <div className="absolute bottom-full right-4 mb-2">
          <button
            onClick={onClear}
            disabled={isLoading}
            className="h-7 w-7 flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center md:justify-between">
          {/* Left: Count — hidden on mobile */}
          <div className="hidden md:flex flex-shrink-0 items-center gap-3">
            <span className="font-mono uppercase tracking-[0.3em] text-[10px] text-foreground">
              {selectedCount} {PRODUCTS_TAB.SELECTED}
            </span>
          </div>

          {/* Right: Action Buttons — scrollable on mobile only */}
          <div className="flex items-center flex-nowrap overflow-x-auto md:overflow-visible scrollbar-hide gap-4 md:gap-6 md:ml-6 w-full md:w-auto">
            {/* Select All */}
            {!allSelected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                disabled={isLoading}
                className="h-8 px-3 flex-shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-mono uppercase tracking-[0.3em] text-[10px] whitespace-nowrap rounded-none"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-2" />
                {PRODUCTS_TAB.SELECT_ALL} {totalCount}
              </Button>
            )}

            {/* Move to Category */}
            <Popover open={showCategoryPopover} onOpenChange={setShowCategoryPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 px-3 flex-shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-mono uppercase tracking-[0.3em] text-[10px] whitespace-nowrap rounded-none"
                >
                  <FolderTree className="w-3.5 h-3.5 mr-2" />
                  {PRODUCTS_TAB.MOVE_TO_CATEGORY}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 bg-card border border-border rounded-none">
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onMoveToCategory(null);
                      setShowCategoryPopover(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent rounded-none font-mono"
                  >
                    {PRODUCTS_TAB.NONE}
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        onMoveToCategory(cat);
                        setShowCategoryPopover(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent rounded-none font-mono"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Price */}
            <Popover open={showPricePopover} onOpenChange={setShowPricePopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 px-3 flex-shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-mono uppercase tracking-[0.3em] text-[10px] whitespace-nowrap rounded-none"
                >
                  <Tag className="w-3.5 h-3.5 mr-2" />
                  {PRODUCTS_TAB.PRICE}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4 bg-card border border-border rounded-none">
                <div className="space-y-3">
                  <label className="font-mono uppercase tracking-[0.2em] text-[10px] text-muted-foreground block">
                    {PRODUCTS_TAB.PRICE} (৳)
                  </label>
                  <Input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePriceUpdate()}
                    placeholder="0"
                    className="bg-muted border-border text-foreground font-mono h-9 rounded-none focus-visible:ring-0 focus-visible:border-border"
                    autoFocus
                  />
                  <Button
                    onClick={handlePriceUpdate}
                    disabled={isLoading || !priceInput}
                    className="w-full h-9 bg-accent hover:bg-accent/80 text-accent-foreground font-mono uppercase tracking-[0.2em] text-[10px] rounded-none"
                  >
                    {ACTIONS.UPDATE || 'Update'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Stock */}
            <Popover open={showStockPopover} onOpenChange={setShowStockPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 px-3 flex-shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-mono uppercase tracking-[0.3em] text-[10px] whitespace-nowrap rounded-none"
                >
                  <Package className="w-3.5 h-3.5 mr-2" />
                  {PRODUCTS_TAB.STOCK}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4 bg-card border border-border rounded-none">
                <div className="space-y-3">
                  <label className="font-mono uppercase tracking-[0.2em] text-[10px] text-muted-foreground block">
                    {PRODUCTS_TAB.STOCK}
                  </label>
                  <Input
                    type="number"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStockUpdate()}
                    placeholder="0"
                    className="bg-muted border-border text-foreground font-mono h-9 rounded-none focus-visible:ring-0 focus-visible:border-border"
                    autoFocus
                  />
                  <Button
                    onClick={handleStockUpdate}
                    disabled={isLoading || !stockInput}
                    className="w-full h-9 bg-accent hover:bg-accent/80 text-accent-foreground font-mono uppercase tracking-[0.2em] text-[10px] rounded-none"
                  >
                    {ACTIONS.UPDATE || 'Update'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading}
              className="h-8 px-3 flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors font-mono uppercase tracking-[0.3em] text-[10px] whitespace-nowrap rounded-none"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              {PRODUCTS_TAB.DELETE_SHORT}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) setDeleteConfirmText("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{PRODUCTS_TAB.CONFIRM_DELETE}</AlertDialogTitle>
            <AlertDialogDescription>
              {PRODUCTS_TAB.DELETE_WARNING.replace("{count}", String(selectedCount))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground">
              Type <span className="font-bold text-foreground">DELETE</span> to confirm
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="bg-muted border-border text-foreground font-mono h-9 rounded-none focus-visible:ring-0 focus-visible:border-border"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{ACTIONS.CANCEL}</AlertDialogCancel>
            <button
              disabled={deleteConfirmText !== "DELETE" || isLoading}
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
                setDeleteConfirmText("");
              }}
              className="h-9 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-none font-mono text-sm uppercase tracking-wider"
            >
              {ACTIONS.DELETE} {selectedCount > 0 && selectedCount}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsBar;
