
"use client";

import { useContext, useState, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry, Teacher, DayOfWeek, Holiday } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, CalendarX2, User } from "lucide-react";
import { cn, sortClasses, sortTimeSlots } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const allDaysOfWeek: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DailyClassTimeline = ({ periods, timeSlots, holidayInfo, teachers }: { periods: ScheduleEntry[], timeSlots: string[], holidayInfo: Holiday | null, teachers: Teacher[] }) => {
    const teacherNameMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);
    const getTeacherName = (id: string) => teacherNameMap.get(id) || id;

    const sortedPeriods = useMemo(() => {
        if (!periods) return [];
        const periodMap = new Map(periods.map(p => [p.timeSlot, p]));
        const sortedSlots = sortTimeSlots(timeSlots);
        return sortedSlots.map(slot => periodMap.get(slot)).filter(Boolean) as ScheduleEntry[];
    }, [periods, timeSlots]);

    if (holidayInfo) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center py-20 text-muted-foreground bg-secondary/50 rounded-lg">
                <CalendarX2 className="h-12 w-12 mb-4" />
                <p className="font-semibold">{holidayInfo.name}</p>
                <p>This is a holiday.</p>
            </div>
        )
    }

    if (sortedPeriods.length === 0) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center py-20 text-muted-foreground bg-secondary/50 rounded-lg">
                No classes scheduled for this class on this day.
            </div>
        );
    }
    
    return (
        <div className="relative p-4 sm:p-6">
            {sortedPeriods.map((period, index) => (
                <div key={period.timeSlot} className="relative flex items-start pb-8">
                    <div className="absolute left-0 text-right">
                        <p className="text-sm font-medium text-foreground w-16 -translate-x-20 mt-1">{period.timeSlot.split('-')[0].trim()}</p>
                    </div>
                    <div className="absolute left-0 flex flex-col items-center h-full">
                        <div className="z-10 h-5 w-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        {index < sortedPeriods.length - 1 && <div className="w-px bg-border flex-grow" />}
                    </div>
                    <div className="ml-8 w-full -mt-1">
                        <div className="p-4 rounded-lg border bg-card shadow-sm">
                            <h3 className="font-bold text-lg text-primary">{period.subject}</h3>
                            <div className="text-muted-foreground mt-2 text-sm space-y-1">
                                <p className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>Teacher: {getTeacherName(period.teacher)}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function SchoolRoutinePage() {
    const { appState } = useContext(AppStateContext);
    const { routineHistory, activeRoutineId, teachers, config, classes, timeSlots, schoolInfo, holidays = [] } = appState;
    
    const sortedClasses = useMemo(() => sortClasses(classes), [classes]);
    const [selectedClass, setSelectedClass] = useState(sortedClasses[0] || null);
    const [currentDate, setCurrentDate] = useState(new Date());

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
                schedule[entry.day][entry.className].push(entry);
            }
        });
        return schedule;
    }, [activeRoutine, sortedClasses]);

     const weekDates = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        return Array.from({ length: 7 }).map((_, i) => { 
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return date;
        });
    }, [currentDate]);

    const changeWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
        setCurrentDate(newDate);
    };
    
    const selectedDayName = allDaysOfWeek[currentDate.getDay()];
    const dailyPeriods = scheduleByDayAndClass[selectedDayName]?.[selectedClass] || [];
    const currentDateString = currentDate.toISOString().split('T')[0];
    const holidayInfo = holidaysByDate.get(currentDateString) || null;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Full School Routine"
                description={`Viewing the daily active routine for ${schoolInfo.name || 'the school'}.`}
            />

            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-center mb-4">
                        <Button variant="ghost" size="icon" onClick={() => changeWeek('prev')}><ChevronLeft /></Button>
                        <h3 className="text-lg font-semibold w-40 text-center">
                            {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={() => changeWeek('next')}><ChevronRight /></Button>
                    </div>
                    <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
                        {weekDates.map(date => {
                            const isOff = isDayOff(date);
                            return (
                                <Button
                                    key={date.toString()}
                                    variant={currentDate.toDateString() === date.toDateString() ? "default" : "ghost"}
                                    size="sm"
                                    className={cn("px-2 sm:px-3 flex-1", isOff && "text-muted-foreground/50 line-through")}
                                    onClick={() => setCurrentDate(date)}
                                    disabled={isOff}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs">{date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()}</span>
                                        <span className="font-bold">{date.getDate()}</span>
                                    </div>
                                </Button>
                            )
                        })}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border-t py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
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
                    </div>
                    {selectedClass ? (
                         <div className="border-t">
                             <DailyClassTimeline periods={dailyPeriods} timeSlots={timeSlots} holidayInfo={holidayInfo} teachers={teachers} />
                         </div>
                    ) : (
                         <div className="flex flex-col h-full items-center justify-center text-center py-20 text-muted-foreground">
                            Please select a class to view its routine.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
