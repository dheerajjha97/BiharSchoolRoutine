"use client";

import React, { useState, useMemo, forwardRef } from 'react';
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash2, Check, AlertTriangle, Copy, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '../ui/checkbox';
import { cn, sortClasses } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import TeacherLoad from './teacher-load';

interface RoutineDisplayProps {
  scheduleData: GenerateScheduleOutput | null;
  timeSlots: string[];
  classes: string[];
  subjects: string[];
  teachers: string[];
  teacherSubjects: Record<string, string[]>;
  onScheduleChange: (newSchedule: ScheduleEntry[]) => void;
  dailyPeriodQuota: number;
  teacherLoad: Record<string, Record<string, number>>;
  onPrintTeacher: (teacher: string | null) => void;
}

type GridSchedule = Record<string, Record<string, Record<string, ScheduleEntry[]>>>;

type CellData = {
    subject: string;
    classNames: string[];
    teacher: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getGradeFromClassName = (className: string): string | null => {
    if (typeof className !== 'string') return null;
    const match = className.match(/\d+/);
    return match ? match[0] : null;
};

const categorizeClasses = (classes: string[]) => {
    const sorted = [...classes].sort(sortClasses);
    const secondary = sorted.filter(c => ['9', '10'].includes(getGradeFromClassName(c) || ''));
    const seniorSecondary = sorted.filter(c => ['11', '12'].includes(getGradeFromClassName(c) || ''));
    return { 
        secondaryClasses: secondary, 
        seniorSecondaryClasses: seniorSecondary 
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

const RoutineDisplay = forwardRef(({ scheduleData, timeSlots, classes, subjects, teachers, teacherSubjects, onScheduleChange, dailyPeriodQuota, teacherLoad, onPrintTeacher }: RoutineDisplayProps, ref) => {
  const [printHeader, setPrintHeader] = useState("Class Routine – Session 2025–26");
  const { toast } = useToast();
  
  const [isCellDialogOpen, setIsCellDialogOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState<{ day: string; timeSlot: string; className: string; entry: ScheduleEntry | null } | null>(null);
  const [cellData, setCellData] = useState<CellData>({ subject: "", classNames: [], teacher: "" });
  
  const { secondaryClasses, seniorSecondaryClasses } = useMemo(() => categorizeClasses(classes), [classes]);

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

  React.useEffect(() => {
    const currentTeachers = cellData.teacher.split(' & ').map(t => t.trim()).filter(Boolean);
    if (cellData.subject && currentTeachers.some(t => !availableTeachers.includes(t) && t !== 'N/A')) {
        setCellData(prev => ({ ...prev, teacher: '' }));
    }
  }, [cellData.subject, availableTeachers, cellData.teacher]);
  
  const handleExport = () => {
    const csvRows: string[] = [];
    const headers = ['Day', 'Class', ...timeSlots.map(slot => `"${slot} (${instructionalSlotMap[slot] ? toRoman(instructionalSlotMap[slot]) : '-'})"`)];
    csvRows.push(headers.join(','));

    const processClassesForExport = (displayClasses: string[]) => {
        daysOfWeek.forEach(day => {
            displayClasses.forEach((className, classIndex) => {
                const row = [(classIndex === 0 ? `"${day}"` : '""'), `"${className}"`];
                timeSlots.forEach(slot => {
                    const entries = gridSchedule[day]?.[className]?.[slot] || [];
                    const cellContent = entries.map(e => `${e.subject}${e.teacher && e.teacher !== 'N/A' ? ` (${e.teacher})` : ''}`).join(' / ');
                    row.push(`"${cellContent.replace(/"/g, '""')}"`);
                });
                csvRows.push(row.join(','));
            });
            if (displayClasses.length > 0) csvRows.push(Array(headers.length).fill('""').join(','));
        });
    };
    
    const visibleSections = [
        {title: "Secondary", classes: secondaryClasses},
        {title: "Senior Secondary", classes: seniorSecondaryClasses}
    ];

    visibleSections.forEach((section, sectionIndex) => {
        if(section.classes.length === 0) return;
        csvRows.push(`"${section.title}"`);
        processClassesForExport(section.classes);
        if (sectionIndex < visibleSections.length - 1 && visibleSections[sectionIndex + 1].classes.length > 0) csvRows.push(Array(headers.length).fill('""').join(','));
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
    setIsCellDialogOpen(true);
  };
  
  const handleSave = () => {
    if (!currentCell || cellData.classNames.length === 0) return;
  
    const currentSchedule = scheduleData?.schedule || [];
    let newSchedule: ScheduleEntry[];
  
    const newEntryData = {
        subject: cellData.subject,
        className: [...cellData.classNames].sort(sortClasses).join(' & '),
        teacher: cellData.teacher
    };

    // Calculate the future schedule if this change is saved
    let prospectiveSchedule = currentSchedule.filter(e => e !== currentCell.entry);
    prospectiveSchedule = prospectiveSchedule.filter(e => !(e.day === currentCell.day && e.timeSlot === currentCell.timeSlot && e.className.split(' & ').some(c => cellData.classNames.includes(c))));
    if (cellData.subject && cellData.subject !== '---') {
        const newEntry: ScheduleEntry = {
            day: currentCell.day,
            timeSlot: currentCell.timeSlot,
            ...newEntryData,
        };
        prospectiveSchedule.push(newEntry);
    }

    // Check teacher load against quota
    const teachersInSlot = cellData.teacher.split(' & ').map(t => t.trim()).filter(t => t && t !== "N/A");
    for (const teacher of teachersInSlot) {
        const periodsToday = prospectiveSchedule.filter(
            e => e.day === currentCell.day && e.teacher.includes(teacher) && e.subject !== 'Prayer' && e.subject !== 'Lunch'
        ).length;

        if (periodsToday > dailyPeriodQuota) {
            toast({
                variant: "destructive",
                title: "Teacher Workload Exceeded",
                description: `${teacher} already has ${periodsToday-1} periods on ${currentCell.day}. Cannot assign more than ${dailyPeriodQuota}.`,
            });
            return; // Abort save
        }
    }
    
    onScheduleChange(prospectiveSchedule);
    setIsCellDialogOpen(false);
    setCurrentCell(null);
  };
  
  const handleDelete = () => {
     if (!currentCell || !currentCell.entry) return;
     const newSchedule = (scheduleData?.schedule || []).filter(e => e !== currentCell.entry);
     onScheduleChange(newSchedule);
     setIsCellDialogOpen(false);
     setCurrentCell(null);
  };
  
  const handleMultiSelectTeacher = (selectedTeacher: string) => {
    const currentTeachers = cellData.teacher.split(' & ').map(t => t.trim()).filter(Boolean);
    const newTeachers = currentTeachers.includes(selectedTeacher)
      ? currentTeachers.filter(t => t !== selectedTeacher)
      : [...currentTeachers, selectedTeacher];
    setCellData({ ...cellData, teacher: newTeachers.join(' & ') });
  };
  
  const handleCopyDay = (sourceDay: string, destinationDay: string) => {
    if (!scheduleData?.schedule) return;

    // Filter out the destination day's entries (except breaks)
    const scheduleWithoutDestination = scheduleData.schedule.filter(entry => 
      entry.day !== destinationDay || entry.subject === 'Prayer' || entry.subject === 'Lunch'
    );
    
    // Get all source day entries (except breaks)
    const sourceEntries = scheduleData.schedule.filter(entry => 
      entry.day === sourceDay && entry.subject !== 'Prayer' && entry.subject !== 'Lunch'
    );

    // Create new entries for the destination day
    const newDestinationEntries = sourceEntries.map(entry => ({
      ...entry,
      day: destinationDay
    }));

    onScheduleChange([...scheduleWithoutDestination, ...newDestinationEntries]);
  };

  const renderCellContent = (day: string, className: string, timeSlot: string) => {
    const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
    const isClashed = entries.some(entry => 
        entry.teacher.split(' & ').some(t => clashSet.has(`teacher-${day}-${timeSlot}-${t}`)) ||
        clashSet.has(`class-${day}-${timeSlot}-${className}`)
    );

    return (
        <div
            className={cn("h-full min-h-[60px] flex flex-col items-center justify-center p-1 space-y-1 cursor-pointer transition-colors hover:bg-primary/5 relative")}
            onClick={() => handleCellClick(day, timeSlot, className, entries[0] || null)}
        >
            {isClashed && <AlertTriangle className="h-4 w-4 text-destructive absolute top-1 right-1" />}
            {entries.length === 0 ? (
                <span className="text-muted-foreground text-xs hover:text-primary opacity-0 hover:opacity-100 transition-opacity">+</span>
            ) : (
                entries.map((entry, index) => {
                    if (entry.subject === '---') return null;
                    const isClashedEntry = isClashed && (
                        entry.teacher.split(' & ').some(t => clashSet.has(`teacher-${day}-${timeSlot}-${t}`)) ||
                        clashSet.has(`class-${day}-${timeSlot}-${className}`)
                    );
                    return (
                        <div key={index} className={cn("w-full text-center p-1 bg-card rounded-md border text-xs", isClashedEntry && "bg-destructive/20")}>
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
    if (displayClasses.length === 0) return null;
  
    return (
      <div className="break-after-page">
        <h3 className="text-xl font-semibold mb-3 px-6 md:px-0">{title}</h3>
        <div className="border rounded-lg bg-card overflow-x-auto">
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
                  {displayClasses.map((className, classIndex) => (
                    <TableRow key={`${day}-${className}`}>
                      {classIndex === 0 && (
                        <TableCell className="font-semibold align-top sticky left-0 bg-card z-10" rowSpan={displayClasses.length}>
                          <div className="flex items-center gap-2">
                             <span>{day}</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>Paste to...</DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                          {daysOfWeek.filter(d => d !== day).map(destinationDay => (
                                            <DropdownMenuItem key={destinationDay} onClick={() => handleCopyDay(day, destinationDay)}>
                                              {destinationDay}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-medium align-top sticky left-[100px] bg-card z-10">{className}</TableCell>
                      {timeSlots.map(timeSlot => (
                        <TableCell key={`${day}-${className}-${timeSlot}`} className="p-0 align-top">{renderCellContent(day, className, timeSlot)}</TableCell>
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
            <p>Click the "Generate Routine" or "Create Blank Routine" button to start.</p>
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
        <CardHeader>
            <div className="flex flex-wrap justify-between items-center gap-4">
                <CardTitle>View Routine</CardTitle>
                <div className="flex gap-2">
                    <Button onClick={() => onPrintTeacher(null)} size="sm" variant="outline"><Printer className="mr-2 h-4 w-4" /> Print All</Button>
                    <Button onClick={handleExport} size="sm" variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                </div>
            </div>
            <CardDescription>View, print, export, or edit your routine. Use the copy icon next to a day's name to paste its schedule to another day.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 md:p-6 space-y-6">
                {renderScheduleTable("Secondary", secondaryClasses)}
                {renderScheduleTable("Senior Secondary", seniorSecondaryClasses)}
                <TeacherLoad teacherLoad={teacherLoad} onPrintTeacher={onPrintTeacher} />
            </div>
        </CardContent>
      </Card>
      
      {isCellDialogOpen && (
        <Dialog open={isCellDialogOpen} onOpenChange={setIsCellDialogOpen}>
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
               {currentCell?.entry ? (<Button type="button" variant="destructive" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>) : <div />}
              <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={() => setIsCellDialogOpen(false)}>Cancel</Button>
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
