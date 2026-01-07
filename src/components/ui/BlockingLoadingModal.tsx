'use client';

import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface BlockingLoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  showWarning?: boolean;
  progress?: number; // Optional progress percentage (0-100)
}

/**
 * BlockingLoadingModal - A full-screen modal that blocks all user interaction
 * Use this for:
 * - Excel imports
 * - Post to Stock operations
 * - Page refreshes/loading
 * - Any long-running operation where user should wait
 */
const BlockingLoadingModal: React.FC<BlockingLoadingModalProps> = ({
  isOpen,
  title = 'Processing...',
  message = 'Please wait. Do not press back or close this tab.',
  showWarning = true,
  progress
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
    >
      {/* Prevent any clicks from going through */}
      <div 
        className="absolute inset-0" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.preventDefault()}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Animated Spinner */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {/* Outer ring */}
            <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
            {/* Spinning ring */}
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            {/* Inner icon */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Loader2 className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-gray-600 mb-4">
          {message}
        </p>

        {/* Progress Bar (if provided) */}
        {progress !== undefined && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{Math.round(progress)}% complete</p>
          </div>
        )}

        {/* Warning Message */}
        {showWarning && (
          <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              Do not refresh, press back, or close this tab
            </span>
          </div>
        )}

        {/* Animated dots */}
        <div className="mt-4 flex justify-center gap-1">
          <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
};

export default BlockingLoadingModal;

