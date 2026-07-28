"use client";

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
  delay?: number;
  loading?: boolean;
  className?: string;
}

export function SearchBar({
  onSearch,
  placeholder = "Search...",
  defaultValue = "",
  delay = 400,
  loading = false,
  className,
}: SearchBarProps) {
  const [value, setValue] = React.useState(defaultValue);
  const debouncedValue = useDebounce(value, delay);

  // Run onSearch only when debouncedValue changes
  React.useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleClear = () => {
    setValue("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-10 w-full"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        {value && !loading && (
          <button
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
