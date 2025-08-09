
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import type { SchoolConfig } from "@/context/app-state-provider";

export type SubjectPriority = "before" | "after" | "none";
export type SubjectCategory = "main" | "additional";

export type GenerateScheduleLogicInput = {
    teacherNames: string[];
    classes: string[];
    subjects: string[];
    timeSlots: string[];
} & SchoolConfig;

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacher -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
    classSubjectBookings: Record<string, Set<string>>; // className -> "day-subject"
};

const daysOfWeek: ScheduleEntry['day'][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
        timeSlots,
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
        classTeachers,
        prayerTimeSlot,
        lunchTimeSlot,
        preventConsecutiveClasses, // This is not yet used, but kept for future implementation
        subjectCategories,
        dailyPeriodQuota,
    } = input;

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = { teacherBookings: {}, classBookings: {}, classSubjectBookings: {} };
    
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
    
    const getTeacherLoadForDay = (teacher: string, day: string) => {
      if (!bookings.teacherBookings[teacher]) return 0;
      return Array.from(bookings.teacherBookings[teacher]).filter(booking => booking.startsWith(day)).length;
    }

    const bookSlot = (entry: ScheduleEntry) => {
        schedule.push(entry);
        if (entry.teacher !== "N/A") {
            bookings.teacherBookings[entry.teacher].add(`${entry.day}-${entry.timeSlot}`);
        }
        bookings.classBookings[entry.className].add(`${entry.day}-${entry.timeSlot}`);
        if (entry.subject !== "---" && entry.subject !== "Prayer" && entry.subject !== "Lunch") {
          bookings.classSubjectBookings[entry.className].add(`${entry.day}-${entry.subject}`);
        }
    };
    
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    const lunchIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : -1;
    const beforeLunchSlots = lunchIndex !== -1 ? instructionalSlots.filter(slot => timeSlots.indexOf(slot) < lunchIndex) : [];
    const afterLunchSlots = lunchIndex !== -1 ? instructionalSlots.filter(slot => timeSlots.indexOf(slot) > lunchIndex) : instructionalSlots;

    // Book Prayer and Lunch
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            if (prayerTimeSlot) bookSlot({ day, timeSlot: prayerTimeSlot, className, subject: "Prayer", teacher: "N/A" });
            if (lunchTimeSlot) bookSlot({ day, timeSlot: lunchTimeSlot, className, subject: "Lunch", teacher: "N/A" });
        });
    });

    // Book Class Teacher Attendance Period
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            const classTeacher = classTeachers[className];
            const firstSlot = instructionalSlots[0];
            if (classTeacher && firstSlot && !isClassBooked(className, day, firstSlot) && !isTeacherBooked(classTeacher, day, firstSlot) && getTeacherLoadForDay(classTeacher, day) < dailyPeriodQuota) {
                bookSlot({ day, timeSlot: firstSlot, className, subject: "Attendance", teacher: classTeacher });
            }
        });
    });


    // Book Main Subjects
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            const requiredSubjectsForClass = shuffleArray((classRequirements[className] || []).filter(s => subjectCategories[s] === 'main' && s !== 'Attendance'));

            requiredSubjectsForClass.forEach(subject => {
                if (isClassSubjectBookedForDay(className, day, subject)) return;

                const qualifiedTeachers = shuffleArray(teacherNames.filter(t =>
                    (teacherSubjects[t] || []).includes(subject) && (teacherClasses[t] || []).includes(className)
                ));

                for (const teacher of qualifiedTeachers) {
                    if (getTeacherLoadForDay(teacher, day) >= dailyPeriodQuota) continue;

                    const priority = subjectPriorities[subject] || 'none';
                    const preferredSlots = priority === 'before' ? beforeLunchSlots : (priority === 'after' ? afterLunchSlots : instructionalSlots);
                    
                    const availableSlot = shuffleArray(preferredSlots).find(slot =>
                        !isTeacherBooked(teacher, day, slot) &&
                        !isClassBooked(className, day, slot) &&
                        !isTeacherUnavailable(teacher, day, slot)
                    );
                    
                    if (availableSlot) {
                        bookSlot({ day, timeSlot: availableSlot, className, subject, teacher });
                        break;
                    }
                }
            });
        });
    });

    // Book Additional Subjects
    daysOfWeek.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            shuffleArray(classes).forEach(className => {
                if (isClassBooked(className, day, timeSlot)) return;

                const potentialSubjects = shuffleArray((classRequirements[className] || []).filter(s =>
                    (!subjectCategories[s] || subjectCategories[s] === 'additional') &&
                    !isClassSubjectBookedForDay(className, day, s)
                ));

                for (const subject of potentialSubjects) {
                    const qualifiedTeachers = shuffleArray(teacherNames.filter(t =>
                        (teacherSubjects[t] || []).includes(subject) &&
                        (teacherClasses[t] || []).includes(className) &&
                        getTeacherLoadForDay(t, day) < dailyPeriodQuota &&
                        !isTeacherBooked(t, day, timeSlot) &&
                        !isTeacherUnavailable(t, day, timeSlot)
                    ));

                    if (qualifiedTeachers.length > 0) {
                        bookSlot({ day, timeSlot, className, subject, teacher: qualifiedTeachers[0] });
                        break; 
                    }
                }
            });
        });
    });

    // Fill any remaining empty slots
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

        const timeIndexA = timeSlots.indexOf(a.timeSlot);
        const timeIndexB = timeSlots.indexOf(b.timeSlot);
        if (timeIndexA !== timeIndexB) return timeIndexA - timeIndexB;

        return a.className.localeCompare(b.className);
    });
    
    return { schedule };
}
