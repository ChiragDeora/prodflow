'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoButtonProps {
  onClick: () => void;
  className?: string;
}

export const InfoButton: React.FC<InfoButtonProps> = ({ onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`p-2 text-gray-400 hover:text-blue-600 transition-colors ${className}`}
    title="Information about table columns"
  >
    <HelpCircle className="w-4 h-4" />
  </button>
);

export default InfoButton;

