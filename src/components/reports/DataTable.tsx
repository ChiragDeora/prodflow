'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: string[];
  maxRows?: number;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  maxRows = 100,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Format column header
  const formatHeader = (col: string) => {
    return col
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };
  
  // Format cell value
  const formatValue = (value: unknown, column: string): string => {
    if (value === null || value === undefined) return '-';
    
    if (typeof value === 'number') {
      // Check if it's a percentage
      if (column.includes('rate') || column.includes('pct') || column.includes('efficiency')) {
        return `${value.toFixed(2)}%`;
      }
      // Check if it's a weight
      if (column.includes('kg') || column.includes('weight')) {
        return `${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
      }
      // Default number formatting
      return value.toLocaleString('en-IN', { 
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
      });
    }
    
    // Handle date strings
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(value);
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    }
    
    return String(value);
  };
  
  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      // Handle null/undefined
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      
      // Compare numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Compare strings
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);
  
  // Handle sort click
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  // Get displayed data
  const displayedData = sortedData.slice(0, maxRows);
  
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data available
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map(column => (
              <th
                key={column}
                onClick={() => handleSort(column)}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  {formatHeader(column)}
                  {sortColumn === column ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )
                  ) : (
                    <ChevronsUpDown className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {displayedData.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map(column => (
                <td
                  key={column}
                  className={`px-4 py-3 text-sm ${
                    typeof row[column] === 'number' ? 'text-right font-mono' : 'text-left'
                  } text-gray-900`}
                >
                  {formatValue(row[column], column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {data.length > maxRows && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 text-center">
          Showing {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  );
};

export default DataTable;

