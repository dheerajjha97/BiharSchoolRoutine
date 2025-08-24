
"use client";

import React, { useState } from 'react';
import type { TeacherLoad as TeacherLoadType, Teacher, DayOfWeek } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Printer } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from '@/lib/utils';
import useMediaQuery from '@/hooks/use-media-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";


interface TeacherLoadProps {
  teacherLoad: TeacherLoadType;
  teachers: Teacher[];
  pdfHeader?: string;
  workingDays: DayOfWeek[];
}


export default function TeacherLoad({ teacherLoad, teachers, pdfHeader = "", workingDays }: TeacherLoadProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const teacherIds = Object.keys(teacherLoad).sort((a,b) => {
    const teacherA = teachers.find(t => t.id === a)?.name || a;
    const teacherB = teachers.find(t => t.id === b)?.name || b;
    return teacherA.localeCompare(teacherB);
  });
  
  const daysOfWeek: (DayOfWeek | "Total")[] = [...workingDays, "Total"];


  if (teacherIds.length === 0) {
    return (
       <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Teacher Workload Analysis</CardTitle>
            </div>
            <CardDescription>Detailed breakdown of classes assigned per teacher.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 text-muted-foreground">
                <p>No routine is active. Generate or select a routine to see the workload analysis.</p>
            </div>
          </CardContent>
       </Card>
    );
  }

  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || id;

  const handleMobileRowClick = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
        setSelectedTeacher(teacher);
    }
  };

  const renderDesktopView = () => (
    <div id="teacher-load-table-container" className="border rounded-lg overflow-x-auto">
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead className="font-semibold sticky left-0 bg-card z-10" rowSpan={2}>Teacher</TableHead>
            {daysOfWeek.map(day => (
                <TableHead key={day} className="text-center font-semibold" colSpan={3}>{day}</TableHead>
            ))}
            </TableRow>
            <TableRow>
            {daysOfWeek.map(day => (
                <React.Fragment key={day}>
                <TableHead className="text-center">Main</TableHead>
                <TableHead className="text-center">Add.</TableHead>
                <TableHead className="text-center font-bold">Total</TableHead>
                </React.Fragment>
            ))}
            </TableRow>
        </TableHeader>
        <TableBody>
            {teacherIds.map(teacherId => (
            <TableRow key={teacherId}>
                <TableCell className="font-medium sticky left-0 bg-card z-10">{getTeacherName(teacherId)}</TableCell>
                {daysOfWeek.map(day => {
                const load = teacherLoad[teacherId]?.[day] ?? { total: 0, main: 0, additional: 0 };
                return (
                    <React.Fragment key={`${teacherId}-${day}`}>
                        <TableCell className="text-center">{load.main}</TableCell>
                        <TableCell className="text-center">{load.additional}</TableCell>
                        <TableCell className="text-center font-bold bg-secondary/50">{load.total}</TableCell>
                    </React.Fragment>
                )
                })}
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );
  
  const renderMobileView = () => (
     <div id="teacher-load-table-container" className="border rounded-lg overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="font-semibold">Teacher</TableHead>
                    <TableHead className="text-right font-semibold">Total Periods (Weekly)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                 {teacherIds.map(teacherId => {
                     const totalLoad = teacherLoad[teacherId]?.Total?.total ?? 0;
                     return (
                        <TableRow key={teacherId} onClick={() => handleMobileRowClick(teacherId)} className="cursor-pointer">
                            <TableCell className="font-medium">{getTeacherName(teacherId)}</TableCell>
                            <TableCell className="text-right font-bold">{totalLoad}</TableCell>
                        </TableRow>
                     )
                 })}
            </TableBody>
        </Table>
     </div>
  );

  return (
    <>
        <div className="px-0 md:px-0">
        <Card id="printable-teacher-load">
            <CardHeader>
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle>Teacher Workload Analysis</CardTitle>
                </div>
                <CardDescription>Detailed breakdown of classes assigned per teacher.</CardDescription>
                </div>
                <div className="flex items-center gap-2 no-print">
                    <Button size="sm" variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                </div>
            </div>
            </CardHeader>
            <CardContent>
                <div className="printable-area">
                    <div className="print-header hidden text-center mb-4">
                        {pdfHeader && pdfHeader.trim().split('\n').map((line, index) => <p key={index} className={cn(index === 0 && 'font-bold')}>{line}</p>)}
                        <h2 className="text-lg font-bold mt-2">Teacher Workload Analysis</h2>
                    </div>
                    {isMobile ? renderMobileView() : renderDesktopView()}
                </div>
            </CardContent>
        </Card>
        </div>

        <Dialog open={!!selectedTeacher} onOpenChange={(isOpen) => !isOpen && setSelectedTeacher(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Detailed Load for {selectedTeacher?.name}</DialogTitle>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                   {selectedTeacher && (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Day</TableHead>
                                <TableHead className="text-center">Main</TableHead>
                                <TableHead className="text-center">Add.</TableHead>
                                <TableHead className="text-center font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {daysOfWeek.map(day => {
                                const load = teacherLoad[selectedTeacher.id]?.[day] ?? { total: 0, main: 0, additional: 0 };
                                return (
                                    <TableRow key={`${selectedTeacher.id}-${day}`}>
                                        <TableCell className="font-medium">{day}</TableCell>
                                        <TableCell className="text-center">{load.main}</TableCell>
                                        <TableCell className="text-center">{load.additional}</TableCell>
                                        <TableCell className={cn("text-center font-bold", day === 'Total' && 'bg-secondary/80')}>{load.total}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                     </Table>
                   )}
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
