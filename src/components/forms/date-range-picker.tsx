"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate } from "@/lib/utils";
import { startOfDay, subDays, format } from "date-fns";

interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateRangePickerProps {
  onRangeChange?: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ onRangeChange, className }: DateRangePickerProps) {
  const [range, setRange] = React.useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [isOpen, setIsOpen] = React.useState(false);

  const presets = [
    { label: "Today", days: 0 },
    { label: "Yesterday", days: 1 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
  ];

  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = days === 0 ? startOfDay(to) : subDays(to, days);
    const newRange = { from, to };
    setRange(newRange);
    if (onRangeChange) onRangeChange(newRange);
    setIsOpen(false);
  };

  const handleDateChange = (type: "from" | "to", dateString: string) => {
    if (!dateString) return;
    const date = new Date(dateString);
    const newRange = {
      ...range,
      [type]: date,
    };
    setRange(newRange);
    if (onRangeChange) onRangeChange(newRange);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-medium gap-2 h-10",
              !range.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm shrink-0">
              {range.from ? (
                range.to ? (
                  <>
                    {formatDate(range.from)} - {formatDate(range.to)}
                  </>
                ) : (
                  formatDate(range.from)
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <h4 className="font-semibold text-sm leading-none">Select range</h4>
            
            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold justify-center"
                  onClick={() => handlePresetClick(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Custom Inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">From</span>
                  <input
                    type="date"
                    className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    value={range.from ? format(range.from, "yyyy-MM-dd") : ""}
                    onChange={(e) => handleDateChange("from", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">To</span>
                  <input
                    type="date"
                    className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    value={range.to ? format(range.to, "yyyy-MM-dd") : ""}
                    onChange={(e) => handleDateChange("to", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
