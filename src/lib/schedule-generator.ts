
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
};

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacher -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper function to shuffle an array
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
        timeSlots,
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
        prayerTimeSlot,
        lunchTimeSlot,
    } = input;

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = {
        teacherBookings: {},
        classBookings: {},
    };

    // Initialize bookings
    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { bookings.classBookings[c] = new Set(); });

    const bookSlot = (entry: ScheduleEntry) => {
        schedule.push(entry);
        if (entry.teacher !== "N/A") {
            bookings.teacherBookings[entry.teacher].add(`${entry.day}-${entry.timeSlot}`);
        }
        
        // Handle combined classes
        const entryClasses = entry.className.split(' & ').map(c => c.trim());
        entryClasses.forEach(className => {
            if (bookings.classBookings[className]) {
                bookings.classBookings[className].add(`${entry.day}-${entry.timeSlot}`);
            }
        });
    };
    
    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => {
        return bookings.teacherBookings[teacher]?.has(`${day}-${timeSlot}`);
    };
    
    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => {
         return bookings.classBookings[className]?.has(`${day}-${timeSlot}`);
    }

    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => {
        return unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);
    }
    
    // 1. Handle fixed-time subjects like Prayer and Lunch first
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    
    daysOfWeek.forEach(day => {
        if (prayerTimeSlot) {
            const prayerSubject = subjects.find(s => s.toLowerCase() === "prayer") || "Prayer";
            classes.forEach(className => {
                bookSlot({ day, timeSlot: prayerTimeSlot, className, subject: prayerSubject, teacher: "N/A" });
            });
            teacherNames.forEach(t => bookings.teacherBookings[t].add(`${day}-${prayerTimeSlot}`));
        }
        if (lunchTimeSlot) {
            const lunchSubject = subjects.find(s => s.toLowerCase() === "lunch") || "Lunch";
             classes.forEach(className => {
                bookSlot({ day, timeSlot: lunchTimeSlot, className, subject: lunchSubject, teacher: "N/A" });
            });
            teacherNames.forEach(t => bookings.teacherBookings[t].add(`${day}-${lunchTimeSlot}`));
        }
    });
    
    // 2. Create a pool of all required classes to be scheduled
    const schedulingPool: { className: string, subject: string }[] = [];
    classes.forEach(className => {
        const requirements = classRequirements[className] || [];
        requirements.forEach(subject => {
            // Exclude subjects that are handled specially
            if (subject.toLowerCase() !== 'prayer' && subject.toLowerCase() !== 'lunch') {
                schedulingPool.push({ className, subject });
            }
        });
    });
    
    // Shuffle the pool to ensure fairness
    const shuffledPool = shuffleArray(schedulingPool);
    const lunchSlotIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : -1;

    // 3. Iteratively try to place each required class
    shuffledPool.forEach(({ className, subject }) => {
        let isScheduled = false;

        const sortedDays = shuffleArray(daysOfWeek);
        const sortedSlots = shuffleArray(instructionalSlots);

        // Sort slots based on subject priority
        sortedSlots.sort((a, b) => {
            const priority = subjectPriorities[subject] || 'none';
            const indexA = timeSlots.indexOf(a);
            const indexB = timeSlots.indexOf(b);

            if (priority === 'before') {
                if (lunchSlotIndex !== -1) {
                    if (indexA < lunchSlotIndex && indexB >= lunchSlotIndex) return -1;
                    if (indexA >= lunchSlotIndex && indexB < lunchSlotIndex) return 1;
                }
                return indexA - indexB; // Prioritize earlier slots
            } else if (priority === 'after') {
                 if (lunchSlotIndex !== -1) {
                    if (indexA > lunchSlotIndex && indexB <= lunchSlotIndex) return -1;
                    if (indexA <= lunchSlotIndex && indexB > lunchSlotIndex) return 1;
                }
                return indexB - indexA; // Prioritize later slots
            }
             return Math.random() - 0.5; // No preference, random
        });

        // Find potential teachers
        const potentialTeachers = teacherNames.filter(t => 
            (teacherSubjects[t]?.includes(subject)) &&
            (teacherClasses[t]?.includes(className))
        );

        for (const day of sortedDays) {
            // Rule: Don't schedule the same subject for the same class twice on the same day if possible
            const subjectsTaughtToday = schedule
                .filter(e => e.day === day && e.className === className)
                .map(e => e.subject);
            if (subjectsTaughtToday.includes(subject)) {
                continue; // Skip to next day if this subject is already taught
            }
            
            for (const timeSlot of sortedSlots) {
                if (!isClassBooked(className, day, timeSlot)) {
                    
                    const availableTeachers = shuffleArray(potentialTeachers.filter(t => 
                        !isTeacherBooked(t, day, timeSlot) &&
                        !isTeacherUnavailable(t, day, timeSlot)
                    ));

                    if (availableTeachers.length > 0) {
                        const teacher = availableTeachers[0];
                        bookSlot({ day, timeSlot, className, subject, teacher });
                        isScheduled = true;
                        break; // Move to the next item in the pool
                    }
                }
            }
            if (isScheduled) break;
        }

        // If after trying all days, it's still not scheduled (e.g. no available teacher),
        // try to place it with "N/A" teacher
        if (!isScheduled) {
             for (const day of sortedDays) {
                for (const timeSlot of sortedSlots) {
                     if (!isClassBooked(className, day, timeSlot)) {
                         const subjectsTaughtToday = schedule
                            .filter(e => e.day === day && e.className === className)
                            .map(e => e.subject);
                        if (subjectsTaughtToday.includes(subject)) continue;

                         bookSlot({ day, timeSlot, className, subject, teacher: "N/A" });
                         isScheduled = true;
                         break;
                     }
                }
                 if (isScheduled) break;
             }
        }
    });

    // 4. Fill any remaining empty slots with non-essential subjects (e.g. Library, Sports)
    const nonEssentialSubjects = subjects.filter(s => {
        const sLower = s.toLowerCase();
        return sLower !== 'prayer' && sLower !== 'lunch' && !Object.values(classRequirements).flat().includes(s);
    });

    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (!isClassBooked(className, day, timeSlot)) {
                    const availableSubjects = shuffleArray(nonEssentialSubjects);
                    for (const subject of availableSubjects) {
                        const potentialTeachers = teacherNames.filter(t => 
                            (teacherSubjects[t]?.includes(subject)) &&
                            (teacherClasses[t]?.includes(className)) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot)
                        );
                        
                        if (potentialTeachers.length > 0) {
                            bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                            break;
                        }
                    }
                }
            });
        });
    });


    // Sort the final schedule for consistent output
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
