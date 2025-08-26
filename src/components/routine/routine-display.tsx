
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import type { GenerateScheduleOutput, ScheduleEntry, Teacher, DayOfWeek } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Printer, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, sortClasses, sortTimeSlots } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import useMediaQuery from '@/hooks/use-media-query';

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
    teacher: string;
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

const RoutineDisplay = ({ scheduleData, timeSlots: rawTimeSlots, classes, subjects, teachers, teacherSubjects, onScheduleChange, dailyPeriodQuota, pdfHeader = "", isEditable, workingDays }: RoutineDisplayProps) => {
  const { toast } = useToast();
  const defaultDay = new Date().toLocaleString('en-US', { weekday: 'long' }) as DayOfWeek;
  const isMobile = useMediaQuery("(max-width: 768px)");

  const timeSlots = useMemo(() => sortTimeSlots(rawTimeSlots), [rawTimeSlots]);
  const sortedClasses = useMemo(() => [...classes].sort(sortClasses), [classes]);
  const [isCellDialogOpen, setIsCellDialogOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState<CurrentCell | null>(null);
  const [cellData, setCellData] = useState<CellData>({ subject: "", className: "", teacher: "" });
  
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

  useEffect(() => {
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
                "h-full min-h-[70px] flex flex-col items-center justify-center p-1 space-y-1 relative",
                 isEditable && "cursor-pointer transition-colors hover:bg-primary/5 rounded-md"
            )}
            onClick={() => handleCellClick(day, timeSlot, className, entries[0] || null)}
        >
            {entries.length === 0 ? (
                 isEditable && <span className="text-muted-foreground text-xs hover:text-primary opacity-0 hover:opacity-100 transition-opacity">+ Add</span>
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

  const renderDesktopView = () => {
    return (
        <Tabs defaultValue={workingDays.includes(defaultDay) ? defaultDay : (workingDays[0] || "Monday")} className="w-full no-print">
            <TabsList className="mb-4">
                {workingDays.map(day => <TabsTrigger key={day} value={day}>{day}</TabsTrigger>)}
            </TabsList>
            
            {workingDays.map(day => (
                <TabsContent key={day} value={day} className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                     <ScrollArea className="w-full whitespace-nowrap">
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead className="font-semibold p-2 sticky left-0 bg-muted/50 z-20 min-w-[120px] shadow-sm">Time / Class</TableHead>
                                        {sortedClasses.map(c => (
                                            <TableHead key={c} className="text-center font-semibold text-xs p-1 align-bottom min-w-[120px]">{c}</TableHead>
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
                                                <TableCell className="font-medium p-2 sticky left-0 bg-card z-10">
                                                  {timeSlot}
                                                  <br/>
                                                  <span className="font-normal text-muted-foreground text-xs">{instructionalSlotMap[timeSlot] ? `(${toRoman(instructionalSlotMap[timeSlot])})` : ''}</span>
                                                </TableCell>
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
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </TabsContent>
            ))}
        </Tabs>
    );
};

  const renderMobileView = () => {
    return (
      <Accordion type="single" defaultValue={workingDays.includes(defaultDay) ? defaultDay : (workingDays[0] || "Monday")} collapsible className="w-full no-print">
        {workingDays.map(day => (
          <AccordionItem value={day} key={day}>
            <AccordionTrigger className="bg-muted/50 px-4 py-3 rounded-md">
              <span className="font-semibold">{day}</span>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="border rounded-lg">
                      <Table>
                          <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                  <TableHead className="font-semibold p-2 sticky left-0 bg-muted/50 z-20 min-w-[120px] shadow-sm">Time</TableHead>
                                  {sortedClasses.map(c => (
                                      <TableHead key={c} className="text-center font-semibold text-xs p-1 align-bottom min-w-[120px]">{c}</TableHead>
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
                                          <TableCell className="font-medium p-2 sticky left-0 bg-card z-10">
                                            {timeSlot}
                                            <br/>
                                            <span className="font-normal text-muted-foreground text-xs">{instructionalSlotMap[timeSlot] ? `(${toRoman(instructionalSlotMap[timeSlot])})` : ''}</span>
                                          </TableCell>
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
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
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
                    <CardDescription>View, print, or edit your routine. Scroll horizontally to see all classes.</CardDescription>
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
                <div className="hidden print-block">
                     <div className="print-header text-center mb-4">
                        {pdfHeader && pdfHeader.trim().split('\n').map((line, index) => <p key={index} className={cn(index === 0 && 'font-bold')}>{line}</p>)}
                        <h2 className="text-lg font-bold mt-2">Class Routine</h2>
                    </div>
                    <Table className="border">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border font-semibold">Day</TableHead>
                                <TableHead className="border font-semibold">Class</TableHead>
                                {timeSlots.map(slot => {
                                    const periodNumber = instructionalSlotMap[slot] ? `(${toRoman(instructionalSlotMap[slot])})` : '';
                                    return (
                                        <TableHead key={slot} className="border text-center text-xs p-1">
                                            {slot} <br/> {periodNumber}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workingDays.map((day) => (
                                sortedClasses.map((className, classIndex) => {
                                    const isPrayerOrLunchRow = timeSlots.some(slot => gridSchedule[day]?.[className]?.[slot]?.[0]?.subject === 'Prayer' || gridSchedule[day]?.[className]?.[slot]?.[0]?.subject === 'Lunch');
                                    if (isPrayerOrLunchRow && classIndex > 0) return null;

                                    return (
                                        <TableRow key={`${day}-${className}`}>
                                            {classIndex === 0 && <TableCell rowSpan={sortedClasses.length} className="border font-semibold align-middle text-center">{day}</TableCell>}
                                            <TableCell className="border font-semibold">{className}</TableCell>
                                            {timeSlots.map(timeSlot => {
                                                const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
                                                const entry = entries[0];

                                                if (entry && (entry.subject === 'Prayer' || entry.subject === 'Lunch')) {
                                                    if (classIndex === 0) {
                                                         return <TableCell key={timeSlot} colSpan={sortedClasses.length} className="border text-center align-middle font-semibold p-1 bg-muted/50">{entry.subject}</TableCell>;
                                                    }
                                                    return null;
                                                }

                                                const teacherNames = entry ? (entry.teacher || '').split(' & ').map(tId => getTeacherName(tId.trim())).join(' & ') : '';
                                                return (
                                                    <TableCell key={timeSlot} className="border text-center p-1 text-xs">
                                                        {entry && entry.subject !== '---' ? (
                                                            <>
                                                                <div className="font-bold">{entry.subject}</div>
                                                                <div className="text-muted-foreground">{teacherNames || 'N/A'}</div>
                                                            </>
                                                        ) : null}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    )
                                })
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {isMobile ? renderMobileView() : renderDesktopView()}
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
