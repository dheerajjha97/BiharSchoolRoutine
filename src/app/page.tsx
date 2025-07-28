
"use client";

import { useState, useMemo, ChangeEvent, useRef } from "react";
import type { GenerateScheduleInput, GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import { generateSchedule } from "@/ai/flows/generate-schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Book, Download, Loader2, School, Upload, User, Wand2, Clock, Save, FolderOpen, Trash2 } from "lucide-react";
import { Logo } from "@/components/icons";
import DataManager from "@/components/routine/data-manager";
import RoutineControls from "@/components/routine/routine-controls";
import RoutineDisplay from "@/components/routine/routine-display";
import { exportToCsv, importFromCsv } from "@/lib/csv-helpers";

type Unavailability = {
  teacher: string;
  day: string;
  timeSlot: string;
}

type SchoolConfig = {
  classRequirements: Record<string, string[]>;
  subjectImportance: Record<string, number>;
  unavailability: Unavailability[];
  teacherSubjects: Record<string, string[]>;
  teacherClasses: Record<string, string[]>;
};

export default function Home() {
  const [teachers, setTeachers] = useState<string[]>(["Mr. Sharma", "Mrs. Gupta", "Mr. Singh"]);
  const [classes, setClasses] = useState<string[]>(["Class 9A", "Class 10B"]);
  const [subjects, setSubjects] = useState<string[]>(["Math", "Science", "History", "English", "Prayer", "Lunch"]);
  const [timeSlots, setTimeSlots] = useState<string[]>([
    "09:00 - 09:15",
    "09:15 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
    "13:00 - 14:00",
    "15:00 - 16:00",
    "16:00 - 17:00",
  ]);
  
  const [classRequirements, setClassRequirements] = useState<Record<string, string[]>>({});
  const [subjectImportance, setSubjectImportance] = useState<Record<string, number>>({});
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, string[]>>({});
  const [teacherClasses, setTeacherClasses] = useState<Record<string, string[]>>({});

  const [routine, setRoutine] = useState<GenerateScheduleOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateRoutine = async () => {
    setIsLoading(true);
    try {
      if (teachers.length === 0 || classes.length === 0 || subjects.length === 0 || timeSlots.length === 0) {
        throw new Error("Please provide teachers, classes, subjects, and time slots before generating a routine.");
      }
      
      const input: GenerateScheduleInput = {
        teacherNames: teachers,
        classes,
        subjects,
        timeSlots,
        unavailability,
        subjectPriorities: subjectImportance,
        classRequirements,
        teacherSubjects,
        teacherClasses,
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

  const handleScheduleChange = (newSchedule: ScheduleEntry[]) => {
    setRoutine({ schedule: newSchedule });
  };
  
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
      if (data.teachers) setTeachers(data.teachers);
      if (data.classes) setClasses(data.classes);
      if (data.subjects) setSubjects(data.subjects);
      if (data.timeSlots) setTimeSlots(data.timeSlots);
      toast({ title: "Data imported successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Import failed", description: "Could not parse the CSV file." });
    }
    // Reset file input
    if(csvInputRef.current) csvInputRef.current.value = "";
  };

  const handleSaveConfig = () => {
    try {
      const config: SchoolConfig = {
        classRequirements,
        subjectImportance,
        unavailability,
        teacherSubjects,
        teacherClasses,
      };
      const jsonString = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "school-config.json");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Configuration saved successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Save failed", description: "Could not save the configuration." });
    }
  };

  const handleLoadConfigClick = () => {
    jsonInputRef.current?.click();
  };

  const handleFileLoadConfig = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config: SchoolConfig = JSON.parse(text);
      
      // Basic validation
      if (typeof config !== 'object' || config === null) throw new Error("Invalid config file format.");

      setClassRequirements(config.classRequirements || {});
      setSubjectImportance(config.subjectImportance || {});
      setUnavailability(config.unavailability || []);
      setTeacherSubjects(config.teacherSubjects || {});
      setTeacherClasses(config.teacherClasses || {});

      toast({ title: "Configuration loaded successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Load failed", description: "Could not parse the configuration file." });
    }
    // Reset file input
    if(jsonInputRef.current) jsonInputRef.current.value = "";
  };


  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-background font-sans">
      <header className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">BiharSchoolRoutine</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
           <input
            type="file"
            ref={csvInputRef}
            onChange={handleFileImportCsv}
            className="hidden"
            accept=".csv, text/csv"
          />
           <input
            type="file"
            ref={jsonInputRef}
            onChange={handleFileLoadConfig}
            className="hidden"
            accept="application/json"
          />
          <Button variant="outline" size="sm" onClick={handleImportCsvClick}>
            <Upload className="mr-2 h-4 w-4" /> Import Data
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoadConfigClick}>
            <FolderOpen className="mr-2 h-4 w-4" /> Load Config
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveConfig}>
            <Save className="mr-2 h-4 w-4" /> Save Config
          </Button>
        </div>
      </header>
      
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center">
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
                    Generate the school routine using AI. You can edit the result in the main display.
                </p>
            </CardContent>
          </Card>
           <Button variant="destructive" size="sm" onClick={() => setRoutine(null)}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Routine
            </Button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
            <DataManager title="Teachers" icon={User} items={teachers} setItems={setTeachers} placeholder="New teacher name..." />
            <DataManager title="Classes" icon={School} items={classes} setItems={setClasses} placeholder="New class name..." />
            <DataManager title="Subjects" icon={Book} items={subjects} setItems={setSubjects} placeholder="New subject name..." />
            <DataManager title="Time Slots" icon={Clock} items={timeSlots} setItems={setTimeSlots} placeholder="e.g. 09:00 - 10:00" />
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
             <RoutineControls
                teachers={teachers}
                classes={classes}
                subjects={subjects}
                timeSlots={timeSlots}
                classRequirements={classRequirements}
                setClassRequirements={setClassRequirements}
                subjectImportance={subjectImportance}
                setSubjectImportance={setSubjectImportance}
                unavailability={unavailability}
                setUnavailability={setUnavailability}
                teacherSubjects={teacherSubjects}
                setTeacherSubjects={setTeacherSubjects}
                teacherClasses={teacherClasses}
                setTeacherClasses={setTeacherClasses}
              />
             <RoutineDisplay 
                scheduleData={routine}
                onScheduleChange={handleScheduleChange}
                timeSlots={timeSlots} 
                classes={classes}
                subjects={subjects}
                teachers={teachers}
              />
        </div>
      </main>
    </div>
  );
}
