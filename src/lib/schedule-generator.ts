
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
    classSubjectCount: Record<string, Record<string, number>>; // className -> subject -> count
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

// New helper function to get valid subjects for a class
const getValidSubjectsForClass = (className: string, classRequirements: Record<string, string[]>): string[] => {
    const required = classRequirements[className] || [];
    // A subject is valid if it's required OR it's a generic secondary subject.
    // This prevents "Main Subject 2" from being assigned to "9th".
    const validSubjects = [...new Set([...required, ...secondarySubjects])];
    return validSubjects;
};


export function generateScheduleLogic(input: GenerateScheduleLogicInput): GenerateScheduleOutput {
    const {
        teacherNames,
        classes,
        unavailability,
        teacherSubjects,
        teacherClasses,
        classRequirements,
        prayerTimeSlot,
        lunchTimeSlot,
        preventConsecutiveClasses = true,
    } = input;

    const timeSlots = [...input.timeSlots];
    const schedule: ScheduleEntry[] = [];
    
    const bookings: Booking = {
        teacherBookings: {},
        classBookings: {},
        classSubjectCount: {},
    };

    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => {
        bookings.classBookings[c] = new Set();
        bookings.classSubjectCount[c] = {};
        input.subjects.forEach(s => {
            bookings.classSubjectCount[c][s] = 0;
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
        const { teacher, day, timeSlot, className, subject } = entry;
        
        if (teacher !== "N/A" && bookings.teacherBookings[teacher]) {
            bookings.teacherBookings[teacher].add(`${day}-${timeSlot}`);
        }
        
        const entryClasses = className.split(' & ').map(c => c.trim());
        entryClasses.forEach(c => {
            if (bookings.classBookings[c]) {
                bookings.classBookings[c].add(`${day}-${timeSlot}`);
            }
            if (bookings.classSubjectCount[c] && subject !== "---" && subject !== "Prayer" && subject !== "Lunch") {
                bookings.classSubjectCount[c][subject] = (bookings.classSubjectCount[c][subject] || 0) + 1;
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

    // 2. Build a list of all required periods for the week
    const allRequiredTasks: TeacherTask[] = [];
    classes.forEach(className => {
        const requirements = classRequirements[className] || [];
        const periodsPerDay = instructionalSlots.length;
        const totalPeriods = daysOfWeek.length * periodsPerDay;
        const periodsPerSubject = Math.max(1, Math.floor(totalPeriods / (requirements.length || 1)));

        requirements.forEach(subject => {
            for(let i=0; i < periodsPerSubject; i++) {
                 const teachersForSubject = teacherNames.filter(t => 
                    teacherSubjects[t]?.includes(subject) && teacherClasses[t]?.includes(className)
                );
                if(teachersForSubject.length > 0) {
                     allRequiredTasks.push({
                        teacher: teachersForSubject[Math.floor(Math.random() * teachersForSubject.length)],
                        className,
                        subject
                    });
                }
            }
        });
    });

    // 3. Schedule the required periods
    const shuffledTasks = shuffleArray(allRequiredTasks);
    daysOfWeek.forEach(day => {
        shuffleArray(instructionalSlots).forEach(timeSlot => {
             shuffleArray(classes).forEach(className => {
                if(isClassBooked(className, day, timeSlot)) return;

                const taskIndex = shuffledTasks.findIndex(task => task.className === className && !isTeacherBooked(task.teacher, day, timeSlot) && !isTeacherUnavailable(task.teacher, day, timeSlot) && !hasTooManyConsecutiveClasses(task.teacher, day, timeSlot, timeSlots));

                if(taskIndex !== -1) {
                    const [task] = shuffledTasks.splice(taskIndex, 1);
                    bookSlot({ day, timeSlot, ...task });
                }
             });
        });
    });

    // 4. Fill remaining empty slots with valid subjects
    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (!isClassBooked(className, day, timeSlot)) {
                    let filled = false;
                    // Use the new helper function to get a list of valid subjects
                    const validSubjects = getValidSubjectsForClass(className, classRequirements);

                    for (const subject of shuffleArray(validSubjects)) {
                         const potentialTeachers = shuffleArray(teacherNames.filter(t =>
                            teacherSubjects[t]?.includes(subject) &&
                            teacherClasses[t]?.includes(className) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot) &&
                            !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                        ));

                        if (potentialTeachers.length > 0) {
                            bookSlot({
                                day,
                                timeSlot,
                                className,
                                subject,
                                teacher: potentialTeachers[0]
                            });
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
