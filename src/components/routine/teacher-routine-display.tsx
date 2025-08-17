
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { GenerateScheduleOutput, Teacher, ScheduleEntry, DayOfWeek, Holiday } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ChevronLeft, ChevronRight, BookOpen, CalendarX2 } from "lucide-react";
import { cn, sortTimeSlots } from "@/lib/utils";

interface TeacherRoutineDisplayProps {
    scheduleData: GenerateScheduleOutput | null;
    teacher: Teacher | null;
    timeSlots: string[];
    workingDays: DayOfWeek[];
    holidays: Holiday[];
}

const allDaysOfWeek: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DailyTimeline = ({ periods, timeSlots, holidayInfo }: { periods: ScheduleEntry[], timeSlots: string[], holidayInfo: Holiday | null }) => {
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
                No classes scheduled for this day.
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
                        <div className="absolute left-0 flex flex-col items-center">
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
                                        <BookOpen className="h-4 w-4" />
                                        <span>Class: {period.className}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
            ))}
        </div>
    );
};

export default function TeacherRoutineDisplay({ scheduleData, teacher, timeSlots, workingDays, holidays = [] }: TeacherRoutineDisplayProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const minSwipeDistance = 50; 
    
    const holidaysByDate = useMemo(() => {
        return new Map(holidays.map(h => [h.date, h]));
    }, [holidays]);

    const isDayOff = useCallback((date: Date): boolean => {
        const dayName = allDaysOfWeek[date.getDay()];
        if (!workingDays.includes(dayName)) return true;

        const dateString = date.toISOString().split('T')[0];
        if (holidaysByDate.has(dateString)) return true;

        return false;
    }, [workingDays, holidaysByDate]);

    useEffect(() => {
        let newDate = new Date();
        if (isDayOff(newDate)) {
            let foundNextDay = false;
            for (let i = 1; i <= 7; i++) {
                newDate.setDate(new Date().getDate() + i);
                if (!isDayOff(newDate)) {
                    foundNextDay = true;
                    break;
                }
            }
            if (!foundNextDay) { // If no working day in next 7 days, check previous
                 newDate = new Date();
                 for (let i = 1; i <= 7; i++) {
                    newDate.setDate(new Date().getDate() - i);
                    if (!isDayOff(newDate)) {
                        break;
                    }
                }
            }
        }
        setCurrentDate(newDate);
    }, [workingDays, holidays, isDayOff]);

    const teacherScheduleByDay = useMemo(() => {
        if (!scheduleData?.schedule || !teacher) return {};
        const schedule: Record<string, ScheduleEntry[]> = {};
        workingDays.forEach(day => schedule[day] = []);

        scheduleData.schedule.forEach(entry => {
            if (entry.day && (entry.teacher || '').includes(teacher.id) && entry.subject !== 'Prayer' && entry.subject !== 'Lunch' && entry.subject !== '---') {
                if(schedule[entry.day]) {
                    schedule[entry.day].push(entry);
                }
            }
        });
        return schedule;
    }, [scheduleData, teacher, workingDays]);
    
    const weekDates = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday, start week on Monday
        startOfWeek.setDate(diff);

        return Array.from({ length: 7 }).map((_, i) => { 
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return date;
        });
    }, [currentDate]);

    const changeDay = useCallback((direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const increment = direction === 'prev' ? -1 : 1;
        
        for (let i = 0; i < 7; i++) {
            newDate.setDate(newDate.getDate() + increment);
            if (!isDayOff(newDate)) {
                setCurrentDate(newDate);
                return;
            }
        }
    }, [currentDate, isDayOff]);

    const changeWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
        setCurrentDate(newDate);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEndX(null);
        setTouchStartX(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEndX(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStartX || !touchEndX) return;
        const distance = touchStartX - touchEndX;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            changeDay('next');
        } else if (isRightSwipe) {
            changeDay('prev');
        }
        
        setTouchStartX(null);
        setTouchEndX(null);
    };

    if (!teacher) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> My Daily Routine</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                    <p className="text-muted-foreground text-center py-10">Could not identify the logged-in teacher.</p>
                </CardContent>
            </Card>
        );
    }

    if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
        return (
                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> My Daily Routine</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                    <p className="text-muted-foreground text-center py-10">No active school routine found.</p>
                </CardContent>
            </Card>
        );
    }
    
    const dayIndex = currentDate.getDay();
    const selectedDayName = allDaysOfWeek[dayIndex];
    const dailyPeriods = teacherScheduleByDay[selectedDayName] || [];
    
    const currentDateString = currentDate.toISOString().split('T')[0];
    const holidayInfo = holidaysByDate.get(currentDateString) || null;

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="pb-2">
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
            <CardContent 
                className="flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <DailyTimeline periods={dailyPeriods} timeSlots={timeSlots} holidayInfo={holidayInfo} />
            </CardContent>
        </Card>
    );
}
