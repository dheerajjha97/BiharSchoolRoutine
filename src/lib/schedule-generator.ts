
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
    teacher: string;
    className: string;
    subject: string;
};

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacher -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const secondarySubjects = ["Computer", "Sports", "Library"];

const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const getGradeFromClassName = (className: string): string | null => {
    const match = className.match(/^(\d+)/);
    return match ? match[1] : null;
};


export function generateScheduleLogic(input: GenerateScheduleLogicInput): GenerateScheduleOutput {
    const {
        teacherNames,
        classes,
        subjects,
        unavailability,
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

    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { bookings.classBookings[c] = new Set(); });

    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => 
        bookings.teacherBookings[teacher]?.has(`${day}-${timeSlot}`);

    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => 
        bookings.classBookings[className]?.has(`${day}-${timeSlot}`);

    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => 
        unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);
        
    const getValidSubjectsForClass = (className: string): string[] => {
        const required = input.classRequirements[className] || [];
        // Only include secondary subjects if they are in the main subject list for this app instance
        const validSecondary = secondarySubjects.filter(s => subjects.includes(s));
        return [...new Set([...required, ...validSecondary])];
    };

    const bookSlot = (entry: ScheduleEntry) => {
        // Double check for teacher clashes before booking
        if (entry.teacher !== "N/A" && isTeacherBooked(entry.teacher, entry.day, entry.timeSlot)) {
            // This should not happen with the new logic, but as a safeguard
            console.warn(`Attempted to double-book teacher: ${entry.teacher} on ${entry.day} at ${entry.timeSlot}`);
            return;
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
    
    const instructionalSlots = input.timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    
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

    // 2. Create a list of all tasks for all teachers
    const allTeacherTasks: TeacherTask[] = [];
    teacherNames.forEach(teacher => {
        const assignedClasses = teacherClasses[teacher] || [];
        const assignedSubjects = teacherSubjects[teacher] || [];

        assignedClasses.forEach(className => {
            const validSubjects = getValidSubjectsForClass(className);
            assignedSubjects.forEach(subject => {
                if (validSubjects.includes(subject)) {
                    allTeacherTasks.push({ teacher, className, subject });
                }
            });
        });
    });

    // 3. Schedule based on daily teacher tasks
    daysOfWeek.forEach(day => {
        const dailyTasks = shuffleArray(allTeacherTasks);
        let tasksScheduledThisDay: TeacherTask[] = [];

        dailyTasks.forEach(task => {
            // Avoid scheduling the same specific task (teacher-class-subject) twice a day unless necessary
            if (tasksScheduledThisDay.some(t => t.teacher === task.teacher && t.className === task.className && t.subject === task.subject)) {
                return;
            }

            const availableSlots = shuffleArray(instructionalSlots).filter(slot => 
                !isClassBooked(task.className, day, slot) &&
                !isTeacherBooked(task.teacher, day, slot) &&
                !isTeacherUnavailable(task.teacher, day, slot)
            );

            if (availableSlots.length > 0) {
                let classNamesToBook = [task.className];

                if (enableCombinedClasses && !secondarySubjects.includes(task.subject)) {
                    const grade = getGradeFromClassName(task.className);
                    if (grade) {
                        const potentialPartners = classes.filter(c => 
                            c !== task.className &&
                            getGradeFromClassName(c) === grade &&
                            (teacherClasses[task.teacher] || []).includes(c) && // Teacher must be assigned to the other class
                            (teacherSubjects[task.teacher] || []).includes(task.subject) && // And the subject
                            getValidSubjectsForClass(c).includes(task.subject) && // And it must be a valid subject for that class
                            !isClassBooked(c, day, availableSlots[0]) // And that class must be free
                        );
                        
                        if (potentialPartners.length > 0) {
                           classNamesToBook.push(...potentialPartners);
                        }
                    }
                }

                 // Final check to ensure all classes in the combined group are available
                const allCanBeBooked = classNamesToBook.every(c => !isClassBooked(c, day, availableSlots[0]));

                if(allCanBeBooked) {
                    bookSlot({
                        day,
                        timeSlot: availableSlots[0],
                        className: classNamesToBook.sort().join(' & '),
                        subject: task.subject,
                        teacher: task.teacher
                    });
                    tasksScheduledThisDay.push(task);
                }
            }
        });
    });

    // 4. Fill any remaining empty slots
     daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            shuffleArray(classes).forEach(className => {
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
