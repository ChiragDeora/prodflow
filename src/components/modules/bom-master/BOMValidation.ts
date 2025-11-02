// BOM Validation Utilities

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateBOMMaster = (bomData: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!bomData.product_code || !bomData.product_code.trim()) {
    errors.push('Product code is required');
  }

  if (!bomData.product_name || !bomData.product_name.trim()) {
    errors.push('Product name is required');
  }

  if (!bomData.category || !['SFG', 'FG', 'LOCAL'].includes(bomData.category)) {
    errors.push('Category must be SFG, FG, or LOCAL');
  }

  // Format validation
  if (bomData.product_code && !/^[A-Z0-9-_]+$/.test(bomData.product_code)) {
    errors.push('Product code should contain only uppercase letters, numbers, hyphens, and underscores');
  }

  // Length validation
  if (bomData.product_code && bomData.product_code.length > 100) {
    errors.push('Product code must be 100 characters or less');
  }

  if (bomData.product_name && bomData.product_name.length > 200) {
    errors.push('Product name must be 200 characters or less');
  }

  if (bomData.description && bomData.description.length > 1000) {
    errors.push('Description must be 1000 characters or less');
  }

  // Business rule validation
  if (bomData.product_code && bomData.product_code.length < 3) {
    warnings.push('Product code is very short, consider using a more descriptive code');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateBOMVersion = (versionData: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!versionData.bom_master_id) {
    errors.push('BOM master ID is required');
  }

  if (!versionData.components || !Array.isArray(versionData.components)) {
    errors.push('Components array is required');
  }

  if (versionData.components && versionData.components.length === 0) {
    warnings.push('No components defined for this version');
  }

  // Component validation
  if (versionData.components) {
    versionData.components.forEach((component: any, index: number) => {
      if (!component.component_code || !component.component_code.trim()) {
        errors.push(`Component ${index + 1}: Component code is required`);
      }

      if (!component.component_name || !component.component_name.trim()) {
        errors.push(`Component ${index + 1}: Component name is required`);
      }

      if (!component.quantity || component.quantity <= 0) {
        errors.push(`Component ${index + 1}: Quantity must be greater than 0`);
      }

      if (!component.unit_of_measure || !component.unit_of_measure.trim()) {
        errors.push(`Component ${index + 1}: Unit of measure is required`);
      }

      if (component.unit_cost && component.unit_cost < 0) {
        errors.push(`Component ${index + 1}: Unit cost cannot be negative`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateBOMComponent = (componentData: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!componentData.component_code || !componentData.component_code.trim()) {
    errors.push('Component code is required');
  }

  if (!componentData.component_name || !componentData.component_name.trim()) {
    errors.push('Component name is required');
  }

  if (!componentData.component_type || !['raw_material', 'packing_material', 'sub_assembly', 'other'].includes(componentData.component_type)) {
    errors.push('Component type must be raw_material, packing_material, sub_assembly, or other');
  }

  if (!componentData.quantity || componentData.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (!componentData.unit_of_measure || !componentData.unit_of_measure.trim()) {
    errors.push('Unit of measure is required');
  }

  // Format validation
  if (componentData.component_code && !/^[A-Z0-9-_]+$/.test(componentData.component_code)) {
    errors.push('Component code should contain only uppercase letters, numbers, hyphens, and underscores');
  }

  // Length validation
  if (componentData.component_code && componentData.component_code.length > 100) {
    errors.push('Component code must be 100 characters or less');
  }

  if (componentData.component_name && componentData.component_name.length > 200) {
    errors.push('Component name must be 200 characters or less');
  }

  // Business rule validation
  if (componentData.quantity && componentData.quantity > 10000) {
    warnings.push('Quantity is very high, please verify this is correct');
  }

  if (componentData.unit_cost && componentData.unit_cost > 10000) {
    warnings.push('Unit cost is very high, please verify this is correct');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateBOMStatusTransition = (currentStatus: string, newStatus: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validTransitions: Record<string, string[]> = {
    'draft': ['released', 'archived'],
    'released': ['archived'],
    'archived': [] // Archived BOMs cannot be changed
  };

  if (!validTransitions[currentStatus]) {
    errors.push(`Invalid current status: ${currentStatus}`);
  } else if (!validTransitions[currentStatus].includes(newStatus)) {
    errors.push(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }

  if (currentStatus === 'released' && newStatus === 'archived') {
    warnings.push('Archiving a released BOM will make it read-only');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateBOMImmutability = (bomStatus: string, operation: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (bomStatus === 'released' && ['update', 'delete'].includes(operation)) {
    errors.push('Cannot modify or delete released BOMs. Create a new version instead.');
  }

  if (bomStatus === 'archived' && ['update', 'delete', 'create_version'].includes(operation)) {
    errors.push('Cannot modify archived BOMs');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
