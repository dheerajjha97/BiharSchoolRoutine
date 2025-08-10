
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import type { SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";
import { sortTimeSlots } from "@/lib/utils";
import { getFirebaseAuth, getFirebaseApp } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User, type AuthError, getIdToken } from "firebase/auth";
import { GoogleDriveService } from "@/lib/google-drive-service";
import type { SubstitutionPlan } from "@/lib/substitution-generator";

type Unavailability = {
  teacher: string;
  day: string;
  timeSlot: string;
}

export type CombinedClassRule = {
    classes: string[];
    subject: string;
    teacher: string;
}

export type SplitClassRule = {
    className: string;
    parts: {
        subject: string;
        teacher: string;
    }[];
}

export type RoutineVersion = {
    id: string;
    name: string;
    createdAt: string;
    schedule: GenerateScheduleOutput;
};

export type SchoolConfig = {
  classRequirements: Record<string, string[]>;
  subjectPriorities: Record<string, SubjectPriority>;
  unavailability: Unavailability[];
  teacherSubjects: Record<string, string[]>;
  teacherClasses: Record<string, string[]>;
  classTeachers: Record<string, string>;
  prayerTimeSlot: string;
  lunchTimeSlot: string;
  preventConsecutiveClasses: boolean;
  subjectCategories: Record<string, SubjectCategory>;
  dailyPeriodQuota: number;
  combinedClasses: CombinedClassRule[];
  splitClasses: SplitClassRule[];
};

export type TeacherLoadDetail = {
    total: number;
    main: number;
    additional: number;
};
export type TeacherLoad = Record<string, Record<string, TeacherLoadDetail>>;

export type ExamEntry = {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    classes: string[];
    rooms: string[];
    subject: string;
};

export type DutyChart = {
    duties: Record<string, Record<string, string[]>>; // Key: "date-startTime", Value: { room: [teachers] }
    examSlots: { date: string, startTime: string, endTime: string }[];
};


export type AppState = {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  rooms: string[];
  pdfHeader: string;
  config: SchoolConfig;
  routineHistory: RoutineVersion[];
  activeRoutineId: string | null;
  teacherLoad: TeacherLoad;
  examTimetable: ExamEntry[];
  // Non-persistent state for daily adjustments
  adjustments: {
    date: string;
    absentTeachers: string[];
    substitutionPlan: SubstitutionPlan | null;
  }
}

interface AppStateContextType {
  appState: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setFullState: (newState: Partial<AppState>) => void;
  updateConfig: <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => void;
  updateAdjustments: <K extends keyof AppState['adjustments']>(key: K, value: AppState['adjustments'][K]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isAuthLoading: boolean;
  isSyncing: boolean;
  user: User | null;
  handleGoogleSignIn: () => void;
  handleLogout: () => void;
  // Routine history management
  routineHistory: RoutineVersion[];
  activeRoutineId: string | null;
  setActiveRoutineId: (id: string) => void;
  addRoutineVersion: (schedule: GenerateScheduleOutput, name?: string) => void;
  updateRoutineVersion: (id: string, updates: Partial<Omit<RoutineVersion, 'id' | 'createdAt'>>) => void;
  deleteRoutineVersion: (id: string) => void;
}

export const AppStateContext = createContext<AppStateContextType>({} as AppStateContextType);

const DEFAULT_ADJUSTMENTS_STATE = {
    date: new Date().toISOString().split('T')[0], // Today's date
    absentTeachers: [],
    substitutionPlan: null
};

const LOCAL_STORAGE_KEY = "schoolRoutineState";

const DEFAULT_APP_STATE: AppState = {
  teachers: ["Mr. Sharma", "Mrs. Gupta", "Ms. Singh", "Mr. Kumar", "Mrs. Roy", "Mr. Das"],
  classes: ["Class 9A", "Class 9B", "Class 10A", "Class 10B", "Class 11 Sci", "Class 12 Sci"],
  subjects: ["Math", "Science", "English", "History", "Physics", "Chemistry", "Biology", "Computer Science", "Hindi", "Attendance", "Library", "Art"],
  timeSlots: [
    "09:00 - 09:45",
    "09:45 - 10:30",
    "10:30 - 11:15",
    "11:15 - 11:30", // Prayer
    "11:30 - 12:15",
    "12:15 - 01:00",
    "01:00 - 01:45", // Lunch
    "01:45 - 02:30",
    "02:30 - 03:15"
  ],
  rooms: ["Room 101", "Room 102", "Room 103", "Hall A", "Hall B"],
  pdfHeader: "My School Name\nWeekly Class Routine\n2024-25",
  config: {
    teacherSubjects: {
      "Mr. Sharma": ["Math", "Physics"],
      "Mrs. Gupta": ["English", "History", "Library"],
      "Ms. Singh": ["Science", "Biology", "Chemistry"],
      "Mr. Kumar": ["Computer Science", "Math"],
      "Mrs. Roy": ["Hindi", "History", "Art"],
      "Mr. Das": ["Physics", "Chemistry"]
    },
    teacherClasses: {
        "Mr. Sharma": ["Class 10A", "Class 10B", "Class 11 Sci", "Class 12 Sci"],
        "Mrs. Gupta": ["Class 9A", "Class 9B", "Class 10A", "Class 10B"],
        "Ms. Singh": ["Class 9A", "Class 9B", "Class 10A", "Class 11 Sci"],
        "Mr. Kumar": ["Class 9A", "Class 10A", "Class 11 Sci", "Class 12 Sci"],
        "Mrs. Roy": ["Class 9A", "Class 9B"],
        "Mr. Das": ["Class 11 Sci", "Class 12 Sci"],
    },
    classRequirements: {
        "Class 9A": ["Math", "Science", "English", "History", "Hindi", "Computer Science", "Library", "Art"],
        "Class 9B": ["Math", "Science", "English", "History", "Hindi", "Art"],
        "Class 10A": ["Math", "Science", "English", "History", "Hindi"],
        "Class 10B": ["Math", "Science", "English", "History", "Hindi"],
        "Class 11 Sci": ["Physics", "Chemistry", "Math", "English", "Computer Science"],
        "Class 12 Sci": ["Physics", "Biology", "Math", "English", "Computer Science"],
    },
    classTeachers: {
      "Class 9A": "Mrs. Gupta",
      "Class 9B": "Mrs. Roy",
      "Class 10A": "Mr. Kumar",
    },
    subjectCategories: {
        "Math": "main",
        "Science": "main",
        "English": "main",
        "History": "additional",
        "Physics": "main",
        "Chemistry": "main",
        "Biology": "main",
        "Computer Science": "additional",
        "Hindi": "additional",
        "Attendance": "main",
        "Library": "additional",
        "Art": "additional"
    },
    subjectPriorities: {
        "Math": "before",
        "Physics": "before",
        "Science": "before"
    },
    unavailability: [],
    prayerTimeSlot: "11:15 - 11:30",
    lunchTimeSlot: "01:00 - 01:45",
    preventConsecutiveClasses: true,
    dailyPeriodQuota: 5,
    combinedClasses: [],
    splitClasses: [],
  },
  routineHistory: [],
  activeRoutineId: null,
  teacherLoad: {},
  examTimetable: [],
  adjustments: DEFAULT_ADJUSTMENTS_STATE,
};

// Function to strip non-persistent state for saving
const getPersistentState = (state: AppState): Omit<AppState, 'adjustments' | 'teacherLoad'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { adjustments, teacherLoad, ...persistentState } = state;
  return persistentState;
};

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const driveServiceRef = useRef(new GoogleDriveService());
  const stateRef = useRef(appState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setFullState = useCallback((newState: Partial<AppState>) => {
    setAppState(prevState => ({
        ...DEFAULT_APP_STATE, // Reset to default first
        ...prevState, // Then apply existing state
        ...newState, // Then apply new state
        adjustments: DEFAULT_ADJUSTMENTS_STATE, // Always reset adjustments
    }));
  }, []);

  useEffect(() => {
    stateRef.current = appState;
  }, [appState]);

  const activeRoutine = useMemo(() => {
    if (!appState.activeRoutineId || !appState.routineHistory) return null;
    return appState.routineHistory.find(r => r.id === appState.activeRoutineId);
  }, [appState.routineHistory, appState.activeRoutineId]);

  const calculatedTeacherLoad = useMemo(() => {
    const load: TeacherLoad = {};
    if (!activeRoutine?.schedule?.schedule || !appState.teachers) return {};

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];
    
    appState.teachers.forEach(teacher => {
        load[teacher] = {};
        days.forEach(day => {
            load[teacher][day] = { total: 0, main: 0, additional: 0 };
        });
    });

    activeRoutine.schedule.schedule.forEach(entry => {
        if(entry.subject === "Prayer" || entry.subject === "Lunch" || entry.subject === "---") return;
        
        const teachersInEntry = entry.teacher.split(' & ').map(t => t.trim());
        const subjectsInEntry = entry.subject.split(' / ').map(s => s.trim());

        teachersInEntry.forEach((teacher, index) => {
            if (teacher && teacher !== "N/A" && load[teacher]) {
                const subject = subjectsInEntry[index] || subjectsInEntry[0];
                const category = appState.config.subjectCategories[subject] || 'additional';

                if (load[teacher][entry.day]) {
                    load[teacher][entry.day].total++;
                    if (category === 'main') {
                        load[teacher][entry.day].main++;
                    } else {
                        load[teacher][entry.day].additional++;
                    }
                }
                
                load[teacher].Total.total++;
                if (category === 'main') {
                    load[teacher].Total.main++;
                } else {
                    load[teacher].Total.additional++;
                }
            }
        });
    });

    return load;
  }, [activeRoutine, appState.teachers, appState.config.subjectCategories]);
  
  useEffect(() => {
    updateState('teacherLoad', calculatedTeacherLoad);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedTeacherLoad]);
  
  const updateState = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setAppState(prevState => {
      const newState = { ...prevState, [key]: value };
      if (key === 'timeSlots' && Array.isArray(value)) {
        newState.timeSlots = sortTimeSlots(value as string[]);
      }
      if (['teachers', 'classes', 'subjects', 'timeSlots', 'rooms'].includes(key as string)) {
          newState.routineHistory = [];
          newState.activeRoutineId = null;
          newState.teacherLoad = {};
          newState.adjustments = DEFAULT_ADJUSTMENTS_STATE;
          newState.examTimetable = [];
      }
      return newState;
    });
  }, []);
  
  const updateConfig = useCallback(<K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => {
     setAppState(prevState => ({
        ...prevState,
        config: { ...prevState.config, [key]: value },
        routineHistory: [], 
        activeRoutineId: null,
        teacherLoad: {},
        adjustments: DEFAULT_ADJUSTMENTS_STATE,
    }));
  }, []);

  const updateAdjustments = useCallback(<K extends keyof AppState['adjustments']>(key: K, value: AppState['adjustments'][K]) => {
    setAppState(prevState => ({
      ...prevState,
      adjustments: { ...prevState.adjustments, [key]: value },
    }));
  }, []);
  
  const addRoutineVersion = useCallback((schedule: GenerateScheduleOutput, name?: string) => {
    const newVersion: RoutineVersion = {
      id: `routine_${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: name || `Routine - ${new Date().toLocaleString()}`,
      schedule,
    };

    setAppState(prevState => {
        const newHistory = [newVersion, ...prevState.routineHistory].slice(0, 5); // Keep last 5
        return {
            ...prevState,
            routineHistory: newHistory,
            activeRoutineId: newVersion.id,
        }
    });
  }, []);

  const updateRoutineVersion = useCallback((id: string, updates: Partial<Omit<RoutineVersion, 'id' | 'createdAt'>>) => {
    setAppState(prevState => ({
      ...prevState,
      routineHistory: prevState.routineHistory.map(r => 
        r.id === id ? { ...r, ...updates } : r
      )
    }));
  }, []);

  const deleteRoutineVersion = useCallback((id: string) => {
    setAppState(prevState => {
      const newHistory = prevState.routineHistory.filter(r => r.id !== id);
      let newActiveId = prevState.activeRoutineId;
      
      if (prevState.activeRoutineId === id) {
        if (newHistory.length > 0) {
           const sortedHistory = [...newHistory].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
           newActiveId = sortedHistory[0].id;
        } else {
           newActiveId = null;
        }
      }
      
      return {
        ...prevState,
        routineHistory: newHistory,
        activeRoutineId: newActiveId,
      };
    });
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setIsAuthLoading(true);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      await signInWithPopup(auth, provider);
      // Auth state change will be handled by the onAuthStateChanged listener
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: authError.message,
      });
      setIsAuthLoading(false);
    }
  }, [toast]);
  
  const handleLogout = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      await signOut(getFirebaseAuth());
      setFullState(DEFAULT_APP_STATE); // Reset to default state on logout
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({ title: "Logged out successfully." });
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: authError.message,
      });
    } finally {
      setIsAuthLoading(false);
    }
  }, [toast, setFullState]);

  // Load from Local Storage on initial mount (for guest users)
  useEffect(() => {
    if (!user) {
      try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          setFullState(savedState);
        }
      } catch (error) {
        console.error("Failed to load state from local storage:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, setFullState]);

  // Auth state listener
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsSyncing(true);
        try {
          const token = await getIdToken(currentUser, true); // Force refresh the token
          const backup = await driveServiceRef.current.loadBackup(token);
          
          if (backup) {
            setFullState(backup);
            toast({ title: "Data restored from Google Drive." });
          } else {
            // If no backup on Drive, save the current local state to Drive.
            await driveServiceRef.current.saveBackup(getPersistentState(stateRef.current), token);
            toast({ title: "Local data synced to Google Drive." });
          }
        } catch (error) {
          console.error("Google Drive sync error:", error);
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Could not connect to Google Drive. Your data is safe locally.",
          });
        } finally {
          setIsSyncing(false);
        }
      }
      setIsAuthLoading(false);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, setFullState]);

  // Debounced save effect
  useEffect(() => {
    if (isLoading || isAuthLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const stateToSave = getPersistentState(stateRef.current);
        if (user) {
          setIsSyncing(true);
          try {
            const token = await getIdToken(user, true); // Get fresh token for saving
            await driveServiceRef.current.saveBackup(stateToSave, token);
            console.log("Data saved to Google Drive.");
          } catch (err) {
            console.error("Failed to save to Google Drive:", err);
            toast({ variant: "destructive", title: "Google Drive Sync Failed", description: "Could not save latest changes." });
          } finally {
            setIsSyncing(false);
          }
        } else {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
          console.log("Data saved to local storage.");
        }
      } catch (error) {
        console.error("Failed to save state:", error);
        toast({ variant: "destructive", title: "Save Error", description: "Could not save your changes." });
      }
    }, 1500); // 1.5-second debounce delay

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [appState, user, isLoading, isAuthLoading, toast]);

  return (
    <AppStateContext.Provider value={{ 
        appState, 
        updateState, 
        setFullState,
        updateConfig,
        updateAdjustments,
        isLoading: isLoading || isAuthLoading, 
        setIsLoading,
        isAuthLoading,
        isSyncing,
        user,
        handleGoogleSignIn,
        handleLogout,
        routineHistory: appState.routineHistory,
        activeRoutineId: appState.activeRoutineId,
        setActiveRoutineId: (id: string) => updateState('activeRoutineId', id),
        addRoutineVersion,
        updateRoutineVersion,
        deleteRoutineVersion
    }}>
      {children}
    </AppStateContext.Provider>
  );
};
