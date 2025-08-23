
"use client";

import { useContext, useState, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import RoutineDisplay from "@/components/routine/routine-display";
import TeacherLoad from "@/components/routine/teacher-load";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import { useToast } from "@/hooks/use-toast";
import { BrainCircuit, FilePlus, ListCollapse, Trash2, Pencil, Check, X } from "lucide-react";
import type { GenerateScheduleOutput, RoutineVersion } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function Home() {
    const { 
        appState, 
        addRoutineVersion, 
        deleteRoutineVersion, 
        updateRoutineVersion,
        setActiveRoutineId,
        isLoading,
        setIsLoading,
        isUserAdmin,
    } = useContext(AppStateContext);

    const { 
        teachers, 
        classes, 
        subjects, 
        timeSlots, 
        config,
        routineHistory = [],
        activeRoutineId,
     } = appState;
    
  const { toast } = useToast();
  const [renameValue, setRenameValue] = useState("");
  const [routineToRename, setRoutineToRename] = useState<RoutineVersion | null>(null);

  const activeRoutine = useMemo(() => {
    if (!routineHistory || routineHistory.length === 0) return null;
    const active = routineHistory.find(r => r.id === activeRoutineId);
    return active || routineHistory[0]; // Fallback to the most recent one if activeId is invalid
  }, [routineHistory, activeRoutineId]);

  const hasHistory = routineHistory && routineHistory.length > 0;

  const handleGenerateRoutine = () => {
        setIsLoading(true);
        try {
            const schedule = generateScheduleLogic({ teachers, classes, subjects, timeSlots, ...config });
            addRoutineVersion(schedule, `School Routine - ${new Date().toLocaleString()}`);
            toast({ title: "Routine Generated Successfully", description: "A new routine version has been created and set as active." });
        } catch (error) {
            toast({ variant: "destructive", title: "Generation Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
        } finally {
            setIsLoading(false);
        }
    };
    
  const handleCreateBlankRoutine = () => {
    const blankSchedule: GenerateScheduleOutput = { schedule: [] };
    addRoutineVersion(blankSchedule, `Blank Routine - ${new Date().toLocaleString()}`);
    toast({ title: "Blank Routine Created", description: "You can now manually edit the new routine." });
  };

  const handleRename = () => {
    if (routineToRename && renameValue) {
        updateRoutineVersion(routineToRename.id, { name: renameValue });
        setRoutineToRename(null);
        setRenameValue("");
    }
  };

  const openRenameDialog = (routine: RoutineVersion) => {
    setRoutineToRename(routine);
    setRenameValue(routine.name);
  };
  
  const renderTeacherView = () => (
    <div className="flex-1 p-4 md:p-6 space-y-6">
        <PageHeader 
            title="My Dashboard"
            description={`Welcome, ${appState.teachers.find(t => t.email === appState.schoolInfo.udise)?.name || 'Teacher'}. View your schedule below.`}
        />
        {/* Potentially a TeacherRoutineDisplay component here in the future */}
         <Card>
            <CardHeader>
                <CardTitle>Teacher View</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Teacher-specific dashboard content can be added here.</p>
            </CardContent>
        </Card>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="flex-1 flex flex-col h-full">
        {/* --- Top Section (non-scrolling) --- */}
        <div className="p-4 md:p-6">
            <PageHeader 
                title="Dashboard"
                description="Generate, view, and manage your school's class routine."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <BrainCircuit className="h-6 w-6 text-primary" /> Generate New Routine
                        </CardTitle>
                        <CardDescription>Use the generator or create a blank template. This creates a new version.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleGenerateRoutine} disabled={isLoading} className="w-full sm:w-auto">
                            {isLoading ? "Generating..." : "Generate Routine"}
                        </Button>
                         <Button onClick={handleCreateBlankRoutine} variant="outline" className="w-full sm:w-auto">
                            <FilePlus className="mr-2 h-4 w-4" /> Create Blank Routine
                        </Button>
                    </CardContent>
                </Card>

                {hasHistory && activeRoutine && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ListCollapse className="h-6 w-6 text-primary" /> Manage Active Routine
                            </CardTitle>
                            <CardDescription>Select a routine version to view, edit, or download. Your last 5 versions are saved.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {routineHistory.map(routine => (
                                    <li key={routine.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="radio"
                                                name="activeRoutine"
                                                id={routine.id}
                                                value={routine.id}
                                                checked={activeRoutineId === routine.id}
                                                onChange={() => setActiveRoutineId(routine.id)}
                                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                            />
                                            <label htmlFor={routine.id} className="text-sm font-medium">{routine.name}</label>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRenameDialog(routine)}><Pencil className="h-4 w-4"/></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the routine version named "{routine.name}".
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteRoutineVersion(routine.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>

        {/* --- Bottom Section (scrolling) --- */}
        <div className="w-full overflow-x-auto flex-1 p-4 md:p-6 space-y-6">
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

         <Dialog open={!!routineToRename} onOpenChange={(isOpen) => !isOpen && setRoutineToRename(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename Routine</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="routine-name">New Name</Label>
                    <Input id="routine-name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                    <Button onClick={handleRename}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );

  return isUserAdmin ? renderAdminDashboard() : renderTeacherView();
}
