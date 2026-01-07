/**
 * Parse a date string in DD-MM-YYYY format
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date to DD-MM-YYYY string
 */
export function formatDateString(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get the number of days in a month
 */
export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Get week number within month (1-5)
 */
export function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const dayOfWeek = firstDay.getDay();
  return Math.ceil((dayOfMonth + dayOfWeek) / 7);
}

/**
 * Generate random color for production blocks
 */
export function generateRandomColor(): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#14B8A6'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Calculate block width based on duration
 */
export function calculateBlockWidth(duration: number, cellWidth: number): number {
  return duration * cellWidth;
}

/**
 * Calculate block position based on start day
 */
export function calculateBlockPosition(startDay: number, cellWidth: number): number {
  return startDay * cellWidth;
}

/**
 * Check if two date ranges overlap
 */
export function dateRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseDateString(start1);
  const e1 = parseDateString(end1);
  const s2 = parseDateString(start2);
  const e2 = parseDateString(end2);
  
  if (!s1 || !e1 || !s2 || !e2) return false;
  
  return s1 <= e2 && e1 >= s2;
}

/**
 * Get day index from date within current month
 */
export function getDayIndexFromDate(dateStr: string, currentMonth: Date): number {
  const date = parseDateString(dateStr);
  if (!date) return -1;
  
  if (
    date.getMonth() !== currentMonth.getMonth() ||
    date.getFullYear() !== currentMonth.getFullYear()
  ) {
    return -1;
  }
  
  return date.getDate();
}

