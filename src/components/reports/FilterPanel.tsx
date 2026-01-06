'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { ReportFilter, MetricCategory, DATE_RANGE_PRESETS } from '@/lib/reports';

interface FilterPanelProps {
  category: MetricCategory;
  filters: ReportFilter;
  onChange: (filters: ReportFilter) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  category,
  filters,
  onChange,
}) => {
  const [filterOptions, setFilterOptions] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  
  // Fetch filter options for category
  useEffect(() => {
    const fetchFilters = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/filters/${category}`);
        const result = await response.json();
        if (result.success) {
          setFilterOptions(result.data);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFilters();
  }, [category]);
  
  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      onChange({ ...filters, dateRange: value });
    }
  };
  
  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    const currentRange = typeof filters.dateRange === 'object' 
      ? filters.dateRange 
      : { from: '', to: '' };
    
    onChange({
      ...filters,
      dateRange: { ...currentRange, [field]: value },
    });
  };
  
  const handleMultiSelectChange = (
    field: keyof ReportFilter,
    values: string[]
  ) => {
    onChange({ ...filters, [field]: values.length > 0 ? values : undefined });
  };
  
  return (
    <div className="space-y-4">
      {/* Date Range */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Date Range</label>
        <select
          value={typeof filters.dateRange === 'string' ? filters.dateRange : 'custom'}
          onChange={(e) => handleDateRangeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500"
        >
          {DATE_RANGE_PRESETS.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom Range</option>
        </select>
        
        {/* Custom Date Inputs */}
        {(showCustomDate || typeof filters.dateRange === 'object') && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={typeof filters.dateRange === 'object' ? filters.dateRange.from : ''}
              onChange={(e) => handleCustomDateChange('from', e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-md text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={typeof filters.dateRange === 'object' ? filters.dateRange.to : ''}
              onChange={(e) => handleCustomDateChange('to', e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-md text-sm"
              placeholder="To"
            />
          </div>
        )}
      </div>
      
      {/* Category-specific filters */}
      {category === 'production' && (
        <>
          {/* Molds Filter */}
          {filterOptions.molds && (filterOptions.molds as string[]).length > 0 && (
            <MultiSelectFilter
              label="Molds"
              options={filterOptions.molds as string[]}
              selected={filters.molds || []}
              onChange={(values) => handleMultiSelectChange('molds', values)}
            />
          )}
          
          {/* Machines Filter */}
          {filterOptions.machines && (filterOptions.machines as string[]).length > 0 && (
            <MultiSelectFilter
              label="Machines"
              options={filterOptions.machines as string[]}
              selected={filters.machines || []}
              onChange={(values) => handleMultiSelectChange('machines', values)}
            />
          )}
          
          {/* Lines Filter */}
          {filterOptions.lines && (filterOptions.lines as string[]).length > 0 && (
            <MultiSelectFilter
              label="Lines"
              options={filterOptions.lines as string[]}
              selected={filters.lines || []}
              onChange={(values) => handleMultiSelectChange('lines', values)}
            />
          )}
          
          {/* Shift Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Shift</label>
            <div className="flex gap-2">
              {['DAY', 'NIGHT'].map(shift => (
                <label key={shift} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!filters.shifts || filters.shifts.includes(shift as 'DAY' | 'NIGHT')}
                    onChange={(e) => {
                      const current = filters.shifts || ['DAY', 'NIGHT'];
                      if (e.target.checked) {
                        onChange({ ...filters, shifts: [...current, shift as 'DAY' | 'NIGHT'] });
                      } else {
                        const newShifts = current.filter(s => s !== shift);
                        onChange({ ...filters, shifts: newShifts.length > 0 ? newShifts as ('DAY' | 'NIGHT')[] : undefined });
                      }
                    }}
                    className="rounded border-gray-300 text-slate-600"
                  />
                  {shift}
                </label>
              ))}
            </div>
          </div>
          
          {/* Include Changeover */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.includeChangeover !== false}
              onChange={(e) => onChange({ ...filters, includeChangeover: e.target.checked })}
              className="rounded border-gray-300 text-slate-600"
            />
            Include changeover entries
          </label>
        </>
      )}
      
      {category === 'dispatch' && (
        <>
          {/* Customers Filter */}
          {filterOptions.customers && (filterOptions.customers as string[]).length > 0 && (
            <MultiSelectFilter
              label="Customers"
              options={filterOptions.customers as string[]}
              selected={filters.customers || []}
              onChange={(values) => handleMultiSelectChange('customers', values)}
            />
          )}
        </>
      )}
      
      {category === 'stock' && (
        <>
          {/* Locations Filter */}
          {filterOptions.locations && (filterOptions.locations as string[]).length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Locations</label>
              <div className="flex flex-wrap gap-2">
                {(filterOptions.locations as string[]).map(loc => (
                  <label key={loc} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!filters.locations || filters.locations.includes(loc)}
                      onChange={(e) => {
                        const current = filters.locations || (filterOptions.locations as string[]);
                        if (e.target.checked) {
                          onChange({ ...filters, locations: [...current, loc] });
                        } else {
                          const newLocs = current.filter(l => l !== loc);
                          onChange({ ...filters, locations: newLocs.length > 0 ? newLocs : undefined });
                        }
                      }}
                      className="rounded border-gray-300 text-slate-600"
                    />
                    {loc.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Item Types Filter */}
          {filterOptions.itemTypes && (filterOptions.itemTypes as string[]).length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Item Types</label>
              <div className="flex flex-wrap gap-2">
                {(filterOptions.itemTypes as string[]).map(type => (
                  <label key={type} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!filters.itemTypes || filters.itemTypes.includes(type)}
                      onChange={(e) => {
                        const current = filters.itemTypes || (filterOptions.itemTypes as string[]);
                        if (e.target.checked) {
                          onChange({ ...filters, itemTypes: [...current, type] });
                        } else {
                          const newTypes = current.filter(t => t !== type);
                          onChange({ ...filters, itemTypes: newTypes.length > 0 ? newTypes : undefined });
                        }
                      }}
                      className="rounded border-gray-300 text-slate-600"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      {category === 'procurement' && (
        <>
          {/* Suppliers Filter */}
          {filterOptions.suppliers && (filterOptions.suppliers as string[]).length > 0 && (
            <MultiSelectFilter
              label="Suppliers"
              options={filterOptions.suppliers as string[]}
              selected={filters.suppliers || []}
              onChange={(values) => handleMultiSelectChange('suppliers', values)}
            />
          )}
        </>
      )}
      
      {/* Top N Filter */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Limit Results</label>
        <select
          value={filters.topN || ''}
          onChange={(e) => onChange({ ...filters, topN: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Show all</option>
          <option value="5">Top 5</option>
          <option value="10">Top 10</option>
          <option value="20">Top 20</option>
          <option value="50">Top 50</option>
          <option value="100">Top 100</option>
        </select>
      </div>
    </div>
  );
};

// Multi-select filter component
const MultiSelectFilter: React.FC<{
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}> = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };
  
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm text-left"
        >
          <span className={selected.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
            {selected.length === 0 
              ? `All ${label}` 
              : `${selected.length} selected`}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
                />
              </div>
              
              {/* Options */}
              <div className="max-h-48 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">No options found</div>
                ) : (
                  filteredOptions.slice(0, 50).map(opt => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(opt)}
                        onChange={() => handleToggle(opt)}
                        className="rounded border-gray-300 text-slate-600"
                      />
                      <span className="truncate">{opt}</span>
                    </label>
                  ))
                )}
                {filteredOptions.length > 50 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center">
                    Showing first 50 of {filteredOptions.length} options
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="p-2 border-t border-gray-100 flex justify-between">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Selected chips */}
      {selected.length > 0 && selected.length <= 3 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700"
            >
              {val}
              <button onClick={() => handleToggle(val)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;

