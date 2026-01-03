export interface RawMaterial {
  id: string;
  sl_no: number;
  category: string; // PP, PE, etc.
  type: string; // HP, ICP, RCP, LDPE, MB, etc.
  grade: string; // HJ333MO, 1750 MN, etc.
  supplier: string; // Borouge, IOCL, Basell, etc.
  mfi: number | null; // Melt Flow Index
  density: number | null; // Density in g/cm³
  tds_image?: string; // Base64 encoded TDS image or URL
  remark?: string; // Additional remarks
  unit?: string; // Factory unit identifier (Unit 1, Unit 2, etc.)
  created_at?: string;
  updated_at?: string;
}

export interface PackingMaterial {
  id?: string;
  category: string; // Boxes, PolyBags, Bopp
  type: string; // Export, Local, etc.
  item_code: string; // CTN-Ro16, etc.
  pack_size: string; // 150, 800, etc.
  dimensions: string; // LxBxH format
  technical_detail: string; // Technical specifications
  brand: string; // Regular, Gesa, etc.
  cbm?: number; // Cubic meter measurement - area that flat box would take
  artwork?: string; // Artwork image data or URL
  unit?: string; // Factory unit identifier (Unit 1, Unit 2, etc.)
  created_at?: string;
  updated_at?: string;
}

