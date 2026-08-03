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

const MAX_SUGGESTIONS = 20;

// Shared across every SystemAutocomplete instance on the page - fetched once
// and reused, instead of querying the backend on every keystroke.
let systemsCache: Promise<SystemNameMatch[]> | null = null;

function getAllSystemsCached(): Promise<SystemNameMatch[]> {
  if (!systemsCache) {
    systemsCache = api.getAllSystems().then(
      ({ data }) => data,
      (err) => {
        systemsCache = null; // allow a retry on the next mount if this failed
        throw err;
      },
    );
  }
  return systemsCache;
}

export default function SystemAutocomplete({
  value,
  onChange,
  placeholder,
  disabled,
}: Props) {
  const [allSystems, setAllSystems] = useState<SystemNameMatch[] | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<SystemNameMatch[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getAllSystemsCached()
      .then((systems) => {
        if (!cancelled) setAllSystems(systems);
      })
      .catch(() => {
        if (!cancelled) setAllSystems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!allSystems || !value || value.length < 2) {
      setSuggestions([]);
      return;
    }

    const q = value.toLowerCase();
    setSuggestions(
      allSystems
        .filter((system) => system.name.toLowerCase().startsWith(q))
        .slice(0, MAX_SUGGESTIONS),
    );
  }, [allSystems, value]);

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
