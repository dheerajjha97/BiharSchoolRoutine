import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortTimeSlots(timeSlots: string[]): string[] {
  const parseTime = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  };

  return timeSlots.sort((a, b) => {
    const startTimeA = parseTime(a.split(' - ')[0]);
    const startTimeB = parseTime(b.split(' - ')[0]);
    return startTimeA - startTimeB;
  });
}