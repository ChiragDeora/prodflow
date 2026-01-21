'use client';

import React, { useState, useRef, useEffect } from 'react';

interface UOMSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

// Helper function to normalize UOM value
const normalizeUOMValue = (value: string): string => {
  if (!value) return '';
  const upper = value.toUpperCase().trim();
  // Handle various input formats
  if (upper === 'KG' || upper === 'KGS' || upper === 'KILOGRAMS' || upper === 'KILOGRAM') {
    return 'KG';
  }
  if (upper === 'NOS' || upper === 'NUMBERS' || upper === 'NUMBER') {
    return 'NOS';
  }
  if (upper === 'METERS' || upper === 'METER' || upper === 'M' || upper === 'METRES' || upper === 'METRE') {
    return 'METERS';
  }
  return upper; // Return as-is if not recognized
};

// Helper function to format UOM for display - show full names
const formatUOMDisplay = (value: string): string => {
  if (!value || value.trim() === '') {
    return 'Select UOM';
  }
  const normalized = normalizeUOMValue(value);
  switch (normalized) {
    case 'KG':
      return 'Kilograms';
    case 'NOS':
      return 'Numbers';
    case 'METERS':
      return 'Meters';
    default:
      return 'Select UOM';
  }
};

// Helper function to get full name for option
const getUOMFullName = (value: string): string => {
  switch (value) {
    case 'KG':
      return 'Kilograms';
    case 'NOS':
      return 'Numbers';
    case 'METERS':
      return 'Meters';
    default:
      return value;
  }
};

const UOMSelect: React.FC<UOMSelectProps> = ({ value, onChange, className = '', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  // Normalize the value prop to ensure it matches our expected format
  const normalizedValue = normalizeUOMValue(value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options = [
    { value: 'KG', label: 'Kilograms' },
    { value: 'NOS', label: 'Numbers' },
    { value: 'METERS', label: 'Meters' },
  ];

  const handleSelect = (optionValue: string) => {
    // Ensure we store the normalized value (KG, NOS, METERS)
    const normalized = normalizeUOMValue(optionValue);
    onChange(normalized);
    setIsOpen(false);
  };

  // For print media, use native select (simpler and more reliable)
  const isPrintMode = className.includes('print:');
  
  if (isPrintMode) {
    return (
      <select
        value={normalizedValue}
        onChange={(e) => {
          const normalized = normalizeUOMValue(e.target.value);
          onChange(normalized);
        }}
        disabled={disabled}
        className={className}
      >
        <option value="">Select UOM</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between min-h-[2.25rem] ${
          disabled 
            ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
            : 'bg-white'
        }`}
      >
        <span className="flex-1 text-left">{formatUOMDisplay(normalizedValue)}</span>
        {!normalizedValue && !disabled && (
          <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-auto">
          <div
            className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
            onClick={() => handleSelect('')}
          >
            Select UOM
          </div>
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-2 py-1 hover:bg-gray-100 cursor-pointer ${
                normalizedValue === option.value ? 'bg-blue-50 font-medium' : ''
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UOMSelect;
export { formatUOMDisplay };
