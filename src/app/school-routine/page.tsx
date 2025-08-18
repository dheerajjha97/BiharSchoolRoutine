
"use client";

import React, { useContext, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry, DayOfWeek } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
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
                    // Initialize with a placeholder
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
                    <CardContent className="p-6">
                    <div className="text-center py-12 text-muted-foreground">
                        <h2 className="text-xl font-semibold mb-2">School Routine</h2>
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
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-semibold text-foreground">Time / Class</th>
                                                {sortedClasses.map(c => (
                                                    <th key={c} className="px-4 py-3 text-center text-sm font-semibold text-foreground">{c}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border bg-background">
                                            {sortedTimeSlots.map(slot => (
                                                <tr key={slot}>
                                                    <td className="sticky left-0 z-10 bg-background px-4 py-3 text-sm font-semibold text-foreground">{slot}</td>
                                                    {sortedClasses.map(c => {
                                                        const entry = scheduleByDayTimeClass[day]?.[slot]?.[c];
                                                        const isSpecial = entry?.subject === 'Prayer' || entry?.subject === 'Lunch';
                                                        const isEmpty = !entry || entry?.subject === '---';
                                                        const teacherNames = (entry?.teacher || '').split(' & ').map(tId => teacherNameMap.get(tId.trim()) || tId).join(' & ');

                                                        if (isSpecial) {
                                                            return (
                                                                <td key={`${c}-${slot}`} className="p-2 text-center bg-muted text-muted-foreground font-semibold">
                                                                    {entry.subject}
                                                                </td>
                                                            );
                                                        }
                                                        
                                                        if (isEmpty) {
                                                            return <td key={`${c}-${slot}`} className="p-2"></td>;
                                                        }
                                                        
                                                        const colorClass = getSubjectColor(entry.subject, subjectColorMap);

                                                        return (
                                                            <td key={`${c}-${slot}`} className="p-0">
                                                                <div className={cn("h-full text-center p-2 space-y-1", colorClass)}>
                                                                    <p className="font-bold text-sm">{entry.subject}</p>
                                                                    <p className="text-xs text-muted-foreground">{teacherNames === 'N/A' ? '' : teacherNames}</p>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
