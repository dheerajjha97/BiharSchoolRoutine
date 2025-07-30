
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
        subjectCategories[subject] === 'main' && bookings.classSubjectBookings[className]?.has(`${day}-${subject}`);
    
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
        const required = classRequirements[className] || [];
        // All subjects are potentially valid, priority is handled by scheduling order.
        return [...new Set([...required, ...Object.keys(input.subjects)])];
    };

    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    const lunchIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : Math.floor(timeSlots.length / 2);
    const beforeLunchSlots = instructionalSlots.filter(slot => timeSlots.indexOf(slot) < lunchIndex);
    const afterLunchSlots = instructionalSlots.filter(slot => timeSlots.indexOf(slot) >= lunchIndex);


    // Step 1: Schedule fixed periods (Prayer & Lunch)
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            if (prayerTimeSlot && timeSlots.includes(prayerTimeSlot)) {
                bookSlot({ day, timeSlot: prayerTimeSlot, classNames: [className], subject: "Prayer", teacher: "N/A" });
            }
            if (lunchTimeSlot && timeSlots.includes(lunchTimeSlot)) {
                bookSlot({ day, timeSlot: lunchTimeSlot, classNames: [className], subject: "Lunch", teacher: "N/A" });
            }
        });
    });

    daysOfWeek.forEach(day => {
        const daySlots = shuffleArray([...instructionalSlots]);

        // Prioritize Main subjects first
        const mainSubjects = shuffleArray(Object.keys(subjectCategories).filter(s => subjectCategories[s] === 'main'));
        
        classes.forEach(className => {
            mainSubjects.forEach(subject => {
                if (!classRequirements[className]?.includes(subject)) return;
                if (isClassSubjectBookedForDay(className, day, subject)) return;

                const qualifiedTeachers = shuffleArray(teacherNames.filter(t =>
                    (teacherSubjects[t] || []).includes(subject) &&
                    (teacherClasses[t] || []).includes(className)
                ));

                const teacher = qualifiedTeachers.find(t => 
                    (Array.from(bookings.teacherBookings[t]).filter(b => b.startsWith(day)).length) < dailyPeriodQuota
                );

                if (teacher) {
                    const priority = subjectPriorities[subject];
                    const preferredSlots = priority === 'before' ? beforeLunchSlots : (priority === 'after' ? afterLunchSlots : daySlots);
                    
                    const availableSlot = shuffleArray(preferredSlots).find(slot =>
                        !isTeacherBooked(teacher, day, slot) &&
                        !isClassBooked(className, day, slot) &&
                        !isTeacherUnavailable(teacher, day, slot)
                    );
                    
                    if (availableSlot) {
                        bookSlot({ day, timeSlot: availableSlot, classNames: [className], subject, teacher });
                    }
                }
            });
        });

        // Fill remaining slots with additional subjects to meet teacher quota
        teacherNames.forEach(teacher => {
            let periodsToday = Array.from(bookings.teacherBookings[teacher]).filter(b => b.startsWith(day)).length;
            const assignedClasses = shuffleArray(teacherClasses[teacher] || []);
            const additionalSubjects = shuffleArray((teacherSubjects[teacher] || []).filter(s => subjectCategories[s] === 'additional'));

            while (periodsToday < dailyPeriodQuota) {
                let periodFilled = false;
                for (const className of assignedClasses) {
                    for (const subject of additionalSubjects) {
                         if (!classRequirements[className]?.includes(subject)) continue;

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
                                    (classRequirements[c] || []).includes(subject) &&
                                    (teacherClasses[teacher] || []).includes(c) &&
                                    !isClassBooked(c, day, availableSlot)
                                );
                                const combinedClasses = [className, ...otherClassesInGrade].slice(0, 2); // Limit combined classes for simplicity
                                bookSlot({ day, timeSlot: availableSlot, classNames: combinedClasses, subject, teacher });
                            } else {
                                bookSlot({ day, timeSlot: availableSlot, classNames: [className], subject, teacher });
                            }
                            periodsToday++;
                            periodFilled = true;
                            break;
                         }
                    }
                    if (periodFilled) break;
                }
                if (!periodFilled) {
                    break; // No more slots can be filled for this teacher today
                }
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
