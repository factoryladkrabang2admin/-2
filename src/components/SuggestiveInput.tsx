import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Clock, Check, X } from 'lucide-react';

interface SuggestiveInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  icon?: React.ReactNode;
  accentColor?: 'rose' | 'emerald' | 'blue' | 'purple' | 'indigo';
  required?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  helperText?: string;
  disabled?: boolean;
  inputClassName?: string;
  maxLength?: number;
}

export const SuggestiveInput: React.FC<SuggestiveInputProps> = ({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder = '',
  icon,
  accentColor = 'rose',
  required = false,
  hasError = false,
  errorMessage,
  helperText,
  disabled = false,
  inputClassName,
  maxLength,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filter & rank suggestions based on typed query (even a single character / consonant)
  const filteredSuggestions = useMemo(() => {
    // Deduplicate suggestions list first
    const uniqueSuggestions = Array.from(
      new Set(suggestions.map((s) => (s || '').trim()).filter(Boolean))
    );

    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      // If empty and opened, show top recent 8 suggestions
      return uniqueSuggestions.slice(0, 8);
    }

    const startsWith: string[] = [];
    const contains: string[] = [];

    for (const item of uniqueSuggestions) {
      const lower = item.toLowerCase();
      if (lower === trimmed) {
        // exact match can still be shown
        startsWith.push(item);
      } else if (lower.startsWith(trimmed)) {
        startsWith.push(item);
      } else if (lower.includes(trimmed)) {
        contains.push(item);
      }
    }

    return [...startsWith, ...contains].slice(0, 12);
  }, [value, suggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        e.preventDefault();
        selectOption(filteredSuggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  // Color classes mapping
  const ringFocusClass =
    accentColor === 'emerald'
      ? 'focus:ring-2 focus:ring-emerald-500'
      : accentColor === 'blue'
      ? 'focus:ring-2 focus:ring-blue-500'
      : accentColor === 'purple'
      ? 'focus:ring-2 focus:ring-purple-500'
      : accentColor === 'indigo'
      ? 'focus:ring-2 focus:ring-indigo-500'
      : 'focus:ring-2 focus:ring-rose-500';

  const itemActiveClass =
    accentColor === 'emerald'
      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
      : accentColor === 'blue'
      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200'
      : accentColor === 'purple'
      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200'
      : accentColor === 'indigo'
      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200';

  const badgeClass =
    accentColor === 'emerald'
      ? 'text-emerald-600 bg-emerald-100/70 dark:bg-emerald-900/40'
      : accentColor === 'blue'
      ? 'text-blue-600 bg-blue-100/70 dark:bg-blue-900/40'
      : accentColor === 'purple'
      ? 'text-purple-600 bg-purple-100/70 dark:bg-purple-900/40'
      : accentColor === 'indigo'
      ? 'text-indigo-600 bg-indigo-100/70 dark:bg-indigo-900/40'
      : 'text-rose-600 bg-rose-100/70 dark:bg-rose-900/40';

  // Highlight matching part of text
  const renderHighlightedText = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return <span>{text}</span>;

    const lowerText = text.toLowerCase();
    const lowerQuery = trimmed.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return <span>{text}</span>;

    const before = text.slice(0, index);
    const match = text.slice(index, index + trimmed.length);
    const after = text.slice(index + trimmed.length);

    return (
      <span>
        {before}
        <strong className="underline decoration-2 font-black text-slate-900 dark:text-white">
          {match}
        </strong>
        {after}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          required={required}
          className={
            inputClassName ||
            `w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none transition-all pr-16 ${
              hasError
                ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                : `border-slate-300 dark:border-slate-700 ${ringFocusClass}`
            }`
          }
        />

        {/* Action icons inside the input */}
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                onChange('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="ล้างข้อความ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className={`p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-transform ${
              isOpen ? 'rotate-180 text-slate-600 dark:text-slate-200' : ''
            }`}
            title="ดูตัวเลือกที่จำไว้"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Helper text or error message */}
      {hasError && errorMessage ? (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 mt-1">
          <span>{errorMessage}</span>
        </p>
      ) : helperText ? (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
      ) : null}

      {/* Autocomplete Dropdown List */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          id={`${id}-suggestions-dropdown`}
          className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto"
        >
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>ประวัติและตัวเลือกที่จำไว้ ({filteredSuggestions.length})</span>
            </span>
            <span className="text-[9px] text-slate-400">กดเพื่อเลือก</span>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60" role="listbox">
            {filteredSuggestions.map((item, idx) => {
              const isSelected = item.toLowerCase() === value.trim().toLowerCase();
              const isHighlighted = idx === activeIndex;

              return (
                <li
                  key={`${item}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    // prevent input blur before select
                    e.preventDefault();
                    selectOption(item);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isHighlighted ? itemActiveClass : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
                    <span className="truncate font-medium">
                      {renderHighlightedText(item, value)}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${badgeClass}`}>
                      <Check className="w-3 h-3" />
                      <span>เลือกอยู่</span>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
