
"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import type { SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";
import { sortTimeSlots } from "@/lib/utils";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User, type AuthError } from "firebase/auth";
import { GoogleDriveService } from "@/lib/google-drive-service";

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
  config: SchoolConfig;
  routine: GenerateScheduleOutput | null;
  teacherLoad: TeacherLoad;
  examTimetable: ExamEntry[];
}

interface AppStateContextType {
  appState: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setFullState: (newState: AppState) => void;
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
  routine: null,
  teacherLoad: {},
  examTimetable: [],
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
    if (!appState.routine?.schedule || !appState.teachers) return {};

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];
    
    appState.teachers.forEach(teacher => {
        load[teacher] = {};
        days.forEach(day => {
            load[teacher][day] = { total: 0, main: 0, additional: 0 };
        });
    });

    appState.routine.schedule.forEach(entry => {
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
                
                // Update weekly total
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
  }, [appState.routine, appState.teachers, appState.config.subjectCategories]);

  useEffect(() => {
    updateState('teacherLoad', calculatedTeacherLoad);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
  const setFullState = (newState: AppState) => {
    // Merge loaded config with default config to ensure new properties are present
    const mergedConfig = { ...DEFAULT_APP_STATE.config, ...newState.config };
    // Merge loaded state with default state
    const mergedState = { ...DEFAULT_APP_STATE, ...newState, config: mergedConfig };
    
    if(mergedState.timeSlots) {
      mergedState.timeSlots = sortTimeSlots(mergedState.timeSlots);
    }
    setAppState(mergedState);
  };
  
  const loadStateFromDrive = useCallback(async (driveService: GoogleDriveService) => {
      setIsLoading(true);
      try {
        toast({ title: "Loading data...", description: "Fetching your saved data from Google Drive." });
        const loadedState = await driveService.loadBackup();
        if (loadedState && loadedState.teachers && loadedState.teachers.length > 0) {
          setFullState(loadedState);
          toast({ title: "Data Loaded Successfully", description: "Your data has been restored from Google Drive." });
        } else {
            setAppState(DEFAULT_APP_STATE);
            toast({ title: "No backup found", description: "Starting with sample data. Your work will be saved automatically." });
            await driveService.saveBackup(DEFAULT_APP_STATE);
        }
      } catch (error) {
        console.error("Failed to load state from Google Drive:", error);
        toast({ variant: "destructive", title: "Load Failed", description: "Could not load data. Using default sample data." });
        setAppState(DEFAULT_APP_STATE);
      } finally {
        setIsLoading(false);
      }
  }, [toast]);

  const handleLogout = useCallback(async (withSave = true) => {
    const auth = getFirebaseAuth();
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
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
        driveServiceRef.current = null;
        setAppState(DEFAULT_APP_STATE);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateState = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setAppState(prevState => {
      const newState = { ...prevState, [key]: value };
      if (key === 'timeSlots' && Array.isArray(value)) {
        newState.timeSlots = sortTimeSlots(value as string[]);
      }
      if (['teachers', 'classes', 'subjects', 'timeSlots'].includes(key as string)) {
          newState.routine = null;
          newState.teacherLoad = {};
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
        routine: null, 
        teacherLoad: {},
    }));
  }, []);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        const token = credential.accessToken;
        if (token) {
          if (!driveServiceRef.current) {
            driveServiceRef.current = new GoogleDriveService();
          }
          await driveServiceRef.current.init(token);
          await loadStateFromDrive(driveServiceRef.current);
        }
      }
    } catch (error: any) {
        const authError = error as AuthError;
        console.error("Google Sign-In Error:", authError);
        toast({ 
            variant: "destructive", 
            title: "Login Failed", 
            description: `Error: ${authError.code} - ${authError.message}`,
            duration: 9000
        });
    } finally {
       setIsAuthLoading(false); 
    }
  };
  
  return (
    <AppStateContext.Provider value={{ 
        appState, 
        updateState, 
        setFullState,
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
