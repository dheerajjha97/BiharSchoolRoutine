
"use client";

import { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { AppStateContext } from '@/context/app-state-provider';
import type { Teacher, ScheduleEntry, Day } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { sortTimeSlots, cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserCheck, UserX, User, School, Circle, CircleDot, CheckCircle2 } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, getDay } from 'date-fns';

type TimelineEntry = ScheduleEntry & { 
    substituteTeacherId?: string;
    isCurrent?: boolean;
    isCompleted?: boolean;
};

interface TeacherScheduleViewProps {
    teacher: Teacher;
}

export default function TeacherScheduleView({ teacher }: TeacherScheduleViewProps) {
    const { appState } = useContext(AppStateContext);
    const { activeRoutine, teachers, adjustments, config } = appState;
    const { substitutionPlan } = adjustments;

    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(today);
    const [currentTime, setCurrentTime] = useState(today);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const weekDates = useMemo(() => {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    }, [selectedDate]);

    const getTeacherName = (id: string): string => teachers.find(t => t.id === id)?.name || id;

    const parseTime = (timeStr: string) => {
        const timePart = timeStr.split(' - ')[0].trim();
        const date = new Date(selectedDate);
        const [hours, minutes] = timePart.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
        return date;
    };
    
    const selectedDaySchedule = useMemo(() => {
        if (!activeRoutine?.schedule?.schedule) return [];
        
        const dayIndex = getDay(selectedDate);
        const days: Day[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const selectedDayName = days[dayIndex];
        
        if (!config.workingDays.includes(selectedDayName)) return [];

        const teacherId = teacher.id;
        const scheduleForDay = activeRoutine.schedule.schedule
            .filter(entry => {
                if (!entry || entry.day !== selectedDayName || !entry.teacher) return false;
                const teacherIdsInSlot = entry.teacher.split(' & ').map(id => id.trim());
                return teacherIdsInSlot.includes(teacherId);
            })
            .map((entry): TimelineEntry => {
                let substituteTeacherId;
                if (substitutionPlan && isSameDay(new Date(substitutionPlan.date), selectedDate)) {
                    const substitution = substitutionPlan.substitutions.find(sub => 
                        sub.absentTeacherId === teacherId &&
                        sub.timeSlot === entry.timeSlot &&
                        sub.className === entry.className
                    );
                    if (substitution) {
                        substituteTeacherId = substitution.substituteTeacherId;
                    }
                }
                
                const startTime = parseTime(entry.timeSlot);
                const endTimeString = entry.timeSlot.split(' - ')[1];
                const endTime = endTimeString ? parseTime(endTimeString) : new Date(startTime.getTime() + 45 * 60000);
                
                return { 
                    ...entry, 
                    substituteTeacherId,
                    isCompleted: currentTime > endTime,
                    isCurrent: currentTime >= startTime && currentTime <= endTime
                };
            })
            .sort((a, b) => sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(a.timeSlot) - sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(b.timeSlot));
        
        return scheduleForDay;

    }, [activeRoutine, teacher, substitutionPlan, selectedDate, config.workingDays, currentTime]);


    if (!activeRoutine) {
        return (
             <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertTitle>No Active Routine</AlertTitle>
                <AlertDescription>An administrator has not set an active school routine yet.</AlertDescription>
            </Alert>
        );
    }
    
    const TimelineIcon = ({ entry }: { entry: TimelineEntry }) => {
        if (entry.isCompleted) {
            return <CheckCircle2 className="h-6 w-6 text-green-500" />;
        }
        if (entry.isCurrent) {
            return <CircleDot className="h-6 w-6 text-primary animate-pulse" />;
        }
        return <Circle className="h-6 w-6 text-muted-foreground/50" />;
    }

    return (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm">
            <div className="p-4 border-b">
                 <h3 className="font-semibold text-lg">{format(selectedDate, "MMMM")}</h3>
                 <div className="flex justify-between items-center mt-4 overflow-x-auto pb-2 -mb-2">
                    {weekDates.map(date => (
                        <button 
                            key={date.toString()} 
                            onClick={() => setSelectedDate(date)}
                            className={cn(
                                "flex flex-col items-center justify-center w-14 h-16 rounded-lg transition-colors duration-200",
                                isSameDay(date, selectedDate) 
                                    ? "bg-primary text-primary-foreground" 
                                    : "hover:bg-muted"
                            )}
                        >
                            <span className="text-sm uppercase">{format(date, "EEE")}</span>
                            <span className="text-xl font-bold">{format(date, "d")}</span>
                        </button>
                    ))}
                 </div>
            </div>
            <div className="p-4 md:p-6">
                {selectedDaySchedule.length > 0 ? (
                    <div className="relative">
                        {selectedDaySchedule.map((entry, index) => (
                             <div key={index} className="flex gap-4 items-start">
                                <div className="w-20 text-right text-sm text-muted-foreground shrink-0">{entry.timeSlot.split(' - ')[0]}</div>
                                
                                <div className="flex flex-col items-center self-stretch">
                                    <TimelineIcon entry={entry} />
                                    {index < selectedDaySchedule.length - 1 && (
                                        <div className="w-px h-full bg-border flex-grow my-2"></div>
                                    )}
                                </div>

                                <div className="flex-grow pb-8">
                                    <p className="font-bold text-lg">{entry.subject}</p>
                                    <div className="mt-2 space-y-2 text-muted-foreground">
                                        <p className="flex items-center gap-2 text-sm">
                                            <School className="h-4 w-4" />
                                            <span>Class {entry.className}</span>
                                        </p>
                                        {entry.substituteTeacherId ? (
                                            entry.substituteTeacherId === 'No Substitute Available' ? (
                                                 <div className="flex items-center gap-2 text-sm text-amber-600">
                                                    <UserX className="h-4 w-4" />
                                                    <span>Cancelled (No Substitute)</span>
                                                </div>
                                            ) : (
                                                 <div className="flex items-center gap-2 text-sm text-green-600">
                                                    <User className="h-4 w-4" />
                                                    <span>Substituted by: {getTeacherName(entry.substituteTeacherId)}</span>
                                                </div>
                                            )
                                        ) : (
                                           <div className="flex items-center gap-2 text-sm">
                                                <User className="h-4 w-4" />
                                                <span>{teacher.name} (You)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                 {entry.isCurrent && <div className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">Now</div>}

                                 {entry.substituteTeacherId && (
                                     <div className={cn(
                                         "text-xs font-bold px-2 py-1 rounded-full",
                                         entry.substituteTeacherId === 'No Substitute Available' 
                                            ? "bg-destructive/20 text-destructive"
                                            : "bg-primary/20 text-primary"
                                     )}>
                                         {entry.substituteTeacherId === 'No Substitute Available' ? 'Cancelled' : 'Substituted'}
                                    </div>
                                 )}
                             </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No classes scheduled for {format(selectedDate, "eeee, MMMM d")}.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
