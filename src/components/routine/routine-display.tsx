
"use client";

import React, { useMemo, useState } from 'react';
import type { GenerateScheduleOutput, ScheduleEntry, Teacher, DayOfWeek } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Printer, Pencil, Clock, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, sortClasses } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  
  const [isCellDialogOpen, setIsCellDialogOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState<CurrentCell | null>(null);
  const [cellData, setCellData] = useState<CellData>({ subject: "", className: "", teacher: "" });
  
  const sortedClasses = useMemo(() => [...classes].sort(sortClasses), [classes]);
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

  const renderMobileView = (day: DayOfWeek) => (
    <div className="space-y-4">
        {sortedClasses.map(className => {
            const periodsForClass = timeSlots.map(timeSlot => {
                const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
                const firstEntry = entries[0];
                const isSpecial = firstEntry?.subject === 'Prayer' || firstEntry?.subject === 'Lunch';
                return { timeSlot, entry: firstEntry, isSpecial }; 
            }).filter(({entry}) => entry && entry.subject !== '---');

            if (periodsForClass.length === 0) return null;

            return (
                <Card key={className} className="shadow-md">
                    <CardHeader className="p-4 bg-muted/30">
                        <CardTitle className="text-lg">{className}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4">
                        <div className="space-y-2">
                            {periodsForClass.map(({ timeSlot, entry, isSpecial }) => {
                                if (!entry) return null;
                                return (
                                    <div 
                                        key={timeSlot} 
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border",
                                            isSpecial ? 'bg-secondary font-semibold justify-center' : 'bg-background',
                                            isEditable && !isSpecial && 'cursor-pointer hover:bg-accent'
                                        )}
                                        onClick={() => isEditable && !isSpecial && handleCellClick(day, timeSlot, className, entry)}
                                    >
                                      {isSpecial ? (
                                        <span>{entry.subject}</span>
                                      ) : (
                                        <>
                                          <div className="flex-1 pr-2">
                                              <p className="font-bold">{entry.subject}</p>
                                              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                  <User className="h-3.5 w-3.5" />
                                                  {getTeacherName(entry.teacher) || <span className='italic'>N/A</span>}
                                              </p>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                                                  <Clock className="h-3.5 w-3.5" />
                                                  {timeSlot}
                                              </p>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )
        })}
    </div>
  );

  const renderDesktopView = (day: DayOfWeek) => (
      <div className="overflow-x-auto border rounded-lg">
          <Table>
              <TableHeader>
                  <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold p-2 sticky left-0 bg-card z-10 min-w-[120px]">Class</TableHead>
                      {timeSlots.map(slot => (
                          <TableHead key={slot} className="text-center font-semibold text-xs p-1 align-bottom min-w-[100px]">
                              <div>{slot}</div>
                              <div className="font-normal text-muted-foreground">{instructionalSlotMap[slot] ? toRoman(instructionalSlotMap[slot]) : '-'}</div>
                          </TableHead>
                      ))}
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {sortedClasses.map((className) => {
                      const specialEntry = timeSlots.map(ts => gridSchedule[day]?.[className]?.[ts]?.[0]).find(e => e?.subject === 'Prayer' || e?.subject === 'Lunch');
                      if (specialEntry) {
                         // This logic is flawed for desktop, special entries should be handled per slot.
                         // Let's render row by row.
                      }

                      return (
                        <TableRow key={`${day}-${className}`} className="border-t">
                            <TableCell className="font-medium p-2 sticky left-0 bg-card z-10">{className}</TableCell>
                            {timeSlots.map(timeSlot => {
                                const entry = gridSchedule[day]?.[className]?.[timeSlot]?.[0];
                                const isSpecial = entry?.subject === 'Prayer' || entry?.subject === 'Lunch';
                                if (isSpecial) {
                                    // In desktop, special periods might span all classes, this logic is tricky.
                                    // Assuming the generator makes them consistent.
                                    return (
                                        <TableCell key={`${day}-${className}-${timeSlot}`} className="p-0 align-top border-l bg-secondary" colSpan={1}>
                                           {className === sortedClasses[0] && (
                                                <div className="h-full min-h-[60px] flex items-center justify-center p-1 font-semibold"
                                                     style={{width: `${timeSlots.length * 100}px`}} // HACK: This is problematic
                                                >
                                                   {entry.subject}
                                                </div>
                                           )}
                                        </TableCell>
                                    )
                                }
                                return (
                                <TableCell key={`${day}-${className}-${timeSlot}`} className="p-0 align-top border-l">{renderCellContent(day, className, timeSlot)}</TableCell>
                                )
                            })}
                        </TableRow>
                      )
                  })}
              </TableBody>
          </Table>
      </div>
  );

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
                <Tabs defaultValue={workingDays.includes(defaultDay) ? defaultDay : workingDays[0]} className="w-full">
                    <div className="overflow-x-auto p-4 sm:p-0 no-print">
                        <TabsList className="mb-4">
                            {workingDays.map(day => <TabsTrigger key={day} value={day}>{day}</TabsTrigger>)}
                        </TabsList>
                    </div>

                    {workingDays.map(day => (
                        <TabsContent key={day} value={day} className="p-2 sm:p-0">
                             {isMobile ? renderMobileView(day) : renderDesktopView(day)}
                        </TabsContent>
                    ))}

                    {/* Print-only view */}
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
