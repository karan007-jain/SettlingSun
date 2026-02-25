"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteInputProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  /** Called with each keystroke in the search box — use for server-side filtering */
  onSearch?: (query: string) => void;
  isLoading?: boolean;
}

export function AutocompleteInput({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  label,
  error,
  onSearch,
  isLoading,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);
  // When a value is set but not yet in the fetched options (e.g. edit mode
  // and the record is outside the first page), show the raw value as fallback
  // so the field never looks empty.
  const displayLabel = selectedOption?.label ?? (value || undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !displayLabel && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {displayLabel ?? placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          {/* shouldFilter=false when onSearch is provided — server handles filtering */}
          <Command shouldFilter={!onSearch}>
            <CommandInput
              placeholder="Search…"
              onValueChange={onSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                <>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={() => {
                          onChange(option.value === value ? "" : option.value);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
