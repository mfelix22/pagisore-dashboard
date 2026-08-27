"use client";

import { useEffect, useRef, useState } from "react";

export type SearchableOption = {
  value: number;
  label: string;
};

type SearchableSelectProps = {
  value: number;
  onChange: (value: number) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyLabel?: string;
};

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "— Select —",
  emptyLabel = "No matches",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function handleSelect(newValue: number) {
    onChange(newValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border border-[#4e5058] bg-[#2b2d31] px-3 py-2 text-left text-sm text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none"
      >
        <span className={selected ? "text-[#f2f3f5]" : "text-[#b5bac1]"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-[#b5bac1] transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-[#383a40] bg-[#2b2d31] shadow-lg ring-1 ring-black/20">
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border border-[#383a40] bg-[#1e1f22] px-3 py-2 text-sm text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none"
              autoFocus
            />
          </div>

          <ul className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[#b5bac1]">{emptyLabel}</li>
            ) : (
              filtered.map((option) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                    option.value === value
                      ? "bg-[#5865f2] text-white"
                      : "text-[#f2f3f5] hover:bg-[#4e5058]"
                  }`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
