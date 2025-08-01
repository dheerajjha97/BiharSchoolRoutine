
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileDown } from "lucide-react";
import { Button } from "../ui/button";
import { PDFDownloadLink } from '@react-pdf/renderer';
import RoutinePDFDocument from './RoutinePDFDocument';
import type { GenerateScheduleOutput } from '@/ai/flows/generate-schedule';

interface TeacherLoadProps {
  teacherLoad: Record<string, Record<string, number>>;
  scheduleData: GenerateScheduleOutput;
  timeSlots: string[];
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];

export default function TeacherLoad({ teacherLoad, scheduleData, timeSlots }: TeacherLoadProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const teachers = Object.keys(teacherLoad).sort();

  if (teachers.length === 0) {
    return null;
  }
  
  const getSingleTeacherData = (teacherName: string) => {
    const teacherScheduleEntries = scheduleData.schedule.filter(entry => entry.teacher.includes(teacherName));
    const scheduleByDayTime: Record<string, Record<string, { className: string, subject: string }>> = {};
      teacherScheduleEntries.forEach(entry => {
          if (!scheduleByDayTime[entry.day]) scheduleByDayTime[entry.day] = {};
          scheduleByDayTime[entry.day][entry.timeSlot] = { className: entry.className, subject: entry.subject };
      });
    return {
      teacherName,
      schedule: scheduleByDayTime,
    }
  }

  return (
    <div className="px-6 md:px-0 break-after-page">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Teacher Workload
          </CardTitle>
          <CardDescription>Number of classes assigned per teacher per day. You can download individual routines from here.</CardDescription>
        </CardHeader>
        <CardContent>
          <h3 className="hidden">Teacher Workload Summary</h3>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Teacher</TableHead>
                  {daysOfWeek.map(day => (
                    <TableHead key={day} className="text-center font-semibold">{day.substring(0, 3)}</TableHead>
                  ))}
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map(teacher => (
                  <TableRow key={teacher}>
                    <TableCell className="font-medium">{teacher}</TableCell>
                    {daysOfWeek.map(day => (
                      <TableCell key={`${teacher}-${day}`} className="text-center">
                        {teacherLoad[teacher]?.[day] ?? 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                       {isClient && (
                          <PDFDownloadLink
                              document={
                                  <RoutinePDFDocument 
                                      scheduleData={scheduleData}
                                      timeSlots={timeSlots}
                                      classes={[]}
                                      teacherLoad={{}}
                                      title={`Routine for ${teacher}`}
                                      singleTeacherData={getSingleTeacherData(teacher)}
                                  />
                              }
                              fileName={`routine-${teacher.replace(/\s+/g, '-')}.pdf`}
                          >
                            {({ loading }) => (
                                <Button variant="ghost" size="icon" disabled={loading}>
                                  <FileDown className="h-4 w-4" />
                                </Button>
                            )}
                          </PDFDownloadLink>
                       )}
                      </TableCell>
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
