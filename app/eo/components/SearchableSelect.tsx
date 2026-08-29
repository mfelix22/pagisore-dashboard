"use client";

import { Fragment, useEffect, useRef, useState } from "react";

export type SearchableOption = {
  value: number;
  label: string;
  className?: string;
  group?: string;
};

type SearchableSelectProps = {
  value: number;
  onChange: (value: number) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
};

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "— Select —",
  emptyLabel = "No matches",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const TEXT_TO_BG: Record<string, string> = {
    "text-red-400": "bg-red-400",
    "text-red-500": "bg-red-500",
    "text-purple-400": "bg-purple-400",
    "text-purple-500": "bg-purple-500",
    "text-blue-400": "bg-blue-400",
    "text-blue-500": "bg-blue-500",
    "text-yellow-500": "bg-yellow-500",
    "text-yellow-400": "bg-yellow-400",
    "text-yellow-600": "bg-yellow-600",
    "text-green-400": "bg-green-400",
    "text-green-500": "bg-green-500",
    "text-orange-400": "bg-orange-400",
    "text-orange-500": "bg-orange-500",
    "text-sky-300": "bg-sky-300",
    "text-pink-400": "bg-pink-400",
  };

  const selectedBg = selected?.className
    ? TEXT_TO_BG[selected.className] ?? ""
    : "";

  const filtered = (query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.trim().toLowerCase()) ||
          (o.group ?? "")
            .toLowerCase()
            .includes(query.trim().toLowerCase())
      )
    : options
  ).sort((a, b) => {
    const groupA = a.group ?? "";
    const groupB = b.group ?? "";
    if (groupA !== groupB) return groupA.localeCompare(groupB);
    return a.label.localeCompare(b.label);
  });

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
        className={`flex w-full items-center justify-between rounded-md border border-[#4e5058]/50 bg-[#2b2d31] ${selectedBg} px-3 py-2 text-left text-sm focus:border-[#5865f2] focus:outline-none ${className ?? ""}`}
      >
        <span
          className={`block truncate ${
            selectedBg
              ? "text-black"
              : selected
              ? "text-[#f2f3f5]"
              : "text-[#b5bac1]"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${
            open ? "rotate-180" : ""
          } ${selectedBg ? "text-black" : "text-[#b5bac1]"}`}
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
              filtered.map((option, index) => {
                const showHeader =
                  index === 0 ||
                  option.group !== filtered[index - 1].group;
                return (
                  <Fragment key={option.value}>
                    {showHeader && option.group && (
                      <li className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#b5bac1]">
                        {option.group}
                      </li>
                    )}
                    <li
                      onClick={() => handleSelect(option.value)}
                      className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                        option.value === value
                          ? "bg-[#5865f2] text-white"
                          : `${option.className || "text-[#f2f3f5]"} hover:bg-[#4e5058]`
                      }`}
                    >
                      {option.label}
                    </li>
                  </Fragment>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
