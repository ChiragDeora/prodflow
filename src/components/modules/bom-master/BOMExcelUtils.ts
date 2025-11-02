// BOM Excel Import/Export Utilities

export interface BOMImportRow {
  product_code: string;
  product_name: string;
  category: 'SFG' | 'FG' | 'LOCAL';
  description?: string;
}

export interface BOMExportRow extends BOMImportRow {
  status: 'draft' | 'released' | 'archived';
  total_versions: number;
  active_version?: number;
  created_by: string;
  created_at: string;
}

export const BOM_EXCEL_TEMPLATE = {
  headers: [
    'product_code',
    'product_name', 
    'category',
    'description'
  ],
  sampleData: [
    {
      product_code: 'PROD-001',
      product_name: 'Sample Product 1',
      category: 'FG',
      description: 'Sample finished good product'
    },
    {
      product_code: 'SFG-001',
      product_name: 'Sample Semi-Finished Good',
      category: 'SFG',
      description: 'Sample semi-finished good'
    },
    {
      product_code: 'LOCAL-001',
      product_name: 'Local Component',
      category: 'LOCAL',
      description: 'Sample local component'
    }
  ]
};

export const validateBOMImportRow = (row: any, rowIndex: number): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required field validation
  if (!row.product_code || !row.product_code.trim()) {
    errors.push('Product code is required');
  }

  if (!row.product_name || !row.product_name.trim()) {
    errors.push('Product name is required');
  }

  if (!row.category || !['SFG', 'FG', 'LOCAL'].includes(row.category)) {
    errors.push('Category must be SFG, FG, or LOCAL');
  }

  // Format validation
  if (row.product_code && !/^[A-Z0-9-_]+$/.test(row.product_code)) {
    errors.push('Product code should contain only uppercase letters, numbers, hyphens, and underscores');
  }

  // Length validation
  if (row.product_code && row.product_code.length > 100) {
    errors.push('Product code must be 100 characters or less');
  }

  if (row.product_name && row.product_name.length > 200) {
    errors.push('Product name must be 200 characters or less');
  }

  if (row.description && row.description.length > 1000) {
    errors.push('Description must be 1000 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors: errors.map(error => `Row ${rowIndex + 1}: ${error}`)
  };
};

export const processBOMImportData = (data: any[]): {
  valid: BOMImportRow[];
  invalid: { row: number; data: any; errors: string[] }[];
} => {
  const valid: BOMImportRow[] = [];
  const invalid: { row: number; data: any; errors: string[] }[] = [];

  data.forEach((row, index) => {
    const validation = validateBOMImportRow(row, index);
    
    if (validation.valid) {
      valid.push({
        product_code: row.product_code.trim(),
        product_name: row.product_name.trim(),
        category: row.category,
        description: row.description?.trim() || ''
      });
    } else {
      invalid.push({
        row: index + 1,
        data: row,
        errors: validation.errors
      });
    }
  });

  return { valid, invalid };
};

export const generateBOMExportData = (bomMasters: any[]): BOMExportRow[] => {
  return bomMasters.map(bom => ({
    product_code: bom.product_code,
    product_name: bom.product_name,
    category: bom.category,
    description: bom.description || '',
    status: bom.status,
    total_versions: bom.total_versions,
    active_version: bom.active_version,
    created_by: bom.created_by,
    created_at: new Date(bom.created_at).toISOString().split('T')[0]
  }));
};

export const downloadCSV = (data: any[], filename: string) => {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
