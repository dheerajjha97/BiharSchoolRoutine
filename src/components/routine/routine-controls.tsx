
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import type { SchoolConfig } from "@/context/app-state-provider";
import type { SubjectPriority, SubjectCategory } from "@/lib/schedule-generator";

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
  config: SchoolConfig;
  updateConfig: <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => void;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function RoutineControls({
  teachers,
  classes,
  subjects,
  timeSlots,
  config,
  updateConfig
}: RoutineControlsProps) {
  
  const [newUnavailability, setNewUnavailability] = useState<Omit<Unavailability, ''>>({ teacher: '', day: '', timeSlot: '' });

  const handleRequirementChange = (className: string, subject: string, checked: boolean) => {
    const currentReqs = config.classRequirements[className] || [];
    const newReqs = checked
      ? [...currentReqs, subject]
      : currentReqs.filter(s => s !== subject);
    updateConfig('classRequirements', { ...config.classRequirements, [className]: newReqs });
  };

  const handleTeacherSubjectChange = (teacher: string, subject: string, checked: boolean) => {
    const currentSubjects = config.teacherSubjects[teacher] || [];
    const newSubjects = checked
      ? [...currentSubjects, subject]
      : currentSubjects.filter(s => s !== subject);
    updateConfig('teacherSubjects', { ...config.teacherSubjects, [teacher]: newSubjects });
  };

  const handleTeacherClassChange = (teacher: string, className: string, checked: boolean) => {
    const currentClasses = config.teacherClasses[teacher] || [];
    const newClasses = checked
      ? [...currentClasses, className]
      : currentClasses.filter(c => c !== className);
    updateConfig('teacherClasses', { ...config.teacherClasses, [teacher]: newClasses });
  };
  
  const handleAddUnavailability = () => {
    if (newUnavailability.teacher && newUnavailability.day && newUnavailability.timeSlot) {
      if (!config.unavailability.some(u => 
          u.teacher === newUnavailability.teacher && 
          u.day === newUnavailability.day && 
          u.timeSlot === newUnavailability.timeSlot
      )) {
        updateConfig('unavailability', [...config.unavailability, newUnavailability as Unavailability]);
      }
      setNewUnavailability({ teacher: '', day: '', timeSlot: '' });
    }
  };

  const handleRemoveUnavailability = (index: number) => {
    updateConfig('unavailability', config.unavailability.filter((_, i) => i !== index));
  };


  return (
    <Accordion type="multiple" defaultValue={["scheduling-rules"]} className="w-full space-y-4">
      <AccordionItem value="scheduling-rules" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Scheduling Rules</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="daily-period-quota">Max Periods Per Teacher Per Day</Label>
                <Select
                  value={String(config.dailyPeriodQuota)}
                  onValueChange={(value) => updateConfig('dailyPeriodQuota', Number(value))}
                >
                  <SelectTrigger id="daily-period-quota">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5).keys()].map(i => <SelectItem key={i+4} value={String(i+4)}>{i+4}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prevent-consecutive"
              checked={config.preventConsecutiveClasses}
              onCheckedChange={(checked) => updateConfig('preventConsecutiveClasses', !!checked)}
            />
            <Label htmlFor="prevent-consecutive" className="font-normal">
              Prevent teachers from having 3 or more consecutive periods
            </Label>
          </div>
           <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-combined-classes"
              checked={config.enableCombinedClasses}
              onCheckedChange={(checked) => updateConfig('enableCombinedClasses', !!checked)}
            />
            <Label htmlFor="enable-combined-classes" className="font-normal">
              Enable combined classes for the same subject/grade (experimental)
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

       <AccordionItem value="class-teacher" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Class Teacher Assignment</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
           <p className="text-sm text-muted-foreground">Assign a class teacher to each class. They will be automatically scheduled for the first period for attendance.</p>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Class Teacher</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {classes.map(c => (
                        <TableRow key={c}>
                            <TableCell><Label>{c}</Label></TableCell>
                            <TableCell>
                                <Select 
                                    value={config.classTeachers[c] || ''}
                                    onValueChange={(value) => updateConfig('classTeachers', { ...config.classTeachers, [c]: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class Teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {teachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="teacher-unavailability" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Teacher Unavailability</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
           <p className="text-sm text-muted-foreground">Add specific times when a teacher is not available.</p>
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
              {config.unavailability.length > 0 ? (
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
                  {config.unavailability.map((rule, index) => (
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
                <p className="text-sm text-muted-foreground text-center py-4">No unavailability rules added.</p>
              )}
           </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="breaks" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Breaks (Prayer & Lunch)</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Prayer Period</Label>
              <Select value={config.prayerTimeSlot} onValueChange={(v) => updateConfig('prayerTimeSlot', v === 'none' ? '' : v)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select Prayer Time Slot" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lunch Period</Label>
              <Select value={config.lunchTimeSlot} onValueChange={(v) => updateConfig('lunchTimeSlot', v === 'none' ? '' : v)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select Lunch Time Slot" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="teacher-subjects" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Teacher-Subject Mapping</AccordionTrigger>
        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {teachers.map(t => (
            <div key={t}>
              <h4 className="font-semibold mb-2 border-b pb-2">{t}</h4>
              <ScrollArea className="h-60">
                <div className="space-y-2 pr-4">
                  {subjects.map(s => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${t}-${s}`}
                        checked={config.teacherSubjects[t]?.includes(s) || false}
                        onCheckedChange={(checked) => handleTeacherSubjectChange(t, s, !!checked)}
                      />
                      <Label htmlFor={`${t}-${s}`} className="font-normal">{s}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>

       <AccordionItem value="teacher-classes" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Teacher-Class Mapping</AccordionTrigger>
        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {teachers.map(t => (
            <div key={t}>
              <h4 className="font-semibold mb-2 border-b pb-2">{t}</h4>
               <ScrollArea className="h-60">
                <div className="space-y-2 pr-4">
                  {classes.map(c => (
                    <div key={c} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${t}-${c}`}
                        checked={config.teacherClasses[t]?.includes(c) || false}
                        onCheckedChange={(checked) => handleTeacherClassChange(t, c, !!checked)}
                      />
                      <Label htmlFor={`${t}-${c}`} className="font-normal">{c}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="class-requirements" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Class-Subject Requirements</AccordionTrigger>
        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {classes.map(c => (
            <div key={c}>
              <h4 className="font-semibold mb-2 border-b pb-2">{c}</h4>
              <ScrollArea className="h-60">
                <div className="space-y-2 pr-4">
                  {subjects.map(s => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${c}-${s}`}
                        checked={config.classRequirements[c]?.includes(s) || false}
                        onCheckedChange={(checked) => handleRequirementChange(c, s, !!checked)}
                      />
                      <Label htmlFor={`${c}-${s}`} className="font-normal">{s}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="subject-categories" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Subject Categories</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
           <p className="text-sm text-muted-foreground">
            Categorize subjects as Main (prioritized, no daily repeats) or Additional (fills remaining slots).
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Main</TableHead>
                <TableHead className="text-center">Additional</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects
                .filter(s => !['Prayer', 'Lunch'].includes(s))
                .map(s => (
                <TableRow key={s}>
                  <TableCell><Label>{s}</Label></TableCell>
                   <TableCell colSpan={2}>
                        <RadioGroup
                          value={config.subjectCategories[s] || 'additional'}
                          onValueChange={(value: SubjectCategory) => updateConfig('subjectCategories', { ...config.subjectCategories, [s]: value })}
                          className="grid grid-cols-2"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <RadioGroupItem value="main" id={`${s}-main`} />
                          </div>
                          <div className="flex items-center justify-center space-x-2">
                            <RadioGroupItem value="additional" id={`${s}-additional`} />
                          </div>
                        </RadioGroup>
                      </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="subject-priority" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Subject Priority (Time of Day)</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Optionally, set when subjects should be prioritized. This helps in scheduling important subjects before lunch.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Before Lunch</TableHead>
                <TableHead className="text-center">After Lunch</TableHead>
                <TableHead className="text-center">No Preference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects
                .filter(s => !['Prayer', 'Lunch'].includes(s))
                .map(s => (
                <TableRow key={s}>
                  <TableCell><Label>{s}</Label></TableCell>
                  <TableCell colSpan={3}>
                    <RadioGroup
                      value={config.subjectPriorities[s] || 'none'}
                      onValueChange={(value: SubjectPriority) => updateConfig('subjectPriorities', { ...config.subjectPriorities, [s]: value })}
                      className="grid grid-cols-3"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <RadioGroupItem value="before" id={`${s}-before`} />
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <RadioGroupItem value="after" id={`${s}-after`} />
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <RadioGroupItem value="none" id={`${s}-none`} />
                      </div>
                    </RadioGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
