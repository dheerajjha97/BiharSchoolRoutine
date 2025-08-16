
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { sortTimeSlots } from "@/lib/utils";
import { getFirebaseAuth, getFirestoreDB } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User, type AuthError } from "firebase/auth";
import { doc, setDoc, onSnapshot, getDoc, collection, query, where, getDocs, type Unsubscribe } from "firebase/firestore";
import type { 
    Teacher, 
    SchoolConfig, 
    RoutineVersion,
    TeacherLoad,
    GenerateScheduleOutput, 
    AppState,
    SchoolInfo,
    Holiday,
} from '@/types';
import AppShell from "@/components/app/app-shell";

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
  addRoutineVersion: (schedule: GenerateScheduleOutput, name?: string) => void;
  updateRoutineVersion: (id: string, updates: Partial<Omit<RoutineVersion, 'id' | 'createdAt'>>) => void;
  deleteRoutineVersion: (id: string) => void;
}

const DEFAULT_ADJUSTMENTS_STATE = {
    date: new Date().toISOString().split('T')[0], // Today's date
    absentTeacherIds: [],
    substitutionPlan: null
};

const DEFAULT_APP_STATE: AppState = {
  teachers: [],
  classes: [],
  subjects: [],
  timeSlots: [],
  rooms: [],
  holidays: [],
  schoolInfo: {
    name: "",
    udise: "",
    details: ""
  },
  config: {
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
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
  activeRoutine: null,
  teacherLoad: {},
  examTimetable: [],
  adjustments: DEFAULT_ADJUSTMENTS_STATE,
};

// Function to strip non-persistent state for saving
const getPersistentState = (state: AppState): Omit<AppState, 'adjustments' | 'teacherLoad' | 'examTimetable' | 'activeRoutine'> => {
  const { adjustments, teacherLoad, examTimetable, activeRoutine, ...persistentState } = state;
  return persistentState;
};

// Recursively removes undefined values from an object. Firestore cannot store them.
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return undefined;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item));
    }

    if (typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = removeUndefined(obj[key]);
                if (value !== undefined) {
                    newObj[key] = value;
                }
            }
        }
        return newObj;
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
  const router = useRouter();
  const pathname = usePathname();

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
        schoolInfo: { ...DEFAULT_APP_STATE.schoolInfo, ...(newState.schoolInfo || {}) }
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
    return appState.routineHistory.find(r => r.id === appState.activeRoutineId) || null;
  }, [appState.routineHistory, appState.activeRoutineId]);

  const calculatedTeacherLoad = useMemo(() => {
    const load: TeacherLoad = {};
    const routine = activeRoutine; 
    if (!routine?.schedule?.schedule || !appState.teachers) return {};

    const days = [...appState.config.workingDays, "Total"];
    
    appState.teachers.forEach(teacher => {
        load[teacher.id] = {};
        days.forEach(day => {
            load[teacher.id][day] = { total: 0, main: 0, additional: 0 };
        });
    });

    routine.schedule.schedule.forEach(entry => {
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
                
                if(!load[teacherId].Total) load[teacherId].Total = { total: 0, main: 0, additional: 0 };
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
  }, [activeRoutine, appState.teachers, appState.config.subjectCategories, appState.config.workingDays]);
  
  useEffect(() => {
    updateState('teacherLoad', calculatedTeacherLoad);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedTeacherLoad]);
  
  const updateState = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setAppState(prevState => {
      let newState = { ...prevState, [key]: value };
      // Reset history only when core data that invalidates a routine is changed
      if (['teachers', 'classes', 'subjects', 'timeSlots'].includes(key as string)) {
          newState.routineHistory = [];
          newState.activeRoutineId = null;
          newState.activeRoutine = null;
          newState.teacherLoad = {};
          newState.adjustments = DEFAULT_ADJUSTMENTS_STATE;
          newState.examTimetable = [];
      }
      if (key === 'timeSlots' && Array.isArray(value)) {
        newState.timeSlots = sortTimeSlots(value as string[]);
      }
      return newState;
    });
  }, []);
  
  const updateConfig = useCallback(<K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => {
     setAppState(prevState => {
        const newState = {
          ...prevState,
          config: { ...prevState.config, [key]: value },
        };
        // Do not reset history for general config changes
        return newState;
    });
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
    };

    setAppState(prevState => {
        const newHistory = [newVersion, ...prevState.routineHistory].slice(0, 5); // Keep last 5
        return {
            ...prevState,
            routineHistory: newHistory,
            activeRoutineId: newVersion.id,
            activeRoutine: newVersion,
        }
    });
  }, []);

  const updateRoutineVersion = useCallback((id: string, updates: Partial<Omit<RoutineVersion, 'id' | 'createdAt'>>) => {
    setAppState(prevState => ({
      ...prevState,
      routineHistory: prevState.routineHistory.map(r => 
        r.id === id ? { ...r, ...updates } : r
      ),
      activeRoutine: prevState.activeRoutine?.id === id ? { ...prevState.activeRoutine, ...updates } : prevState.activeRoutine,
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
        activeRoutine: newHistory.find(r => r.id === newActiveId) || null,
      };
    });
  }, []);
  
  const handleLogout = useCallback(async () => {
    const auth = getFirebaseAuth();
    try {
      if(firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }
      await signOut(auth);
      setAppState(DEFAULT_APP_STATE); // Proactively clear state
      router.replace('/login'); // Immediately redirect
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Logout Failed", description: authError.message });
    }
  }, [toast, router]);

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
      setIsAuthLoading(false);
    }
  }, [toast]);

  // Auth state listener
  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDB();

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setIsAuthLoading(true);
      
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }

      if (currentUser) {
        setUser(currentUser);
        // User is logged in. Figure out which school they belong to.
        const usersCollectionRef = collection(db, 'users');
        const userDocRef = doc(usersCollectionRef, currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let udiseCode: string | null = null;
        let isUserAdmin = false;
        
        if (userDocSnap.exists() && userDocSnap.data()?.udise) {
            udiseCode = userDocSnap.data()?.udise;
            isUserAdmin = true;
        } else {
            const schoolDataCollectionRef = collection(db, "schoolData");
            try {
                const schoolDocs = await getDocs(schoolDataCollectionRef);
                for (const schoolDoc of schoolDocs.docs) {
                    const schoolData = schoolDoc.data();
                    if (schoolData.teachers && Array.isArray(schoolData.teachers)) {
                       const teacherExists = schoolData.teachers.some((teacher: any) => teacher.email === currentUser.email);
                       if (teacherExists) {
                           udiseCode = schoolDoc.id;
                           isUserAdmin = false;
                           break;
                       }
                    }
                }
            } catch (error) {
                console.error("Error querying for teacher's school:", error);
            }
        }
        
        if (udiseCode) {
            const schoolDocRef = doc(db, "schoolData", udiseCode);
            firestoreUnsubscribeRef.current = onSnapshot(schoolDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (isUserAdmin) {
                        setFullState(data as Partial<AppState>);
                    } else {
                        // Teacher: Load base data but only the active routine
                        const { routineHistory, ...baseData } = data;
                        const activeRoutineId = data.activeRoutineId;
                        const activeRoutine = (data.routineHistory || []).find((r: RoutineVersion) => r.id === activeRoutineId) || null;
                        
                        setFullState({ 
                          ...baseData, 
                          activeRoutine: activeRoutine,
                          activeRoutineId: activeRoutineId,
                          routineHistory: null, // Clear history for teacher
                        });
                    }
                }
                setIsLoading(false);
                setIsAuthLoading(false);
                if (pathname === '/login') {
                    router.replace('/');
                }
            }, (error) => {
                console.error("Firestore snapshot error:", error);
                toast({ variant: "destructive", title: "Sync Error", description: "Could not sync data from the cloud." });
                setIsLoading(false);
                setIsAuthLoading(false);
            });
        } else {
            // New Admin
            setFullState(DEFAULT_APP_STATE);
            setIsLoading(false);
            setIsAuthLoading(false);
             if (pathname !== '/data' && pathname !== '/login') {
                router.replace('/data');
            }
        }
      } else {
        // LOGGED OUT
        setUser(null);
        setAppState(DEFAULT_APP_STATE);
        setIsLoading(false);
        setIsAuthLoading(false);
        if (pathname !== '/login') {
            router.replace('/login');
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
    const isUserAdmin = user ? !stateRef.current.teachers.some(t => t.email === user.email) : false;
    const udise = stateRef.current.schoolInfo.udise;
    if (isLoading || isAuthLoading || !user || !udise || !isUserAdmin) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const persistentState = getPersistentState(stateRef.current);
      const stateToSave = removeUndefined(persistentState);
      
      if (isSyncing) return;
      setIsSyncing(true);
      try {
        const db = getFirestoreDB();
        const schoolDocRef = doc(db, "schoolData", udise);
        await setDoc(schoolDocRef, stateToSave, { merge: true });

        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { udise: udise }, { merge: true });
        
      } catch (err) {
        console.error("Failed to save to Firestore:", err);
        toast({ variant: "destructive", title: "Firestore Save Failed", description: (err as Error).message });
      } finally {
        setIsSyncing(false);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [appState, user, isLoading, isAuthLoading, toast, isSyncing]);

  const providerValue = {
        appState, 
        updateState, 
        setFullState,
        updateConfig,
        updateAdjustments,
        isLoading: isLoading, 
        setIsLoading,
        isAuthLoading,
        isSyncing,
        user,
        handleGoogleSignIn,
        handleLogout,
        addRoutineVersion,
        updateRoutineVersion,
        deleteRoutineVersion
  };
  
  useEffect(() => {
    // This effect ensures that if the activeRoutineId is set, the activeRoutine object is also synced.
    // This is particularly important for admins, as their activeRoutine is derived from the history.
    if (appState.activeRoutineId && appState.routineHistory) {
        const newActiveRoutine = appState.routineHistory.find(r => r.id === appState.activeRoutineId);
        if (newActiveRoutine && newActiveRoutine !== appState.activeRoutine) {
            updateState('activeRoutine', newActiveRoutine);
        }
    } else if (!appState.activeRoutineId) {
        // If activeId is cleared, clear the activeRoutine object too
        if (appState.activeRoutine !== null) {
            updateState('activeRoutine', null);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.activeRoutineId, appState.routineHistory]);

  if (pathname === '/login') {
      return (
        <AppStateContext.Provider value={providerValue}>
            {children}
        </AppStateContext.Provider>
      );
  }

  return (
    <AppStateContext.Provider value={providerValue}>
      <AppShell>
        {children}
      </AppShell>
    </AppStateContext.Provider>
  );
};
