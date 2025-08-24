
"use client";

import { useContext, useState, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import { useToast } from "@/hooks/use-toast";
import { BrainCircuit, FilePlus, Trash2, Pencil } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import TeacherRoutineDisplay from "@/components/routine/teacher-routine-display";
import RoutineDisplay from "@/components/routine/routine-display";
import TeacherLoad from "@/components/routine/teacher-load";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const RoutineDisplayWrapper = () => {
    const { appState, updateRoutineVersion } = useContext(AppStateContext);
    const { 
        routineHistory = [],
        activeRoutineId,
        timeSlots, 
        classes,
        subjects, 
        teachers, 
        config,
        schoolInfo,
    } = appState;
    const { teacherSubjects, dailyPeriodQuota, workingDays } = config;
    const { pdfHeader } = schoolInfo;

    const activeRoutine = useMemo(() => {
        if (!activeRoutineId || !routineHistory) return null;
        return routineHistory.find(r => r.id === activeRoutineId);
    }, [routineHistory, activeRoutineId]);

    const handleScheduleChange = (newSchedule: any[]) => {
        if (!activeRoutineId) return;
        updateRoutineVersion(activeRoutineId, { 
            schedule: { schedule: newSchedule }
        });
    };

    if (!activeRoutine) {
        return (
            <Card className="mt-6">
                <CardContent className="p-6">
                    <div className="text-center py-12 text-muted-foreground">
                        <h2 className="text-xl font-semibold mb-2">No Active Routine</h2>
                        <p>Generate a new routine or select one from the "Manage Routines" menu to view it here.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <RoutineDisplay
                scheduleData={activeRoutine.schedule}
                timeSlots={timeSlots}
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                teacherSubjects={teacherSubjects}
                onScheduleChange={handleScheduleChange}
                dailyPeriodQuota={dailyPeriodQuota}
                pdfHeader={pdfHeader}
                isEditable={true}
                workingDays={workingDays}
            />
        </>
    );
};

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
        holidays = [],
        user,
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
  
  const loggedInTeacher = useMemo(() => {
      if (!user?.email) return null;
      return teachers.find(t => t.email === user.email) || null;
  }, [user, teachers]);

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
    <div className="flex-1 p-4 md:p-6 space-y-6 flex justify-center items-start">
        <TeacherRoutineDisplay 
            scheduleData={activeRoutine?.schedule || null}
            teacher={loggedInTeacher}
            timeSlots={appState.timeSlots} 
            workingDays={appState.config.workingDays}
            holidays={holidays}
        />
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader 
        title="Admin Dashboard"
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
              <div className="flex flex-col sm:flex-row gap-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="lg" disabled={isLoading} className="flex-grow">
                        {isLoading ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (<Wand2 className="mr-2 h-5 w-5" />)}
                        Generate New Routine
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
                      <Button size="lg" variant="outline" disabled={isLoading} className="flex-grow">
                        <PlusSquare className="mr-2 h-5 w-5" />
                        Create New Blank Routine
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
                    <CardDescription>Select, rename, or delete a version. Your last 5 are saved.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-grow">
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
                        </div>
                        {activeRoutine && !routineToRename && (
                              <div className="flex gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => startRename(activeRoutine)} className="flex-grow">
                                    <Edit className="mr-2 h-4 w-4" /> Rename
                                </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" disabled={routineHistory.length <= 1} className="flex-grow">
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

    

    
