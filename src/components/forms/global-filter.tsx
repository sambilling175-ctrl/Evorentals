"use client";

import * as React from "react";
import { SearchBar } from "@/components/forms/search-bar";
import { DateRangePicker } from "@/components/forms/date-range-picker";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// To make this fully self-contained and clean with our shadcn wrapper structure:
interface GlobalFilterProps {
  onFilterChange?: (filters: {
    search: string;
    dateRange: { from?: Date; to?: Date };
  }) => void;
  className?: string;
}

export function GlobalFilter({ onFilterChange, className }: GlobalFilterProps) {
  const [search, setSearch] = React.useState("");
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});

  const handleReset = () => {
    setSearch("");
    setDateRange({});
    triggerChange("", {});
  };

  const triggerChange = (
    s = search,
    d = dateRange
  ) => {
    if (onFilterChange) {
      onFilterChange({ search: s, dateRange: d });
    }
  };

  return (
    <div className={cn("flex w-full flex-col items-stretch gap-3 md:flex-row md:items-center", className)}>
      {/* Search Input */}
      <div className="flex-1">
        <SearchBar
          onSearch={(val) => {
            setSearch(val);
            triggerChange(val, dateRange);
          }}
          placeholder="Search items..."
        />
      </div>

      {/* Date Picker */}
      <div className="w-full md:w-64 shrink-0">
        <DateRangePicker
          onRangeChange={(range) => {
            setDateRange(range);
            triggerChange(search, range);
          }}
        />
      </div>

      {/* Reset */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleReset}
        className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
        title="Reset filters"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}
