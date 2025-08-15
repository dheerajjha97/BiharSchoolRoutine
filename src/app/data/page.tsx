
"use client";

import { useContext, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import DataManager from "@/components/routine/data-manager";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Download, User, School, Book, Clock, DoorOpen, Calendar, Trash2 } from "lucide-react";
import { importFromJSON, exportToJSON } from "@/lib/csv-helpers";
import PageHeader from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { SchoolInfo, Holiday } from "@/types";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";


const HolidayManager = () => {
    const { appState, updateState } = useContext(AppStateContext);
    const { holidays } = appState;
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [description, setDescription] = useState("");
    const { toast } = useToast();

    const handleAddHoliday = () => {
        if (!date || !description.trim()) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select a date and enter a description." });
            return;
        }

        const dateString = format(date, "yyyy-MM-dd");

        if (holidays.some(h => h.date === dateString)) {
            toast({ variant: "destructive", title: "Duplicate Date", description: "This date is already marked as a holiday." });
            return;
        }

        const newHoliday: Holiday = { date: dateString, description };
        const newHolidays = [...holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date));
        updateState('holidays', newHolidays);
        
        setDate(undefined);
        setDescription("");
    };
    
    const handleRemoveHoliday = (dateString: string) => {
        updateState('holidays', holidays.filter(h => h.date !== dateString));
    };

    const holidayDates = holidays.map(h => parseISO(h.date));

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                        <Calendar className="h-5 w-5" />
                    </div>
                    <span>Academic Calendar / Holidays</span>
                </CardTitle>
                <CardDescription>Mark holidays for the academic year. These dates will be excluded from adjustments and exams.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
                <div className="flex w-full items-center space-x-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                                <Calendar className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <CalendarComponent mode="single" selected={date} onSelect={setDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Input placeholder="Holiday description..." value={description} onChange={e => setDescription(e.target.value)} />
                    <Button onClick={handleAddHoliday}>Add</Button>
                </div>
                <ScrollArea className="flex-grow h-64 border rounded-md p-2">
                    <div className="space-y-2">
                        {holidays.length > 0 ? (
                            holidays.map((holiday) => (
                                <div key={holiday.date} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{format(parseISO(holiday.date), "PPP")}</span>
                                        <span className="text-xs text-muted-foreground">{holiday.description}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveHoliday(holiday.date)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground text-center py-10">No holidays added yet.</div>
                        )}
                    </div>
                </ScrollArea>
                 <div className="p-4 border rounded-md">
                    <p className="text-sm font-medium mb-2">Calendar View</p>
                    <CalendarComponent
                        mode="multiple"
                        selected={holidayDates}
                        className="rounded-md"
                        classNames={{
                            day_selected: "bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground",
                            day_today: "bg-accent text-accent-foreground",
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    );
};


export default function DataManagementPage() {
    const { appState, updateState, setFullState } = useContext(AppStateContext);
    const { teachers, classes, subjects, timeSlots, rooms, schoolInfo } = appState;
    const { toast } = useToast();
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const backupExtension = ".bsr"; // Bihar School Routine
    const backupFileName = `school-data-backup-${schoolInfo.udise || 'no-udise'}${backupExtension}`;

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

    const handleSchoolInfoChange = (field: keyof SchoolInfo, value: string) => {
        updateState('schoolInfo', { ...schoolInfo, [field]: value });
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Data Management"
                description={`Manage core data, school information, and global settings.`}
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>School Information</CardTitle>
                    <CardDescription>
                        Enter your school's details. The UDISE code is used to uniquely identify your school's data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="school-name">School Name</Label>
                            <Input
                                id="school-name"
                                placeholder="e.g. Govt. High School, Patna"
                                value={schoolInfo.name}
                                onChange={(e) => handleSchoolInfoChange('name', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="udise-code">UDISE Code</Label>
                            <Input
                                id="udise-code"
                                placeholder="Enter your school's UDISE code"
                                value={schoolInfo.udise}
                                onChange={(e) => handleSchoolInfoChange('udise', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">This code is crucial for saving and finding your data.</p>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="school-details">Other Details (for PDF Header)</Label>
                        <Textarea 
                            id="school-details"
                            placeholder="e.g. Academic Year: 2024-25&#10;Weekly Class Routine"
                            value={schoolInfo.details}
                            onChange={(e) => handleSchoolInfoChange('details', e.target.value)}
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">This information will appear below the school name on PDF downloads.</p>
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
                            <Upload className="mr-2 h-4 w-4" /> Import Backup File
                        </Button>
                        <Button variant="outline" onClick={handleExportJson}>
                            <Download className="mr-2 h-4 w-4" /> Export Backup File
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
                <HolidayManager />
            </div>
        </div>
    );
}
