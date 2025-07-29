
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
        subjects,
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
        prayerTimeSlot,
        lunchTimeSlot,
        preventConsecutiveClasses = true,
    } = input;
    
    const timeSlots = [...input.timeSlots];

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = {
        teacherBookings: {},
        classBookings: {},
    };

    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { 
        bookings.classBookings[c] = new Set(); 
    });

    
    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => {
        return bookings.teacherBookings[teacher]?.has(`${day}-${timeSlot}`);
    };

    const hasTooManyConsecutiveClasses = (teacher: string, day: string, timeSlot: string, allTimeSlots: string[]): boolean => {
        if (!preventConsecutiveClasses) return false;

        const teacherScheduleIndices = allTimeSlots
            .map((slot, index) => ({ slot, index }))
            .filter(({ slot }) => isTeacherBooked(teacher, day, slot))
            .map(item => item.index)
            .sort((a, b) => a - b);
        
        const newSlotIndex = allTimeSlots.indexOf(timeSlot);
        const combinedSchedule = [...teacherScheduleIndices, newSlotIndex].sort((a,b) => a-b);
        
        if (combinedSchedule.length < 3) return false;
        
        for (let i = 0; i <= combinedSchedule.length - 3; i++) {
            if (combinedSchedule[i+1] === combinedSchedule[i] + 1 && combinedSchedule[i+2] === combinedSchedule[i] + 2) {
                 return true;
            }
        }
    
        return false;
    };
    
    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => {
         return bookings.classBookings[className]?.has(`${day}-${timeSlot}`);
    }

    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => {
        return unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);
    }
    
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
    
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    const lunchSlotIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : -1;
    
    // Pre-book prayer and lunch
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

    const getRequirementsPool = (): { className: string, subject: string }[] => {
        const pool: { className: string, subject: string }[] = [];
        classes.forEach(className => {
            const requiredSubjects = classRequirements[className] || [];
            requiredSubjects.forEach(subject => {
                // Add subject multiple times for each day of the week
                daysOfWeek.forEach(() => {
                    pool.push({ className, subject });
                })
            });
        });
        return shuffleArray(pool);
    };

    const requirementsPool = getRequirementsPool();
    const secondarySubjects = shuffleArray(subjects.filter(s => s.toLowerCase() === 'library' || s.toLowerCase() === 'sports'));

    const classSubjectDayTracker: Record<string, Set<string>> = {}; // "className-day" -> Set<subject>
    classes.forEach(c => daysOfWeek.forEach(d => classSubjectDayTracker[`${c}-${d}`] = new Set()));

    const schedulePrimarySubject = (req: { className: string, subject: string }) => {
        const sortedDays = shuffleArray(daysOfWeek);
        for (const day of sortedDays) {
            if (classSubjectDayTracker[`${req.className}-${day}`]?.has(req.subject)) {
                continue;
            }

            const sortedTimeSlots = shuffleArray(instructionalSlots)
              .sort((a, b) => {
                const priority = subjectPriorities[req.subject] || 'none';
                if (priority === 'none' || lunchSlotIndex === -1) return 0;
                
                const indexA = timeSlots.indexOf(a);
                const indexB = timeSlots.indexOf(b);

                if (priority === 'before') {
                    if (indexA < lunchSlotIndex && indexB >= lunchSlotIndex) return -1;
                    if (indexA >= lunchSlotIndex && indexB < lunchSlotIndex) return 1;
                } else if (priority === 'after') {
                    if (indexA > lunchSlotIndex && indexB <= lunchSlotIndex) return -1;
                    if (indexA <= lunchSlotIndex && indexB > lunchSlotIndex) return 1;
                }
                return 0;
            });

            for (const timeSlot of sortedTimeSlots) {
                if (isClassBooked(req.className, day, timeSlot)) {
                    continue;
                }

                const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                    (teacherSubjects[t]?.includes(req.subject)) &&
                    (teacherClasses[t]?.includes(req.className)) &&
                    !isTeacherBooked(t, day, timeSlot) &&
                    !isTeacherUnavailable(t, day, timeSlot) &&
                    !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                ));

                if (potentialTeachers.length > 0) {
                    const entry = { day, timeSlot, className: req.className, subject: req.subject, teacher: potentialTeachers[0] };
                    bookSlot(entry);
                    classSubjectDayTracker[`${req.className}-${day}`]?.add(req.subject);
                    return true;
                }
            }
        }
        return false;
    };

    // Attempt to schedule all required subjects first.
    requirementsPool.forEach(schedulePrimarySubject);

    // Fill remaining slots with secondary subjects or free periods.
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot)) {
                    let filled = false;
                    for (const subject of secondarySubjects) {
                        if(classSubjectDayTracker[`${className}-${day}`]?.has(subject)) continue;

                        const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                            (teacherSubjects[t]?.includes(subject)) &&
                            (teacherClasses[t]?.includes(className)) &&
                            !isTeacherBooked(t, day, timeSlot) &&
                            !isTeacherUnavailable(t, day, timeSlot) &&
                            !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                        ));
                        
                        if (potentialTeachers.length > 0) {
                            const entry = { day, timeSlot, className, subject, teacher: potentialTeachers[0] };
                            bookSlot(entry);
                            classSubjectDayTracker[`${className}-${day}`]?.add(subject);
                            filled = true;
                            break;
                        }
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
