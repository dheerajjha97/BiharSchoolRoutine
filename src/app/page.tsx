
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, PlusSquare } from "lucide-react";
import RoutineDisplay from "@/components/routine/routine-display";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import type { GenerateScheduleLogicInput } from "@/lib/schedule-generator";
import type { ScheduleEntry } from "@/ai/flows/generate-schedule";
import PageHeader from "@/components/app/page-header";

const daysOfWeek: ScheduleEntry['day'][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Home() {
  const { appState, updateState, isLoading, setIsLoading } = useContext(AppStateContext);
  const { toast } = useToast();

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
      updateState('routine', result);
      toast({
        title: "Routine Generated Successfully!",
        description: "Your new class routine is ready to be viewed.",
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        variant: "destructive",
        title: "Error Generating Routine",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
      updateState('routine', null);
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
          // Add instructional slots as blank
          instructionalSlots.forEach(timeSlot => {
            blankSchedule.push({
              day,
              timeSlot,
              className,
              subject: "---",
              teacher: "N/A",
            });
          });
          // Add prayer and lunch slots if defined
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
      
      updateState('routine', { schedule: blankSchedule });
      toast({
        title: "Blank Routine Created",
        description: "An empty schedule grid has been created for you to fill in.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error Creating Blank Routine",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
       updateState('routine', null);
    } finally {
      setIsLoading(false);
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
              Use the generator to create a routine automatically, or create a blank template to fill in manually.
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
      
        <RoutineDisplay 
          scheduleData={appState.routine}
          onScheduleChange={(newSchedule) => updateState('routine', { schedule: newSchedule })}
          timeSlots={appState.timeSlots} 
          classes={appState.classes}
          subjects={appState.subjects}
          teachers={appState.teachers}
          teacherSubjects={appState.config.teacherSubjects}
          dailyPeriodQuota={appState.config.dailyPeriodQuota}
          teacherLoad={appState.teacherLoad}
        />
    </div>
  );
}
