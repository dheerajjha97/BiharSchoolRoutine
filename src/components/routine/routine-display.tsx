
"use client";

import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash2, Check, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface RoutineDisplayProps {
  scheduleData: GenerateScheduleOutput | null;
  timeSlots: string[];
  classes: string[];
  subjects: string[];
  teachers: string[];
  teacherSubjects: Record<string, string[]>;
  onScheduleChange: (newSchedule: ScheduleEntry[]) => void;
}

type GridSchedule = Record<string, Record<string, Record<string, ScheduleEntry[]>>>;

type CellData = {
    subject: string;
    classNames: string[];
    teacher: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getGradeFromClassName = (className: string): string | null => {
    const match = className.match(/\d+/);
    return match ? match[0] : null;
};

const sortClasses = (a: string, b: string): number => {
  const gradeA = parseInt(getGradeFromClassName(a) || '0', 10);
  const gradeB = parseInt(getGradeFromClassName(b) || '0', 10);
  if (gradeA !== gradeB) return gradeA - gradeB;
  return a.localeCompare(b);
};

const categorizeClasses = (classes: string[]) => {
    const secondary = classes.filter(c => ['9', '10'].includes(getGradeFromClassName(c) || ''));
    const seniorSecondary = classes.filter(c => ['11', '12'].includes(getGradeFromClassName(c) || ''));
    return { 
        secondaryClasses: secondary.sort(sortClasses), 
        seniorSecondaryClasses: seniorSecondary.sort(sortClasses) 
    };
};

const toRoman = (num: number): string => {
    if (num < 1) return "";
    const romanMap: Record<number, string> = { 10: 'X', 9: 'IX', 5: 'V', 4: 'IV', 1: 'I' };
    let result = '';
    for (const val of [10, 9, 5, 4, 1]) {
        while (num >= val) {
            result += romanMap[val];
            num -= val;
        }
    }
    return result;
};

const RoutineDisplay = forwardRef(({ scheduleData, timeSlots, classes, subjects, teachers, teacherSubjects, onScheduleChange }: RoutineDisplayProps, ref) => {
  const [printHeader, setPrintHeader] = useState("Class Routine – Session 2025–26");
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState<{ day: string; timeSlot: string; className: string; entry: ScheduleEntry | null } | null>(null);
  const [cellData, setCellData] = useState<CellData>({ subject: "", classNames: [], teacher: "" });

  const sortedClasses = useMemo(() => [...classes].sort(sortClasses), [classes]);
  const { secondaryClasses, seniorSecondaryClasses } = useMemo(() => categorizeClasses(sortedClasses), [sortedClasses]);

  const instructionalSlotMap = useMemo(() => {
    const map: { [timeSlot: string]: number } = {};
    let periodCounter = 1;
    timeSlots.forEach(slot => {
        if (!scheduleData?.schedule?.find(e => e.timeSlot === slot && (e.subject === 'Prayer' || e.subject === 'Lunch'))) {
            map[slot] = periodCounter++;
        }
    });
    return map;
  }, [timeSlots, scheduleData]);

  const clashSet = useMemo(() => {
    const clashes = new Set<string>();
    if (!scheduleData?.schedule) return clashes;

    const bookings: Record<string, { teachers: string[]; classes: string[] }> = {};

    scheduleData.schedule.forEach(entry => {
        const key = `${entry.day}-${entry.timeSlot}`;
        if (!bookings[key]) bookings[key] = { teachers: [], classes: [] };

        const entryClasses = entry.className.split(' & ').map(c => c.trim());
        const entryTeachers = entry.teacher.split(' & ').map(t => t.trim()).filter(t => t && t !== "N/A");

        entryTeachers.forEach(teacher => {
            if (bookings[key].teachers.includes(teacher)) clashes.add(`teacher-${key}-${teacher}`);
            bookings[key].teachers.push(teacher);
        });

        entryClasses.forEach(c => {
             if (bookings[key].classes.includes(c)) clashes.add(`class-${key}-${c}`);
             bookings[key].classes.push(c);
        });
    });

    scheduleData.schedule.forEach(entry => {
        const key = `${entry.day}-${entry.timeSlot}`;
        entry.teacher.split(' & ').map(t => t.trim()).filter(t => t && t !== "N/A").forEach(teacher => {
            if (clashes.has(`teacher-${key}-${teacher}`)) clashes.add(`${key}-${entry.className}-${teacher}`);
        });
        entry.className.split(' & ').map(c => c.trim()).forEach(c => {
            if (clashes.has(`class-${key}-${c}`)) clashes.add(`${key}-${c}-${entry.teacher}`);
        });
    });
    return clashes;
  }, [scheduleData]);

  const gridSchedule = useMemo<GridSchedule>(() => {
    const grid: GridSchedule = {};
    daysOfWeek.forEach(day => {
        grid[day] = {};
        classes.forEach(c => {
            grid[day][c] = {};
            timeSlots.forEach(slot => { grid[day][c][slot] = []; });
        });
    });

    if (scheduleData?.schedule) {
      scheduleData.schedule.forEach(entry => {
        entry.className.split(' & ').map(c => c.trim()).forEach(className => {
            if (grid[entry.day]?.[className]?.[entry.timeSlot]) {
              grid[entry.day][className][entry.timeSlot].push(entry);
            }
        });
      });
    }
    return grid;
  }, [scheduleData, timeSlots, classes]);
  
  const availableTeachers = useMemo(() => {
    if (!cellData.subject || cellData.subject === '---') return teachers;
    return teachers.filter(teacher => teacherSubjects[teacher]?.includes(cellData.subject));
  }, [cellData.subject, teachers, teacherSubjects]);

  const getDisabledClasses = useMemo(() => {
    if (cellData.classNames.length === 0) return new Set();
    const firstSelectedGrade = getGradeFromClassName(cellData.classNames[0]);
    if (!firstSelectedGrade) return new Set(classes);
    
    return new Set<string>(classes.filter(c => getGradeFromClassName(c) !== firstSelectedGrade));
  }, [cellData.classNames, classes]);

  useEffect(() => {
    const currentTeachers = cellData.teacher.split(' & ').map(t => t.trim()).filter(Boolean);
    if (cellData.subject && currentTeachers.some(t => !availableTeachers.includes(t) && t !== 'N/A')) {
        setCellData(prev => ({ ...prev, teacher: '' }));
    }
  }, [cellData.subject, availableTeachers, cellData.teacher]);
  
  useImperativeHandle(ref, () => ({
      handlePrint: () => {
        document.body.style.setProperty('--print-header-content', `"${printHeader}"`);
        window.print();
      }
  }));

  const handleExport = () => {
    const csvRows: string[] = [];
    const headers = ['Day', 'Class', ...timeSlots.map(slot => `"${slot} (${instructionalSlotMap[slot] ? toRoman(instructionalSlotMap[slot]) : '-'})"`)];
    csvRows.push(headers.join(','));

    const processClassesForExport = (displayClasses: string[]) => {
        const filteredClasses = selectedClass === 'all' ? displayClasses : displayClasses.filter(c => c === selectedClass);
        if (filteredClasses.length === 0) return;

        daysOfWeek.forEach(day => {
            filteredClasses.forEach((className, classIndex) => {
                const row = [(classIndex === 0 ? `"${day}"` : '""'), `"${className}"`];
                timeSlots.forEach(slot => {
                    const entries = gridSchedule[day]?.[className]?.[slot] || [];
                    const cellContent = entries.map(e => `${e.subject}${e.teacher && e.teacher !== 'N/A' ? ` (${e.teacher})` : ''}`).join(' / ');
                    row.push(`"${cellContent.replace(/"/g, '""')}"`);
                });
                csvRows.push(row.join(','));
            });
            if (filteredClasses.length > 0) csvRows.push(Array(headers.length).fill('""').join(','));
        });
    };
    
    const visibleSections = [
        {title: "Secondary", classes: secondaryClasses},
        {title: "Senior Secondary", classes: seniorSecondaryClasses}
    ].filter(section => section.classes.some(c => selectedClass === 'all' || selectedClass === c));

    visibleSections.forEach((section, sectionIndex) => {
        csvRows.push(`"${section.title}"`);
        processClassesForExport(section.classes);
        if (sectionIndex < visibleSections.length - 1) csvRows.push(Array(headers.length).fill('""').join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `school-routine.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleCellClick = (day: string, timeSlot: string, className: string, entry: ScheduleEntry | null) => {
    setCurrentCell({ day, timeSlot, className, entry });
    setCellData(entry ? {
        subject: entry.subject,
        classNames: entry.className.split(' & ').map(c => c.trim()),
        teacher: entry.teacher || "",
    } : { subject: "", classNames: [className], teacher: "" });
    setIsDialogOpen(true);
  };
  
  const handleSave = () => {
    if (!currentCell || cellData.classNames.length === 0) return;
  
    const currentSchedule = scheduleData?.schedule || [];
    let newSchedule: ScheduleEntry[];
  
    const newEntryData = {
        subject: cellData.subject,
        className: cellData.classNames.sort(sortClasses).join(' & '),
        teacher: cellData.teacher
    };

    newSchedule = currentSchedule.filter(e => e !== currentCell.entry);
    newSchedule = newSchedule.filter(e => !(e.day === currentCell.day && e.timeSlot === currentCell.timeSlot && e.className.split(' & ').some(c => cellData.classNames.includes(c))));
    
    if (cellData.subject && cellData.subject !== '---') {
        const newEntry: ScheduleEntry = {
            day: currentCell.day,
            timeSlot: currentCell.timeSlot,
            ...newEntryData,
        };
        newSchedule.push(newEntry);
    }
    
    onScheduleChange(newSchedule);
    setIsDialogOpen(false);
    setCurrentCell(null);
  };
  
  const handleDelete = () => {
     if (!currentCell || !currentCell.entry) return;
     const newSchedule = (scheduleData?.schedule || []).filter(e => e !== currentCell.entry);
     onScheduleChange(newSchedule);
     setIsDialogOpen(false);
     setCurrentCell(null);
  };
  
  const handleMultiSelectTeacher = (selectedTeacher: string) => {
    const currentTeachers = cellData.teacher.split(' & ').map(t => t.trim()).filter(Boolean);
    const newTeachers = currentTeachers.includes(selectedTeacher)
      ? currentTeachers.filter(t => t !== selectedTeacher)
      : [...currentTeachers, selectedTeacher];
    setCellData({ ...cellData, teacher: newTeachers.join(' & ') });
  };

  const renderCellContent = (day: string, className: string, timeSlot: string) => {
    const entries = gridSchedule[day]?.[className]?.[slot] || [];
    const isClashed = entries.some(entry => 
        entry.teacher.split(' & ').some(t => clashSet.has(`teacher-${day}-${timeSlot}-${t}`)) ||
        clashSet.has(`class-${day}-${timeSlot}-${className}`)
    );

    return (
        <div
            className={cn("h-full min-h-[60px] flex flex-col items-center justify-center p-1 space-y-1 cursor-pointer transition-colors hover:bg-primary/5 relative", isClashed && "bg-destructive/20 hover:bg-destructive/30")}
            onClick={() => handleCellClick(day, timeSlot, className, entries[0] || null)}
        >
            {isClashed && <AlertTriangle className="h-4 w-4 text-destructive absolute top-1 right-1 no-print" />}
            {entries.length === 0 ? (
                <span className="text-muted-foreground text-xs hover:text-primary opacity-0 hover:opacity-100 no-print transition-opacity">+</span>
            ) : (
                entries.map((entry, index) => {
                    if (entry.subject === '---') return null;
                    return (
                        <div key={index} className="w-full text-center p-1 bg-card rounded-md border text-xs">
                            <div className="font-semibold">{entry.subject}</div>
                            <div className="text-muted-foreground text-[10px]">{entry.teacher || <span className="italic">N/A</span>}</div>
                            {entry.className.includes('&') && <div className="text-muted-foreground text-[10px] italic mt-1">(Combined)</div>}
                        </div>
                    )
                })
            )}
        </div>
    );
  };

  const renderScheduleTable = (title: string, displayClasses: string[]) => {
    const filteredClasses = selectedClass === 'all' ? displayClasses : displayClasses.filter(c => c === selectedClass);
    if (filteredClasses.length === 0) return null;
  
    return (
      <div className="printable-section">
        <h3 className="text-xl font-semibold mb-3 print:text-center">{title}</h3>
        <div className="overflow-x-auto border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold min-w-[100px] sticky left-0 bg-card z-10">Day</TableHead>
                <TableHead className="font-bold min-w-[120px] sticky left-[100px] bg-card z-10">Class</TableHead>
                {timeSlots.map(slot => (
                  <TableHead key={slot} className="text-center font-bold text-xs min-w-[110px] p-1">
                      <div>{slot}</div>
                      <div className="font-normal text-muted-foreground">{instructionalSlotMap[slot] ? toRoman(instructionalSlotMap[slot]) : '-'}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {daysOfWeek.map((day) => (
                <React.Fragment key={day}>
                  {filteredClasses.map((className, classIndex) => (
                    <TableRow key={`${day}-${className}`}>
                      {classIndex === 0 && <TableCell className="font-semibold align-top sticky left-0 bg-card z-10" rowSpan={filteredClasses.length}>{day}</TableCell>}
                      <TableCell className="font-medium align-top sticky left-[100px] bg-card z-10">{className}</TableCell>
                      {timeSlots.map(slot => (
                        <TableCell key={`${day}-${className}-${slot}`} className="p-0 align-top">{renderCellContent(day, className, slot)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {day !== 'Saturday' && <TableRow className="bg-background hover:bg-background"><TableCell colSpan={timeSlots.length + 2} className="p-1"></TableCell></TableRow>}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };
  
  if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>School Routine</CardTitle>
          <CardDescription>No routine has been generated yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Click the "Generate Routine" button to start.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedTeachers = cellData.teacher.split(' & ').map(t => t.trim()).filter(Boolean);
  const ClassCheckbox = ({ className }: { className: string }) => (
    <div className="flex items-center space-x-2">
        <Checkbox id={`class-${className}`} checked={cellData.classNames.includes(className)} disabled={getDisabledClasses.has(className)} onCheckedChange={(checked) => setCellData({...cellData, classNames: checked ? [...cellData.classNames, className] : cellData.classNames.filter(name => name !== className)})}/>
        <Label htmlFor={`class-${className}`} className={cn("font-normal", getDisabledClasses.has(className) && 'text-muted-foreground')}>{className}</Label>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="no-print">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <CardTitle>View Routine</CardTitle>
                <div className="flex gap-2">
                    <Button onClick={handleExport} size="sm" variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                </div>
            </div>
            <CardDescription>View, print, export, or edit your routine by clicking on a cell.</CardDescription>
            <div className="pt-4">
                <Label htmlFor="print-header">Print Header</Label>
                <Input id="print-header" value={printHeader} onChange={(e) => setPrintHeader(e.target.value)} />
            </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {renderScheduleTable("Secondary", secondaryClasses)}
            {renderScheduleTable("Senior Secondary", seniorSecondaryClasses)}
          </div>
        </CardContent>
      </Card>
      
      {currentCell && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Schedule Slot</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="md:text-right">Subject</Label>
                <Select value={cellData.subject} onValueChange={(value) => setCellData({ ...cellData, subject: value === '---' ? '---' : value, teacher: '' })}>
                  <SelectTrigger className="md:col-span-3"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="---">--- (Clear Slot)</SelectItem>
                    {subjects.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                <Label className="md:text-right pt-2">Class(es)</Label>
                 <div className="md:col-span-3 space-y-4">
                    {secondaryClasses.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Secondary</Label>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 gap-2">{secondaryClasses.map(c => <ClassCheckbox key={c} className={c} />)}</div>
                      </div>
                    )}
                    {seniorSecondaryClasses.length > 0 && (
                       <div>
                        <Label className="text-sm font-medium">Senior Secondary</Label>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 gap-2">{seniorSecondaryClasses.map(c => <ClassCheckbox key={c} className={c} />)}</div>
                      </div>
                    )}
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label className="md:text-right">Teacher(s)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="outline" className="md:col-span-3 justify-start font-normal truncate">{selectedTeachers.length > 0 ? selectedTeachers.join(', ') : "Select teachers"}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                      <Command>
                          <CommandInput placeholder="Search teachers..." />
                          <CommandList>
                              <CommandEmpty>No qualified teachers found.</CommandEmpty>
                              <CommandGroup>
                                  {availableTeachers.map((teacher) => (
                                      <CommandItem key={teacher} onSelect={() => handleMultiSelectTeacher(teacher)} value={teacher}>
                                          <Check className={cn("mr-2 h-4 w-4", selectedTeachers.includes(teacher) ? "opacity-100" : "opacity-0")}/>
                                          <span>{teacher}</span>
                                      </CommandItem>
                                  ))}
                              </CommandGroup>
                          </CommandList>
                      </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row gap-2">
               {currentCell.entry ? (<Button type="button" variant="destructive" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>) : <div />}
              <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" onClick={handleSave}>Save Changes</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
});

RoutineDisplay.displayName = 'RoutineDisplay';
export default RoutineDisplay;
