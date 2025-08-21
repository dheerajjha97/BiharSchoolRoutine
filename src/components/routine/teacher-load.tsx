
"use client";

import React from 'react';
import type { TeacherLoad as TeacherLoadType, Teacher, DayOfWeek } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Printer } from "lucide-react";
import { Button } from "../ui/button";

interface TeacherLoadProps {
  teacherLoad: TeacherLoadType;
  teachers: Teacher[];
  pdfHeader?: string;
  workingDays: DayOfWeek[];
}


export default function TeacherLoad({ teacherLoad, teachers, pdfHeader = "", workingDays }: TeacherLoadProps) {
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

  const handlePrint = () => {
    const printableElement = document.getElementById('teacher-load-table-container');
    if (!printableElement) return;

    const printWrapper = document.createElement('div');
    printWrapper.id = 'printable';

    // Add header if available
    if (pdfHeader && pdfHeader.trim()) {
      const headerDiv = document.createElement('div');
      headerDiv.style.textAlign = 'center';
      headerDiv.style.marginBottom = '20px';
      pdfHeader.trim().split('\n').forEach((line, index) => {
        const p = document.createElement('p');
        p.textContent = line;
        p.style.fontSize = index === 0 ? '16px' : '14px';
        p.style.fontWeight = index === 0 ? 'bold' : 'normal';
        p.style.margin = '0';
        p.style.padding = '0';
        headerDiv.appendChild(p);
      });
      printWrapper.appendChild(headerDiv);
    }
    
     const title = `Teacher Workload Analysis`;
     const mainTitle = document.createElement('h2');
     mainTitle.textContent = title;
     mainTitle.style.textAlign = 'center';
     mainTitle.style.marginBottom = '10px';
     mainTitle.style.fontSize = '18px';
     printWrapper.appendChild(mainTitle);

    // Clone the table and append it
    printWrapper.appendChild(printableElement.cloneNode(true));
    document.body.appendChild(printWrapper);
    
    window.print();
    
    document.body.removeChild(printWrapper);
  };

  return (
    <div className="px-0 md:px-0 break-after-page">
      <Card>
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
                <Button size="sm" variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent id="teacher-load-table-container">
          <div className="border rounded-lg overflow-x-auto">
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
        </CardContent>
      </Card>
    </div>
  );
}
