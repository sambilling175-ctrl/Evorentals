"use client";

import * as React from "react";
import { SearchBar } from "@/components/forms/search-bar";
import { DateRangePicker } from "@/components/forms/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";

// To make this fully self-contained and clean with our shadcn wrapper structure:
interface GlobalFilterProps {
  onFilterChange?: (filters: {
    search: string;
    branch: string;
    dateRange: { from?: Date; to?: Date };
  }) => void;
  className?: string;
}

export function GlobalFilter({ onFilterChange, className }: GlobalFilterProps) {
  const [search, setSearch] = React.useState("");
  const [branch, setBranch] = React.useState("all");
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});

  const handleReset = () => {
    setSearch("");
    setBranch("all");
    setDateRange({});
    triggerChange("", "all", {});
  };

  const triggerChange = (
    s = search,
    b = branch,
    d = dateRange
  ) => {
    if (onFilterChange) {
      onFilterChange({ search: s, branch: b, dateRange: d });
    }
  };

  return (
    <div className={cn("flex w-full flex-col items-stretch gap-3 md:flex-row md:items-center", className)}>
      {/* Search Input */}
      <div className="flex-1">
        <SearchBar
          onSearch={(val) => {
            setSearch(val);
            triggerChange(val, branch, dateRange);
          }}
          placeholder="Search items..."
        />
      </div>

      {/* Branch Dropdown Selector */}
      <div className="w-full md:w-48 shrink-0">
        <Select
          value={branch}
          onValueChange={(val) => {
            setBranch(val);
            triggerChange(search, val, dateRange);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {BRANCHES.map((b) => (
              <SelectItem key={b.id} value={b.code}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Picker */}
      <div className="w-full md:w-64 shrink-0">
        <DateRangePicker
          onRangeChange={(range) => {
            setDateRange(range);
            triggerChange(search, branch, range);
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
