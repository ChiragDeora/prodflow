// ============================================================================
// STOCK LEDGER SYSTEM - TypeScript Types
// ============================================================================

// ============================================================================
// STOCK LOCATION TYPES
// ============================================================================

export type LocationCode = 'STORE' | 'PRODUCTION' | 'FG_STORE';
export type LocationType = 'WAREHOUSE' | 'PRODUCTION';

export interface StockLocation {
  id: number;
  location_code: LocationCode;
  location_name: string;
  location_type: LocationType;
  is_active: boolean;
  created_at?: string;
}

// ============================================================================
// STOCK ITEM TYPES
// ============================================================================

export type ItemType = 'RM' | 'PM' | 'SFG' | 'FG' | 'SPARE';
export type UnitOfMeasure = 'KG' | 'NOS' | 'METERS' | 'PCS' | 'LTR' | 'MTR' | 'SET';

export interface StockItem {
  id: number;
  item_code: string;
  item_name: string;
  item_type: ItemType;
  category?: string;
  sub_category?: string;
  for_machine?: string;         // For SPARE: which machine this spare is used in
  for_mold?: string;            // For SPARE: which mold this spare is used in
  min_stock_level?: number;     // Minimum stock level for low stock alerts
  reorder_qty?: number;         // Suggested reorder quantity
  unit_of_measure: UnitOfMeasure;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CreateStockItem = Omit<StockItem, 'id' | 'created_at' | 'updated_at'>;

// ============================================================================
// STOCK LEDGER TYPES
// ============================================================================

export type MovementType = 'IN' | 'OUT';

export type DocumentType = 
  | 'GRN' 
  | 'JW_GRN' 
  | 'MIS' 
  | 'DPR' 
  | 'FG_TRANSFER' 
  | 'DISPATCH' 
  | 'CUSTOMER_RETURN' 
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE'
  | 'GRN_CANCEL'
  | 'JW_GRN_CANCEL'
  | 'MIS_CANCEL'
  | 'DPR_CANCEL'
  | 'FG_TRANSFER_CANCEL'
  | 'DISPATCH_CANCEL'
  | 'CUSTOMER_RETURN_CANCEL'
  | 'ADJUSTMENT_CANCEL'
  | 'OPENING_BALANCE_CANCEL';

export interface StockLedgerEntry {
  id: number;
  item_id: number;
  item_code: string;
  location_code: LocationCode;
  quantity: number;
  unit_of_measure: UnitOfMeasure;
  balance_after: number;
  transaction_date: string;
  transaction_timestamp?: string;
  document_type: DocumentType;
  document_id: string;
  document_number?: string;
  movement_type: MovementType;
  counterpart_location?: LocationCode;
  posted_by?: string;
  posted_at?: string;
  remarks?: string;
}

export type CreateStockLedgerEntry = Omit<StockLedgerEntry, 'id' | 'transaction_timestamp' | 'posted_at'>;

// ============================================================================
// STOCK BALANCE TYPES
// ============================================================================

export interface StockBalance {
  id: number;
  item_id: number;
  item_code: string;
  location_code: LocationCode;
  current_balance: number;
  unit_of_measure: UnitOfMeasure;
  last_updated?: string;
}

// ============================================================================
// STOCK ITEM MAPPING TYPES
// ============================================================================

export interface StockItemMapping {
  id: number;
  source_table: string;
  source_description: string;
  stock_item_code: string;
  is_active: boolean;
  created_at?: string;
}

// ============================================================================
// STOCK ADJUSTMENT TYPES
// ============================================================================

export type AdjustmentType = 'INCREASE' | 'DECREASE' | 'OPENING';
export type StockStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface StockAdjustment {
  id: string;
  adjustment_no: string;
  adjustment_date: string;
  adjustment_type: AdjustmentType;
  reason?: string;
  status: StockStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  posted_to_stock_at?: string;
  posted_to_stock_by?: string;
}

export interface StockAdjustmentItem {
  id: string;
  adjustment_id: string;
  item_code: string;
  location_code: LocationCode;
  quantity: number;
  unit_of_measure: UnitOfMeasure;
  remarks?: string;
  created_at?: string;
}

export type CreateStockAdjustment = Omit<StockAdjustment, 'id' | 'created_at' | 'updated_at' | 'posted_to_stock_at' | 'posted_to_stock_by'>;
export type CreateStockAdjustmentItem = Omit<StockAdjustmentItem, 'id' | 'created_at'>;

// ============================================================================
// CUSTOMER RETURN TYPES
// ============================================================================

export interface CustomerReturn {
  id: string;
  return_no: string;
  return_date: string;
  party_name?: string;
  original_dispatch_id?: string;
  reason?: string;
  status: StockStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  posted_to_stock_at?: string;
  posted_to_stock_by?: string;
}

export interface CustomerReturnItem {
  id: string;
  return_id: string;
  item_code: string;
  quantity: number;
  unit_of_measure: UnitOfMeasure;
  remarks?: string;
  created_at?: string;
}

export type CreateCustomerReturn = Omit<CustomerReturn, 'id' | 'created_at' | 'updated_at' | 'posted_to_stock_at' | 'posted_to_stock_by'>;
export type CreateCustomerReturnItem = Omit<CustomerReturnItem, 'id' | 'created_at'>;

// ============================================================================
// BOM RELATED TYPES (for DPR and FG Transfer posting)
// ============================================================================

export interface SfgBom {
  id: string;
  sl_no: number;
  item_name: string;  // Mold name like "RPRo10-12-L"
  sfg_code: string;   // SFG code like "110410001"
  pcs?: number;
  part_weight_gm_pcs?: number;
  colour?: string;
  hp_percentage?: number;
  icp_percentage?: number;
  rcp_percentage?: number;
  ldpe_percentage?: number;
  gpps_percentage?: number;
  mb_percentage?: number;
  status?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FgBom {
  id: string;
  sl_no: number;
  item_code: string;      // FG item code
  item_name?: string;     // FG item name
  party_name?: string;
  pack_size?: string;
  sfg_1?: string;         // First SFG code (usually container)
  sfg_1_qty?: number;     // How many of sfg_1 per box
  sfg_2?: string;         // Second SFG code (usually lid)
  sfg_2_qty?: number;     // How many of sfg_2 per box
  cnt_code?: string;      // Carton box code
  cnt_qty?: number;       // Cartons per box
  polybag_code?: string;  // Polybag code
  poly_qty?: number;      // Polybags per box
  bopp_1?: string;        // First BOPP tape code
  qty_meter?: number;     // Meters of bopp_1 per box
  bopp_2?: string;        // Second BOPP tape code
  qty_meter_2?: number;   // Meters of bopp_2 per box
  status?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type StockErrorCode = 
  | 'DOCUMENT_NOT_FOUND'
  | 'ALREADY_POSTED'
  | 'MAPPING_FAILED'
  | 'BOM_NOT_FOUND'
  | 'FG_BOM_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'STOCK_ITEM_NOT_FOUND'
  | 'NO_RM_FOUND'
  | 'NO_ENTRIES_FOUND'
  | 'PARTIAL_NOT_ALLOWED'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR';

export interface StockError {
  code: StockErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class StockPostingError extends Error {
  code: StockErrorCode;
  details?: Record<string, unknown>;

  constructor(code: StockErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'StockPostingError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// POSTING RESULT TYPES
// ============================================================================

export interface PostingResult {
  success: boolean;
  document_type: DocumentType;
  document_id: string;
  document_number?: string;
  entries_created: number;
  posted_at: string;
  posted_by: string;
  warnings?: string[];
  error?: StockError;
}

export interface CancellationResult {
  success: boolean;
  document_type: DocumentType;
  document_id: string;
  entries_reversed: number;
  cancelled_at: string;
  cancelled_by: string;
  error?: StockError;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface StockBalanceQuery {
  item_code?: string;
  location_code?: LocationCode;
  item_type?: ItemType;
}

export interface StockLedgerQuery {
  item_code?: string;
  location_code?: LocationCode;
  document_type?: DocumentType;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface StockBalanceResult {
  id: string;
  item_code: string;
  item_name: string;
  item_type: ItemType;
  sub_category?: string;
  location_code: LocationCode;
  current_balance: number;
  unit_of_measure: UnitOfMeasure;
  last_movement_at?: string;
}

// ============================================================================
// DPR RELATED TYPES (for DPR posting)
// ============================================================================

/**
 * DPR Machine Entry - matches dpr_machine_entries table
 * 
 * CRITICAL FIELD MAPPINGS FOR STOCK POSTING:
 * - product: MOLD NAME - used to lookup SFG code via sfg_bom.item_name
 * - ok_prod_qty_nos: Good production pieces - creates SFG in FG_STORE
 * - ok_prod_kgs: Good production kg - used for RM consumption calculation
 * - rej_kgs: Rejected kg - used for RM consumption AND creates REGRIND
 * 
 * Total RM consumption = ok_prod_kgs + rej_kgs (both good and bad used raw material)
 */
export interface DprProductionEntry {
  id: string;
  dpr_id: string;
  section_type: 'current' | 'changeover';
  is_changeover?: boolean;           // Alternative to section_type
  machine_no: string;
  operator_name?: string;
  product?: string;                   // MOLD NAME - Critical for SFG lookup
  cavity?: number;
  
  // Process Parameters
  trg_cycle_sec?: number;             // Target Cycle (sec)
  trg_run_time_min?: number;          // Target Run Time (min)
  part_wt_gm?: number;                // Target Part Weight (gm)
  act_part_wt_gm?: number;            // Actual Part Weight (gm)
  act_cycle_sec?: number;             // Actual Cycle (sec)
  part_wt_check?: string;             // OK or NOT OK
  cycle_time_check?: string;          // OK or NOT OK
  
  // Shots
  shots_start?: number;               // No of Shots (Start)
  shots_end?: number;                 // No of Shots (End)
  
  // Production Data - CRITICAL FOR STOCK
  target_qty_nos?: number;            // Target Qty (Nos)
  actual_qty_nos?: number;            // Actual Qty (Nos)
  ok_prod_qty_nos?: number;           // OK Prod Qty (Nos) - USED FOR SFG
  ok_prod_kgs?: number;               // OK Prod (Kgs) - USED FOR RM CONSUMPTION
  ok_prod_percent?: number;           // OK Prod (%)
  rej_kgs?: number;                   // Rej (Kgs) - USED FOR RM CONSUMPTION AND REGRIND
  lumps_kgs?: number;                 // Lumps (Kgs) - informational only
  
  // Runtime
  run_time_mins?: number;             // Run Time (mins)
  down_time_min?: number;             // Down time (min)
  
  // Stoppage (summary - detailed in dpr_stoppage_entries)
  stoppage_reason?: string;           // Reason for stoppage
  stoppage_start?: string;            // When stoppage started
  stoppage_end?: string;              // When stoppage ended
  stoppage_total_min?: number;        // Total stoppage time in minutes
  
  // Other
  mould_change?: string;              // Mould change info
  remark?: string;                    // REMARK
  
  // Audit
  created_at?: string;
  updated_at?: string;
}

/**
 * DPR Data - matches dpr_data table
 * One record per date/shift combination
 */
export interface DprData {
  id: string;
  report_date: string;                // DATE field - production date
  shift: 'DAY' | 'NIGHT';             // Either DAY or NIGHT
  shift_incharge?: string;            // Supervisor name
  
  // Stock posting fields
  stock_status?: StockStatus;         // DRAFT, POSTED, or CANCELLED
  posted_to_stock_at?: string;        // When posted to stock ledger
  posted_to_stock_by?: string;        // Who posted to stock ledger
  
  // Audit fields
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

/**
 * DPR Stoppage Entry - matches dpr_stoppage_entries table
 * Multiple stoppages per machine entry
 */
export interface DprStoppageEntry {
  id: string;
  dpr_machine_entry_id: string;
  reason?: string;                    // Stoppage reason
  start_time?: string;                // TIME - When stoppage started
  end_time?: string;                  // TIME - When stoppage ended
  total_time_min?: number;            // Auto-calculated from start/end
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// AGGREGATED DATA FOR DPR POSTING
// ============================================================================

export interface DprAggregatedProduction {
  sfg_code: string;
  mold_name: string;
  total_pieces: number;       // Sum of ok_prod_qty_nos
  total_good_kgs: number;     // Sum of ok_prod_kgs
  total_rej_kgs: number;      // Sum of rej_kgs
  line_ids: string[];         // Line IDs (machine_no) that produced this SFG
  bom: {
    hp_percentage: number;
    icp_percentage: number;
    rcp_percentage: number;
    ldpe_percentage: number;
    gpps_percentage: number;
    mb_percentage: number;
  };
}

// ============================================================================
// FG TRANSFER COMPONENT REQUIREMENT
// ============================================================================

export interface FgComponentRequirement {
  item_code: string;
  item_name: string;
  location_code: LocationCode;
  required_qty: number;
  available_qty: number;
  unit_of_measure: UnitOfMeasure;
  is_sufficient: boolean;
}

export interface FgTransferValidation {
  is_valid: boolean;
  fg_code: string;
  boxes: number;
  components: FgComponentRequirement[];
  missing_components: FgComponentRequirement[];
}

// ============================================================================
// IML LABEL REQUIREMENT
// ============================================================================

export interface ImlLabelRequirement {
  is_iml: boolean;
  label_item_code?: string;
  label_qty?: number;
  location_code: LocationCode;
  unit_of_measure: UnitOfMeasure;
}

