
"use client";

import { useContext, useState, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import { useToast } from "@/hooks/use-toast";
import { BrainCircuit, FilePlus, Trash2, Pencil, MoreVertical } from "lucide-react";
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
     <div className="flex flex-col items-center w-full overflow-hidden p-4 md:p-6">
            <div className="w-full max-w-xl">
                <PageHeader 
                    title="Dashboard"
                    description="Generate, view, and manage your school's class routine."
                />
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <BrainCircuit className="h-6 w-6 text-primary" /> Generate New Routine
                        </CardTitle>
                        <CardDescription>Use the generator or create a blank template. This creates a new version.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleGenerateRoutine} disabled={isLoading} className="flex-grow">
                            {isLoading ? "Generating..." : "Generate with AI"}
                        </Button>
                         <Button onClick={handleCreateBlankRoutine} variant="outline" className="flex-grow">
                            <FilePlus className="mr-2 h-4 w-4" /> Create Blank
                        </Button>
                         {hasHistory && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="secondary">Manage Routines</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-64" align="end">
                                    <DropdownMenuLabel>Select Active Routine</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={activeRoutineId || ""} onValueChange={setActiveRoutineId}>
                                        {routineHistory.map(routine => (
                                            <DropdownMenuRadioItem key={routine.id} value={routine.id}>
                                                {routine.name}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    {routineHistory.map(routine => (
                                         <DropdownMenuItem key={`action-${routine.id}`} className="flex justify-between items-center">
                                            <span className="truncate pr-2">{routine.name}</span>
                                            <div className="flex items-center gap-1">
                                                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); openRenameDialog(routine);}}><Pencil className="h-4 w-4"/></Button>
                                                  <AlertDialog onOpenChange={(e) => e && event?.stopPropagation()}>
                                                    <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete "{routine.name}".
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteRoutineVersion(routine.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                         </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                         )}
                    </CardContent>
                </Card>
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
