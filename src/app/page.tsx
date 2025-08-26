
"use client";

import { useContext, useState, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import { useToast } from "@/hooks/use-toast";
import { Wand2, PlusSquare, Edit, Trash2, Loader2 } from "lucide-react";
import type { GenerateScheduleOutput, RoutineVersion, Teacher } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TeacherLoadDisplay from "@/components/routine/teacher-load-display";

/**
 * A wrapper component to conditionally render the main routine display.
 * It shows a message if no routine is active.
 */
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
        <RoutineDisplay
            scheduleData={activeRoutine.schedule}
            timeSlots={timeSlots}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            teacherSubjects={config.teacherSubjects}
            onScheduleChange={handleScheduleChange}
            dailyPeriodQuota={config.dailyPeriodQuota}
            pdfHeader={schoolInfo.pdfHeader}
            isEditable={true}
            workingDays={config.workingDays}
        />
    );
};

export default function Home() {
    const { 
        appState, 
        addRoutineVersion, 
        deleteRoutineVersion, 
        updateRoutineVersion,
        setActiveRoutineId,
        isAuthLoading,
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
        teacherLoad,
     } = appState;
    
  const { toast } = useToast();
  const [renameValue, setRenameValue] = useState("");
  const [routineToRename, setRoutineToRename] = useState<RoutineVersion | null>(null);

  const loggedInTeacher = useMemo(() => {
      // This calculation is safe because it will only run when the dependencies (user, teachers) are available.
      if (!user?.email || !teachers || teachers.length === 0) {
          return null;
      }
      return teachers.find(t => t.email === user.email) || null;
  }, [user, teachers]);

  const activeRoutine = useMemo(() => {
    if (!routineHistory || routineHistory.length === 0) return null;
    const active = routineHistory.find(r => r.id === activeRoutineId);
    return active || routineHistory[0]; // Fallback to the most recent one if activeId is invalid
  }, [routineHistory, activeRoutineId]);

  const hasHistory = routineHistory && routineHistory.length > 0;
  
  // Handler functions for the admin dashboard
  const handleGenerateRoutine = () => {
        try {
            const schedule = generateScheduleLogic({ teachers, classes, subjects, timeSlots, ...config });
            addRoutineVersion(schedule, `School Routine - ${new Date().toLocaleString()}`);
            toast({ title: "Routine Generated Successfully", description: "A new routine version has been created and set as active." });
        } catch (error) {
            toast({ variant: "destructive", title: "Generation Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
        }
    };
    
  const handleCreateBlankRoutine = () => {
    const blankSchedule: GenerateScheduleOutput = { schedule: [] };
    addRoutineVersion(blankSchedule, `Blank Routine - ${new Date().toLocaleString()}`);
    toast({ title: "Blank Routine Created", description: "You can now manually edit the new routine." });
  };
  
  const startRename = (routine: RoutineVersion) => {
    setRoutineToRename(routine);
    setRenameValue(routine.name);
  };
  
  const confirmRename = () => {
    if (routineToRename && renameValue) {
        updateRoutineVersion(routineToRename.id, { name: renameValue });
        cancelRename();
    }
  };

  const cancelRename = () => {
    setRoutineToRename(null);
    setRenameValue("");
  };
  
  /**
   * Renders the view for a logged-in teacher.
   */
  const renderTeacherView = () => {
    // This is called only when isAuthLoading is false.
    // By this point, `user` and `teachers` are available.
    
    // Safety check: Ensure user object and email exist before proceeding.
    // This prevents rendering errors if auth state is somehow inconsistent.
    if (!user || !user.email) {
      return (
        <div className="flex h-full w-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin"/>
                <p>Waiting for user data...</p>
            </div>
        </div>
      );
    }
    
    // Now we can safely check for the loggedInTeacher
    if (!loggedInTeacher) {
        return (
            <div className="p-4 md:p-6 space-y-6 flex items-center justify-center h-full">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Error: Could not identify teacher</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">Your email ({user.email}) is not registered as a teacher in this school's data. Please contact the administrator.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <PageHeader 
                title="My Routine"
                description={`Showing the schedule for ${loggedInTeacher.name} (${loggedInTeacher.email}).`}
            />
            <TeacherRoutineDisplay 
                scheduleData={activeRoutine?.schedule || null}
                teacher={loggedInTeacher}
                timeSlots={appState.timeSlots} 
                workingDays={appState.config.workingDays}
                holidays={holidays}
            />
        </div>
    );
  };


  /**
   * Renders the main dashboard for an administrator.
   */
  const renderAdminDashboard = () => (
    <div className="space-y-6 p-6">
      <PageHeader 
        title="Admin Dashboard"
        description="Generate, view, and manage your school's class routine."
      />

      <Card>
        <CardHeader>
          <CardTitle>Generate New Routine</CardTitle>
          <CardDescription>
            Use the generator or create a blank template. This creates a new version.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="flex-grow">
                <Wand2 className="mr-2 h-5 w-5" />
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
              <Button size="lg" variant="outline" className="flex-grow">
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

         {hasHistory && activeRoutine && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="lg">Manage Routines</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Switch Active Routine</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={activeRoutine.id} onValueChange={setActiveRoutineId}>
                        {routineHistory.map(version => (
                            <DropdownMenuRadioItem key={version.id} value={version.id}>
                                {version.name}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => startRename(activeRoutine)}>
                        <Edit className="mr-2 h-4 w-4" /> Rename Active
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={routineHistory.length <= 1}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Active
                            </DropdownMenuItem>
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
                </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardContent>
      </Card>

      <RoutineDisplayWrapper />

      {activeRoutine && (
        <TeacherLoadDisplay 
            teacherLoad={teacherLoad}
            teachers={teachers}
            workingDays={config.workingDays}
            scheduleData={activeRoutine.schedule}
            timeSlots={timeSlots}
        />
      )}

      <Dialog open={!!routineToRename} onOpenChange={(isOpen) => !isOpen && cancelRename()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Routine Version</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="routine-name">New Name</Label>
            <Input 
              id="routine-name" 
              value={renameValue} 
              onChange={(e) => setRenameValue(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelRename}>Cancel</Button>
            <Button onClick={confirmRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  
  // MAIN RENDER LOGIC
  // This is the single entry point for deciding what to show.
  
  // While authentication and data loading are in progress, show a loading spinner.
  // isAuthLoading is the single source of truth from the context provider.
  if (isAuthLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin"/>
                <p>Loading data...</p>
            </div>
        </div>
    );
  }

  // After loading is complete, decide which view to render.
  if (isUserAdmin) {
    return renderAdminDashboard();
  } else {
    return renderTeacherView();
  }
}
