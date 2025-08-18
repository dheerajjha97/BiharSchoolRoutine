
"use client";

import { useContext, useState, useMemo, useEffect } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry, Teacher, DayOfWeek, Holiday } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, sortClasses } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import DailyTimeline from "@/components/routine/daily-timeline";

const allDaysOfWeek: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
    const dailyPeriods = selectedClass ? scheduleByDayAndClass[selectedDayName]?.[selectedClass] || [] : [];
    const currentDateString = currentDate.toISOString().split('T')[0];
    const holidayInfo = holidaysByDate.get(currentDateString) || null;

    if (!activeRoutine) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Full School Routine"
                    description={`Viewing the daily active routine for ${schoolInfo.name || 'the school'}.`}
                />
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
                            <DailyTimeline periods={dailyPeriods} timeSlots={timeSlots} holidayInfo={holidayInfo} showTeacher={true} teachers={teachers} />
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
