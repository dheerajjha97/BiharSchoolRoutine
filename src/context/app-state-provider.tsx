
"use client";

import { createContext, useState, useEffect, useMemo, useRef, useCallback, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import type { SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";

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
  teachers: ["Mr. Sharma", "Mrs. Gupta", "Mr. Singh", "Ms. Verma", "Mr. Khan"],
  classes: ["Class 9A", "Class 10B", "Class 11 Science", "Class 11 Commerce", "Class 12 Science", "Class 12 Arts"],
  subjects: ["Math", "Science", "Social Science", "English", "Hindi", "Physics", "Chemistry", "Biology", "Accountancy", "Business Studies", "History", "Political Science", "Sanskrit", "Prayer", "Lunch", "Library", "Sports", "Computer"],
  timeSlots: ["09:00 - 09:15", "09:15 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00"],
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
    dailyPeriodQuota: 6,
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
  const printRef = useRef<{ handlePrint: () => void } | null>(null);

  const calculatedTeacherLoad = useMemo(() => {
    const load: TeacherLoad = {};
    if (!appState.routine?.schedule) return load;

    appState.teachers.forEach(teacher => {
        load[teacher] = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Total: 0 };
    });

    appState.routine.schedule.forEach(entry => {
        if (entry.teacher && entry.teacher !== "N/A" && load[entry.teacher]) {
            if (load[entry.teacher][entry.day] !== undefined) {
              load[entry.teacher][entry.day]++;
            }
            load[entry.teacher].Total++;
        }
    });

    return load;
  }, [appState.routine, appState.teachers]);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem("biharSchoolRoutineState");
      if (savedStateJSON) {
        const savedState: AppState = JSON.parse(savedStateJSON);
        if (savedState && savedState.teachers && savedState.config) {
          if (!savedState.config.subjectCategories) savedState.config.subjectCategories = {};
          if (savedState.config.dailyPeriodQuota === undefined) savedState.config.dailyPeriodQuota = 6;
          setAppState(savedState);
        }
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      toast({
        variant: "destructive",
        title: "Could not load saved data",
        description: "Starting with default settings.",
      });
    }
    setIsStateLoaded(true);
  }, [toast]);
  
  useEffect(() => {
    const finalState = {...appState, teacherLoad: calculatedTeacherLoad };
    setAppState(finalState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedTeacherLoad]);

  useEffect(() => {
    if (isStateLoaded) {
      try {
        const stateToSave = { ...appState, teacherLoad: {} }; // Don't save computed load
        const appStateJSON = JSON.stringify(stateToSave);
        localStorage.setItem("biharSchoolRoutineState", appStateJSON);
      } catch (error) {
        console.error("Failed to save state to localStorage:", error);
         toast({
            variant: "destructive",
            title: "Could not save progress",
        });
      }
    }
  }, [appState, isStateLoaded, toast]);
  
  const updateState = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setAppState(prevState => ({ ...prevState, [key]: value }));
  }, []);
  
  const updateConfig = useCallback(<K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => {
     setAppState(prevState => ({
        ...prevState,
        config: { ...prevState.config, [key]: value },
    }));
  }, []);

  const handleSaveConfig = useCallback(() => {
    try {
      const jsonString = JSON.stringify(appState.config, null, 2);
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
      toast({ variant: "destructive", title: "Save failed" });
    }
  }, [appState.config, toast]);
  
  const handleFileLoadConfig = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const loadedConfig: SchoolConfig = JSON.parse(text);
      if (typeof loadedConfig !== 'object' || loadedConfig === null) throw new Error("Invalid config file format.");
      updateConfig('classRequirements', loadedConfig.classRequirements || {});
      updateConfig('subjectPriorities', loadedConfig.subjectPriorities || {});
      updateConfig('unavailability', loadedConfig.unavailability || []);
      updateConfig('teacherSubjects', loadedConfig.teacherSubjects || {});
      updateConfig('teacherClasses', loadedConfig.teacherClasses || {});
      updateConfig('prayerTimeSlot', loadedConfig.prayerTimeSlot || '');
      updateConfig('lunchTimeSlot', loadedConfig.lunchTimeSlot || '');
      updateConfig('preventConsecutiveClasses', loadedConfig.preventConsecutiveClasses ?? true);
      updateConfig('enableCombinedClasses', loadedConfig.enableCombinedClasses ?? false);
      updateConfig('subjectCategories', loadedConfig.subjectCategories || {});
      updateConfig('dailyPeriodQuota', loadedConfig.dailyPeriodQuota || 6);

      toast({ title: "Configuration loaded successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Load failed", description: "Could not parse the configuration file." });
    }
    if(jsonInputRef.current) jsonInputRef.current.value = "";
  };

  const handleImportConfig = useCallback(() => {
    jsonInputRef.current?.click();
  }, []);
  
  const handlePrint = useCallback(() => {
    const routineDisplay = document.querySelector('.routine-display-card');
    if (routineDisplay) {
        // Temporarily add a ref to the routine display component if needed
        // This is a simplified approach. A ref-based approach from RoutineDisplay would be cleaner.
        const root = document.documentElement;
        // Assume print header/footer are handled within RoutineDisplay now
        window.print();
    } else {
        toast({
            variant: "destructive",
            title: "Print Error",
            description: "Could not find the routine display to print.",
        });
    }
  }, [toast]);
  
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
        accept="application/json"
      />
    </AppStateContext.Provider>
  );
};
