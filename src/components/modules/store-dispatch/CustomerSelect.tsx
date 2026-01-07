'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Customer {
  id: string;
  customer_name: string;
  customer_code?: string;
  address?: string;
  state?: string;
  state_code?: string;
  gst_number?: string;
  email?: string;
  phone?: string;
}

interface CustomerSelectProps {
  value: string;
  customerId?: string;
  onChange: (customer: { 
    id: string; 
    name: string;
    address?: string;
    state?: string;
    stateCode?: string;
    gstNumber?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({
  value,
  customerId,
  onChange,
  placeholder = 'Select Customer',
  className = '',
  disabled = false,
  required = false,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/masters/customers');
        const result = await response.json();
        if (result.success) {
          setCustomers(result.data || []);
          setFilteredCustomers(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const search = searchTerm.toLowerCase();
      const filtered = customers.filter(
        (customer) =>
          customer.customer_name?.toLowerCase().includes(search) ||
          (customer.customer_code && customer.customer_code.toLowerCase().includes(search)) ||
          (customer.gst_number && customer.gst_number.toLowerCase().includes(search))
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onChange({
      id: customer.id,
      name: customer.customer_name || '',
      address: customer.address,
      state: customer.state,
      stateCode: customer.state_code,
      gstNumber: customer.gst_number,
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ id: '', name: '' });
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' && filteredCustomers.length > 0) {
      e.preventDefault();
      handleSelect(filteredCustomers[0]);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex items-center w-full px-3 py-2 border rounded-lg transition-colors print:border-none print:px-0 print:py-1 print:bg-transparent print:shadow-none print:border-b print:border-gray-400 ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }
        }}
      >
        <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 print:hidden" />
        
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={value || placeholder}
            className="flex-1 outline-none bg-transparent text-sm"
            disabled={disabled}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${value ? 'text-gray-900' : 'text-gray-500 print:hidden'}`}>
            {value || <span className="print:hidden">{placeholder}</span>}
          </span>
        )}

        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 rounded-full mr-1 print:hidden"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
        
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 print:hidden ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto print:hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {searchTerm ? 'No customers found' : 'No customers available'}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  customerId === customer.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 text-sm">{customer.customer_name}</span>
                  {customer.customer_code && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {customer.customer_code}
                    </span>
                  )}
                </div>
                {(customer.address || customer.gst_number) && (
                  <div className="mt-1 text-xs text-gray-500">
                    {customer.gst_number && <span className="mr-3">GST: {customer.gst_number}</span>}
                    {customer.address && (
                      <span className="truncate block">{customer.address}</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSelect;

