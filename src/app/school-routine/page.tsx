
"use client";

import React, { useContext, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry, DayOfWeek, Teacher } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sortClasses, sortTimeSlots } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Book, Microscope, Laptop, Palette, Landmark, Dumbbell, Languages } from "lucide-react";

const subjectColorPalettes = {
    science: ['border-blue-500', 'border-sky-500', 'border-cyan-500'],
    arts: ['border-orange-500', 'border-amber-500', 'border-yellow-500'],
    language: ['border-green-500', 'border-emerald-500', 'border-teal-500'],
    math: ['border-red-500'],
    practical: ['border-purple-500', 'border-violet-500'],
    other: ['border-slate-500', 'border-gray-500'],
};

const getSubjectCategory = (subject: string): keyof typeof subjectColorPalettes => {
    const lowerSubject = subject.toLowerCase();
    if (['physics', 'chemistry', 'biology', 'science', 'भौतिकी', 'रसायन', 'जीव विज्ञान', 'विज्ञान'].some(s => lowerSubject.includes(s))) return 'science';
    if (['history', 'geography', 'political science', 'social science', 'economics', 'इतिहास', 'भूगोल', 'राजनीति विज्ञान', 'सा. विज्ञान', 'अर्थशास्त्र'].some(s => lowerSubject.includes(s))) return 'arts';
    if (['hindi', 'english', 'sanskrit', 'urdu', 'हिंदी', 'अंग्रेजी', 'संस्कृत'].some(s => lowerSubject.includes(s))) return 'language';
    if (['math', 'mathematics', 'गणित'].some(s => lowerSubject.includes(s))) return 'math';
    if (['computer', 'sports', 'library', 'art', 'music', 'कंप्यूटर', 'खेल', 'पुस्तकालय', 'कला', 'संगीत'].some(s => lowerSubject.includes(s))) return 'practical';
    return 'other';
};

const getSubjectIcon = (subject: string) => {
    const lowerSubject = subject.toLowerCase();
    if (['physics', 'chemistry', 'biology', 'science', 'भौतिकी', 'रसायन', 'जीव विज्ञान', 'विज्ञान'].some(s => lowerSubject.includes(s))) return <Microscope className="h-4 w-4 inline-block mr-1" />;
    if (['history', 'geography', 'political science', 'social science', 'economics', 'इतिहास', 'भूगोल', 'राजनीति विज्ञान', 'सा. विज्ञान', 'अर्थशास्त्र'].some(s => lowerSubject.includes(s))) return <Landmark className="h-4 w-4 inline-block mr-1" />;
    if (['hindi', 'english', 'sanskrit', 'urdu', 'हिंदी', 'अंग्रेजी', 'संस्कृत'].some(s => lowerSubject.includes(s))) return <Languages className="h-4 w-4 inline-block mr-1" />;
    if (['math', 'mathematics', 'गणित'].some(s => lowerSubject.includes(s))) return <Book className="h-4 w-4 inline-block mr-1" />;
    if (['computer', 'कंप्यूटर'].some(s => lowerSubject.includes(s))) return <Laptop className="h-4 w-4 inline-block mr-1" />;
    if (['sports', 'खेल'].some(s => lowerSubject.includes(s))) return <Dumbbell className="h-4 w-4 inline-block mr-1" />;
    if (['art', 'music', 'कला', 'संगीत'].some(s => lowerSubject.includes(s))) return <Palette className="h-4 w-4 inline-block mr-1" />;
    return <Book className="h-4 w-4 inline-block mr-1" />;
}

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
    const defaultDay = new Date().toLocaleString('en-US', { weekday: 'long' }) as DayOfWeek;

    const activeRoutine = routineHistory.find(r => r.id === activeRoutineId);
    
    const sortedClasses = useMemo(() => [...classes].sort(sortClasses), [classes]);
    const sortedTimeSlots = useMemo(() => sortTimeSlots(timeSlots), [timeSlots]);

    const teacherNameMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);
    
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
                    <Tabs defaultValue={config.workingDays.includes(defaultDay) ? defaultDay : (config.workingDays[0] || "Monday")} className="w-full">
                        <TabsList className="mb-6 flex-nowrap overflow-x-auto justify-start">
                            {config.workingDays.map(day => (
                                <TabsTrigger key={day} value={day}>{day}</TabsTrigger>
                            ))}
                        </TabsList>
                        
                        {config.workingDays.map(day => (
                            <TabsContent key={day} value={day}>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                        <thead>
                                            <tr className="bg-transparent">
                                                <th className="sticky left-0 z-20 p-2 text-sm font-semibold text-foreground align-bottom bg-card">Time / Class</th>
                                                {sortedClasses.map(c => (
                                                    <th key={c} className="p-2 text-center text-sm font-semibold text-foreground min-w-[140px] bg-card">{c}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedTimeSlots.map(slot => {
                                                const firstEntry = scheduleByDayClassTime[day]?.[sortedClasses[0]]?.[slot];
                                                const isSpecial = firstEntry?.subject === 'Prayer' || firstEntry?.subject === 'Lunch';
                                                
                                                if (isSpecial) {
                                                    return (
                                                        <tr key={slot}>
                                                            <td className="sticky left-0 z-20 p-2 text-sm font-semibold text-foreground align-top min-w-[100px] bg-card">{slot}</td>
                                                            <td colSpan={sortedClasses.length} className="p-1.5 align-middle">
                                                                <div className="h-full flex items-center justify-center p-2 text-center bg-secondary text-secondary-foreground font-semibold rounded-md">
                                                                    {firstEntry.subject}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return (
                                                    <tr key={slot}>
                                                        <td className="sticky left-0 z-20 p-2 text-sm font-semibold text-foreground align-top min-w-[100px] bg-card">{slot}</td>
                                                        {sortedClasses.map(c => {
                                                            const entry = scheduleByDayClassTime[day]?.[c]?.[slot];
                                                            const isEmpty = !entry || entry?.subject === '---';
                                                            const teacherNames = (entry?.teacher || '').split(' & ').map(tId => teacherNameMap.get(tId.trim()) || tId).join(' & ');
                                                            
                                                            if (isEmpty) {
                                                                return <td key={`${c}-${slot}`} className="p-1.5"></td>;
                                                            }
                                                            
                                                            const colorClass = getSubjectColor(entry.subject, subjectColorMap);

                                                            return (
                                                                <td key={`${c}-${slot}`} className="p-1.5 align-top">
                                                                    <div className={cn("text-left p-2 space-y-1 bg-card rounded-md shadow-sm border-l-4 h-full", colorClass)}>
                                                                        <p className="font-bold text-sm text-foreground flex items-center">
                                                                            {getSubjectIcon(entry.subject)}
                                                                            {entry.subject}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">{teacherNames === 'N/A' ? '' : teacherNames}</p>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
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
