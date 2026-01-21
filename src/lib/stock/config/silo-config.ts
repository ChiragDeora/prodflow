// ============================================================================
// SILO CONFIGURATION (FUTURE PHASE 2)
// ============================================================================
// Placeholder configuration for future silo integration
// Silos are storage containers that feed raw materials to machines
// ============================================================================

export interface SiloConfig {
  /**
   * Whether silo tracking is enabled
   * Set to true when ready to integrate silo system
   */
  enabled: boolean;
  
  /**
   * Mapping of silo codes to material types
   * Key: Silo code (e.g., 'SILO-1', 'SILO-2')
   * Value: Material info (type and sub_category)
   */
  siloMaterialMapping: Record<string, {
    materialType: 'HP' | 'ICP' | 'RCP' | 'LDPE' | 'HDPE' | 'GPPS' | 'MB';
    materialGrade?: string;
    capacity?: number;  // in KG
  }>;
  
  /**
   * Mapping of machines to silos
   * Key: Machine number
   * Value: Array of silo codes that feed this machine
   */
  machineSiloMapping: Record<string, string[]>;
  
  /**
   * Default consumption source when silo mapping is not available
   * If true, will use general PRODUCTION stock instead of silo-specific
   */
  fallbackToGeneralStock: boolean;
  
  /**
   * Whether to track silo levels
   * If true, will create separate ledger entries for silo consumption
   */
  trackSiloLevels: boolean;
}

/**
 * Default silo configuration (placeholder)
 * Update these values when silo integration is implemented
 */
export const SILO_CONFIG: SiloConfig = {
  // Disabled by default - this is Phase 2
  enabled: false,
  
  // Silo to material type mapping (to be filled in)
  siloMaterialMapping: {
    // Example:
    // 'SILO-1': { materialType: 'HP', materialGrade: 'HJ333MO', capacity: 5000 },
    // 'SILO-2': { materialType: 'ICP', materialGrade: 'BJ368MO', capacity: 5000 },
    // 'SILO-3': { materialType: 'MB', capacity: 500 },
  },
  
  // Machine to silo mapping (to be filled in)
  machineSiloMapping: {
    // Example:
    // 'M1': ['SILO-1', 'SILO-2'],
    // 'M2': ['SILO-1', 'SILO-3'],
  },
  
  // Use general PRODUCTION stock when silo not mapped
  fallbackToGeneralStock: true,
  
  // Don't track silo levels yet
  trackSiloLevels: false,
};

/**
 * Get silos for a machine
 */
export function getSilosForMachine(
  machineNo: string,
  config: SiloConfig = SILO_CONFIG
): string[] {
  if (!config.enabled) {
    return [];
  }
  
  return config.machineSiloMapping[machineNo] || [];
}

/**
 * Get material info for a silo
 */
export function getMaterialForSilo(
  siloCode: string,
  config: SiloConfig = SILO_CONFIG
): { materialType: string; materialGrade?: string } | null {
  if (!config.enabled) {
    return null;
  }
  
  const mapping = config.siloMaterialMapping[siloCode];
  if (!mapping) {
    return null;
  }
  
  return {
    materialType: mapping.materialType,
    materialGrade: mapping.materialGrade,
  };
}

/**
 * Check if silo integration is enabled
 */
export function isSiloEnabled(config: SiloConfig = SILO_CONFIG): boolean {
  return config.enabled;
}

/**
 * Update silo configuration
 * This can be called to update the config at runtime
 */
export function updateSiloConfig(updates: Partial<SiloConfig>): SiloConfig {
  Object.assign(SILO_CONFIG, updates);
  return SILO_CONFIG;
}

/**
 * Future: Consume from silo
 * Placeholder for Phase 2 implementation
 */
export async function consumeFromSilo(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _siloCode: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quantityKg: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _machineNo: string
): Promise<{ success: boolean; message: string }> {
  // This will be implemented in Phase 2
  return {
    success: false,
    message: 'Silo consumption not yet implemented. Enable in SILO_CONFIG when ready.',
  };
}


