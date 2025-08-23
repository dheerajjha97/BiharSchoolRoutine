
"use client";

import { useContext, useMemo, useState } from "react";
import { useRouter } from 'next/navigation';
import { AppStateContext } from "@/context/app-state-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, PlusSquare, Trash2, Edit, Check, X, School } from "lucide-react";
import RoutineDisplay from "@/components/routine/routine-display";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import type { GenerateScheduleLogicInput, ScheduleEntry, RoutineVersion } from "@/types";
import PageHeader from "@/components/app/page-header";
import TeacherLoad from "@/components/routine/teacher-load";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import TeacherRoutineDisplay from "@/components/routine/teacher-routine-display";


export default function Home() {
  const router = useRouter();
  const { 
      appState, 
      isLoading, 
      setIsLoading, 
      addRoutineVersion, 
      deleteRoutineVersion, 
      updateRoutineVersion, 
      setActiveRoutineId, 
      isUserAdmin,
      user
  } = useContext(AppStateContext);
  const { routineHistory, activeRoutineId, teachers, config, schoolInfo } = appState;
  const { toast } = useToast();
  const [renameValue, setRenameValue] = useState("");
  const [routineToRename, setRoutineToRename] = useState<RoutineVersion | null>(null);

  const activeRoutine = useMemo(() => {
    if (!routineHistory || routineHistory.length === 0) return null;
    return routineHistory.find(r => r.id === activeRoutineId) || routineHistory[0];
  }, [routineHistory, activeRoutineId]);
  
  const handleGenerateRoutine = () => {
    setIsLoading(true);
    try {
      const { 
        teachers, classes, subjects, timeSlots, config 
      } = appState;

      if (classes.length === 0 || subjects.length === 0 || timeSlots.length === 0) {
        throw new Error("Please define classes, subjects, and time slots in Data Management before generating a routine.");
      }
      
      const input: GenerateScheduleLogicInput = {
        teachers,
        classes,
        subjects,
        timeSlots,
        ...config,
      };

      const result = generateScheduleLogic(input);
      addRoutineVersion(result);
      toast({
        title: "Routine Generated Successfully!",
        description: "A new version of your routine has been created and is now active.",
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        variant: "destructive",
        title: "Error Generating Routine",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateBlankRoutine = () => {
    setIsLoading(true);
    try {
      const { classes, timeSlots, config } = appState;
      if (classes.length === 0 || timeSlots.length === 0) {
        throw new Error("Please define classes and time slots in Data Management first.");
      }

      const blankSchedule: ScheduleEntry[] = [];
      const instructionalSlots = timeSlots.filter(
        slot => slot !== config.prayerTimeSlot && slot !== config.lunchTimeSlot
      );

      config.workingDays.forEach(day => {
        classes.forEach(className => {
          instructionalSlots.forEach(timeSlot => {
            blankSchedule.push({ day, timeSlot, className, subject: "---", teacher: "N/A" });
          });
          if (config.prayerTimeSlot) blankSchedule.push({ day, timeSlot: config.prayerTimeSlot, className, subject: "Prayer", teacher: "N/A" });
          if (config.lunchTimeSlot) blankSchedule.push({ day, timeSlot: config.lunchTimeSlot, className, subject: "Lunch", teacher: "N/A" });
        });
      });
      
      addRoutineVersion({ schedule: blankSchedule });
      toast({
        title: "Blank Routine Created",
        description: "A new blank routine version has been created and is now active.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error Creating Blank Routine",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRename = (routine: RoutineVersion) => {
    setRoutineToRename(routine);
    setRenameValue(routine.name);
  };

  const cancelRename = () => {
    setRoutineToRename(null);
    setRenameValue("");
  };

  const confirmRename = () => {
    if (routineToRename && renameValue.trim()) {
        updateRoutineVersion(routineToRename.id, { name: renameValue.trim() });
        cancelRename();
    }
  };

  const hasHistory = routineHistory && routineHistory.length > 0;

  const renderAdminDashboard = () => (
    <div className="flex-1 flex flex-col">
        <div className="p-4 md:p-6">
            <PageHeader 
                title="Dashboard"
                description="Generate, view, and manage your school's class routine."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                    <CardTitle>Generate New Routine</CardTitle>
                    <CardDescription>
                        Use the generator or create a blank template. This creates a new version.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="lg" disabled={isLoading}>
                                {isLoading ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (<Wand2 className="mr-2 h-5 w-5" />)}
                                Generate Routine
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will create a new version of the routine, leaving your current active routine untouched in the history. Do you want to continue?
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleGenerateRoutine}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="lg" variant="outline" disabled={isLoading}>
                                <PlusSquare className="mr-2 h-5 w-5" />
                                Create Blank Routine
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will create a new version of the routine, leaving your current active routine untouched in the history. Do you want to continue?
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCreateBlankRoutine}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>

                {hasHistory && activeRoutine && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Active Routine</CardTitle>
                            <CardDescription>Select a routine version to view, edit, or download. Your last 5 versions are saved.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {routineToRename && routineToRename.id === activeRoutine.id ? (
                                <div className="flex gap-2">
                                    <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                                    <Button size="icon" onClick={confirmRename}><Check className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" onClick={cancelRename}><X className="h-4 w-4" /></Button>
                                </div>
                                ) : (
                                <Select value={activeRoutine.id || ""} onValueChange={setActiveRoutineId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a routine version..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {routineHistory.map(version => (
                                            <SelectItem key={version.id} value={version.id}>
                                                {version.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                )}
                                {activeRoutine && !routineToRename && (
                                    <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" onClick={() => startRename(activeRoutine)}>
                                        <Edit className="mr-2 h-4 w-4" /> Rename
                                    </Button>
                                        <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" disabled={routineHistory.length <= 1}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Routine Version?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete "{activeRoutine.name}"? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteRoutineVersion(activeRoutine.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                        </AlertDialog>
                                </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>

        <div className="w-full overflow-x-auto">
            <div className="p-4 md:p-6 space-y-6">
                <RoutineDisplay 
                    scheduleData={activeRoutine?.schedule || null}
                    onScheduleChange={(newSchedule) => {
                        if (activeRoutine) {
                        updateRoutineVersion(activeRoutine.id, { schedule: { schedule: newSchedule } });
                        }
                    }}
                    isEditable={true}
                    timeSlots={appState.timeSlots} 
                    classes={appState.classes}
                    subjects={appState.subjects}
                    teachers={appState.teachers}
                    teacherSubjects={config.teacherSubjects}
                    dailyPeriodQuota={appState.config.dailyPeriodQuota}
                    pdfHeader={appState.schoolInfo.pdfHeader}
                    workingDays={appState.config.workingDays}
                    />
                    
                    <TeacherLoad 
                        teacherLoad={appState.teacherLoad}
                        teachers={teachers}
                        pdfHeader={appState.schoolInfo.pdfHeader}
                        workingDays={appState.config.workingDays}
                    />
            </div>
        </div>
    </div>
  );

  const renderTeacherDashboard = () => {
    const currentTeacher = teachers.find(t => t.email === user?.email);
    
    return (
      <div className="space-y-6">
        <div className="p-4 md:p-6">
            <PageHeader 
                title={`Teacher Dashboard`}
                description={`Welcome, ${user?.displayName || 'Teacher'}. View your personal daily routine.`}
            />
        </div>
        
        <div className="flex justify-center px-4 md:px-6">
            <TeacherRoutineDisplay
                scheduleData={activeRoutine?.schedule || null}
                teacher={currentTeacher || null}
                timeSlots={appState.timeSlots}
                workingDays={appState.config.workingDays}
                holidays={appState.holidays || []}
            />
        </div>
      </div>
    )
  }

  return (
    <>
       { isUserAdmin ? renderAdminDashboard() : renderTeacherDashboard() }
    </>
  );
}
