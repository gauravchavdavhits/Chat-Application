import React, { useState, useRef, useEffect } from 'react';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-detect if opening near the bottom of viewport / container to open upwards
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 220) {
          setOpenUpwards(true);
        } else {
          setOpenUpwards(false);
        }
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        zIndex: isOpen ? 1000 : 1,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'var(--input-bg)',
          border: isOpen
            ? '1px solid var(--accent-color, #6366f1)'
            : '1px solid var(--border-color)',
          color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)',
          fontSize: '14px',
          fontWeight: '500',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(99, 102, 241, 0.25), 0 4px 16px rgba(0, 0, 0, 0.15)'
            : '0 2px 6px rgba(0, 0, 0, 0.05)',
          opacity: disabled ? 0.6 : 1,
          outline: 'none',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          {selectedOption?.icon && (
            <span style={{ display: 'flex', color: 'var(--accent-color, #6366f1)', flexShrink: 0 }}>
              {selectedOption.icon}
            </span>
          )}
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Chevron Arrow */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: (isOpen && !openUpwards) || (isOpen && openUpwards) ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
            color: isOpen ? 'var(--accent-color, #6366f1)' : 'var(--text-muted)',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(openUpwards
              ? { bottom: 'calc(100% + 6px)', top: 'auto' }
              : { top: 'calc(100% + 6px)', bottom: 'auto' }),
            left: 0,
            right: 0,
            zIndex: 99999,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '6px',
            boxShadow:
              '0 20px 48px rgba(0, 0, 0, 0.25), 0 4px 16px rgba(99, 102, 241, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            animation: 'customSelectFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={(e) => handleSelect(opt.value, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isSelected ? '600' : '400',
                  color: isSelected ? 'var(--accent-color)' : 'var(--text-main)',
                  background: isSelected
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {opt.icon && (
                    <span
                      style={{
                        display: 'flex',
                        color: isSelected ? 'var(--accent-color, #6366f1)' : 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      {opt.icon}
                    </span>
                  )}
                  <div>
                    <div style={{ lineHeight: '1.3' }}>{opt.label}</div>
                    {opt.description && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.2' }}>
                        {opt.description}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-color, #6366f1)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginLeft: '8px' }}
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
