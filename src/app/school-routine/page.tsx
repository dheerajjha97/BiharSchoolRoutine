
"use client";

import { useContext, useState, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry, Teacher, DayOfWeek } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sortClasses, sortTimeSlots } from "@/lib/utils";
import { cn } from "@/lib/utils";

const subjectColors = [
    'bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500',
    'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500',
    'bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500',
    'bg-yellow-100 dark:bg-yellow-900/40 border-l-4 border-yellow-500',
    'bg-purple-100 dark:bg-purple-900/40 border-l-4 border-purple-500',
    'bg-pink-100 dark:bg-pink-900/40 border-l-4 border-pink-500',
    'bg-indigo-100 dark:bg-indigo-900/40 border-l-4 border-indigo-500',
    'bg-teal-100 dark:bg-teal-900/40 border-l-4 border-teal-500',
    'bg-orange-100 dark:bg-orange-900/40 border-l-4 border-orange-500',
];

const getSubjectColor = (subject: string, subjectColorMap: Map<string, string>): string => {
    if (!subjectColorMap.has(subject)) {
        const color = subjectColors[subjectColorMap.size % subjectColors.length];
        subjectColorMap.set(subject, color);
    }
    return subjectColorMap.get(subject)!;
};

export default function SchoolRoutinePage() {
    const { appState } = useContext(AppStateContext);
    const { routineHistory, activeRoutineId, timeSlots, config, schoolInfo, teachers } = appState;

    const today = new Date();
    const currentDayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()] as DayOfWeek;
    const defaultTab = config.workingDays.includes(currentDayName) ? currentDayName : config.workingDays[0] || "Monday";

    const activeRoutine = routineHistory.find(r => r.id === activeRoutineId);
    
    const sortedClasses = useMemo(() => [...appState.classes].sort(sortClasses), [appState.classes]);
    const sortedTimeSlots = useMemo(() => sortTimeSlots(timeSlots), [timeSlots]);

    const teacherNameMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const scheduleByDayTimeClass = useMemo(() => {
        if (!activeRoutine?.schedule?.schedule) return {};
        const grid: Record<string, Record<string, Record<string, ScheduleEntry>>> = {};

        config.workingDays.forEach(day => {
            grid[day] = {};
            sortedTimeSlots.forEach(slot => {
                grid[day][slot] = {};
                sortedClasses.forEach(c => {
                    grid[day][slot][c] = { day, timeSlot: slot, className: c, subject: "---", teacher: "N/A" };
                });
            });
        });

        activeRoutine.schedule.schedule.forEach(entry => {
            const classNames = entry.className.split('&').map(c => c.trim());
            classNames.forEach(className => {
                if (grid[entry.day]?.[entry.timeSlot]?.[className]) {
                    grid[entry.day][entry.timeSlot][className] = entry;
                }
            });
        });

        return grid;
    }, [activeRoutine, sortedTimeSlots, sortedClasses, config.workingDays]);

    const subjectColorMap = useMemo(() => new Map<string, string>(), []);

    if (!activeRoutine) {
        return (
             <div className="flex h-full items-center justify-center p-4">
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
        <div className="space-y-6 p-4 md:p-6">
            <PageHeader
                title="School Timetable"
                description={`View the full weekly schedule for ${schoolInfo.name || 'the school'}.`}
            />

            <Card>
                <CardContent className="p-4 md:p-6">
                    <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
                            {config.workingDays.map(day => (
                                <TabsTrigger key={day} value={day}>{day}</TabsTrigger>
                            ))}
                        </TabsList>
                        
                        {config.workingDays.map(day => (
                            <TabsContent key={day} value={day}>
                                <div className="overflow-x-auto border rounded-lg">
                                    <div className="timetable-grid">
                                        {/* Corner Header */}
                                        <div className="timetable-header font-bold sticky top-0 left-0 z-20">Time / Class</div>
                                        {/* Class Headers */}
                                        {sortedClasses.map(c => (
                                            <div key={c} className="timetable-header font-bold sticky top-0 z-10 text-center">{c}</div>
                                        ))}

                                        {/* Time Slots and Cells */}
                                        {sortedTimeSlots.map(slot => (
                                            <React.Fragment key={slot}>
                                                <div className="timetable-header font-bold sticky left-0 z-10 text-center">{slot}</div>
                                                {sortedClasses.map(c => {
                                                    const entry = scheduleByDayTimeClass[day]?.[slot]?.[c];
                                                    const isSpecial = entry?.subject === 'Prayer' || entry?.subject === 'Lunch';
                                                    const isEmpty = entry?.subject === '---';
                                                    const teacherNames = (entry?.teacher || '').split(' & ').map(tId => teacherNameMap.get(tId.trim()) || tId).join(' & ');

                                                    if (isSpecial) {
                                                        return (
                                                            <div key={`${c}-${slot}`} className="timetable-cell bg-muted text-muted-foreground font-semibold">
                                                                {entry.subject}
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    if (isEmpty || !entry) {
                                                        return <div key={`${c}-${slot}`} className="timetable-cell"></div>;
                                                    }
                                                    
                                                    const colorClass = getSubjectColor(entry.subject, subjectColorMap);

                                                    return (
                                                        <div key={`${c}-${slot}`} className={cn("timetable-cell text-center p-1 justify-center space-y-1", colorClass)}>
                                                            <p className="font-bold text-sm">{entry.subject}</p>
                                                            <p className="text-xs text-muted-foreground">{teacherNames === 'N/A' ? '' : teacherNames}</p>
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
