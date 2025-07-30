
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
    dailyPeriodQuota: number;
};

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacher -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
    classSubjectBookings: Record<string, Set<string>>; // className -> "day-subject"
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
        // subjects,
        timeSlots,
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
        prayerTimeSlot,
        lunchTimeSlot,
        enableCombinedClasses,
        subjectCategories,
        dailyPeriodQuota,
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

    const getGradeFromClassName = (className: string): string | null => {
      const match = className.match(/^(\d+)/);
      return match ? match[1] : null;
    };
    
    const bookSlot = (entry: Omit<ScheduleEntry, 'className'> & { classNames: string[] }) => {
        const { teacher, day, timeSlot, classNames, subject } = entry;
        const finalClassName = classNames.sort().join(' & ');
        
        schedule.push({ day, timeSlot, className: finalClassName, subject, teacher });

        if (teacher !== "N/A") {
            bookings.teacherBookings[teacher].add(`${day}-${timeSlot}`);
        }
        classNames.forEach(c => {
            bookings.classBookings[c].add(`${day}-${timeSlot}`);
            if (subject !== "---") {
                 bookings.classSubjectBookings[c].add(`${day}-${subject}`);
            }
        });
    };
    
    const getValidSubjectsForClass = (className: string): string[] => {
        const primary = classRequirements[className] || [];
        const secondary = ["Computer", "Sports", "Library"]; // Subjects that can be taught to any class
        return [...new Set([...primary, ...secondary])];
    };

    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    const beforeLunchSlots = instructionalSlots.filter(slot => subjectPriorities[slot] === 'before' || timeSlots.indexOf(slot) < timeSlots.indexOf(lunchTimeSlot || ''));
    const afterLunchSlots = instructionalSlots.filter(slot => !beforeLunchSlots.includes(slot));


    // Step 1: Schedule fixed periods (Prayer & Lunch)
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            if (prayerTimeSlot) {
                bookSlot({ day, timeSlot: prayerTimeSlot, classNames: [className], subject: "Prayer", teacher: "N/A" });
            }
            if (lunchTimeSlot) {
                bookSlot({ day, timeSlot: lunchTimeSlot, classNames: [className], subject: "Lunch", teacher: "N/A" });
            }
        });
    });

    daysOfWeek.forEach(day => {
        const daySlots = shuffleArray([...beforeLunchSlots, ...afterLunchSlots]);

        // Prioritize "Before Lunch" subjects
        const mainSubjectsBeforeLunch = Object.keys(subjectPriorities).filter(s => subjectCategories[s] === 'main' && subjectPriorities[s] === 'before');
        const mainSubjectsAfterLunch = Object.keys(subjectPriorities).filter(s => subjectCategories[s] === 'main' && subjectPriorities[s] === 'after');
        const mainSubjectsNoPreference = Object.keys(subjectCategories).filter(s => subjectCategories[s] === 'main' && !subjectPriorities[s]);
        
        const scheduleSubjectType = (subjectList: string[], slotList: string[]) => {
            shuffleArray(classes).forEach(className => {
                shuffleArray(subjectList).forEach(subject => {
                    if (isClassSubjectBookedForDay(className, day, subject)) return;
                    if (!getValidSubjectsForClass(className).includes(subject)) return;

                    const qualifiedTeachers = shuffleArray(teacherNames.filter(t =>
                        (teacherSubjects[t] || []).includes(subject) &&
                        (teacherClasses[t] || []).includes(className)
                    ));

                    if (qualifiedTeachers.length > 0) {
                        const availableTeacher = qualifiedTeachers.find(t => 
                            (Array.from(bookings.teacherBookings[t]).filter(b => b.startsWith(day)).length) < dailyPeriodQuota
                        );
                        
                        if (availableTeacher) {
                            const availableSlot = slotList.find(slot =>
                                !isTeacherBooked(availableTeacher, day, slot) &&
                                !isClassBooked(className, day, slot) &&
                                !isTeacherUnavailable(availableTeacher, day, slot)
                            );
                            if (availableSlot) {
                                bookSlot({ day, timeSlot: availableSlot, classNames: [className], subject, teacher: availableTeacher });
                            }
                        }
                    }
                });
            });
        };

        // Schedule main subjects based on priority
        scheduleSubjectType(mainSubjectsBeforeLunch, beforeLunchSlots);
        scheduleSubjectType(mainSubjectsAfterLunch, afterLunchSlots);
        scheduleSubjectType(mainSubjectsNoPreference, daySlots);

        // Fill remaining slots with additional subjects to meet teacher quota
        shuffleArray(teacherNames).forEach(teacher => {
            let periodsToday = Array.from(bookings.teacherBookings[teacher]).filter(b => b.startsWith(day)).length;
            const additionalSubjects = shuffleArray((teacherSubjects[teacher] || []).filter(s => subjectCategories[s] === 'additional'));

            while (periodsToday < dailyPeriodQuota) {
                let filledPeriod = false;
                const teacherClassesForDay = shuffleArray(teacherClasses[teacher] || []);
                
                for (const subject of additionalSubjects) {
                     for (const className of teacherClassesForDay) {
                         if (!getValidSubjectsForClass(className).includes(subject)) continue;

                         const availableSlot = daySlots.find(slot =>
                            !isTeacherBooked(teacher, day, slot) &&
                            !isClassBooked(className, day, slot) &&
                            !isTeacherUnavailable(teacher, day, slot)
                         );

                         if (availableSlot) {
                            if (enableCombinedClasses) {
                                const grade = getGradeFromClassName(className);
                                const otherClassesInGrade = classes.filter(c =>
                                    c !== className &&
                                    getGradeFromClassName(c) === grade &&
                                    getValidSubjectsForClass(c).includes(subject) &&
                                    (teacherClasses[teacher] || []).includes(c) &&
                                    !isClassBooked(c, day, availableSlot)
                                );
                                const combinedClasses = [className, ...otherClassesInGrade];
                                bookSlot({ day, timeSlot: availableSlot, classNames: combinedClasses, subject, teacher });
                            } else {
                                bookSlot({ day, timeSlot: availableSlot, classNames: [className], subject, teacher });
                            }
                            periodsToday++;
                            filledPeriod = true;
                            break;
                         }
                     }
                     if(filledPeriod) break;
                }
                if (!filledPeriod) break; // Cannot find any more slots for this teacher
            }
        });
    });

    // Step 4: Fill any truly empty slots with "---"
    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (!isClassBooked(className, day, timeSlot)) {
                    bookSlot({ day, timeSlot, classNames: [className], subject: "---", teacher: "N/A" });
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
