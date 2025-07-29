
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";

type Unavailability = {
    teacher: string;
    day: string;
    timeSlot: string;
}

export type SubjectPriority = "before" | "after" | "none";

export type GenerateScheduleLogicInput = {
    teacherNames: string[];
    classes: string[];
    subjects: string[];
    timeSlots: string[];
    unavailability: Unavailability[];
    subjectPriorities: Record<string, SubjectPriority>;
    classRequirements: Record<string, string[]>;
    teacherSubjects: Record<string, string[]>;
    teacherClasses: Record<string, string[]>;
    prayerTimeSlot?: string;
    lunchTimeSlot?: string;
    preventConsecutiveClasses?: boolean;
};

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacher -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const secondarySubjects = ["Library", "Sports", "Computer"];

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
        subjects,
        unavailability,
        teacherSubjects,
        teacherClasses,
        classRequirements,
        prayerTimeSlot,
        lunchTimeSlot,
        preventConsecutiveClasses = true,
    } = input;
    
    const timeSlots = [...input.timeSlots];
    const schedule: ScheduleEntry[] = [];
    
    const bookings: Booking = {
        teacherBookings: {},
        classBookings: {},
    };
    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { bookings.classBookings[c] = new Set(); });

    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => 
        bookings.teacherBookings[teacher]?.has(`${day}-${timeSlot}`);

    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => 
        bookings.classBookings[className]?.has(`${day}-${timeSlot}`);

    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => 
        unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);
    
    const hasTooManyConsecutiveClasses = (teacher: string, day: string, timeSlot: string, allTimeSlots: string[]): boolean => {
        if (!preventConsecutiveClasses) return false;
        
        const slotIndex = allTimeSlots.indexOf(timeSlot);
        if (slotIndex < 2) return false;

        const prevSlot = allTimeSlots[slotIndex - 1];
        const prevPrevSlot = allTimeSlots[slotIndex - 2];
        
        return isTeacherBooked(teacher, day, prevSlot) && isTeacherBooked(teacher, day, prevPrevSlot);
    };

    const bookSlot = (entry: ScheduleEntry) => {
        schedule.push(entry);
        const { teacher, day, timeSlot, className } = entry;
        
        if (teacher !== "N/A" && bookings.teacherBookings[teacher]) {
            bookings.teacherBookings[teacher].add(`${day}-${timeSlot}`);
        }
        
        const entryClasses = className.split(' & ').map(c => c.trim());
        entryClasses.forEach(c => {
            if (bookings.classBookings[c]) {
                bookings.classBookings[c].add(`${day}-${timeSlot}`);
            }
        });
    };
    
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    
    // 1. Pre-book Prayer and Lunch
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            if (prayerTimeSlot && !isClassBooked(className, day, prayerTimeSlot)) {
                bookSlot({ day, timeSlot: prayerTimeSlot, className, subject: "Prayer", teacher: "N/A" });
            }
            if (lunchTimeSlot && !isClassBooked(className, day, lunchTimeSlot)) {
                bookSlot({ day, timeSlot: lunchTimeSlot, className, subject: "Lunch", teacher: "N/A" });
            }
        });
    });

    // 2. Create a list of all required periods for the week
    const allRequiredPeriods: { className: string, subject: string }[] = [];
    classes.forEach(className => {
        const requiredSubs = classRequirements[className] || [];
        const totalPeriods = daysOfWeek.length * instructionalSlots.length;
        const periodsPerSubject = Math.floor(totalPeriods / (requiredSubs.length || 1));
        
        requiredSubs.forEach(subject => {
            for (let i = 0; i < periodsPerSubject; i++) {
                allRequiredPeriods.push({ className, subject });
            }
        });
    });

    // 3. Schedule required periods
    shuffleArray(allRequiredPeriods).forEach(period => {
        const { className, subject } = period;
        let scheduled = false;

        for (const day of shuffleArray(daysOfWeek)) {
            if (scheduled) break;
            for (const timeSlot of shuffleArray(instructionalSlots)) {
                if (isClassBooked(className, day, timeSlot)) continue;

                const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                    teacherSubjects[t]?.includes(subject) &&
                    teacherClasses[t]?.includes(className) &&
                    !isTeacherBooked(t, day, timeSlot) &&
                    !isTeacherUnavailable(t, day, timeSlot) &&
                    !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                ));

                if (potentialTeachers.length > 0) {
                    bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                    scheduled = true;
                    break;
                }
            }
        }
    });

    // 4. Fill remaining empty slots with secondary subjects or repeat classes
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot)) {
                    let filled = false;
                    const possibleSubjects = shuffleArray([
                        ...(classRequirements[className] || []), 
                        ...secondarySubjects
                    ]);

                    for (const subject of possibleSubjects) {
                        const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                            teacherSubjects[t]?.includes(subject) &&
                            teacherClasses[t]?.includes(className) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot) &&
                            !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                        ));
                        if (potentialTeachers.length > 0) {
                            bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                            filled = true;
                            break;
                        }
                    }
                    if(!filled) {
                         bookSlot({ day, timeSlot, className, subject: "---", teacher: "N/A" });
                    }
                }
            });
        });
    });

    schedule.sort((a, b) => {
        const dayIndexA = daysOfWeek.indexOf(a.day);
        const dayIndexB = daysOfWeek.indexOf(b.day);
        if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;

        const timeIndexA = input.timeSlots.indexOf(a.timeSlot);
        const timeIndexB = input.timeSlots.indexOf(b.timeSlot);
        if (timeIndexA !== timeIndexB) return timeIndexA - timeIndexB;

        return a.className.localeCompare(b.className);
    });
    
    return { schedule };
}
