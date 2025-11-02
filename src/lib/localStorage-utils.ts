/**
 * Utility functions for managing localStorage with user-specific keys
 */

/**
 * Get the current user ID from localStorage or use a default
 */
export const getCurrentUserId = (): string => {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem('currentUserId') || 'default';
};

/**
 * Generate a user-specific localStorage key
 */
export const getUserKey = (key: string): string => {
  const userId = getCurrentUserId();
  return `${key}_${userId}`;
};

/**
 * Save a value to localStorage with user-specific key
 */
export const saveUserPreference = (key: string, value: any): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const userKey = getUserKey(key);
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(userKey, serializedValue);
  } catch (error) {
    console.error('Error saving user preference to localStorage:', error);
  }
};

/**
 * Get a value from localStorage with user-specific key
 */
export const getUserPreference = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const userKey = getUserKey(key);
    const savedValue = localStorage.getItem(userKey);
    
    if (savedValue === null) return defaultValue;
    
    // Try to parse as JSON first, fallback to string
    try {
      return JSON.parse(savedValue);
    } catch {
      return savedValue as T;
    }
  } catch (error) {
    console.error('Error getting user preference from localStorage:', error);
    return defaultValue;
  }
};

/**
 * Remove a user-specific preference from localStorage
 */
export const removeUserPreference = (key: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const userKey = getUserKey(key);
    localStorage.removeItem(userKey);
  } catch (error) {
    console.error('Error removing user preference from localStorage:', error);
  }
};

/**
 * Clear all user preferences for the current user
 */
export const clearAllUserPreferences = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const userId = getCurrentUserId();
    const keysToRemove: string[] = [];
    
    // Find all keys that belong to the current user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith(`_${userId}`)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all user-specific keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`Cleared ${keysToRemove.length} user preferences for user: ${userId}`);
  } catch (error) {
    console.error('Error clearing user preferences:', error);
  }
};
