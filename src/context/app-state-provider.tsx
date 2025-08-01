
"use client";

import { createContext, useState, useEffect, useMemo, useRef, useCallback, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import type { SubjectCategory, SubjectPriority } from "@/lib/schedule-generator";
import { sortClasses, sortTimeSlots } from "@/lib/utils";

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

type TeacherLoad = Record<string, Record<string, number>>;

type TeacherRoutine = {
    teacherName: string;
    schedule: Record<string, Record<string, { className: string, subject: string }>>;
};

type AppState = {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  config: SchoolConfig;
  routine: GenerateScheduleOutput | null;
  teacherLoad: TeacherLoad;
  teacherRoutineForPrint: TeacherRoutine | null;
}

interface AppStateContextType {
  appState: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  updateConfig: <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  handleSaveConfig: () => void;
  handleImportConfig: () => void;
  handleSaveBackup: () => void;
  handleImportBackup: () => void;
  handleClearRoutine: () => void;
  handlePrintTeacherRoutine: (teacherName: string | null) => void;
}

export const AppStateContext = createContext<AppStateContextType>({} as AppStateContextType);

const DEFAULT_APP_STATE: AppState = {
  teachers: ["Mr. Sharma", "Mrs. Gupta", "Mr. Singh", "Ms. Verma", "Mr. Khan", "Mrs. Roy"],
  classes: ["Class 9A", "Class 9B", "Class 10A", "Class 11 Science", "Class 12 Science", "Class 12 Commerce"],
  subjects: ["Math", "Science", "Social Sc.", "English", "Hindi", "Physics", "Chemistry", "Biology", "Accountancy", "Business St.", "History", "Pol. Science", "Sanskrit", "Computer"],
  timeSlots: [
    "09:00 AM - 09:15 AM",
    "09:15 AM - 10:00 AM",
    "10:00 AM - 10:45 AM",
    "10:45 AM - 11:30 AM",
    "11:30 AM - 12:15 PM",
    "12:15 PM - 01:00 PM",
    "01:00 PM - 01:45 PM",
    "01:45 PM - 02:30 PM"
  ],
  config: {
    classRequirements: {},
    subjectPriorities: {},
    unavailability: [],
    teacherSubjects: {},
    teacherClasses: {},
    subjectCategories: {},
    prayerTimeSlot: "09:00 AM - 09:15 AM",
    lunchTimeSlot: "12:15 PM - 01:00 PM",
    preventConsecutiveClasses: true,
    enableCombinedClasses: false,
    dailyPeriodQuota: 5,
  },
  routine: null,
  teacherLoad: {},
  teacherRoutineForPrint: null,
};

const getGradeFromClassName = (className: string): string | null => {
    if (typeof className !== 'string') return null;
    const match = className.match(/\d+/);
    return match ? match[0] : null;
};

const categorizeClasses = (classes: string[]) => {
    const sorted = [...classes].sort(sortClasses);
    const secondary = sorted.filter(c => ['9', '10'].includes(getGradeFromClassName(c) || ''));
    const seniorSecondary = sorted.filter(c => ['11', '12'].includes(getGradeFromClassName(c) || ''));
    return { 
        secondaryClasses: secondary, 
        seniorSecondaryClasses: seniorSecondary 
    };
};

const toRoman = (num: number): string => {
    if (num < 1) return "";
    const romanMap: Record<number, string> = { 10: 'X', 9: 'IX', 5: 'V', 4: 'IV', 1: 'I' };
    let result = '';
    for (const val of [10, 9, 5, 4, 1]) {
        while (num >= val) {
            result += romanMap[val];
            num -= val;
        }
    }
    return result;
};


export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const { toast } = useToast();
  const configInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const savedStateJSON = localStorage.getItem("biharSchoolRoutineState_v2");
      if (savedStateJSON) {
        const savedState: AppState = JSON.parse(savedStateJSON);
        if (savedState && savedState.config) {
          const mergedConfig = { ...DEFAULT_APP_STATE.config, ...savedState.config };
          const mergedState = { ...DEFAULT_APP_STATE, ...savedState, config: mergedConfig };
          if(mergedState.timeSlots) {
            mergedState.timeSlots = sortTimeSlots(mergedState.timeSlots);
          }
          setAppState(mergedState);
        }
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      toast({ variant: "destructive", title: "Could not load saved data", description: "Starting with default settings." });
    } finally {
      setIsStateLoaded(true);
    }
  }, [toast]);
  
  useEffect(() => {
    if (isStateLoaded) {
      updateState('teacherLoad', calculatedTeacherLoad);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedTeacherLoad, isStateLoaded]);

  useEffect(() => {
    if (isStateLoaded) {
      try {
        const stateToSave = { ...appState, teacherLoad: {}, teacherRoutineForPrint: null }; // Don't save computed/temporary state
        const appStateJSON = JSON.stringify(stateToSave);
        localStorage.setItem("biharSchoolRoutineState_v2", appStateJSON);
      } catch (error) {
        console.error("Failed to save state to localStorage:", error);
         toast({ variant: "destructive", title: "Could not save progress" });
      }
    }
  }, [appState, isStateLoaded, toast]);
  
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

  const handleSaveConfig = useCallback(() => {
    try {
      const configToSave = appState.config;
      const jsonString = JSON.stringify(configToSave, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "school-config.json";
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
      const loadedConfig: Partial<SchoolConfig> = JSON.parse(text);
      if (typeof loadedConfig !== 'object' || loadedConfig === null) throw new Error("Invalid config file format.");
      
      const newConfig = { ...appState.config, ...loadedConfig };
      setAppState(prevState => ({ ...prevState, config: newConfig }));

      toast({ title: "Configuration loaded successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Load failed", description: "Could not parse the configuration file." });
    } finally {
        if(configInputRef.current) configInputRef.current.value = "";
    }
  };

  const handleImportConfig = useCallback(() => {
    configInputRef.current?.click();
  }, []);
  
  const handleSaveBackup = useCallback(() => {
    try {
      const stateToSave = { ...appState, teacherLoad: {}, teacherRoutineForPrint: null }; // Don't save computed/temporary state
      const jsonString = JSON.stringify(stateToSave, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "school-backup.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Backup saved successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Backup save failed" });
    }
  }, [appState, toast]);

  const handleFileLoadBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const loadedState: Partial<AppState> = JSON.parse(text);

      if (typeof loadedState !== 'object' || loadedState === null || !loadedState.config || !loadedState.teachers) {
          throw new Error("Invalid backup file format.");
      }
      
      const mergedConfig = { ...DEFAULT_APP_STATE.config, ...loadedState.config };
      const mergedState = { ...DEFAULT_APP_STATE, ...loadedState, config: mergedConfig };
      if(mergedState.timeSlots) {
        mergedState.timeSlots = sortTimeSlots(mergedState.timeSlots);
      }
      setAppState(mergedState);

      toast({ title: "Backup loaded successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Backup load failed", description: "Could not parse the backup file." });
    } finally {
        if(backupInputRef.current) backupInputRef.current.value = "";
    }
  };

  const handleImportBackup = useCallback(() => {
    backupInputRef.current?.click();
  }, []);
  
  const handleClearRoutine = useCallback(() => {
      updateState('routine', null);
      toast({ title: "Routine Cleared", description: "The generated routine has been removed." });
  }, [updateState, toast]);
  
  const handlePrintTeacherRoutine = (teacherName: string | null) => {
    const { routine, timeSlots, classes, teacherLoad } = appState;
    if (!routine?.schedule) {
        toast({ variant: "destructive", title: "No routine available to print." });
        return;
    }

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let printContent = '';

    if (teacherName) {
      // Print single teacher routine
      const teacherScheduleEntries = routine.schedule.filter(entry => entry.teacher.includes(teacherName));
      const scheduleByDayTime: Record<string, Record<string, { className: string, subject: string }>> = {};
      teacherScheduleEntries.forEach(entry => {
          if (!scheduleByDayTime[entry.day]) scheduleByDayTime[entry.day] = {};
          scheduleByDayTime[entry.day][entry.timeSlot] = { className: entry.className, subject: entry.subject };
      });
       printContent = `
          <h2>Routine for ${teacherName}</h2>
          <table>
              <thead>
                  <tr>
                      <th>Day / Time</th>
                      ${timeSlots.map(slot => `<th>${slot}</th>`).join('')}
                  </tr>
              </thead>
              <tbody>
                  ${daysOfWeek.map(day => `
                      <tr>
                          <td class="day-header">${day}</td>
                          ${timeSlots.map(slot => {
                              const entry = scheduleByDayTime[day]?.[slot];
                              return `<td>${entry ? `<div><b>${entry.subject}</b></div><div>${entry.className}</div>` : '---'}</td>`;
                          }).join('')}
                      </tr>
                  `).join('')}
              </tbody>
          </table>
      `;
    } else {
      // Print all routines
      const { secondaryClasses, seniorSecondaryClasses } = categorizeClasses(classes);

      const instructionalSlotMap: { [timeSlot: string]: number } = {};
      let periodCounter = 1;
      timeSlots.forEach(slot => {
        if (!routine?.schedule?.find(e => e.timeSlot === slot && (e.subject === 'Prayer' || e.subject === 'Lunch'))) {
            instructionalSlotMap[slot] = periodCounter++;
        }
      });
      
      const gridSchedule: Record<string, Record<string, Record<string, ScheduleEntry[]>>> = {};
      daysOfWeek.forEach(day => {
          gridSchedule[day] = {};
          classes.forEach(c => {
              gridSchedule[day][c] = {};
              timeSlots.forEach(slot => { gridSchedule[day][c][slot] = []; });
          });
      });
      routine.schedule.forEach(entry => {
          entry.className.split(' & ').map(c => c.trim()).forEach(className => {
              if (gridSchedule[entry.day]?.[className]?.[entry.timeSlot]) {
                gridSchedule[entry.day][className][entry.timeSlot].push(entry);
              }
          });
      });

      const renderScheduleTable = (title: string, displayClasses: string[]) => {
        if(displayClasses.length === 0) return '';
        return `
            <div class="break-after-page">
              <h3>${title}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Class</th>
                    ${timeSlots.map(slot => `<th>${slot}<br><span class="roman">${instructionalSlotMap[slot] ? toRoman(instructionalSlotMap[slot]) : '-'}</span></th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${daysOfWeek.map(day => 
                    displayClasses.map((className, classIndex) => `
                      <tr>
                        ${classIndex === 0 ? `<td class="day-header" rowspan="${displayClasses.length}">${day}</td>` : ''}
                        <td>${className}</td>
                        ${timeSlots.map(timeSlot => {
                          const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
                          const cellContent = entries.map(e => {
                            if (e.subject === '---') return '';
                            let content = `<b>${e.subject}</b>`;
                            if (e.teacher !== 'N/A') content += `<br><small>${e.teacher}</small>`;
                            if (e.className.includes('&')) content += `<br><i>(Combined)</i>`;
                            return content;
                          }).join(' / ');
                          return `<td>${cellContent}</td>`;
                        }).join('')}
                      </tr>
                    `).join('')
                  ).join('')}
                </tbody>
              </table>
            </div>
        `;
      };
      
      const renderTeacherLoad = () => {
         const teachers = Object.keys(teacherLoad).sort();
         if(teachers.length === 0) return '';
         return `
            <div class="break-after-page">
              <h3>Teacher Workload Summary</h3>
              <table>
                <thead>
                   <tr>
                    <th>Teacher</th>
                    ${daysOfWeek.map(day => `<th>${day.substring(0,3)}</th>`).join('')}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${teachers.map(teacher => `
                    <tr>
                      <td>${teacher}</td>
                      ${daysOfWeek.map(day => `<td>${teacherLoad[teacher]?.[day] ?? 0}</td>`).join('')}
                       <td>${teacherLoad[teacher]?.['Total'] ?? 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
         `;
      };

      printContent = `
        <h2>Class Routine – Session 2025–26</h2>
        ${renderScheduleTable("Secondary", secondaryClasses)}
        ${renderScheduleTable("Senior Secondary", seniorSecondaryClasses)}
        ${renderTeacherLoad()}
      `;
    }

    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Print Routine</title>
              <style>
                @page { size: A4 landscape; margin: 0.5in; }
                body { font-family: sans-serif; font-size: 9pt; }
                h2, h3 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
                th, td { border: 1px solid #ccc; padding: 4px; text-align: center; word-break: break-word; }
                th { font-weight: bold; background-color: #f2f2f2; }
                td b { font-size: 10pt; }
                .day-header { text-align: left; font-weight: bold; vertical-align: middle; }
                .roman { font-size: 8pt; color: #666; }
                .break-after-page { page-break-after: always; }
              </style>
            </head>
            <body onload="window.print()">
              ${printContent}
            </body>
          </html>
        `);
        newWindow.document.close();
    }
  };

  return (
    <AppStateContext.Provider value={{ appState, updateState, updateConfig, isLoading, setIsLoading, handleSaveConfig, handleImportConfig, handleSaveBackup, handleImportBackup, handleClearRoutine, handlePrintTeacherRoutine }}>
      {children}
      <input
        type="file"
        ref={configInputRef}
        onChange={handleFileLoadConfig}
        className="hidden"
        accept="application/json"
      />
      <input
        type="file"
        ref={backupInputRef}
        onChange={handleFileLoadBackup}
        className="hidden"
        accept="application/json"
      />
    </AppStateContext.Provider>
  );
};
