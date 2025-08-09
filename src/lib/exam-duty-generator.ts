
import type { ScheduleEntry } from "@/ai/flows/generate-schedule";

const daysOfWeek: ScheduleEntry['day'][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type DutyChart = {
    duties: Record<string, string[]>; // Key: "day-timeSlot", Value: array of teacher names
    timeSlots: string[];
};

export function generateInvigilationDuty(
    schedule: ScheduleEntry[],
    allTeachers: string[],
    allTimeSlots: string[]
): DutyChart {
    const duties: Record<string, string[]> = {};
    const teacherDutyCount: Record<string, number> = {};

    allTeachers.forEach(t => { teacherDutyCount[t] = 0; });

    // Identify occupied slots for each teacher
    const occupiedSlots: Record<string, Set<string>> = {};
    allTeachers.forEach(t => { occupiedSlots[t] = new Set(); });

    schedule.forEach(entry => {
        const teachersInEntry = entry.teacher.split(' & ').map(t => t.trim()).filter(t => t && t !== "N/A");
        teachersInEntry.forEach(teacher => {
            if (occupiedSlots[teacher]) {
                occupiedSlots[teacher].add(`${entry.day}-${entry.timeSlot}`);
            }
        });
    });

    // Filter out prayer and lunch times
    const instructionalSlots = allTimeSlots.filter(slot =>
        !schedule.some(e => e.timeSlot === slot && (e.subject === "Prayer" || e.subject === "Lunch"))
    );

    // Assign duties
    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(slot => {
            const key = `${day}-${slot}`;
            duties[key] = [];

            // Find available teachers for this slot
            const availableTeachers = allTeachers.filter(teacher => !occupiedSlots[teacher].has(key));
            
            // Sort available teachers by their current duty count (ascending) to balance the load
            const sortedAvailableTeachers = availableTeachers.sort((a, b) => teacherDutyCount[a] - teacherDutyCount[b]);
            
            // Assign a certain number of teachers for invigilation, e.g., 2 per slot if available
            const numInvigilators = Math.min(sortedAvailableTeachers.length, 2); 
            
            for (let i = 0; i < numInvigilators; i++) {
                const teacherToAssign = sortedAvailableTeachers[i];
                duties[key].push(teacherToAssign);
                teacherDutyCount[teacherToAssign]++;
            }
        });
    });
    
    return { duties, timeSlots: instructionalSlots };
}
