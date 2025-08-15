import type { 
    GenerateScheduleOutput, 
    ScheduleEntry,
    GenerateScheduleLogicInput,
    TeacherLoad,
    TeacherLoadDetail,
} from "@/types";

type Booking = {
    teacherBookings: Record<string, Set<string>>; // teacherId -> "day-timeSlot"
    classBookings: Record<string, Set<string>>;   // className -> "day-timeSlot"
    classSubjectBookings: Record<string, Set<string>>; // className -> "day-subject"
};

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
        teachers,
        classes,
        timeSlots,
        subjects,
        workingDays,
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
        classTeachers,
        prayerTimeSlot,
        lunchTimeSlot,
        preventConsecutiveClasses,
        subjectCategories,
        dailyPeriodQuota,
        combinedClasses = [],
        splitClasses = [],
    } = input;

    const schedule: ScheduleEntry[] = [];
    const bookings: Booking = { teacherBookings: {}, classBookings: {}, classSubjectBookings: {} };
    
    teachers.forEach(t => { bookings.teacherBookings[t.id] = new Set(); });
    classes.forEach(c => { 
        bookings.classBookings[c] = new Set();
        bookings.classSubjectBookings[c] = new Set();
    });

    const isTeacherBooked = (teacherId: string, day: string, timeSlot: string): boolean => 
        bookings.teacherBookings[teacherId]?.has(`${day}-${timeSlot}`);

    const isClassBooked = (className: string, day: string, timeSlot: string): boolean => 
        bookings.classBookings[className]?.has(`${day}-${timeSlot}`);

    const isClassSubjectBookedForDay = (className: string, day: string, subject: string): boolean =>
        subjectCategories[subject] === 'main' && bookings.classSubjectBookings[className]?.has(`${day}-${subject}`);
    
    const isTeacherUnavailable = (teacherId: string, day: string, timeSlot: string): boolean => 
        unavailability.some(u => u.teacherId === teacherId && u.day === day && u.timeSlot === timeSlot);
    
    const getTeacherLoadForDay = (teacherId: string, day: string) => {
      if (!bookings.teacherBookings[teacherId]) return 0;
      const filteredBookings = Array.from(bookings.teacherBookings[teacherId]).filter(booking => {
          const [bookingDay, bookingTimeSlot] = (booking || '').split('-');
          return bookingDay === day && bookingTimeSlot !== prayerTimeSlot && bookingTimeSlot !== lunchTimeSlot;
      });
      return filteredBookings.length;
    }

    const bookSlot = (entry: ScheduleEntry) => {
        schedule.push(entry);
        const teachersToBook = (entry.teacher || '').split(' & ').map(t => t.trim()).filter(t => t && t !== "N/A");
        const classesToBook = (entry.className || '').split(' & ').map(c => c.trim());

        teachersToBook.forEach(teacherId => {
            if (bookings.teacherBookings[teacherId]) {
                bookings.teacherBookings[teacherId].add(`${entry.day}-${entry.timeSlot}`);
            }
        });
        
        classesToBook.forEach(className => {
            if (bookings.classBookings[className]) {
                bookings.classBookings[className].add(`${entry.day}-${entry.timeSlot}`);
            }
             if (entry.subject && entry.subject !== "---" && entry.subject !== "Prayer" && entry.subject !== "Lunch" && !(entry.subject || '').includes('/')) {
                if (subjectCategories[entry.subject] === 'main') {
                    bookings.classSubjectBookings[className].add(`${entry.day}-${entry.subject}`);
                }
            }
        });
    };
    
    const instructionalSlots = timeSlots.filter(slot => slot !== prayerTimeSlot && slot !== lunchTimeSlot);
    const lunchIndex = lunchTimeSlot ? timeSlots.indexOf(lunchTimeSlot) : -1;
    const beforeLunchSlots = lunchIndex !== -1 ? instructionalSlots.filter(slot => timeSlots.indexOf(slot) < lunchIndex) : [];
    const afterLunchSlots = lunchIndex !== -1 ? instructionalSlots.filter(slot => timeSlots.indexOf(slot) > lunchIndex) : instructionalSlots;

    // 1. Book Prayer and Lunch
    workingDays.forEach(day => {
        classes.forEach(className => {
            if (prayerTimeSlot && !isClassBooked(className, day, prayerTimeSlot)) bookSlot({ day, timeSlot: prayerTimeSlot, className, subject: "Prayer", teacher: "N/A" });
            if (lunchTimeSlot && !isClassBooked(className, day, lunchTimeSlot)) bookSlot({ day, timeSlot: lunchTimeSlot, className, subject: "Lunch", teacher: "N/A" });
        });
    });
    
    // 2. Book Special Rules (Combined/Split)
    workingDays.forEach(day => {
        combinedClasses.forEach(rule => {
             const availableSlot = shuffleArray(instructionalSlots).find(slot => 
                !isTeacherBooked(rule.teacherId, day, slot) &&
                !isTeacherUnavailable(rule.teacherId, day, slot) &&
                getTeacherLoadForDay(rule.teacherId, day) < dailyPeriodQuota &&
                rule.classes.every(c => !isClassBooked(c, day, slot)) &&
                rule.classes.every(c => !isClassSubjectBookedForDay(c, day, rule.subject))
            );
            if (availableSlot) {
                bookSlot({ day, timeSlot: availableSlot, className: rule.classes.join(' & '), subject: rule.subject, teacher: rule.teacherId });
            }
        });

        splitClasses.forEach(rule => {
            const areAllTeachersAvailable = (slot: string) => rule.parts.every(part => 
                !isTeacherBooked(part.teacherId, day, slot) &&
                !isTeacherUnavailable(part.teacherId, day, slot) &&
                getTeacherLoadForDay(part.teacherId, day) < dailyPeriodQuota
            );
            const availableSlot = shuffleArray(instructionalSlots).find(slot => 
                !isClassBooked(rule.className, day, slot) &&
                areAllTeachersAvailable(slot)
            );
            if (availableSlot) {
                bookSlot({
                    day,
                    timeSlot: availableSlot,
                    className: rule.className,
                    subject: rule.parts.map(p => p.subject).join(' / '),
                    teacher: rule.parts.map(p => p.teacherId).join(' & ')
                });
            }
        });
    });

    // 3. Book Class Teacher's First Period
    workingDays.forEach(day => {
        classes.forEach(className => {
            const classTeacherId = classTeachers[className];
            const firstSlot = instructionalSlots[0];
            if (classTeacherId && firstSlot && !isClassBooked(className, day, firstSlot) && !isTeacherBooked(classTeacherId, day, firstSlot)) {
                // Find a suitable subject for the class teacher to teach
                const suitableSubjects = (classRequirements[className] || [])
                    .filter(s => (subjectCategories[s] === 'main' || subjectCategories[s] === 'additional') && (teacherSubjects[classTeacherId] || []).includes(s));
                
                if (suitableSubjects.length > 0) {
                     const subjectToTeach = shuffleArray(suitableSubjects)[0];
                     if (!isClassSubjectBookedForDay(className, day, subjectToTeach) && getTeacherLoadForDay(classTeacherId, day) < dailyPeriodQuota) {
                        bookSlot({ day, timeSlot: firstSlot, className, subject: subjectToTeach, teacher: classTeacherId });
                     }
                }
            }
        });
    });

    // 4. Book Main Subjects (Hard Requirement)
    workingDays.forEach(day => {
        shuffleArray(classes).forEach(className => {
            shuffleArray((classRequirements[className] || []))
                .filter(subject => subjectCategories[subject] === 'main' && !isClassSubjectBookedForDay(className, day, subject))
                .forEach(subject => {
                    const qualifiedTeachers = shuffleArray(teachers.filter(t =>
                        (teacherSubjects[t.id] || []).includes(subject) && 
                        (teacherClasses[t.id] || []).includes(className)
                    ));

                    for (const teacher of qualifiedTeachers) {
                        if (getTeacherLoadForDay(teacher.id, day) >= dailyPeriodQuota) {
                            continue;
                        }

                        const priority = subjectPriorities[subject] || 'none';
                        let preferredSlots = instructionalSlots;
                        if (priority === 'before') preferredSlots = beforeLunchSlots;
                        else if (priority === 'after') preferredSlots = afterLunchSlots;
                        
                        const shuffledSlots = shuffleArray(preferredSlots);
                        const fallbackSlots = shuffleArray(instructionalSlots.filter(s => !preferredSlots.includes(s)));

                        let availableSlot = [...shuffledSlots, ...fallbackSlots].find(slot =>
                            !isTeacherBooked(teacher.id, day, slot) &&
                            !isClassBooked(className, day, slot) &&
                            !isTeacherUnavailable(teacher.id, day, slot)
                        );

                        if (availableSlot) {
                            bookSlot({ day, timeSlot: availableSlot, className, subject, teacher: teacher.id });
                            return; // Teacher found for this class/subject, move to next subject
                        }
                    }
                });
        });
    });


    // 5. Book Additional Subjects
    workingDays.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            shuffleArray(classes).forEach(className => {
                if (isClassBooked(className, day, timeSlot)) return;

                const potentialSubjects = shuffleArray((classRequirements[className] || []).filter(s =>
                    (!subjectCategories[s] || subjectCategories[s] === 'additional')
                ));

                for (const subject of potentialSubjects) {
                    const qualifiedTeachers = shuffleArray(teachers.filter(t =>
                        (teacherSubjects[t.id] || []).includes(subject) &&
                        (teacherClasses[t.id] || []).includes(className) &&
                        getTeacherLoadForDay(t.id, day) < dailyPeriodQuota &&
                        !isTeacherBooked(t.id, day, timeSlot) &&
                        !isTeacherUnavailable(t.id, day, timeSlot)
                    ));

                    if (qualifiedTeachers.length > 0) {
                        bookSlot({ day, timeSlot, className, subject, teacher: qualifiedTeachers[0].id });
                        return; // Slot filled for this class, move to next class
                    }
                }
            });
        });
    });

    // 6. Fill any remaining empty slots
    workingDays.forEach(day => {
        instructionalSlots.forEach(timeSlot => {
            classes.forEach(className => {
                if (!isClassBooked(className, day, timeSlot)) {
                    bookSlot({ day, timeSlot, className, subject: "---", teacher: "N/A" });
                }
            });
        });
    });

    schedule.sort((a, b) => {
        const dayIndexA = workingDays.indexOf(a.day);
        const dayIndexB = workingDays.indexOf(b.day);
        if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;

        const timeIndexA = timeSlots.indexOf(a.timeSlot);
        const timeIndexB = timeSlots.indexOf(b.timeSlot);
        if (timeIndexA !== timeIndexB) return timeIndexA - timeIndexB;

        return (a.className || '').localeCompare(b.className || '');
    });
    
    return { schedule };
}
