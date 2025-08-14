
import type { ScheduleEntry, TeacherLoad, Teacher, SubstitutionPlan } from "@/types";
import { dateToDay, sortTimeSlots } from "./utils";

type SubstitutionInput = {
    schedule: ScheduleEntry[];
    allTeachers: Teacher[];
    absentTeacherIds: string[];
    date: string; // YYYY-MM-DD
    teacherLoad: TeacherLoad;
}

export function generateSubstitutionPlan(input: SubstitutionInput): SubstitutionPlan {
    const { schedule, allTeachers, absentTeacherIds, date, teacherLoad } = input;

    const substitutions: SubstitutionPlan['substitutions'] = [];
    const dayOfWeek = dateToDay(date);

    if (!dayOfWeek) {
        throw new Error("Invalid date provided for substitution plan.");
    }
    
    const periodsToCover = schedule.filter(entry => {
        const teacherIdsInEntry = (entry.teacher || '').split(' & ').map(tId => tId.trim()).filter(id => id && id !== "N/A");
        return entry.day === dayOfWeek && 
               teacherIdsInEntry.some(id => absentTeacherIds.includes(id)) &&
               entry.subject !== 'Prayer' && entry.subject !== 'Lunch' && entry.subject !== '---';
    });
    
    const availableTeachers = allTeachers.filter(t => !absentTeacherIds.includes(t.id));
    const substituteDutyCount: Record<string, number> = {};
    availableTeachers.forEach(t => { substituteDutyCount[t.id] = 0; });

    const busySlotsByTeacher: Record<string, Set<string>> = {};
    availableTeachers.forEach(teacher => {
        const teacherId = teacher.id;
        busySlotsByTeacher[teacherId] = new Set(
            schedule.filter(entry => 
                entry.day === dayOfWeek && (entry.teacher || '').includes(teacherId)
            ).map(entry => entry.timeSlot)
        );
    });

    const sortedPeriodsToCover = periodsToCover.sort((a, b) => 
        sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(a.timeSlot) - sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(b.timeSlot)
    );

    for (const period of sortedPeriodsToCover) {
        const teacherIdsInPeriod = (period.teacher || '').split(' & ').map(t => t.trim());
        const absentIdsInPeriod = teacherIdsInPeriod.filter(id => absentTeacherIds.includes(id));

        if (absentIdsInPeriod.length === 0) continue;
        const absentTeacherId = absentIdsInPeriod[0]; 

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

        potentialSubstitutes.sort((a, b) => substituteDutyCount[a.id] - substituteDutyCount[b.id]);
        
        const assignedSubstitute = potentialSubstitutes[0];

        substitutions.push({
            timeSlot: period.timeSlot,
            className: period.className,
            subject: period.subject,
            absentTeacherId: absentTeacherId,
            substituteTeacherId: assignedSubstitute.id,
        });

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
