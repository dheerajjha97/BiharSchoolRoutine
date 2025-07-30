
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import DataManager from "@/components/routine/data-manager";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Download, User, School, Book, Clock } from "lucide-react";
import { importFromCsv, exportToCsv } from "@/lib/csv-helpers";
import type { ChangeEvent } from "react";
import { useRef } from "react";
import PageHeader from "@/components/app/page-header";

export default function DataManagementPage() {
    const { appState, updateState } = useContext(AppStateContext);
    const { teachers, classes, subjects, timeSlots } = appState;
    const { toast } = useToast();
    const csvInputRef = useRef<HTMLInputElement>(null);

    const handleExportCsv = () => {
        try {
        exportToCsv({ teachers, classes, subjects, timeSlots }, "school-data.csv");
        toast({ title: "Data exported successfully!" });
        } catch (error) {
        toast({ variant: "destructive", title: "Export failed", description: "Could not export the data." });
        }
    };

    const handleImportCsvClick = () => {
        csvInputRef.current?.click();
    };

    const handleFileImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
        const data = await importFromCsv(file);
        if (data.teachers) updateState('teachers', data.teachers);
        if (data.classes) updateState('classes', data.classes);
        if (data.subjects) updateState('subjects', data.subjects);
        if (data.timeSlots) updateState('timeSlots', data.timeSlots);
        toast({ title: "Data imported successfully!" });
        } catch (error) {
        toast({ variant: "destructive", title: "Import failed", description: "Could not parse the CSV file." });
        }
        if(csvInputRef.current) csvInputRef.current.value = "";
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Data Management"
                description="Manage the core data for your school. Add or remove teachers, classes, subjects, and time slots."
            />
             <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={csvInputRef}
                    onChange={handleFileImportCsv}
                    className="hidden"
                    accept=".csv, text/csv"
                />
                <Button variant="outline" onClick={handleImportCsvClick}>
                    <Upload className="mr-2 h-4 w-4" /> Import from CSV
                </Button>
                <Button variant="outline" onClick={handleExportCsv}>
                    <Download className="mr-2 h-4 w-4" /> Export to CSV
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <DataManager 
                    title="Teachers" 
                    icon={User} 
                    items={teachers} 
                    setItems={(newItems) => updateState('teachers', newItems)} 
                    placeholder="New teacher name..."
                    description="List of all available teachers."
                />
                <DataManager 
                    title="Classes" 
                    icon={School} 
                    items={classes} 
                    setItems={(newItems) => updateState('classes', newItems)} 
                    placeholder="New class name..."
                    description="All classes in the school."
                />
                <DataManager 
                    title="Subjects" 
                    icon={Book} 
                    items={subjects} 
                    setItems={(newItems) => updateState('subjects', newItems)} 
                    placeholder="New subject name..."
                    description="All subjects taught."
                />
                <DataManager 
                    title="Time Slots" 
                    icon={Clock} 
                    items={timeSlots} 
                    setItems={(newItems) => updateState('timeSlots', newItems)} 
                    placeholder="e.g. 09:00 - 10:00"
                    description="Daily class time intervals."
                />
            </div>
        </div>
    );
}
