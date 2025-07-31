import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortTimeSlots(timeSlots: string[]): string[] {
  const parseTime = (timeStr: string): number => {
    const trimmedTime = timeStr.trim();
    const parts = trimmedTime.split(' ');
    const timePart = parts[0];
    const period = parts.length > 1 ? parts[1].toUpperCase() : null;

    let [hours, minutes] = timePart.split(':').map(Number);

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      // Midnight case
      hours = 0;
    }
    
    // If no AM/PM, it's assumed to be 24-hour format already for sorting purposes
    // (e.g., 13:00 is correctly sorted after 12:00)

    return hours * 60 + (minutes || 0);
  };

  return timeSlots.sort((a, b) => {
    try {
      const startTimeA = parseTime(a.split(' - ')[0]);
      const startTimeB = parseTime(b.split(' - ')[0]);
      return startTimeA - startTimeB;
    } catch (e) {
      // Fallback for invalid format
      return a.localeCompare(b);
    }
  });
}
