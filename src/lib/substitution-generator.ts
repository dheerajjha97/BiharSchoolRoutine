
import type { ScheduleEntry } from "@/ai/flows/generate-schedule";
import type { TeacherLoad } from "@/context/app-state-provider";
import { dateToDay, sortTimeSlots } from "./utils";

type Substitution = {
    timeSlot: string;
    className: string;
    subject: string;
    absentTeacher: string;
    substituteTeacher: string;
}

export type SubstitutionPlan = {
    date: string; // YYYY-MM-DD
    substitutions: Substitution[];
}

type SubstitutionInput = {
    schedule: ScheduleEntry[];
    allTeachers: string[];
    absentTeachers: string[];
    date: string; // YYYY-MM-DD
    teacherLoad: TeacherLoad;
}

export function generateSubstitutionPlan(input: SubstitutionInput): SubstitutionPlan {
    const { schedule, allTeachers, absentTeachers, date, teacherLoad } = input;

    const substitutions: Substitution[] = [];
    const dayOfWeek = dateToDay(date);

    if (!dayOfWeek) {
        throw new Error("Invalid date provided for substitution plan.");
    }
    
    // Find all periods for absent teachers on the given day
    const periodsToCover = schedule.filter(entry => 
        entry.day === dayOfWeek && 
        absentTeachers.includes(entry.teacher) &&
        entry.subject !== 'Prayer' && entry.subject !== 'Lunch' && entry.subject !== '---'
    );
    
    // Find all available teachers (not absent)
    const availableTeachers = allTeachers.filter(t => !absentTeachers.includes(t));
    const substituteDutyCount: Record<string, number> = {};
    availableTeachers.forEach(t => { substituteDutyCount[t] = 0; });

    // Determine when each available teacher is busy on that day
    const busySlotsByTeacher: Record<string, Set<string>> = {};
    availableTeachers.forEach(teacher => {
        busySlotsByTeacher[teacher] = new Set(
            schedule.filter(entry => entry.day === dayOfWeek && entry.teacher === teacher)
                    .map(entry => entry.timeSlot)
        );
    });

    const sortedPeriodsToCover = periodsToCover.sort((a, b) => sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(a.timeSlot) - sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(b.timeSlot));


    for (const period of sortedPeriodsToCover) {
        // Find teachers who are free during this specific time slot
        let potentialSubstitutes = availableTeachers.filter(teacher => 
            !busySlotsByTeacher[teacher].has(period.timeSlot)
        );

        if (potentialSubstitutes.length === 0) {
            substitutions.push({
                ...period,
                absentTeacher: period.teacher,
                substituteTeacher: "No Substitute Available"
            });
            continue;
        }

        // Sort potential substitutes by their current substitution duty count to balance the load
        potentialSubstitutes.sort((a, b) => substituteDutyCount[a] - substituteDutyCount[b]);
        
        const assignedSubstitute = potentialSubstitutes[0];

        substitutions.push({
            timeSlot: period.timeSlot,
            className: period.className,
            subject: period.subject,
            absentTeacher: period.teacher,
            substituteTeacher: assignedSubstitute,
        });

        // Update the assigned substitute's duty count and busy slots for the day
        substituteDutyCount[assignedSubstitute]++;
        busySlotsByTeacher[assignedSubstitute].add(period.timeSlot);
    }

    return {
        date,
        substitutions
    };
}
