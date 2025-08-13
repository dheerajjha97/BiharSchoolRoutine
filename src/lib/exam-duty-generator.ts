
import type { ExamEntry, DutyChart, Teacher } from "@/types";

export function generateInvigilationDuty(
    examTimetable: ExamEntry[],
    allTeachers: Teacher[]
): DutyChart {
    const duties: DutyChart['duties'] = {};
    const teacherDutyCount: Record<string, number> = {};
    allTeachers.forEach(t => { teacherDutyCount[t.id] = 0; });

    const uniqueExamSlots = examTimetable.reduce((acc, exam) => {
        const key = `${exam.date}-${exam.startTime}`;
        if (!acc.find(slot => `${slot.date}-${slot.startTime}` === key)) {
            acc.push({ date: exam.date, startTime: exam.startTime, endTime: exam.endTime });
        }
        return acc;
    }, [] as { date: string, startTime: string, endTime: string }[]).sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime}`).getTime();
        const dateB = new Date(`${b.date}T${b.startTime}`).getTime();
        return dateA - dateB;
    });

    uniqueExamSlots.forEach(({ date, startTime }) => {
        const key = `${date}-${startTime}`;
        duties[key] = {};

        // Find all exams in this specific time slot
        const examsInSlot = examTimetable.filter(e => e.date === date && e.startTime === startTime);

        // Get all unique rooms used in this time slot
        const roomsForSlot = [...new Set(examsInSlot.flatMap(e => e.rooms))];

        roomsForSlot.forEach(room => {
            if (!duties[key][room]) {
                duties[key][room] = [];
            }

            const availableTeachers = [...allTeachers];
            
            // Sort available teachers by their current duty count (ascending) to balance the load
            const sortedAvailableTeachers = availableTeachers.sort((a, b) => teacherDutyCount[a.id] - teacherDutyCount[b.id]);
            
            // Assign a certain number of teachers for invigilation per room, e.g., 2
            const numInvigilatorsPerRoom = Math.min(sortedAvailableTeachers.length, 2); 
            
            // Find teachers who are not already assigned in this slot (in another room)
            const teachersAssignedInThisSlot = Object.values(duties[key]).flat();
            const unassignedTeachers = sortedAvailableTeachers.filter(t => !teachersAssignedInThisSlot.includes(t.id));

            const teachersToAssign = unassignedTeachers.slice(0, numInvigilatorsPerRoom);

            duties[key][room].push(...teachersToAssign.map(t => t.id));
            teachersToAssign.forEach(teacher => {
                teacherDutyCount[teacher.id]++;
            });
        });
    });
    
    return { duties, examSlots: uniqueExamSlots };
}
