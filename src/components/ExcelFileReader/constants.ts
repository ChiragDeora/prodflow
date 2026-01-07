import type { DataType } from './types';

// Canonical headers - single source of truth for templates & export
export const CANONICAL_HEADERS: Record<DataType, string[]> = {
  machines: [
    'Sr. No.', 'Category', 'Make', 'Size', 'Model', 'Serial No.', 'CLM Sr. No.', 'Inj. Serial No.',
    'Mfg Date', 'Inst Date', 'Dimensions (LxBxH)', 'Name Plate', 'Capacity (Tons)',
    'Grinding Available', 'Status', 'Zone', 'Purchase Date', 'Remarks', 'Unit'
  ],
  molds: [
    'Sr.no.', 'Mold name', 'Type', 'Cavities', 'Cycle Time', 'Dwg Wt', 'Int. Wt.', 'RP Bill Wt.',
    'Dimensions', 'Mold Wt.', 'HRC Make', 'HRC Zone', 'Make', 'Start Date', 'Unit'
  ],
  schedules: [
    'Schedule ID', 'Date', 'Shift', 'Machine ID', 'Mold ID', 'Start Time', 'End Time', 'Color',
    'Expected Pieces', 'Stacks per Box', 'Pieces per Stack', 'Created By', 'Is Done', 'Approval Status'
  ],
  raw_materials: [
    'Sl.', 'Category', 'Type', 'Grade', 'Supplier', 'MFI', 'Density', 'TDS Attached', 'Remark', 'Unit'
  ],
  packing_materials: [
    'Category', 'Type', 'Item Code', 'Pack Size', 'Dimensions', 'Technical Detail', 'Brand', 'Unit'
  ],
  lines: [
    'Line no.', 'Line ID','Description', 'IM', 'Robot', 'Hoist', 'Conveyor', 'Status', 'Unit'
  ],
  maintenance_checklists: [
    'Line ID', 'Machine ID', 'Checklist Name', 'Checklist Type', 'Item ID', 'Task Description', 
    'Frequency', 'Estimated Duration (min)', 'Priority', 'Category', 'Unit'
  ],
  bom_masters: [
    'Sl', 'Item Name', 'SFG-Code', 'Pcs', 'Part Wt (gm/pcs)', 'Colour', 'HP %', 'ICP %', 'RCP %', 'LDPE %', 'GPPS %', 'MB %'
  ],
  sfg_bom: [
    'Sl', 'Item Name', 'SFG-Code', 'Pcs', 'Part Wt (gm/pcs)', 'Colour', 'HP %', 'ICP %', 'RCP %', 'LDPE %', 'GPPS %', 'MB %'
  ],
  fg_bom: [
    'Sl', 'Item Code', 'Item Name', 'Party Name', 'Pack Size', 'SFG-1', 'SFG-1 Qty', 'SFG-2', 'SFG-2 Qty', 'CNT Code', 'CNT QTY', 'Polybag Code', 'Poly Qty', 'BOPP 1', 'Qty/Meter', 'BOPP 2', 'Qty/Meter 2'
  ],
  local_bom: [
    'Sl', 'Item Code', 'Item Name', 'Pack Size', 'SFG-1', 'SFG-1 Qty', 'SFG-2', 'SFG-2 Qty', 'CNT Code', 'CNT QTY', 'Polybag Code', 'Poly Qty', 'BOPP 1', 'Qty/Meter', 'BOPP 2', 'Qty/Meter 2', 'CBM'
  ],
  dpr: [], // DPR configured with multi-sheet structure
  color_labels: [
    'Sr. No.', 'Color / Label'
  ],
  party_names: [
    'Sr. No.', 'Name'
  ]
};

// Data type display names
export const DATA_TYPE_LABELS: Record<DataType, string> = {
  machines: 'Machines',
  molds: 'Molds',
  schedules: 'Schedules',
  raw_materials: 'Raw Materials',
  packing_materials: 'Packing Materials',
  lines: 'Lines',
  maintenance_checklists: 'Maintenance Checklists',
  bom_masters: 'BOM Masters',
  sfg_bom: 'SFG BOM',
  fg_bom: 'FG BOM',
  local_bom: 'Local BOM',
  dpr: 'Daily Production Report',
  color_labels: 'Color Labels',
  party_names: 'Party Names'
};

// Sample data for templates
export const SAMPLE_DATA: Record<DataType, any[][]> = {
  machines: [
    ['JSW-1', 'IM', 'JSW', '280T', 'J-280-ADS', '22182C929929', '22182C929929', '22182GH62H62', '2022-02-01', '2022-09-01', '6555 x 1764 x 2060', '', '280', 'Yes', 'Active', '', '', '', 'Unit 1']
  ],
  molds: [
    ['1', 'RP-1', 'Container', '2', '30', '100', '150', '80', '300x200x150', '500', 'ABC', 'Zone A', 'XYZ Corp', '2022-01-01', 'Unit 1']
  ],
  schedules: [
    ['SCH-001', '2024-01-01', 'Day', 'JSW-1', 'RP-1', '08:00', '16:00', 'Red', '1000', '10', '100', 'admin', 'No', 'Pending']
  ],
  raw_materials: [
    ['1', 'PP', 'HP', 'HJ333MO', 'Borouge', '75', '910', '', '', 'Unit 1']
  ],
  packing_materials: [
    ['Boxes', 'Export', 'CTN-Ro16', '150', '300x200x150', '5-ply', 'Regular', 'Unit 1']
  ],
  lines: [
    ['1', 'Line-1', 'Production Line 1', 'JSW-1', 'ROBOT-1', 'HOIST-1', 'CONV-1', 'Active', 'Unit 1']
  ],
  maintenance_checklists: [
    ['LINE-1', 'JSW-1', 'Daily Inspection', 'Daily', 'CHK-001', 'Check oil level', 'Daily', '15', 'High', 'Safety', 'Unit 1']
  ],
  bom_masters: [
    ['1', 'Ro16-C', 'SFG-001', '100', '50', 'Black', '70', '10', '5', '5', '5', '5']
  ],
  sfg_bom: [
    ['1', 'Ro16-C', 'SFG-001', '100', '50', 'Black', '70', '10', '5', '5', '5', '5']
  ],
  fg_bom: [
    ['1', 'FG-001', 'Finished Product 1', 'Gesa', '100', 'SFG-001', '2', 'SFG-002', '1', 'CTN-001', '1', 'PB-001', '1', 'BOPP-001', '0.5', '', '']
  ],
  local_bom: [
    ['1', 'LOC-001', 'Local Product 1', '100', 'SFG-001', '2', 'SFG-002', '1', 'CTN-001', '1', 'PB-001', '1', 'BOPP-001', '0.5', '', '', '0.05']
  ],
  dpr: [],
  color_labels: [
    ['1', 'Black']
  ],
  party_names: [
    ['1', 'Gesa']
  ]
};

