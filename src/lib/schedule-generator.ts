
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
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
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
        if (entry.teacher !== "N/A" && bookings.teacherBookings[entry.teacher]) {
            bookings.teacherBookings[entry.teacher].add(`${entry.day}-${entry.timeSlot}`);
        }
        const entryClasses = entry.className.split(' & ').map(c => c.trim());
        entryClasses.forEach(className => {
            if (bookings.classBookings[className]) {
                bookings.classBookings[className].add(`${entry.day}-${entry.timeSlot}`);
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

    // 2. Build a list of all required periods for the week for each class
    const weeklyPeriods: Record<string, string[]> = {};
    classes.forEach(className => {
        const required = classRequirements[className] || [];
        if (required.length === 0) {
            weeklyPeriods[className] = [];
            return;
        }
        const totalSlots = instructionalSlots.length * daysOfWeek.length;
        const periods: string[] = [];
        
        // Add required subjects
        required.forEach(sub => periods.push(sub));

        // Fill remaining slots by repeating required subjects
        let i = 0;
        while (periods.length < totalSlots) {
            periods.push(required[i % required.length]);
            i++;
        }
        weeklyPeriods[className] = shuffleArray(periods);
    });

    // 3. Schedule required periods
    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (isClassBooked(className, day, timeSlot)) return;

                const periodsForClass = weeklyPeriods[className];
                if (!periodsForClass || periodsForClass.length === 0) return;

                for (let i = 0; i < periodsForClass.length; i++) {
                    const subject = periodsForClass[i];
                    
                    const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                        (teacherSubjects[t]?.includes(subject)) &&
                        (teacherClasses[t]?.includes(className)) &&
                        !isTeacherBooked(t, day, timeSlot) && // This is the crucial check
                        !isTeacherUnavailable(t, day, timeSlot) &&
                        !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                    ));

                    if (potentialTeachers.length > 0) {
                        bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                        periodsForClass.splice(i, 1); // Remove scheduled period
                        return; // Move to the next class/slot
                    }
                }
            });
        });
    });

    // 4. Fill any remaining gaps with secondary subjects or repeated primary subjects
    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (isClassBooked(className, day, timeSlot)) return;

                const possibleSubjects = shuffleArray([
                    ...(classRequirements[className] || []),
                    ...secondarySubjects
                ]);

                for (const subject of possibleSubjects) {
                     const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                        (teacherSubjects[t]?.includes(subject)) &&
                        (teacherClasses[t]?.includes(className)) &&
                        !isTeacherBooked(t, day, timeSlot) &&
                        !isTeacherUnavailable(t, day, timeSlot) &&
                        !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                    ));

                    if (potentialTeachers.length > 0) {
                        bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                        return;
                    }
                }
                
                // If still nothing, book as a generic empty slot to avoid crashes, though this shouldn't be reached.
                if (!isClassBooked(className, day, timeSlot)) {
                    bookSlot({ day, timeSlot, className, subject: "---", teacher: "N/A" });
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
