
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { GenerateScheduleOutput, Teacher, ScheduleEntry, DayOfWeek, Holiday } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Check, MapPin, User, NotebookText } from "lucide-react";
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
    const calendarRef = useRef<HTMLDivElement>(null);
    
    const holidaysByDate = useMemo(() => new Map(holidays.map(h => [h.date, h])), [holidays]);

    const isDayOff = useCallback((date: Date): boolean => {
        const dayName = allDaysOfWeek[date.getUTCDay()];
        if (!workingDays.includes(dayName)) return true;
        const dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        return holidaysByDate.has(dateString);
    }, [workingDays, holidaysByDate]);

    useEffect(() => {
        let newDate = new Date();
        if (isDayOff(newDate)) {
            for (let i = 1; i <= 30; i++) { // Check next 30 days
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
    
    const monthDates = useMemo(() => {
        const date = new Date(currentDate);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const firstDay = new Date(Date.UTC(year, month, 1));
        const lastDay = new Date(Date.UTC(year, month + 1, 0));
        
        const dates = [];
        for (let d = new Date(firstDay); d <= lastDay; d.setUTCDate(d.getUTCDate() + 1)) {
            dates.push(new Date(d));
        }
        return dates;
    }, [currentDate]);

    useEffect(() => {
        const selectedButton = document.getElementById(`date-btn-${currentDate.getUTCDate()}`);
        if (selectedButton && calendarRef.current) {
            const calendar = calendarRef.current;
            const scrollLeft = selectedButton.offsetLeft - (calendar.offsetWidth / 2) + (selectedButton.offsetWidth / 2);
            calendar.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
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
            <Card className="w-full max-w-2xl mx-auto">
                <CardContent className="flex items-center justify-center p-6 min-h-[400px]">
                    <p className="text-muted-foreground text-center py-10">
                        { !teacher ? "Could not identify teacher." : "No active school routine found." }
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    const dayIndex = currentDate.getUTCDay();
    const selectedDayName = allDaysOfWeek[dayIndex];
    const dailyPeriods = teacherScheduleByDay[selectedDayName] || [];
    
    const currentDateString = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const holidayInfo = holidaysByDate.get(currentDateString) || null;
    const isTodayOff = holidayInfo || !workingDays.includes(selectedDayName);

    return (
        <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg bg-card">
            <div className="p-4 border-b">
                <div className="text-muted-foreground text-sm font-bold tracking-wider mb-4 px-2">
                    {currentDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }).toUpperCase()} {currentDate.getUTCFullYear()}
                </div>
                <div ref={calendarRef} className="flex items-center space-x-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {monthDates.map(date => {
                        const isSelected = currentDate.toDateString() === date.toDateString();
                        return (
                            <button 
                                key={date.toString()} 
                                id={`date-btn-${date.getUTCDate()}`}
                                className="text-center w-12 flex-shrink-0 flex flex-col items-center" 
                                onClick={() => setCurrentDate(date)}
                            >
                                <div className={cn("text-xs text-muted-foreground", isSelected && "font-bold text-card-foreground")}>{date.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()}</div>
                                <div className={cn("mt-2 text-lg w-8 h-8 flex items-center justify-center rounded-full", isSelected ? "font-bold text-primary-foreground bg-primary" : "text-card-foreground")}>{date.getUTCDate()}</div>
                            </button>
                        )
                    })}
                </div>
            </div>
            
            <CardContent className="p-6 min-h-[400px] flex items-center justify-center">
                <div className="w-full flex justify-center">
                    {isTodayOff ? (
                         <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                            <NotebookText className="h-10 w-10 mb-2" />
                            <p className="font-semibold">{holidayInfo?.name || "Day Off"}</p>
                            <p>No classes scheduled.</p>
                        </div>
                    ) : dailyPeriods.length > 0 ? (
                        <div className="relative w-auto pl-8">
                            {dailyPeriods.map((period, index) => {
                                const status = getStatus(period.timeSlot);
                                return (
                                    <div key={index} className="relative flex min-h-[7.5rem]">
                                        <div className="absolute -left-0.5 top-0 h-full w-0.5 bg-border z-0"></div>
                                        <div className="absolute -left-12 top-1 text-right">
                                            <p className="text-sm font-medium text-muted-foreground w-auto">{period.timeSlot}</p>
                                        </div>
                                        <div className={cn(
                                            "z-10 h-8 w-8 rounded-full border-2 flex items-center justify-center bg-card flex-shrink-0 mt-1",
                                            status === 'now' && 'border-primary',
                                            status === 'completed' && 'border-green-500',
                                            status === 'upcoming' && 'border-border'
                                        )}>
                                            {status === 'completed' && <Check className="h-4 w-4 text-green-500" />}
                                            {status === 'now' && <div className="absolute h-3 w-3 rounded-full bg-primary animate-ping" />}
                                            {status === 'now' && <div className="absolute h-2 w-2 rounded-full bg-primary" />}
                                        </div>
                                        
                                        <div className="ml-6 w-full">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-lg text-card-foreground">{period.subject}</h3>
                                                {status === 'now' && <div className="px-2 py-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-md">Now</div>}
                                            </div>
                                            <div className="text-muted-foreground mt-2 text-sm space-y-1">
                                                <p className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                    <span>{period.className}</span>
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-primary" />
                                                    <span>{teacher?.name}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[200px] text-center text-muted-foreground">
                            <p>No classes scheduled for you on this day.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Helper to hide scrollbar
const style = document.createElement('style');
style.innerHTML = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
document.head.appendChild(style);

