
import type { ExamEntry } from "@/context/app-state-provider";

export type DutyChart = {
    duties: Record<string, string[]>; // Key: "date-time", Value: array of teacher names
    examSlots: { date: string, time: string }[];
};

export function generateInvigilationDuty(
    examTimetable: ExamEntry[],
    allTeachers: string[]
): DutyChart {
    const duties: Record<string, string[]> = {};
    const teacherDutyCount: Record<string, number> = {};
    allTeachers.forEach(t => { teacherDutyCount[t] = 0; });

    // Identify teachers who are conducting an exam at a certain slot
    const occupiedTeachers: Record<string, Set<string>> = {}; // Key: "date-time", Value: set of teacher names

    examTimetable.forEach(exam => {
        const key = `${exam.date}-${exam.time}`;
        if (!occupiedTeachers[key]) {
            occupiedTeachers[key] = new Set();
        }
        // Assuming one teacher per subject, we need a way to map subject to teacher.
        // For now, we will assume any teacher can invigilate any exam except their own subject's.
        // A more robust system would use the teacherSubjects mapping.
        // This part is simplified: we are not excluding the subject teacher from invigilating.
        // This is a limitation to be addressed if teacher-subject mapping is available here.
    });

    const uniqueExamSlots = examTimetable.reduce((acc, exam) => {
        const key = `${exam.date}-${exam.time}`;
        if (!acc.find(slot => `${slot.date}-${slot.time}` === key)) {
            acc.push({ date: exam.date, time: exam.time });
        }
        return acc;
    }, [] as { date: string, time: string }[]).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if(dateA !== dateB) return dateA - dateB;
        return a.time.localeCompare(b.time);
    });

    uniqueExamSlots.forEach(({ date, time }) => {
        const key = `${date}-${time}`;
        duties[key] = [];

        // All teachers are potential invigilators for this slot.
        // A better approach would be to exclude teachers whose subject is being tested.
        // This requires passing teacher-subject mapping.
        const availableTeachers = [...allTeachers];
        
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
    
    return { duties, examSlots: uniqueExamSlots };
}
