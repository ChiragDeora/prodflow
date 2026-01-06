'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { partyNameAPI } from '../../../lib/supabase';
import type { PartyName } from '../../../lib/supabase/types';

interface PartyNameSelectProps {
  value: string;
  partyId?: string;
  onChange: (party: { id: string; name: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

const PartyNameSelect: React.FC<PartyNameSelectProps> = ({
  value,
  partyId,
  onChange,
  placeholder = 'Select Party',
  className = '',
  disabled = false,
  required = false,
}) => {
  const [parties, setParties] = useState<PartyName[]>([]);
  const [filteredParties, setFilteredParties] = useState<PartyName[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch parties on mount
  useEffect(() => {
    const fetchParties = async () => {
      setLoading(true);
      try {
        const data = await partyNameAPI.getAll();
        setParties(data);
        setFilteredParties(data);
      } catch (error) {
        console.error('Error fetching party names:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchParties();
  }, []);

  // Filter parties based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredParties(parties);
    } else {
      const search = searchTerm.toLowerCase();
      const filtered = parties.filter(
        (party) =>
          party.name.toLowerCase().includes(search) ||
          (party.code && party.code.toLowerCase().includes(search)) ||
          (party.gstin && party.gstin.toLowerCase().includes(search))
      );
      setFilteredParties(filtered);
    }
  }, [searchTerm, parties]);

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

  const handleSelect = (party: PartyName) => {
    onChange({
      id: party.id,
      name: party.name,
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
    } else if (e.key === 'Enter' && filteredParties.length > 0) {
      e.preventDefault();
      handleSelect(filteredParties[0]);
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
              Loading parties...
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {searchTerm ? 'No parties found' : 'No parties available'}
            </div>
          ) : (
            filteredParties.map((party) => (
              <div
                key={party.id}
                onClick={() => handleSelect(party)}
                className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  partyId === party.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 text-sm">{party.name}</span>
                  {party.code && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {party.code}
                    </span>
                  )}
                </div>
                {(party.address || party.gstin) && (
                  <div className="mt-1 text-xs text-gray-500">
                    {party.gstin && <span className="mr-3">GST: {party.gstin}</span>}
                    {party.address && (
                      <span className="truncate block">{party.address}</span>
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

export default PartyNameSelect;

