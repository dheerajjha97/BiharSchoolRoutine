
"use client";

import { useState, useMemo, useEffect } from "react";
import type { GenerateScheduleOutput, Teacher, ScheduleEntry } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ChevronLeft, ChevronRight, MapPin, BookOpen } from "lucide-react";
import { cn, sortTimeSlots } from "@/lib/utils";

interface TeacherRoutineDisplayProps {
    scheduleData: GenerateScheduleOutput | null;
    teacher: Teacher | null;
    timeSlots: string[];
}

const daysOfWeek: ScheduleEntry['day'][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


const TeacherDailyRoutine = ({ periods, timeSlots }: { periods: ScheduleEntry[], timeSlots: string[] }) => {
    const sortedPeriods = useMemo(() => {
        if (!periods) return [];
        const periodMap = new Map(periods.map(p => [p.timeSlot, p]));
        const sortedSlots = sortTimeSlots(timeSlots);
        return sortedSlots.map(slot => periodMap.get(slot)).filter(Boolean) as ScheduleEntry[];
    }, [periods, timeSlots]);


    if (sortedPeriods.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                No classes scheduled for this day.
            </div>
        );
    }
    
    return (
        <div className="p-1">
            <div className="relative pl-8">
                {sortedPeriods.map((period, index) => (
                     <div key={period.timeSlot} className="flex items-start mb-8">
                        <div className="absolute left-0 text-right">
                           <p className="text-sm font-medium text-foreground w-16 -translate-x-20 mt-1">{period.timeSlot.split('-')[0].trim()}</p>
                        </div>
                        <div className="absolute left-0 h-full">
                           <div className="h-5 w-5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                           </div>
                           {index < sortedPeriods.length - 1 && <div className="ml-[9px] h-full w-px bg-border" />}
                        </div>
                        <div className="ml-8 w-full">
                           <h3 className="font-bold text-lg text-foreground">{period.subject}</h3>
                           <div className="text-muted-foreground mt-1 text-sm space-y-1">
                                <p className="flex items-center gap-2">
                                   <BookOpen className="h-4 w-4" />
                                   <span>Class: {period.className}</span>
                                </p>
                           </div>
                        </div>
                     </div>
                ))}
            </div>
        </div>
    );
};

export default function TeacherRoutineDisplay({ scheduleData, teacher, timeSlots }: TeacherRoutineDisplayProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        // Set initial day to today or the next valid school day
        const todayIndex = new Date().getDay(); // Sunday - 0, Saturday - 6
        if (todayIndex === 0) { // If Sunday, show Monday
            const nextDay = new Date();
            nextDay.setDate(nextDay.getDate() + 1);
            setCurrentDate(nextDay);
        }
    }, []);

    const teacherScheduleByDay = useMemo(() => {
        if (!scheduleData?.schedule || !teacher) return {};
        const schedule: Record<string, ScheduleEntry[]> = {};
        daysOfWeek.forEach(day => schedule[day] = []);

        scheduleData.schedule.forEach(entry => {
            if ((entry.teacher || '').includes(teacher.id) && entry.subject !== 'Prayer' && entry.subject !== 'Lunch' && entry.subject !== '---') {
                schedule[entry.day].push(entry);
            }
        });
        return schedule;
    }, [scheduleData, teacher]);
    
    const weekDates = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        // Set to previous Monday
        const dayOfWeek = startOfWeek.getDay(); // Sunday is 0, Monday is 1
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        return Array.from({ length: 6 }).map((_, i) => {
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

    if (!teacher) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> My Daily Routine</CardTitle>
                    <CardDescription>Your personal routine will be displayed here.</CardDescription>
                </CardHeader>
                <CardContent>
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
                    <CardDescription>Your personal routine will be displayed here once a school routine is active.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-10">No active school routine found.</p>
                </CardContent>
            </Card>
        );
    }
    
    const selectedDay = daysOfWeek[currentDate.getDay() - 1] || "Monday";
    const dailyPeriods = teacherScheduleByDay[selectedDay] || [];

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" onClick={() => changeWeek('prev')}><ChevronLeft /></Button>
                         <h3 className="text-lg font-semibold w-32 text-center">
                            {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
                        </h3>
                         <Button variant="ghost" size="icon" onClick={() => changeWeek('next')}><ChevronRight /></Button>
                    </div>
                    <div className="hidden md:flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
                        {weekDates.map(date => (
                            <Button
                                key={date.toString()}
                                variant={currentDate.toDateString() === date.toDateString() ? "default" : "ghost"}
                                size="sm"
                                className="px-3"
                                onClick={() => setCurrentDate(date)}
                            >
                                <div className="flex flex-col items-center">
                                    <span className="text-xs">{date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span>
                                    <span className="font-bold">{date.getDate()}</span>
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <TeacherDailyRoutine periods={dailyPeriods} timeSlots={timeSlots} />
            </CardContent>
        </Card>
    );
}
