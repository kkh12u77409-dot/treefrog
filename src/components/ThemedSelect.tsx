import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface ThemedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  compact?: boolean;
  disabled?: boolean;
  isRtl?: boolean;
}

export const ThemedSelect: React.FC<ThemedSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  menuClassName = '',
  compact = false,
  disabled = false,
  isRtl = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Position calculation: check if there's enough room below, else open upward
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(options.length * (compact ? 36 : 56) + 16, 280);

    if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
      setOpenUpward(true);
    } else {
      setOpenUpward(false);
    }
  }, [options.length, compact]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  // Close on outside click or blur
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === value);
        if (e.key === 'ArrowDown') {
          const nextIndex = (currentIndex + 1) % options.length;
          onChange(options[nextIndex].value);
        } else {
          const prevIndex = (currentIndex - 1 + options.length) % options.length;
          onChange(options[prevIndex].value);
        }
      } else if (e.key === 'Enter') {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      updateDropdownPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, options, value, onChange, updateDropdownPosition]);

  const SelectedIcon = selectedOption?.icon;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-start ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Trigger Box (المربع الخاص بالقائمة) */}
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 rounded-xl transition-all select-none font-medium border ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        } ${
          isOpen
            ? 'bg-slate-800/95 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30'
            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {SelectedIcon && (
            <SelectedIcon className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-400 shrink-0`} />
          )}
          <span className="truncate font-semibold text-slate-100">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu (محتوى القائمة المنسدلة - يظهر تحت المربع وليس فوقه) */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 min-w-full w-max max-w-sm bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-1.5 text-xs backdrop-blur-xl animate-fadeIn ${
            openUpward
              ? 'bottom-full mb-1.5 origin-bottom'
              : 'top-full mt-1.5 origin-top'
          } ${
            isRtl ? 'right-0' : 'left-0'
          } ${menuClassName}`}
          style={{ maxHeight: '280px', overflowY: 'auto' }}
        >
          <div className="space-y-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              const OptionIcon = opt.icon;

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-start transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold'
                      : 'hover:bg-slate-800 text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {OptionIcon && (
                      <OptionIcon
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                              isSelected
                                ? 'bg-emerald-500/30 text-emerald-300'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                          {opt.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 ms-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
