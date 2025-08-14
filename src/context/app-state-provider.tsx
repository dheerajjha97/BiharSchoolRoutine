
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { sortTimeSlots } from "@/lib/utils";
import { getFirebaseAuth, getFirestoreDB } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User, type AuthError } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { 
    Teacher, 
    SchoolConfig, 
    RoutineVersion,
    TeacherLoad,
    GenerateScheduleOutput, 
    AppState,
} from '@/types';

export const AppStateContext = createContext<AppStateContextType>({} as AppStateContextType);

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

const DEFAULT_ADJUSTMENTS_STATE = {
    date: new Date().toISOString().split('T')[0], // Today's date
    absentTeacherIds: [],
    substitutionPlan: null
};

const LOCAL_STORAGE_KEY = "schoolRoutineState";

const DEFAULT_APP_STATE: AppState = {
  teachers: [],
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
    teacherSubjects: {},
    teacherClasses: {},
    classRequirements: {
        "Class 9A": ["Math", "Science", "English", "History", "Hindi", "Computer Science", "Library", "Art"],
        "Class 9B": ["Math", "Science", "English", "History", "Hindi", "Art"],
        "Class 10A": ["Math", "Science", "English", "History", "Hindi"],
        "Class 10B": ["Math", "Science", "English", "History", "Hindi"],
        "Class 11 Sci": ["Physics", "Chemistry", "Math", "English", "Computer Science"],
        "Class 12 Sci": ["Physics", "Biology", "Math", "English", "Computer Science"],
    },
    classTeachers: {},
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

  const stateRef = useRef(appState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firestoreUnsubscribeRef = useRef<Unsubscribe | null>(null);

  const setFullState = useCallback((newState: Partial<AppState>) => {
    setAppState(prevState => {
      const mergedState: AppState = {
        ...DEFAULT_APP_STATE,
        ...prevState,
        ...newState,
        adjustments: { ...(newState.adjustments || DEFAULT_ADJUSTMENTS_STATE) },
      };
       if (newState.timeSlots && Array.isArray(newState.timeSlots)) {
          mergedState.timeSlots = sortTimeSlots(newState.timeSlots);
      }
      return mergedState;
    });
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
        load[teacher.id] = {};
        days.forEach(day => {
            load[teacher.id][day] = { total: 0, main: 0, additional: 0 };
        });
    });

    activeRoutine.schedule.schedule.forEach(entry => {
        if(entry.subject === "Prayer" || entry.subject === "Lunch" || entry.subject === "---") return;
        
        const teacherIdsInEntry = entry.teacher.split(' & ').map(tId => tId.trim());
        const subjectsInEntry = entry.subject.split(' / ').map(s => s.trim());

        teacherIdsInEntry.forEach((teacherId, index) => {
            if (teacherId && teacherId !== "N/A" && load[teacherId]) {
                const subject = subjectsInEntry[index] || subjectsInEntry[0];
                const category = appState.config.subjectCategories[subject] || 'additional';

                if (load[teacherId][entry.day]) {
                    load[teacherId][entry.day].total++;
                    if (category === 'main') {
                        load[teacherId][entry.day].main++;
                    } else {
                        load[teacherId][entry.day].additional++;
                    }
                }
                
                load[teacherId].Total.total++;
                if (category === 'main') {
                    load[teacherId].Total.main++;
                } else {
                    load[teacherId].Total.additional++;
                }
            }
        });
    });

    return load;
  }, [activeRoutine, appState.teachers, appState.config.subjectCategories]);
  
  useEffect(() => {
    updateState('teacherLoad', calculatedTeacherLoad);
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
      name: name || `School Routine - ${new Date().toLocaleString()}`,
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
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Login Failed", description: authError.message });
      setIsAuthLoading(false);
    }
  }, [toast]);
  
  const handleLogout = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      await signOut(getFirebaseAuth());
      setFullState(DEFAULT_APP_STATE); 
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({ title: "Logged out successfully." });
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Logout Failed", description: authError.message });
    } finally {
      setIsAuthLoading(false);
    }
  }, [toast, setFullState]);

  // Auth state listener
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoading(true);

      // Unsubscribe from any previous Firestore listener
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }

      if (currentUser) {
        // User is logged in, use Firestore
        setIsSyncing(true);
        const db = getFirestoreDB();
        const userDocRef = doc(db, "userSettings", currentUser.uid);

        firestoreUnsubscribeRef.current = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const firestoreData = docSnap.data() as Omit<AppState, 'adjustments' | 'teacherLoad'>;
            setFullState(firestoreData);
            console.log("Data loaded from Firestore.");
          } else {
            // No data in Firestore, could be a new user.
            // Save the current (or default) state to Firestore.
            console.log("No data in Firestore for this user. Saving initial state.");
            const stateToSave = getPersistentState(stateRef.current);
            setDoc(userDocRef, stateToSave);
          }
          setIsSyncing(false);
          setIsLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          toast({ variant: "destructive", title: "Sync Error", description: "Could not sync data from the cloud." });
          setIsSyncing(false);
          setIsLoading(false);
        });
      } else {
        // User is logged out, use Local Storage
        try {
          const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedStateJSON) {
            setFullState(JSON.parse(savedStateJSON));
          } else {
            setFullState(DEFAULT_APP_STATE);
          }
        } catch (error) {
          console.error("Failed to load state from local storage:", error);
        } finally {
          setIsLoading(false);
        }
      }
      setIsAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
      }
    };
  }, [toast, setFullState]);

  // Debounced save effect
  useEffect(() => {
    if (isLoading || isAuthLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const stateToSave = getPersistentState(stateRef.current);
      if (user) {
        // Logged in: save to Firestore
        setIsSyncing(true);
        try {
          const db = getFirestoreDB();
          const userDocRef = doc(db, "userSettings", user.uid);
          await setDoc(userDocRef, stateToSave, { merge: true });
          console.log("Data saved to Firestore.");
        } catch (err) {
          console.error("Failed to save to Firestore:", err);
          toast({ variant: "destructive", title: "Firestore Save Failed", description: "Could not save latest changes." });
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Logged out: save to Local Storage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
        console.log("Data saved to local storage.");
      }
    }, 1500);

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
