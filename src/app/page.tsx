
"use client";

import { useContext, useState } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, PlusSquare, Trash2, Edit } from "lucide-react";
import RoutineDisplay from "@/components/routine/routine-display";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import type { GenerateScheduleLogicInput } from "@/lib/schedule-generator";
import type { ScheduleEntry, RoutineVersion } from "@/ai/flows/generate-schedule";
import PageHeader from "@/components/app/page-header";
import TeacherLoad from "@/components/routine/teacher-load";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


const daysOfWeek: ScheduleEntry['day'][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Home() {
  const { appState, updateState, isLoading, setIsLoading, setActiveRoutineId, addRoutineVersion, updateRoutineVersion, deleteRoutineVersion } = useContext(AppStateContext);
  const { toast } = useToast();
  const [renameValue, setRenameValue] = useState("");
  const [routineToRename, setRoutineToRename] = useState<RoutineVersion | null>(null);


  const activeRoutine = appState.routineHistory.find(r => r.id === appState.activeRoutineId);

  const handleGenerateRoutine = async () => {
    setIsLoading(true);
    try {
      const { 
        teachers, classes, subjects, timeSlots, config 
      } = appState;

      if (teachers.length === 0 || classes.length === 0 || subjects.length === 0 || timeSlots.length === 0) {
        throw new Error("Please define teachers, classes, subjects, and time slots in Data Management before generating a routine.");
      }
      
      const input: GenerateScheduleLogicInput = {
        teacherNames: teachers,
        classes,
        subjects,
        timeSlots,
        ...config,
      };

      const result = generateScheduleLogic(input);
      
      addRoutineVersion(result, `Generated on ${new Date().toLocaleString()}`);

      toast({
        title: "Routine Generated Successfully!",
        description: "A new routine version has been created and is now active.",
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

      daysOfWeek.forEach(day => {
        classes.forEach(className => {
          instructionalSlots.forEach(timeSlot => {
            blankSchedule.push({
              day,
              timeSlot,
              className,
              subject: "---",
              teacher: "N/A",
            });
          });
          if (config.prayerTimeSlot) {
            blankSchedule.push({
              day,
              timeSlot: config.prayerTimeSlot,
              className,
              subject: "Prayer",
              teacher: "N/A",
            });
          }
          if (config.lunchTimeSlot) {
            blankSchedule.push({
              day,
              timeSlot: config.lunchTimeSlot,
              className,
              subject: "Lunch",
              teacher: "N/A",
            });
          }
        });
      });
      
      addRoutineVersion({ schedule: blankSchedule }, `Blank on ${new Date().toLocaleString()}`);

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

  const handleRename = () => {
    if (routineToRename && renameValue.trim()) {
      updateRoutineVersion(routineToRename.id, { name: renameValue.trim() });
      toast({ title: "Routine Renamed", description: `"${routineToRename.name}" was renamed to "${renameValue.trim()}".` });
      setRoutineToRename(null);
      setRenameValue("");
    }
  };

  return (
    <div className="space-y-6">
       <PageHeader 
          title="Dashboard"
          description="Generate, view, and manage your school's class routine."
        />

        <Card>
          <CardHeader>
            <CardTitle>Generate New Routine</CardTitle>
            <CardDescription>
              Use the generator to create a routine automatically, or create a blank template. Each action creates a new, switchable version of your routine.
            </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={handleGenerateRoutine}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-5 w-5" />
                  )}
                  Generate Routine
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleCreateBlankRoutine}
                  disabled={isLoading}
                >
                  <PlusSquare className="mr-2 h-5 w-5" />
                  Create Blank Routine
                </Button>
              </div>
          </CardContent>
        </Card>

        {appState.routineHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Active Routine</CardTitle>
              <CardDescription>Switch between different versions of your routine. Your last 5 versions are saved automatically.</CardDescription>
            </CardHeader>
            <CardContent>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                      <span>Active: {activeRoutine?.name || "No routine selected"}</span>
                      <MoreHorizontal className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Switch to Routine Version</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {appState.routineHistory.map(routine => (
                      <DropdownMenuItem 
                        key={routine.id} 
                        className="flex justify-between items-center"
                        onSelect={() => setActiveRoutineId(routine.id)}
                      >
                       <span>{routine.name}</span>

                        <AlertDialog onOpenChange={(open) => { if(!open) { setRoutineToRename(null); setRenameValue(""); }}}>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogTrigger asChild onSelect={(e) => e.preventDefault()}>
                                  <DropdownMenuItem onClick={() => { setRoutineToRename(routine); setRenameValue(routine.name);}}>
                                    <Edit className="mr-2 h-4 w-4" /> Rename
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <DropdownMenuItem className="text-destructive" onSelect={() => deleteRoutineVersion(routine.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>

                           <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rename Routine</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Give this routine version a new name to easily identify it later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="grid gap-2 py-2">
                                <Label htmlFor="routine-name">New Name</Label>
                                <Input id="routine-name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRename}>Save</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
          </Card>
        )}
      
        <RoutineDisplay 
          scheduleData={activeRoutine ? activeRoutine.schedule : null}
          onScheduleChange={(newSchedule) => {
            if (activeRoutine) {
              updateRoutineVersion(activeRoutine.id, { schedule: newSchedule });
            }
          }}
          timeSlots={appState.timeSlots} 
          classes={appState.classes}
          subjects={appState.subjects}
          teachers={appState.teachers}
          teacherSubjects={appState.config.teacherSubjects}
          dailyPeriodQuota={appState.config.dailyPeriodQuota}
          pdfHeader={appState.pdfHeader}
        />
        
        <TeacherLoad 
            teacherLoad={appState.teacherLoad}
            pdfHeader={appState.pdfHeader}
        />
    </div>
  );
}
