
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2 } from "lucide-react";
import RoutineDisplay from "@/components/routine/routine-display";
import TeacherLoad from "@/components/routine/teacher-load";
import { generateScheduleLogic } from "@/lib/schedule-generator";
import type { GenerateScheduleLogicInput } from "@/lib/schedule-generator";

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

  return (
    <div className="flex flex-col gap-6">
       <Card>
        <CardHeader>
          <CardTitle>Generate School Routine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4">
             <p className="text-muted-foreground">
                Click the button below to generate a new routine based on your current data and configuration.
                You can manage your school's data and set advanced rules on the other pages.
              </p>
            <Button
              size="lg"
              className="w-full sm:w-auto"
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
          </div>
        </CardContent>
      </Card>
      
      <TeacherLoad teacherLoad={appState.teacherLoad} />

      <RoutineDisplay 
        scheduleData={appState.routine}
        onScheduleChange={(newSchedule) => updateState('routine', { schedule: newSchedule })}
        timeSlots={appState.timeSlots} 
        classes={appState.classes}
        subjects={appState.subjects}
        teachers={appState.teachers}
        teacherSubjects={appState.config.teacherSubjects}
      />
    </div>
  );
}
