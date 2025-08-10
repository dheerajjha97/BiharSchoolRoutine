
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateScheduleOutput, RoutineVersion } from "@/ai/flows/generate-schedule";
import type { SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";
import { sortTimeSlots } from "@/lib/utils";
import { getFirebaseAuth, getFirebaseApp } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User, type AuthError } from "firebase/auth";
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
  setFullState: (newState: AppState) => void;
  updateConfig: <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => void;
  updateAdjustments: <K extends keyof AppState['adjustments']>(key: K, value: AppState['adjustments'][K]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isAuthLoading: boolean;
  isSyncing: boolean;
  user: User | null;
  handleGoogleSignIn: () => void;
  handleLogout: () => void;
  setActiveRoutineId: (id: string) => void;
  addRoutineVersion: (schedule: GenerateScheduleOutput, name: string) => void;
  updateRoutineVersion: (id: string, updates: Partial<RoutineVersion>) => void;
  deleteRoutineVersion: (id: string) => void;
}

export const AppStateContext = createContext<AppStateContextType>({} as AppStateContextType);

const DEFAULT_ADJUSTMENTS_STATE = {
    date: new Date().toISOString().split('T')[0], // Today's date
    absentTeachers: [],
    substitutionPlan: null
};

const LOCAL_STORAGE_KEY = "biharSchoolRoutineState";

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
  const driveServiceRef = useRef<GoogleDriveService | null>(null);
  const stateRef = useRef(appState);

  useEffect(() => {
    stateRef.current = appState;
  }, [appState]);

  const activeRoutine = useMemo(() => {
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
                const subject = subjectsInEntry[index] || subjectsInEntry[0]; // For split, match teacher to subject
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

  const setFullState = useCallback((newState: Partial<AppState>) => {
    setAppState(prevState => {
        const mergedConfig = { ...DEFAULT_APP_STATE.config, ...newState.config };
        const mergedState = { 
            ...DEFAULT_APP_STATE,
            ...prevState, 
            ...newState, 
            config: mergedConfig,
            adjustments: DEFAULT_ADJUSTMENTS_STATE 
        };
        
        if(mergedState.timeSlots) {
          mergedState.timeSlots = sortTimeSlots(mergedState.timeSlots);
        }

        if (!mergedState.activeRoutineId && mergedState.routineHistory.length > 0) {
            const sortedHistory = [...mergedState.routineHistory].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            mergedState.activeRoutineId = sortedHistory[0].id;
        }

        return mergedState;
    });
  }, []);

  const saveStateToDrive = useCallback(async (stateToSave: AppState, showToast = false) => {
    if (!driveServiceRef.current || !driveServiceRef.current.isReady()) return;
    setIsSyncing(true);
    try {
      await driveServiceRef.current.saveBackup(getPersistentState(stateToSave));
      if (showToast) {
        toast({ title: "Progress Saved", description: "Your data has been saved to Google Drive." });
      }
    } catch (error: any) {
      console.error("Failed to save state to Google Drive:", error);
       if (error.message.includes('401') || error.message.includes('Authentication Error')) {
            toast({ variant: "destructive", title: "Authentication Error", description: "Please log out and log in again to refresh your session.", duration: 5000 });
            await handleLogout(false);
        } else {
            toast({ variant: "destructive", title: "Sync Failed", description: "Could not save data to Google Drive." });
        }
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  const loadStateFromDrive = useCallback(async (driveService: GoogleDriveService) => {
      setIsLoading(true);
      try {
        toast({ title: "Loading data...", description: "Fetching your saved data from Google Drive." });
        const loadedState = await driveService.loadBackup();
        if (loadedState && loadedState.teachers && loadedState.teachers.length > 0) {
          setFullState(loadedState as AppState);
          toast({ title: "Data Loaded Successfully", description: "Your data has been restored from Google Drive." });
        } else {
            setFullState(DEFAULT_APP_STATE);
            toast({ title: "No backup found", description: "Starting with sample data. Your work will be saved automatically to your Drive." });
            await saveStateToDrive(DEFAULT_APP_STATE, false);
        }
      } catch (error) {
        console.error("Failed to load state from Google Drive:", error);
        toast({ variant: "destructive", title: "Load Failed", description: "Could not load data from Drive. Using local data if available." });
      } finally {
        setIsLoading(false);
      }
  }, [toast, setFullState, saveStateToDrive]);

  useEffect(() => {
    // This effect runs once on mount to load initial data for guest users
    if (typeof window !== "undefined") {
      try {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          setFullState(JSON.parse(localData));
        }
      } catch (error) {
        console.error("Failed to load data from local storage:", error);
        setFullState(DEFAULT_APP_STATE);
      }
    }
    setIsLoading(false);
  }, [setFullState]);
  
  // This effect handles saving data based on user login state
  useEffect(() => {
    if (isLoading) return; // Don't save while initially loading

    if (user) {
        saveStateToDrive(appState, false);
    } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(getPersistentState(appState)));
    }
  }, [appState, user, isLoading, saveStateToDrive]);


  const handleLogout = useCallback(async (withSave = true) => {
    const auth = getFirebaseAuth();
    setIsAuthLoading(true);
    if (withSave && user && driveServiceRef.current?.isReady()) {
        toast({ title: "Saving your work...", description: "Saving your final changes to Google Drive before logging out." });
        await saveStateToDrive(stateRef.current, true); 
    }
    await signOut(auth);
  }, [user, toast, saveStateToDrive]);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      await signInWithPopup(auth, provider);
      // Auth state change will be handled by the onAuthStateChanged listener
    } catch (error: any) {
        const authError = error as AuthError;
        console.error("Google Sign-In Error:", authError);
        toast({ 
            variant: "destructive", 
            title: "Login Failed", 
            description: `Error: ${authError.code} - ${authError.message}`,
            duration: 9000
        });
        setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (newUser) => {
      setIsAuthLoading(true);
      if (newUser) {
        setUser(newUser);
        if (!driveServiceRef.current) {
            driveServiceRef.current = new GoogleDriveService();
        }
        
        try {
            const token = await newUser.getIdToken(true);
            await driveServiceRef.current.init(token);
            
            // Sync local data with drive on login
            const localDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
            const localData = localDataString ? JSON.parse(localDataString) : null;
            const driveData = await driveServiceRef.current.loadBackup();

            if (localData && (!driveData || new Date(localData.routineHistory?.[0]?.createdAt || 0) > new Date(driveData.routineHistory?.[0]?.createdAt || 0))) {
                toast({title: "Syncing Local Data", description: "Uploading your locally saved work to Google Drive."});
                await saveStateToDrive(localData, true);
                setFullState(localData);
            } else if (driveData) {
                toast({title: "Syncing from Drive", description: "Loading your latest data from Google Drive."});
                setFullState(driveData);
            } else {
                 setFullState(DEFAULT_APP_STATE);
                 await saveStateToDrive(DEFAULT_APP_STATE);
            }
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear local after sync
        } catch(error) {
            console.error("Failed to init drive or sync data:", error);
            toast({ variant: "destructive", title: "Sync Error", description: "Could not connect to Google Drive. Please try logging in again." });
            await handleLogout(false);
        }

      } else {
        // User logged out or is a guest
        setUser(null);
        driveServiceRef.current = null;
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        setFullState(localData ? JSON.parse(localData) : DEFAULT_APP_STATE);
      }
      setIsAuthLoading(false);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [setFullState, toast, saveStateToDrive, handleLogout]);

  const updateState = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setAppState(prevState => {
      const newState = { ...prevState, [key]: value };
      if (key === 'timeSlots' && Array.isArray(value)) {
        newState.timeSlots = sortTimeSlots(value as string[]);
      }
      if (['teachers', 'classes', 'subjects', 'timeSlots'].includes(key as string)) {
          newState.routineHistory = [];
          newState.activeRoutineId = null;
          newState.teacherLoad = {};
          newState.adjustments = DEFAULT_ADJUSTMENTS_STATE;
      }
      if (key === 'rooms') {
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
  
  const setActiveRoutineId = (id: string) => {
    updateState('activeRoutineId', id);
  };

  const addRoutineVersion = (schedule: GenerateScheduleOutput, name: string) => {
    const newVersion: RoutineVersion = {
      id: `routine_${Date.now()}`,
      createdAt: new Date().toISOString(),
      name,
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
  };

  const updateRoutineVersion = (id: string, updates: Partial<RoutineVersion>) => {
    setAppState(prevState => ({
      ...prevState,
      routineHistory: prevState.routineHistory.map(r => 
        r.id === id ? { ...r, ...updates, id: r.id, createdAt: r.createdAt } : r
      )
    }));
  };

  const deleteRoutineVersion = (id: string) => {
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
  };

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
        handleLogout: () => handleLogout(true),
        setActiveRoutineId,
        addRoutineVersion,
        updateRoutineVersion,
        deleteRoutineVersion
    }}>
      {children}
    </AppStateContext.Provider>
  );
};
