
"use client";

import { useContext, useState, useMemo, useEffect } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry, Teacher, DayOfWeek, Holiday } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarX2 } from "lucide-react";
import { cn, sortClasses } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const allDaysOfWeek: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Define a color map for subjects
const subjectColorMap: Record<string, { light: string, dark: string }> = {
    'default': { light: 'border-l-blue-500', dark: 'dark:border-l-blue-400' },
    'Math': { light: 'border-l-red-500', dark: 'dark:border-l-red-400' },
    'Science': { light: 'border-l-green-500', dark: 'dark:border-l-green-400' },
    'Physics': { light: 'border-l-green-500', dark: 'dark:border-l-green-400' },
    'Chemistry': { light: 'border-l-green-600', dark: 'dark:border-l-green-500' },
    'Biology': { light: 'border-l-green-400', dark: 'dark:border-l-green-300' },
    'English': { light: 'border-l-yellow-500', dark: 'dark:border-l-yellow-400' },
    'Hindi': { light: 'border-l-orange-500', dark: 'dark:border-l-orange-400' },
    'History': { light: 'border-l-purple-500', dark: 'dark:border-l-purple-400' },
    'Geography': { light: 'border-l-indigo-500', dark: 'dark:border-l-indigo-400' },
    'Social Science': { light: 'border-l-purple-500', dark: 'dark:border-l-purple-400' },
};
const getSubjectColor = (subject: string) => {
    const mainSubject = subject.split('/')[0].trim();
    return subjectColorMap[mainSubject] || subjectColorMap['default'];
};


const parseTime = (timeStr: string) => {
    const startTime = timeStr.split('-')[0].trim();
    const [hours, minutes] = startTime.split(':').map(Number);
    return hours * 60 + minutes;
};

const getEventPosition = (timeSlot: string, timelineStartHour: number) => {
    if (!timeSlot || !timeSlot.includes('-')) return { top: 0, height: 0 };
    
    const startMinutesTotal = parseTime(timeSlot);
    const endMinutesTotal = parseTime(timeSlot.split('-')[1].trim());

    if (isNaN(startMinutesTotal) || isNaN(endMinutesTotal)) return { top: 0, height: 0 };
    
    const duration = endMinutesTotal - startMinutesTotal;
    
    const scaleFactor = 1.5; // pixels per minute
    const timelineStartMinutes = timelineStartHour * 60;
    
    const top = (startMinutesTotal - timelineStartMinutes) * scaleFactor;
    const height = duration * scaleFactor;

    return { top, height };
};


export default function SchoolRoutinePage() {
    const { appState } = useContext(AppStateContext);
    const { routineHistory, activeRoutineId, teachers, config, classes, timeSlots, schoolInfo, holidays = [] } = appState;
    
    const sortedClasses = useMemo(() => [...classes].sort(sortClasses), [classes]);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (sortedClasses.length > 0 && !selectedClass) {
            setSelectedClass(sortedClasses[0]);
        }
    }, [sortedClasses, selectedClass]);

    const activeRoutine = routineHistory.find(r => r.id === activeRoutineId) || (routineHistory.length > 0 ? routineHistory[0] : null);

    const holidaysByDate = useMemo(() => new Map(holidays.map(h => [h.date, h])), [holidays]);

    const isDayOff = (date: Date): boolean => {
        const dayName = allDaysOfWeek[date.getDay()];
        if (!config.workingDays.includes(dayName)) return true;
        const dateString = date.toISOString().split('T')[0];
        if (holidaysByDate.has(dateString)) return true;
        return false;
    };
    
    const scheduleByDayAndClass = useMemo(() => {
        if (!activeRoutine?.schedule?.schedule) return {};
        const schedule: Record<string, Record<string, ScheduleEntry[]>> = {};

        allDaysOfWeek.forEach(day => {
            schedule[day] = {};
            sortedClasses.forEach(c => schedule[day][c] = []);
        });

        activeRoutine.schedule.schedule.forEach(entry => {
            if (entry.day && entry.className && schedule[entry.day]?.[entry.className] && entry.subject !== 'Prayer' && entry.subject !== 'Lunch' && entry.subject !== '---') {
                 const classNames = entry.className.split('&').map(c => c.trim());
                 classNames.forEach(className => {
                     if(schedule[entry.day]?.[className]) {
                        schedule[entry.day][className].push(entry);
                     }
                 });
            }
        });
        return schedule;
    }, [activeRoutine, sortedClasses]);

    const changeDay = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
        setCurrentDate(newDate);
    };
    
    const selectedDayName = allDaysOfWeek[currentDate.getDay()];
    const dailyPeriods = selectedClass ? scheduleByDayAndClass[selectedDayName]?.[selectedClass] || [] : [];
    const currentDateString = currentDate.toISOString().split('T')[0];
    const holidayInfo = holidaysByDate.get(currentDateString) || null;
    const isTodayOff = isDayOff(currentDate);

    const teacherNameMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);
    const getTeacherName = (id: string) => teacherNameMap.get(id) || id;

    const timelineHours = useMemo(() => {
        if (timeSlots.length === 0) return [];
        const sorted = [...timeSlots].sort((a,b) => parseTime(a) - parseTime(b));
        const start = parseTime(sorted[0]);
        const end = parseTime(sorted[sorted.length-1].split('-')[1].trim());
        const hours = [];
        for (let i = Math.floor(start / 60); i <= Math.ceil(end / 60); i++) {
            hours.push(i);
        }
        return hours;
    }, [timeSlots]);

    const timelineStartHour = useMemo(() => {
        if (timelineHours.length === 0) return 0;
        return timelineHours[0];
    }, [timelineHours]);


    if (!activeRoutine) {
        return (
             <div className="flex h-full items-center justify-center">
                 <Card>
                    <CardHeader>
                        <CardTitle>School Routine</CardTitle>
                        <CardDescription>No routine has been generated or selected yet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No active routine found. The admin needs to generate one first.</p>
                    </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full p-4 md:p-6">
            <header className="flex-shrink-0 pb-4 border-b">
                 <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold">{currentDate.toLocaleString('en-US', { weekday: 'long' })}</h2>
                        <p className="text-muted-foreground">{currentDate.toLocaleString('en-US', { day: 'numeric', month: 'long' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => changeDay('prev')}><ChevronLeft /></Button>
                        <Button variant="ghost" size="icon" onClick={() => changeDay('next')}><ChevronRight /></Button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                     {sortedClasses.map(c => (
                        <Badge 
                            key={c}
                            variant={selectedClass === c ? "default" : "secondary"}
                            onClick={() => setSelectedClass(c)}
                            className="cursor-pointer text-base px-3 py-1"
                        >
                            {c}
                        </Badge>
                     ))}
                </div>
            </header>
            <main className="flex-1 overflow-auto bg-card dark:bg-card mt-4 rounded-lg">
                <div className="relative p-4 md:p-6">
                    {/* Hours timeline */}
                    <div className="absolute left-0 top-6 bottom-0 flex flex-col pt-6">
                        {timelineHours.map(hour => (
                            <div key={hour} className="flex-shrink-0" style={{ height: `${60 * 1.5}px` }}>
                                <div className="text-right pr-4 text-sm text-muted-foreground -mt-3">{hour}:00</div>
                            </div>
                        ))}
                    </div>

                    {/* Events container */}
                    <div className="relative ml-16">
                        {/* Horizontal lines */}
                        {timelineHours.slice(1).map(hour => (
                             <div key={hour} className="absolute w-full border-t" style={{ top: `${((hour - timelineStartHour) * 60) * 1.5}px` }}></div>
                        ))}

                        {isTodayOff ? (
                             <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                                <CalendarX2 className="h-12 w-12 mb-4" />
                                <p className="font-semibold">{holidayInfo ? holidayInfo.name : 'Day Off'}</p>
                                <p>{holidayInfo ? 'This is a holiday.' : 'This is a non-working day.'}</p>
                            </div>
                        ) : selectedClass && dailyPeriods.length > 0 ? (
                           dailyPeriods.map((period, index) => {
                                const { top, height } = getEventPosition(period.timeSlot, timelineStartHour);
                                if (height <= 0) return null;
                                const {light, dark} = getSubjectColor(period.subject);
                                const teacherNames = period.teacher.split('&').map(tId => getTeacherName(tId.trim())).join(' & ');

                                return (
                                    <div
                                        key={`${period.timeSlot}-${index}`}
                                        className={cn("absolute w-[calc(100%-1rem)] right-0 p-3 rounded-lg shadow-md bg-background dark:bg-slate-800 border-l-4", light, dark)}
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                    >
                                        <h3 className="font-bold text-sm text-foreground truncate">{period.subject}</h3>
                                        <p className="text-xs text-muted-foreground">{teacherNames}</p>
                                        <p className="text-xs text-muted-foreground">{period.className}</p>
                                    </div>
                                );
                           })
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                                No classes scheduled for this selection.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
