
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
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
        prayerTimeSlot,
        lunchTimeSlot,
    } = input;
    
    // Use a mutable timeSlots array that we can modify
    let timeSlots = [...input.timeSlots];

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
            bookings.teacherBookings[entry.teacher]?.add(`${entry.day}-${entry.timeSlot}`);
        }
        
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
    const lunchSlotIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : -1;
    
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
    
    // 2. Create a pool of all required classes to be scheduled for the week
    const weeklySchedulingPool: { className: string, subject: string }[] = [];
    classes.forEach(className => {
        const requirements = classRequirements[className] || [];
        requirements.forEach(subject => {
            if (subject.toLowerCase() !== 'prayer' && subject.toLowerCase() !== 'lunch') {
                // Determine how many times this subject should be taught per week
                // For simplicity, let's assume once per day for 6 days. This can be made more complex.
                for (let i = 0; i < daysOfWeek.length; i++) {
                    weeklySchedulingPool.push({ className, subject });
                }
            }
        });
    });

    const shuffledPool = shuffleArray(weeklySchedulingPool);

    // 3. Iteratively try to place each required class
    shuffledPool.forEach(({ className, subject }) => {
        let isScheduled = false;

        const sortedDays = shuffleArray(daysOfWeek);
        const sortedSlots = shuffleArray(instructionalSlots);

        sortedSlots.sort((a, b) => {
            const priority = subjectPriorities[subject] || 'none';
            const indexA = timeSlots.indexOf(a);
            const indexB = timeSlots.indexOf(b);

            if (priority === 'before' && lunchSlotIndex !== -1) {
                if (indexA < lunchSlotIndex && indexB >= lunchSlotIndex) return -1;
                if (indexA >= lunchSlotIndex && indexB < lunchSlotIndex) return 1;
            } else if (priority === 'after' && lunchSlotIndex !== -1) {
                if (indexA > lunchSlotIndex && indexB <= lunchSlotIndex) return 1;
                if (indexA <= lunchSlotIndex && indexB > lunchSlotIndex) return -1;
            }
            return Math.random() - 0.5; // Fallback to random shuffle
        });

        const potentialTeachers = shuffleArray(teacherNames.filter(t => 
            (teacherSubjects[t]?.includes(subject)) &&
            (teacherClasses[t]?.includes(className))
        ));
        
        for (const day of sortedDays) {
            const subjectsTaughtToday = schedule
                .filter(e => e.day === day && e.className === className)
                .map(e => e.subject);
            if (subjectsTaughtToday.includes(subject)) {
                continue;
            }
            
            for (const timeSlot of sortedSlots) {
                if (!isClassBooked(className, day, timeSlot)) {
                    const availableTeacher = potentialTeachers.find(t => 
                        !isTeacherBooked(t, day, timeSlot) &&
                        !isTeacherUnavailable(t, day, timeSlot)
                    );

                    if (availableTeacher) {
                        bookSlot({ day, timeSlot, className, subject, teacher: availableTeacher });
                        isScheduled = true;
                        break;
                    }
                }
            }
            if (isScheduled) break;
        }
    });

    // 4. Fill remaining empty slots with any available non-essential subject
    const nonEssentialSubjects = subjects.filter(s => {
        const sLower = s.toLowerCase();
        return sLower !== 'prayer' && sLower !== 'lunch' && !Object.values(classRequirements).flat().includes(s);
    });

    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot)) {
                    const subjectsTaughtToday = schedule
                        .filter(e => e.day === day && e.className === className)
                        .map(e => e.subject);

                    const allPossibleSubjects = shuffleArray([
                        ...nonEssentialSubjects
                    ]);
                    
                    let filled = false;
                    for (const subject of allPossibleSubjects) {
                         if (subjectsTaughtToday.includes(subject) || subject.toLowerCase() === 'prayer' || subject.toLowerCase() === 'lunch') {
                            continue;
                        }

                        const potentialTeachers = shuffleArray(teacherNames.filter(t =>
                            teacherSubjects[t]?.includes(subject) &&
                            teacherClasses[t]?.includes(className) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot)
                        ));

                        if (potentialTeachers.length > 0) {
                            bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                            filled = true;
                            break;
                        }
                    }

                    // If still not filled (e.g., no teacher available), assign N/A with a placeholder subject
                    if (!filled) {
                        const placeholderSubject = nonEssentialSubjects.find(s => !subjectsTaughtToday.includes(s)) || "Free Period";
                        bookSlot({ day, timeSlot, className, subject: placeholderSubject, teacher: 'N/A' });
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

        const timeIndexA = input.timeSlots.indexOf(a.timeSlot);
        const timeIndexB = input.timeSlots.indexOf(b.timeSlot);
        if (timeIndexA !== timeIndexB) return timeIndexA - timeIndexB;

        return a.className.localeCompare(b.className);
    });
    
    return { schedule };
}
