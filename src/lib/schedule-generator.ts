
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
    
    // 1. INITIALIZE BOOKING STRUCTURES
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

    // 2. HELPER FUNCTIONS
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

    // 3. PRE-BOOK SPECIAL PERIODS (PRAYER & LUNCH)
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
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
    
    // 4. GENERATE A POOL OF ALL REQUIRED PERIODS FOR THE WEEK
    const requiredPeriods: { className: string, subject: string }[] = [];
    const secondarySubjects = subjects.filter(s => s.toLowerCase() !== 'prayer' && s.toLowerCase() !== 'lunch');

    classes.forEach(className => {
        const primarySubjects = classRequirements[className] || [];
        // Add primary subjects to the pool
        primarySubjects.forEach(subject => {
            requiredPeriods.push({ className, subject });
        });

        // Calculate remaining slots to be filled by secondary subjects
        const totalSlotsPerWeek = instructionalSlots.length * daysOfWeek.length;
        const slotsToFill = totalSlotsPerWeek - primarySubjects.length;

        // Add secondary subjects to the pool to fill the remaining slots
        for(let i=0; i<slotsToFill; i++) {
            // Cycle through secondary subjects to ensure variety
            const subject = secondarySubjects[i % secondarySubjects.length];
            if(subject && !primarySubjects.includes(subject)) {
                 requiredPeriods.push({ className, subject });
            }
        }
    });

    const shuffledPeriods = shuffleArray(requiredPeriods);
    
    // 5. SCHEDULE ALL PERIODS FROM THE POOL
    for (const { className, subject } of shuffledPeriods) {
        let isScheduled = false;

        // Prioritize based on subject preference
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
        
        for (const day of shuffleArray(daysOfWeek)) {
            // Don't schedule a subject if it's already scheduled for that class on that day
            if (bookings.classSubjectDayTracker[`${className}-${day}`]?.has(subject)) {
                continue;
            }

            for (const timeSlot of sortedTimeSlots) {
                if (isClassBooked(className, day, timeSlot)) {
                    continue;
                }
                
                const potentialTeachers = shuffleArray(teacherNames.filter(t => 
                    (teacherSubjects[t]?.includes(subject)) &&
                    (teacherClasses[t]?.includes(className)) &&
                    !isTeacherBooked(t, day, timeSlot) &&
                    !isTeacherUnavailable(t, day, timeSlot) &&
                    !hasTooManyConsecutiveClasses(t, day, timeSlot, timeSlots)
                ));

                if (potentialTeachers.length > 0) {
                    bookSlot({ day, timeSlot, className, subject, teacher: potentialTeachers[0] });
                    isScheduled = true;
                    break; // break from timeSlot loop
                }
            }
            if (isScheduled) {
                break; // break from day loop
            }
        }
    }
    
    // 6. FILL ANY REMAINING GAPS (SHOULD BE RARE)
    daysOfWeek.forEach(day => {
        classes.forEach(className => {
            instructionalSlots.forEach(timeSlot => {
                if (!isClassBooked(className, day, timeSlot)) {
                    bookSlot({ day, timeSlot, className, subject: 'Free Period', teacher: 'N/A' });
                }
            });
        });
    });

    // 7. SORT THE FINAL SCHEDULE FOR DISPLAY
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
