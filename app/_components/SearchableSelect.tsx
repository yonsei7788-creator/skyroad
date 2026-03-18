"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { ChevronDown, Search } from "lucide-react";

import styles from "./SearchableSelect.module.css";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}

const highlightMatch = (text: string, query: string): ReactNode => {
  if (!query) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.optionHighlight}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

export const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "선택해주세요",
  hasError = false,
  disabled = false,
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
    setActiveIndex(-1);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      handleClose();
    },
    [onChange, handleClose]
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((p) => (p < filtered.length - 1 ? p + 1 : p));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  };

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Reset active index when query changes — derive from query in onChange
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    setActiveIndex(-1);
  };

  const triggerClass = [
    styles.trigger,
    isOpen && styles.triggerOpen,
    hasError && styles.triggerError,
  ]
    .filter(Boolean)
    .join(" ");

  const iconClass = [styles.triggerIcon, isOpen && styles.triggerIconOpen]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={triggerClass}
        onClick={isOpen ? handleClose : handleOpen}
        disabled={disabled}
      >
        <span
          className={value ? styles.triggerValue : styles.triggerPlaceholder}
        >
          {value || placeholder}
        </span>
        <ChevronDown size={16} className={iconClass} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} onKeyDown={handleKeyDown}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder="학과명 검색..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className={styles.optionList} ref={listRef}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>검색 결과가 없습니다</div>
            ) : (
              filtered.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  className={[
                    styles.option,
                    idx === activeIndex && styles.optionActive,
                    opt === value && styles.optionSelected,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSelect(opt)}
                >
                  {highlightMatch(opt, query)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
