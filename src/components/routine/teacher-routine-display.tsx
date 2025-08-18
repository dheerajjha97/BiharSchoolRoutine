
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { GenerateScheduleOutput, Teacher, ScheduleEntry, DayOfWeek, Holiday } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ChevronLeft, ChevronRight, CalendarX2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sortTimeSlots } from "@/lib/utils";

interface TeacherRoutineDisplayProps {
    scheduleData: GenerateScheduleOutput | null;
    teacher: Teacher | null;
    timeSlots: string[];
    workingDays: DayOfWeek[];
    holidays: Holiday[];
}

const allDaysOfWeek: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getSubjectDetails = (subject: string): { icon: string, color: string } => {
    const lowerSubject = subject.toLowerCase();
    if (lowerSubject.includes("physics")) return { icon: "⚛️", color: "border-blue-500" };
    if (lowerSubject.includes("chemistry")) return { icon: "🧪", color: "border-orange-500" };
    if (lowerSubject.includes("gardening")) return { icon: "🌱", color: "border-green-500" };
    if (lowerSubject.includes("math")) return { icon: "🧮", color: "border-red-500" };
    if (lowerSubject.includes("english")) return { icon: "📚", color: "border-indigo-500" };
    if (lowerSubject.includes("hindi")) return { icon: "📖", color: "border-yellow-500" };
    return { icon: "📘", color: "border-primary" };
}

export default function TeacherRoutineDisplay({ scheduleData, teacher, timeSlots, workingDays, holidays = [] }: TeacherRoutineDisplayProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const minSwipeDistance = 50; 
    
    const holidaysByDate = useMemo(() => new Map(holidays.map(h => [h.date, h])), [holidays]);

    const isDayOff = useCallback((date: Date): boolean => {
        const dayName = allDaysOfWeek[date.getDay()];
        if (!workingDays.includes(dayName)) return true;
        const dateString = date.toISOString().split('T')[0];
        return holidaysByDate.has(dateString);
    }, [workingDays, holidaysByDate]);

    useEffect(() => {
        let newDate = new Date();
        if (isDayOff(newDate)) {
            for (let i = 1; i <= 7; i++) {
                newDate.setDate(new Date().getDate() + i);
                if (!isDayOff(newDate)) break;
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

        // Sort periods within each day
        for (const day in schedule) {
            schedule[day] = schedule[day].sort((a, b) => sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(a.timeSlot) - sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(b.timeSlot));
        }

        return schedule;
    }, [scheduleData, teacher, workingDays]);
    
    const weekDates = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Start week on Monday
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

    const handleTouchStart = (e: React.TouchEvent) => { setTouchStartX(e.targetTouches[0].clientX); };
    const handleTouchMove = (e: React.TouchEvent) => { setTouchEndX(e.targetTouches[0].clientX); };

    const handleTouchEnd = () => {
        if (!touchStartX || !touchEndX) return;
        const distance = touchStartX - touchEndX;
        if (distance > minSwipeDistance) changeWeek('next');
        else if (distance < -minSwipeDistance) changeWeek('prev');
        setTouchStartX(null);
        setTouchEndX(null);
    };

    if (!teacher) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader><CardTitle className="flex items-center gap-2"><User /> My Daily Routine</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                    <p className="text-muted-foreground text-center py-10">Could not identify the logged-in teacher.</p>
                </CardContent>
            </Card>
        );
    }

    if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader><CardTitle className="flex items-center gap-2"><User /> My Daily Routine</CardTitle></CardHeader>
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
    const isTodayOff = holidayInfo || !workingDays.includes(selectedDayName);

    return (
        <Card className="w-full max-w-2xl mx-auto overflow-hidden">
            <CardHeader className="pb-4">
                 <div className="flex justify-between items-center mb-4">
                    <Button variant="ghost" size="icon" onClick={() => changeWeek('prev')}><ChevronLeft className="h-5 w-5" /></Button>
                    <h3 className="text-lg font-semibold w-40 text-center">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => changeWeek('next')}><ChevronRight className="h-5 w-5" /></Button>
                </div>
                <div className="flex items-center justify-center gap-1">
                    {weekDates.map(date => {
                        const isDaySelected = currentDate.toDateString() === date.toDateString();
                        return (
                            <Button
                                key={date.toString()}
                                variant={isDaySelected ? "default" : "ghost"}
                                size="sm"
                                className="px-2 sm:px-3 flex-1 flex flex-col h-auto"
                                onClick={() => setCurrentDate(date)}
                            >
                                <span className="text-xs">{date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()}</span>
                                <span className="font-bold text-lg">{date.getDate()}</span>
                            </Button>
                        )
                    })}
                </div>
            </CardHeader>
            <CardContent 
                className="p-4 sm:p-6"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="relative pl-6 border-l-2 border-muted/40 min-h-[300px]">
                {isTodayOff ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 text-muted-foreground">
                        <CalendarX2 className="h-12 w-12 mb-4" />
                        <p className="font-semibold">{holidayInfo?.name || "Day Off"}</p>
                        <p>No classes scheduled.</p>
                    </div>
                ) : dailyPeriods.length > 0 ? (
                    dailyPeriods.map((period, index) => {
                        const { icon, color } = getSubjectDetails(period.subject);
                        return (
                            <div key={`${period.timeSlot}-${index}`} className="relative flex items-start pb-8">
                                <div className="absolute -left-[1.6rem] top-1 text-right">
                                    <p className="text-xs font-medium text-muted-foreground w-12">{period.timeSlot.split('-')[0].trim()}</p>
                                </div>
                                <div className="absolute -left-[5px] top-2 z-10 h-2 w-2 rounded-full bg-primary" />
                                
                                <div className="ml-4 w-full -mt-1">
                                    <Card className={cn(
                                        "rounded-2xl shadow-md hover:shadow-lg transition-all hover:bg-accent border-l-4",
                                        color
                                    )}>
                                        <CardHeader className="flex flex-row items-center gap-4 p-4">
                                            <div className="text-2xl">{icon}</div>
                                            <div className="flex-1">
                                                <CardTitle className="text-base">{period.subject}</CardTitle>
                                                <CardDescription>Class: {period.className}</CardDescription>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 text-muted-foreground">
                        <p>No classes scheduled for you on this day.</p>
                    </div>
                )}
                </div>
            </CardContent>
        </Card>
    );
}
