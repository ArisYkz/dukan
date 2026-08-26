import React from 'react';
import { Search, Grid, List } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useLabels } from '@/hooks/useLabels';

export interface SortConfig {
  type: 'default' | 'price' | 'date';
  direction?: 'asc' | 'desc';
}

export interface ActionBarProps {
  sortConfig: SortConfig;
  onSortChange: (type: 'default' | 'price' | 'date') => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

const ActionBar = ({ sortConfig, onSortChange, searchQuery, onSearchChange, onSelectAll, isAllSelected, viewMode, onViewModeChange }: ActionBarProps) => {
  const { STOREFRONT } = useLabels();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 md:py-4 gap-2 md:gap-4 border-b border-[hsl(var(--border)/0.3)]">
      {/* Left: sort button group */}
      <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs tracking-widest uppercase font-medium">
        {onSelectAll && (
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onSelectAll}
            className="w-4 h-4 mr-2"
          />
        )}
        <span className="text-[hsl(var(--foreground)/0.5)]">
          {STOREFRONT.SORT_BY}:
        </span>
        
        <div className="flex gap-6">
          {/* DEFAULT */}
          <button
            onClick={() => onSortChange('default')}
            className={`transition-colors ${sortConfig.type === 'default' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground)/0.6)] hover:text-[hsl(var(--foreground))]'}`}
          >
            {STOREFRONT.RECOMMENDED}
          </button>

          {/* PRICE */}
          <button
            onClick={() => onSortChange('price')}
            className={`flex items-center gap-1 transition-colors ${sortConfig.type === 'price' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground)/0.6)] hover:text-[hsl(var(--foreground))]'}`}
          >
            {STOREFRONT.PRICE}
            {sortConfig.type === 'price' && (
              <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
            )}
          </button>

          {/* DATE */}
          <button
            onClick={() => onSortChange('date')}
            className={`flex items-center gap-1 transition-colors ${sortConfig.type === 'date' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground)/0.6)] hover:text-[hsl(var(--foreground))]'}`}
          >
            {STOREFRONT.DATE}
            {sortConfig.type === 'date' && (
              <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Right: viewMode toggle + search box */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* View Mode Toggle */}
        {onViewModeChange && viewMode && (
          <div className="flex items-center gap-1 bg-[hsl(var(--muted)/0.3)] rounded-sm p-0.5">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-sm transition-all ${
                viewMode === 'grid'
                  ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--foreground)/0.5)] hover:text-[hsl(var(--foreground))]'
              }`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-sm transition-all ${
                viewMode === 'list'
                  ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--foreground)/0.5)] hover:text-[hsl(var(--foreground))]'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search box */}
        <div className="relative w-full sm:w-48 md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={STOREFRONT.SEARCH_PLACEHOLDER}
            className="w-full bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] px-2 md:px-3 py-1 md:py-1.5 pl-7 md:pl-9 text-[10px] md:text-xs focus:outline-none focus:border-[hsl(var(--primary)/0.5)] transition-all"
          />
          <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-3.5 md:h-3.5 text-[hsl(var(--foreground)/0.4)]" />
        </div>
      </div>
    </div>
  );
};

export default ActionBar;