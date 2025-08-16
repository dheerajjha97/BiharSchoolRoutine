
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import PageHeader from "@/components/app/page-header";
import RoutineDisplay from "@/components/routine/routine-display";
import { Loader2 } from "lucide-react";
import type { Teacher } from "@/types";

export default function SchoolRoutinePage() {
    const { appState, isLoading, isAuthLoading } = useContext(AppStateContext);
    const { activeRoutine, teachers, config, classes, subjects, timeSlots, schoolInfo } = appState;

    if (isLoading || isAuthLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const formattedTeacherSubjects = Object.fromEntries(
        Object.entries(config.teacherSubjects)
            .map(([teacherId, subjects]) => {
                const teacherName = teachers.find(t => t.id === teacherId)?.name;
                return teacherName ? [teacherName, subjects] : null;
            })
            .filter((entry): entry is [string, string[]] => entry !== null)
    );

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Final School Routine"
                description="View the complete, active school routine. This view is read-only."
            />
            <RoutineDisplay
                scheduleData={activeRoutine?.schedule || null}
                onScheduleChange={() => {}} // No-op for read-only view
                isEditable={false} // Teacher view is read-only
                timeSlots={timeSlots}
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                teacherSubjects={formattedTeacherSubjects}
                dailyPeriodQuota={config.dailyPeriodQuota}
                schoolInfo={schoolInfo}
                workingDays={config.workingDays || []}
            />
        </div>
    );
}

    
