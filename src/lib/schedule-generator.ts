
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
    enableCombinedClasses?: boolean;
};

type TeacherTask = {
    className: string;
    subject: string;
    teacher: string;
};

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacher -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const secondarySubjects = ["Computer", "Sports", "Library"];

// Helper to shuffle an array
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Helper to get valid subjects for a class
const getValidSubjectsForClass = (className: string, allSubjects: string[], classRequirements: Record<string, string[]>): string[] => {
    const required = classRequirements[className] || [];
    // Ensure secondary subjects are only added if they exist in the master subject list
    const validSecondary = secondarySubjects.filter(s => allSubjects.includes(s));
    return [...new Set([...required, ...validSecondary])];
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
        enableCombinedClasses,
    } = input;

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = {
        teacherBookings: {},
        classBookings: {},
    };

    // Initialize booking records
    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { bookings.classBookings[c] = new Set(); });
    
    // --- Helper Functions ---
    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => 
        bookings.teacherBookings[teacher]?.has(`${day}-${timeSlot}`);

    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => 
        bookings.classBookings[className]?.has(`${day}-${timeSlot}`);

    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => 
        unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);
        
    const bookSlot = (entry: ScheduleEntry) => {
        if (entry.teacher !== "N/A" && isTeacherBooked(entry.teacher, entry.day, entry.timeSlot)) {
            console.warn(`Booking conflict for teacher ${entry.teacher} on ${entry.day} at ${entry.timeSlot}`);
            return; // Prevent double booking
        }

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
    
    // --- Step 1: Schedule Fixed Periods (Prayer & Lunch) ---
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
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

    // --- Step 2: Create a list of all required periods for the week ---
    const weeklyTasks: TeacherTask[] = [];
    const totalSlotsPerWeek = instructionalSlots.length * daysOfWeek.length;
    
    classes.forEach(className => {
        const requiredSubjects = classRequirements[className] || [];
        const periodsPerSubject = requiredSubjects.length > 0 ? Math.floor(totalSlotsPerWeek / requiredSubjects.length) : 0;

        requiredSubjects.forEach(subject => {
            for (let i = 0; i < periodsPerSubject; i++) {
                // Find a teacher for this class/subject
                const qualifiedTeachers = teacherNames.filter(t => 
                    (teacherClasses[t] || []).includes(className) &&
                    (teacherSubjects[t] || []).includes(subject)
                );
                if (qualifiedTeachers.length > 0) {
                     weeklyTasks.push({ className, subject, teacher: qualifiedTeachers[0] }); // Simple assignment, could be improved
                }
            }
        });
    });

    // --- Step 3: Schedule all tasks from the weekly list ---
    const shuffledTasks = shuffleArray(weeklyTasks);

    shuffledTasks.forEach(task => {
        const potentialSlots = shuffleArray(
            daysOfWeek.flatMap(day => 
                instructionalSlots.map(slot => ({day, slot}))
            )
        );

        for (const {day, slot} of potentialSlots) {
             if (!isClassBooked(task.className, day, slot) &&
                 !isTeacherBooked(task.teacher, day, slot) &&
                 !isTeacherUnavailable(task.teacher, day, slot)) 
            {
                bookSlot({
                    day,
                    timeSlot: slot,
                    className: task.className,
                    subject: task.subject,
                    teacher: task.teacher
                });
                break; // Task scheduled, move to the next task
            }
        }
    });

    // --- Step 4: Fill any remaining empty slots ---
    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (!isClassBooked(className, day, timeSlot)) {
                    // Try to find a secondary subject with an available teacher
                    const secondary = shuffleArray(secondarySubjects.filter(s => subjects.includes(s)));
                    let filled = false;
                    for (const subject of secondary) {
                        const qualifiedTeachers = teacherNames.filter(t => 
                            (teacherSubjects[t] || []).includes(subject) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot)
                        );
                        if (qualifiedTeachers.length > 0) {
                             bookSlot({ day, timeSlot, className, subject, teacher: qualifiedTeachers[0] });
                             filled = true;
                             break;
                        }
                    }

                    if (!filled) {
                         bookSlot({ day, timeSlot, className, subject: "---", teacher: "N/A" });
                    }
                }
            });
        });
    });


    // --- Final Step: Sort the schedule for display ---
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
