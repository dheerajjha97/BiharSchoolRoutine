
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import RoutineControls from "@/components/routine/routine-controls";
import PageHeader from "@/components/app/page-header";
import type { SchoolConfig, Teacher } from "@/types";

export default function ConfigPage() {
    const { appState, updateConfig } = useContext(AppStateContext);
    const {
        teachers, classes, subjects, timeSlots, config
    } = appState;

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Configuration"
                description="Fine-tune the logic for the routine generation to meet your school's specific needs."
            />
            <RoutineControls
                teachers={teachers}
                classes={classes}
                subjects={subjects}
                timeSlots={timeSlots}
                config={config}
                updateConfig={updateConfig}
              />
        </div>
    );
}
