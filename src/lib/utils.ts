
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortTimeSlots(timeSlots: string[]): string[] {
  const parseTime = (timeStr: string): number => {
    // Take the start time, e.g., "09:00" from "09:00 - 09:45"
    const startTimeStr = timeStr.split(' - ')[0].trim();
    
    // Regex to capture hours, minutes, and optional AM/PM
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match = startTimeStr.match(timeRegex);

    if (!match) {
      // Return a large number so invalid formats are sorted to the end
      return 9999;
    }

    let [, hoursStr, minutesStr, period] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    // If AM/PM is provided, use it
    if (period) {
      period = period.toUpperCase();
      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) { // Midnight case
        hours = 0;
      }
    } else {
      // If no AM/PM, infer based on common school hours
      // Treat hours 1-5 as PM (e.g., 1 PM, 2 PM, etc.)
      if (hours >= 1 && hours <= 5) {
        hours += 12;
      }
      // Hours 6, 7, 8, 9, 10, 11, 12 are assumed to be AM or noon.
    }

    return hours * 60 + minutes;
  };

  return [...timeSlots].sort((a, b) => {
    const timeA = parseTime(a);
    const timeB = parseTime(b);
    return timeA - timeB;
  });
}

const getGradeFromClassName = (className: string): string | null => {
    if (typeof className !== 'string') return null;
    const match = className.match(/\d+/);
    return match ? match[0] : null;
};

export const sortClasses = (a: string, b: string): number => {
  const gradeA = parseInt(getGradeFromClassName(a) || '0', 10);
  const gradeB = parseInt(getGradeFromClassName(b) || '0', 10);
  if (gradeA !== gradeB) return gradeA - gradeB;
  return a.localeCompare(b);
};
    