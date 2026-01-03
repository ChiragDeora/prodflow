export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  type?: 'string' | 'number' | 'email' | 'url' | 'date';
  min?: number;
  max?: number;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Basic HTML sanitization - remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove any remaining HTML entities
  sanitized = sanitized.replace(/&[^;]+;/g, '');
  
  return sanitized;
}

export function validateString(value: any, rule: ValidationRule, fieldName: string): string {
  if (rule.required && (!value || value === '')) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }
  
  if (!value && !rule.required) return '';
  
  const stringValue = String(value);
  const sanitized = sanitizeInput(stringValue);
  
  if (rule.minLength && sanitized.length < rule.minLength) {
    throw new ValidationError(fieldName, `${fieldName} must be at least ${rule.minLength} characters`);
  }
  
  if (rule.maxLength && sanitized.length > rule.maxLength) {
    throw new ValidationError(fieldName, `${fieldName} must be no more than ${rule.maxLength} characters`);
  }
  
  if (rule.pattern && !rule.pattern.test(sanitized)) {
    throw new ValidationError(fieldName, `${fieldName} format is invalid`);
  }
  
  return sanitized;
}

export function validateNumber(value: any, rule: ValidationRule, fieldName: string): number {
  if (rule.required && (value === null || value === undefined || value === '')) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }
  
  if (!value && !rule.required) return 0;
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    throw new ValidationError(fieldName, `${fieldName} must be a valid number`);
  }
  
  if (rule.min !== undefined && numValue < rule.min) {
    throw new ValidationError(fieldName, `${fieldName} must be at least ${rule.min}`);
  }
  
  if (rule.max !== undefined && numValue > rule.max) {
    throw new ValidationError(fieldName, `${fieldName} must be no more than ${rule.max}`);
  }
  
  return numValue;
}

export function validateEmail(value: any, rule: ValidationRule, fieldName: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const stringValue = validateString(value, rule, fieldName);
  
  if (stringValue && !emailRegex.test(stringValue)) {
    throw new ValidationError(fieldName, `${fieldName} must be a valid email address`);
  }
  
  return stringValue;
}

export function validateArray(value: any, rule: ValidationRule, fieldName: string): any[] {
  if (rule.required && (!Array.isArray(value) || value.length === 0)) {
    throw new ValidationError(fieldName, `${fieldName} is required and must be an array`);
  }
  
  if (!Array.isArray(value)) {
    throw new ValidationError(fieldName, `${fieldName} must be an array`);
  }
  
  if (rule.minLength && value.length < rule.minLength) {
    throw new ValidationError(fieldName, `${fieldName} must have at least ${rule.minLength} items`);
  }
  
  if (rule.maxLength && value.length > rule.maxLength) {
    throw new ValidationError(fieldName, `${fieldName} must have no more than ${rule.maxLength} items`);
  }
  
  return value;
}

export function validateObject(data: any, schema: ValidationSchema): any {
  const result: any = {};
  const errors: ValidationError[] = [];
  
  for (const [field, rule] of Object.entries(schema)) {
    try {
      const value = data[field];
      
      switch (rule.type) {
        case 'string':
          result[field] = validateString(value, rule, field);
          break;
        case 'number':
          result[field] = validateNumber(value, rule, field);
          break;
        case 'email':
          result[field] = validateEmail(value, rule, field);
          break;
        default:
          if (Array.isArray(value)) {
            result[field] = validateArray(value, rule, field);
          } else {
            result[field] = validateString(value, rule, field);
          }
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
  }
  
  return result;
}

// Common validation schemas
export const commonSchemas = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/,
    type: 'string' as const
  },
  email: {
    required: true,
    maxLength: 255,
    type: 'email' as const
  },
  password: {
    required: true,
    minLength: 6,
    maxLength: 128,
    type: 'string' as const
  },
  phone: {
    required: false,
    maxLength: 20,
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    type: 'string' as const
  }
};
