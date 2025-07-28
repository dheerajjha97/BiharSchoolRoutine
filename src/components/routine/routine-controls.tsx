
"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

type Unavailability = {
  teacher: string;
  day: string;
  timeSlot: string;
}

interface RoutineControlsProps {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  classRequirements: Record<string, string[]>;
  setClassRequirements: (value: Record<string, string[]>) => void;
  subjectImportance: Record<string, number>;
  setSubjectImportance: (value: Record<string, number>) => void;
  unavailability: Unavailability[];
  setUnavailability: (value: Unavailability[]) => void;
  teacherSubjects: Record<string, string[]>;
  setTeacherSubjects: (value: Record<string, string[]>) => void;
  teacherClasses: Record<string, string[]>;
  setTeacherClasses: (value: Record<string, string[]>) => void;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function RoutineControls({
  teachers,
  classes,
  subjects,
  timeSlots,
  classRequirements,
  setClassRequirements,
  subjectImportance,
  setSubjectImportance,
  unavailability,
  setUnavailability,
  teacherSubjects,
  setTeacherSubjects,
  teacherClasses,
  setTeacherClasses,
}: RoutineControlsProps) {
  
  const [newUnavailability, setNewUnavailability] = useState<Omit<Unavailability, ''>>({ teacher: '', day: '', timeSlot: '' });

  const handleRequirementChange = (className: string, subject: string, checked: boolean) => {
    const currentReqs = classRequirements[className] || [];
    const newReqs = checked
      ? [...currentReqs, subject]
      : currentReqs.filter(s => s !== subject);
    setClassRequirements({ ...classRequirements, [className]: newReqs });
  };

  const handleTeacherSubjectChange = (teacher: string, subject: string, checked: boolean) => {
    const currentSubjects = teacherSubjects[teacher] || [];
    const newSubjects = checked
      ? [...currentSubjects, subject]
      : currentSubjects.filter(s => s !== subject);
    setTeacherSubjects({ ...teacherSubjects, [teacher]: newSubjects });
  };

  const handleTeacherClassChange = (teacher: string, className: string, checked: boolean) => {
    const currentClasses = teacherClasses[teacher] || [];
    const newClasses = checked
      ? [...currentClasses, className]
      : currentClasses.filter(c => c !== className);
    setTeacherClasses({ ...teacherClasses, [teacher]: newClasses });
  };
  
  const handleAddUnavailability = () => {
    if (newUnavailability.teacher && newUnavailability.day && newUnavailability.timeSlot) {
      // Avoid adding duplicates
      if (!unavailability.some(u => 
          u.teacher === newUnavailability.teacher && 
          u.day === newUnavailability.day && 
          u.timeSlot === newUnavailability.timeSlot
      )) {
        setUnavailability([...unavailability, newUnavailability as Unavailability]);
      }
      setNewUnavailability({ teacher: '', day: '', timeSlot: '' });
    }
  };

  const handleRemoveUnavailability = (index: number) => {
    setUnavailability(unavailability.filter((_, i) => i !== index));
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="class-requirements">
            <AccordionTrigger>Class Requirements</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map(c => (
                <div key={c} className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">{c}</h4>
                  <div className="space-y-2">
                    {subjects.map(s => (
                      <div key={s} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${c}-${s}`}
                          checked={classRequirements[c]?.includes(s) || false}
                          onCheckedChange={(checked) => handleRequirementChange(c, s, !!checked)}
                        />
                        <Label htmlFor={`${c}-${s}`}>{s}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="teacher-subjects">
            <AccordionTrigger>Teacher-Subject Mapping</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teachers.map(t => (
                <div key={t} className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">{t}</h4>
                  <div className="space-y-2">
                    {subjects.map(s => (
                      <div key={s} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${t}-${s}`}
                          checked={teacherSubjects[t]?.includes(s) || false}
                          onCheckedChange={(checked) => handleTeacherSubjectChange(t, s, !!checked)}
                        />
                        <Label htmlFor={`${t}-${s}`}>{s}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="teacher-classes">
            <AccordionTrigger>Teacher-Class Mapping</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teachers.map(t => (
                <div key={t} className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">{t}</h4>
                  <div className="space-y-2">
                    {classes.map(c => (
                      <div key={c} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${t}-${c}`}
                          checked={teacherClasses[t]?.includes(c) || false}
                          onCheckedChange={(checked) => handleTeacherClassChange(t, c, !!checked)}
                        />
                        <Label htmlFor={`${t}-${c}`}>{c}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="subject-importance">
            <AccordionTrigger>Subject Importance</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the importance for each subject. The AI will prioritize scheduling subjects with higher importance.
              </p>
              {subjects.map(s => (
                <div key={s} className="grid grid-cols-4 items-center gap-4">
                  <Label className="col-span-1">{s}</Label>
                  <Slider
                    className="col-span-2"
                    defaultValue={[subjectImportance[s] || 5]}
                    max={10}
                    step={1}
                    onValueChange={([value]) => setSubjectImportance({ ...subjectImportance, [s]: value })}
                  />

                  <span className="col-span-1 text-sm text-muted-foreground">
                    Importance: {subjectImportance[s] || 5}
                  </span>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="teacher-unavailability">
            <AccordionTrigger>Teacher Unavailability</AccordionTrigger>
            <AccordionContent className="space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Select value={newUnavailability.teacher} onValueChange={(value) => setNewUnavailability({...newUnavailability, teacher: value})}>
                      <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                      <SelectContent>{teachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={newUnavailability.day} onValueChange={(value) => setNewUnavailability({...newUnavailability, day: value})}>
                      <SelectTrigger><SelectValue placeholder="Select Day" /></SelectTrigger>
                      <SelectContent>{daysOfWeek.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={newUnavailability.timeSlot} onValueChange={(value) => setNewUnavailability({...newUnavailability, timeSlot: value})}>
                      <SelectTrigger><SelectValue placeholder="Select Time Slot" /></SelectTrigger>
                      <SelectContent>{timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                   <Button onClick={handleAddUnavailability}>Add Rule</Button>
               </div>
               <div className="mt-4 space-y-2">
                  {unavailability.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Day</TableHead>
                          <TableHead>Time Slot</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {unavailability.map((rule, index) => (
                        <TableRow key={index}>
                          <TableCell>{rule.teacher}</TableCell>
                          <TableCell>{rule.day}</TableCell>
                          <TableCell>{rule.timeSlot}</TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="icon" onClick={() => handleRemoveUnavailability(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">No unavailability rules added. All teachers are assumed to be available.</p>
                  )}
               </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
