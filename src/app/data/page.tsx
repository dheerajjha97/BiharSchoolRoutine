
"use client";

import { useContext, useRef } from "react";
import type { ChangeEvent } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import DataManager from "@/components/routine/data-manager";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Download, User, School, Book, Clock } from "lucide-react";
import { importFromJSON, exportToJSON } from "@/lib/csv-helpers";
import PageHeader from "@/components/app/page-header";

export default function DataManagementPage() {
    const { appState, updateState, setFullState } = useContext(AppStateContext);
    const { teachers, classes, subjects, timeSlots } = appState;
    const { toast } = useToast();
    const jsonInputRef = useRef<HTMLInputElement>(null);

    const handleExportJson = () => {
        try {
            exportToJSON(appState, "school-data.json");
            toast({ title: "Data exported successfully!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Export failed", description: "Could not export the data." });
        }
    };

    const handleImportJsonClick = () => {
        jsonInputRef.current?.click();
    };

    const handleFileImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await importFromJSON(file);
            setFullState(data);
            toast({ title: "Data imported successfully!", description: "Your entire school data and configuration has been restored." });
        } catch (error) {
            toast({ variant: "destructive", title: "Import failed", description: error instanceof Error ? error.message : "Could not parse the JSON file." });
        }
        // Reset the file input so the same file can be selected again
        if(jsonInputRef.current) jsonInputRef.current.value = "";
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Data Management"
                description="Manage the core data for your school. You can also export your entire configuration (including routines) as a JSON file to share or as a backup."
            />
             <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={jsonInputRef}
                    onChange={handleFileImportJson}
                    className="hidden"
                    accept=".json, application/json"
                />
                <Button variant="outline" onClick={handleImportJsonClick}>
                    <Upload className="mr-2 h-4 w-4" /> Import from JSON
                </Button>
                <Button variant="outline" onClick={handleExportJson}>
                    <Download className="mr-2 h-4 w-4" /> Export to JSON
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
