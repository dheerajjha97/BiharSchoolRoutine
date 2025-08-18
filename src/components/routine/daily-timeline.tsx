
"use client";

import { useMemo } from "react";
import type { ScheduleEntry, Holiday, Teacher } from "@/types";
import { sortTimeSlots } from "@/lib/utils";
import { CalendarX2, User, BookOpen } from "lucide-react";

interface DailyTimelineProps {
    periods: ScheduleEntry[];
    timeSlots: string[];
    holidayInfo: Holiday | null;
    showTeacher: boolean;
    teachers?: Teacher[];
}

export default function DailyTimeline({ periods, timeSlots, holidayInfo, showTeacher, teachers = [] }: DailyTimelineProps) {
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
                No classes scheduled for this selection.
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
                                {showTeacher ? (
                                    <p className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>Teacher: {getTeacherName(period.teacher)}</span>
                                    </p>
                                ) : (
                                    <p className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        <span>Class: {period.className}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
