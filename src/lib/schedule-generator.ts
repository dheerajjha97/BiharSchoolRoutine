
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import type { SchoolConfig } from "@/context/app-state-provider";

export type SubjectPriority = "before" | "after" | "none";
export type SubjectCategory = "main" | "additional";

export type GenerateScheduleLogicInput = {
    teacherNames: string[];
    classes: string[];
    subjects: string[];
    timeSlots: string[];
} & SchoolConfig;

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacher -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
    classSubjectBookings: Record<string, Set<string>>; // className -> "day-subject"
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export function generateScheduleLogic(input: GenerateScheduleLogicInput): GenerateScheduleOutput {
    const {
        teacherNames,
        classes,
        timeSlots,
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
        prayerTimeSlot,
        lunchTimeSlot,
        subjectCategories,
        dailyPeriodQuota,
    } = input;

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = { teacherBookings: {}, classBookings: {}, classSubjectBookings: {} };
    
    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { 
        bookings.classBookings[c] = new Set();
        bookings.classSubjectBookings[c] = new Set();
    });

    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => 
        bookings.teacherBookings[teacher]?.has(`${day}-${timeSlot}`);

    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => 
        bookings.classBookings[className]?.has(`${day}-${timeSlot}`);

    const isClassSubjectBookedForDay = (className: string, day: string, subject: string): boolean =>
        subjectCategories[subject] === 'main' && bookings.classSubjectBookings[className]?.has(`${day}-${subject}`);
    
    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => 
        unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);

    const bookSlot = (entry: Omit<ScheduleEntry, 'className'> & { classNames: string[] }) => {
        const { teacher, day, timeSlot, classNames, subject } = entry;
        const finalEntry: ScheduleEntry = { day, timeSlot, className: classNames.sort().join(' & '), subject, teacher };
        schedule.push(finalEntry);
        
        teacher.split(' & ').map(t => t.trim()).forEach(t => {
            if (teacherNames.includes(t)) bookings.teacherBookings[t].add(`${day}-${timeSlot}`);
        });

        classNames.forEach(c => {
            bookings.classBookings[c].add(`${day}-${timeSlot}`);
            if (subject !== "---") bookings.classSubjectBookings[c].add(`${day}-${subject}`);
        });
    };
    
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    const lunchIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : -1;
    const beforeLunchSlots = lunchIndex !== -1 ? instructionalSlots.filter(slot => timeSlots.indexOf(slot) < lunchIndex) : [];
    const afterLunchSlots = lunchIndex !== -1 ? instructionalSlots.filter(slot => timeSlots.indexOf(slot) > lunchIndex) : instructionalSlots;

    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            if (prayerTimeSlot) bookSlot({ day, timeSlot: prayerTimeSlot, classNames: [className], subject: "Prayer", teacher: "N/A" });
            if (lunchTimeSlot) bookSlot({ day, timeSlot: lunchTimeSlot, classNames: [className], subject: "Lunch", teacher: "N/A" });
        });
    });

    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            const requiredSubjectsForClass = shuffleArray(classRequirements[className] || []).filter(s => subjectCategories[s] === 'main');

            requiredSubjectsForClass.forEach(subject => {
                if (isClassSubjectBookedForDay(className, day, subject)) return;

                const qualifiedTeachers = shuffleArray(teacherNames.filter(t =>
                    (teacherSubjects[t] || []).includes(subject) && (teacherClasses[t] || []).includes(className)
                ));

                for (const teacher of qualifiedTeachers) {
                    const periodsToday = Array.from(bookings.teacherBookings[teacher] || []).filter(b => b.startsWith(day)).length;
                    if (periodsToday >= dailyPeriodQuota) continue;

                    const priority = subjectPriorities[subject] || 'none';
                    const preferredSlots = priority === 'before' ? beforeLunchSlots : (priority === 'after' ? afterLunchSlots : instructionalSlots);
                    
                    const availableSlot = shuffleArray(preferredSlots).find(slot =>
                        !isTeacherBooked(teacher, day, slot) &&
                        !isClassBooked(className, day, slot) &&
                        !isTeacherUnavailable(teacher, day, slot)
                    );
                    
                    if (availableSlot) {
                        bookSlot({ day, timeSlot: availableSlot, classNames: [className], subject, teacher });
                        break;
                    }
                }
            });
        });
    });

    daysOfWeek.forEach(day => {
        teacherNames.forEach(teacher => {
            let periodsToday = Array.from(bookings.teacherBookings[teacher] || []).filter(b => b.startsWith(day)).length;
            
            if (periodsToday >= dailyPeriodQuota) return;

            const assignableClasses = shuffleArray(teacherClasses[teacher] || []);
            const additionalSubjects = shuffleArray((teacherSubjects[teacher] || []).filter(s => subjectCategories[s] === 'additional' || !subjectCategories[s]));

            for (const className of assignableClasses) {
                if (periodsToday >= dailyPeriodQuota) break;
                for (const subject of additionalSubjects) {
                    if (periodsToday >= dailyPeriodQuota) break;
                    
                    const availableSlot = shuffleArray(instructionalSlots).find(slot =>
                        !isTeacherBooked(teacher, day, slot) &&
                        !isClassBooked(className, day, slot) &&
                        !isTeacherUnavailable(teacher, day, slot)
                    );
                    
                    if (availableSlot) {
                        bookSlot({ day, timeSlot: availableSlot, classNames: [className], subject, teacher });
                        periodsToday++;
                    }
                }
            }
        });
    });

    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (!isClassBooked(className, day, timeSlot)) {
                    bookSlot({ day, timeSlot, classNames: [className], subject: "---", teacher: "N/A" });
                }
            });
        });
    });

    schedule.sort((a, b) => {
        const dayIndexA = daysOfWeek.indexOf(a.day);
        const dayIndexB = daysOfWeek.indexOf(b.day);
        if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;

        const timeIndexA = timeSlots.indexOf(a.timeSlot);
        const timeIndexB = timeSlots.indexOf(b.timeSlot);
        if (timeIndexA !== timeIndexB) return timeIndexA - timeIndexB;

        return a.className.localeCompare(b.className);
    });
    
    return { schedule };
}
