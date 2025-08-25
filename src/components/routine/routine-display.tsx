
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import type { GenerateScheduleOutput, ScheduleEntry, Teacher, DayOfWeek } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Printer, Pencil, User, Sun, Sandwich, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, sortClasses } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useMediaQuery from '@/hooks/use-media-query';
import { Badge } from '../ui/badge';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


interface RoutineDisplayProps {
  scheduleData: GenerateScheduleOutput | null;
  timeSlots: string[];
  classes: string[];
  subjects: string[];
  teachers: Teacher[];
  teacherSubjects: Record<string, string[]>;
  onScheduleChange: (newSchedule: ScheduleEntry[]) => void;
  dailyPeriodQuota: number;
  pdfHeader?: string;
  isEditable: boolean;
  workingDays: DayOfWeek[];
}

type GridSchedule = Record<string, Record<string, Record<string, ScheduleEntry[]>>>;

type CellData = {
    subject: string;
    className: string;
    teacher: string; // This will store the teacher's ID
}

type CurrentCell = {
    day: DayOfWeek;
    timeSlot: string;
    className: string;
    entry: ScheduleEntry | null;
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

const RoutineDisplay = ({ scheduleData, timeSlots, classes, subjects, teachers, teacherSubjects, onScheduleChange, dailyPeriodQuota, pdfHeader = "", isEditable, workingDays }: RoutineDisplayProps) => {
  const { toast } = useToast();
  const defaultDay = new Date().toLocaleString('en-US', { weekday: 'long' }) as DayOfWeek;
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const sortedClasses = useMemo(() => [...classes].sort(sortClasses), [classes]);
  const [isCellDialogOpen, setIsCellDialogOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState<CurrentCell | null>(null);
  const [cellData, setCellData] = useState<CellData>({ subject: "", className: "", teacher: "" });
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  useEffect(() => {
    if (sortedClasses.length > 0 && !selectedClass) {
      setSelectedClass(sortedClasses[0]);
    }
  }, [sortedClasses, selectedClass]);

  const teacherNameMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);
  
  const getTeacherName = (id: string) => teacherNameMap.get(id) || id;

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

  const gridSchedule = useMemo<GridSchedule>(() => {
    const grid: GridSchedule = {};
    workingDays.forEach(day => {
        grid[day] = {};
        classes.forEach(c => {
            grid[day][c] = {};
            timeSlots.forEach(slot => { grid[day][c][slot] = []; });
        });
    });

    if (scheduleData?.schedule) {
      scheduleData.schedule.forEach(entry => {
        if (!entry || !entry.day || !entry.className || !entry.timeSlot) return;
        const entryClasses = (typeof entry.className === 'string' && entry.className) ? entry.className.split(' & ').map(c => c.trim()) : [];
        entryClasses.forEach(className => {
            if (grid[entry.day]?.[className]?.[entry.timeSlot]) {
              grid[entry.day][className][entry.timeSlot].push(entry);
            }
        });
      });
    }
    return grid;
  }, [scheduleData, timeSlots, classes, workingDays]);
  
  const availableTeachers = useMemo(() => {
    if (!cellData.subject || cellData.subject === '---') return teachers;
    return teachers.filter(teacher => {
      const teacherId = teacher.id;
      return (teacherSubjects[teacherId] || []).includes(cellData.subject)
    });
  }, [cellData.subject, teachers, teacherSubjects]);

  React.useEffect(() => {
    if (cellData.subject && cellData.teacher) {
        const teacherIsAvailable = availableTeachers.some(t => t.id === cellData.teacher);
        if (!teacherIsAvailable && cellData.teacher !== 'N/A') {
            setCellData(prev => ({ ...prev, teacher: '' }));
        }
    }
  }, [cellData.subject, cellData.teacher, availableTeachers]);
  
  const handleCellClick = (day: DayOfWeek, timeSlot: string, className: string, entry: ScheduleEntry | null) => {
    if (!isEditable) return;
    setCurrentCell({ day, timeSlot, className, entry });
    setCellData(entry ? {
        subject: entry.subject || "",
        className: entry.className || className,
        teacher: entry.teacher || "",
    } : { subject: "", className: className, teacher: "" });
    setIsCellDialogOpen(true);
  };
  
  const handleSave = () => {
    if (!currentCell) return;
  
    const currentSchedule = scheduleData?.schedule || [];
    
    if (cellData.teacher && cellData.subject && cellData.subject !== 'Prayer' && cellData.subject !== 'Lunch' && cellData.subject !== '---') {
        const otherPeriodsToday = currentSchedule.filter(
            e => e && e !== currentCell.entry && e.day === currentCell.day && (e.teacher || '').includes(cellData.teacher) && e.subject !== 'Prayer' && e.subject !== 'Lunch'
        ).length;
        if (otherPeriodsToday >= dailyPeriodQuota) {
            toast({
                variant: "destructive",
                title: "Teacher Workload Exceeded",
                description: `${getTeacherName(cellData.teacher)} already has ${otherPeriodsToday} periods on ${currentCell.day}. Cannot assign more than ${dailyPeriodQuota}.`,
            });
            return;
        }
    }

    let newSchedule = [...currentSchedule];
    if (currentCell.entry) {
      newSchedule = newSchedule.filter(e => e !== currentCell.entry);
    }
    
    if (cellData.subject && cellData.subject !== '---') {
        const newEntry: ScheduleEntry = {
            day: currentCell.day,
            timeSlot: currentCell.timeSlot,
            className: cellData.className,
            subject: cellData.subject,
            teacher: cellData.teacher,
        };
        newSchedule.push(newEntry);
    }
    
    onScheduleChange(newSchedule);
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

  const renderCellContent = (day: DayOfWeek, className: string, timeSlot: string) => {
    const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
    
    return (
        <div
            className={cn(
                "h-full min-h-[60px] flex flex-col items-center justify-center p-1 space-y-1 relative",
                 isEditable && "cursor-pointer transition-colors hover:bg-primary/5"
            )}
            onClick={() => handleCellClick(day, timeSlot, className, entries[0] || null)}
        >
            {entries.length === 0 ? (
                 isEditable && <span className="text-muted-foreground text-xs hover:text-primary opacity-0 hover:opacity-100 transition-opacity">+</span>
            ) : (
                entries.map((entry, index) => {
                    if (!entry || entry.subject === '---') return null;
                    
                    const isCombined = (entry.className || '').includes('&');
                    const isSplit = (entry.subject || '').includes('/');
                    const teacherNames = (entry.teacher || '').split(' & ').map(tId => getTeacherName(tId.trim())).join(' & ');

                    return (
                        <div key={index} className="w-full text-center p-1 bg-card rounded-md border text-xs">
                            <div className="font-semibold">{entry.subject}</div>
                            <div className="text-muted-foreground text-[10px]">{teacherNames || <span className="italic">N/A</span>}</div>
                            {isCombined && <div className="text-muted-foreground text-[9px] italic mt-1">(Combined)</div>}
                            {isSplit && <div className="text-muted-foreground text-[9px] italic mt-1">(Split)</div>}
                        </div>
                    )
                })
            )}
        </div>
    );
  };
  
const renderMobileView = (day: DayOfWeek) => {
    const classesToShow = selectedClass ? sortedClasses.filter(c => c === selectedClass) : sortedClasses;

    return (
      <div className="space-y-4">
        
        {classesToShow.map(className => {
            const periodsForClass = timeSlots.map(timeSlot => {
                const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
                return { timeSlot, entry: entries[0] };
            });

            if (periodsForClass.filter(({entry}) => entry && entry.subject !== '---').length === 0) return (
                <Card key={className} className="shadow-lg overflow-hidden">
                    <CardHeader className="p-4 bg-muted/30">
                        <CardTitle className="text-base font-bold">{className}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 h-48 flex items-center justify-center">
                        <p className="text-muted-foreground">No periods scheduled for {className} on {day}.</p>
                    </CardContent>
                </Card>
            );

            return (
                <Card key={className} className="shadow-lg overflow-hidden">
                    <CardHeader className="p-4 bg-muted/30">
                        <CardTitle className="text-base font-bold">{className}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="relative pl-6">
                            <div className="absolute left-2.5 top-0 h-full w-0.5 bg-border"></div>

                            <div className="space-y-8">
                                {periodsForClass.map(({ timeSlot, entry }) => {
                                    if (!entry) return null;
                                    const isSpecial = entry.subject === 'Prayer' || entry.subject === 'Lunch';
                                    const isFree = entry.subject === '---';
                                    if (isFree) return null;

                                    const SpecialIcon = entry.subject === 'Prayer' ? Sun : Sandwich;
                                    
                                    return (
                                        <div
                                            key={timeSlot}
                                            className={cn(
                                                "relative flex gap-4 items-start",
                                                isEditable && !isSpecial && 'cursor-pointer'
                                            )}
                                            onClick={() => isEditable && !isSpecial && handleCellClick(day, timeSlot, className, entry)}
                                        >
                                            <div className="absolute left-[-24px] top-1.5 h-5 w-5 rounded-full bg-primary border-4 border-background z-10"></div>
                                            
                                            <div className="text-xs font-semibold text-muted-foreground w-20 shrink-0 pt-2">{timeSlot}</div>
                                            
                                            <div className="flex-grow">
                                                {isSpecial ? (
                                                    <div className="flex items-center gap-2 font-bold text-base text-primary pt-1">
                                                        <SpecialIcon className="h-5 w-5" />
                                                        <span>{entry.subject}</span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <h4 className="font-bold text-sm leading-tight">{entry.subject}</h4>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                                            <User className="h-3 w-3" />
                                                            {getTeacherName(entry.teacher) || <span className='italic'>N/A</span>}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )
        })}
      </div>
    );
}

const renderDesktopView = (day: DayOfWeek) => {
    return (
        <div className="overflow-x-auto border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold p-2 sticky left-0 bg-card z-10 min-w-[120px]">Time / Class</TableHead>
                        {sortedClasses.map(c => (
                            <TableHead key={c} className="text-center font-semibold text-xs p-1 align-bottom min-w-[100px]">{c}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {timeSlots.map(timeSlot => {
                        const firstEntryForDay = gridSchedule[day]?.[sortedClasses[0]]?.[timeSlot]?.[0];
                        const isSpecial = firstEntryForDay?.subject === 'Prayer' || firstEntryForDay?.subject === 'Lunch';
                        
                        if (isSpecial) {
                            return (
                                <TableRow key={timeSlot}>
                                    <TableCell className="font-medium p-2 sticky left-0 bg-card z-10">{timeSlot}</TableCell>
                                    <TableCell colSpan={sortedClasses.length} className="p-0 text-center align-middle font-semibold text-primary bg-primary/10">
                                        {firstEntryForDay.subject}
                                    </TableCell>
                                </TableRow>
                            );
                        }

                        return (
                            <TableRow key={timeSlot}>
                                <TableCell className="font-medium p-2 sticky left-0 bg-card z-10">{timeSlot}<br/><span className="font-normal text-muted-foreground text-xs">{instructionalSlotMap[timeSlot] ? `(${toRoman(instructionalSlotMap[timeSlot])})` : ''}</span></TableCell>
                                {sortedClasses.map(className => (
                                    <TableCell key={className} className="p-0 align-top border-l">
                                        {renderCellContent(day, className, timeSlot)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

  if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>School Routine</CardTitle>
          <CardDescription>No routine has been generated or selected yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Use the "Generate Routine" or "Create Blank Routine" button to start.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="print-section" id="printable-routine">
        <CardHeader className="no-print">
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <CardTitle>View Routine</CardTitle>
                    <CardDescription>View, print, or edit your routine. The view is optimized for your device.</CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print All
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
             <div className="printable-area">
                <div className="print-header hidden text-center mb-4">
                    {pdfHeader && pdfHeader.trim().split('\n').map((line, index) => <p key={index} className={cn(index === 0 && 'font-bold')}>{line}</p>)}
                    <h2 className="text-lg font-bold mt-2">Class Routine</h2>
                </div>
                <Tabs defaultValue={workingDays.includes(defaultDay) ? defaultDay : (workingDays[0] || "Monday")} className="w-full">
                    <div className="no-print space-y-4">
                         <div className="flex w-full items-center">
                            <div className="flex-1 w-0">
                                <ScrollArea className="w-full whitespace-nowrap scrollbar-hide">
                                    <TabsList>
                                        {workingDays.map(day => <TabsTrigger key={day} value={day}>{day}</TabsTrigger>)}
                                    </TabsList>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                        </div>
                        <div className="flex w-full items-center">
                            <div className="flex-1 w-0">
                               <ScrollArea className="w-full whitespace-nowrap scrollbar-hide">
                                    <div className="flex w-max space-x-2 p-1">
                                        {sortedClasses.map(className => (
                                            <Badge
                                                key={className}
                                                onClick={() => setSelectedClass(className)}
                                                variant={selectedClass === className ? 'default' : 'secondary'}
                                                className="cursor-pointer transition-all flex-shrink-0"
                                            >
                                                {className}
                                            </Badge>
                                        ))}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                    

                    {workingDays.map(day => (
                        <TabsContent key={day} value={day} className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-0 pt-4">
                             {isMobile ? renderMobileView(day) : renderDesktopView(day)}
                        </TabsContent>
                    ))}

                    <div className="hidden print-block">
                        {workingDays.map(day => (
                            <div key={`print-${day}`} className="page-break-before">
                                <h3 className="text-xl font-bold text-center my-4">{day}</h3>
                                {renderDesktopView(day)}
                            </div>
                        ))}
                    </div>
                </Tabs>
            </div>
        </CardContent>
      </Card>
      
      {isCellDialogOpen && (
        <Dialog open={isCellDialogOpen} onOpenChange={setIsCellDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Schedule Slot</DialogTitle>
              <DialogDescription>
                Day: {currentCell?.day}, Time: {currentCell?.timeSlot}, Class: {currentCell?.className}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">Subject</Label>
                <Select value={cellData.subject} onValueChange={(value) => setCellData({ ...cellData, subject: value === '---' ? '---' : value, teacher: '' })}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="---">--- (Clear Slot)</SelectItem>
                    {subjects.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="teacher" className="text-right">Teacher</Label>
                <Select value={cellData.teacher} onValueChange={(value) => setCellData({ ...cellData, teacher: value })}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="N/A">N/A</SelectItem>
                    {availableTeachers.map((teacher) => (<SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>))}
                  </SelectContent>
                </Select>
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
};

export default RoutineDisplay;





