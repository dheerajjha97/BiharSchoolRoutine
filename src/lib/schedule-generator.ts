
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
    classSubjectDayBookings: Record<string, Set<string>>; // className -> "subject-day"
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
    } = input;
    
    const timeSlots = [...input.timeSlots];

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = {
        teacherBookings: {},
        classBookings: {},
        classSubjectDayBookings: {}
    };

    teacherNames.forEach(t => { bookings.teacherBookings[t] = new Set(); });
    classes.forEach(c => { 
        bookings.classBookings[c] = new Set(); 
        bookings.classSubjectDayBookings[c] = new Set();
    });

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
            if (entry.subject !== 'Free Period') {
                 bookings.classSubjectDayBookings[className]?.add(`${entry.subject}-${entry.day}`);
            }
        });
    };
    
    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => {
        return bookings.teacherBookings[teacher]?.has(`${day}-${timeSlot}`);
    };
    
    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => {
         return bookings.classBookings[className]?.has(`${day}-${timeSlot}`);
    }

    const isSubjectBookedForClassOnDay = (className: string, subject: string, day: string): boolean => {
        return bookings.classSubjectDayBookings[className]?.has(`${subject}-${day}`);
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

    // --- Start of new, more robust scheduling logic ---
    daysOfWeek.forEach(day => {
      classes.forEach(className => {
        // Get all required subjects for the class, shuffled to vary the daily routine
        const requiredSubjectsForClass = shuffleArray(classRequirements[className] || []);
        
        // Get available, shuffled time slots for the day
        const availableTimeSlots = shuffleArray(instructionalSlots.filter(slot => !isClassBooked(className, day, slot)));
        
        let subjectsToSchedule = [...requiredSubjectsForClass];
        
        availableTimeSlots.forEach(timeSlot => {
          let scheduledInSlot = false;
          // Iterate through subjects to find one that can be scheduled
          for (let i = 0; i < subjectsToSchedule.length; i++) {
            const subject = subjectsToSchedule[i];
            
            // A subject can only be taught once per day per class
            if (isSubjectBookedForClassOnDay(className, subject, day)) {
              continue;
            }

            // Find an available teacher for this subject, class, day, and time slot
            const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                (teacherSubjects[t]?.includes(subject)) &&
                (teacherClasses[t]?.includes(className)) &&
                !isTeacherBooked(t, day, timeSlot) &&
                !isTeacherUnavailable(t, day, timeSlot)
            ));

            // If a teacher is found, book it and remove the subject from the list for this day
            if (potentialTeachers.length > 0) {
              bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
              subjectsToSchedule.splice(i, 1); // Remove scheduled subject
              scheduledInSlot = true;
              break; // Move to the next time slot
            }
          }
        });
      });
    });
    
    // --- Fallback to fill any remaining empty slots ---
    // This should ideally not be needed if requirements are well-defined.
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot)) {
                    // If a slot is still empty, mark it as a Free Period.
                    bookSlot({ day, timeSlot, className, subject: 'Free Period', teacher: 'N/A' });
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
