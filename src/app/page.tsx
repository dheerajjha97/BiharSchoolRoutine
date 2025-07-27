
"use client";

import { useState, useMemo, ChangeEvent, useRef } from "react";
import type { GenerateScheduleInput, GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import { generateSchedule } from "@/ai/flows/generate-schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Book, Download, Loader2, School, Upload, User, Wand2, Clock } from "lucide-react";
import { Logo } from "@/components/icons";
import DataManager from "@/components/routine/data-manager";
import RoutineControls from "@/components/routine/routine-controls";
import RoutineDisplay from "@/components/routine/routine-display";
import { exportToCsv, importFromCsv } from "@/lib/csv-helpers";

export default function Home() {
  const [teachers, setTeachers] = useState<string[]>(["Mr. Sharma", "Mrs. Gupta", "Mr. Singh"]);
  const [classes, setClasses] = useState<string[]>(["Class 9A", "Class 10B"]);
  const [subjects, setSubjects] = useState<string[]>(["Math", "Science", "History", "English", "Lunch"]);
  const [timeSlots, setTimeSlots] = useState<string[]>([
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
    "13:00 - 14:00",
    "14:00 - 15:00",
    "15:00 - 16:00",
  ]);
  
  const [classRequirements, setClassRequirements] = useState<Record<string, string[]>>({});
  const [subjectPriorities, setSubjectPriorities] = useState<Record<string, number>>({});
  const [availability, setAvailability] = useState<Record<string, Record<string, boolean>>>({});
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, string[]>>({});
  
  const [routine, setRoutine] = useState<GenerateScheduleOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateRoutine = async () => {
    setIsLoading(true);
    try {
      if (teachers.length === 0 || classes.length === 0 || subjects.length === 0 || timeSlots.length === 0) {
        throw new Error("Please provide teachers, classes, subjects, and time slots before generating a routine.");
      }

      const formattedAvailability: Record<string, string[]> = {};
      for (const teacher in availability) {
        formattedAvailability[teacher] = Object.entries(availability[teacher])
          .filter(([, isAvailable]) => isAvailable)
          .map(([slot]) => slot);
      }
      
      const input: GenerateScheduleInput = {
        teacherNames: teachers,
        classes,
        subjects,
        availability: formattedAvailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
      };

      const result = await generateSchedule(input);
      setRoutine(result);
      toast({
        title: "Routine Generated Successfully!",
        description: "Your new class routine is ready.",
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        variant: "destructive",
        title: "Error Generating Routine",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
      setRoutine(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = { teachers, classes, subjects, timeSlots };
      exportToCsv(dataToExport, "bihar-school-data.csv");
      toast({ title: "Data exported successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Export failed", description: "Could not export the data." });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromCsv(file);
      if (data.teachers) setTeachers(data.teachers);
      if (data.classes) setClasses(data.classes);
      if (data.subjects) setSubjects(data.subjects);
      if (data.timeSlots) setTimeSlots(data.timeSlots);
      toast({ title: "Data imported successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Import failed", description: "Could not parse the CSV file." });
    }
    // Reset file input
    if(fileInputRef.current) fileInputRef.current.value = "";
  };


  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-background font-sans">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">BiharSchoolRoutine</h1>
        </div>
        <div className="flex items-center gap-2">
           <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            className="hidden"
            accept="text/csv"
          />
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" /> Import Data
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
        </div>
      </header>
      
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataManager title="Teachers" icon={User} items={teachers} setItems={setTeachers} placeholder="New teacher name..." />
            <DataManager title="Classes" icon={School} items={classes} setItems={setClasses} placeholder="New class name..." />
            <DataManager title="Subjects" icon={Book} items={subjects} setItems={setSubjects} placeholder="New subject name..." />
            <DataManager title="Time Slots" icon={Clock} items={timeSlots} setItems={setTimeSlots} placeholder="e.g. 09:00 - 10:00" />
          </div>
          <RoutineControls
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            timeSlots={timeSlots}
            classRequirements={classRequirements}
            setClassRequirements={setClassRequirements}
            subjectPriorities={subjectPriorities}
            setSubjectPriorities={setSubjectPriorities}
            availability={availability}
            setAvailability={setAvailability}
            teacherSubjects={teacherSubjects}
            setTeacherSubjects={setTeacherSubjects}
          />
        </div>

        <div className="flex flex-col gap-6">
            <Card className="flex-grow flex flex-col">
                <CardContent className="p-6 flex-grow flex flex-col items-center justify-center">
                    <Button
                        size="lg"
                        className="w-full text-lg py-8"
                        onClick={handleGenerateRoutine}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        ) : (
                        <Wand2 className="mr-2 h-6 w-6" />
                        )}
                        Generate Routine
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                        Click to generate the school routine using AI based on the provided data.
                    </p>
                </CardContent>
            </Card>
            <div className="flex-grow">
              {routine ? (
                <RoutineDisplay scheduleData={routine} timeSlots={timeSlots} />
              ) : (
                <Card className="h-full">
                  <CardContent className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                      </div>
                      <h3 className="font-semibold text-lg text-foreground">Your routine will appear here</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        After generating a routine, you can view, print, and export it from this panel.
                      </p>
                  </CardContent>
                </Card>
              )}
            </div>
        </div>
      </main>
    </div>
  );
}
