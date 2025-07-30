
"use client";

import { createContext, useState, useEffect, useMemo, useRef, useCallback, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import type { SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";
import { sortTimeSlots } from "@/lib/utils";

type Unavailability = {
  teacher: string;
  day: string;
  timeSlot: string;
}

export type SchoolConfig = {
  classRequirements: Record<string, string[]>;
  subjectPriorities: Record<string, SubjectPriority>;
  unavailability: Unavailability[];
  teacherSubjects: Record<string, string[]>;
  teacherClasses: Record<string, string[]>;
  prayerTimeSlot: string;
  lunchTimeSlot: string;
  preventConsecutiveClasses: boolean;
  enableCombinedClasses: boolean;
  subjectCategories: Record<string, SubjectCategory>;
  dailyPeriodQuota: number;
};

type TeacherLoad = Record<string, Record<string, number>>;

type AppState = {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  config: SchoolConfig;
  routine: GenerateScheduleOutput | null;
  teacherLoad: TeacherLoad;
}

interface AppStateContextType {
  appState: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  updateConfig: <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  handleSaveConfig: () => void;
  handleImportConfig: () => void;
  handlePrint: () => void;
  handleClearRoutine: () => void;
}

export const AppStateContext = createContext<AppStateContextType>({} as AppStateContextType);

const DEFAULT_APP_STATE: AppState = {
  teachers: ["Mr. Sharma", "Mrs. Gupta", "Mr. Singh", "Ms. Verma", "Mr. Khan", "Mrs. Roy"],
  classes: ["Class 9A", "Class 9B", "Class 10A", "Class 11 Science", "Class 12 Science", "Class 12 Commerce"],
  subjects: ["Math", "Science", "Social Sc.", "English", "Hindi", "Physics", "Chemistry", "Biology", "Accountancy", "Business St.", "History", "Pol. Science", "Sanskrit", "Computer"],
  timeSlots: ["09:00 - 09:15", "09:15 - 10:00", "10:00 - 10:45", "10:45 - 11:30", "11:30 - 12:15", "12:15 - 13:00", "13:00 - 13:45", "13:45 - 14:30"],
  config: {
    classRequirements: {},
    subjectPriorities: {},
    unavailability: [],
    teacherSubjects: {},
    teacherClasses: {},
    subjectCategories: {},
    prayerTimeSlot: "09:00 - 09:15",
    lunchTimeSlot: "12:15 - 13:00",
    preventConsecutiveClasses: true,
    enableCombinedClasses: false,
    dailyPeriodQuota: 5,
  },
  routine: null,
  teacherLoad: {},
};


export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const { toast } = useToast();
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const calculatedTeacherLoad = useMemo(() => {
    const load: TeacherLoad = {};
    if (!appState.routine?.schedule) return {};

    appState.teachers.forEach(teacher => {
        load[teacher] = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Total: 0 };
    });

    appState.routine.schedule.forEach(entry => {
        const teachersInEntry = entry.teacher.split(' & ').map(t => t.trim());
        teachersInEntry.forEach(teacher => {
            if (teacher && teacher !== "N/A" && load[teacher]) {
                if (load[teacher][entry.day] !== undefined) {
                  load[teacher][entry.day]++;
                }
                load[teacher].Total++;
            }
        });
    });

    return load;
  }, [appState.routine, appState.teachers]);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem("biharSchoolRoutineState_v2");
      if (savedStateJSON) {
        const savedState: AppState = JSON.parse(savedStateJSON);
        if (savedState && savedState.config) {
          // Merge saved state with defaults to prevent missing properties on update
          const mergedConfig = { ...DEFAULT_APP_STATE.config, ...savedState.config };
          const mergedState = { ...DEFAULT_APP_STATE, ...savedState, config: mergedConfig };
          if(mergedState.timeSlots) {
            mergedState.timeSlots = sortTimeSlots(mergedState.timeSlots);
          }
          setAppState(mergedState);
        }
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      toast({ variant: "destructive", title: "Could not load saved data", description: "Starting with default settings." });
    } finally {
      setIsStateLoaded(true);
    }
  }, [toast]);
  
  useEffect(() => {
    if (isStateLoaded) {
      updateState('teacherLoad', calculatedTeacherLoad);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedTeacherLoad, isStateLoaded]);

  useEffect(() => {
    if (isStateLoaded) {
      try {
        const stateToSave = { ...appState, teacherLoad: {} }; // Don't save computed load
        const appStateJSON = JSON.stringify(stateToSave);
        localStorage.setItem("biharSchoolRoutineState_v2", appStateJSON);
      } catch (error) {
        console.error("Failed to save state to localStorage:", error);
         toast({ variant: "destructive", title: "Could not save progress" });
      }
    }
  }, [appState, isStateLoaded, toast]);
  
  const updateState = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setAppState(prevState => {
      const newState = { ...prevState, [key]: value };
      if (key === 'timeSlots') {
        newState.timeSlots = sortTimeSlots(value as string[]);
      }
      return newState;
    });
  }, []);
  
  const updateConfig = useCallback(<K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => {
     setAppState(prevState => ({
        ...prevState,
        config: { ...prevState.config, [key]: value },
    }));
  }, []);

  const handleSaveConfig = useCallback(() => {
    try {
      const configToSave = appState.config;
      const jsonString = JSON.stringify(configToSave, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "school-config.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Configuration saved successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Save failed" });
    }
  }, [appState.config, toast]);
  
  const handleFileLoadConfig = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const loadedConfig: Partial<SchoolConfig> = JSON.parse(text);
      if (typeof loadedConfig !== 'object' || loadedConfig === null) throw new Error("Invalid config file format.");
      
      const newConfig = { ...appState.config, ...loadedConfig };
      setAppState(prevState => ({ ...prevState, config: newConfig }));

      toast({ title: "Configuration loaded successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Load failed", description: "Could not parse the configuration file." });
    } finally {
        if(jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  const handleImportConfig = useCallback(() => {
    jsonInputRef.current?.click();
  }, []);
  
  const handlePrint = useCallback(() => {
    // This function is now handled inside RoutineDisplay component
    // We can call it via a ref if needed, but for now we just trigger window.print
    // A more robust solution could use a ref to call a specific print handler in the child component.
    window.print();
  }, []);
  
  const handleClearRoutine = useCallback(() => {
      updateState('routine', null);
      toast({ title: "Routine Cleared", description: "The generated routine has been removed." });
  }, [updateState, toast]);

  return (
    <AppStateContext.Provider value={{ appState, updateState, updateConfig, isLoading, setIsLoading, handleSaveConfig, handleImportConfig, handlePrint, handleClearRoutine }}>
      {children}
      <input
        type="file"
        ref={jsonInputRef}
        onChange={handleFileLoadConfig}
        className="hidden"
        accept=".json,application/json"
      />
    </AppStateContext.Provider>
  );
};
