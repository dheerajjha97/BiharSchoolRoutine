
import type { ScheduleEntry } from "@/ai/flows/generate-schedule";
import type { Teacher } from "@/context/app-state-provider";
import { dateToDay, sortTimeSlots } from "./utils";

type Substitution = {
    timeSlot: string;
    className: string;
    subject: string;
    absentTeacherId: string;
    substituteTeacherId: string;
}

export type SubstitutionPlan = {
    date: string; // YYYY-MM-DD
    substitutions: Substitution[];
}

type SubstitutionInput = {
    schedule: ScheduleEntry[];
    allTeachers: Teacher[];
    absentTeacherIds: string[];
    date: string; // YYYY-MM-DD
}

export function generateSubstitutionPlan(input: SubstitutionInput): SubstitutionPlan {
    const { schedule, allTeachers, absentTeacherIds, date } = input;

    const substitutions: Substitution[] = [];
    const dayOfWeek = dateToDay(date);

    if (!dayOfWeek) {
        throw new Error("Invalid date provided for substitution plan.");
    }
    
    const getTeacherIdFromName = (name: string): string | undefined => {
        return allTeachers.find(t => t.name === name)?.id;
    }
    
    // Find all periods for absent teachers on the given day
    const periodsToCover = schedule.filter(entry => {
        const teacherId = getTeacherIdFromName(entry.teacher);
        return entry.day === dayOfWeek && 
               teacherId &&
               absentTeacherIds.includes(teacherId) &&
               entry.subject !== 'Prayer' && entry.subject !== 'Lunch' && entry.subject !== '---'
    });
    
    // Find all available teachers (not absent)
    const availableTeachers = allTeachers.filter(t => !absentTeacherIds.includes(t.id));
    const substituteDutyCount: Record<string, number> = {};
    availableTeachers.forEach(t => { substituteDutyCount[t.id] = 0; });

    // Determine when each available teacher is busy on that day
    const busySlotsByTeacher: Record<string, Set<string>> = {};
    availableTeachers.forEach(teacher => {
        const teacherId = getTeacherIdFromName(teacher.name);
        if (!teacherId) return;

        busySlotsByTeacher[teacherId] = new Set(
            schedule.filter(entry => entry.day === dayOfWeek && entry.teacher === teacher.name)
                    .map(entry => entry.timeSlot)
        );
    });

    const sortedPeriodsToCover = periodsToCover.sort((a, b) => sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(a.timeSlot) - sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(b.timeSlot));


    for (const period of sortedPeriodsToCover) {
        const absentTeacherId = getTeacherIdFromName(period.teacher);
        if (!absentTeacherId) continue;

        // Find teachers who are free during this specific time slot
        let potentialSubstitutes = availableTeachers.filter(teacher => 
            !busySlotsByTeacher[teacher.id]?.has(period.timeSlot)
        );

        if (potentialSubstitutes.length === 0) {
            substitutions.push({
                timeSlot: period.timeSlot,
                className: period.className,
                subject: period.subject,
                absentTeacherId: absentTeacherId,
                substituteTeacherId: "No Substitute Available"
            });
            continue;
        }

        // Sort potential substitutes by their current substitution duty count to balance the load
        potentialSubstitutes.sort((a, b) => substituteDutyCount[a.id] - substituteDutyCount[b.id]);
        
        const assignedSubstitute = potentialSubstitutes[0];

        substitutions.push({
            timeSlot: period.timeSlot,
            className: period.className,
            subject: period.subject,
            absentTeacherId: absentTeacherId,
            substituteTeacherId: assignedSubstitute.id,
        });

        // Update the assigned substitute's duty count and busy slots for the day
        substituteDutyCount[assignedSubstitute.id]++;
        if(!busySlotsByTeacher[assignedSubstitute.id]) {
            busySlotsByTeacher[assignedSubstitute.id] = new Set();
        }
        busySlotsByTeacher[assignedSubstitute.id].add(period.timeSlot);
    }

    return {
        date,
        substitutions
    };
}
