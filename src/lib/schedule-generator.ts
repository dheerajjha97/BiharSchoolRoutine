
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
    
    let timeSlots = [...input.timeSlots];

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = {
        teacherBookings: {},
        classBookings: {},
    };

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
    
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    const lunchSlotIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : -1;
    
    daysOfWeek.forEach(day => {
        if (prayerTimeSlot) {
            const prayerSubject = subjects.find(s => s.toLowerCase() === "prayer") || "Prayer";
            classes.forEach(className => {
                bookSlot({ day, timeSlot: prayerTimeSlot, className, subject: prayerSubject, teacher: "N/A" });
            });
        }
        if (lunchTimeSlot) {
            const lunchSubject = subjects.find(s => s.toLowerCase() === "lunch") || "Lunch";
             classes.forEach(className => {
                bookSlot({ day, timeSlot: lunchTimeSlot, className, subject: lunchSubject, teacher: "N/A" });
            });
        }
    });
    
    const requiredClassesPool: { className: string, subject: string }[] = [];
    classes.forEach(className => {
        const requirements = classRequirements[className] || [];
        requirements.forEach(subject => {
            if (subject.toLowerCase() !== 'prayer' && subject.toLowerCase() !== 'lunch') {
                requiredClassesPool.push({ className, subject });
            }
        });
    });

    const shuffledPool = shuffleArray(requiredClassesPool);

    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            const requirements = classRequirements[className] || [];
            let subjectsToScheduleToday = shuffleArray(requirements.filter(s => s.toLowerCase() !== 'prayer' && s.toLowerCase() !== 'lunch'));

            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot) && subjectsToScheduleToday.length > 0) {
                    let scheduled = false;
                    for (let i = 0; i < subjectsToScheduleToday.length; i++) {
                        const subject = subjectsToScheduleToday[i];
                        
                        const subjectsAlreadyScheduledToday = schedule.filter(e => e.day === day && e.className === className).map(e => e.subject);
                        if(subjectsAlreadyScheduledToday.includes(subject)) {
                           continue;
                        }

                        const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                            (teacherSubjects[t]?.includes(subject)) &&
                            (teacherClasses[t]?.includes(className)) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot)
                        ));

                        if (potentialTeachers.length > 0) {
                            bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                            subjectsToScheduleToday.splice(i, 1);
                            scheduled = true;
                            break;
                        }
                    }
                }
            });
        });
    });

    const nonEssentialSubjects = shuffleArray(subjects.filter(s => {
        const sLower = s.toLowerCase();
        return sLower !== 'prayer' && sLower !== 'lunch' && !Object.values(classRequirements).flat().includes(s);
    }));
    
    const librarySubject = subjects.find(s => s.toLowerCase() === 'library');
    const sportsSubject = subjects.find(s => s.toLowerCase() === 'sports');

    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot)) {
                    let filled = false;
                    
                    const fillerSubjects = [librarySubject, sportsSubject, ...nonEssentialSubjects].filter(Boolean) as string[];

                    for (const subject of fillerSubjects) {
                        const potentialTeachers = shuffleArray(teacherNames.filter(t =>
                            teacherSubjects[t]?.includes(subject) &&
                            teacherClasses[t]?.includes(className) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot)
                        ));
                        
                        const teacher = potentialTeachers.length > 0 ? potentialTeachers[0] : 'N/A';
                        
                        bookSlot({ day, timeSlot, className, subject, teacher });
                        filled = true;
                        break;
                    }

                    if (!filled) {
                        bookSlot({ day, timeSlot, className, subject: 'Free Period', teacher: 'N/A' });
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
