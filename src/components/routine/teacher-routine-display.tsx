
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { GenerateScheduleOutput, Teacher, ScheduleEntry, DayOfWeek, Holiday } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Check, MapPin, User } from "lucide-react";
import { cn, sortTimeSlots } from "@/lib/utils";

interface TeacherRoutineDisplayProps {
    scheduleData: GenerateScheduleOutput | null;
    teacher: Teacher | null;
    timeSlots: string[];
    workingDays: DayOfWeek[];
    holidays: Holiday[];
}

const allDaysOfWeek: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherRoutineDisplay({ scheduleData, teacher, timeSlots, workingDays, holidays = [] }: TeacherRoutineDisplayProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    
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
                const nextDay = new Date();
                nextDay.setDate(new Date().getDate() + i);
                if (!isDayOff(nextDay)) {
                    newDate = nextDay;
                    break;
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

    const getStatus = (periodTime: string) => {
        const now = new Date();
        if (!periodTime || !periodTime.includes(':')) return 'upcoming';

        const [hours, minutes] = (periodTime.split('-')[0].trim()).split(':').map(Number);
        
        const periodDate = new Date(currentDate);
        periodDate.setHours(hours, minutes, 0, 0);

        if (periodDate.toDateString() !== now.toDateString()) {
             return now > periodDate ? 'completed' : 'upcoming';
        }

        if (now > periodDate) {
            const endTimeStr = periodTime.split(' - ')[1];
            if (endTimeStr) {
                const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
                const periodEndDate = new Date(currentDate);
                periodEndDate.setHours(endHours, endMinutes, 0, 0);
                if (now < periodEndDate) return 'now';
            }
            return 'completed';
        }
        return 'upcoming';
    };

    if (!teacher || !scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
        return (
            <Card className="w-full max-w-2xl mx-auto bg-gray-800 text-white border-gray-700">
                <CardContent className="flex items-center justify-center p-6 min-h-[400px]">
                    <p className="text-gray-400 text-center py-10">
                        { !teacher ? "Could not identify teacher." : "No active school routine found." }
                    </p>
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
        <Card className="w-full max-w-md mx-auto overflow-hidden bg-[#1C1C1E] text-gray-200 border-gray-700 shadow-2xl font-sans">
            <div className="p-6">
                <div className="text-gray-400 text-sm font-bold tracking-wider mb-4">
                    {currentDate.toLocaleString('en-US', { month: 'long' }).toUpperCase()}
                </div>
                <div className="flex items-center justify-between">
                    {weekDates.map(date => {
                        const isSelected = currentDate.toDateString() === date.toDateString();
                        return (
                            <button key={date.toString()} className="text-center" onClick={() => setCurrentDate(date)}>
                                <div className={cn("text-lg", isSelected ? "font-bold text-white" : "text-gray-400")}>{date.getDate()}</div>
                                <div className={cn("text-xs", isSelected ? "font-bold text-white" : "text-gray-500")}>{date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()}</div>
                            </button>
                        )
                    })}
                </div>
            </div>
            
            <CardContent className="p-6 bg-[#1C1C1E]">
                <div className="relative pl-8">
                    {isTodayOff ? (
                         <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500">
                            <p className="font-semibold">{holidayInfo?.name || "Day Off"}</p>
                            <p>No classes scheduled.</p>
                        </div>
                    ) : dailyPeriods.length > 0 ? (
                        dailyPeriods.map((period, index) => {
                            const status = getStatus(period.timeSlot);
                            return (
                                <div key={index} className="relative flex pb-12">
                                     {index < dailyPeriods.length - 1 && (
                                        <div className="absolute left-4 top-5 h-full w-0.5 bg-gray-700/50"></div>
                                    )}
                                    <div className="absolute -left-12 top-1 text-right">
                                        <p className="text-sm font-medium text-gray-400 w-20">{period.timeSlot.split('-')[0].trim()}</p>
                                    </div>
                                    <div className="z-10 h-8 w-8 rounded-full border-2 border-[#34D399]/50 flex items-center justify-center bg-[#1C1C1E]">
                                        {status === 'completed' && <Check className="h-4 w-4 text-[#34D399]" />}
                                        {status === 'now' && <div className="absolute h-4 w-4 rounded-full bg-[#34D399] animate-ping" />}
                                        {status === 'now' && <div className="absolute h-4 w-4 rounded-full bg-[#34D399]" />}
                                    </div>
                                    
                                    <div className="ml-6 w-full">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg text-white">{period.subject}</h3>
                                            {status === 'now' && <div className="px-2 py-0.5 text-xs font-bold bg-[#34D399] text-black rounded-md">Now</div>}
                                        </div>
                                        <div className="text-gray-400 mt-2 text-sm space-y-1">
                                            <p className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-[#34D399]" />
                                                <span>{period.className}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-[#34D399]" />
                                                <span>{teacher?.name}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[200px] text-center text-gray-500">
                            <p>No classes scheduled for you on this day.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
