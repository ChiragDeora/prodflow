'use client';

import React from 'react';
import { Unit } from '../lib/supabase';

interface UnitSelectorProps {
  units: Unit[];
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

const UnitSelector: React.FC<UnitSelectorProps> = ({
  units,
  selectedUnit,
  onUnitChange,
  label = 'Unit',
  required = false,
  className = ''
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={selectedUnit}
        onChange={(e) => onUnitChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select Unit</option>
        {units
          .filter(unit => unit.status === 'Active')
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(unit => (
            <option key={unit.id} value={unit.name}>
              {unit.name}
            </option>
          ))}
      </select>
    </div>
  );
};

export default UnitSelector; 