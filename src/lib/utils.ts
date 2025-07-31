import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortTimeSlots(timeSlots: string[]): string[] {
  const parseTime = (timeStr: string): number => {
    // Extracts the start time, e.g., "09:30 AM" from "09:30 AM - 10:15 AM"
    const startTimeStr = timeStr.split(' - ')[0].trim();

    // Regular expression to match time in HH:MM AM/PM or HH:MM format
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match = startTimeStr.match(timeRegex);

    if (!match) {
      // Fallback for unexpected formats
      return 0;
    }

    let [, hoursStr, minutesStr, period] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    period = period?.toUpperCase();

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) { // Handle 12 AM (midnight)
      hours = 0;
    }

    return hours * 60 + minutes;
  };

  return timeSlots.sort((a, b) => {
    try {
      const timeA = parseTime(a);
      const timeB = parseTime(b);
      return timeA - timeB;
    } catch (e) {
      // Fallback for any parsing errors
      return a.localeCompare(b);
    }
  });
}
