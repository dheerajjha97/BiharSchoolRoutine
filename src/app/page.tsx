
"use client";

import { useState, useMemo, ChangeEvent, useRef, useEffect } from "react";
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Book, Download, Loader2, School, Upload, User, Wand2, Clock, Save, FolderOpen, Trash2, Printer } from "lucide-react";
import { Logo } from "@/components/icons";
import DataManager from "@/components/routine/data-manager";
import RoutineControls from "@/components/routine/routine-controls";
import RoutineDisplay from "@/components/routine/routine-display";
import TeacherLoad from "@/components/routine/teacher-load";
import { exportToCsv, importFromCsv } from "@/lib/csv-helpers";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import type { GenerateScheduleLogicInput, SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";

type Unavailability = {
  teacher: string;
  day: string;
  timeSlot: string;
}

type SchoolConfig = {
  classRequirements: Record<string, string[]>;
  subjectPriorities: Record<string, SubjectPriority>;
  unavailability: Unavailability[];
  teacherSubjects: Record<string, string[]>;
  teacherClasses: Record<string, string[]>;
  prayerTimeSlot?: string;
  lunchTimeSlot?: string;
  preventConsecutiveClasses?: boolean;
  enableCombinedClasses?: boolean;
  subjectCategories: Record<string, SubjectCategory>;
};

type AppState = {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  config: SchoolConfig;
  routine: GenerateScheduleOutput | null;
}

const DEFAULT_APP_STATE: AppState = {
  teachers: ["Mr. Sharma", "Mrs. Gupta", "Mr. Singh", "Ms. Verma", "Mr. Khan"],
  classes: [
    "Class 9A", 
    "Class 10B", 
    "Class 11 Science", 
    "Class 11 Commerce", 
    "Class 12 Science", 
    "Class 12 Arts"
  ],
  subjects: [
    "Math", "Science", "Social Science", "English", "Hindi", 
    "Physics", "Chemistry", "Biology", "Accountancy", "Business Studies", 
    "History", "Political Science", "Sanskrit", "Prayer", "Lunch", 
    "Library", "Sports", "Computer"
  ],
  timeSlots: [
    "09:00 - 09:15",
    "09:15 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
    "13:00 - 14:00",
    "14:00 - 15:00",
    "15:00 - 16:00",
  ],
  config: {
    classRequirements: {
      "Class 9A": ["Math", "Science", "Social Science", "English", "Hindi"],
      "Class 10B": ["Math", "Science", "Social Science", "English", "Hindi"],
      "Class 11 Science": ["Physics", "Chemistry", "Biology", "Math", "English", "Computer"],
      "Class 11 Commerce": ["Accountancy", "Business Studies", "Math", "English", "Computer"],
      "Class 12 Science": ["Physics", "Chemistry", "Biology", "Math", "English", "Computer"],
      "Class 12 Arts": ["History", "Political Science", "Hindi", "English", "Computer"],
    },
    subjectPriorities: {},
    unavailability: [],
    teacherSubjects: {},
    teacherClasses: {},
    subjectCategories: {},
    prayerTimeSlot: "09:00 - 09:15",
    lunchTimeSlot: "12:00 - 13:00",
    preventConsecutiveClasses: true,
    enableCombinedClasses: false,
  },
  routine: null,
};


export default function Home() {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const { toast } = useToast();

  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const routineDisplayRef = useRef<{ handlePrint: () => void }>(null);

  // Load state from localStorage on initial mount
  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem("biharSchoolRoutineState");
      if (savedStateJSON) {
        const savedState: AppState = JSON.parse(savedStateJSON);
        // Basic validation to ensure the loaded data structure is what we expect
        if (savedState && savedState.teachers && savedState.config) {
          // Ensure subjectCategories exists, if not, initialize it from old data or default
          if (!savedState.config.subjectCategories) {
            savedState.config.subjectCategories = {};
            // You can add logic here to auto-categorize based on subject names if needed
          }
          setAppState(savedState);
        }
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      toast({
        variant: "destructive",
        title: "Could not load saved data",
        description: "The saved data might be corrupted. Starting with default settings.",
      });
    }
    setIsStateLoaded(true);
  }, [toast]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isStateLoaded) {
      try {
        const appStateJSON = JSON.stringify(appState);
        localStorage.setItem("biharSchoolRoutineState", appStateJSON);
      } catch (error) {
        console.error("Failed to save state to localStorage:", error);
         toast({
            variant: "destructive",
            title: "Could not save progress",
            description: "Your changes might not be saved.",
        });
      }
    }
  }, [appState, isStateLoaded, toast]);
  
  // Destructure state for easier access in the component
  const { teachers, classes, subjects, timeSlots, config, routine } = appState;
  const { 
    classRequirements, subjectPriorities, unavailability, teacherSubjects, 
    teacherClasses, prayerTimeSlot, lunchTimeSlot, preventConsecutiveClasses,
    enableCombinedClasses, subjectCategories
  } = config;

  const teacherLoad = useMemo(() => {
    const load: Record<string, Record<string, number>> = {};
    if (!routine?.schedule) return load;

    teachers.forEach(teacher => {
        load[teacher] = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Total: 0 };
    });

    routine.schedule.forEach(entry => {
        if (entry.teacher && entry.teacher !== "N/A" && load[entry.teacher]) {
            if (load[entry.teacher][entry.day] !== undefined) {
              load[entry.teacher][entry.day]++;
            }
            load[entry.teacher].Total++;
        }
    });

    return load;
  }, [routine, teachers]);
  
  // Helper to update parts of the state
  const updateState = <K extends keyof AppState>(key: K, value: AppState[K]) => {
    setAppState(prevState => ({ ...prevState, [key]: value }));
  };
  
  const updateConfig = <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => {
     setAppState(prevState => ({
        ...prevState,
        config: { ...prevState.config, [key]: value },
    }));
  };


  const handleGenerateRoutine = async () => {
    setIsLoading(true);
    try {
      if (teachers.length === 0 || classes.length === 0 || subjects.length === 0 || timeSlots.length === 0) {
        throw new Error("Please provide teachers, classes, subjects, and time slots before generating a routine.");
      }
      
      const input: GenerateScheduleLogicInput = {
        teacherNames: teachers,
        classes,
        subjects,
        timeSlots,
        unavailability,
        subjectPriorities,
        classRequirements,
        teacherSubjects,
        teacherClasses,
        prayerTimeSlot,
        lunchTimeSlot,
        preventConsecutiveClasses,
        enableCombinedClasses,
        subjectCategories,
      };

      const result = generateScheduleLogic(input);
      updateState('routine', result);
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
      updateState('routine', null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleChange = (newSchedule: ScheduleEntry[]) => {
    updateState('routine', { schedule: newSchedule });
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

  const handleSaveConfig = () => {
    try {
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
      const loadedConfig: SchoolConfig = JSON.parse(text);
      
      if (typeof loadedConfig !== 'object' || loadedConfig === null) throw new Error("Invalid config file format.");

      updateState('config', loadedConfig);
      toast({ title: "Configuration loaded successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Load failed", description: "Could not parse the configuration file." });
    }
    if(jsonInputRef.current) jsonInputRef.current.value = "";
  };
  
  const handlePrintClick = () => {
    routineDisplayRef.current?.handlePrint();
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-background font-sans">
      <header className="flex items-center justify-between mb-6 flex-wrap gap-2 no-print">
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
          <Button variant="outline" size="sm" onClick={handlePrintClick}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </header>
      
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6 no-print">
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
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
            </CardContent>
          </Card>

          <TeacherLoad teacherLoad={teacherLoad} />
          
          <Button variant="destructive" size="sm" onClick={() => updateState('routine', null)}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Routine
            </Button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
            <DataManager title="Teachers" icon={User} items={teachers} setItems={(newItems) => updateState('teachers', newItems)} placeholder="New teacher name..." />
            <DataManager title="Classes" icon={School} items={classes} setItems={(newItems) => updateState('classes', newItems)} placeholder="New class name..." />
            <DataManager title="Subjects" icon={Book} items={subjects} setItems={(newItems) => updateState('subjects', newItems)} placeholder="New subject name..." />
            <DataManager title="Time Slots" icon={Clock} items={timeSlots} setItems={(newItems) => updateState('timeSlots', newItems)} placeholder="e.g. 09:00 - 10:00" />
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6 no-print">
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
              />
        </div>
        <div className="lg:col-span-3">
          <RoutineDisplay 
              ref={routineDisplayRef}
              scheduleData={routine}
              onScheduleChange={handleScheduleChange}
              timeSlots={timeSlots} 
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              teacherSubjects={teacherSubjects}
            />
        </div>
      </main>
    </div>
  );
}
