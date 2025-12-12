/**
 * BOM Code Utility Functions
 * 
 * New Coding System:
 * - SFG: 1 (sfg) + 101 (item) + 10 (RP) or 20 (CK) + 001 (BOM number)
 * - FG Export: 2 (fg export) + 101 (item) + 10 (RP) or 20 (CK) + 10 (non-IML) or 20 (IML) + 001 (BOM number)
 * - FG Local: 3 (fg local) + 101 (item) + 10 (RP) or 20 (CK) + 10 (non-IML) or 20 (IML) + 001 (BOM number)
 * 
 * Example: RpRo10-C in SFG code is 110110001
 */

/**
 * Removes 100 prefix from SFG codes and 200 prefix from FG codes
 */
export function removeOldPrefix(code: string): string {
  if (!code) return code;
  
  // Remove 100 prefix from SFG codes
  if (code.startsWith('100')) {
    return code.substring(3);
  }
  
  // Remove 200 prefix from FG codes
  if (code.startsWith('200')) {
    return code.substring(3);
  }
  
  return code;
}

/**
 * Detects if a code contains RP or CK
 * Returns 'RP' or 'CK' or null
 */
export function detectRPOrCK(code: string): 'RP' | 'CK' | null {
  if (!code) return null;
  
  const upperCode = code.toUpperCase();
  
  // Check for RP (case-insensitive)
  if (upperCode.includes('RP') || upperCode.includes('RP-')) {
    return 'RP';
  }
  
  // Check for CK (case-insensitive)
  if (upperCode.includes('CK') || upperCode.includes('CK-')) {
    return 'CK';
  }
  
  return null;
}

/**
 * Detects if an FG code is IML or non-IML
 * Returns 'IML' or 'non-IML' or null
 */
export function detectIMLOrNonIML(code: string): 'IML' | 'non-IML' | null {
  if (!code) return null;
  
  const upperCode = code.toUpperCase();
  
  // Check for IML
  if (upperCode.includes('IML')) {
    return 'IML';
  }
  
  // Default to non-IML if it's an FG code
  // You may need to adjust this logic based on your actual data
  return 'non-IML';
}

/**
 * Generates new SFG code
 * Format: 1 (sfg) + 101 (item) + 10 (RP) or 20 (CK) + 001 (BOM number)
 * 
 * @param itemCode - The item code (e.g., "Ro10")
 * @param bomNumber - The BOM number (e.g., 1 -> "001")
 * @param rpOrCk - 'RP' or 'CK' (defaults to 'RP' if not detected)
 */
export function generateSFGCode(
  itemCode: string,
  bomNumber: number,
  rpOrCk?: 'RP' | 'CK'
): string {
  // Remove old prefix if present
  const cleanCode = removeOldPrefix(itemCode);
  
  // Detect RP or CK if not provided
  const detected = rpOrCk || detectRPOrCK(cleanCode) || 'RP';
  
  // Determine code part: 10 for RP, 20 for CK
  const rpCkCode = detected === 'RP' ? '10' : '20';
  
  // Format BOM number as 3 digits (001, 002, etc.)
  const bomNumberStr = String(bomNumber).padStart(3, '0');
  
  // Generate code: 1 (sfg) + 101 (item) + 10/20 (RP/CK) + 001 (BOM number)
  return `1${101}${rpCkCode}${bomNumberStr}`;
}

/**
 * Generates new FG Export code
 * Format: 2 (fg export) + 101 (item) + 10 (RP) or 20 (CK) + 10 (non-IML) or 20 (IML) + 001 (BOM number)
 * 
 * @param itemCode - The item code
 * @param bomNumber - The BOM number
 * @param rpOrCk - 'RP' or 'CK' (defaults to 'RP' if not detected)
 * @param imlOrNonIML - 'IML' or 'non-IML' (defaults to 'non-IML' if not detected)
 */
export function generateFGExportCode(
  itemCode: string,
  bomNumber: number,
  rpOrCk?: 'RP' | 'CK',
  imlOrNonIML?: 'IML' | 'non-IML'
): string {
  // Remove old prefix if present
  const cleanCode = removeOldPrefix(itemCode);
  
  // Detect RP or CK if not provided
  const detected = rpOrCk || detectRPOrCK(cleanCode) || 'RP';
  const rpCkCode = detected === 'RP' ? '10' : '20';
  
  // Detect IML or non-IML if not provided
  const detectedIML = imlOrNonIML || detectIMLOrNonIML(cleanCode) || 'non-IML';
  const imlCode = detectedIML === 'IML' ? '20' : '10';
  
  // Format BOM number as 3 digits
  const bomNumberStr = String(bomNumber).padStart(3, '0');
  
  // Generate code: 2 (fg export) + 101 (item) + 10/20 (RP/CK) + 10/20 (non-IML/IML) + 001 (BOM number)
  return `2${101}${rpCkCode}${imlCode}${bomNumberStr}`;
}

/**
 * Generates new FG Local code
 * Format: 3 (fg local) + 101 (item) + 10 (RP) or 20 (CK) + 10 (non-IML) or 20 (IML) + 001 (BOM number)
 * 
 * @param itemCode - The item code
 * @param bomNumber - The BOM number
 * @param rpOrCk - 'RP' or 'CK' (defaults to 'RP' if not detected)
 * @param imlOrNonIML - 'IML' or 'non-IML' (defaults to 'non-IML' if not detected)
 */
export function generateFGLocalCode(
  itemCode: string,
  bomNumber: number,
  rpOrCk?: 'RP' | 'CK',
  imlOrNonIML?: 'IML' | 'non-IML'
): string {
  // Remove old prefix if present
  const cleanCode = removeOldPrefix(itemCode);
  
  // Detect RP or CK if not provided
  const detected = rpOrCk || detectRPOrCK(cleanCode) || 'RP';
  const rpCkCode = detected === 'RP' ? '10' : '20';
  
  // Detect IML or non-IML if not provided
  const detectedIML = imlOrNonIML || detectIMLOrNonIML(cleanCode) || 'non-IML';
  const imlCode = detectedIML === 'IML' ? '20' : '10';
  
  // Format BOM number as 3 digits
  const bomNumberStr = String(bomNumber).padStart(3, '0');
  
  // Generate code: 3 (fg local) + 101 (item) + 10/20 (RP/CK) + 10/20 (non-IML/IML) + 001 (BOM number)
  return `3${101}${rpCkCode}${imlCode}${bomNumberStr}`;
}

/**
 * Updates item name to match SFG code format (e.g., "RpRo10-C")
 * Removes "100" prefix from item name and formats it to match the code pattern
 * Example: "100Ro10-C" -> "RpRo10-C"
 * If code is "RpRo10-B-C", item name becomes "RpRo10-C" (first part + last part)
 */
export function updateItemNameWithRPOrCK(itemName: string, code: string): string {
  if (!itemName) return itemName;
  
  let processedName = itemName;
  
  // Aggressively remove "100" prefix - check multiple times to catch all cases
  // Remove "100" from the beginning
  processedName = processedName.replace(/^100/, '');
  // Also remove if it's "100" followed by a letter/number
  processedName = processedName.replace(/^100([A-Za-z0-9])/, '$1');
  // Remove any remaining "100" at the start
  while (processedName.startsWith('100')) {
    processedName = processedName.substring(3);
  }
  
  // Remove any trailing "RP" or "CK" suffix (case-insensitive)
  processedName = processedName.replace(/\s*(RP|CK)$/i, '').trim();
  
  // Clean the code too - remove 100 prefix if present
  let cleanCode = code ? removeOldPrefix(code) : '';
  
  // If we have a code, extract the pattern from it
  if (cleanCode) {
    // Split code by dashes (e.g., "RpRo10-B-C" -> ["RpRo10", "B", "C"])
    const codeParts = cleanCode.split('-');
    
    if (codeParts.length > 0) {
      const firstPart = codeParts[0]; // e.g., "RpRo10"
      
      // If code has multiple parts, combine first and last (skip middle parts like color)
      if (codeParts.length > 1) {
        const lastPart = codeParts[codeParts.length - 1]; // e.g., "C"
        return `${firstPart}-${lastPart}`; // "RpRo10-C"
      }
      
      // If code has only one part, use it as is
      return firstPart;
    }
  }
  
  // Fallback: If processedName starts with "Ro" or "R", prefix it with "Rp"
  // Example: "Ro10-C" -> "RpRo10-C"
  if (processedName.match(/^[Rr][oO]?[0-9]/)) {
    if (!processedName.startsWith('Rp') && !processedName.startsWith('rp')) {
      if (processedName.startsWith('Ro') || processedName.startsWith('ro')) {
        processedName = 'Rp' + processedName;
      } else if (processedName.startsWith('R') || processedName.startsWith('r')) {
        processedName = 'Rp' + processedName;
      }
    }
  }
  
  // Fallback: If processedName starts with "C" (but not "Ck" or "CK"), prefix it with "Ck"
  if (processedName.match(/^[Cc][0-9]/) && !processedName.startsWith('Ck') && !processedName.startsWith('CK')) {
    processedName = 'Ck' + processedName.substring(1);
  }
  
  return processedName.trim();
}

/**
 * Processes a code by removing old prefix and generating new code if needed
 * This is used during Excel import
 */
export function processBOMCode(
  code: string,
  category: 'SFG' | 'FG' | 'LOCAL',
  bomNumber?: number
): string {
  if (!code) return code;
  
  // Remove old prefix
  const cleanCode = removeOldPrefix(code);
  
  // If bomNumber is provided, generate new code
  if (bomNumber !== undefined) {
    const rpOrCk = detectRPOrCK(cleanCode);
    
    switch (category) {
      case 'SFG':
        return generateSFGCode(cleanCode, bomNumber, rpOrCk || undefined);
      case 'FG':
        // For FG, we need to determine if it's export or local
        // For now, defaulting to export - you may need to adjust this
        const imlOrNonIML = detectIMLOrNonIML(cleanCode);
        return generateFGExportCode(cleanCode, bomNumber, rpOrCk || undefined, imlOrNonIML || undefined);
      case 'LOCAL':
        const imlOrNonIMLForLocal = detectIMLOrNonIML(cleanCode);
        return generateFGLocalCode(cleanCode, bomNumber, rpOrCk || undefined, imlOrNonIMLForLocal || undefined);
      default:
        return cleanCode;
    }
  }
  
  return cleanCode;
}

