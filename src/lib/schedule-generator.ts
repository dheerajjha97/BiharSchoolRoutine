
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";

type Unavailability = {
    teacher: string;
    day: string;
    timeSlot: string;
}

export type SubjectPriority = "before" | "after" | "none";
export type SubjectCategory = "main" | "additional";

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
    enableCombinedClasses?: boolean;
    subjectCategories: Record<string, SubjectCategory>;
};

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacher -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
    classSubjectBookings: Record<string, Set<string>>; // className -> "day-subject"
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAILY_PERIOD_QUOTA = 6;

// Helper to shuffle an array
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
        // subjectPriorities, // This logic can be added later if needed
        classRequirements,
        teacherSubjects,
        teacherClasses,
        prayerTimeSlot,
        lunchTimeSlot,
        // enableCombinedClasses, // This logic can be added later if needed
        subjectCategories,
    } = input;

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = {
        teacherBookings: {},
        classBookings: {},
        classSubjectBookings: {},
    };
    
    // Initialize booking records
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
        bookings.classSubjectBookings[className]?.has(`${day}-${subject}`);
    
    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => 
        unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);

    const bookSlot = (entry: ScheduleEntry) => {
        schedule.push(entry);
        const { teacher, day, timeSlot, className, subject } = entry;
        
        if (teacher !== "N/A") {
            bookings.teacherBookings[teacher].add(`${day}-${timeSlot}`);
        }
        bookings.classBookings[className].add(`${day}-${timeSlot}`);
        if(subject !== "---") {
            bookings.classSubjectBookings[className].add(`${day}-${subject}`);
        }
    };

    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);

    // Step 1: Schedule fixed periods (Prayer & Lunch)
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            if (prayerTimeSlot) {
                bookSlot({ day, timeSlot: prayerTimeSlot, className, subject: "Prayer", teacher: "N/A" });
            }
            if (lunchTimeSlot) {
                bookSlot({ day, timeSlot: lunchTimeSlot, className, subject: "Lunch", teacher: "N/A" });
            }
        });
    });

    // Step 2: Schedule Main Subjects first, ensuring no repeats on the same day for a class.
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            const requiredSubjects = classRequirements[className] || [];
            const mainSubjectsForClass = requiredSubjects.filter(s => subjectCategories[s] === 'main');
            
            shuffleArray(mainSubjectsForClass).forEach(subject => {
                const qualifiedTeachers = teacherNames.filter(t => 
                    (teacherSubjects[t] || []).includes(subject) &&
                    (teacherClasses[t] || []).includes(className)
                );

                if (qualifiedTeachers.length > 0) {
                    const availableTeacher = shuffleArray(qualifiedTeachers).find(t => 
                        (bookings.teacherBookings[t]?.size % DAILY_PERIOD_QUOTA) < DAILY_PERIOD_QUOTA
                    );

                    if (availableTeacher) {
                        const availableSlot = shuffleArray(instructionalSlots).find(slot => 
                            !isTeacherBooked(availableTeacher, day, slot) &&
                            !isClassBooked(className, day, slot) &&
                            !isTeacherUnavailable(availableTeacher, day, slot) &&
                            !isClassSubjectBookedForDay(className, day, subject) // Crucial check
                        );

                        if(availableSlot) {
                            bookSlot({
                                day,
                                timeSlot: availableSlot,
                                className,
                                subject,
                                teacher: availableTeacher
                            });
                        }
                    }
                }
            });
        });
    });
    
    // Step 3: Fill remaining periods for each teacher up to the quota with additional subjects.
    daysOfWeek.forEach(day => {
        shuffleArray(teacherNames).forEach(teacher => {
            const assignedClasses = teacherClasses[teacher] || [];
            const assignedAdditionalSubjects = (teacherSubjects[teacher] || []).filter(s => subjectCategories[s] === 'additional');
            
            let teacherPeriodsToday = Array.from(bookings.teacherBookings[teacher]).filter(b => b.startsWith(day)).length;
            
            while (teacherPeriodsToday < DAILY_PERIOD_QUOTA) {
                let slotFilled = false;
                const potentialSlots = shuffleArray(instructionalSlots);
                const potentialClasses = shuffleArray(assignedClasses);
                const potentialSubjects = shuffleArray(assignedAdditionalSubjects);

                for (const slot of potentialSlots) {
                    if (isTeacherBooked(teacher, day, slot) || isTeacherUnavailable(teacher, day, slot)) continue;
                    
                    for (const className of potentialClasses) {
                        if (isClassBooked(className, day, slot)) continue;

                        for (const subject of potentialSubjects) {
                            // Ensure this additional subject is required by the class
                             if (!(classRequirements[className] || []).includes(subject)) continue;

                             bookSlot({ day, timeSlot: slot, className, subject, teacher });
                             teacherPeriodsToday++;
                             slotFilled = true;
                             break;
                        }
                        if (slotFilled) break;
                    }
                    if (slotFilled) break;
                }
                
                // If we can't find any valid slot, break to avoid infinite loop
                if (!slotFilled) {
                    break;
                }
            }
        });
    });

    // Step 4: Fill any truly empty slots with "---"
    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (!isClassBooked(className, day, timeSlot)) {
                    bookSlot({ day, timeSlot, className, subject: "---", teacher: "N/A" });
                }
            });
        });
    });

    // Final Step: Sort the schedule for display
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
