
"use client";

import React, { useMemo } from 'react';
import type { GenerateScheduleOutput, ScheduleEntry, Teacher, DayOfWeek } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, AlertTriangle, Copy, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, sortClasses } from '@/lib/utils';
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
} from "@/components/ui/dropdown-menu";

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

const RoutineDisplay = ({ scheduleData, timeSlots, classes, subjects, teachers, teacherSubjects, onScheduleChange, dailyPeriodQuota, pdfHeader = "", isEditable, workingDays }: RoutineDisplayProps) => {
  const { toast } = useToast();
  
  const [isCellDialogOpen, setIsCellDialogOpen] = React.useState(false);
  const [currentCell, setCurrentCell] = React.useState<CurrentCell | null>(null);
  const [cellData, setCellData] = React.useState<CellData>({ subject: "", className: "", teacher: "" });
  
  const { secondaryClasses, seniorSecondaryClasses } = useMemo(() => categorizeClasses(classes), [classes]);
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

  const clashSet = useMemo(() => {
    const clashes = new Set<string>();
    if (!scheduleData?.schedule) {
        return clashes;
    }

    const bookings: Record<string, { teachers: string[]; classes: string[] }> = {};

    scheduleData.schedule.forEach(entry => {
        if (!entry || !entry.day || !entry.timeSlot) return; 
        const key = `${entry.day}-${entry.timeSlot}`;
        if (!bookings[key]) {
            bookings[key] = { teachers: [], classes: [] };
        }

        const entryTeachers = (typeof entry.teacher === 'string' && entry.teacher) ? entry.teacher.split(' & ').map(t => t.trim()).filter(Boolean) : [];
        const entryClasses = (typeof entry.className === 'string' && entry.className) ? entry.className.split(' & ').map(c => c.trim()) : [];

        entryTeachers.forEach(teacher => {
            if (teacher !== "N/A" && bookings[key].teachers.includes(teacher)) clashes.add(`teacher-${key}-${teacher}`);
            bookings[key].teachers.push(teacher);
        });

        entryClasses.forEach(c => {
            if (bookings[key].classes.includes(c)) {
                clashes.add(`class-${key}-${c}`);
            }
            bookings[key].classes.push(c);
        });
    });

    scheduleData.schedule.forEach(entry => {
        if (!entry || !entry.day || !entry.timeSlot || !entry.className) return;
        const key = `${entry.day}-${entry.timeSlot}`;
        const entryTeachers = (typeof entry.teacher === 'string' && entry.teacher) ? entry.teacher.split(' & ').map(t => t.trim()).filter(Boolean) : [];
        const entryClasses = (typeof entry.className === 'string' && entry.className) ? entry.className.split(' & ').map(c => c.trim()) : [];
        
        entryTeachers.forEach(teacher => {
            if (teacher !== "N/A" && clashes.has(`teacher-${key}-${teacher}`)) {
                clashes.add(`${key}-${entry.className}-${teacher}`);
            }
        });
        entryClasses.forEach(c => {
            if (clashes.has(`class-${key}-${c}`)) {
                clashes.add(`${key}-${c}-${entry.teacher}`);
            }
        });
    });

    return clashes;
  }, [scheduleData]);

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
  
  const handleCopyDay = (sourceDay: DayOfWeek, destinationDay: DayOfWeek) => {
    if (!scheduleData?.schedule) return;

    const scheduleWithoutDestination = scheduleData.schedule.filter(entry => 
      entry.day !== destinationDay || entry.subject === 'Prayer' || entry.subject === 'Lunch'
    );
    
    const sourceEntries = scheduleData.schedule.filter(entry => 
      entry.day === sourceDay && entry.subject !== 'Prayer' && entry.subject !== 'Lunch'
    );

    const newDestinationEntries = sourceEntries.map(entry => ({
      ...entry,
      day: destinationDay as DayOfWeek
    }));

    onScheduleChange([...scheduleWithoutDestination, ...newDestinationEntries]);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderCellContent = (day: DayOfWeek, className: string, timeSlot: string) => {
    const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
    const isClashed = entries.some(entry => 
        (entry.teacher || '').split(' & ').some(t => clashSet.has(`teacher-${day}-${entry.timeSlot}-${t}`)) ||
        clashSet.has(`class-${day}-${entry.timeSlot}-${className}`)
    );

    return (
        <div
            className={cn(
                "h-full min-h-[60px] flex flex-col items-center justify-center p-1 space-y-1 relative",
                 isEditable && "cursor-pointer transition-colors hover:bg-primary/5"
            )}
            onClick={() => handleCellClick(day, timeSlot, className, entries[0] || null)}
        >
            {isClashed && <AlertTriangle className="h-4 w-4 text-destructive absolute top-1 right-1" />}
            {entries.length === 0 ? (
                 isEditable && <span className="text-muted-foreground text-xs hover:text-primary opacity-0 hover:opacity-100 transition-opacity">+</span>
            ) : (
                entries.map((entry, index) => {
                    if (!entry || entry.subject === '---') return null;
                    
                    const isClashedEntry = isClashed && (
                        (entry.teacher || '').split(' & ').some(t => clashSet.has(`teacher-${day}-${entry.timeSlot}-${t}`)) ||
                        clashSet.has(`class-${day}-${entry.timeSlot}-${className}`)
                    );
                    const isCombined = (entry.className || '').includes('&');
                    const isSplit = (entry.subject || '').includes('/');
                    
                    const teacherNames = (entry.teacher || '').split(' & ').map(tId => getTeacherName(tId.trim())).join(' & ');

                    return (
                        <div key={index} className={cn("w-full text-center p-1 bg-card rounded-md border text-xs", isClashedEntry && "bg-destructive/20")}>
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

  const renderScheduleTable = (title: string, displayClasses: string[], tableId: string) => {
    if (displayClasses.length === 0) return null;
  
    return (
      <div id={tableId} className="printable-area">
        <div className="flex justify-between items-center mb-3 px-6 md:px-0 no-print">
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
         <div className="print-header hidden text-center mb-4">
            {pdfHeader && pdfHeader.trim().split('\n').map((line, index) => <p key={index} className={cn(index === 0 && 'font-bold')}>{line}</p>)}
            <h2 className="text-lg font-bold mt-2">{title} Routine</h2>
        </div>
        <div className="border rounded-lg bg-card overflow-x-auto">
          <table className="min-w-full w-full border-collapse">
            <thead className="bg-card">
              <tr>
                <th className="font-bold min-w-[100px] sticky left-0 bg-card z-20 p-2 text-left">Day</th>
                <th className="font-bold min-w-[120px] sticky left-[100px] bg-card z-20 p-2 text-left">Class</th>
                {timeSlots.map(slot => (
                  <th key={slot} className="text-center font-bold text-xs min-w-[90px] p-1 align-bottom">
                      <div>{slot}</div>
                      <div className="font-normal text-muted-foreground">{instructionalSlotMap[slot] ? toRoman(instructionalSlotMap[slot]) : '-'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workingDays.map((day) => (
                <React.Fragment key={day}>
                  {displayClasses.map((className, classIndex) => (
                    <tr key={`${day}-${className}`} className="border-t">
                      {classIndex === 0 && (
                        <td className="font-semibold align-top sticky left-0 bg-card z-10 p-2" rowSpan={displayClasses.length}>
                          <div className="flex items-center gap-2">
                             <span>{day}</span>
                              {isEditable && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 no-print">
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Paste to...</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent>
                                            {workingDays.filter(d => d !== day).map(destinationDay => (
                                              <DropdownMenuItem key={destinationDay} onClick={() => handleCopyDay(day, destinationDay)}>
                                                {destinationDay}
                                              </DropdownMenuItem>
                                            ))}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                          </div>
                        </td>
                      )}
                      <td className="font-medium align-top sticky left-[100px] bg-card z-10 p-2">{className}</td>
                      {timeSlots.map(timeSlot => (
                        <td key={`${day}-${className}-${timeSlot}`} className="p-0 align-top border-l">{renderCellContent(day, className, timeSlot)}</td>
                      ))}
                    </tr>
                  ))}
                  {day !== workingDays[workingDays.length - 1] && <tr className="bg-background hover:bg-background h-2"><td colSpan={timeSlots.length + 2} className="p-1"></td></tr>}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
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
      <Card>
        <CardHeader className="no-print">
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <CardTitle>View Routine</CardTitle>
                    <CardDescription>View, download, or edit your routine. {isEditable && "Use the copy icon next to a day's name to paste its schedule to another day."}</CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print All
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 md:p-6 space-y-6">
                {renderScheduleTable("Secondary", secondaryClasses, "routine-table-secondary")}
                {renderScheduleTable("Senior Secondary", seniorSecondaryClasses, "routine-table-senior-secondary")}
            </div>
        </CardContent>
      </Card>
      
      {isCellDialogOpen && (
        <Dialog open={isCellDialogOpen} onOpenChange={setIsCellDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Schedule Slot</DialogTitle>
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
