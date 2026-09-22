"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  id,
}: SearchInputProps) {
  return (
    <div className={cn("w-full sm:max-w-xs", className)}>
      <Input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        leftIcon={<Search className="h-4 w-4" aria-hidden />}
        rightSlot={
          value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear search"
              className="rounded p-1 text-muted transition hover:bg-slate-100 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null
        }
      />
    </div>
  );
}
