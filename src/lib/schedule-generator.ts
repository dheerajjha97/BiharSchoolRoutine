
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";

type Unavailability = {
    teacher: string;
    day: string;
    timeSlot: string;
}

export type GenerateScheduleLogicInput = {
    teacherNames: string[];
    classes: string[];
    subjects: string[];
    timeSlots: string[];
    unavailability: Unavailability[];
    subjectPriorities: Record<string, number>;
    classRequirements: Record<string, string[]>;
    teacherSubjects: Record<string, string[]>;
    teacherClasses: Record<string, string[]>;
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper function to shuffle an array
const shuffleArray = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};


export function generateScheduleLogic(input: GenerateScheduleLogicInput): GenerateScheduleOutput {
    const {
        teacherNames,
        classes,
        subjects,
        timeSlots,
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
    } = input;

    const schedule: ScheduleEntry[] = [];
    const teacherBookings: Record<string, Set<string>> = {}; // key: teacher, value: Set of "day-timeSlot"
    const classBookings: Record<string, ScheduleEntry> = {}; // key: "day-timeSlot-className"

    // Helper to check if a teacher is booked
    const isTeacherBooked = (teacher: string, day: string, timeSlot: string): boolean => {
        return teacherBookings[teacher]?.has(`${day}-${timeSlot}`);
    };
    
    // Helper to check for unavailability
    const isTeacherUnavailable = (teacher: string, day: string, timeSlot: string): boolean => {
        return unavailability.some(u => u.teacher === teacher && u.day === day && u.timeSlot === timeSlot);
    }
    
    // Helper to check if a class slot is booked
    const isClassSlotBooked = (day: string, timeSlot: string, className: string): boolean => {
        return !!classBookings[`${day}-${timeSlot}-${className}`];
    }

    // Initialize bookings
    teacherNames.forEach(t => {
        teacherBookings[t] = new Set();
    });
    
    // Sort subjects by priority
    const sortedSubjects = [...subjects].sort((a, b) => (subjectPriorities[b] || 0) - (subjectPriorities[a] || 0));

    daysOfWeek.forEach(day => {
        timeSlots.forEach(timeSlot => {
            // Handle special subjects like Prayer and Lunch first
            const prayerSubject = sortedSubjects.find(s => s.toLowerCase() === "prayer");
            if (prayerSubject && (timeSlot.includes("09:00") || timeSlot.includes("09:15") || timeSlot.includes("09:30"))) {
                classes.forEach(className => {
                    if (!isClassSlotBooked(day, timeSlot, className)) {
                        const entry = { day, timeSlot, className, subject: prayerSubject, teacher: "N/A" };
                        schedule.push(entry);
                        classBookings[`${day}-${timeSlot}-${className}`] = entry;
                    }
                });
                 // Block all teachers during this time
                teacherNames.forEach(t => teacherBookings[t].add(`${day}-${timeSlot}`));
            }

            const lunchSubject = sortedSubjects.find(s => s.toLowerCase() === "lunch");
            if (lunchSubject && (timeSlot.includes("12:00") || timeSlot.includes("13:00"))) {
                classes.forEach(className => {
                    if (!isClassSlotBooked(day, timeSlot, className)) {
                        const entry = { day, timeSlot, className, subject: lunchSubject, teacher: "N/A" };
                        schedule.push(entry);
                        classBookings[`${day}-${timeSlot}-${className}`] = entry;
                    }
                });
                // Block all teachers during this time
                teacherNames.forEach(t => teacherBookings[t].add(`${day}-${timeSlot}`));
            }

            classes.forEach(className => {
                // Check if this class already has this subject scheduled in this slot
                if (isClassSlotBooked(day, timeSlot, className)) {
                    return; // Already has a class, continue to next class
                }

                const requiredSubjects = classRequirements[className] || [];
                const availableSubjects = sortedSubjects.filter(s => requiredSubjects.includes(s) && s.toLowerCase() !== "prayer" && s.toLowerCase() !== "lunch");
                
                for (const subject of availableSubjects) {
                     // Check again in case a subject was added in this loop
                    if (isClassSlotBooked(day, timeSlot, className)) {
                        break; 
                    }

                    // Find an available teacher
                    const potentialTeachers = teacherNames.filter(t => 
                        (teacherSubjects[t]?.includes(subject)) &&
                        (teacherClasses[t]?.includes(className)) &&
                        !isTeacherBooked(t, day, timeSlot) &&
                        !isTeacherUnavailable(t, day, timeSlot)
                    );

                    if (potentialTeachers.length > 0) {
                        // Shuffle teachers to distribute workload more evenly
                        const shuffledTeachers = shuffleArray(potentialTeachers);
                        const teacher = shuffledTeachers[0]; 

                        const entry = {
                            day,
                            timeSlot,
                            className,
                            subject,
                            teacher
                        };
                        schedule.push(entry);
                        teacherBookings[teacher].add(`${day}-${timeSlot}`);
                        classBookings[`${day}-${timeSlot}-${className}`] = entry;
                        break; // Move to next class once a subject is scheduled
                    }
                }
            });
        });
    });

    return { schedule };
}
