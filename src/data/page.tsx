
"use client";

import { useContext, useRef } from "react";
import type { ChangeEvent } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import DataManager from "@/components/routine/data-manager";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Download, User, School, Book, Clock, DoorOpen } from "lucide-react";
import { importFromJSON, exportToJSON } from "@/lib/csv-helpers";
import PageHeader from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function DataManagementPage() {
    const { appState, updateState, setFullState } = useContext(AppStateContext);
    const { teachers, classes, subjects, timeSlots, rooms, pdfHeader } = appState;
    const { toast } = useToast();
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const backupExtension = ".json"; 
    const backupFileName = `school-routine-data${backupExtension}`;

    const handleExportJson = () => {
        try {
            exportToJSON(appState, backupFileName);
            toast({ title: "Backup file exported successfully!" });
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
            toast({ variant: "destructive", title: "Import failed", description: error instanceof Error ? error.message : "Could not parse the backup file." });
        }
        // Reset the file input so the same file can be selected again
        if(jsonInputRef.current) jsonInputRef.current.value = "";
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Data Management"
                description={`Manage core data and global settings. You can also export your entire configuration as a ${backupExtension} file.`}
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>Global Settings</CardTitle>
                    <CardDescription>These settings will be applied across the entire application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="pdf-header-global">Global PDF Header</Label>
                        <Textarea 
                            id="pdf-header-global"
                            placeholder="e.g. My School Name&#10;Academic Year: 2024-25&#10;Weekly Class Routine"
                            value={pdfHeader}
                            onChange={(e) => updateState('pdfHeader', e.target.value)}
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">This header will be used on all PDF downloads.</p>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                        <input
                            type="file"
                            ref={jsonInputRef}
                            onChange={handleFileImportJson}
                            className="hidden"
                            accept={backupExtension}
                        />
                        <Button variant="outline" onClick={handleImportJsonClick}>
                            <Upload className="mr-2 h-4 w-4" /> Import from {backupExtension} File
                        </Button>
                        <Button variant="outline" onClick={handleExportJson}>
                            <Download className="mr-2 h-4 w-4" /> Export to {backupExtension} File
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    title="Rooms / Halls" 
                    icon={DoorOpen} 
                    items={rooms} 
                    setItems={(newItems) => updateState('rooms', newItems)} 
                    placeholder="e.g. Room 101"
                    description="Exam rooms or halls."
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
