
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import RoutineControls from "@/components/routine/routine-controls";
import PageHeader from "@/components/app/page-header";


export default function ConfigPage() {
    const { appState, updateConfig } = useContext(AppStateContext);
    const {
        teachers, classes, subjects, timeSlots, config
    } = appState;
    const { 
        classRequirements, subjectPriorities, unavailability, teacherSubjects, 
        teacherClasses, prayerTimeSlot, lunchTimeSlot, preventConsecutiveClasses,
        enableCombinedClasses, subjectCategories, dailyPeriodQuota
      } = config;

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
                classRequirements={classRequirements}
                setClassRequirements={(value) => updateConfig('classRequirements', value)}
                subjectPriorities={subjectPriorities}
                setSubjectPriorities={(value) => updateConfig('subjectPriorities', value)}
                unavailability={unavailability}
                setUnavailability={(value) => updateConfig('unavailability', value)}
                teacherSubjects={teacherSubjects}
                setTeacherSubjects={(value) => updateConfig('teacherSubjects', value)}
                teacherClasses={teacherClasses}
                setTeacherClasses={(value) => updateConfig('teacherClasses', value)}
                prayerTimeSlot={prayerTimeSlot}
                setPrayerTimeSlot={(value) => updateConfig('prayerTimeSlot', value)}
                lunchTimeSlot={lunchTimeSlot}
                setLunchTimeSlot={(value) => updateConfig('lunchTimeSlot', value)}
                preventConsecutiveClasses={preventConsecutiveClasses ?? true}
                setPreventConsecutiveClasses={(value) => updateConfig('preventConsecutiveClasses', value)}
                enableCombinedClasses={enableCombinedClasses ?? false}
                setEnableCombinedClasses={(value) => updateConfig('enableCombinedClasses', value)}
                subjectCategories={subjectCategories}
                setSubjectCategories={(value) => updateConfig('subjectCategories', value)}
                dailyPeriodQuota={dailyPeriodQuota}
                setDailyPeriodQuota={(value) => updateConfig('dailyPeriodQuota', value)}
              />
        </div>
    );
}
