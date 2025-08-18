
"use client";

import { useContext, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import DataManager from "@/components/routine/data-manager";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Download, User, School, Book, Clock, DoorOpen, NotebookText, Trash2 } from "lucide-react";
import { importFromJSON, exportToJSON } from "@/lib/csv-helpers";
import PageHeader from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function DataManagementPage() {
    const { appState, updateState, updateSchoolInfo } = useContext(AppStateContext);
    const { teachers, classes, subjects, timeSlots, rooms, schoolInfo, holidays = [] } = appState;
    const { toast } = useToast();
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const backupExtension = ".bsr"; // Bihar School Routine
    const backupFileName = `school-data-backup${backupExtension}`;
    
    const [newHolidayName, setNewHolidayName] = useState("");
    const [newHolidayDate, setNewHolidayDate] = useState("");


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
            const importedData = await importFromJSON(file);

            // Security Check: Ensure the UDISE code in the backup matches the current school's UDISE.
            if (importedData.schoolInfo.udise !== appState.schoolInfo.udise) {
                throw new Error("The backup file belongs to a different school (UDISE code mismatch).");
            }
            
            updateState('fullState', importedData);
            toast({ title: "Data imported successfully!", description: "Your entire school data and configuration has been restored." });
        } catch (error) {
            toast({ variant: "destructive", title: "Import failed", description: error instanceof Error ? error.message : "Could not parse the backup file." });
        }
        // Reset the file input so the same file can be selected again
        if(jsonInputRef.current) jsonInputRef.current.value = "";
    };

    const handleAddHoliday = () => {
        if (!newHolidayName || !newHolidayDate) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please provide a name and date for the holiday." });
            return;
        }
        const newHolidays = [...holidays, { name: newHolidayName, date: newHolidayDate }];
        newHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        updateState('holidays', newHolidays);
        setNewHolidayName("");
        setNewHolidayDate("");
    };

    const handleRemoveHoliday = (date: string) => {
        updateState('holidays', holidays.filter(h => h.date !== date));
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Data Management"
                description={`Manage core data for your school. You can also export your entire configuration as a secure ${backupExtension} file.`}
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>School Information</CardTitle>
                    <CardDescription>This information will be used across the application and on PDF exports.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="school-name">School Name</Label>
                            <Input
                                id="school-name"
                                placeholder="e.g. Govt. High School, Patna"
                                value={schoolInfo.name}
                                onChange={(e) => updateSchoolInfo('name', e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="udise-code">UDISE Code</Label>
                            <Input
                                id="udise-code"
                                value={schoolInfo.udise}
                                disabled
                                className="mt-1"
                            />
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="pdf-header-global">PDF Header Text</Label>
                        <Textarea 
                            id="pdf-header-global"
                            placeholder="e.g. Weekly Class Routine&#10;Academic Year: 2024-25"
                            value={schoolInfo.pdfHeader}
                            onChange={(e) => updateSchoolInfo('pdfHeader', e.target.value)}
                            className="mt-1"
                        />
                         <p className="text-xs text-muted-foreground mt-1">This text appears below the school name on all PDF downloads.</p>
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
                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                                <NotebookText className="h-5 w-5" />
                            </div>
                            <span>Academic Holidays</span>
                         </CardTitle>
                         <CardDescription>Holidays are excluded from substitution plans.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                             <Input placeholder="Holiday Name" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} />
                            <Input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
                            <Button onClick={handleAddHoliday}>Add</Button>
                        </div>
                        <div className="space-y-2 h-48 overflow-y-auto border rounded-md p-2">
                            {holidays.length > 0 ? holidays.map(h => (
                                <div key={h.date} className="flex items-center justify-between text-sm bg-secondary p-2 rounded-md">
                                    <span>{h.name} ({new Date(h.date).toLocaleDateString('en-GB', { timeZone: 'UTC' })})</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveHoliday(h.date)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )) : <p className="text-sm text-center text-muted-foreground py-10">No holidays added yet.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
