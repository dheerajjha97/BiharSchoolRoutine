
"use client";

import { useContext, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import RoutineDisplay from "@/components/routine/routine-display";

// This is a test page to isolate and debug the RoutineDisplay component.

export default function TestRoutinePage() {
    const { appState, updateRoutineVersion, isUserAdmin } = useContext(AppStateContext);
    const { 
        routineHistory = [],
        activeRoutineId,
        timeSlots, 
        classes,
        subjects, 
        teachers, 
        config,
        schoolInfo,
    } = appState;
    const { teacherSubjects, dailyPeriodQuota, workingDays } = config;
    const { pdfHeader } = schoolInfo;

    const activeRoutine = useMemo(() => {
        if (!activeRoutineId || !routineHistory) return null;
        return routineHistory.find(r => r.id === activeRoutineId);
    }, [routineHistory, activeRoutineId]);

    const handleScheduleChange = (newSchedule: any[]) => {
        if (!activeRoutineId) return;
        updateRoutineVersion(activeRoutineId, { 
            schedule: { schedule: newSchedule }
        });
    };

    if (!activeRoutine) {
        return (
            <div className="p-6">
                 <PageHeader 
                    title="Test Routine Page"
                    description="This page is for testing the RoutineDisplay component in isolation."
                />
                <div className="text-center py-12 text-muted-foreground">
                    <h2 className="text-xl font-semibold mb-2">No Active Routine</h2>
                    <p>Generate a new routine on the dashboard to see it here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <PageHeader 
                title="Test Routine Page"
                description="This page is for testing the RoutineDisplay component in isolation."
            />
            <RoutineDisplay
                scheduleData={activeRoutine.schedule}
                timeSlots={timeSlots}
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                teacherSubjects={teacherSubjects}
                onScheduleChange={handleScheduleChange}
                dailyPeriodQuota={dailyPeriodQuota}
                pdfHeader={pdfHeader}
                isEditable={isUserAdmin}
                workingDays={workingDays}
            />
        </div>
    );
}
