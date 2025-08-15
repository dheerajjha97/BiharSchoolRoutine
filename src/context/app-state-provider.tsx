
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { sortTimeSlots } from "@/lib/utils";
import { getFirebaseAuth, getFirestoreDB } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User, type AuthError } from "firebase/auth";
import { doc, setDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
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
  classes: [],
  subjects: [],
  timeSlots: [],
  rooms: [],
  pdfHeader: "My School Name\nWeekly Class Routine\n2024-25",
  config: {
    teacherSubjects: {},
    teacherClasses: {},
    classRequirements: {},
    classTeachers: {},
    subjectCategories: {},
    subjectPriorities: {},
    unavailability: [],
    prayerTimeSlot: "",
    lunchTimeSlot: "",
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
const getPersistentState = (state: AppState): Omit<AppState, 'adjustments' | 'teacherLoad' | 'examTimetable'> => {
  const { adjustments, teacherLoad, examTimetable, ...persistentState } = state;
  return persistentState;
};

// Recursively removes undefined values from an object or array.
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined).filter(v => v !== undefined);
    } else if (typeof obj === 'object' && obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key];
            if (value !== undefined) {
                const newKey = key as keyof typeof acc;
                acc[newKey] = removeUndefined(value);
            }
            return acc;
        }, {} as { [key: string]: any });
    }
    return obj;
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
        config: { ...DEFAULT_APP_STATE.config, ...(newState.config || {}) },
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
        if (!entry || entry.subject === "Prayer" || entry.subject === "Lunch" || entry.subject === "---") return;
        
        const teacherIdsInEntry = (entry.teacher || '').split(' & ').map(tId => tId.trim());
        const subjectsInEntry = (entry.subject || '').split(' / ').map(s => s.trim());

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
  
  const addRoutineVersion = useCallback((scheduleOutput: GenerateScheduleOutput, name?: string) => {
    const newVersion: RoutineVersion = {
      id: `routine_${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: name || `School Routine - ${new Date().toLocaleString()}`,
      schedule: scheduleOutput,
      teacherLoad: {}, // Initialize with an empty object to avoid undefined
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
      if (authError.code !== 'auth/popup-closed-by-user') {
          toast({ variant: "destructive", title: "Login Failed", description: authError.message });
      }
    } finally {
      setIsAuthLoading(false);
    }
  }, [toast]);
  
  const handleLogout = useCallback(async () => {
    setIsAuthLoading(true);
    const auth = getFirebaseAuth();
    try {
      await signOut(auth);
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Logout Failed", description: authError.message });
    } finally {
        setIsAuthLoading(false);
        setAppState(DEFAULT_APP_STATE); // Reset state on logout
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [toast]);

  // Auth state listener - THE SINGLE SOURCE OF TRUTH FOR DATA LOADING
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthLoading(true);
      setUser(currentUser);

      // Unsubscribe from any previous Firestore listener
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }

      if (currentUser) {
        // LOGGED IN: Load from Firestore
        const db = getFirestoreDB();
        const userDocRef = doc(db, "userSettings", currentUser.uid);

        firestoreUnsubscribeRef.current = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const firestoreData = docSnap.data() as AppState;
            setFullState(firestoreData);
          } else {
            // No data in Firestore, could be a new user.
            // Save the current (or default) state to Firestore.
            console.log("No data in Firestore for this user. Saving initial state.");
            const stateToSave = getPersistentState(stateRef.current);
            setDoc(userDocRef, removeUndefined(stateToSave));
          }
          setIsLoading(false);
          setIsAuthLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          toast({ variant: "destructive", title: "Sync Error", description: "Could not sync data from the cloud." });
          setIsLoading(false);
          setIsAuthLoading(false);
        });
      } else {
        // LOGGED OUT: Load from Local Storage
        setAppState(DEFAULT_APP_STATE); // Reset to default first
        try {
          const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedStateJSON) {
            setFullState(JSON.parse(savedStateJSON));
          }
        } catch (error) {
          console.error("Failed to load state from local storage:", error);
        } finally {
          setIsLoading(false);
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save effect
  useEffect(() => {
    if (isLoading || isAuthLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const persistentState = getPersistentState(stateRef.current);
      const stateToSave = removeUndefined(persistentState);
      
      if (user) {
        // Logged in: save to Firestore
        setIsSyncing(true);
        try {
          const db = getFirestoreDB();
          const userDocRef = doc(db, "userSettings", user.uid);
          await setDoc(userDocRef, stateToSave, { merge: true });
        } catch (err) {
          console.error("Failed to save to Firestore:", err);
          toast({ variant: "destructive", title: "Firestore Save Failed", description: (err as Error).message });
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Logged out: save to Local Storage
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (err) {
            console.error("Failed to save to local storage:", err);
            toast({ variant: "destructive", title: "Local Save Failed", description: "Could not save data to your browser." });
        }
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

    