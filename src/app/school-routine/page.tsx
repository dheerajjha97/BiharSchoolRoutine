
"use client";

import { useContext, useState, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry, Teacher, DayOfWeek, Holiday } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sortClasses } from "@/lib/utils";
import DailyTimeline from "@/components/routine/daily-timeline";

const allDaysOfWeek: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchoolRoutinePage() {
    const { appState } = useContext(AppStateContext);
    const { routineHistory, activeRoutineId, timeSlots, config, schoolInfo, holidays = [] } = appState;
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    const activeRoutine = routineHistory.find(r => r.id === activeRoutineId);

    const scheduleByDayAndClass = useMemo(() => {
        if (!activeRoutine?.schedule?.schedule) return {};
        const schedule: Record<string, Record<string, ScheduleEntry[]>> = {};

        allDaysOfWeek.forEach(day => {
            schedule[day] = {};
            config.workingDays.forEach(day => {
                schedule[day] = {};
                appState.classes.forEach(c => schedule[day][c] = []);
            });
        });

        activeRoutine.schedule.schedule.forEach(entry => {
            if (entry.day && entry.className && schedule[entry.day]?.[entry.className] && entry.subject !== 'Prayer' && entry.subject !== 'Lunch' && entry.subject !== '---') {
                const classNames = entry.className.split('&').map(c => c.trim());
                 classNames.forEach(className => {
                     if(schedule[entry.day]?.[className]) {
                        schedule[entry.day][className].push(entry);
                     }
                 });
            }
        });
        return schedule;
    }, [activeRoutine, appState.classes, config.workingDays]);

    const sortedClasses = useMemo(() => {
        return [...appState.classes].sort(sortClasses);
    }, [appState.classes]);

    useState(() => {
        if (sortedClasses.length > 0 && !selectedClass) {
            setSelectedClass(sortedClasses[0]);
        }
    });

    if (!activeRoutine) {
        return (
             <div className="flex h-full items-center justify-center">
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

    const today = new Date();
    const currentDayName = allDaysOfWeek[today.getDay()];
    const currentDateString = today.toISOString().split('T')[0];
    const holidayInfo = holidays.find(h => h.date === currentDateString) || null;
    const dailyPeriods = selectedClass ? scheduleByDayAndClass[currentDayName]?.[selectedClass] || [] : [];
    
    return (
        <div className="space-y-6">
            <PageHeader
                title="School Routine"
                description={`View the daily schedule for ${schoolInfo.name || 'the school'}.`}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>
                        Select a class to view its schedule for today.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {sortedClasses.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedClass(c)}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${selectedClass === c ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                     <DailyTimeline 
                        periods={dailyPeriods}
                        timeSlots={timeSlots}
                        holidayInfo={holidayInfo}
                        showTeacher={true}
                        teachers={appState.teachers}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
