import type { Machine, Mold, RawMaterial, PackingMaterial, Line, SortDirection } from '../types';

/**
 * Sort machines with special handling for machine IDs
 */
export function sortMachines(machines: Machine[], field: string, direction: SortDirection): Machine[] {
  return [...machines].sort((a, b) => {
    let aValue: any = a[field as keyof Machine];
    let bValue: any = b[field as keyof Machine];
    
    // Handle special cases
    if (field === 'capacity_tons' || field === 'size') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else if (field === 'machine_id') {
      // Custom sorting order
      const categoryOrder = [
        'JSW', 'HAIT', 'TOYO', 'WITT', 'SWTK', 'CONY', 'Hoist', 
        'Chiller', 'AIR', 'ELEC', 'Pump', 'CTower', 'Blower', 
        'Grinding', 'PPACK', 'SILO', 'LIFT', 'Stacker', 'Cooler', 'RO'
      ];
      
      const getCategoryFromId = (id: string) => {
        for (const category of categoryOrder) {
          if (id.startsWith(category)) {
            return category;
          }
        }
        return 'OTHER';
      };
      
      const aCategory = getCategoryFromId(String(aValue));
      const bCategory = getCategoryFromId(String(bValue));
      
      const aCategoryIndex = categoryOrder.indexOf(aCategory);
      const bCategoryIndex = categoryOrder.indexOf(bCategory);
      
      if (aCategoryIndex !== bCategoryIndex) {
        return direction === 'asc' ? aCategoryIndex - bCategoryIndex : bCategoryIndex - aCategoryIndex;
      }
      
      // If same category, compare by number
      const extractNumber = (id: string) => {
        const match = id.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const aNum = extractNumber(String(aValue));
      const bNum = extractNumber(String(bValue));
      
      return direction === 'asc' ? aNum - bNum : bNum - aNum;
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Sort molds with special handling for mold IDs
 */
export function sortMolds(molds: Mold[], field: string, direction: SortDirection): Mold[] {
  return [...molds].sort((a, b) => {
    let aValue: any = a[field as keyof Mold];
    let bValue: any = b[field as keyof Mold];
    
    // Handle special cases
    if (field === 'cavities' || field === 'cycle_time' || field === 'st_wt') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else if (field === 'mold_id' || field === 'item_code' || field === 'sr_no') {
      const extractNumber = (id: string) => {
        const match = id.match(/(\d+)$/);
        if (match) return parseInt(match[1]);
        const anyNumber = id.match(/(\d+)/);
        return anyNumber ? parseInt(anyNumber[1]) : 0;
      };
      
      const aNum = extractNumber(String(aValue));
      const bNum = extractNumber(String(bValue));
      
      if (aNum !== 0 && bNum !== 0) {
        aValue = aNum;
        bValue = bNum;
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    return aValue < bValue ? (direction === 'asc' ? -1 : 1) : 
           aValue > bValue ? (direction === 'asc' ? 1 : -1) : 0;
  });
}

/**
 * Generic sort function for raw materials
 */
export function sortRawMaterials(materials: RawMaterial[], field: string, direction: SortDirection): RawMaterial[] {
  return [...materials].sort((a, b) => {
    let aValue: any = a[field as keyof RawMaterial];
    let bValue: any = b[field as keyof RawMaterial];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      aValue = Number(aValue);
      bValue = Number(bValue);
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Generic sort function for packing materials
 */
export function sortPackingMaterials(materials: PackingMaterial[], field: string, direction: SortDirection): PackingMaterial[] {
  return [...materials].sort((a, b) => {
    let aValue: any = a[field as keyof PackingMaterial];
    let bValue: any = b[field as keyof PackingMaterial];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      aValue = Number(aValue);
      bValue = Number(bValue);
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Generic sort function for lines
 */
export function sortLines(lines: Line[], field: string, direction: SortDirection): Line[] {
  return [...lines].sort((a, b) => {
    let aValue: any = a[field as keyof Line];
    let bValue: any = b[field as keyof Line];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      aValue = Number(aValue);
      bValue = Number(bValue);
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

