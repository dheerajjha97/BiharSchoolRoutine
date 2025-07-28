
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
    lunchTimeSlot?: string;
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
        lunchTimeSlot,
    } = input;

    const schedule: ScheduleEntry[] = [];
    const teacherBookings: Record<string, Set<string>> = {}; // key: teacher, value: Set of "day-timeSlot"
    const classBookings: Record<string, ScheduleEntry> = {}; // key: "day-timeSlot-className"
    const classSubjectCount: Record<string, Record<string, number>> = {}; // key: className, value: { subject: count }
    const dailyClassSubject: Record<string, Record<string, Set<string>>> = {}; // key: day -> className -> Set of subjects taught on that day

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

    // Initialize bookings and counts
    teacherNames.forEach(t => { teacherBookings[t] = new Set(); });
    classes.forEach(c => { 
        classSubjectCount[c] = {};
        subjects.forEach(s => {
            classSubjectCount[c][s] = 0;
        });
    });
    daysOfWeek.forEach(day => {
        dailyClassSubject[day] = {};
        classes.forEach(c => {
            dailyClassSubject[day][c] = new Set();
        });
    });
    
    // Sort subjects by priority only as a tie-breaker
    const sortedSubjectsByPriority = [...subjects].sort((a, b) => (subjectPriorities[b] || 0) - (subjectPriorities[a] || 0));
    
    // Define early periods (e.g., first 4 slots, excluding prayer)
    const earlyPeriodCount = 4;
    const instructionalTimeSlots = timeSlots.filter(slot => !slot.includes("09:00") && !slot.includes("09:15") && (!lunchTimeSlot || slot !== lunchTimeSlot));
    
    daysOfWeek.forEach(day => {
        timeSlots.forEach((timeSlot, slotIndex) => {
            // Handle special fixed-time subjects like Prayer and Lunch first
            const prayerSubject = subjects.find(s => s.toLowerCase() === "prayer");
            if (prayerSubject && (timeSlot.includes("09:00") || timeSlot.includes("09:15"))) {
                 classes.forEach(className => {
                    if (!isClassSlotBooked(day, timeSlot, className)) {
                        const entry = { day, timeSlot, className, subject: prayerSubject, teacher: "N/A" };
                        schedule.push(entry);
                        classBookings[`${day}-${timeSlot}-${className}`] = entry;
                    }
                });
                teacherNames.forEach(t => teacherBookings[t].add(`${day}-${timeSlot}`));
                return; // Move to next time slot
            }
            
            const lunchSubject = subjects.find(s => s.toLowerCase() === "lunch");
            if (lunchSubject && lunchTimeSlot && timeSlot === lunchTimeSlot) {
                 classes.forEach(className => {
                    if (!isClassSlotBooked(day, timeSlot, className)) {
                        const entry = { day, timeSlot, className, subject: lunchSubject, teacher: "N/A" };
                        schedule.push(entry);
                        classBookings[`${day}-${timeSlot}-${className}`] = entry;
                    }
                });
                teacherNames.forEach(t => teacherBookings[t].add(`${day}-${timeSlot}`));
                return; // Move to next time slot
            }

            // Shuffle classes to ensure different classes get priority on different days/slots
            shuffleArray(classes).forEach(className => {
                if (isClassSlotBooked(day, timeSlot, className)) {
                    return; 
                }

                const requiredSubjects = classRequirements[className] || [];
                
                // Filter out special subjects already handled and subjects already taught today
                const subjectsAlreadyTaughtToday = dailyClassSubject[day][className];
                const availableSubjects = requiredSubjects.filter(s => 
                    s.toLowerCase() !== "prayer" && 
                    s.toLowerCase() !== "lunch" &&
                    !subjectsAlreadyTaughtToday.has(s)
                );

                // Sort subjects for this specific slot:
                const sortedSubjectsForSlot = availableSubjects.sort((a, b) => {
                    const isEarlyPeriod = instructionalTimeSlots.indexOf(timeSlot) < earlyPeriodCount;
                    
                    // In early periods, prioritize subjects with high importance
                    if (isEarlyPeriod) {
                        const priorityA = subjectPriorities[a] || 0;
                        const priorityB = subjectPriorities[b] || 0;
                        if (priorityA !== priorityB) {
                            return priorityB - priorityA; // Higher priority first
                        }
                    } else { // In later periods, prioritize subjects with low importance
                         const priorityA = subjectPriorities[a] || 0;
                         const priorityB = subjectPriorities[b] || 0;
                         if (priorityA !== priorityB) {
                            return priorityA - priorityB; // Lower priority first
                        }
                    }

                    // As a secondary criteria, prioritize subjects taught less often this week
                    const countA = classSubjectCount[className][a] || 0;
                    const countB = classSubjectCount[className][b] || 0;
                    if (countA !== countB) {
                        return countA - countB;
                    }
                    
                    // Final tie-breaker: random shuffle effect
                    return Math.random() - 0.5;
                });
                
                for (const subject of sortedSubjectsForSlot) {
                    if (isClassSlotBooked(day, timeSlot, className)) {
                        break; 
                    }

                    const potentialTeachers = teacherNames.filter(t => 
                        (teacherSubjects[t]?.includes(subject)) &&
                        (teacherClasses[t]?.includes(className)) &&
                        !isTeacherBooked(t, day, timeSlot) &&
                        !isTeacherUnavailable(t, day, timeSlot)
                    );

                    const shuffledTeachers = shuffleArray(potentialTeachers);

                    if (shuffledTeachers.length > 0) {
                        const teacher = shuffledTeachers[0];
                        const entry = { day, timeSlot, className, subject, teacher };

                        schedule.push(entry);
                        teacherBookings[teacher].add(`${day}-${timeSlot}`);
                        classBookings[`${day}-${timeSlot}-${className}`] = entry;
                        classSubjectCount[className][subject]++;
                        dailyClassSubject[day][className].add(subject);
                        
                        break; // Subject found and scheduled, move to the next class
                    } else {
                        // If class requires subject, but no teacher is available/mapped, schedule with "N/A"
                        if (classRequirements[className]?.includes(subject)) {
                             const entry = { day, timeSlot, className, subject, teacher: "N/A" };
                             
                             schedule.push(entry);
                             classBookings[`${day}-${timeSlot}-${className}`] = entry;
                             classSubjectCount[className][subject]++;
                             dailyClassSubject[day][className].add(subject);

                             break; // Subject scheduled without a teacher, move to next class
                        }
                    }
                }
            });
        });
    });

    return { schedule };
}
