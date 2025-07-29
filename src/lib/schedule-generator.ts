
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
    classSubjectDayTracker: Record<string, Set<string>>; // "className-day" -> Set<subject>
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
        classSubjectDayTracker: {},
    };
    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { 
        bookings.classBookings[c] = new Set();
        daysOfWeek.forEach(d => {
            bookings.classSubjectDayTracker[`${c}-${d}`] = new Set();
        });
    });

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
        if (entry.teacher !== "N/A") {
            bookings.teacherBookings[entry.teacher]?.add(`${entry.day}-${entry.timeSlot}`);
        }
        const entryClasses = entry.className.split(' & ').map(c => c.trim());
        entryClasses.forEach(className => {
            if (bookings.classBookings[className]) {
                bookings.classBookings[className].add(`${entry.day}-${entry.timeSlot}`);
            }
            const dayClassKey = `${className}-${entry.day}`;
            if (bookings.classSubjectDayTracker[dayClassKey]) {
                bookings.classSubjectDayTracker[dayClassKey].add(entry.subject);
            }
        });
    };
    
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    
    // Pre-book Prayer and Lunch
    daysOfWeek.forEach(day => {
        if (prayerTimeSlot) {
            const prayerSubject = subjects.find(s => s.toLowerCase() === "prayer") || "Prayer";
            classes.forEach(className => {
                if(!isClassBooked(className, day, prayerTimeSlot)) {
                    bookSlot({ day, timeSlot: prayerTimeSlot, className, subject: prayerSubject, teacher: "N/A" });
                }
            });
        }
        if (lunchTimeSlot) {
            const lunchSubject = subjects.find(s => s.toLowerCase() === "lunch") || "Lunch";
             classes.forEach(className => {
                if(!isClassBooked(className, day, lunchTimeSlot)) {
                    bookSlot({ day, timeSlot: lunchTimeSlot, className, subject: lunchSubject, teacher: "N/A" });
                }
            });
        }
    });

    const getPeriodsForClass = (className: string) => {
        const required = classRequirements[className] || [];
        const generic = subjects.filter(s => ['Sports', 'Library', 'Computer'].includes(s));
        
        const weeklySlots = instructionalSlots.length * daysOfWeek.length;
        const periods = [];
        
        // Ensure each required subject appears at least once
        for (const subject of required) {
            periods.push(subject);
        }
        
        // Fill remaining slots by repeating required subjects, then adding generics
        let i = 0;
        while (periods.length < weeklySlots) {
            periods.push(required[i % required.length]);
            i++;
        }
        
        return shuffleArray(periods);
    };

    classes.forEach(className => {
        const periodsToSchedule = getPeriodsForClass(className);
        let periodIndex = 0;

        for (const day of daysOfWeek) {
            for (const timeSlot of instructionalSlots) {
                if (isClassBooked(className, day, timeSlot)) continue;

                let scheduled = false;
                for (let i = 0; i < periodsToSchedule.length && periodIndex < periodsToSchedule.length; i++) {
                    const subject = periodsToSchedule[periodIndex];
                    
                    const dayClassKey = `${className}-${day}`;
                    if (bookings.classSubjectDayTracker[dayClassKey]?.has(subject)) {
                        // If subject is already taught today, try the next one from the list
                        periodIndex++;
                        continue;
                    }

                    const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                        (teacherSubjects[t]?.includes(subject)) &&
                        (teacherClasses[t]?.includes(className)) &&
                        !isTeacherBooked(t, day, timeSlot) &&
                        !isTeacherUnavailable(t, day, timeSlot) &&
                        !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                    ));

                    if (potentialTeachers.length > 0) {
                        bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                        periodsToSchedule.splice(periodIndex, 1); // Remove scheduled period
                        scheduled = true;
                        break; 
                    } else {
                         // Can't find a teacher for this subject, try next subject
                         periodIndex++;
                    }
                }
                 // Reset index if we've run out of subjects to try for this slot
                if (periodIndex >= periodsToSchedule.length) {
                    periodIndex = 0;
                }
            }
        }
    });
    
     // Final fallback to prevent empty slots, though it should be rare now
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot)) {
                    // Find any subject that can be taught by an available teacher
                     const requiredForThisClass = classRequirements[className] || [];
                     const potentialSubjects = shuffleArray(requiredForThisClass);

                     for (const subject of potentialSubjects) {
                         const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                            teacherSubjects[t]?.includes(subject) &&
                            teacherClasses[t]?.includes(className) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot) &&
                            !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                        ));

                        if (potentialTeachers.length > 0) {
                            bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                            break;
                        }
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
