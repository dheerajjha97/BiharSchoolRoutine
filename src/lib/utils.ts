import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortTimeSlots(timeSlots: string[]): string[] {
  const parseTime = (timeStr: string): number => {
    const startTimeStr = timeStr.split(' - ')[0].trim();
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match = startTimeStr.match(timeRegex);

    if (!match) {
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
    // No change for 12 PM as it's correctly 12 in 24-hour format.
    // No change for other AM hours as they are correct.

    return hours * 60 + minutes;
  };

  return [...timeSlots].sort((a, b) => {
    try {
      const timeA = parseTime(a);
      const timeB = parseTime(b);
      return timeA - timeB;
    } catch (e) {
      return a.localeCompare(b);
    }
  });
}
