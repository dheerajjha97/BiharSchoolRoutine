
"use client";

import { useContext, useState } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ScheduleEntry } from "@/ai/flows/generate-schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateInvigilationDuty } from "@/lib/exam-duty-generator";
import type { DutyChart } from "@/lib/exam-duty-generator";
import { useToast } from "@/hooks/use-toast";
import InvigilationDutyChart from "@/components/routine/invigilation-duty-chart";

export default function ReportsPage() {
    const { appState } = useContext(AppStateContext);
    const [dutyChart, setDutyChart] = useState<DutyChart | null>(null);
    const { toast } = useToast();

    const handleGenerateDutyChart = () => {
        if (!appState.routine?.schedule) {
            toast({
                variant: "destructive",
                title: "No Routine Found",
                description: "Please generate a routine on the dashboard page first.",
            });
            return;
        }

        try {
            const chart = generateInvigilationDuty(appState.routine.schedule, appState.teachers, appState.timeSlots);
            setDutyChart(chart);
            toast({
                title: "Duty Chart Generated",
                description: "Invigilation duties have been assigned based on teacher availability."
            });
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Generation Failed",
                description: "Could not generate the duty chart.",
            });
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports & Utilities"
                description="Generate various reports and utility charts for your school."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Invigilation Duty Chart</CardTitle>
                    <CardDescription>
                       Generate an invigilation duty chart for exams. This assigns duties to teachers during their free periods as per the generated routine.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateDutyChart}>
                        Generate & Display Duty Chart
                    </Button>
                </CardContent>
            </Card>

            {dutyChart && (
                <InvigilationDutyChart dutyChart={dutyChart} />
            )}
        </div>
    );
}
