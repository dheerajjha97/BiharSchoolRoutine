
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
        subjectPriorities
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
        const validSecondary = secondarySubjects.filter(s => subjects.includes(s));
        return [...new Set([...required, ...validSecondary])];
    };

    const bookSlot = (entry: ScheduleEntry) => {
        if (entry.teacher !== "N/A" && isTeacherBooked(entry.teacher, entry.day, entry.timeSlot)) {
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
    const lunchIndex = lunchTimeSlot ? input.timeSlots.indexOf(lunchTimeSlot) : -1;
    const preLunchSlots = lunchIndex !== -1 ? instructionalSlots.filter(slot => input.timeSlots.indexOf(slot) < lunchIndex) : instructionalSlots;
    const postLunchSlots = lunchIndex !== -1 ? instructionalSlots.filter(slot => input.timeSlots.indexOf(slot) > lunchIndex) : [];

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

    const allTeacherTasks: TeacherTask[] = [];
    teacherNames.forEach(teacher => {
        const assignedClasses = teacherClasses[teacher] || [];
        const assignedSubjects = teacherSubjects[teacher] || [];

        assignedClasses.forEach(className => {
            const validSubjectsForClass = getValidSubjectsForClass(className);
            assignedSubjects.forEach(subject => {
                if (validSubjectsForClass.includes(subject)) {
                    allTeacherTasks.push({ teacher, className, subject });
                }
            });
        });
    });

    const scheduleTasks = (tasks: TeacherTask[], availableSlots: string[]) => {
        let tasksScheduledToday: TeacherTask[] = [];
        shuffleArray(tasks).forEach(task => {
            if (tasksScheduledToday.some(t => t.teacher === task.teacher && t.className === task.className && t.subject === task.subject)) {
                return;
            }

            const slot = shuffleArray(availableSlots).find(s => 
                !isClassBooked(task.className, day, s) &&
                !isTeacherBooked(task.teacher, day, s) &&
                !isTeacherUnavailable(task.teacher, day, s)
            );

            if (slot) {
                let classNamesToBook = [task.className];
                if (enableCombinedClasses && !secondarySubjects.includes(task.subject)) {
                    const grade = getGradeFromClassName(task.className);
                    if (grade) {
                        const partners = classes.filter(c => 
                            c !== task.className &&
                            getGradeFromClassName(c) === grade &&
                            (teacherClasses[task.teacher] || []).includes(c) &&
                            getValidSubjectsForClass(c).includes(task.subject) &&
                            !isClassBooked(c, day, slot)
                        );
                        classNamesToBook.push(...partners);
                    }
                }
                const allCanBeBooked = classNamesToBook.every(c => !isClassBooked(c, day, slot));
                if (allCanBeBooked) {
                    bookSlot({
                        day,
                        timeSlot: slot,
                        className: classNamesToBook.sort().join(' & '),
                        subject: task.subject,
                        teacher: task.teacher
                    });
                    tasksScheduledToday.push(task);
                }
            }
        });
    };

    daysOfWeek.forEach(day => {
        const beforeLunchTasks = allTeacherTasks.filter(t => subjectPriorities[t.subject] === 'before');
        const afterLunchTasks = allTeacherTasks.filter(t => subjectPriorities[t.subject] === 'after');
        const noPreferenceTasks = allTeacherTasks.filter(t => !subjectPriorities[t.subject] || subjectPriorities[t.subject] === 'none');

        scheduleTasks(beforeLunchTasks, preLunchSlots);
        scheduleTasks(noPreferenceTasks, preLunchSlots); // Try to fill remaining pre-lunch with normal tasks
        scheduleTasks(afterLunchTasks, postLunchSlots);
        scheduleTasks(noPreferenceTasks, postLunchSlots); // Fill post-lunch with remaining normal tasks
    });

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
