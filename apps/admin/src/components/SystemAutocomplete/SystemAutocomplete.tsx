"use client";

import { useEffect, useRef, useState } from "react";
import { api, SystemNameMatch } from "@/lib/api";
import styles from "./SystemAutocomplete.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function SystemAutocomplete({
  value,
  onChange,
  placeholder,
  disabled,
}: Props) {
  const [suggestions, setSuggestions] = useState<SystemNameMatch[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      api
        .searchSystems(value)
        .then(({ data }) => setSuggestions(data))
        .catch(() => setSuggestions([]));
    }, 200);

    return () => clearTimeout(timeout);
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
          {suggestions.map((system) => (
            <li
              key={system.systemId}
              className={styles.option}
              onClick={() => {
                onChange(system.name);
                setOpen(false);
              }}
            >
              {system.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
