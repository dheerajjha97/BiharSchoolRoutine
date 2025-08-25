
"use client";

import { useMemo } from "react";
import type { Teacher, TeacherLoad, DayOfWeek, GenerateScheduleOutput, ScheduleEntry } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useMediaQuery from '@/hooks/use-media-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface TeacherLoadDisplayProps {
    teacherLoad: TeacherLoad;
    teachers: Teacher[];
    workingDays: DayOfWeek[];
    scheduleData: GenerateScheduleOutput | null;
    timeSlots: string[];
}

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
                const teacherDailyLoad = teacherLoad[teacher.id] || {};

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
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Day</TableHead>
                                      <TableHead className="text-center">Main</TableHead>
                                      <TableHead className="text-center">Additional</TableHead>
                                      <TableHead className="text-center">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {workingDays.map(day => {
                                      const dayLoad = teacherDailyLoad[day] || { total: 0, main: 0, additional: 0 };
                                      return (
                                        <TableRow key={day}>
                                          <TableCell className="font-medium">{day}</TableCell>
                                          <TableCell className="text-center">{dayLoad.main}</TableCell>
                                          <TableCell className="text-center">{dayLoad.additional}</TableCell>
                                          <TableCell className="text-center font-bold">{dayLoad.total}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
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
                    Weekly period distribution for each teacher based on the active routine. Click on a teacher to see their detailed schedule. (M = Main, A = Additional)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isMobile ? renderMobileView() : renderDesktopView()}
            </CardContent>
        </Card>
    );
};

export default TeacherLoadDisplay;
