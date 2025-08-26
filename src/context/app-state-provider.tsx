
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { sortTimeSlots } from "@/lib/utils";
import { getFirebaseAuth, getFirestoreDB } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User, type AuthError } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, type Unsubscribe, collection, getDocs, query, where } from "firebase/firestore";
import type { 
    Teacher, 
    SchoolConfig, 
    RoutineVersion,
    TeacherLoad,
    GenerateScheduleOutput, 
    AppState,
    SchoolInfo,
    Holiday,
    DayOfWeek,
} from '@/types';

export const AppStateContext = createContext<AppStateContextType>({} as AppStateContextType);

interface AppStateContextType {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  updateSchoolInfo: <K extends keyof SchoolInfo>(key: K, value: SchoolInfo[K]) => void;
  updateConfig: <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => void;
  updateAdjustments: <K extends keyof AppState['adjustments']>(key: K, value: AppState['adjustments'][K]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isAuthLoading: boolean;
  isSyncing: boolean;
  user: User | null;
  isUserAdmin: boolean;
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

const DEFAULT_APP_STATE: AppState = {
  schoolInfo: { name: "", udise: "", pdfHeader: ""},
  teachers: [],
  classes: [],
  subjects: [],
  timeSlots: [],
  rooms: [],
  holidays: [],
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
  teacherLoad: {},
  examTimetable: [],
  adjustments: DEFAULT_ADJUSTMENTS_STATE,
};

const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined).filter(v => v !== undefined);
    } else if (typeof obj === 'object' && obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key];
            if (value !== undefined) {
                const newValue = removeUndefined(value);
                if (newValue !== undefined) {
                    acc[key] = newValue;
                }
            }
            return acc;
        }, {} as Record<string, any>);
    }
    return obj;
};

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [isLoading, setIsLoading] = useState(true); // General loading for operations like routine generation
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Specific loading for auth state
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const stateRef = useRef(appState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firestoreUnsubscribeRef = useRef<Unsubscribe | null>(null);

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

    const days: (DayOfWeek | "Total")[] = [...appState.config.workingDays, "Total"];
    
    appState.teachers.forEach(teacher => {
        load[teacher.id] = {};
        days.forEach(day => {
            load[teacher.id][day] = { total: 0, main: 0, additional: 0 };
        });
    });

    activeRoutine.schedule.schedule.forEach(entry => {
        if (!entry || entry.subject === "Prayer" || entry.subject === "Lunch" || entry.subject === "---" || !entry.teacher || entry.teacher === "N/A") return;
        
        const teacherIdsInEntry = (entry.teacher || '').split(' & ').map(tId => tId.trim());
        const subjectsInEntry = (entry.subject || '').split(' / ').map(s => s.trim());

        teacherIdsInEntry.forEach((teacherId, index) => {
            if (teacherId && load[teacherId]) {
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
  }, [activeRoutine, appState.teachers, appState.config.subjectCategories, appState.config.workingDays]);
  
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

  useEffect(() => {
    if (!isLoading && appState.teachers.length > 0 && activeRoutine) {
        updateState('teacherLoad', calculatedTeacherLoad);
    } else if (!activeRoutine) {
        updateState('teacherLoad', {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedTeacherLoad, isLoading, activeRoutine]);
  
  const updateSchoolInfo = useCallback(<K extends keyof SchoolInfo>(key: K, value: SchoolInfo[K]) => {
     setAppState(prevState => ({
        ...prevState,
        schoolInfo: { ...prevState.schoolInfo, [key]: value },
    }));
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
    const auth = getFirebaseAuth();
    
    if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
    }
    
    try {
      await signOut(auth);
      // Auth state listener will handle resetting state and redirecting
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Logout Failed", description: authError.message });
      setIsAuthLoading(false);
    }
  }, [toast]);

  const loadAndMergeState = (newState: Partial<AppState>) => {
    setAppState(prevState => {
        const mergedState: AppState = {
            ...DEFAULT_APP_STATE,
            ...prevState,
            ...newState,
            schoolInfo: { ...DEFAULT_APP_STATE.schoolInfo, ...prevState.schoolInfo, ...(newState.schoolInfo || {})},
            config: { ...DEFAULT_APP_STATE.config, ...prevState.config, ...(newState.config || {}) },
            adjustments: { ...(newState.adjustments || DEFAULT_ADJUSTMENTS_STATE) },
        };
         if (newState.timeSlots && Array.isArray(newState.timeSlots)) {
            mergedState.timeSlots = sortTimeSlots(newState.timeSlots);
        }
        return mergedState;
    });
  };

  // Auth state listener
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (newUser) => {
        setIsAuthLoading(true);
        setUser(newUser);
        
        if (firestoreUnsubscribeRef.current) {
            firestoreUnsubscribeRef.current();
            firestoreUnsubscribeRef.current = null;
        }
        
        if (newUser) {
            const db = getFirestoreDB();
            setIsLoading(true);
            
            const roleDocRef = doc(db, "userRoles", newUser.email!);
            const roleSnap = await getDoc(roleDocRef);

            if (!roleSnap.exists()) {
                toast({ variant: "destructive", title: "Account Not Found", description: "Your email is not registered. Please register or contact support." });
                handleLogout();
                return;
            }

            const { role, udise } = roleSnap.data() as { role: 'admin' | 'teacher', udise: string };
            const schoolDocRef = doc(db, "schoolAdmins", udise);

            if (role === 'admin') {
                setIsUserAdmin(true);
            } else {
                setIsUserAdmin(false);
            }
            
            firestoreUnsubscribeRef.current = onSnapshot(schoolDocRef, (dataSnap) => {
                if (dataSnap.exists()) {
                    loadAndMergeState(dataSnap.data() as Partial<AppState>);
                } else if (role === 'admin') {
                    // Admin's school doc doesn't exist, create it
                    const newSchoolData: AppState = { ...DEFAULT_APP_STATE, schoolInfo: { name: "", udise, pdfHeader: "" } };
                    setDoc(schoolDocRef, newSchoolData);
                    setAppState(newSchoolData);
                } else {
                    // Teacher's school doesn't exist, this is an error state
                     toast({ variant: "destructive", title: "School Data Not Found", description: `Could not find data for school with UDISE ${udise}.` });
                     handleLogout();
                     return;
                }
                setIsLoading(false);
                setIsAuthLoading(false); // Set auth loading to false only after data is loaded
            }, (error) => {
                console.error("Error in snapshot listener:", error);
                toast({ variant: "destructive", title: "Data Sync Error", description: "Could not sync data." });
                handleLogout();
            });

        } else {
            // User is logged out
            setUser(null);
            setIsUserAdmin(false);
            setAppState(DEFAULT_APP_STATE);
            setIsLoading(false);
            setIsAuthLoading(false);
        }
    });

    return () => unsubscribeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Admin redirect effect
  useEffect(() => {
    // Only run this after auth is complete and if the user is an admin
    if (!isAuthLoading && isUserAdmin) {
      // If the school name is missing, it's a new setup
      if (!appState.schoolInfo.name) {
        router.replace('/data');
      }
    }
  }, [isAuthLoading, isUserAdmin, appState.schoolInfo.name, router]);


  // Debounced save effect
  useEffect(() => {
    if (isAuthLoading || !user || !appState.schoolInfo.udise || !isUserAdmin) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
        setIsSyncing(true);
        try {
            const db = getFirestoreDB();
            const { adjustments, ...persistentState } = stateRef.current;
            const stateToSave = removeUndefined(persistentState);
            const userDocRef = doc(db, "schoolAdmins", appState.schoolInfo.udise);
            await setDoc(userDocRef, stateToSave, { merge: true });
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
  }, [appState, user, isAuthLoading, toast, isUserAdmin]);

  return (
    <AppStateContext.Provider value={{ 
        appState, 
        setAppState,
        updateState,
        updateSchoolInfo,
        updateConfig,
        updateAdjustments,
        isLoading, 
        setIsLoading,
        isAuthLoading,
        isSyncing,
        user,
        isUserAdmin,
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
