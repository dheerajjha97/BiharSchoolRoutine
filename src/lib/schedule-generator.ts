
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
        unavailability,
        teacherSubjects,
        teacherClasses,
        prayerTimeSlot,
        lunchTimeSlot,
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

    // 2. Create daily tasks for each teacher based on their assigned classes and subjects.
    const teacherDailyTasks: Record<string, TeacherTask[]> = {};
    teacherNames.forEach(teacher => {
        teacherDailyTasks[teacher] = [];
        const assignedClasses = teacherClasses[teacher] || [];
        const assignedSubjects = teacherSubjects[teacher] || [];

        assignedClasses.forEach(className => {
            assignedSubjects.forEach(subject => {
                // Add this task only if the teacher is actually assigned this subject for this class
                 if ((input.classRequirements[className] || []).includes(subject) || ["Computer", "Sports", "Library"].includes(subject)) {
                    teacherDailyTasks[teacher].push({ teacher, className, subject });
                }
            });
        });
    });


    // 3. Schedule based on daily teacher tasks
    daysOfWeek.forEach(day => {
        shuffleArray(teacherNames).forEach(teacher => {
            const tasksForDay = shuffleArray(teacherDailyTasks[teacher] || []);
            
            tasksForDay.forEach(task => {
                const availableSlots = shuffleArray(instructionalSlots).filter(slot => 
                    !isClassBooked(task.className, day, slot) &&
                    !isTeacherBooked(task.teacher, day, slot) &&
                    !isTeacherUnavailable(task.teacher, day, slot)
                );

                if (availableSlots.length > 0) {
                    bookSlot({
                        day,
                        timeSlot: availableSlots[0],
                        className: task.className,
                        subject: task.subject,
                        teacher: task.teacher
                    });
                }
            });
        });
    });

    // 4. Fill any remaining empty slots
     daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
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
