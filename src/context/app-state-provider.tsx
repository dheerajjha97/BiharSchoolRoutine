
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import type { SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";
import { sortTimeSlots } from "@/lib/utils";
import { getFirebaseAuth } from "@/lib/firebase";
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
  
  // Routine History Management
  routineHistory: RoutineVersion[];
  activeRoutineId: string | null;
  setActiveRoutineId: (id: string | null) => void;
  addRoutineVersion: (schedule: GenerateScheduleOutput) => void;
  updateRoutineVersion: (id: string, updates: Partial<Omit<RoutineVersion, 'id' | 'createdAt'>>) => void;
  deleteRoutineVersion: (id: string) => void;
}

export const AppStateContext = createContext<AppStateContextType>({} as AppStateContextType);

const DEFAULT_ADJUSTMENTS_STATE = {
    date: new Date().toISOString().split('T')[0], // Today's date
    absentTeachers: [],
    substitutionPlan: null
};

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

const getPersistentState = (state: AppState): Omit<AppState, 'adjustments' | 'teacherLoad'> => {
  const { adjustments, teacherLoad, ...persistentState } = state;
  return persistentState;
};

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const driveServiceRef = useRef<GoogleDriveService | null>(null);
  const stateRef = useRef(appState);
  const isInitialLoadDone = useRef(false);

  useEffect(() => {
    stateRef.current = appState;
  }, [appState]);
  
  const saveStateToDrive = useCallback(async (showToast = false) => {
    if (!driveServiceRef.current || !driveServiceRef.current.isReady() || !user) return;
    setIsSyncing(true);
    try {
      await driveServiceRef.current.saveBackup(getPersistentState(stateRef.current));
      if (showToast) toast({ title: "Progress Saved", description: "Your data has been saved to Google Drive." });
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
  }, [toast, user]);
  
  const saveStateToLocalStorage = useCallback(() => {
    try {
      const stateToSave = getPersistentState(stateRef.current);
      localStorage.setItem('schoolRoutineAppState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save state to local storage:", error);
    }
  }, []);

  const debouncedSave = useRef(
    (() => {
      let timeout: NodeJS.Timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (user) {
            saveStateToDrive(false);
          } else {
            saveStateToLocalStorage();
          }
        }, 2000); 
      };
    })()
  ).current;

  useEffect(() => {
      if (isInitialLoadDone.current) {
        debouncedSave();
      }
  }, [appState, user, debouncedSave]);

  const setFullState = (newState: Partial<AppState>) => {
    setAppState(prevState => {
      const mergedConfig = { ...DEFAULT_APP_STATE.config, ...newState.config };
      const mergedState = { 
          ...DEFAULT_APP_STATE,
          ...prevState, 
          ...newState, 
          config: mergedConfig,
          adjustments: DEFAULT_ADJUSTMENTS_STATE
      };
      
      if(mergedState.timeSlots) mergedState.timeSlots = sortTimeSlots(mergedState.timeSlots);
      
      // Ensure activeRoutineId is valid
      if (mergedState.routineHistory.length > 0 && !mergedState.routineHistory.find(r => r.id === mergedState.activeRoutineId)) {
        mergedState.activeRoutineId = mergedState.routineHistory[0].id;
      }
      if(mergedState.routineHistory.length === 0) {
        mergedState.activeRoutineId = null;
      }

      return mergedState;
    });
  };
  
  const loadStateFromDrive = useCallback(async (driveService: GoogleDriveService) => {
      setIsLoading(true);
      try {
        const loadedState = await driveService.loadBackup();
        if (loadedState && loadedState.teachers) {
          setFullState(loadedState);
          toast({ title: "Data Loaded", description: "Restored your data from Google Drive." });
        } else {
            setFullState(DEFAULT_APP_STATE);
            toast({ title: "No backup found", description: "Starting fresh. Your work will be saved automatically to Google Drive." });
            await driveService.saveBackup(getPersistentState(DEFAULT_APP_STATE));
        }
      } catch (error) {
        console.error("Failed to load from Drive:", error);
        toast({ variant: "destructive", title: "Load Failed", description: "Using local data." });
      } finally {
        setIsLoading(false);
        isInitialLoadDone.current = true;
      }
  }, [toast]);
  
  const loadStateFromLocalStorage = useCallback(() => {
      setIsLoading(true);
      try {
          const savedStateJSON = localStorage.getItem('schoolRoutineAppState');
          if (savedStateJSON) {
              const savedState = JSON.parse(savedStateJSON);
              setFullState(savedState);
          } else {
              setFullState(DEFAULT_APP_STATE);
          }
      } catch (error) {
          console.error("Failed to load from local storage:", error);
          setFullState(DEFAULT_APP_STATE);
      } finally {
        setIsLoading(false);
        isInitialLoadDone.current = true;
      }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setUser(result.user);
        if (!driveServiceRef.current) driveServiceRef.current = new GoogleDriveService();
        await driveServiceRef.current.init(credential.accessToken);
        
        // Sync local storage to drive if there's data
        const localDataJSON = localStorage.getItem('schoolRoutineAppState');
        if (localDataJSON) {
            const localData = JSON.parse(localDataJSON);
            await driveServiceRef.current.saveBackup(localData);
            localStorage.removeItem('schoolRoutineAppState');
        }
        await loadStateFromDrive(driveServiceRef.current);
      }
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        toast({ variant: "destructive", title: "Login Failed", description: (error as AuthError).message });
    } finally {
       setIsAuthLoading(false); 
    }
  };

  const handleLogout = useCallback(async (withSave = true) => {
    const auth = getFirebaseAuth();
    setIsAuthLoading(true);
    if (withSave && user && driveServiceRef.current?.isReady()) {
        await saveStateToDrive(true);
    }
    await signOut(auth);
    setUser(null);
    driveServiceRef.current = null;
    isInitialLoadDone.current = false;
    setFullState(DEFAULT_APP_STATE); // Reset to default state
    loadStateFromLocalStorage(); // Load any potentially existing local data
    setIsAuthLoading(false);
    toast({ title: "Logged Out", description: "You are now working in offline mode." });
  }, [user, saveStateToDrive, toast, loadStateFromLocalStorage]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!user || user.uid !== currentUser.uid) { // new login or refresh
          setUser(currentUser);
          setIsAuthLoading(true);
          const idTokenResult = await currentUser.getIdTokenResult(true);
          const credential = GoogleAuthProvider.credential(idTokenResult.token);
          if (credential?.accessToken) {
            if (!driveServiceRef.current) driveServiceRef.current = new GoogleDriveService();
            await driveServiceRef.current.init(credential.accessToken);
            await loadStateFromDrive(driveServiceRef.current);
          }
           setIsAuthLoading(false);
        }
      } else { // No user logged in
        setUser(null);
        driveServiceRef.current = null;
        if (!isInitialLoadDone.current) { // only load from local on initial app load
          loadStateFromLocalStorage();
        }
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeRoutine = useMemo(() => {
    if (!appState.activeRoutineId || !appState.routineHistory) return null;
    return appState.routineHistory.find(r => r.id === appState.activeRoutineId) || null;
  }, [appState.activeRoutineId, appState.routineHistory]);

  const calculatedTeacherLoad = useMemo(() => {
    const load: TeacherLoad = {};
    if (!activeRoutine?.schedule.schedule || !appState.teachers) return {};

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
                    if (category === 'main') load[teacher][entry.day].main++;
                    else load[teacher][entry.day].additional++;
                }
                
                load[teacher].Total.total++;
                if (category === 'main') load[teacher].Total.main++;
                else load[teacher].Total.additional++;
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
      if (['teachers', 'classes', 'subjects', 'timeSlots'].includes(key as string)) {
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
  
  const addRoutineVersion = (schedule: GenerateScheduleOutput) => {
    setAppState(prevState => {
      const newVersion: RoutineVersion = {
        id: `routine_${Date.now()}`,
        name: `Routine - ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString(),
        schedule: schedule,
      };
      const newHistory = [newVersion, ...prevState.routineHistory].slice(0, 5); // Keep last 5
      return { ...prevState, routineHistory: newHistory, activeRoutineId: newVersion.id };
    });
  };

  const updateRoutineVersion = (id: string, updates: Partial<Omit<RoutineVersion, 'id' | 'createdAt'>>) => {
    setAppState(prevState => {
        const newHistory = prevState.routineHistory.map(v => 
            v.id === id ? { ...v, ...updates } : v
        );
        return { ...prevState, routineHistory: newHistory };
    });
  };

  const deleteRoutineVersion = (id: string) => {
    setAppState(prevState => {
        const newHistory = prevState.routineHistory.filter(v => v.id !== id);
        let newActiveId = prevState.activeRoutineId;
        if (newActiveId === id) {
            newActiveId = newHistory.length > 0 ? newHistory[0].id : null;
        }
        return { ...prevState, routineHistory: newHistory, activeRoutineId: newActiveId };
    });
  };

  const setActiveRoutineId = (id: string | null) => {
      setAppState(prevState => ({ ...prevState, activeRoutineId: id }));
  };

  return (
    <AppStateContext.Provider value={{ 
        appState, 
        updateState, 
        setFullState,
        updateConfig,
        updateAdjustments,
        isLoading, 
        setIsLoading,
        isAuthLoading,
        isSyncing,
        user,
        handleGoogleSignIn,
        handleLogout: () => handleLogout(true),
        routineHistory: appState.routineHistory,
        activeRoutineId: appState.activeRoutineId,
        setActiveRoutineId,
        addRoutineVersion,
        updateRoutineVersion,
        deleteRoutineVersion
    }}>
      {children}
    </AppStateContext.Provider>
  );
};
