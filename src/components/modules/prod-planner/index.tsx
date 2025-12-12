'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar, 
  ZoomIn, 
  ZoomOut,
  Save,
  Download,
  Settings,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { 
  lineAPI, moldAPI, packingMaterialAPI, colorLabelAPI, partyNameAPI, 
  productionBlockAPI,
  Line, Mold, PackingMaterial, ColorLabel, PartyName,
  ProductionBlockWithRelations, ProductionBlockColorSegment, ProductionBlockProductColor,
  ProductionBlockPackingMaterial, ProductionBlockPartyCode
} from '../../../lib/supabase';

// Types
interface ProductionLine {
  id: string;
  name: string;
  color: string;
  lineData?: Line; // Reference to actual line data
  isActive?: boolean; // Status indicator
  im_machine_id?: string;
  robot_machine_id?: string;
  conveyor_machine_id?: string;
  hoist_machine_id?: string;
  status?: 'Active' | 'Inactive' | 'Maintenance';
  grinding?: boolean; // Indicates if grinding operations can be performed on this line
}

interface ColorSegment {
  color: string;
  label?: string; // Optional color label (e.g., "Black", "White", "Peach")
  startDay: number; // Relative start day within the block (0-based)
  endDay: number; // Relative end day within the block
}

interface ProductColor {
  color: string; // Color name (e.g., "Black", "Peach", "White")
  quantity: number; // Number of pieces
  partyCode?: string; // Party code associated with this color
}

interface PackingMaterialSelection {
  packingMaterialId: string;
  quantity: number;
}

interface ProductionBlock {
  id: string;
  lineId: string;
  startDay: number;
  endDay: number;
  label: string;
  color: string; // Base/default color
  colorSegments?: ColorSegment[]; // Multiple colors within the same block
  productColors?: ProductColor[]; // Product colors with quantities (e.g., black 1000 pieces, peach 0 pieces, white 100 pieces)
  partyCodes?: string[]; // Multiple party codes/names from party_name_master (e.g., ["Gesa", "Klex"])
  packingMaterials?: {
    boxes?: PackingMaterialSelection[];
    polybags?: PackingMaterialSelection[];
    bopp?: PackingMaterialSelection[];
  };
  notes?: string;
  duration: number;
  moldId?: string; // Reference to actual mold
  moldData?: Mold; // Reference to actual mold data
  isResizingLeft?: boolean; // For drag handle logic
  isChangeover?: boolean; // Indicates if this is a changeover day
  changeoverStartDay?: number; // If changeover, which day it starts
  changeoverEndDay?: number; // If changeover, which day it ends
  changeoverTime?: number; // Changeover time in minutes
  changeoverTimeString?: string; // Changeover time as time string (HH:MM)
  changeoverTimeMode?: 'minutes' | 'time'; // Whether time is in minutes or time format
  changeoverMoldId?: string; // Mold to changeover to
  changeoverMoldData?: Mold; // Changeover mold data
  isChangeoverBlock?: boolean; // True if this block is the changeover block (gray)
}

interface ProdPlannerProps {
  // Add any props if needed
}

const ProdPlanner: React.FC<ProdPlannerProps> = () => {
  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [molds, setMolds] = useState<Mold[]>([]);
  const [packingMaterials, setPackingMaterials] = useState<PackingMaterial[]>([]);
  const [colorLabels, setColorLabels] = useState<ColorLabel[]>([]);
  const [partyNames, setPartyNames] = useState<PartyName[]>([]);
  const [availableColorsForParty, setAvailableColorsForParty] = useState<Record<string, ColorLabel[]>>({});
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<ProductionBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ProductionBlock | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ 
    mouseX: number; 
    mouseY: number; 
    initialLineIndex: number;
    initialStartDay: number;
    initialEndDay: number;
  } | null>(null);
  const [editingBlock, setEditingBlock] = useState<ProductionBlock | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'month' | 'week'>('month');
  const [currentWeek, setCurrentWeek] = useState(1); // Week of the month
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [hoveredBlock, setHoveredBlock] = useState<ProductionBlock | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number; day: number } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ day: number; lineId: string } | null>(null);
  const [originalBlockPosition, setOriginalBlockPosition] = useState<{ startDay: number; endDay: number; lineId: string } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; block: ProductionBlock } | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<ProductionLine | null>(null);
  const [lineTooltipPosition, setLineTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [clipboardBlock, setClipboardBlock] = useState<ProductionBlock | null>(null);
  const [clickStartTime, setClickStartTime] = useState<number | null>(null);
  const [clickStartPos, setClickStartPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ day: number; lineId: string } | null>(null);
  const [selectedCellRange, setSelectedCellRange] = useState<{ startDay: number; endDay: number; lineId: string } | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<{ day: number; lineId: string } | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [dayLineData, setDayLineData] = useState<{ [key: string]: { 
    color: string; 
    quantity: number; 
    changeoverTime: string; 
    extendDays: number;
    packingMaterialId?: string;
    packingMaterialQty?: number;
    changeoverMoldName?: string;
    logEntries?: Array<{
      type: 'color' | 'packing' | 'changeover';
      date: string;
      time: string;
      value: string;
      quantity?: number;
    }>;
  } }>({});
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [lineDefaultColors, setLineDefaultColors] = useState<Record<string, string>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerHsl, setColorPickerHsl] = useState<{ h: number; s: number; l: number }>({ h: 200, s: 100, l: 50 });
  const [changeoverTimeMode, setChangeoverTimeMode] = useState<'minutes' | 'time'>('minutes');
  
  // Blocked gray hex codes - common gray shades
  const blockedGrayHexes = [
    '#808080', '#808080', '#A9A9A9', '#C0C0C0', '#D3D3D3', '#DCDCDC',
    '#696969', '#778899', '#708090', '#2F4F4F', '#708090', '#778899',
    '#BEBEBE', '#D3D3D3', '#DCDCDC', '#E5E5E5', '#F5F5F5'
  ];

  // Color palette from colorPalette.txt
  const colorPalette = useMemo(() => {
    const colors = [
      // Whites & Creams
      { name: 'Barley White', hex: '#FFF4CE' },
      { name: 'Stark White', hex: '#D6CAB8' },
      { name: 'Snow White', hex: '#FFFAFA' },
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Floral White', hex: '#FFFAF0' },
      { name: 'Cornsilk', hex: '#FFF8DC' },
      { name: 'Antique White', hex: '#FAEBD7' },
      { name: 'Papaya Whip', hex: '#FFEFD5' },
      { name: 'Peach Puff', hex: '#FFDAB9' },
      { name: 'Bone White', hex: '#F9F6EE' },
      { name: 'Pearl', hex: '#E2DFD2' },
      { name: 'Vanilla', hex: '#F3E5AB' },
      { name: 'Parchment', hex: '#FCF5E5' },
      { name: 'Dutch White', hex: '#EFDFBB' },
      { name: 'White Smoke', hex: '#F5F5F5' },
      { name: 'Linen', hex: '#FAF0E6' },
      { name: 'Platinum', hex: '#E5E4E2' },
      { name: 'Honeydew', hex: '#F0FFF0' },
      { name: 'Seashell', hex: '#FFF5EE' },
      { name: 'Vanilla White', hex: '#FFFAFA' },
      { name: 'Chiffon', hex: '#FFFACD' },
      { name: 'Old Lace', hex: '#FFF8F0' },
      { name: 'Off-White', hex: '#F2F0EF' },
      { name: 'Misty Rose', hex: '#FFE4E1' },
      { name: 'Ghost', hex: '#F8F8FF' },
      { name: 'Merino', hex: '#F2EBDD' },
      { name: 'Cup Cake', hex: '#EBF6F7' },
      { name: 'Link Water', hex: '#ECF3F9' },
      { name: 'Soft Peach', hex: '#F6F1F4' },
      { name: 'Island Spice', hex: '#FFFCEC' },
      { name: 'Audience Anger', hex: '#EAF4FC' },
      { name: 'Ivory', hex: '#FDFFF5' },
      { name: 'Old Wood', hex: '#F0EEE4' },
      { name: 'Spring', hex: '#F3F0E8' },
      { name: 'Happy Tan', hex: '#EBF5F0' },
      { name: 'Peppermint', hex: '#F1F9EC' },
      { name: 'Unresolved Problem', hex: '#F3F2ED' },
      // Minimal Grays (filtered - grays are blocked)
      // Warm Tones
      { name: 'Warm Cream', hex: '#FFF9F0' },
      { name: 'Soft Sand', hex: '#FCEFD9' },
      { name: 'Pale Oat', hex: '#F4E8CC' },
      { name: 'Warm Linen', hex: '#EDE1C0' },
      { name: 'Muted Khaki', hex: '#D7CBB0' },
      { name: 'Olive Beige', hex: '#B8AE95' },
      { name: 'Deep Taupe', hex: '#8D8471' },
      // Cool Tones
      { name: 'Cool White', hex: '#FAFBFF' },
      { name: 'Fog Gray', hex: '#F2F4F8' },
      { name: 'Cloud Gray', hex: '#E5E8EE' },
      { name: 'Steel Mist', hex: '#D0D5DD' },
      { name: 'Dusty Blue', hex: '#98A1B3' },
      { name: 'Urban Slate', hex: '#6C7380' },
      { name: 'Midnight Graphite', hex: '#3B3F46' },
      // Additional Colors
      { name: 'Blush White', hex: '#FFE4E8' },
      { name: 'Soft Cream', hex: '#FFF7F0' },
      { name: 'Mint White', hex: '#F0FFF8' },
      // Earth Tones
      { name: 'Earth Mist', hex: '#E8E3D8' },
      { name: 'Claystone', hex: '#D8D2C3' },
      { name: 'Warm Pebble', hex: '#C3BBAB' },
      { name: 'Muted Fawn', hex: '#A89F90' },
      { name: 'Smoked Umber', hex: '#7A7366' },
      { name: 'Deep Earth', hex: '#4C4742' },
      // Blue Tones
      { name: 'Ice White', hex: '#F8FAFF' },
      { name: 'Pale Sky', hex: '#EDF3FF' },
      { name: 'Frost Blue', hex: '#DCE7F8' },
      { name: 'Clear Lake', hex: '#C3D6F1' },
      { name: 'Sky Steel', hex: '#9FBDE2' },
      { name: 'Harbor Blue', hex: '#6C8BB1' },
      { name: 'Deep Ocean', hex: '#2D4660' },
    ];
    
    // Filter out gray colors
    const isGray = (hex: string): boolean => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const diff = Math.max(r, g, b) - Math.min(r, g, b);
      return diff < 30 || blockedGrayHexes.includes(hex.toUpperCase());
    };
    
    return colors.filter(color => !isGray(color.hex));
  }, [blockedGrayHexes]);
  
  const isGrayColor = (hex: string): boolean => {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Check if it's a gray (R, G, B are similar)
    const diff = Math.max(r, g, b) - Math.min(r, g, b);
    return diff < 30 || blockedGrayHexes.includes(hex.toUpperCase());
  };

  // Check if a color is dark (low brightness) - returns true if dark
  const isDarkColor = (hex: string): boolean => {
    if (!hex || !hex.startsWith('#')) return false;
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Calculate relative luminance (perceived brightness)
    // Using the formula: 0.299*R + 0.587*G + 0.114*B
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If luminance is below 0.5, consider it dark
    return luminance < 0.5;
  };
  
  const applyColorToEditingBlock = (color: string) => {
    if (!color) return;
    const normalizedColor = color.startsWith('#') ? color.toUpperCase() : color;
    setEditingBlock(prev => (prev ? { ...prev, color: normalizedColor } : prev));
  };

  // Color conversion helpers
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };

  const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };

  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const colorPickerHslRef = useRef<{ h: number; s: number; l: number }>({ h: 200, s: 100, l: 50 });

  // Helper function to start tooltip delay
  const startTooltipDelay = useCallback((e: React.MouseEvent) => {
    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    
    // Set new timeout for 3 seconds
    const timeout = setTimeout(() => {
      setShowTooltip(true);
    }, 3000);
    
    setTooltipTimeout(timeout);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  }, [tooltipTimeout]);

  // Helper function to clear tooltip delay
  const clearTooltipDelay = useCallback(() => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setShowTooltip(false);
  }, [tooltipTimeout]);

  // Function to determine line status based on machines
  const getLineStatus = useCallback((line: ProductionLine) => {
    const machines = [
      line.im_machine_id,
      line.robot_machine_id,
      line.conveyor_machine_id,
      line.hoist_machine_id
    ].filter(Boolean); // Remove null/undefined values

    // If any machine is missing, line is inactive
    if (machines.length < 4) {
      return { status: 'inactive', color: 'gray', reason: 'Missing machines' };
    }

    // Check if any machine is in maintenance (you'll need to implement this logic based on your data)
    // For now, we'll use the existing status field
    if (line.status === 'Maintenance') {
      return { status: 'maintenance', color: 'orange', reason: 'Under maintenance' };
    }

    // If all 4 machines are present and not in maintenance, line is active
    return { status: 'active', color: 'green', reason: 'All machines operational' };
  }, []);

  // White-based color palette for blocks
  const lineColors = [
    '#E0F2FE', // White-based blue (sky blue)
    '#D1FAE5', // White-based green (mint green)
    '#FEF3C7', // White-based yellow (cream)
    '#FEE2E2', // White-based red (rose)
    '#F3E8FF', // White-based purple (lavender)
    '#E0E7FF', // White-based indigo
    '#FCE7F3', // White-based pink
    '#ECFCCB', // White-based lime
    '#FFF7ED', // White-based orange (peach)
    '#F0F9FF'  // White-based cyan
  ];

  // Helper function to transform database block to UI block
  const transformDbBlockToUI = useCallback((dbBlock: ProductionBlockWithRelations, molds: Mold[]): ProductionBlock => {
    const mold = dbBlock.mold_id ? molds.find(m => m.mold_id === dbBlock.mold_id) : undefined;
    const changeoverMold = dbBlock.changeover_mold_id ? molds.find(m => m.mold_id === dbBlock.changeover_mold_id) : undefined;

    return {
      id: dbBlock.id,
      lineId: dbBlock.line_id,
      startDay: dbBlock.start_day,
      endDay: dbBlock.end_day,
      label: dbBlock.label,
      color: dbBlock.color,
      duration: dbBlock.duration,
      notes: dbBlock.notes,
      moldId: dbBlock.mold_id,
      moldData: mold,
      isResizingLeft: dbBlock.is_resizing_left,
      isChangeover: dbBlock.is_changeover,
      isChangeoverBlock: dbBlock.is_changeover_block,
      changeoverStartDay: dbBlock.changeover_start_day,
      changeoverEndDay: dbBlock.changeover_end_day,
      changeoverTime: dbBlock.changeover_time,
      changeoverTimeString: dbBlock.changeover_time_string,
      changeoverTimeMode: dbBlock.changeover_time_mode,
      changeoverMoldId: dbBlock.changeover_mold_id,
      changeoverMoldData: changeoverMold,
      colorSegments: dbBlock.color_segments?.map(cs => ({
        color: cs.color,
        label: cs.label,
        startDay: cs.start_day_offset,
        endDay: cs.end_day_offset
      })),
      productColors: dbBlock.product_colors?.map(pc => ({
        color: pc.color,
        quantity: pc.quantity,
        partyCode: pc.party_code
      })),
      partyCodes: dbBlock.party_codes?.map(pc => pc.party_code),
      packingMaterials: dbBlock.packing_materials ? {
        boxes: dbBlock.packing_materials.filter(pm => pm.category === 'boxes').map(pm => ({
          packingMaterialId: pm.packing_material_id,
          quantity: pm.quantity
        })),
        polybags: dbBlock.packing_materials.filter(pm => pm.category === 'polybags').map(pm => ({
          packingMaterialId: pm.packing_material_id,
          quantity: pm.quantity
        })),
        bopp: dbBlock.packing_materials.filter(pm => pm.category === 'bopp').map(pm => ({
          packingMaterialId: pm.packing_material_id,
          quantity: pm.quantity
        }))
      } : undefined
    };
  }, []);

  // Helper function to transform UI block to database block
  const transformUIBlockToDB = useCallback((uiBlock: ProductionBlock, year: number, month: number): ProductionBlockWithRelations => {
    const dbBlock: ProductionBlockWithRelations = {
      id: uiBlock.id,
      line_id: uiBlock.lineId,
      start_day: uiBlock.startDay,
      end_day: uiBlock.endDay,
      duration: uiBlock.duration,
      label: uiBlock.label,
      color: uiBlock.color.toUpperCase(),
      mold_id: uiBlock.moldId,
      production_day_start_time: '08:00:00',
      is_changeover: uiBlock.isChangeover || false,
      is_changeover_block: uiBlock.isChangeoverBlock || false,
      changeover_start_day: uiBlock.changeoverStartDay,
      changeover_end_day: uiBlock.changeoverEndDay,
      changeover_time: uiBlock.changeoverTime,
      changeover_time_string: uiBlock.changeoverTimeString,
      changeover_time_mode: uiBlock.changeoverTimeMode,
      changeover_mold_id: uiBlock.changeoverMoldId,
      notes: uiBlock.notes,
      is_resizing_left: uiBlock.isResizingLeft || false,
      planning_month: month,
      planning_year: year
    };

    // Transform related data
    if (uiBlock.colorSegments && uiBlock.colorSegments.length > 0) {
      dbBlock.color_segments = uiBlock.colorSegments.map(cs => ({
        block_id: uiBlock.id,
        color: cs.color,
        label: cs.label,
        start_day_offset: cs.startDay,
        end_day_offset: cs.endDay
      }));
    }

    if (uiBlock.productColors && uiBlock.productColors.length > 0) {
      dbBlock.product_colors = uiBlock.productColors.map(pc => ({
        block_id: uiBlock.id,
        color: pc.color,
        quantity: pc.quantity,
        party_code: pc.partyCode
      }));
    }

    if (uiBlock.partyCodes && uiBlock.partyCodes.length > 0) {
      dbBlock.party_codes = uiBlock.partyCodes.map(pc => ({
        block_id: uiBlock.id,
        party_code: pc
      }));
    }

    if (uiBlock.packingMaterials) {
      dbBlock.packing_materials = [];
      if (uiBlock.packingMaterials.boxes) {
        dbBlock.packing_materials.push(...uiBlock.packingMaterials.boxes.map(pm => ({
          block_id: uiBlock.id,
          category: 'boxes' as const,
          packing_material_id: pm.packingMaterialId,
          quantity: pm.quantity
        })));
      }
      if (uiBlock.packingMaterials.polybags) {
        dbBlock.packing_materials.push(...uiBlock.packingMaterials.polybags.map(pm => ({
          block_id: uiBlock.id,
          category: 'polybags' as const,
          packing_material_id: pm.packingMaterialId,
          quantity: pm.quantity
        })));
      }
      if (uiBlock.packingMaterials.bopp) {
        dbBlock.packing_materials.push(...uiBlock.packingMaterials.bopp.map(pm => ({
          block_id: uiBlock.id,
          category: 'bopp' as const,
          packing_material_id: pm.packingMaterialId,
          quantity: pm.quantity
        })));
      }
    }

    return dbBlock;
  }, []);

  // Save block to database
  const saveBlockToDatabase = useCallback(async (block: ProductionBlock) => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      console.log('💾 Saving block to database:', {
        id: block.id,
        lineId: block.lineId,
        startDay: block.startDay,
        endDay: block.endDay,
        year,
        month
      });
      const dbBlock = transformUIBlockToDB(block, year, month);
      console.log('💾 Transformed block data:', dbBlock);
      const result = await productionBlockAPI.save(dbBlock);
      console.log('✅ Successfully saved block to database:', block.id, result);
      return result;
    } catch (error) {
      console.error('❌ Failed to save block to database:', error);
      console.error('❌ Block data:', block);
      throw error;
    }
  }, [currentMonth, transformUIBlockToDB]);

  // Load blocks from database when month/year changes
  useEffect(() => {
    const loadBlocks = async () => {
      if (!molds.length) return; // Wait for molds to load first
      
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1; // getMonth() returns 0-11
        
        console.log('📅 Loading blocks for', year, month);
        const dbBlocks = await productionBlockAPI.getByMonth(year, month);
        
        // Transform database blocks to UI blocks
        const uiBlocks = dbBlocks.map(dbBlock => transformDbBlockToUI(dbBlock, molds));
        
        setBlocks(uiBlocks);
        console.log('✅ Loaded', uiBlocks.length, 'blocks from database');
      } catch (error) {
        console.error('❌ Failed to load blocks:', error);
      }
    };

    loadBlocks();
  }, [currentMonth, molds, transformDbBlockToUI]);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Test direct database query first
        console.log('🔍 Testing direct database query...');
        const testQuery = await lineAPI.getAll();
        console.log('🔍 Direct query result:', testQuery);
        
        // Fetch lines, molds, packing materials, color labels, and party names in parallel
        const [linesData, moldsData, packingMaterialsData, colorLabelsData, partyNamesData] = await Promise.all([
          lineAPI.getAll(),
          moldAPI.getAll(),
          packingMaterialAPI.getAll(),
          colorLabelAPI.getAll(),
          partyNameAPI.getAll()
        ]);

        // Transform lines data - check if line has any active status from database
        const transformedLines: ProductionLine[] = linesData.map((line, index) => {
          console.log(`🔍 Line ${line.line_id} status:`, line.status, 'Type:', typeof line.status);
          
          // Handle different possible status values
          const isActive = line.status === 'Active';
          
          console.log(`🔍 Line ${line.line_id} isActive:`, isActive);
          
          return {
            id: line.line_id,
            name: line.line_id,
            color: lineColors[index % lineColors.length],
            lineData: line,
            isActive: isActive,
            im_machine_id: line.im_machine_id,
            robot_machine_id: line.robot_machine_id,
            conveyor_machine_id: line.conveyor_machine_id,
            hoist_machine_id: line.hoist_machine_id,
            status: line.status,
            grinding: line.grinding || false
          };
        });

        setLines(transformedLines);
        setMolds(moldsData);
        setPackingMaterials(packingMaterialsData);
        setColorLabels(colorLabelsData);
        setPartyNames(partyNamesData);
        // Initialize available colors map (empty, will be loaded per party when needed)
        setAvailableColorsForParty({});
        
        console.log('✅ Loaded', transformedLines.length, 'lines,', moldsData.length, 'molds, and', packingMaterialsData.length, 'packing materials');
        console.log('📊 Raw lines data:', linesData);
        console.log('📊 Line statuses:', linesData.map(l => ({ id: l.line_id, status: l.status, isActive: l.status === 'Active' })));
        console.log('📊 Transformed lines:', transformedLines.map(l => ({ id: l.id, isActive: l.isActive })));
        
        // Debug specific lines
        const line001 = linesData.find(l => l.line_id === 'LINE-001');
        if (line001) {
          console.log('🔍 LINE-001 debug:', {
            status: line001.status,
            statusType: typeof line001.status,
            isActive: line001.status === 'Active',
            comparison: `"${line001.status}" === "Active"`,
            result: line001.status === 'Active'
          });
        }
      } catch (error) {
        console.error('❌ Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get days in current month or week
  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, []);

  // Get days for current week
  const getDaysInWeek = useCallback((date: Date, weekNumber: number) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekStart = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start day of the week (Monday-based)
    const startDay = (weekNumber - 1) * 7 - firstWeekStart + 2; // +2 to start from Monday
    const maxDays = new Date(year, month + 1, 0).getDate();
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = startDay + i;
      if (day > 0 && day <= maxDays) {
        weekDays.push(day);
      } else {
        weekDays.push(null);
      }
    }
    
    return weekDays.filter(day => day !== null);
  }, []);

  // Get current display days based on zoom level
  const getDisplayDays = useCallback(() => {
    if (zoomLevel === 'week') {
      return getDaysInWeek(currentMonth, currentWeek);
    }
    return getDaysInMonth(currentMonth);
  }, [zoomLevel, currentMonth, currentWeek, getDaysInWeek, getDaysInMonth]);
  
  useEffect(() => {
    setLineDefaultColors(prev => {
      let needsUpdate = false;
      const updated = { ...prev };
      blocks.forEach(block => {
        if (block.color && !updated[block.lineId]) {
          updated[block.lineId] = block.color.toUpperCase();
          needsUpdate = true;
        }
      });
      return needsUpdate ? updated : prev;
    });
  }, [blocks]);

  // Load available colors for all party codes in editing block
  useEffect(() => {
    if (editingBlock?.partyCodes && editingBlock.partyCodes.length > 0) {
      const loadColorsForParties = async () => {
        const colorsMap: Record<string, ColorLabel[]> = {};
        for (const partyCode of editingBlock.partyCodes || []) {
          try {
            const partyColors = await colorLabelAPI.getColorsForParty(partyCode);
            colorsMap[partyCode] = partyColors;
          } catch (error) {
            console.error(`Error fetching colors for party ${partyCode}:`, error);
            colorsMap[partyCode] = colorLabels; // Fallback to all colors
          }
        }
        setAvailableColorsForParty(colorsMap);
      };
      loadColorsForParties();
    } else {
      // If no parties selected, clear the map
      setAvailableColorsForParty({});
    }
  }, [editingBlock?.partyCodes, colorLabels]);

  // Get month name
  const getMonthName = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Calculate dynamic column widths based on longest mold name in each line
  const lineColumnWidths = useMemo(() => {
    const minWidth = 120; // Minimum column width (increased for better fit)
    const charWidth = 10; // Approximate pixel width per character (increased for monospace-like fonts)
    const padding = 50; // Padding for the column (left + right padding + border + safety margin)
    const baseWidth = zoomLevel === 'week' ? 140 : 120; // Base width for empty columns (increased)
    
    return lines.map(line => {
      // Find all blocks for this line
      const lineBlocks = blocks.filter(b => b.lineId === line.id);
      
      if (lineBlocks.length === 0) {
        return baseWidth; // Return base width if no blocks
      }
      
      // Find the longest text - check both label and mold name from moldData
      const longestText = lineBlocks.reduce((longest, block) => {
        // Get the actual mold name from moldData if available (might be longer than label)
        // This is critical: the tooltip shows mold_name, so column should fit mold_name
        const moldName = block.moldData?.mold_name || '';
        const label = block.label || '';
        
        // Use whichever is longer - this ensures column fits the longest possible text
        const maxLength = Math.max(
          label.length,
          moldName.length
        );
        
        return maxLength > longest ? maxLength : longest;
      }, 0);
      
      // Also check line name length (for header)
      const lineNameLength = line.name?.length || 0;
      
      // Calculate width based on longest text (block content or line name)
      const maxTextLength = Math.max(longestText, lineNameLength);
      const calculatedWidth = Math.max(
        minWidth,
        maxTextLength * charWidth + padding,
        baseWidth // Ensure at least base width
      );
      
      return Math.ceil(calculatedWidth / 10) * 10; // Round up to nearest 10px for cleaner rendering
    });
  }, [lines, blocks, zoomLevel]);

  // Calculate block position and dimensions (inverted: dates as rows, lines as columns)
  const getBlockStyle = useCallback((block: ProductionBlock, displayDays: number[], lineIndex: number, blockColor?: string) => {
    const dayHeight = 48; // Height of each day row (h-12 = 48px)
    const headerWidth = 80; // Width of the date header column (w-20 = 80px)
    const margin = 2; // Small margin to prevent touching grid lines
    const dayIndex = displayDays.findIndex(day => day === block.startDay);
    const top = dayIndex >= 0 ? dayIndex * dayHeight + margin : margin;
    // All blocks are now single-day, so height is always dayHeight
    const height = dayHeight - (margin * 2);
    
    // Use dynamic column width for this line
    const lineWidth = lineIndex >= 0 && lineIndex < lineColumnWidths.length 
      ? lineColumnWidths[lineIndex] 
      : (zoomLevel === 'week' ? 120 : 100);
    
    // Calculate left position: sum of all previous column widths + header width
    const left = headerWidth + lineColumnWidths.slice(0, lineIndex).reduce((sum, width) => sum + width, 0) + margin;
    const width = lineWidth - (margin * 2);
    
    return {
      position: 'absolute' as const,
      left: `${left}px`,
      width: `${width}px`,
      backgroundColor: blockColor || block.color,
      top: `${top}px`,
      height: `${height}px`,
    };
  }, [zoomLevel, lineColumnWidths]);

  // Check for overlaps - prevent ANY overlapping blocks (strict no-overlap policy)
  const checkOverlaps = useCallback((newBlock: ProductionBlock, excludeId?: string) => {
    const relevantBlocks = blocks.filter(block => block.id !== excludeId && block.lineId === newBlock.lineId);
    
    if (relevantBlocks.length === 0) {
      return false;
    }
    
    // Check for ANY overlap - if blocks share the same day, it's an overlap
    return relevantBlocks.some(block => {
      // Overlap occurs if blocks share any day
      // Since all blocks are single-day (startDay === endDay), we just check if they're on the same day
      return newBlock.startDay === block.startDay;
    });
  }, [blocks]);

  // Check if the same mold is already scheduled on a different line on the same day
  // Returns the conflicting block if found, or null if no conflict
  const checkMoldConflict = useCallback((newBlock: ProductionBlock, excludeId?: string): ProductionBlock | null => {
    // If no moldId is set, skip this check
    if (!newBlock.moldId) {
      return null;
    }
    
    // Find blocks with the same mold on the same day but different line
    const conflictingBlock = blocks.find(block => {
      if (block.id === excludeId) return false; // Exclude the block being updated
      if (!block.moldId) return false; // Skip blocks without moldId
      if (block.moldId !== newBlock.moldId) return false; // Different mold
      if (block.startDay !== newBlock.startDay) return false; // Different day - no conflict!
      if (block.lineId === newBlock.lineId) return false; // Same line is okay
      
      // Same mold, same day, different line = conflict!
      return true;
    });
    
    return conflictingBlock || null;
  }, [blocks]);

  // Get overlapping blocks for visual feedback
  const getOverlappingBlocks = useCallback((block: ProductionBlock) => {
    return blocks
      .filter(b => b.id !== block.id && b.lineId === block.lineId)
      .filter(b => {
        // Check for overlap - if blocks share the same day, it's an overlap
        return block.startDay === b.startDay;
      });
  }, [blocks]);

  // Detect and mark changeover blocks
  const detectChangeovers = useCallback((blocks: ProductionBlock[]) => {
    return blocks.map(block => {
      // Find blocks that end on the same day this block starts (changeover at start)
      const changeoverAtStart = blocks.find(otherBlock => 
        otherBlock.id !== block.id && 
        otherBlock.lineId === block.lineId && 
        otherBlock.endDay === block.startDay
      );
      
      // Find blocks that start on the same day this block ends (changeover at end)
      const changeoverAtEnd = blocks.find(otherBlock => 
        otherBlock.id !== block.id && 
        otherBlock.lineId === block.lineId && 
        otherBlock.startDay === block.endDay
      );
      
      const hasChangeover = !!changeoverAtStart || !!changeoverAtEnd;
      
      return {
        ...block,
        isChangeover: hasChangeover,
        // Set changeover day to the day where changeover happens (start or end)
        changeoverStartDay: changeoverAtStart ? block.startDay : undefined,
        changeoverEndDay: changeoverAtEnd ? block.endDay : undefined,
      };
    });
  }, []);

  // Check if a specific day has a changeover on a specific line
  const hasChangeoverOnDay = useCallback((day: number, lineId: string) => {
    const lineBlocks = blocks.filter(block => block.lineId === lineId);
    
    // Check if any block ends on this day and another starts on this day
    const hasBlockEndingOnDay = lineBlocks.some(block => block.endDay === day);
    const hasBlockStartingOnDay = lineBlocks.some(block => block.startDay === day);
    
    return hasBlockEndingOnDay && hasBlockStartingOnDay;
  }, [blocks]);

  // Get the changeover day for a specific line (the day where changeover happens)
  const getChangeoverDay = useCallback((lineId: string) => {
    const lineBlocks = blocks.filter(block => block.lineId === lineId);
    
    // Find days where one block ends and another starts
    for (const block of lineBlocks) {
      const hasBlockStartingOnEndDay = lineBlocks.some(otherBlock => 
        otherBlock.id !== block.id && 
        otherBlock.startDay === block.endDay
      );
      
      if (hasBlockStartingOnEndDay) {
        return block.endDay; // Return the day where the changeover happens
      }
    }
    
    return null;
  }, [blocks]);

  // Handle drag start - completely rewritten for inverted layout
  const handleDragStart = useCallback((e: React.MouseEvent, block: ProductionBlock) => {
    // Don't start drag if clicking on resize handles (they have their own handlers)
    if ((e.target as HTMLElement).closest('.resize-handle-right')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Select block immediately (for keyboard shortcuts)
    setSelectedBlock({ ...block });
    
    // Store click info to detect if it's just a click vs drag
    setClickStartTime(Date.now());
    setClickStartPos({ x: e.clientX, y: e.clientY });
    
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    
    // Find the initial line index for this block
    const initialLineIndex = lines.findIndex(l => l.id === block.lineId);
    
    // Store initial positions for potential drag
    setDragStart({ 
      mouseX: e.clientX, 
      mouseY: e.clientY,
      initialLineIndex: initialLineIndex >= 0 ? initialLineIndex : 0,
      initialStartDay: block.startDay,
      initialEndDay: block.endDay
    });
    setOriginalBlockPosition({ 
      startDay: block.startDay, 
      endDay: block.endDay,
      lineId: block.lineId
    });
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }, [lines]);

  // Handle drag move - completely rewritten for inverted layout
  const handleDragMove = useCallback((e: MouseEvent) => {
    // Check if this is actually a drag (mouse moved > 5px) - if so, start dragging
    if (clickStartPos && !isDragging && selectedBlock && dragStart) {
      const deltaX = Math.abs(e.clientX - clickStartPos.x);
      const deltaY = Math.abs(e.clientY - clickStartPos.y);
      if (deltaX > 5 || deltaY > 5) {
        // This is a drag, start dragging
        setIsDragging(true);
      }
    }
    
    if (!isDragging || !selectedBlock || !dragStart) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const dayHeight = 48; // Height of each day row (h-12 = 48px)
    const headerWidth = 80; // Width of the date header column (w-20 = 80px)
    const headerHeight = 48; // Height of the header row (h-12 = 48px)
    
    // Get current display days
    const currentDays = getDisplayDays();
    if (currentDays.length === 0) return;
    
    // Calculate relative position within the grid
    // Note: gridRef points to the inner grid container, but scroll is on the parent
    const scrollContainer = gridRef.current?.parentElement;
    const scrollLeft = scrollContainer?.scrollLeft || 0;
    const scrollTop = scrollContainer?.scrollTop || 0;
    const relativeX = e.clientX - gridRect.left + scrollLeft;
    const relativeY = e.clientY - gridRect.top + scrollTop;
    
    // Calculate which LINE (column) we're hovering over - X axis using dynamic widths
    let targetLineIndex = dragStart.initialLineIndex;
    if (relativeX >= headerWidth) {
      // We're past the date header, calculate line index by summing column widths
      const adjustedX = relativeX - headerWidth;
      let accumulatedWidth = 0;
      let foundIndex = -1;
      
      for (let i = 0; i < lineColumnWidths.length; i++) {
        if (adjustedX >= accumulatedWidth && adjustedX < accumulatedWidth + lineColumnWidths[i]) {
          foundIndex = i;
          break;
        }
        accumulatedWidth += lineColumnWidths[i];
      }
      
      if (foundIndex >= 0) {
        targetLineIndex = foundIndex;
      } else {
        // Fallback: use last index if beyond all columns
        targetLineIndex = Math.max(0, Math.min(lines.length - 1, lineColumnWidths.length - 1));
      }
    }
    
    const newLineId = lines[targetLineIndex]?.id || selectedBlock.lineId;
    
    // Calculate which DAY (row) we're hovering over - Y axis
    // The header is sticky, so we need to account for it
    // But the gridRect.top already accounts for scroll, so we need to check if we're in the header
    const adjustedY = relativeY - headerHeight;
    
    // Calculate day index from Y position (allow negative to snap to first day)
    const dayIndex = Math.floor(adjustedY / dayHeight);
    const clampedDayIndex = Math.max(0, Math.min(currentDays.length - 1, dayIndex < 0 ? 0 : dayIndex));
    const targetDay = currentDays[clampedDayIndex] || currentDays[0] || dragStart.initialStartDay;
    
    // Calculate how many days the block should span (keep original duration)
    const blockDuration = dragStart.initialEndDay - dragStart.initialStartDay + 1;
    const newStartDay = targetDay;
    const newEndDay = newStartDay + blockDuration - 1;
    
    // Constrain to valid day range
    const minDay = Math.min(...currentDays);
    const maxDay = Math.max(...currentDays);
    const constrainedStartDay = Math.max(minDay, Math.min(maxDay - blockDuration + 1, newStartDay));
    const constrainedEndDay = constrainedStartDay + blockDuration - 1;

    // Check for boundaries with other blocks on the target line
    const otherBlocks = blocks.filter(block => 
      block.id !== selectedBlock.id && 
      block.lineId === newLineId
    );

    // Find the nearest block boundaries
    let minStart = minDay;
    let maxEnd = maxDay;

    otherBlocks.forEach(block => {
      if (block.endDay < constrainedStartDay) {
        minStart = Math.max(minStart, block.endDay); // Same day transitions allowed
      }
      if (block.startDay > constrainedEndDay) {
        maxEnd = Math.min(maxEnd, block.startDay); // Same day transitions allowed
      }
    });

    // Final constraint based on other blocks
    let finalStartDay = Math.max(minStart, Math.min(maxEnd - blockDuration + 1, constrainedStartDay));
    let finalEndDay = finalStartDay + blockDuration - 1;
    
    // Ensure we don't go out of bounds
    finalStartDay = Math.max(minDay, Math.min(maxDay - blockDuration + 1, finalStartDay));
    finalEndDay = Math.min(maxDay, finalStartDay + blockDuration - 1);

    // Update block position in real-time for visual feedback only
    // DO NOT update blocks array here - that causes wrong overlap/changeover detection
    const updatedBlock = { 
      ...selectedBlock, 
      lineId: newLineId, 
      startDay: finalStartDay, 
      endDay: finalEndDay,
      duration: blockDuration
    };
    
    // Only update selectedBlock for visual preview, NOT the blocks array
      setSelectedBlock(updatedBlock);
    
    // Set drag preview
    setDragPreview({
      x: e.clientX - 50,
      y: e.clientY - 25,
      block: updatedBlock
    });
  }, [isDragging, selectedBlock, dragStart, zoomLevel, blocks, checkOverlaps, checkMoldConflict, lines, getDisplayDays, lineColumnWidths]);

  // Handle drag end - completely rewritten for inverted layout
  const handleDragEnd = useCallback(() => {
    // Restore text selection and cursor
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    if (selectedBlock && originalBlockPosition) {
      // Use the current position from selectedBlock (which gets updated during drag)
      let updatedBlock = { ...selectedBlock };
      
      // If dragging a changeover block, convert it to a normal block with original color
      if (selectedBlock.isChangeoverBlock) {
        const { isChangeoverBlock, changeoverTime, changeoverTimeString, changeoverTimeMode, changeoverMoldId, changeoverMoldData, ...cleanBlock } = selectedBlock;
        const line = lines.find(l => l.id === selectedBlock.lineId);
        updatedBlock = {
          ...cleanBlock,
          // Use the line's default color or line color instead of changeover color
          color: (lineDefaultColors[selectedBlock.lineId] || line?.color || '#E0F2FE').toUpperCase()
        };
      }
      
      const hasOverlap = checkOverlaps(updatedBlock, selectedBlock.id);
      const conflictingBlock = checkMoldConflict(updatedBlock, selectedBlock.id);
      const hasMoldConflict = conflictingBlock !== null;
      
      if (hasOverlap || hasMoldConflict) {
        // Revert to original position if overlap or mold conflict detected
        const revertedBlock = { 
          ...selectedBlock, 
          startDay: originalBlockPosition.startDay, 
          endDay: originalBlockPosition.endDay,
          lineId: originalBlockPosition.lineId
        };
        setSelectedBlock(revertedBlock);
        setBlocks(prev => prev.map(block => 
          block.id === selectedBlock.id ? revertedBlock : block
        ));
        
        let errorMessage = 'Cannot place block: ';
        if (hasOverlap) {
          errorMessage += 'There is a true overlap with existing blocks on this line. Same-day transitions are allowed (morning/evening shifts).';
        } else if (hasMoldConflict && conflictingBlock) {
          const moldName = selectedBlock.moldData?.mold_name || selectedBlock.label;
          errorMessage += `The mold "${moldName}" is already scheduled on a different line on day ${updatedBlock.startDay}. A mold can only be on one line per day.`;
        }
        alert(errorMessage);
      } else {
        // Update blocks and detect changeovers after successful drag
        setBlocks(prev => {
          const updatedBlocks = prev.map(block => 
            block.id === selectedBlock.id ? updatedBlock : block
          );
          return detectChangeovers(updatedBlocks);
        });
        // Update selectedBlock to reflect the cleaned block
        setSelectedBlock(updatedBlock);
        
        // Save to database immediately
        saveBlockToDatabase(updatedBlock).catch(error => {
          console.error('❌ Failed to save block after drag:', error);
        });
      }
    }
    
    // Check if this was just a click (no drag movement or very quick)
    const wasClick = !isDragging || (clickStartTime && Date.now() - clickStartTime < 200);
    
    // Clear click tracking
    setClickStartTime(null);
    setClickStartPos(null);
    
    setIsDragging(false);
    setDragStart(null);
    setOriginalBlockPosition(null);
    setDragPreview(null);
    
    // Don't clear selectedBlock - keep it selected for keyboard shortcuts
    // Only clear if it was a real drag (not just a click)
    if (wasClick) {
      // Block stays selected for keyboard shortcuts
    } else if (selectedBlock && originalBlockPosition) {
      // After a drag, block is still selected - that's fine
    }
  }, [selectedBlock, checkOverlaps, checkMoldConflict, detectChangeovers, originalBlockPosition, isDragging, clickStartTime, lines, lineDefaultColors, saveBlockToDatabase]);

  // Handle block resize
  const handleBlockResize = useCallback((block: ProductionBlock, newDuration: number) => {
    const newEndDay = block.startDay + newDuration - 1;
    const updatedBlock = { ...block, endDay: newEndDay, duration: newDuration };
    
    setBlocks(prev => prev.map(b => b.id === block.id ? updatedBlock : b));
  }, []);

  // Handle resize drag move (inverted: resize vertically for days)
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isDraggingBlock || !selectedBlock || !dragStartPosition) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const dayHeight = 48; // Height of each day row (h-12 = 48px)
    const headerHeight = 48; // Height of the header row
    const scrollContainer = gridRef.current?.parentElement;
    const scrollTop = scrollContainer?.scrollTop || 0;
    
    // Calculate which day we're hovering over
    const relativeY = e.clientY - gridRect.top + scrollTop - headerHeight;
    const targetDay = Math.max(1, Math.floor(relativeY / dayHeight) + 1);
    
    const currentDays = getDisplayDays();
    const maxDay = currentDays.length > 0 ? Math.max(...currentDays) : 31;
    const minDay = currentDays.length > 0 ? Math.min(...currentDays) : 1;
    
    if (selectedBlock.isResizingLeft) {
      // Top handle: extend upward
      const newStartDay = Math.max(minDay, Math.min(selectedBlock.endDay, targetDay));
      const daysToCreate = selectedBlock.endDay - newStartDay + 1;
      setDragPreview({
        x: e.clientX - 50,
        y: e.clientY - 25,
        block: { ...selectedBlock, startDay: newStartDay, endDay: selectedBlock.endDay }
      });
    } else {
      // Bottom handle: extend downward
      const daysToCreate = Math.max(1, targetDay - selectedBlock.startDay + 1);
      setDragPreview({
        x: e.clientX - 50,
        y: e.clientY - 25,
        block: { ...selectedBlock, endDay: selectedBlock.startDay + daysToCreate - 1 }
      });
    }
  }, [isDraggingBlock, selectedBlock, dragStartPosition, getDisplayDays]);

  // Handle resize drag end
  const handleResizeEnd = useCallback((e: MouseEvent) => {
    setIsDraggingBlock(false);
    
    if (!selectedBlock || !dragStartPosition) {
      setDragStartPosition(null);
      setOriginalBlockPosition(null);
      setDragPreview(null);
      return;
    }
    
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    
    const dayHeight = 48; // Height of each day row
    const headerHeight = 48; // Height of the header row
    const scrollContainer = gridRef.current?.parentElement;
    const scrollTop = scrollContainer?.scrollTop || 0;
    
    // Calculate which day we're at
    const relativeY = e.clientY - gridRect.top + scrollTop - headerHeight;
    const targetDay = Math.max(1, Math.floor(relativeY / dayHeight) + 1);
    
    const currentDays = getDisplayDays();
    const maxDay = currentDays.length > 0 ? Math.max(...currentDays) : 31;
    const minDay = currentDays.length > 0 ? Math.min(...currentDays) : 1;
    
    if (selectedBlock.isResizingLeft) {
      // Top handle: extend upward - create multiple blocks going up
      const newStartDay = Math.max(minDay, Math.min(selectedBlock.endDay, targetDay));
      const daysToCreate = selectedBlock.endDay - newStartDay + 1;
      
      // Create new blocks for each day going upward (excluding the original last day)
      const newBlocks: ProductionBlock[] = [];
      
      for (let i = 0; i < daysToCreate - 1; i++) {
        const dayBlock: ProductionBlock = {
          ...selectedBlock,
          id: `block-${Date.now()}-${i}`,
          startDay: newStartDay + i,
          endDay: newStartDay + i,
          duration: 1,
        };
        
        // Check for overlaps
        const hasOverlap = checkOverlaps(dayBlock);
        const conflictingBlock = checkMoldConflict(dayBlock);
        const hasMoldConflict = conflictingBlock !== null;
        if (!hasOverlap && !hasMoldConflict) {
          newBlocks.push(dayBlock);
        }
      }
      
      // Update the original block to the new start day
      const updatedOriginalBlock = {
        ...selectedBlock,
        startDay: newStartDay,
        endDay: selectedBlock.endDay,
        duration: 1
      };
      
      // Add all new blocks and update original
      if (newBlocks.length > 0) {
        setBlocks(prev => {
          const blocksWithoutOriginal = prev.filter(b => b.id !== selectedBlock.id);
          const allNewBlocks = [...blocksWithoutOriginal, updatedOriginalBlock, ...newBlocks];
          return detectChangeovers(allNewBlocks);
        });
        
        // Save all blocks to database
        Promise.all([
          saveBlockToDatabase(updatedOriginalBlock),
          ...newBlocks.map(block => saveBlockToDatabase(block))
        ]).catch(error => {
          console.error('❌ Failed to save blocks after resize:', error);
        });
      } else {
        // Just update the original block's start day
        setBlocks(prev => {
          const updatedBlocks = prev.map(b => 
            b.id === selectedBlock.id ? updatedOriginalBlock : b
          );
          return detectChangeovers(updatedBlocks);
        });
        
        // Save to database
        saveBlockToDatabase(updatedOriginalBlock).catch(error => {
          console.error('❌ Failed to save block after resize:', error);
        });
      }
    } else {
      // Bottom handle: extend downward - create multiple blocks going down
      const lastDay = Math.min(maxDay, Math.max(selectedBlock.startDay, targetDay));
      const daysToCreate = lastDay - selectedBlock.startDay + 1;
      
      // If this is a changeover block, create normal blocks with the changeover mold's properties
      const isChangeoverBlock = selectedBlock.isChangeoverBlock;
      let baseBlock = selectedBlock;
      
      if (isChangeoverBlock) {
        // Strip changeover properties and use line's normal color
        const { isChangeoverBlock, changeoverTime, changeoverTimeString, changeoverTimeMode, changeoverMoldId, changeoverMoldData, ...cleanBlock } = selectedBlock;
        const line = lines.find(l => l.id === selectedBlock.lineId);
        baseBlock = {
          ...cleanBlock,
          // Use the line's default color or line color instead of changeover color
          color: (lineDefaultColors[selectedBlock.lineId] || line?.color || '#E0F2FE').toUpperCase()
        };
      }
      
      // Create new blocks for each day (excluding the original first day)
      const newBlocks: ProductionBlock[] = [];
      
      for (let i = 1; i < daysToCreate; i++) {
        const dayBlock: ProductionBlock = {
          ...baseBlock,
          id: `block-${Date.now()}-${i}`,
          startDay: selectedBlock.startDay + i,
          endDay: selectedBlock.startDay + i,
          duration: 1,
        };
        
        // Check for overlaps
        const hasOverlap = checkOverlaps(dayBlock);
        const conflictingBlock = checkMoldConflict(dayBlock);
        const hasMoldConflict = conflictingBlock !== null;
        if (!hasOverlap && !hasMoldConflict) {
          newBlocks.push(dayBlock);
        }
      }
      
      // Add all new blocks
      if (newBlocks.length > 0) {
        setBlocks(prev => {
          const allNewBlocks = [...prev, ...newBlocks];
          return detectChangeovers(allNewBlocks);
        });
        
        // Save all new blocks to database
        Promise.all(newBlocks.map(block => saveBlockToDatabase(block))).catch(error => {
          console.error('❌ Failed to save blocks after resize:', error);
        });
      }
    }
    
    setDragStartPosition(null);
    setOriginalBlockPosition(null);
    setDragPreview(null);
    if (selectedBlock) {
      setSelectedBlock({ ...selectedBlock, isResizingLeft: undefined });
    }
  }, [selectedBlock, dragStartPosition, getDisplayDays, checkOverlaps, checkMoldConflict, detectChangeovers, lines, lineDefaultColors, saveBlockToDatabase]);

  // Add event listeners for drag - add them when dragStart is set (not just when isDragging is true)
  // This allows us to detect movement and then set isDragging
  useEffect(() => {
    if (dragStart && selectedBlock) {
      const handleMouseMove = (e: MouseEvent) => {
        handleDragMove(e);
      };
      
      const handleMouseUp = () => {
        handleDragEnd();
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragStart, selectedBlock, handleDragMove, handleDragEnd]);

  // Close color picker when clicking outside
  useEffect(() => {
    if (!showColorPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside the color picker
      if (!target.closest('[data-color-picker]')) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  // Close line tooltip when clicking outside
  useEffect(() => {
    if (!hoveredLine) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on the info icon or the tooltip itself
      if (!target.closest('[data-line-tooltip]') && !target.closest('[data-info-icon]')) {
        setHoveredLine(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [hoveredLine]);

  // Add event listeners for resize drag
  useEffect(() => {
    if (isDraggingBlock) {
      const mouseMoveHandler = (e: MouseEvent) => handleResizeMove(e);
      const mouseUpHandler = (e: MouseEvent) => handleResizeEnd(e);
      
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      
      return () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
    }
  }, [isDraggingBlock, handleResizeMove, handleResizeEnd]);

  // Keyboard shortcuts for copy, paste, delete, duplicate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Arrow keys with Shift for cell range selection
      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (selectedCell) {
          e.preventDefault();
          const currentDays = getDisplayDays();
          if (currentDays.length === 0) return;
          
          const currentIndex = currentDays.findIndex(d => d === selectedCell.day);
          if (currentIndex === -1) return;
          
          // Don't move if already at boundary
          if (e.key === 'ArrowUp' && currentIndex === 0) return;
          if (e.key === 'ArrowDown' && currentIndex === currentDays.length - 1) return;
          
          let newIndex = currentIndex;
          if (e.key === 'ArrowUp') {
            newIndex = currentIndex - 1;
          } else if (e.key === 'ArrowDown') {
            newIndex = currentIndex + 1;
          }
          
          const newDay = currentDays[newIndex];
          
          // Determine anchor day - use the stored rangeAnchor if exists and is on same line, otherwise use selectedCell
          let anchorDay: number;
          if (rangeAnchor && rangeAnchor.lineId === selectedCell.lineId) {
            // Use the stored anchor (the original cell where range selection started)
            anchorDay = rangeAnchor.day;
          } else if (selectedCellRange && selectedCellRange.lineId === selectedCell.lineId) {
            // Fallback: if we have a range but no stored anchor, infer from range
            // The anchor is whichever end of the range was the original cell
            // Since we don't know, we'll use the smaller day as anchor (startDay)
            anchorDay = selectedCellRange.startDay;
            // Store it for future use
            setRangeAnchor({ day: anchorDay, lineId: selectedCell.lineId });
          } else {
            // First time creating a range - use the current selectedCell as anchor
            anchorDay = selectedCell.day;
            setRangeAnchor({ day: anchorDay, lineId: selectedCell.lineId });
          }
          
          // Calculate new range from anchor to new position
          const startDay = Math.min(anchorDay, newDay);
          const endDay = Math.max(anchorDay, newDay);
          
          // Update selection
          setSelectedCell({ day: newDay, lineId: selectedCell.lineId });
          setSelectedCellRange({ startDay, endDay, lineId: selectedCell.lineId });
          
          // Select block in the new cell if exists
          const blockInCell = blocks.find(b => b.lineId === selectedCell.lineId && b.startDay === newDay);
          if (blockInCell) {
            setSelectedBlock(blockInCell);
          } else {
            setSelectedBlock(null);
          }
        }
        return;
      }

      // Regular arrow keys without Shift - move selection
      if (!e.shiftKey && !ctrlOrCmd && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        if (selectedCell) {
          e.preventDefault();
          const currentDays = getDisplayDays();
          if (currentDays.length === 0) return;
          
          const currentDayIndex = currentDays.findIndex(d => d === selectedCell.day);
          if (currentDayIndex === -1) return;
          
          const currentLineIndex = lines.findIndex(l => l.id === selectedCell.lineId);
          
          let newDay = selectedCell.day;
          let newLineId = selectedCell.lineId;
          
          if (e.key === 'ArrowUp' && currentDayIndex > 0) {
            newDay = currentDays[currentDayIndex - 1];
          } else if (e.key === 'ArrowDown' && currentDayIndex < currentDays.length - 1) {
            newDay = currentDays[currentDayIndex + 1];
          } else if (e.key === 'ArrowLeft' && currentLineIndex > 0) {
            newLineId = lines[currentLineIndex - 1].id;
          } else if (e.key === 'ArrowRight' && currentLineIndex < lines.length - 1) {
            newLineId = lines[currentLineIndex + 1].id;
          }
          
          setSelectedCell({ day: newDay, lineId: newLineId });
          setSelectedCellRange(null); // Clear range when moving with arrow keys
          setRangeAnchor(null); // Clear anchor when moving with arrow keys
          
          // Select block in the new cell if exists
          const blockInCell = blocks.find(b => b.lineId === newLineId && b.startDay === newDay);
          if (blockInCell) {
            setSelectedBlock(blockInCell);
          } else {
            setSelectedBlock(null);
          }
        }
        return;
      }

      // Only work if a cell is selected
      if (!selectedCell) return;

      // Copy: Ctrl/Cmd + C
      if (ctrlOrCmd && e.key === 'c') {
        if (selectedBlock) {
          e.preventDefault();
          // If copying a changeover block, strip changeover properties so it copies as a normal block
          if (selectedBlock.isChangeoverBlock) {
            // Create a clean copy without changeover properties
            const { isChangeoverBlock, changeoverTime, changeoverTimeString, changeoverTimeMode, changeoverMoldId, changeoverMoldData, ...cleanBlock } = selectedBlock;
            const line = lines.find(l => l.id === selectedBlock.lineId);
            setClipboardBlock({
              ...cleanBlock,
              productColors: selectedBlock.productColors ? [...selectedBlock.productColors] : [],
              // Use the line's default color or line color instead of changeover color
              color: (lineDefaultColors[selectedBlock.lineId] || line?.color || '#E0F2FE').toUpperCase()
            });
          } else {
          setClipboardBlock({ 
            ...selectedBlock,
            productColors: selectedBlock.productColors ? [...selectedBlock.productColors] : [],
          });
          }
        }
        return;
      }

      // Paste: Ctrl/Cmd + V
      if (ctrlOrCmd && e.key === 'v') {
        if (clipboardBlock && selectedCell) {
          e.preventDefault();
          const newBlock: ProductionBlock = {
            ...clipboardBlock,
            id: `block-${Date.now()}`,
            lineId: selectedCell.lineId,
            startDay: selectedCell.day,
            endDay: selectedCell.day,
            duration: 1,
            label: clipboardBlock.label,
            productColors: clipboardBlock.productColors ? [...clipboardBlock.productColors] : [],
            packingMaterials: clipboardBlock.packingMaterials ? {
              boxes: clipboardBlock.packingMaterials.boxes ? [...clipboardBlock.packingMaterials.boxes] : [],
              polybags: clipboardBlock.packingMaterials.polybags ? [...clipboardBlock.packingMaterials.polybags] : [],
              bopp: clipboardBlock.packingMaterials.bopp ? [...clipboardBlock.packingMaterials.bopp] : []
            } : {
              boxes: [],
              polybags: [],
              bopp: []
            }
          };
          
          // Check for overlaps and mold conflicts before pasting
          const hasOverlap = checkOverlaps(newBlock);
          const conflictingBlock = checkMoldConflict(newBlock);
          const hasMoldConflict = conflictingBlock !== null;
          
          if (!hasOverlap && !hasMoldConflict) {
            setBlocks(prev => {
              const newBlocks = [...prev, newBlock];
              return detectChangeovers(newBlocks);
            });
            setSelectedBlock(newBlock);
            
            // Save to database
            saveBlockToDatabase(newBlock).catch(error => {
              console.error('❌ Failed to save block after paste:', error);
            });
          } else {
            let errorMessage = 'Cannot paste: ';
            if (hasOverlap) {
              errorMessage += 'There is already a block in this cell.';
            } else if (hasMoldConflict) {
              const moldName = clipboardBlock.moldData?.mold_name || clipboardBlock.label;
              errorMessage += `The mold "${moldName}" is already scheduled on a different line on day ${selectedCell.day}. A mold can only be on one line per day.`;
            }
            alert(errorMessage);
          }
        }
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (ctrlOrCmd && e.key === 'd') {
        if (selectedBlock && selectedCell) {
          e.preventDefault();
          // Find next empty cell on the same line
          const lineBlocks = blocks.filter(b => b.lineId === selectedCell.lineId);
          const occupiedDays = new Set(lineBlocks.map(b => b.startDay));
          let nextEmptyDay = selectedCell.day + 1;
          const maxDay = 31;
          
          while (nextEmptyDay <= maxDay && occupiedDays.has(nextEmptyDay)) {
            nextEmptyDay++;
          }
          
          if (nextEmptyDay > maxDay) {
            alert('Cannot duplicate: No empty cells available on this line.');
            return;
          }
          
          const newBlock: ProductionBlock = {
            ...selectedBlock,
            id: `block-${Date.now()}`,
            startDay: nextEmptyDay,
            endDay: nextEmptyDay,
            duration: 1,
            label: selectedBlock.label,
            productColors: selectedBlock.productColors ? [...selectedBlock.productColors] : [],
            packingMaterials: selectedBlock.packingMaterials ? {
              boxes: selectedBlock.packingMaterials.boxes ? [...selectedBlock.packingMaterials.boxes] : [],
              polybags: selectedBlock.packingMaterials.polybags ? [...selectedBlock.packingMaterials.polybags] : [],
              bopp: selectedBlock.packingMaterials.bopp ? [...selectedBlock.packingMaterials.bopp] : []
            } : {
              boxes: [],
              polybags: [],
              bopp: []
            }
          };
          
          // Check for overlaps and mold conflicts before duplicating
          const hasOverlap = checkOverlaps(newBlock);
          const conflictingBlock = checkMoldConflict(newBlock);
          const hasMoldConflict = conflictingBlock !== null;
          
          if (!hasOverlap && !hasMoldConflict) {
            setBlocks(prev => {
              const newBlocks = [...prev, newBlock];
              return detectChangeovers(newBlocks);
            });
            setSelectedCell({ day: nextEmptyDay, lineId: selectedCell.lineId });
            setSelectedBlock(newBlock);
            
            // Save to database
            saveBlockToDatabase(newBlock).catch(error => {
              console.error('❌ Failed to save block after duplicate:', error);
            });
          } else {
            let errorMessage = 'Cannot duplicate: ';
            if (hasOverlap) {
              errorMessage += `Day ${nextEmptyDay} has an overlap with existing blocks on this line.`;
            } else if (hasMoldConflict) {
              const moldName = selectedBlock.moldData?.mold_name || selectedBlock.label;
              errorMessage += `The mold "${moldName}" is already scheduled on a different line on day ${nextEmptyDay}. A mold can only be on one line per day.`;
            }
            alert(errorMessage);
          }
        }
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCellRange && selectedCell) {
          // Delete all blocks in the selected range
          e.preventDefault();
          const rangeBlocks = blocks.filter(b => 
            b.lineId === selectedCellRange.lineId &&
            b.startDay >= selectedCellRange.startDay &&
            b.startDay <= selectedCellRange.endDay
          );
          
          if (rangeBlocks.length > 0) {
            const blockCount = rangeBlocks.length;
            if (confirm(`Are you sure you want to delete ${blockCount} block(s)?`)) {
              const blockIdsToDelete = rangeBlocks.map(b => b.id);
              
              // Delete from database
              productionBlockAPI.bulkDelete(blockIdsToDelete).catch(error => {
                console.error('❌ Failed to delete blocks from database:', error);
                alert('Failed to delete blocks from database. Please try again.');
              });
              
              setBlocks(prev => {
                const blockIdsSet = new Set(blockIdsToDelete);
                const newBlocks = prev.filter(block => !blockIdsSet.has(block.id));
                return detectChangeovers(newBlocks);
              });
              setSelectedBlock(null);
              // Keep cell range selected
            }
          }
          return;
        } else if (selectedBlock) {
          // Delete single selected block
          e.preventDefault();
          if (confirm(`Are you sure you want to delete "${selectedBlock.label}"?`)) {
            setBlocks(prev => {
              const newBlocks = prev.filter(block => block.id !== selectedBlock.id);
              return detectChangeovers(newBlocks);
            });
            setSelectedBlock(null);
            // Keep cell selected
          }
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBlock, clipboardBlock, selectedCell, selectedCellRange, checkOverlaps, checkMoldConflict, detectChangeovers, blocks, lines, getDisplayDays, lineDefaultColors]);

  // Create new block
  const createBlock = useCallback((lineId: string, day: number) => {
    // Don't create block immediately - just open the editing modal
    const line = lines.find(l => l.id === lineId);
    const defaultColor = (lineDefaultColors[lineId] || line?.color || '#E0F2FE').toUpperCase();
    const newBlock: ProductionBlock = {
      id: `block-${Date.now()}`,
      lineId,
      startDay: day,
      endDay: day, // Single day by default
      label: 'New Production Run',
      color: defaultColor,
      duration: 1, // Single day - user can increase duration in form to create multiple days
      productColors: [], // Initialize empty product colors array
      packingMaterials: {
        boxes: [],
        polybags: [],
        bopp: []
      }
    };

    // Open editing modal without creating the block yet
    setEditingBlock(newBlock);
  }, [lines, lineDefaultColors]);

  // Update block
  const updateBlock = useCallback(async (updatedBlock: ProductionBlock) => {
    // Check if mold is selected
    if (!updatedBlock.moldId) {
      alert('Please select a mold before saving the block.');
      return;
    }

    // Check if this is a new block (not yet in blocks array)
    const isNewBlock = !blocks.some(block => block.id === updatedBlock.id);
    
    // Get duration - if endDay is different from startDay, calculate duration
    const duration = updatedBlock.duration || (updatedBlock.endDay - updatedBlock.startDay + 1);
    const startDay = updatedBlock.startDay;
    
    if (duration > 1 && isNewBlock) {
      // Create separate single-day blocks for each day
      const newBlocks: ProductionBlock[] = [];
      
      for (let i = 0; i < duration; i++) {
        const dayBlock: ProductionBlock = {
          ...updatedBlock,
          id: `block-${Date.now()}-${i}`,
          startDay: startDay + i,
          endDay: startDay + i, // Single day block
          duration: 1,
        };
        
        // Check for overlaps for each block
        const hasOverlap = checkOverlaps(dayBlock);
        if (hasOverlap) {
          alert(`Cannot create block: Day ${startDay + i} has an overlap with existing blocks on this line.`);
          return;
        }
        
        // Check if same mold is already on a different line on this day
        const conflictingBlock = checkMoldConflict(dayBlock);
        if (conflictingBlock !== null) {
          const moldName = dayBlock.moldData?.mold_name || dayBlock.label;
          alert(`Cannot create block: The mold "${moldName}" is already scheduled on a different line on day ${startDay + i}. A mold can only be on one line per day.`);
          return;
        }
        
        newBlocks.push(dayBlock);
      }
      
      // Save all new blocks to database
      try {
        await Promise.all(newBlocks.map(block => saveBlockToDatabase(block)));
      } catch (error) {
        console.error('❌ Failed to save blocks to database:', error);
        alert('Failed to save blocks to database. Please try again.');
        return;
      }
      
      // Add all new blocks
      setBlocks(prev => {
        const allNewBlocks = [...prev, ...newBlocks];
        return detectChangeovers(allNewBlocks);
      });
    } else {
      // Single day block - ensure it's a single-day block
      const singleDayBlock: ProductionBlock = {
        ...updatedBlock,
        startDay: startDay,
        endDay: startDay, // Single day
        duration: 1,
      };

    // Check for overlaps before updating
      const hasOverlap = checkOverlaps(singleDayBlock, updatedBlock.id);
    if (hasOverlap) {
      alert('Cannot update block: There is a true overlap with existing blocks on this line. Same-day transitions are allowed (morning/evening shifts).');
      return;
    }

      // Check if same mold is already on a different line on this day
      const conflictingBlock = checkMoldConflict(singleDayBlock, updatedBlock.id);
      if (conflictingBlock !== null) {
        const moldName = singleDayBlock.moldData?.mold_name || singleDayBlock.label;
        alert(`Cannot update block: The mold "${moldName}" is already scheduled on a different line on day ${singleDayBlock.startDay}. A mold can only be on one line per day.`);
        return;
      }
    
    // Handle changeover blocks
    const changeoverColor = '#FFB84D'; // Light orange/amber color for changeover blocks
    const blocksToSave: ProductionBlock[] = [];
    
    if (isNewBlock) {
      // Prepare blocks to save before updating state
      blocksToSave.push(singleDayBlock);
      
      // If changeover is configured, create changeover block below
      if (singleDayBlock.changeoverTime && singleDayBlock.changeoverTime > 0 && singleDayBlock.changeoverMoldId && singleDayBlock.changeoverMoldData) {
        // Mark the original block as having changeover (orange/amber it)
        const blockWithChangeover = { ...singleDayBlock, color: changeoverColor };
        blocksToSave[0] = blockWithChangeover;
        
        // Create changeover block below (on next day) - use line's normal color, not amber
        const line = lines.find(l => l.id === singleDayBlock.lineId);
        const changeoverBlock: ProductionBlock = {
          id: `changeover-${singleDayBlock.id}-${Date.now()}`,
          lineId: singleDayBlock.lineId,
          startDay: singleDayBlock.startDay + 1,
          endDay: singleDayBlock.startDay + 1,
          label: singleDayBlock.changeoverMoldData.mold_name,
          color: (lineDefaultColors[singleDayBlock.lineId] || line?.color || '#E0F2FE').toUpperCase(),
          duration: 1,
          moldId: singleDayBlock.changeoverMoldId,
          moldData: singleDayBlock.changeoverMoldData,
          isChangeoverBlock: true,
          productColors: singleDayBlock.productColors ? [...singleDayBlock.productColors] : [],
        };
        
        // Check if changeover block can be placed
        const changeoverOverlap = checkOverlaps(changeoverBlock);
        const changeoverConflict = checkMoldConflict(changeoverBlock);
        
        if (!changeoverOverlap && !changeoverConflict) {
          blocksToSave.push(changeoverBlock);
        }
      }
      
      // Save all blocks to database FIRST
      try {
        console.log('💾 Saving', blocksToSave.length, 'new block(s) to database...');
        await Promise.all(blocksToSave.map(block => saveBlockToDatabase(block)));
        console.log('✅ All blocks saved successfully');
      } catch (error) {
        console.error('❌ Failed to save blocks to database:', error);
        alert('Failed to save blocks to database. Please try again.');
        return;
      }
      
      // Add new block and detect changeovers AFTER saving
      setBlocks(prev => {
        const newBlocks = [...prev, ...blocksToSave];
        return detectChangeovers(newBlocks);
      });
    } else {
      // Update existing block and detect changeovers
      blocksToSave.push(singleDayBlock);
      
      // If changeover is configured, create changeover block below
      if (singleDayBlock.changeoverTime && singleDayBlock.changeoverTime > 0 && singleDayBlock.changeoverMoldId && singleDayBlock.changeoverMoldData) {
        // Mark the original block as having changeover (orange/amber it)
        const updatedSingleDayBlock = { ...singleDayBlock, color: changeoverColor };
        blocksToSave[0] = updatedSingleDayBlock;
        
        // Create changeover block below (on next day) - use line's normal color, not amber
        const line = lines.find(l => l.id === singleDayBlock.lineId);
        const changeoverBlock: ProductionBlock = {
          id: `changeover-${singleDayBlock.id}-${Date.now()}`,
          lineId: singleDayBlock.lineId,
          startDay: singleDayBlock.startDay + 1,
          endDay: singleDayBlock.startDay + 1,
          label: singleDayBlock.changeoverMoldData.mold_name,
          color: (lineDefaultColors[singleDayBlock.lineId] || line?.color || '#E0F2FE').toUpperCase(),
          duration: 1,
          moldId: singleDayBlock.changeoverMoldId,
          moldData: singleDayBlock.changeoverMoldData,
          isChangeoverBlock: true,
          productColors: singleDayBlock.productColors ? [...singleDayBlock.productColors] : [],
        };
        
        // Check if changeover block can be placed
        const changeoverOverlap = checkOverlaps(changeoverBlock);
        const changeoverConflict = checkMoldConflict(changeoverBlock);
        
        if (!changeoverOverlap && !changeoverConflict) {
          blocksToSave.push(changeoverBlock);
        }
      }
      
      // Save all blocks to database FIRST
      try {
        console.log('💾 Saving', blocksToSave.length, 'updated block(s) to database...');
        await Promise.all(blocksToSave.map(block => saveBlockToDatabase(block)));
        console.log('✅ All blocks saved successfully');
      } catch (error) {
        console.error('❌ Failed to save block to database:', error);
        alert('Failed to save block to database. Please try again.');
        return;
      }
      
      // Update existing block and detect changeovers AFTER saving
      setBlocks(prev => {
        // Remove old changeover blocks for this block
        const blocksWithoutOldChangeovers = prev.filter(block => 
          !block.id.startsWith(`changeover-${updatedBlock.id}-`)
        );
        
        let updatedBlocks = blocksWithoutOldChangeovers.map(block => 
          block.id === updatedBlock.id ? blocksToSave[0] : block
        );
        
        // Add any new changeover blocks
        if (blocksToSave.length > 1) {
          updatedBlocks.push(...blocksToSave.slice(1));
        }
        
        return detectChangeovers(updatedBlocks);
      });
      }
    }
    
    if (updatedBlock.color) {
      const normalizedColor = updatedBlock.color.toUpperCase();
      setLineDefaultColors(prev => ({
        ...prev,
        [updatedBlock.lineId]: normalizedColor
      }));
    }
    
    setEditingBlock(null);
  }, [checkOverlaps, checkMoldConflict, blocks, detectChangeovers, lines, lineDefaultColors, saveBlockToDatabase]);

  // Delete block
  const deleteBlock = useCallback(async (blockId: string) => {
    try {
      // Delete from database first
      await productionBlockAPI.delete(blockId);
      console.log('✅ Deleted block from database:', blockId);
      
      // Update local state
      setBlocks(prev => {
        const filteredBlocks = prev.filter(block => block.id !== blockId);
        return detectChangeovers(filteredBlocks);
      });
      setEditingBlock(null);
    } catch (error) {
      console.error('❌ Failed to delete block from database:', error);
      alert('Failed to delete block from database. Please try again.');
    }
  }, [detectChangeovers]);

  // Cancel editing (close modal without saving)
  const cancelEditing = useCallback(() => {
    setEditingBlock(null);
  }, []);

  // Toggle line status
  const toggleLineStatus = useCallback((lineId: string) => {
    setLines(prev => prev.map(line => 
      line.id === lineId ? { ...line, isActive: !line.isActive } : line
    ));
  }, []);

  // Add new line
  const addLine = useCallback(async () => {
    try {
      // This would typically open a modal to create a new line
      // For now, we'll just show a message
      alert('To add a new line, please use the Line Master module to create it first, then refresh this page.');
    } catch (error) {
      console.error('Failed to add line:', error);
    }
  }, []);

  // Navigation
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  const days = getDisplayDays();

  // Show loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading production lines and molds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Controls */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Prod Planner</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-semibold min-w-[200px] text-center">
                {zoomLevel === 'week' 
                  ? `Week ${currentWeek} - ${getMonthName(currentMonth)}`
                  : getMonthName(currentMonth)
                }
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              {zoomLevel === 'week' && (
                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                    disabled={currentWeek <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">Week {currentWeek}</span>
                  <button
                    onClick={() => setCurrentWeek(Math.min(5, currentWeek + 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                    disabled={currentWeek >= 5}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600 mr-4">
              {lines.length} lines ({lines.filter(l => getLineStatus(l).status === 'active').length} active, {lines.filter(l => getLineStatus(l).status === 'maintenance').length} maintenance), {molds.length} molds loaded
            </div>
            
            <button
              onClick={() => {
                setZoomLevel(zoomLevel === 'month' ? 'week' : 'month');
                if (zoomLevel === 'month') {
                  setCurrentWeek(1); // Reset to first week when switching to week view
                }
              }}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                zoomLevel === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {zoomLevel === 'month' ? <ZoomIn className="w-4 h-4" /> : <ZoomOut className="w-4 h-4" />}
              <span>{zoomLevel === 'month' ? 'Week View' : 'Month View'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-white">
        <div className="shadow-inner" style={{ width: `${80 + lineColumnWidths.reduce((sum, width) => sum + width, 0)}px` }}>
          {/* Timeline Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 z-10 shadow-sm">
            <div className="flex">
              <div className="w-20 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 border-r-2 border-blue-200 p-1 flex-shrink-0 flex items-center justify-center">
                <span className="font-bold text-blue-800 text-[10px] uppercase tracking-wide">Dates</span>
              </div>
              <div className="flex">
                {lines.map((line, lineIndex) => (
                  <div
                    key={line.id}
                    className={`border-r border-blue-200 p-2 text-center text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isDragging && selectedBlock && selectedBlock.lineId === line.id
                        ? 'bg-blue-200 text-blue-800 font-bold shadow-md' 
                        : 'text-gray-700 hover:bg-blue-50'
                    } ${line.grinding ? 'border-t-[2px] border-t-[#FF6B35]' : ''}`}
                    style={{ width: `${lineColumnWidths[lineIndex] || 100}px`, flexShrink: 0 }}
                  onClick={() => toggleLineStatus(line.id)}
                  title="Click to toggle line status"
                >
                    <div className="flex flex-col items-center">
                          <span className={`font-semibold text-sm truncate ${
                            (() => {
                              const lineStatus = getLineStatus(line);
                              switch (lineStatus.status) {
                                case 'active':
                              return 'text-green-700';
                                case 'maintenance':
                              return 'text-orange-700';
                                case 'inactive':
                                default:
                                  return 'text-gray-500';
                              }
                            })()
                          }`}>
                            {line.name}
                          </span>
                      <span 
                        className="text-xs text-gray-400 cursor-pointer hover:text-blue-600 transition-colors"
                        data-info-icon
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hoveredLine?.id === line.id) {
                            setHoveredLine(null);
                          } else {
                            setHoveredLine(line);
                            setLineTooltipPosition({ x: e.clientX, y: e.clientY });
                          }
                        }}
                        title={`Click to view machine status${line.grinding ? ' | Grinding Available' : ''}`}
                      >
                        ⓘ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
                        </div>
                </div>

          {/* Grid Content */}
          <div ref={gridRef} className="relative" style={{ height: `${days.length * 48}px` }}>
            {days.map((day, dayIndex) => {
              const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const isSunday = dayDate.getDay() === 0;
              return (
              <div key={day} className={`flex border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 h-12 ${
                lines.some(line => line.grinding) ? '' : ''
              }`}>
                {/* Date Info */}
                <div 
                  className={`w-20 h-12 flex-shrink-0 border-r-2 border-gray-200 p-1 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all duration-200 ${
                    isSunday ? 'bg-gray-300' : 'bg-gradient-to-r from-gray-50 to-slate-50'
                  } ${
                    expandedDay === day ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle expansion for this day
                    if (expandedDay === day) {
                      setExpandedDay(null);
                    } else {
                      setExpandedDay(day);
                    }
                  }}
                >
                  <span className="text-[15px] font-semibold leading-tight">{day} Nov</span>
                  <span className="text-[11px] text-gray-400 leading-tight">
                    {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  {expandedDay === day && (
                    <span className="text-[8px] text-blue-600 font-bold mt-0.5">▼</span>
                  )}
                </div>

                {/* Line columns */}
                <div className="relative flex-1" style={{ width: `${lineColumnWidths.reduce((sum: number, width: number) => sum + width, 0)}px` }}>
                  <div className="flex h-full">
                    {lines.map((line, lineIndex) => (
                      <div
                        key={line.id}
                        className={`h-full border-r border-gray-200 cursor-pointer transition-colors relative ${
                          (() => {
                            // Check if this cell is in the selected range
                            if (selectedCellRange && selectedCellRange.lineId === line.id) {
                              if (day >= selectedCellRange.startDay && day <= selectedCellRange.endDay) {
                                return 'bg-blue-200 ring-2 ring-blue-400';
                              }
                            }
                            // Check if this is the selected cell
                            if (selectedCell?.day === day && selectedCell?.lineId === line.id) {
                              return 'bg-blue-200 ring-2 ring-blue-400';
                            }
                            // Default styling
                            if (getChangeoverDay(line.id) === day) {
                              return 'bg-yellow-50 hover:bg-yellow-100';
                            }
                            return 'hover:bg-blue-50';
                          })()
                        }`}
                        style={{ width: `${lineColumnWidths[lineIndex] || 100}px`, flexShrink: 0 }}
                        onClick={(e) => {
                          // Single click - select cell
                          e.stopPropagation();
                          
                          if (e.shiftKey && selectedCell && selectedCell.lineId === line.id) {
                            // Shift + click: extend selection range on the same line
                            let anchorDay: number;
                            if (selectedCellRange && selectedCellRange.lineId === line.id) {
                              // If we already have a range on this line, use its startDay as anchor
                              anchorDay = selectedCellRange.startDay;
                            } else {
                              // First time creating a range - use the current selectedCell as anchor
                              anchorDay = selectedCell.day;
                              setRangeAnchor({ day: anchorDay, lineId: line.id });
                            }
                            const startDay = Math.min(anchorDay, day);
                            const endDay = Math.max(anchorDay, day);
                            setSelectedCellRange({ startDay, endDay, lineId: line.id });
                            setSelectedCell({ day, lineId: line.id });
                            
                            // Select block in the clicked cell if exists
                            const blockInCell = blocks.find(b => b.lineId === line.id && b.startDay === day);
                            if (blockInCell) {
                              setSelectedBlock(blockInCell);
                            } else {
                              setSelectedBlock(null);
                            }
                          } else {
                            // Regular click: select single cell
                            setSelectedCell({ day, lineId: line.id });
                            setSelectedCellRange(null);
                            setRangeAnchor(null); // Clear anchor on regular click
                            // Find block in this cell if any
                            const blockInCell = blocks.find(b => b.lineId === line.id && b.startDay === day);
                            if (blockInCell) {
                              setSelectedBlock(blockInCell);
                            } else {
                              setSelectedBlock(null);
                            }
                          }
                        }}
                        onDoubleClick={(e) => {
                          // Double click - open modal (create or edit)
                          e.stopPropagation();
                          const blockInCell = blocks.find(b => b.lineId === line.id && b.startDay === day);
                          if (blockInCell) {
                            setEditingBlock(blockInCell);
                          } else {
                            createBlock(line.id, day);
                          }
                        }}
                        onMouseEnter={(e) => {
                          setHoveredDay({ day, lineId: line.id });
                          startTooltipDelay(e);
                        }}
                        onMouseMove={(e) => {
                          if (hoveredDay?.day === day && hoveredDay?.lineId === line.id) {
                            setTooltipPosition({ x: e.clientX, y: e.clientY });
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredDay(null);
                          clearTooltipDelay();
                        }}
                      >
                        {/* Changeover indicator - show gap indicator if there's a changeover on this day */}
                        {getChangeoverDay(line.id) === day && (() => {
                          const lineBlocks = blocks.filter(b => b.lineId === line.id);
                          const blockEnding = lineBlocks.find(b => b.endDay === day);
                          const blockStarting = lineBlocks.find(b => b.startDay === day && b.id !== blockEnding?.id);
                          
                          if (blockEnding && blockStarting) {
                            return (
                              <div className="absolute inset-0 bg-yellow-400 bg-opacity-20 border-t-2 border-b-2 border-yellow-400 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-yellow-700 bg-yellow-200 px-1 rounded">CH</span>
                          </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              );
            })}

            {/* Production Blocks - positioned absolutely over the grid */}
            {blocks.map(block => {
              // Use selectedBlock position if this block is being dragged
              const displayBlock = isDragging && selectedBlock?.id === block.id ? selectedBlock : block;
              const overlappingBlocks = getOverlappingBlocks(displayBlock);
                      const hasOverlap = overlappingBlocks.length > 0;
              const lineIndex = lines.findIndex(l => l.id === displayBlock.lineId);
              
              // Get color - only blocks WITH changeover (not changeover blocks themselves) use orange/amber
              const changeoverColor = '#FFB84D'; // Light orange/amber color for blocks with changeover
              let blockColor = displayBlock.color;
              
              // Only blocks with changeover functionality (not the changeover block itself) use orange/amber
              if (displayBlock.changeoverTime && displayBlock.changeoverTime > 0 && !displayBlock.isChangeoverBlock) {
                blockColor = changeoverColor;
              } else if (lineIndex >= 0 && !displayBlock.color) {
                // Fallback to line color if no block color set
                blockColor = lines[lineIndex].color;
              }
                      
                      return (
                        <div
                          key={block.id}
                          ref={el => { blockRefs.current[block.id] = el; }}
                  className={`absolute rounded-lg shadow-lg border-2 cursor-move hover:shadow-xl transition-all duration-200 ${
                            hasOverlap ? 'ring-2 ring-red-400 ring-opacity-75 border-red-300' : 
                    displayBlock.isChangeover ? 'ring-2 ring-yellow-400 ring-opacity-70 border-yellow-300' : 'border-gray-300'
                  } ${isDragging && selectedBlock?.id === block.id ? 'opacity-50' : ''}`}
                          style={{
                    ...getBlockStyle(displayBlock, days, lineIndex >= 0 ? lineIndex : 0, blockColor),
                            transform: hoveredBlock?.id === block.id ? 'scale(1.01)' : 'scale(1)',
                    zIndex: isDragging && selectedBlock?.id === block.id ? 1000 : 1,
                  }}
                  onMouseDown={(e) => {
                    // Don't start drag if clicking on resize handles (they have their own handlers)
                    if ((e.target as HTMLElement).closest('.resize-handle-right')) {
                      return;
                    }
                    
                    // Clicking anywhere else on the block (center, sides) - pick it up immediately
                    e.preventDefault();
                      e.stopPropagation();
                      setSelectedCell({ day: block.startDay, lineId: block.lineId });
                      setSelectedBlock({ ...block });
                      handleDragStart(e, block);
                  }}
                  onDoubleClick={(e) => {
                    // Double click - open modal
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedCell({ day: block.startDay, lineId: block.lineId });
                    // Initialize changeover time mode if not set
                    if (block.changeoverTimeMode) {
                      setChangeoverTimeMode(block.changeoverTimeMode);
                    }
                    setEditingBlock(block);
                  }}
                          onMouseEnter={(e) => {
                    if (!isDragging) {
                            setHoveredBlock(block);
                            startTooltipDelay(e);
                    }
                          }}
                          onMouseMove={(e) => {
                    if (!isDragging && hoveredBlock?.id === block.id) {
                              setTooltipPosition({ x: e.clientX, y: e.clientY });
                            }
                          }}
                          onMouseLeave={() => {
                    if (!isDragging) {
                            setHoveredBlock(null);
                            clearTooltipDelay();
                    }
                  }}
                >
                  {/* Block Background - Single day block */}
                  <div className="absolute inset-0 rounded-lg border border-gray-300 shadow-sm" style={{ backgroundColor: blockColor }}>
                    {/* Color Segments for this day */}
                    {displayBlock.colorSegments && displayBlock.colorSegments.length > 0 && (() => {
                      return displayBlock.colorSegments
                        .filter(segment => {
                          const segmentStartDay = displayBlock.startDay + (segment.startDay || 0);
                          const segmentEndDay = displayBlock.startDay + (segment.endDay || 0);
                          return displayBlock.startDay >= segmentStartDay && displayBlock.startDay <= segmentEndDay;
                        })
                        .map((segment, idx) => (
                          <div
                            key={`segment-${idx}`}
                            className="absolute inset-0 rounded-lg"
                            style={{ backgroundColor: segment.color }}
                          />
                        ));
                    })()}
                  </div>
                  
                  {/* Block Content */}
                  <div className={`absolute inset-0 z-20 flex items-center ${
                    displayBlock.isChangeover && !hasOverlap ? 'pl-6 pr-3' : 'px-3'
                          }`}>
                            <div className="flex-1">
                      {displayBlock.changeoverTime && displayBlock.changeoverTime > 0 && displayBlock.changeoverMoldData && !displayBlock.isChangeoverBlock ? (
                        <div className={`text-sm font-semibold ${
                          isDarkColor(displayBlock.color || '#FFFFFF') 
                            ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                            : 'text-gray-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
                        }`}>
                          <div>{displayBlock.label} //</div>
                          <div>{displayBlock.changeoverMoldData.mold_name}</div>
                        </div>
                      ) : (
                        <span className={`text-sm font-semibold break-words ${
                          isDarkColor(displayBlock.color || '#FFFFFF') 
                            ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                            : 'text-gray-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
                        }`}>
                          {displayBlock.label}
                        </span>
                      )}
                      {/* Show colors if multiple segments */}
                      {displayBlock.colorSegments && displayBlock.colorSegments.length > 1 && (
                        <div className={`text-[10px] opacity-90 mt-0.5 ${
                          isDarkColor(displayBlock.color || '#FFFFFF')
                            ? 'text-white/90'
                            : 'text-gray-600'
                        }`}>
                          {displayBlock.colorSegments.map(seg => seg.label || seg.color).join(' • ')}
                        </div>
                      )}
                            </div>
                            {hasOverlap && (
                      <AlertTriangle className="w-4 h-4 text-red-500 drop-shadow-sm ml-2 flex-shrink-0" />
                            )}
                    {displayBlock.isChangeover && !hasOverlap && (
                      <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                                <span className="text-xs font-bold text-yellow-900">C</span>
                              </div>
                            )}
                          </div>
                          
                  {/* Bottom resize handle - drag to extend mold downward */}
                  {!isDragging && !isDraggingBlock && (
                                  <div 
                      className="absolute left-0 bottom-0 h-3 w-full cursor-ns-resize resize-handle-right z-30"
                      style={{
                        borderBottom: '1px solid rgba(0, 0, 0, 0.15)'
                      }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setIsDraggingBlock(true);
                        setDragStartPosition({ x: e.clientX, y: e.clientY, day: displayBlock.endDay });
                        setSelectedBlock({ ...displayBlock, isResizingLeft: false });
                        setOriginalBlockPosition({ 
                          startDay: displayBlock.startDay, 
                          endDay: displayBlock.endDay, 
                          lineId: displayBlock.lineId 
                        });
                      }}
                      title="Drag to extend mold"
                                  />
                                )}
                          
                          {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black opacity-20 rounded-lg pointer-events-none" />
                        </div>
                      );
                    })}
                </div>
              </div>
          </div>

      {/* Expanded Day Section - shows 4 fields for each line */}
      {expandedDay !== null && (
        <div className="w-full border-t-4 border-blue-400 bg-white shadow-lg">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Day {expandedDay} - Production Details
              </h3>
              <button
                onClick={() => setExpandedDay(null)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
        </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]" rowSpan={2}>Line</th>
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]" colSpan={4}>Product</th>
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]" colSpan={2}>Changeover</th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]">Mold</th>
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]">Party</th>
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]">Color</th>
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]">Quantity</th>
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]">Mold</th>
                    <th className="border border-gray-300 p-2 text-center font-semibold text-[15px]">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.flatMap((line) => {
                    // Find the block for this line on the expanded day
                    const block = blocks.find(b => 
                      b.lineId === line.id && 
                      b.startDay <= expandedDay && 
                      b.endDay >= expandedDay &&
                      !b.isChangeoverBlock // Don't show changeover blocks in the main table
                    );
                    
                    // Get product colors from block
                    const productColors = block?.productColors || [];
                    
                    // If no block exists, show empty row
                    if (!block) {
                      return [
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-2 font-medium text-[15px] text-center">{line.name}</td>
                          <td className="border border-gray-300 p-2 text-gray-400 text-[15px] text-center">-</td>
                          <td className="border border-gray-300 p-2 text-gray-400 text-[15px] text-center">-</td>
                          <td className="border border-gray-300 p-2 text-gray-400 text-[15px] text-center">-</td>
                          <td className="border border-gray-300 p-2 text-gray-400 text-[15px] text-center">-</td>
                          <td className="border border-gray-300 p-2 text-gray-400 text-[15px] text-center">-</td>
                          <td className="border border-gray-300 p-2 text-gray-400 text-[15px] text-center">-</td>
                        </tr>
                      ];
                    }
                    
                    // Calculate max rows needed (for multiple colors)
                    const maxRows = Math.max(1, productColors.length);
                    
                    // Get mold name from block
                    const moldName = block?.moldData?.mold_name || block?.label || '-';
                    
                    // Convert changeover time to HH:MM format
                    const changeoverTimeDisplay = block?.changeoverTimeString || 
                      (block?.changeoverTime ? (() => {
                        const hours = Math.floor(block.changeoverTime / 60);
                        const minutes = block.changeoverTime % 60;
                        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                      })() : '');
                    
                    // Get changeover mold name
                    const changeoverMoldName = block?.changeoverMoldData?.mold_name || '';
                    
                    return Array.from({ length: maxRows }).map((_, rowIndex) => {
                      const productColor = productColors[rowIndex] || productColors[0];
                      
                      return (
                        <tr key={`${line.id}-${rowIndex}`} className="hover:bg-gray-50">
                          {rowIndex === 0 && (
                            <td className="border border-gray-300 p-2 font-medium text-[15px] text-center" rowSpan={maxRows}>
                              {line.name}
                            </td>
                          )}
                          {rowIndex === 0 && (
                            <td className="border border-gray-300 p-2 text-center" rowSpan={maxRows}>
                              <span className="text-[15px] font-medium">{moldName}</span>
                            </td>
                          )}
                          <td className="border border-gray-300 p-2 text-center">
                            {productColor?.partyCode ? (
                              <span className="text-[15px] font-medium">{productColor.partyCode}</span>
                            ) : (
                              <span className="text-gray-400 text-[15px]">-</span>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            {productColor ? (
                              <span className="text-[15px] font-medium">{productColor.color || 'N/A'}</span>
                            ) : (
                              <span className="text-gray-400 text-[15px]">-</span>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            {productColor ? (
                              <span className="text-[15px]">{productColor.quantity.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-400 text-[15px]">-</span>
                            )}
                          </td>
                          {rowIndex === 0 && (
                            <>
                              <td className="border border-gray-300 p-2 text-center" rowSpan={maxRows}>
                                <span className="text-[15px]">{changeoverMoldName || '-'}</span>
                              </td>
                              <td className="border border-gray-300 p-2 text-center" rowSpan={maxRows}>
                                <span className="text-[15px]">{changeoverTimeDisplay || '-'}</span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
          </div>
            
            <div className="mt-4 flex justify-between items-start gap-4">
              {/* Bottom Right Log Format */}
              <div className="flex-1"></div>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 min-w-[400px]">
                <h4 className="font-semibold text-[15px] mb-3">Log Entries</h4>
                <div className="space-y-3">
                  {/* Entry 1: Date Time Color Qty */}
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold">①</span>
                    <input
                      type="date"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Date"
                    />
                    <input
                      type="time"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Time"
                    />
                    <input
                      type="text"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Color"
                    />
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Qty"
                    />
                  </div>
                  
                  {/* Entry 2: Date Time Packing Material Qty */}
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold">②</span>
                    <input
                      type="date"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Date"
                    />
                    <input
                      type="time"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Time"
                    />
                    <select className="w-32 px-2 py-1 border border-gray-300 rounded text-[15px]">
                      <option value="">Packing Material</option>
                      {packingMaterials.map(pm => (
                        <option key={pm.id} value={pm.id}>
                          {pm.item_code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Qty"
                    />
                  </div>
                  
                  {/* Entry 3: Date Time Changeover New Mold Name */}
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold">③</span>
                    <input
                      type="date"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Date"
                    />
                    <input
                      type="time"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="Time"
                    />
                    <span className="text-[13px] text-gray-600">Changeover</span>
                    <input
                      type="text"
                      className="w-32 px-2 py-1 border border-gray-300 rounded text-[15px]"
                      placeholder="New Mold Name"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setExpandedDay(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save the data (you can add save logic here)
                    console.log('Saving day data:', dayLineData);
                    setExpandedDay(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag Preview */}
      {dragPreview && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
          }}
        >
          <div className="bg-blue-500 text-white text-sm font-semibold px-3 py-2 rounded-lg shadow-2xl border-2 border-white opacity-90">
            {dragPreview.block.label}
          </div>
        </div>
      )}

      {/* Block Editor Modal */}
      {editingBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Production Block</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={editingBlock.label}
                  onChange={(e) => setEditingBlock({...editingBlock, label: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mold <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingBlock.moldId || ''}
                  onChange={(e) => {
                    const selectedMold = molds.find(m => m.mold_id === e.target.value);
                    setEditingBlock({
                      ...editingBlock, 
                      moldId: e.target.value,
                      moldData: selectedMold,
                      label: selectedMold ? selectedMold.mold_name : editingBlock.label
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a mold...</option>
                  {molds.map(mold => {
                    // Check if this mold is already used anywhere (not just same line)
                    const isUsed = blocks.some(block => 
                      block.id !== editingBlock.id && 
                      block.moldId === mold.mold_id
                    );
                    
                    // Check if it's used on the same line specifically
                    const isUsedOnSameLine = blocks.some(block => 
                      block.id !== editingBlock.id && 
                      block.lineId === editingBlock.lineId && 
                      block.moldId === mold.mold_id
                    );
                    
                    return (
                      <option 
                        key={mold.mold_id} 
                        value={mold.mold_id}
                        disabled={isUsed}
                      >
                        {mold.mold_id.replace('MOLD-', '')} - {mold.mold_name} {
                          isUsedOnSameLine ? '(Already used on this line)' : 
                          isUsed ? '(Used on another line)' : ''
                        }
                      </option>
                    );
                  })}
                </select>
                {!editingBlock.moldId && (
                  <p className="text-red-500 text-xs mt-1">Please select a mold to continue</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editingBlock.startDay || ''}
                    onChange={(e) => {
                      const startDay = parseInt(e.target.value) || 1;
                      const duration = editingBlock.duration || 1;
                      setEditingBlock({
                        ...editingBlock, 
                        startDay, 
                        endDay: startDay + duration - 1
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editingBlock.duration || ''}
                    onChange={(e) => {
                      const duration = parseInt(e.target.value) || 1;
                      const startDay = editingBlock.startDay || 1;
                      setEditingBlock({
                        ...editingBlock, 
                        duration,
                        endDay: startDay + duration - 1
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Block Color
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div 
                      data-color-picker
                      className="h-12 w-16 rounded-lg border-2 border-gray-300 cursor-pointer flex items-center justify-center shadow-sm hover:shadow-md hover:border-blue-400 transition-all relative group"
                      style={{ backgroundColor: editingBlock.color || '#FFFFFF' }}
                      onClick={() => {
                        if (!showColorPicker) {
                          // Initialize HSL when opening picker
                          const currentColor = editingBlock.color || '#E0F2FE';
                          const rgb = hexToRgb(currentColor);
                          if (rgb) {
                            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                            colorPickerHslRef.current = hsl;
                            setColorPickerHsl(hsl);
                          }
                        }
                        setShowColorPicker(!showColorPicker);
                      }}
                      title="Click to pick a color"
                    >
                      {!editingBlock.color || editingBlock.color === '#FFFFFF' ? (
                        <span className="text-2xl font-bold text-gray-400 group-hover:text-gray-600">+</span>
                      ) : null}
                      {showColorPicker && (
                        <div 
                          data-color-picker 
                          className="absolute top-14 left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Color preview and hex input */}
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className="w-12 h-12 rounded border-2 border-gray-300"
                              style={{ backgroundColor: editingBlock.color || '#E0F2FE' }}
                            />
                          <input
                              type="text"
                              value={(editingBlock.color || '#E0F2FE').toUpperCase()}
                            onChange={(e) => {
                              const newColor = e.target.value;
                                if (/^#[0-9A-F]{6}$/i.test(newColor)) {
                              if (!isGrayColor(newColor)) {
                                    applyColorToEditingBlock(newColor.toUpperCase());
                              } else {
                                alert('Gray colors are not allowed. Please choose a different color.');
                              }
                                }
                            }}
                              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                              placeholder="#FFFFFF"
                            />
                          </div>
                            
                          {/* Color Palette */}
                          <div className="border-t border-gray-200 pt-3">
                            <div className="text-xs font-semibold text-gray-700 mb-2">Color Palette:</div>
                            <div className="max-h-64 overflow-y-auto pr-1">
                              <div className="grid grid-cols-8 gap-1.5">
                                {colorPalette.map((color) => (
                                  <button
                                    key={color.hex}
                                    type="button"
                                    className="w-7 h-7 rounded border border-gray-300 hover:scale-110 hover:shadow-md transition-all"
                                    style={{ backgroundColor: color.hex }}
                                    onClick={() => {
                                      applyColorToEditingBlock(color.hex.toUpperCase());
                                      setShowColorPicker(false);
                                    }}
                                    title={color.hex}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editingBlock.color || ''}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        if (newColor === '' || (!isGrayColor(newColor) && /^#[0-9A-F]{6}$/i.test(newColor))) {
                          applyColorToEditingBlock(newColor);
                        } else if (isGrayColor(newColor)) {
                          alert('Gray colors are not allowed. Please choose a different color.');
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#FFFFFF"
                      pattern="^#[0-9A-F]{6}$"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter hex color code (e.g., #FF5733) or click the swatch to pick</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Party Codes & Product Colors
                </label>
                
                <div className="space-y-3">
                  {/* Group colors by party for uniform display */}
                  {(() => {
                    // Group colors by party code
                    const groupedByParty: Record<string, { colors: ProductColor[], indices: number[] }> = {};
                    const colorsWithoutParty: { color: ProductColor, index: number }[] = [];
                    
                    (editingBlock.productColors || []).forEach((pc, index) => {
                      if (pc.partyCode) {
                        if (!groupedByParty[pc.partyCode]) {
                          groupedByParty[pc.partyCode] = { colors: [], indices: [] };
                        }
                        groupedByParty[pc.partyCode].colors.push(pc);
                        groupedByParty[pc.partyCode].indices.push(index);
                      } else {
                        colorsWithoutParty.push({ color: pc, index });
                      }
                    });
                    
                    // Get all party codes
                    const allPartyCodes = Object.keys(groupedByParty);
                    const hasNoData = allPartyCodes.length === 0 && colorsWithoutParty.length === 0;
                    
                    return (
                      <>
                        {/* Party rows with colors */}
                        {allPartyCodes.map((partyCode) => {
                          const partyData = groupedByParty[partyCode];
                          const availableColors = availableColorsForParty[partyCode]
                            ? availableColorsForParty[partyCode].map(cl => cl.color_label)
                            : colorLabels.map(cl => cl.color_label);
                          
                          return (
                            <div key={partyCode} className="border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2">
                              {partyData.colors.map((productColor, colorIdx) => {
                                const actualIndex = partyData.indices[colorIdx];
                                const isFirstColor = colorIdx === 0;
                                
                                return (
                                  <div key={colorIdx} className="flex items-center gap-2">
                                    {/* Party Name - only on first row */}
                                    {isFirstColor && (
                                      <select
                                        value={partyCode}
                                        onChange={async (e) => {
                                          const newPartyCode = e.target.value;
                                          
                                          // Load colors for new party
                                          if (newPartyCode && !availableColorsForParty[newPartyCode]) {
                                            try {
                                              const partyColors = await colorLabelAPI.getColorsForParty(newPartyCode);
                                              setAvailableColorsForParty(prev => ({
                                                ...prev,
                                                [newPartyCode]: partyColors
                                              }));
                                            } catch (error) {
                                              console.error(`Error fetching colors for party ${newPartyCode}:`, error);
                                              setAvailableColorsForParty(prev => ({
                                                ...prev,
                                                [newPartyCode]: colorLabels
                                              }));
                                            }
                                          }
                                          
                                          // Update all colors for this party
                                          const updatedColors = (editingBlock.productColors || []).map((pc, idx) => {
                                            if (partyData.indices.includes(idx)) {
                                              return { ...pc, partyCode: newPartyCode };
                                            }
                                            return pc;
                                          });
                                          
                                          // Update partyCodes array
                                          const currentPartyCodes = editingBlock.partyCodes || [];
                                          let newPartyCodes = currentPartyCodes.filter(p => p !== partyCode);
                                          if (newPartyCode && !newPartyCodes.includes(newPartyCode)) {
                                            newPartyCodes.push(newPartyCode);
                                          }
                                          
                                          setEditingBlock({
                                            ...editingBlock,
                                            partyCodes: newPartyCodes,
                                            productColors: updatedColors
                                          });
                                        }}
                                        className="w-32 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      >
                                        <option value="">Select party...</option>
                                        {partyNames.map(party => (
                                          <option key={party.id} value={party.name}>
                                            {party.name}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    
                                    {/* Spacer for non-first rows */}
                                    {!isFirstColor && <div className="w-32"></div>}
                                    
                                    {/* Color Dropdown */}
                                    <select
                                      value={productColor.color || ''}
                                      onChange={(e) => {
                                        const newProductColors = [...(editingBlock.productColors || [])];
                                        newProductColors[actualIndex].color = e.target.value;
                                        setEditingBlock({...editingBlock, productColors: newProductColors});
                                      }}
                                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="">Select color...</option>
                                      {availableColors.map(color => (
                                        <option key={color} value={color}>{color}</option>
                                      ))}
                                    </select>
                                    
                                    {/* Quantity Input */}
                                    <input
                                      type="number"
                                      placeholder="Qty"
                                      min="0"
                                      value={productColor.quantity === 0 ? '' : productColor.quantity}
                                      onChange={(e) => {
                                        const newProductColors = [...(editingBlock.productColors || [])];
                                        const value = e.target.value;
                                        newProductColors[actualIndex].quantity = value === '' ? 0 : (parseInt(value) || 0);
                                        setEditingBlock({...editingBlock, productColors: newProductColors});
                                      }}
                                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    
                                    {/* Add Color Button - only on first row */}
                                    {isFirstColor && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newProductColors = [
                                            ...(editingBlock.productColors || []),
                                            { color: '', quantity: 0, partyCode: partyCode }
                                          ];
                                          setEditingBlock({...editingBlock, productColors: newProductColors});
                                        }}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                                      >
                                        + Add Color
                                      </button>
                                    )}
                                    
                                    {/* Spacer for non-first rows */}
                                    {!isFirstColor && <div className="w-28"></div>}
                                    
                                    {/* Remove Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newProductColors = (editingBlock.productColors || []).filter((_, i) => i !== actualIndex);
                                        setEditingBlock({...editingBlock, productColors: newProductColors});
                                      }}
                                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                                      title="Remove"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                        
                        {/* Colors without party code - these become new party rows when party is selected */}
                        {colorsWithoutParty.length > 0 && (
                          <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2">
                            <div className="text-xs text-gray-500 mb-1">New Party Row (select party first, then color)</div>
                            {colorsWithoutParty.map(({ color: productColor, index: actualIndex }, colorIdx) => {
                              const isFirstColor = colorIdx === 0;
                              // Get selected party for this color entry
                              const selectedParty = productColor.partyCode;
                              // Get available colors based on selected party (if any)
                              const allAvailableColors = selectedParty && availableColorsForParty[selectedParty]
                                ? availableColorsForParty[selectedParty].map(cl => cl.color_label)
                                : selectedParty
                                  ? colorLabels.map(cl => cl.color_label)
                                  : [];
                              
                              return (
                                <div key={colorIdx} className="flex items-center gap-2">
                                  {/* Party selector - only on first row of colorsWithoutParty */}
                                  {isFirstColor && (
                                    <select
                                      value={selectedParty || ""}
                                      onChange={async (e) => {
                                        const newPartyCode = e.target.value;
                                        if (newPartyCode === "No Party") {
                                          // Explicitly set to no party (undefined) - "No Party" is a database entry
                                          const updatedColors = (editingBlock.productColors || []).map((pc, idx) => {
                                            if (colorsWithoutParty.some(c => c.index === idx)) {
                                              return { ...pc, partyCode: undefined };
                                            }
                                            return pc;
                                          });
                                          
                                          // Remove "No Party" from partyCodes array if it exists
                                          const currentPartyCodes = editingBlock.partyCodes || [];
                                          const newPartyCodes = currentPartyCodes.filter(p => p !== "No Party");
                                          
                                          setEditingBlock({
                                            ...editingBlock,
                                            partyCodes: newPartyCodes,
                                            productColors: updatedColors
                                          });
                                        } else if (newPartyCode) {
                                          // Load colors for new party
                                          if (!availableColorsForParty[newPartyCode]) {
                                            try {
                                              const partyColors = await colorLabelAPI.getColorsForParty(newPartyCode);
                                              setAvailableColorsForParty(prev => ({
                                                ...prev,
                                                [newPartyCode]: partyColors
                                              }));
                                            } catch (error) {
                                              console.error(`Error fetching colors for party ${newPartyCode}:`, error);
                                              setAvailableColorsForParty(prev => ({
                                                ...prev,
                                                [newPartyCode]: colorLabels
                                              }));
                                            }
                                          }
                                          
                                          // Update all colors without party to use new party
                                          const updatedColors = (editingBlock.productColors || []).map((pc, idx) => {
                                            if (colorsWithoutParty.some(c => c.index === idx)) {
                                              return { ...pc, partyCode: newPartyCode };
                                            }
                                            return pc;
                                          });
                                          
                                          // Update partyCodes array
                                          const currentPartyCodes = editingBlock.partyCodes || [];
                                          let newPartyCodes = [...currentPartyCodes];
                                          if (!newPartyCodes.includes(newPartyCode)) {
                                            newPartyCodes.push(newPartyCode);
                                          }
                                          
                                          setEditingBlock({
                                            ...editingBlock,
                                            partyCodes: newPartyCodes,
                                            productColors: updatedColors
                                          });
                                        } else {
                                          // Party deselected (empty value) - clear party and color
                                          const updatedColors = (editingBlock.productColors || []).map((pc, idx) => {
                                            if (colorsWithoutParty.some(c => c.index === idx)) {
                                              return { ...pc, partyCode: undefined, color: '' };
                                            }
                                            return pc;
                                          });
                                          
                                          setEditingBlock({
                                            ...editingBlock,
                                            productColors: updatedColors
                                          });
                                        }
                                      }}
                                      className="w-32 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="">Select Party...</option>
                                      {partyNames.map(party => (
                                        <option key={party.id} value={party.name}>
                                          {party.name}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  
                                  {!isFirstColor && <div className="w-32"></div>}
                                  
                                  {/* Color Dropdown - disabled until party is selected */}
                                  <select
                                    value={productColor.color || ''}
                                    onChange={(e) => {
                                      const newProductColors = [...(editingBlock.productColors || [])];
                                      newProductColors[actualIndex].color = e.target.value;
                                      setEditingBlock({...editingBlock, productColors: newProductColors});
                                    }}
                                    disabled={!selectedParty}
                                    className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                      !selectedParty ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''
                                    }`}
                                    title={!selectedParty ? 'Please select a party first' : ''}
                                  >
                                    <option value="">{selectedParty ? 'Select color...' : 'Select party first...'}</option>
                                    {allAvailableColors.map(color => (
                                      <option key={color} value={color}>{color}</option>
                                    ))}
                                  </select>
                                  
                                  {/* Quantity Input */}
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    min="0"
                                    value={productColor.quantity === 0 ? '' : productColor.quantity}
                                    onChange={(e) => {
                                      const newProductColors = [...(editingBlock.productColors || [])];
                                      const value = e.target.value;
                                      newProductColors[actualIndex].quantity = value === '' ? 0 : (parseInt(value) || 0);
                                      setEditingBlock({...editingBlock, productColors: newProductColors});
                                    }}
                                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  
                                  {/* Add Color Button - only on first row */}
                                  {isFirstColor && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newProductColors = [
                                          ...(editingBlock.productColors || []),
                                          { color: '', quantity: 0, partyCode: undefined }
                                        ];
                                        setEditingBlock({...editingBlock, productColors: newProductColors});
                                      }}
                                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                                    >
                                      + Add Color
                                    </button>
                                  )}
                                  
                                  {!isFirstColor && <div className="w-28"></div>}
                                  
                                  {/* Remove Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newProductColors = (editingBlock.productColors || []).filter((_, i) => i !== actualIndex);
                                      setEditingBlock({...editingBlock, productColors: newProductColors});
                                    }}
                                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Initial empty row or Add Party button */}
                        {hasNoData ? (
                          <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <select
                                value=""
                                onChange={async (e) => {
                                  const newPartyCode = e.target.value;
                                  if (newPartyCode) {
                                    // Load colors for new party
                                    if (!availableColorsForParty[newPartyCode]) {
                                      try {
                                        const partyColors = await colorLabelAPI.getColorsForParty(newPartyCode);
                                        setAvailableColorsForParty(prev => ({
                                          ...prev,
                                          [newPartyCode]: partyColors
                                        }));
                                      } catch (error) {
                                        console.error(`Error fetching colors for party ${newPartyCode}:`, error);
                                        setAvailableColorsForParty(prev => ({
                                          ...prev,
                                          [newPartyCode]: colorLabels
                                        }));
                                      }
                                    }
                                    
                                    const newProductColors = [
                                      { color: '', quantity: 0, partyCode: newPartyCode }
                                    ];
                                    
                                    setEditingBlock({
                                      ...editingBlock,
                                      partyCodes: [newPartyCode],
                                      productColors: newProductColors
                                    });
                                  }
                                }}
                                className="w-32 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Party...</option>
                                {partyNames.map(party => (
                                  <option key={party.id} value={party.name}>
                                    {party.name}
                                  </option>
                                ))}
                              </select>
                              
                              <select
                                value=""
                                disabled={true}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-not-allowed opacity-50"
                                title="Please select a party first"
                              >
                                <option value="">Select party first...</option>
                              </select>
                              
                              <input
                                type="number"
                                placeholder="Qty"
                                min="0"
                                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              
                              <button
                                type="button"
                                onClick={() => {
                                  const newProductColors = [
                                    { color: '', quantity: 0, partyCode: undefined }
                                  ];
                                  setEditingBlock({...editingBlock, productColors: newProductColors});
                                }}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                              >
                                + Add Color
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              // Add a new party row - this creates a new entry in colorsWithoutParty
                              // which will show a party selector, allowing user to create a new party group
                              const newProductColors = [
                                ...(editingBlock.productColors || []),
                                { color: '', quantity: 0, partyCode: undefined }
                              ];
                              setEditingBlock({...editingBlock, productColors: newProductColors});
                            }}
                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            + Add Party Row
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Changeover Time
                </label>
                  <input
                    type="time"
                    value={editingBlock.changeoverTimeString || ''}
                    onChange={(e) => {
                      const timeString = e.target.value;
                      // Convert HH:MM to minutes
                      if (timeString) {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        const totalMinutes = hours * 60 + minutes;
                        setEditingBlock({
                          ...editingBlock,
                          changeoverTimeString: timeString,
                          changeoverTime: totalMinutes,
                          changeoverTimeMode: 'time'
                        });
                      } else {
                        setEditingBlock({
                          ...editingBlock,
                          changeoverTimeString: undefined,
                          changeoverTime: undefined,
                          changeoverTimeMode: 'time'
                        });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
              </div>

              {editingBlock.changeoverTime && editingBlock.changeoverTime > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Changeover Mold (will be created below this block)
                  </label>
                  <select
                    value={editingBlock.changeoverMoldId || ''}
                    onChange={(e) => {
                      const selectedMold = molds.find(m => m.mold_id === e.target.value);
                      setEditingBlock({
                        ...editingBlock,
                        changeoverMoldId: e.target.value || undefined,
                        changeoverMoldData: selectedMold
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select changeover mold...</option>
                    {molds.filter(mold => mold.mold_id !== editingBlock.moldId).map(mold => (
                      <option key={mold.mold_id} value={mold.mold_id}>
                        {mold.mold_id.replace('MOLD-', '')} - {mold.mold_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The changeover mold will be created on day {editingBlock.startDay + 1} (next day) in gray color
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editingBlock.notes || ''}
                  onChange={(e) => setEditingBlock({...editingBlock, notes: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingBlock(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteBlock(editingBlock.id)}
                className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
              >
                Delete
              </button>
              <button
                onClick={() => updateBlock(editingBlock)}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Tooltip */}
      {hoveredBlock && showTooltip && (
        <div
          className="fixed z-50 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-sm rounded-xl shadow-2xl p-4 pointer-events-none border border-gray-700"
          style={{
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 15,
          }}
        >
          <div className="font-bold text-white mb-2">{hoveredBlock.moldData?.mold_name || hoveredBlock.label}</div>
          <div className="text-blue-300 text-xs mb-1">
            📅 Days {hoveredBlock.startDay}-{hoveredBlock.endDay} ({hoveredBlock.duration} days)
          </div>
          {hoveredBlock.notes && (
            <div className="text-gray-300 text-xs mt-2 p-2 bg-gray-800 rounded-lg">
              💬 {hoveredBlock.notes}
            </div>
          )}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45 border-l border-t border-gray-700"></div>
        </div>
      )}

      {/* Changeover Day Tooltip */}
      {hoveredDay && getChangeoverDay(hoveredDay.lineId) === hoveredDay.day && showTooltip && (
        <div
          className="fixed z-50 bg-gradient-to-br from-yellow-600 to-yellow-500 text-white text-sm rounded-xl shadow-2xl p-3 pointer-events-none border border-yellow-400"
          style={{
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 15,
          }}
        >
          <div className="font-bold text-white mb-1 flex items-center">
            🔄 Changeover Day {hoveredDay.day}
          </div>
          <div className="text-yellow-100 text-xs">
            One mold ends, another starts on this day
          </div>
          <div className="absolute -top-1 right-4 w-2 h-2 bg-yellow-600 transform rotate-45 border-l border-t border-yellow-400"></div>
        </div>
      )}

      {/* Line Machine Info Tooltip */}
      {hoveredLine && (
        <div
          data-line-tooltip
          className="fixed z-50 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-sm rounded-xl shadow-2xl p-4 border border-gray-700 cursor-pointer"
          style={{
            left: lineTooltipPosition.x + 15,
            top: lineTooltipPosition.y - 15,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setHoveredLine(null);
          }}
        >
          <div className="font-bold text-white mb-2 flex items-center">
            {hoveredLine.name} - Machine Status
          </div>
          <div className="space-y-2">
            {(() => {
              const lineStatus = getLineStatus(hoveredLine);
              const machines = [
                { name: 'IM Machine', id: hoveredLine.im_machine_id },
                { name: 'Robot Machine', id: hoveredLine.robot_machine_id },
                { name: 'Conveyor Machine', id: hoveredLine.conveyor_machine_id },
                { name: 'Hoist Machine', id: hoveredLine.hoist_machine_id }
              ];
              
              return machines.map((machine, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    machine.id ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-gray-300 text-xs">
                    {machine.name}: {machine.id || 'Not assigned'}
                  </span>
                </div>
              ));
            })()}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400">
              Status: <span className={`font-semibold ${
                (() => {
                  const lineStatus = getLineStatus(hoveredLine);
                  switch (lineStatus.status) {
                    case 'active':
                      return 'text-green-400';
                    case 'maintenance':
                      return 'text-orange-400';
                    case 'inactive':
                    default:
                      return 'text-red-400';
                  }
                })()
              }`}>
                {getLineStatus(hoveredLine).status.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {getLineStatus(hoveredLine).reason}
            </div>
          </div>
          {hoveredLine.grinding && (
            <div className="mt-3 pt-2 border-t border-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35]"></div>
                <span className="text-xs text-[#FF6B35] font-semibold">
                  Grinding Available
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                This line supports grinding operations for material processing
              </div>
            </div>
          )}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45 border-l border-t border-gray-700"></div>
        </div>
      )}
    </div>
  );
};

export default ProdPlanner;
