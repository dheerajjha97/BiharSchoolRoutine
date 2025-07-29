
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
    classSubjectDayTracker: Record<string, Set<string>>; // "className-day" -> Set<subject>
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
        classSubjectDayTracker: {},
    };
    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { 
        bookings.classBookings[c] = new Set();
        daysOfWeek.forEach(d => {
            bookings.classSubjectDayTracker[`${c}-${d}`] = new Set();
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
        
        // This check should only look at the existing schedule, not the potential future one
        return isTeacherBooked(teacher, day, prevSlot) && isTeacherBooked(teacher, day, prevPrevSlot);
    };

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
            if (bookings.classSubjectDayTracker[`${className}-${entry.day}`]) {
                bookings.classSubjectDayTracker[`${className}-${entry.day}`].add(entry.subject);
            }
        });
    };

    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    daysOfWeek.forEach(day => {
        if (prayerTimeSlot) {
            const prayerSubject = subjects.find(s => s.toLowerCase() === "prayer") || "Prayer";
            classes.forEach(className => {
                if(!isClassBooked(className, day, prayerTimeSlot)) {
                    bookSlot({ day, timeSlot: prayerTimeSlot, className, subject: prayerSubject, teacher: "N/A" });
                }
            });
        }
        if (lunchTimeSlot) {
            const lunchSubject = subjects.find(s => s.toLowerCase() === "lunch") || "Lunch";
             classes.forEach(className => {
                if(!isClassBooked(className, day, lunchTimeSlot)) {
                    bookSlot({ day, timeSlot: lunchTimeSlot, className, subject: lunchSubject, teacher: "N/A" });
                }
            });
        }
    });
    
    const requiredPeriods: { className: string, subject: string, priority: SubjectPriority }[] = [];
    classes.forEach(className => {
        const requiredSubjectsForClass = classRequirements[className] || [];
        requiredSubjectsForClass.forEach(subject => {
            requiredPeriods.push({ className, subject, priority: subjectPriorities[subject] || 'none' });
        });
    });

    const sortedPeriods = shuffleArray(requiredPeriods).sort((a, b) => {
        const priorityOrder = { 'before': 1, 'after': 1, 'none': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const dailyClassSubjectScheduled: Record<string, Set<string>> = {};

    sortedPeriods.forEach(({ className, subject }) => {
        for (const day of shuffleArray(daysOfWeek)) {
            const dayClassKey = `${day}-${className}`;
            if (!dailyClassSubjectScheduled[dayClassKey]) {
                dailyClassSubjectScheduled[dayClassKey] = new Set();
            }

            if (dailyClassSubjectScheduled[dayClassKey].has(subject)) {
                continue; 
            }

            const sortedTimeSlots = shuffleArray(instructionalSlots).sort((a, b) => {
                const priority = subjectPriorities[subject] || 'none';
                const lunchSlotIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : -1;
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

            let isScheduled = false;
            for (const timeSlot of sortedTimeSlots) {
                if (isClassBooked(className, day, timeSlot)) continue;

                const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                    (teacherSubjects[t]?.includes(subject)) &&
                    (teacherClasses[t]?.includes(className)) &&
                    !isTeacherBooked(t, day, timeSlot) &&
                    !isTeacherUnavailable(t, day, timeSlot) &&
                    !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                ));

                if (potentialTeachers.length > 0) {
                    bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                    dailyClassSubjectScheduled[dayClassKey].add(subject);
                    isScheduled = true;
                    break;
                }
            }
            if (isScheduled) {
                break; 
            }
        }
    });

    // Fill remaining slots
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot)) {
                    // Subjects that are NOT required for this class but are generic (e.g. Sports, Library)
                    // OR subjects that are required for OTHER classes that this teacher teaches
                    const nonRequiredSubjects = subjects.filter(s =>
                        !classRequirements[className]?.includes(s) &&
                        !s.toLowerCase().includes('prayer') &&
                        !s.toLowerCase().includes('lunch')
                    );
                    
                    const isGenericSubject = (s: string) => {
                        const lower_s = s.toLowerCase();
                        return lower_s.includes('sports') || lower_s.includes('library') || lower_s.includes('computer');
                    };

                    const potentialSubjects = shuffleArray(nonRequiredSubjects);

                    let filled = false;
                    for (const subject of potentialSubjects) {
                         const potentialTeachers = shuffleArray(teacherNames.filter(t => {
                            // Teacher must be qualified for this class and subject
                            if (!teacherClasses[t]?.includes(className) || !teacherSubjects[t]?.includes(subject)) {
                                return false;
                            }
                            // If the subject is not generic, it must be required by at least one of the classes the teacher teaches.
                            // This prevents, e.g., a Physics teacher being assigned to a class that doesn't take Physics.
                            if (!isGenericSubject(subject)) {
                                const teacher_classes = teacherClasses[t] || [];
                                const isSubjectRequiredForAnyOfTeacherClasses = teacher_classes.some(
                                    tc => classRequirements[tc]?.includes(subject)
                                );
                                if (!isSubjectRequiredForAnyOfTeacherClasses) {
                                    return false;
                                }
                            }
                            // Standard availability checks
                            return !isTeacherBooked(t, day, timeSlot) &&
                                   !isTeacherUnavailable(t, day, timeSlot) &&
                                   !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots);
                        }));
                        
                        if (potentialTeachers.length > 0) {
                             if (!bookings.classSubjectDayTracker[`${className}-${day}`]?.has(subject)) {
                                bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                                filled = true;
                                break; 
                             }
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
