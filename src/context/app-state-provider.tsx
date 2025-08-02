
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import type { SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";
import { sortTimeSlots } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";
import { GoogleDriveService } from "@/lib/google-drive-service";

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

export type TeacherLoad = Record<string, Record<string, number>>;

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
  isAuthLoading: boolean;
  isSyncing: boolean;
  user: User | null;
  handleGoogleSignIn: () => void;
  handleLogout: () => void;
}

export const AppStateContext = createContext<AppStateContextType>({} as AppStateContextType);

const DEFAULT_APP_STATE: AppState = {
  teachers: ["Mr. Sharma", "Mrs. Gupta", "Ms. Singh", "Mr. Kumar"],
  classes: ["Class 9A", "Class 9B", "Class 10A", "Class 10B", "Class 11A", "Class 12A"],
  subjects: ["Math", "Science", "English", "History", "Physics", "Chemistry", "Biology", "Computer Science"],
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
  config: {
    teacherSubjects: {
      "Mr. Sharma": ["Math", "Physics"],
      "Mrs. Gupta": ["English", "History"],
      "Ms. Singh": ["Science", "Biology", "Chemistry"],
      "Mr. Kumar": ["Computer Science"]
    },
    teacherClasses: {
        "Mr. Sharma": ["Class 10A", "Class 10B", "Class 11A", "Class 12A"],
        "Mrs. Gupta": ["Class 9A", "Class 9B", "Class 10A", "Class 10B"],
        "Ms. Singh": ["Class 9A", "Class 9B", "Class 10A", "Class 11A"],
        "Mr. Kumar": ["Class 11A", "Class 12A"],
    },
    classRequirements: {
        "Class 9A": ["Math", "Science", "English", "History"],
        "Class 9B": ["Math", "Science", "English", "History"],
        "Class 10A": ["Math", "Science", "English", "History"],
        "Class 10B": ["Math", "Science", "English", "History"],
        "Class 11A": ["Physics", "Chemistry", "Math", "English", "Computer Science"],
        "Class 12A": ["Physics", "Biology", "Math", "English", "Computer Science"],
    },
    subjectCategories: {
        "Math": "main",
        "Science": "main",
        "English": "main",
        "History": "additional",
        "Physics": "main",
        "Chemistry": "main",
        "Biology": "main",
        "Computer Science": "additional"
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
    enableCombinedClasses: false,
    dailyPeriodQuota: 5,
  },
  routine: null,
  teacherLoad: {},
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

  useEffect(() => {
    stateRef.current = appState;
  }, [appState]);

  const calculatedTeacherLoad = useMemo(() => {
    const load: TeacherLoad = {};
    if (!appState.routine?.schedule) return {};

    appState.teachers.forEach(teacher => {
        load[teacher] = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Total: 0 };
    });

    appState.routine.schedule.forEach(entry => {
        if(entry.subject === "Prayer" || entry.subject === "Lunch") return;
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
    updateState('teacherLoad', calculatedTeacherLoad);
  }, [calculatedTeacherLoad]);

  const saveStateToDrive = useCallback(async (showToast = false) => {
    if (!driveServiceRef.current || !driveServiceRef.current.isReady()) return;
    setIsSyncing(true);
    try {
      await driveServiceRef.current.saveBackup(stateRef.current);
      if (showToast) {
        toast({ title: "Progress Saved", description: "Your data has been saved to Google Drive." });
      }
    } catch (error: any) {
      console.error("Failed to save state to Google Drive:", error);
      if (error.status === 401 || (error.result?.error?.code === 401) ) { 
         toast({ variant: "destructive", title: "Authentication Error", description: "Please log out and log in again to refresh your session." });
         handleLogout(false);
      } else {
        toast({ variant: "destructive", title: "Sync Failed", description: "Could not save data to Google Drive." });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);
  
  const debouncedSave = useRef(
    (() => {
      let timeout: NodeJS.Timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          saveStateToDrive(false);
        }, 5000); 
      };
    })()
  ).current;

  useEffect(() => {
    if (user && driveServiceRef.current?.isReady()) {
      debouncedSave();
    }
  }, [appState, user, debouncedSave]);
  
  const loadStateFromDrive = useCallback(async (driveService: GoogleDriveService) => {
      setIsLoading(true);
      try {
        toast({ title: "Loading data...", description: "Fetching your saved data from Google Drive." });
        const loadedState = await driveService.loadBackup();
        if (loadedState) {
          const mergedConfig = { ...DEFAULT_APP_STATE.config, ...loadedState.config };
          const mergedState = { ...DEFAULT_APP_STATE, ...loadedState, config: mergedConfig };
          if(mergedState.timeSlots) {
            mergedState.timeSlots = sortTimeSlots(mergedState.timeSlots);
          }
          setAppState(mergedState);
          toast({ title: "Data Loaded Successfully", description: "Your data has been restored from Google Drive." });
        } else {
            setAppState(DEFAULT_APP_STATE);
            toast({ title: "No backup found", description: "Starting with a fresh slate. Your work will be saved automatically." });
        }
      } catch (error) {
        console.error("Failed to load state from Google Drive:", error);
        toast({ variant: "destructive", title: "Load Failed", description: "Could not load data from Google Drive. Starting with a blank slate." });
        setAppState(DEFAULT_APP_STATE);
      } finally {
        setIsLoading(false);
      }
  }, [toast]);

  const handleLogout = useCallback(async (withSave = true) => {
    setIsAuthLoading(true);
    if (withSave && user && driveServiceRef.current?.isReady()) {
        toast({ title: "Saving your work...", description: "Saving your final changes to Google Drive before logging out." });
        await saveStateToDrive(true); 
    }
    await signOut(auth);
    setAppState(DEFAULT_APP_STATE);
    driveServiceRef.current = null;
    setUser(null);
    setIsAuthLoading(false);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  }, [user, saveStateToDrive, toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(true);
      if (user) {
        setUser(user);
        try {
            if (!driveServiceRef.current) {
                driveServiceRef.current = new GoogleDriveService();
            }
            await driveServiceRef.current.init();
            await loadStateFromDrive(driveServiceRef.current);
        } catch (error) {
            console.error("Error initializing Google Drive service:", error);
            toast({ variant: "destructive", title: "Google Drive Error", description: "Could not connect to Google Drive."});
            handleLogout(false);
        }
      } else {
        setUser(null);
        driveServiceRef.current = null;
        setAppState(DEFAULT_APP_STATE);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [loadStateFromDrive, toast, handleLogout]);

  const updateState = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setAppState(prevState => {
      const newState = { ...prevState, [key]: value };
      if (key === 'timeSlots' && Array.isArray(value)) {
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

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      auth.tenantId = window.location.hostname;
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
       if (error.code === 'auth/popup-closed-by-user') {
        console.log("Sign-in popup closed by user.");
        // Don't show a toast for this expected user action.
      } else {
        console.error("Google Sign-In Error:", error);
        toast({ variant: "destructive", title: "Login Failed", description: "Could not sign in with Google." });
      }
      setIsAuthLoading(false); // Make sure to turn off loading on error
    }
  };
  
  return (
    <AppStateContext.Provider value={{ 
        appState, 
        updateState, 
        updateConfig, 
        isLoading, 
        setIsLoading,
        isAuthLoading,
        isSyncing,
        user,
        handleGoogleSignIn,
        handleLogout: () => handleLogout(true),
    }}>
      {children}
    </AppStateContext.Provider>
  );
};
