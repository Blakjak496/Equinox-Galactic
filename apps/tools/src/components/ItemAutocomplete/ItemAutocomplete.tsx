"use client";

import { useEffect, useRef, useState } from "react";
import { api, ItemSearchMatch } from "@/lib/api";
import styles from "./ItemAutocomplete.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: ItemSearchMatch) => void;
  placeholder?: string;
  disabled?: boolean;
};

// Live search-as-you-type against /tools/build/items/search, unlike
// SystemAutocomplete's preload-everything-once approach - the item catalog
// (every SDE type referenced by a blueprint) is a lot bigger than the
// system list, so the search endpoint that already exists for it is a
// better fit than pulling the whole thing client-side.
const DEBOUNCE_MS = 200;

export default function ItemAutocomplete({ value, onChange, onSelect, placeholder, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<ItemSearchMatch[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      api
        .searchItems(value)
        .then(({ data }) => setSuggestions(data))
        .catch(() => setSuggestions([]));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className={styles.dropdown}>
          {suggestions.map((item) => (
            <li
              key={item.typeId}
              className={styles.option}
              onClick={() => {
                onSelect(item);
                setOpen(false);
              }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
