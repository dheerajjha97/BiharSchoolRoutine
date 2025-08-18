
"use client";

import React, { useContext, useMemo, useState, useEffect } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry, DayOfWeek, Teacher } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sortClasses, sortTimeSlots } from "@/lib/utils";
import { cn } from "@/lib/utils";
import DailyTimeline from "@/components/routine/daily-timeline";

const subjectColorPalettes = {
    science: ['border-blue-500', 'border-sky-500', 'border-cyan-500'],
    arts: ['border-orange-500', 'border-amber-500', 'border-yellow-500'],
    language: ['border-green-500', 'border-emerald-500', 'border-teal-500'],
    math: ['border-red-500'],
    practical: ['border-purple-500', 'border-violet-500'],
    other: ['border-slate-500', 'border-gray-500'],
};

const dayBgColors: Record<DayOfWeek, string> = {
    Monday: "bg-blue-50 dark:bg-blue-950/30",
    Tuesday: "bg-green-50 dark:bg-green-950/30",
    Wednesday: "bg-yellow-50 dark:bg-yellow-950/30",
    Thursday: "bg-orange-50 dark:bg-orange-950/30",
    Friday: "bg-purple-50 dark:bg-purple-950/30",
    Saturday: "bg-pink-50 dark:bg-pink-950/30",
    Sunday: "bg-gray-50 dark:bg-gray-950/30",
};


const getSubjectCategory = (subject: string): keyof typeof subjectColorPalettes => {
    const lowerSubject = subject.toLowerCase();
    if (['physics', 'chemistry', 'biology', 'science', 'भौतिकी', 'रसायन', 'जीव विज्ञान', 'विज्ञान'].some(s => lowerSubject.includes(s))) return 'science';
    if (['history', 'geography', 'political science', 'social science', 'economics', 'इतिहास', 'भूगोल', 'राजनीति विज्ञान', 'सा. विज्ञान', 'अर्थशास्त्र'].some(s => lowerSubject.includes(s))) return 'arts';
    if (['hindi', 'english', 'sanskrit', 'हिंदी', 'अंग्रेजी', 'संस्कृत'].some(s => lowerSubject.includes(s))) return 'language';
    if (['math', 'mathematics', 'गणित'].some(s => lowerSubject.includes(s))) return 'math';
    if (['computer', 'sports', 'library', 'कंप्यूटर', 'खेल', 'पुस्तकालय'].some(s => lowerSubject.includes(s))) return 'practical';
    return 'other';
};

const getSubjectColor = (subject: string, subjectColorMap: Map<string, string>): string => {
    if (!subjectColorMap.has(subject)) {
        const category = getSubjectCategory(subject);
        const palette = subjectColorPalettes[category];
        const color = palette[subjectColorMap.size % palette.length];
        subjectColorMap.set(subject, color);
    }
    return subjectColorMap.get(subject)!;
};


export default function SchoolRoutinePage() {
    const { appState } = useContext(AppStateContext);
    const { routineHistory, activeRoutineId, timeSlots, config, schoolInfo, teachers, classes } = appState;
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    const today = new Date();
    const currentDayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()] as DayOfWeek;
    const defaultTab = config.workingDays.includes(currentDayName) ? currentDayName : config.workingDays[0] || "Monday";

    const activeRoutine = routineHistory.find(r => r.id === activeRoutineId);
    
    const sortedClasses = useMemo(() => [...classes].sort(sortClasses), [classes]);
    const sortedTimeSlots = useMemo(() => sortTimeSlots(timeSlots), [timeSlots]);

    const teacherNameMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    useEffect(() => {
        if (sortedClasses.length > 0 && !selectedClass) {
            setSelectedClass(sortedClasses[0]);
        }
    }, [sortedClasses, selectedClass]);
    
    const scheduleByDayClassTime = useMemo(() => {
        if (!activeRoutine?.schedule?.schedule) return {};
        const grid: Record<string, Record<string, Record<string, ScheduleEntry>>> = {};

        config.workingDays.forEach(day => {
            grid[day] = {};
            sortedClasses.forEach(c => {
                grid[day][c] = {};
                sortedTimeSlots.forEach(slot => {
                     // Intentionally left empty, will be filled below
                });
            });
        });
        
        activeRoutine.schedule.schedule.forEach(entry => {
            const classNames = entry.className.split('&').map(c => c.trim());
            classNames.forEach(className => {
                if (grid[entry.day]?.[className]) {
                    grid[entry.day][className][entry.timeSlot] = entry;
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
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6">
                            {config.workingDays.map(day => (
                                <TabsTrigger key={day} value={day}>{day}</TabsTrigger>
                            ))}
                        </TabsList>
                        
                        {config.workingDays.map(day => (
                            <TabsContent key={day} value={day} className="mt-4 rounded-lg transition-colors duration-300">
                                <div className="overflow-x-auto rounded-lg">
                                    <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                                        <thead>
                                            <tr className="bg-transparent">
                                                <th className={cn("sticky left-0 z-20 p-2 text-sm font-semibold text-foreground align-bottom", dayBgColors[day])}>Time / Class</th>
                                                {sortedClasses.map(c => (
                                                    <th key={c} className={cn("p-2 text-center text-sm font-semibold text-foreground min-w-[140px]", dayBgColors[day])}>{c}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={cn("pt-2", dayBgColors[day])}>
                                            {sortedTimeSlots.map(slot => (
                                                <tr key={slot}>
                                                    <td className={cn("sticky left-0 z-20 p-2 text-sm font-semibold text-foreground align-top min-w-[100px]", dayBgColors[day])}>{slot}</td>
                                                    {sortedClasses.map(c => {
                                                        const entry = scheduleByDayClassTime[day]?.[c]?.[slot];
                                                        const isSpecial = entry?.subject === 'Prayer' || entry?.subject === 'Lunch';
                                                        const isEmpty = !entry || entry?.subject === '---';
                                                        const teacherNames = (entry?.teacher || '').split(' & ').map(tId => teacherNameMap.get(tId.trim()) || tId).join(' & ');

                                                        if (isSpecial) {
                                                            return (
                                                                <td key={`${c}-${slot}`} className="p-1.5 align-middle">
                                                                    <div className="h-full flex items-center justify-center p-2 text-center bg-muted text-muted-foreground font-semibold rounded-md">
                                                                        {entry.subject}
                                                                    </div>
                                                                </td>
                                                            );
                                                        }
                                                        
                                                        if (isEmpty) {
                                                            return <td key={`${c}-${slot}`} className="p-1.5"></td>;
                                                        }
                                                        
                                                        const colorClass = getSubjectColor(entry.subject, subjectColorMap);

                                                        return (
                                                            <td key={`${c}-${slot}`} className="p-1.5 align-top">
                                                                <div className={cn("text-left p-2 space-y-1 bg-card rounded-md shadow-sm border-l-4 h-full", colorClass)}>
                                                                    <p className="font-bold text-sm text-foreground">{entry.subject}</p>
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
