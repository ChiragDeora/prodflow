// ============================================================================
// IML (IN-MOLD LABELING) CONFIGURATION
// ============================================================================
// This configuration controls how IML products are detected and how label
// consumption is calculated during FG Transfer posting.
// ============================================================================

export interface ImlConfig {
  /**
   * Whether IML tracking is enabled
   * Set to true when ready to track label consumption
   */
  enabled: boolean;
  
  /**
   * How to detect if a product is IML
   * - 'CODE_PATTERN': Check specific positions in FG code
   */
  detectionMethod: 'CODE_PATTERN';
  
  /**
   * For CODE_PATTERN detection:
   * Position in FG code to check (0-indexed)
   * Default: 6 (positions 7-8 in 1-indexed)
   */
  codePosition: number;
  
  /**
   * Number of characters to check at codePosition
   */
  codeLength: number;
  
  /**
   * Value that indicates IML product
   * Default: '20' (as per spec)
   */
  imlValue: string;
  
  /**
   * How label quantity is calculated
   * - 'PER_BOX': Fixed number of labels per box
   * - 'PER_PIECE': Number of labels per piece (multiplied by pack size)
   */
  labelUnit: 'PER_BOX' | 'PER_PIECE';
  
  /**
   * Number of labels per unit (box or piece based on labelUnit)
   */
  labelQtyPerUnit: number;
  
  /**
   * Default label item code if not specified elsewhere
   */
  defaultLabelCode: string;
  
  /**
   * Label item codes mapped to specific FG patterns
   * Key: FG code pattern (can be partial)
   * Value: Label item code
   */
  labelMapping: Record<string, string>;
}

/**
 * Default IML configuration
 * Update these values when the information is available
 */
export const IML_CONFIG: ImlConfig = {
  // Set to false initially - enable when ready
  enabled: false,
  
  // Detection method
  detectionMethod: 'CODE_PATTERN',
  codePosition: 6,       // 0-indexed position (characters 7-8 in spec)
  codeLength: 2,
  imlValue: '20',        // '20' at positions 7-8 = IML product
  
  // Label calculation
  labelUnit: 'PER_PIECE',  // Most common: 1 label per piece
  labelQtyPerUnit: 1,
  
  // Default label
  defaultLabelCode: 'LABEL-IML-001',
  
  // Label mapping for specific FG patterns (to be filled in)
  labelMapping: {
    // Example: '210110102': 'LABEL-IML-001',
    // Add specific FG code → label code mappings here
  },
};

/**
 * Check if a FG code is an IML product based on config
 */
export function isImlProduct(fgCode: string, config: ImlConfig = IML_CONFIG): boolean {
  if (!config.enabled) {
    return false;
  }
  
  if (config.detectionMethod === 'CODE_PATTERN') {
    if (!fgCode || fgCode.length < config.codePosition + config.codeLength) {
      return false;
    }
    
    const codeValue = fgCode.substring(
      config.codePosition,
      config.codePosition + config.codeLength
    );
    
    return codeValue === config.imlValue;
  }
  
  return false;
}

/**
 * Get the label item code for a specific FG code
 */
export function getLabelCodeForFg(
  fgCode: string,
  config: ImlConfig = IML_CONFIG
): string {
  // Check if there's a specific mapping for this FG code
  for (const [pattern, labelCode] of Object.entries(config.labelMapping)) {
    if (fgCode.startsWith(pattern) || fgCode.includes(pattern)) {
      return labelCode;
    }
  }
  
  // Return default label code
  return config.defaultLabelCode;
}

/**
 * Calculate label requirement for FG packing
 */
export function calculateLabelRequirement(
  fgCode: string,
  boxes: number,
  packSize: number,
  config: ImlConfig = IML_CONFIG
): {
  isIml: boolean;
  labelCode: string | null;
  labelQty: number;
} {
  const isIml = isImlProduct(fgCode, config);
  
  if (!isIml || !config.enabled) {
    return {
      isIml: false,
      labelCode: null,
      labelQty: 0,
    };
  }
  
  const labelCode = getLabelCodeForFg(fgCode, config);
  
  let labelQty: number;
  if (config.labelUnit === 'PER_BOX') {
    labelQty = boxes * config.labelQtyPerUnit;
  } else {
    // PER_PIECE
    labelQty = boxes * packSize * config.labelQtyPerUnit;
  }
  
  return {
    isIml: true,
    labelCode,
    labelQty,
  };
}

/**
 * Update IML configuration
 * This can be called to update the config at runtime
 */
export function updateImlConfig(updates: Partial<ImlConfig>): ImlConfig {
  Object.assign(IML_CONFIG, updates);
  return IML_CONFIG;
}


