
"use client";

import type { Teacher, TeacherLoad, DayOfWeek } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useMediaQuery from '@/hooks/use-media-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface TeacherLoadDisplayProps {
  teacherLoad: TeacherLoad;
  teachers: Teacher[];
  workingDays: DayOfWeek[];
}

const dayColors: Record<DayOfWeek, string> = {
    "Monday": "bg-blue-100 dark:bg-blue-900/30",
    "Tuesday": "bg-green-100 dark:bg-green-900/30",
    "Wednesday": "bg-yellow-100 dark:bg-yellow-900/30",
    "Thursday": "bg-orange-100 dark:bg-orange-900/30",
    "Friday": "bg-purple-100 dark:bg-purple-900/30",
    "Saturday": "bg-pink-100 dark:bg-pink-900/30",
    "Sunday": "bg-red-100 dark:bg-red-900/30",
};

const TeacherLoadDisplay = ({ teacherLoad, teachers, workingDays }: TeacherLoadDisplayProps) => {
    const isMobile = useMediaQuery("(max-width: 768px)");
    
    if (Object.keys(teacherLoad).length === 0) {
        return null;
    }
    
    const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
    const dayColumns = [...workingDays, "Total"];

    const renderDesktopView = () => (
        <div className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-semibold sticky left-0 bg-card z-10">Teacher</TableHead>
                        {dayColumns.map(day => (
                            <TableHead key={day} className="text-center font-semibold">{day}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedTeachers.map(teacher => (
                        <TableRow key={teacher.id}>
                            <TableCell className="font-medium sticky left-0 bg-card z-10">{teacher.name}</TableCell>
                            {dayColumns.map(day => {
                                const load = teacherLoad[teacher.id]?.[day as DayOfWeek] || { total: 0, main: 0, additional: 0 };
                                return (
                                    <TableCell key={day} className="text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-lg">{load.total}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({load.main}M + {load.additional}A)
                                            </span>
                                        </div>
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
    
    const renderMobileView = () => (
        <Accordion type="multiple" className="space-y-3">
            {sortedTeachers.map(teacher => {
                const totalLoad = teacherLoad[teacher.id]?.Total || { total: 0, main: 0, additional: 0 };
                return (
                    <AccordionItem key={teacher.id} value={teacher.id} className="border rounded-lg bg-card shadow-sm px-4">
                        <AccordionTrigger className="py-4">
                            <div className="flex justify-between items-center w-full pr-2">
                                <span className="font-semibold">{teacher.name}</span>
                                <div className="text-right">
                                    <span className="font-bold text-lg">{totalLoad.total}</span>
                                    <span className="text-xs text-muted-foreground ml-1">
                                        ({totalLoad.main}M + {totalLoad.additional}A)
                                    </span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             <div className="border-t pt-4">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {workingDays.map(day => {
                                        const dayLoad = teacherLoad[teacher.id]?.[day] || { total: 0, main: 0, additional: 0 };
                                        return (
                                            <div key={day} className={cn("p-2 rounded-md", dayColors[day])}>
                                                <div className="text-xs font-medium text-muted-foreground">{day.substring(0,3)}</div>
                                                <div className="font-bold mt-1">{dayLoad.total}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Teacher Load Analysis</CardTitle>
                <CardDescription>
                    Weekly period distribution for each teacher based on the active routine. (M = Main, A = Additional)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isMobile ? renderMobileView() : renderDesktopView()}
            </CardContent>
        </Card>
    );
};

export default TeacherLoadDisplay;
