"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RoutineControlsProps {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  classRequirements: Record<string, string[]>;
  setClassRequirements: (value: Record<string, string[]>) => void;
  subjectPriorities: Record<string, number>;
  setSubjectPriorities: (value: Record<string, number>) => void;
  availability: Record<string, Record<string, boolean>>;
  setAvailability: (value: Record<string, Record<string, boolean>>) => void;
}

export default function RoutineControls({
  teachers,
  classes,
  subjects,
  timeSlots,
  classRequirements,
  setClassRequirements,
  subjectPriorities,
  setSubjectPriorities,
  availability,
  setAvailability,
}: RoutineControlsProps) {
  
  const handleRequirementChange = (className: string, subject: string, checked: boolean) => {
    const currentReqs = classRequirements[className] || [];
    const newReqs = checked
      ? [...currentReqs, subject]
      : currentReqs.filter(s => s !== subject);
    setClassRequirements({ ...classRequirements, [className]: newReqs });
  };
  
  const handleAvailabilityChange = (teacher: string, slot: string, checked: boolean) => {
    const newAvailability = { ...availability };
    if (!newAvailability[teacher]) newAvailability[teacher] = {};
    newAvailability[teacher][slot] = checked;
    setAvailability(newAvailability);
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
          <AccordionItem value="subject-priorities">
            <AccordionTrigger>Subject Priorities</AccordionTrigger>
            <AccordionContent className="space-y-4">
              {subjects.map(s => (
                <div key={s} className="grid grid-cols-4 items-center gap-4">
                  <Label className="col-span-1">{s}</Label>
                  <Slider
                    className="col-span-2"
                    defaultValue={[subjectPriorities[s] || 5]}
                    max={10}
                    step={1}
                    onValueChange={([value]) => setSubjectPriorities({ ...subjectPriorities, [s]: value })}
                  />
                  <span className="col-span-1 text-sm text-muted-foreground">
                    Priority: {subjectPriorities[s] || 5}
                  </span>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="teacher-availability">
            <AccordionTrigger>Teacher Availability</AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      {timeSlots.map(slot => <TableHead key={slot} className="text-center">{slot}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map(teacher => (
                      <TableRow key={teacher}>
                        <TableCell className="font-medium">{teacher}</TableCell>
                        {timeSlots.map(slot => (
                          <TableCell key={slot} className="text-center">
                            <Checkbox
                              checked={availability[teacher]?.[slot] || false}
                              onCheckedChange={(checked) => handleAvailabilityChange(teacher, slot, !!checked)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
