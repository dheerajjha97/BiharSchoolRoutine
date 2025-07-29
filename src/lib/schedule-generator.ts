
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

// Helper to get valid subjects for a class, respecting classRequirements
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

    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => 
        bookings.teacherBookings[teacher]?.has(`${day}-${timeSlot}`);

    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => 
        bookings.classBookings[className]?.has(`${day}-${timeSlot}`);
    
    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => 
        unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);

    const bookSlot = (entry: ScheduleEntry) => {
        if (entry.teacher && entry.teacher !== "N/A" && isTeacherBooked(entry.teacher, entry.day, entry.timeSlot)) {
            console.warn(`Booking conflict for teacher ${entry.teacher} on ${entry.day} at ${entry.timeSlot}`);
            return;
        }
        
        const entryClasses = entry.className.split(' & ').map(c => c.trim());
        for (const c of entryClasses) {
            if (isClassBooked(c, entry.day, entry.timeSlot)) {
                 console.warn(`Booking conflict for class ${c} on ${entry.day} at ${entry.timeSlot}`);
                 return;
            }
        }
        
        schedule.push(entry);
        const { teacher, day, timeSlot } = entry;
        
        if (teacher !== "N/A") {
            bookings.teacherBookings[teacher].add(`${day}-${timeSlot}`);
        }
        entryClasses.forEach(c => {
            bookings.classBookings[c].add(`${day}-${timeSlot}`);
        });
    };

    // Step 1: Schedule fixed periods (Prayer & Lunch)
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
    
    // Step 2: Create a list of all teaching tasks for each teacher.
    const teacherWorkload: Record<string, TeacherTask[]> = {};
    teacherNames.forEach(teacher => {
        teacherWorkload[teacher] = [];
        const assignedClasses = teacherClasses[teacher] || [];
        const assignedSubjects = teacherSubjects[teacher] || [];

        assignedClasses.forEach(className => {
            assignedSubjects.forEach(subject => {
                // Ensure the subject is actually required for that class
                const validSubjects = getValidSubjectsForClass(className, subjects, classRequirements);
                if (validSubjects.includes(subject)) {
                    teacherWorkload[teacher].push({ className, subject });
                }
            });
        });
    });

    // Step 3: Iterate through each day and try to schedule each teacher's daily tasks.
    let remainingTasks: { teacher: string; task: TeacherTask }[] = [];

    daysOfWeek.forEach(day => {
        const shuffledTeachers = shuffleArray(teacherNames);
        shuffledTeachers.forEach(teacher => {
            const todaysTasks = shuffleArray(teacherWorkload[teacher]);
            
            todaysTasks.forEach(task => {
                const availableSlots = shuffleArray(instructionalSlots);
                let isScheduled = false;

                // Find a slot for this specific task on this day
                for (const timeSlot of availableSlots) {
                    if (!isTeacherBooked(teacher, day, timeSlot) &&
                        !isClassBooked(task.className, day, timeSlot) &&
                        !isTeacherUnavailable(teacher, day, timeSlot))
                    {
                        bookSlot({
                            day,
                            timeSlot,
                            className: task.className,
                            subject: task.subject,
                            teacher,
                        });
                        isScheduled = true;
                        break; // Move to the next task for this teacher
                    }
                }

                if (!isScheduled) {
                    // If we couldn't schedule this task today, add it to the list of remaining tasks for later
                    remainingTasks.push({ teacher, task });
                }
            });
        });
    });

    // Step 4: Try to schedule any remaining tasks in any available slot in the week
    remainingTasks.forEach(({ teacher, task }) => {
        const potentialSlots = shuffleArray(
            daysOfWeek.flatMap(day => 
                instructionalSlots.map(slot => ({day, timeSlot: slot}))
            )
        );

        for (const { day, timeSlot } of potentialSlots) {
             if (!isTeacherBooked(teacher, day, timeSlot) &&
                 !isClassBooked(task.className, day, timeSlot) &&
                 !isTeacherUnavailable(teacher, day, timeSlot)) 
            {
                bookSlot({
                    day,
                    timeSlot,
                    className: task.className,
                    subject: task.subject,
                    teacher
                });
                break; // Task scheduled, move to the next remaining task
            }
        }
    });

    // Step 5: Fill any truly empty slots with "---"
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
