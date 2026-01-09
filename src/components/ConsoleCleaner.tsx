'use client';

import { useEffect } from 'react';

// Store original console methods
const originalConsoleLog = typeof console !== 'undefined' ? console.log : () => {};
const originalConsoleDebug = typeof console !== 'undefined' ? console.debug : () => {};
const originalConsoleInfo = typeof console !== 'undefined' ? console.info : () => {};

// Flag to track if console has been suppressed
let isConsoleSuppressed = false;

/**
 * Suppress console.log, console.debug, and console.info in production
 * Keeps console.error and console.warn for critical issues
 */
function suppressConsoleInProduction() {
  if (typeof console === 'undefined') return;
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && !isConsoleSuppressed) {
    // Replace console methods with no-op functions in production
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = () => {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.debug = () => {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.info = () => {};
    
    isConsoleSuppressed = true;
    
    // Log once that console is suppressed (using error so it still shows)
    console.warn('🔇 Console logging suppressed for production environment');
  }
}

/**
 * Restore original console methods (useful for debugging)
 */
export function restoreConsole() {
  if (typeof console === 'undefined') return;
  
  console.log = originalConsoleLog;
  console.debug = originalConsoleDebug;
  console.info = originalConsoleInfo;
  isConsoleSuppressed = false;
}

/**
 * ConsoleCleaner component - Suppresses console.log in production
 * 
 * This component automatically suppresses console.log, console.debug, and console.info
 * in production builds to keep the browser console clean.
 * 
 * console.error and console.warn are preserved for critical issues.
 * 
 * To temporarily restore console in production for debugging:
 * - Open browser console and run: window.__restoreConsole()
 */
export default function ConsoleCleaner() {
  useEffect(() => {
    // Suppress console in production
    suppressConsoleInProduction();
    
    // Expose restore function globally for debugging purposes
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      (window as Window & { __restoreConsole?: () => void }).__restoreConsole = () => {
        restoreConsole();
        console.log('✅ Console logging restored for debugging');
      };
    }
  }, []);

  return null;
}

// Also run immediately on module load for server-side and early client execution
if (typeof window !== 'undefined') {
  suppressConsoleInProduction();
}
