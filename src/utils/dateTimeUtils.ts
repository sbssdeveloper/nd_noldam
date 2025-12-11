/**
 * Standardized Date/Time Utilities for the entire application
 * Provides consistent date/time formatting across all components
 */

/**
 * Get time ago in Korean format (e.g., "3분 전", "2시간 전", "1일 전")
 * @param date - Date string or Date object
 * @returns Formatted time ago string
 */
export const getTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`;
  return `${Math.floor(diffInSeconds / 31536000)}년 전`;
};

/**
 * Format date for display in Korean locale
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date, 
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.toLocaleString('ko-KR', options);
};

/**
 * Format date for short display (e.g., "12월 15일")
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export const formatShortDate = (date: string | Date): string => {
  return formatDate(date, {
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date with time (e.g., "12월 15일 14:30")
 * @param date - Date string or Date object
 * @returns Formatted date string with time
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date for full display (e.g., "2024년 12월 15일 14:30")
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export const formatFullDateTime = (date: string | Date): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format number with Korean locale (e.g., "1,234")
 * @param num - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('ko-KR');
};

/**
 * Get current timestamp in ISO format
 * @returns Current timestamp as ISO string
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};
