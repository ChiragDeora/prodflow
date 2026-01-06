// ============================================================================
// REPORT DIMENSIONS DEFINITIONS
// ============================================================================
// Defines all available dimensions (grouping/splitting) for the report builder

import { MetricCategory } from './metrics';

export type DimensionType = 'date' | 'categorical' | 'text';

export interface DimensionDefinition {
  id: string;
  displayName: string;
  availableFor: MetricCategory[];
  column: string;          // SQL column expression
  dateFormat?: string;     // For date dimensions
  type: DimensionType;
  sortable?: boolean;
  description?: string;
}

// ============================================================================
// DATE DIMENSIONS
// ============================================================================

const dateDimensions: DimensionDefinition[] = [
  {
    id: 'date_day',
    displayName: 'Date (Daily)',
    availableFor: ['production', 'dispatch', 'stock', 'procurement', 'maintenance', 'quality'],
    column: 'DATE(date)',
    dateFormat: 'YYYY-MM-DD',
    type: 'date',
    sortable: true,
    description: 'Group by day',
  },
  {
    id: 'date_week',
    displayName: 'Date (Weekly)',
    availableFor: ['production', 'dispatch', 'stock', 'procurement', 'maintenance', 'quality'],
    column: "DATE_TRUNC('week', date)",
    dateFormat: 'YYYY-[W]WW',
    type: 'date',
    sortable: true,
    description: 'Group by week',
  },
  {
    id: 'date_month',
    displayName: 'Date (Monthly)',
    availableFor: ['production', 'dispatch', 'stock', 'procurement', 'maintenance', 'quality'],
    column: "DATE_TRUNC('month', date)",
    dateFormat: 'YYYY-MM',
    type: 'date',
    sortable: true,
    description: 'Group by month',
  },
  {
    id: 'date_quarter',
    displayName: 'Date (Quarterly)',
    availableFor: ['production', 'dispatch', 'stock', 'procurement', 'maintenance', 'quality'],
    column: "DATE_TRUNC('quarter', date)",
    dateFormat: 'YYYY-[Q]Q',
    type: 'date',
    sortable: true,
    description: 'Group by quarter',
  },
  {
    id: 'date_year',
    displayName: 'Date (Yearly)',
    availableFor: ['production', 'dispatch', 'stock', 'procurement', 'maintenance', 'quality'],
    column: "DATE_TRUNC('year', date)",
    dateFormat: 'YYYY',
    type: 'date',
    sortable: true,
    description: 'Group by year',
  },
];

// ============================================================================
// PRODUCTION DIMENSIONS
// ============================================================================

const productionDimensions: DimensionDefinition[] = [
  {
    id: 'mold',
    displayName: 'Mold',
    availableFor: ['production'],
    column: 'product',
    type: 'categorical',
    sortable: true,
    description: 'Group by mold/product name',
  },
  {
    id: 'machine',
    displayName: 'Machine',
    availableFor: ['production'],
    column: 'machine_no',
    type: 'categorical',
    sortable: true,
    description: 'Group by machine number',
  },
  {
    id: 'line',
    displayName: 'Production Line',
    availableFor: ['production'],
    column: 'line_id',
    type: 'categorical',
    sortable: true,
    description: 'Group by production line',
  },
  {
    id: 'shift',
    displayName: 'Shift',
    availableFor: ['production'],
    column: 'shift',
    type: 'categorical',
    sortable: true,
    description: 'Group by shift (DAY/NIGHT)',
  },
  {
    id: 'sfg_code',
    displayName: 'SFG Code',
    availableFor: ['production'],
    column: 'sfg_code',
    type: 'categorical',
    sortable: true,
    description: 'Group by SFG code',
  },
  {
    id: 'is_changeover',
    displayName: 'Changeover',
    availableFor: ['production'],
    column: "CASE WHEN is_changeover THEN 'Changeover' ELSE 'Regular' END",
    type: 'categorical',
    sortable: true,
    description: 'Group by changeover status',
  },
  {
    id: 'shift_incharge',
    displayName: 'Shift Incharge',
    availableFor: ['production'],
    column: 'shift_incharge',
    type: 'text',
    sortable: true,
    description: 'Group by shift incharge',
  },
];

// ============================================================================
// DISPATCH DIMENSIONS
// ============================================================================

const dispatchDimensions: DimensionDefinition[] = [
  {
    id: 'customer',
    displayName: 'Customer',
    availableFor: ['dispatch'],
    column: 'party_name',
    type: 'categorical',
    sortable: true,
    description: 'Group by customer name',
  },
  {
    id: 'fg_code',
    displayName: 'FG Code',
    availableFor: ['dispatch'],
    column: 'item_code',
    type: 'categorical',
    sortable: true,
    description: 'Group by finished goods code',
  },
  {
    id: 'dispatch_location',
    displayName: 'Location',
    availableFor: ['dispatch'],
    column: 'location',
    type: 'categorical',
    sortable: true,
    description: 'Group by dispatch location',
  },
];

// ============================================================================
// PROCUREMENT DIMENSIONS
// ============================================================================

const procurementDimensions: DimensionDefinition[] = [
  {
    id: 'supplier',
    displayName: 'Supplier',
    availableFor: ['procurement'],
    column: 'party_name',
    type: 'categorical',
    sortable: true,
    description: 'Group by supplier name',
  },
  {
    id: 'material_type',
    displayName: 'Material Type',
    availableFor: ['procurement'],
    column: 'type_of_material',
    type: 'categorical',
    sortable: true,
    description: 'Group by material type (RM/PM/STORE)',
  },
];

// ============================================================================
// STOCK DIMENSIONS
// ============================================================================

const stockDimensions: DimensionDefinition[] = [
  {
    id: 'location',
    displayName: 'Stock Location',
    availableFor: ['stock'],
    column: 'location_code',
    type: 'categorical',
    sortable: true,
    description: 'Group by stock location',
  },
  {
    id: 'item_type',
    displayName: 'Item Type',
    availableFor: ['stock'],
    column: 'item_type',
    type: 'categorical',
    sortable: true,
    description: 'Group by item type (RM/PM/SFG/FG/SPARE)',
  },
  {
    id: 'item_code',
    displayName: 'Item Code',
    availableFor: ['stock', 'procurement'],
    column: 'item_code',
    type: 'categorical',
    sortable: true,
    description: 'Group by item code',
  },
  {
    id: 'document_type',
    displayName: 'Document Type',
    availableFor: ['stock'],
    column: 'document_type',
    type: 'categorical',
    sortable: true,
    description: 'Group by document type',
  },
  {
    id: 'movement_type',
    displayName: 'Movement Type',
    availableFor: ['stock'],
    column: 'movement_type',
    type: 'categorical',
    sortable: true,
    description: 'Group by movement type (IN/OUT)',
  },
];

// ============================================================================
// ALL DIMENSIONS
// ============================================================================

export const ALL_DIMENSIONS: DimensionDefinition[] = [
  ...dateDimensions,
  ...productionDimensions,
  ...dispatchDimensions,
  ...procurementDimensions,
  ...stockDimensions,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get dimensions available for a specific category
 */
export function getDimensionsForCategory(category: MetricCategory): DimensionDefinition[] {
  return ALL_DIMENSIONS.filter(d => d.availableFor.includes(category));
}

/**
 * Get a specific dimension by ID
 */
export function getDimensionById(id: string): DimensionDefinition | undefined {
  return ALL_DIMENSIONS.find(d => d.id === id);
}

/**
 * Get date dimensions only
 */
export function getDateDimensions(): DimensionDefinition[] {
  return ALL_DIMENSIONS.filter(d => d.type === 'date');
}

/**
 * Get categorical dimensions only
 */
export function getCategoricalDimensions(category?: MetricCategory): DimensionDefinition[] {
  let dims = ALL_DIMENSIONS.filter(d => d.type === 'categorical');
  if (category) {
    dims = dims.filter(d => d.availableFor.includes(category));
  }
  return dims;
}

