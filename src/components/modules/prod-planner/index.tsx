'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { lineAPI, moldAPI, Line, Mold } from '../../../lib/supabase';

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
}

interface ProductionBlock {
  id: string;
  lineId: string;
  startDay: number;
  endDay: number;
  label: string;
  color: string;
  notes?: string;
  duration: number;
  moldId?: string; // Reference to actual mold
  moldData?: Mold; // Reference to actual mold data
  isResizingLeft?: boolean; // For drag handle logic
  isChangeover?: boolean; // Indicates if this is a changeover day
}

interface ProdPlannerProps {
  // Add any props if needed
}

const ProdPlanner: React.FC<ProdPlannerProps> = () => {
  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [molds, setMolds] = useState<Mold[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<ProductionBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ProductionBlock | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; day: number } | null>(null);
  const [editingBlock, setEditingBlock] = useState<ProductionBlock | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'month' | 'week'>('month');
  const [currentWeek, setCurrentWeek] = useState(1); // Week of the month
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [hoveredBlock, setHoveredBlock] = useState<ProductionBlock | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; day: number } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ day: number; lineId: string } | null>(null);
  const [originalBlockPosition, setOriginalBlockPosition] = useState<{ startDay: number; endDay: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; block: ProductionBlock } | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<ProductionLine | null>(null);
  const [lineTooltipPosition, setLineTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  // Color palette for lines
  const lineColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Test direct database query first
        console.log('🔍 Testing direct database query...');
        const testQuery = await lineAPI.getAll();
        console.log('🔍 Direct query result:', testQuery);
        
        // Fetch lines and molds in parallel
        const [linesData, moldsData] = await Promise.all([
          lineAPI.getAll(),
          moldAPI.getAll()
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
            status: line.status
          };
        });

        setLines(transformedLines);
        setMolds(moldsData);
        
        console.log('✅ Loaded', transformedLines.length, 'lines and', moldsData.length, 'molds');
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

  // Get month name
  const getMonthName = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Calculate block position and width
  const getBlockStyle = useCallback((block: ProductionBlock, displayDays: number[]) => {
    const dayWidth = zoomLevel === 'week' ? 64 : 48; // Width of each day column
    const margin = 2; // Small margin to prevent touching grid lines
    const dayIndex = displayDays.findIndex(day => day === block.startDay);
    const left = dayIndex >= 0 ? dayIndex * dayWidth + margin : margin;
    const width = (block.endDay - block.startDay + 1) * dayWidth - (margin * 2);
    
    return {
      position: 'absolute' as const,
      left: `${left}px`,
      width: `${width}px`,
      backgroundColor: block.color,
      top: '8px',
      height: '48px',
    };
  }, [zoomLevel]);

  // Check for overlaps - prevent only true overlaps (same-day transitions allowed)
  const checkOverlaps = useCallback((newBlock: ProductionBlock, excludeId?: string) => {
    const relevantBlocks = blocks.filter(block => block.id !== excludeId && block.lineId === newBlock.lineId);
    
    console.log('🔍 Checking overlaps for:', newBlock);
    console.log('📊 Relevant blocks on same line:', relevantBlocks);
    
    if (relevantBlocks.length === 0) {
      console.log('✅ No existing blocks on this line - no overlap');
      return false;
    }
    
    return relevantBlocks.some(block => {
      // Check for true overlap: new block starts before existing block ends AND new block ends after existing block starts
      // This allows same-day transitions (morning shift ends, night shift starts)
      const trueOverlap = newBlock.startDay < block.endDay && newBlock.endDay > block.startDay;
      
      console.log(`🔍 Comparing with block ${block.id}:`, {
        newBlock: `${newBlock.startDay}-${newBlock.endDay}`,
        existingBlock: `${block.startDay}-${block.endDay}`,
        trueOverlap,
        result: trueOverlap
      });
      
      return trueOverlap;
    });
  }, [blocks]);

  // Get overlapping blocks for visual feedback
  const getOverlappingBlocks = useCallback((block: ProductionBlock) => {
    return blocks
      .filter(b => b.id !== block.id && b.lineId === block.lineId)
      .filter(b => {
        // Check for true overlap - same-day transitions allowed
        const trueOverlap = block.startDay < b.endDay && block.endDay > b.startDay;
        
        return trueOverlap;
      });
  }, [blocks]);

  // Detect and mark changeover blocks
  const detectChangeovers = useCallback((blocks: ProductionBlock[]) => {
    return blocks.map(block => {
      // Find if there's another block on the same line that ends on the same day this block starts
      const hasChangeoverStart = blocks.some(otherBlock => 
        otherBlock.id !== block.id && 
        otherBlock.lineId === block.lineId && 
        otherBlock.endDay === block.startDay
      );
      
      // Find if there's another block on the same line that starts on the same day this block ends
      const hasChangeoverEnd = blocks.some(otherBlock => 
        otherBlock.id !== block.id && 
        otherBlock.lineId === block.lineId && 
        otherBlock.startDay === block.endDay
      );
      
      return {
        ...block,
        isChangeover: hasChangeoverStart || hasChangeoverEnd
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

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent, block: ProductionBlock) => {
    // Don't start drag if clicking on resize handles
    if ((e.target as HTMLElement).closest('.resize-handle-left') || 
        (e.target as HTMLElement).closest('.resize-handle-right')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    setSelectedBlock(block);
    setDragStart({ x: e.clientX, y: e.clientY, day: block.startDay });
    // Store original position for potential revert
    setOriginalBlockPosition({ startDay: block.startDay, endDay: block.endDay });
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedBlock || !dragStart) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const dayWidth = zoomLevel === 'week' ? 64 : 48;
    
    // Calculate delta for both X and Y axes
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const deltaDays = Math.round(deltaX / dayWidth);
    
    // Calculate line height dynamically based on actual grid structure
    const gridTop = gridRect.top;
    const relativeY = e.clientY - gridTop;
    
    // Get the actual line height from the first line element
    const firstLineElement = document.querySelector('[data-line-id]');
    const actualLineHeight = firstLineElement ? firstLineElement.getBoundingClientRect().height : 80;
    const headerHeight = 60; // Height of the header row
    
    // Calculate which line we're hovering over with more precise positioning
    const adjustedY = relativeY - headerHeight;
    const targetLineIndex = Math.max(0, Math.min(lines.length - 1, Math.round(adjustedY / actualLineHeight)));
    const newLineId = lines[targetLineIndex]?.id || selectedBlock.lineId;
    
    const newStartDay = Math.max(1, Math.min(31, dragStart.day + deltaDays));
    const newEndDay = newStartDay + selectedBlock.duration - 1;
    
    // Debug logging
    console.log('Drag Debug:', {
      deltaY,
      relativeY,
      adjustedY,
      actualLineHeight,
      targetLineIndex,
      newLineId,
      currentLineId: selectedBlock.lineId,
      cursorY: e.clientY,
      gridTop: gridRect.top
    });

    // Set drag preview for visual feedback with better positioning
    setDragPreview({
      x: e.clientX - 50, // Center the preview on cursor
      y: e.clientY - 25,
      block: { ...selectedBlock, lineId: newLineId, startDay: newStartDay, endDay: newEndDay }
    });

    // Check for boundaries with other blocks on the target line
    const otherBlocks = blocks.filter(block => 
      block.id !== selectedBlock.id && 
      block.lineId === newLineId
    );

    // Find the nearest block boundaries
    let minStart = 1;
    let maxEnd = 31;

    otherBlocks.forEach(block => {
      if (block.endDay < newStartDay) {
        minStart = Math.max(minStart, block.endDay); // Same day transitions allowed
      }
      if (block.startDay > newEndDay) {
        maxEnd = Math.min(maxEnd, block.startDay); // Same day transitions allowed
      }
    });

    // Constrain the new position to avoid overlaps
    const constrainedStartDay = Math.max(minStart, Math.min(maxEnd - selectedBlock.duration + 1, newStartDay));
    const constrainedEndDay = Math.max(constrainedStartDay + selectedBlock.duration - 1, Math.min(maxEnd, newEndDay));

    // Check if the new position would create an overlap
    const testBlock = { ...selectedBlock, lineId: newLineId, startDay: constrainedStartDay, endDay: constrainedEndDay };
    const hasOverlap = checkOverlaps(testBlock, selectedBlock.id);

    if (hasOverlap) {
      // Revert to original position if overlap detected
      if (originalBlockPosition) {
        const revertedBlock = { ...selectedBlock, startDay: originalBlockPosition.startDay, endDay: originalBlockPosition.endDay };
        setSelectedBlock(revertedBlock);
        setBlocks(prev => prev.map(block => 
          block.id === selectedBlock.id 
            ? revertedBlock
            : block
        ));
      }
    } else {
      // Update block position if no overlap
      const updatedBlock = { ...selectedBlock, lineId: newLineId, startDay: constrainedStartDay, endDay: constrainedEndDay };
      setSelectedBlock(updatedBlock);
      setBlocks(prev => prev.map(block => 
        block.id === selectedBlock.id 
          ? updatedBlock
          : block
      ));
    }
  }, [isDragging, selectedBlock, dragStart, zoomLevel, blocks, checkOverlaps, originalBlockPosition, lines]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (selectedBlock) {
      // Use the current position from selectedBlock (which gets updated during drag)
      const updatedBlock = { ...selectedBlock };
      const hasOverlap = checkOverlaps(updatedBlock, selectedBlock.id);
      
      if (hasOverlap) {
        // Revert to original position if overlap detected
        setBlocks(prev => prev.map(block => 
          block.id === selectedBlock.id ? selectedBlock : block
        ));
        alert('Cannot place block: There is a true overlap with existing blocks on this line. Same-day transitions are allowed (morning/evening shifts).');
      } else {
        // Update blocks and detect changeovers after successful drag
        setBlocks(prev => {
          const updatedBlocks = prev.map(block => 
            block.id === selectedBlock.id ? updatedBlock : block
          );
          return detectChangeovers(updatedBlocks);
        });
      }
    }
    
    setIsDragging(false);
    setSelectedBlock(null);
    setDragStart(null);
    setOriginalBlockPosition(null);
    setDragPreview(null);
  }, [selectedBlock, checkOverlaps, detectChangeovers]);

  // Handle block resize
  const handleBlockResize = useCallback((block: ProductionBlock, newDuration: number) => {
    const newEndDay = block.startDay + newDuration - 1;
    const updatedBlock = { ...block, endDay: newEndDay, duration: newDuration };
    
    setBlocks(prev => prev.map(b => b.id === block.id ? updatedBlock : b));
  }, []);

  // Handle resize drag move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isDraggingBlock || !selectedBlock || !dragStartPosition) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const dayWidth = zoomLevel === 'week' ? 64 : 48;
    const deltaX = e.clientX - dragStartPosition.x;
    const deltaDays = Math.round(deltaX / dayWidth);

    // Check for boundaries with other blocks on the same line
    const otherBlocks = blocks.filter(block => 
      block.id !== selectedBlock.id && 
      block.lineId === selectedBlock.lineId
    );

    let newStartDay = selectedBlock.startDay;
    let newEndDay = selectedBlock.endDay;

    const maxDays = 31; // Use a reasonable maximum for now
    
    if (selectedBlock.isResizingLeft) {
      // Resizing from left (start day)
      newStartDay = Math.max(1, Math.min(selectedBlock.endDay - 1, dragStartPosition.day + deltaDays));
      
      // Find the nearest block boundary on the left
      let minStart = 1;
      otherBlocks.forEach(block => {
        if (block.endDay < newStartDay) {
          minStart = Math.max(minStart, block.endDay); // Same day transitions allowed
        }
      });
      
      newStartDay = Math.max(minStart, newStartDay);
      newEndDay = selectedBlock.endDay; // Keep end day fixed
    } else {
      // Resizing from right (end day)
      newEndDay = Math.max(selectedBlock.startDay + 1, Math.min(maxDays, dragStartPosition.day + deltaDays));
      
      // Find the nearest block boundary on the right
      let maxEnd = maxDays;
      otherBlocks.forEach(block => {
        if (block.startDay > newEndDay) {
          maxEnd = Math.min(maxEnd, block.startDay); // Same day transitions allowed
        }
      });
      
      newEndDay = Math.min(maxEnd, newEndDay);
      newStartDay = selectedBlock.startDay; // Keep start day fixed
    }

    const newDuration = newEndDay - newStartDay + 1;
    const testBlock = { ...selectedBlock, startDay: newStartDay, endDay: newEndDay, duration: newDuration };
    const hasOverlap = checkOverlaps(testBlock, selectedBlock.id);

    if (hasOverlap) {
      // Revert to original position if overlap detected
      if (originalBlockPosition) {
        const revertedBlock = { ...selectedBlock, startDay: originalBlockPosition.startDay, endDay: originalBlockPosition.endDay, duration: originalBlockPosition.endDay - originalBlockPosition.startDay + 1 };
        setSelectedBlock(revertedBlock);
        setBlocks(prev => prev.map(block => 
          block.id === selectedBlock.id 
            ? revertedBlock
            : block
        ));
      }
    } else {
      // Update block position if no overlap
      const updatedBlock = { ...selectedBlock, startDay: newStartDay, endDay: newEndDay, duration: newDuration };
      setSelectedBlock(updatedBlock);
      setBlocks(prev => prev.map(block => 
        block.id === selectedBlock.id 
          ? updatedBlock
          : block
      ));
    }
  }, [isDraggingBlock, selectedBlock, dragStartPosition, zoomLevel, blocks, checkOverlaps, originalBlockPosition]);

  // Handle resize drag end
  const handleResizeEnd = useCallback(() => {
    setIsDraggingBlock(false);
    setDragStartPosition(null);
    setOriginalBlockPosition(null);
    if (selectedBlock) {
      setSelectedBlock({ ...selectedBlock, isResizingLeft: undefined });
      
      // Update blocks and detect changeovers after resize
      setBlocks(prev => {
        const updatedBlocks = prev.map(block => 
          block.id === selectedBlock.id ? selectedBlock : block
        );
        return detectChangeovers(updatedBlocks);
      });
    }
  }, [selectedBlock, detectChangeovers]);

  // Add event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  // Add event listeners for resize drag
  useEffect(() => {
    if (isDraggingBlock) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isDraggingBlock, handleResizeMove, handleResizeEnd]);

  // Create new block
  const createBlock = useCallback((lineId: string, day: number) => {
    // Don't create block immediately - just open the editing modal
    const line = lines.find(l => l.id === lineId);
    const newBlock: ProductionBlock = {
      id: `block-${Date.now()}`,
      lineId,
      startDay: day,
      endDay: day + 2, // Default 3-day duration
      label: 'New Production Run',
      color: line?.color || '#3B82F6',
      duration: 3,
    };

    // Open editing modal without creating the block yet
    setEditingBlock(newBlock);
  }, [lines]);

  // Update block
  const updateBlock = useCallback((updatedBlock: ProductionBlock) => {
    // Check if mold is selected
    if (!updatedBlock.moldId) {
      alert('Please select a mold before saving the block.');
      return;
    }

    // Check for overlaps before updating
    const hasOverlap = checkOverlaps(updatedBlock, updatedBlock.id);
    if (hasOverlap) {
      alert('Cannot update block: There is a true overlap with existing blocks on this line. Same-day transitions are allowed (morning/evening shifts).');
      return;
    }

    // Check if this is a new block (not yet in blocks array)
    const isNewBlock = !blocks.some(block => block.id === updatedBlock.id);
    
    if (isNewBlock) {
      // Add new block and detect changeovers
      setBlocks(prev => {
        const newBlocks = [...prev, updatedBlock];
        return detectChangeovers(newBlocks);
      });
    } else {
      // Update existing block and detect changeovers
      setBlocks(prev => {
        const updatedBlocks = prev.map(block => 
          block.id === updatedBlock.id ? updatedBlock : block
        );
        return detectChangeovers(updatedBlocks);
      });
    }
    
    setEditingBlock(null);
  }, [checkOverlaps, blocks, detectChangeovers]);

  // Delete block
  const deleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      const filteredBlocks = prev.filter(block => block.id !== blockId);
      return detectChangeovers(filteredBlocks);
    });
    setEditingBlock(null);
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
        <div className="shadow-inner" style={{ width: `${128 + (days.length * (zoomLevel === 'week' ? 64 : 48))}px` }}>
          {/* Timeline Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 z-10 shadow-sm">
            <div className="flex">
              <div className="w-32 bg-gradient-to-r from-blue-100 to-indigo-100 border-r-2 border-blue-200 p-3 flex-shrink-0">
                <span className="font-bold text-blue-800 text-sm uppercase tracking-wide">Production Lines</span>
              </div>
              <div className="flex">
                {days.map(day => (
                  <div
                    key={day}
                    className={`border-r border-blue-200 p-2 text-center text-sm font-medium transition-all duration-200 ${
                      zoomLevel === 'week' ? 'w-16' : 'w-12'
                    } ${
                      new Date().getDate() === day && 
                      new Date().getMonth() === currentMonth.getMonth() && 
                      new Date().getFullYear() === currentMonth.getFullYear()
                        ? 'bg-blue-200 text-blue-800 font-bold shadow-md' 
                        : 'text-gray-700 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-lg">{day}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Content */}
          <div ref={gridRef} className="relative">
            {lines.map((line, lineIndex) => (
              <div key={line.id} data-line-id={line.id} className={`flex border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${
                isDragging && selectedBlock && lines.findIndex(l => l.id === selectedBlock.lineId) === lineIndex ? 'bg-gradient-to-r from-blue-100 to-indigo-100' : ''
              }`}>
                {/* Line Info */}
                <div 
                  className={`w-32 flex-shrink-0 border-r-2 border-gray-200 p-3 flex items-center cursor-pointer hover:shadow-md transition-all duration-200 ${
                    (() => {
                      const lineStatus = getLineStatus(line);
                      switch (lineStatus.status) {
                        case 'active':
                          return 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500 shadow-sm';
                        case 'maintenance':
                          return 'bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-l-orange-500 shadow-sm';
                        case 'inactive':
                        default:
                          return 'bg-gradient-to-r from-gray-50 to-slate-50 border-l-4 border-l-gray-400';
                      }
                    })()
                  }`}
                  onClick={() => toggleLineStatus(line.id)}
                  onMouseEnter={(e) => {
                    setHoveredLine(line);
                    setLineTooltipPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredLine(null)}
                  title="Click to toggle line status"
                >
                        <div className="flex items-center space-x-2 w-full">
                          <span className={`font-semibold text-sm truncate ${
                            (() => {
                              const lineStatus = getLineStatus(line);
                              switch (lineStatus.status) {
                                case 'active':
                                  return 'text-gray-900';
                                case 'maintenance':
                                  return 'text-orange-800';
                                case 'inactive':
                                default:
                                  return 'text-gray-500';
                              }
                            })()
                          }`}>
                            {line.name}
                          </span>
                          <span className="text-xs text-gray-500 cursor-help flex-shrink-0">ⓘ</span>
                        </div>
                </div>

                {/* Timeline Grid */}
                <div className="relative h-16" style={{ width: `${days.length * (zoomLevel === 'week' ? 64 : 48)}px` }}>
                  {/* Day columns */}
                  <div className="flex h-full">
                    {days.map((day, index) => (
                      <div
                        key={day}
                        className={`h-full border-r border-gray-200 cursor-pointer transition-colors relative ${
                          getChangeoverDay(line.id) === day ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-blue-50'
                        } ${zoomLevel === 'week' ? 'w-16' : 'w-12'}`}
                        onClick={() => createBlock(line.id, day)}
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
                        {/* Changeover indicator */}
                        {getChangeoverDay(line.id) === day && (
                          <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-yellow-900">C</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Production Blocks */}
                  {blocks
                    .filter(block => block.lineId === line.id)
                    .map(block => {
                      const overlappingBlocks = getOverlappingBlocks(block);
                      const hasOverlap = overlappingBlocks.length > 0;
                      
                      return (
                        <div
                          key={block.id}
                          ref={el => { blockRefs.current[block.id] = el; }}
                          className={`absolute top-2 h-12 rounded-lg shadow-lg border-2 cursor-move hover:shadow-xl transition-all duration-200 ${
                            hasOverlap ? 'ring-2 ring-red-400 ring-opacity-75 border-red-300' : 
                            block.isChangeover ? 'ring-2 ring-yellow-400 ring-opacity-70 border-yellow-300' : 'border-white'
                          } ${isDragging && selectedBlock?.id === block.id ? 'opacity-30' : ''}`}
                          style={{
                            ...getBlockStyle(block, days),
                            transform: hoveredBlock?.id === block.id ? 'scale(1.01)' : 'scale(1)',
                          }}
                          onMouseDown={(e) => handleDragStart(e, block)}
                          onDoubleClick={() => setEditingBlock(block)}
                          onMouseEnter={(e) => {
                            setHoveredBlock(block);
                            startTooltipDelay(e);
                          }}
                          onMouseMove={(e) => {
                            if (hoveredBlock?.id === block.id) {
                              setTooltipPosition({ x: e.clientX, y: e.clientY });
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredBlock(null);
                            clearTooltipDelay();
                          }}
                        >
                          <div className={`h-full flex items-center text-white text-sm font-semibold relative overflow-hidden ${
                            block.isChangeover && !hasOverlap ? 'pl-6 pr-3' : 'px-3'
                          }`}>
                            <div className="flex-1 truncate">
                              <span className="drop-shadow-sm">{block.label}</span>
                            </div>
                            {hasOverlap && (
                              <AlertTriangle className="absolute -top-1 -right-1 w-4 h-4 text-red-500 drop-shadow-sm" />
                            )}
                            {block.isChangeover && !hasOverlap && (
                              <div className="absolute top-1 left-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center z-10">
                                <span className="text-xs font-bold text-yellow-900">C</span>
                              </div>
                            )}
                          </div>
                          
                                {/* Left resize handle - only show if not on first day */}
                                {block.startDay > 1 && (
                                  <div 
                                    className="absolute left-0 top-0 w-3 h-full cursor-ew-resize bg-white bg-opacity-30 hover:bg-opacity-50 rounded-l-lg transition-all duration-200 resize-handle-left"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setIsDraggingBlock(true);
                                      setDragStartPosition({ x: e.clientX, day: block.startDay });
                                      setSelectedBlock({ ...block, isResizingLeft: true });
                                      // Store original position for potential revert
                                      setOriginalBlockPosition({ startDay: block.startDay, endDay: block.endDay });
                                    }}
                                  />
                                )}
                                
                                {/* Right resize handle - only show if not on last day */}
                                {block.endDay < 31 && (
                                  <div 
                                    className="absolute right-0 top-0 w-3 h-full cursor-ew-resize bg-white bg-opacity-30 hover:bg-opacity-50 rounded-r-lg transition-all duration-200 resize-handle-right"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setIsDraggingBlock(true);
                                      setDragStartPosition({ x: e.clientX, day: block.endDay });
                                      setSelectedBlock({ ...block, isResizingLeft: false });
                                      // Store original position for potential revert
                                      setOriginalBlockPosition({ startDay: block.startDay, endDay: block.endDay });
                                    }}
                                  />
                                )}
                          
                          {/* Gradient overlay for better text readability */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black opacity-20 rounded-lg pointer-events-none" />
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
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
          <div className="font-bold text-white mb-2">{hoveredBlock.label}</div>
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
          className="fixed z-50 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-sm rounded-xl shadow-2xl p-4 pointer-events-none border border-gray-700"
          style={{
            left: lineTooltipPosition.x + 15,
            top: lineTooltipPosition.y - 15,
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
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45 border-l border-t border-gray-700"></div>
        </div>
      )}
    </div>
  );
};

export default ProdPlanner;
