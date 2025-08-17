
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import PageHeader from "@/components/app/page-header";
import RoutineDisplay from "@/components/routine/routine-display";

export default function SchoolRoutinePage() {
    const { appState } = useContext(AppStateContext);
    const { routineHistory, activeRoutineId, teachers, config, classes, subjects, timeSlots, schoolInfo } = appState;

    const activeRoutine = routineHistory.find(r => r.id === activeRoutineId) || (routineHistory.length > 0 ? routineHistory[0] : null);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Full School Routine"
                description={`Viewing the active routine for ${schoolInfo.name || 'the school'}.`}
            />

            <RoutineDisplay
                scheduleData={activeRoutine?.schedule || null}
                onScheduleChange={() => { }} // Read-only, so no-op
                isEditable={false}
                timeSlots={timeSlots}
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                teacherSubjects={config.teacherSubjects}
                dailyPeriodQuota={config.dailyPeriodQuota}
                pdfHeader={schoolInfo.pdfHeader}
                workingDays={config.workingDays}
            />
        </div>
    );
}
