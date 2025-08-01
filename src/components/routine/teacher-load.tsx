
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileDown, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { pdf } from '@react-pdf/renderer';
import type { GenerateScheduleOutput } from '@/ai/flows/generate-schedule';
import RoutinePDFDocument from './RoutinePDFDocument';
import { useToast } from '@/hooks/use-toast';


interface TeacherLoadProps {
  teacherLoad: Record<string, Record<string, number>>;
  scheduleData: GenerateScheduleOutput;
  timeSlots: string[];
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];

export default function TeacherLoad({ teacherLoad, scheduleData, timeSlots }: TeacherLoadProps) {
  const teachers = Object.keys(teacherLoad).sort();
  const { toast } = useToast();
  const [downloadingTeacher, setDownloadingTeacher] = useState<string | null>(null);

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

  const handleDownloadPdf = async (teacher: string) => {
      if (!scheduleData) return;
      setDownloadingTeacher(teacher);
      try {
          const doc = (
            <RoutinePDFDocument 
                scheduleData={scheduleData}
                timeSlots={timeSlots}
                classes={[]}
                teacherLoad={{}}
                title={`Routine for ${teacher}`}
                singleTeacherData={getSingleTeacherData(teacher)}
            />
          );
          const asPdf = pdf([]);
          asPdf.updateContainer(doc);
          const blob = await asPdf.toBlob();

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `routine-${teacher.replace(/\s+/g, '-')}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
          URL.revokeObjectURL(url);
      } catch (error) {
          console.error("Failed to generate PDF for teacher", error);
          toast({ variant: "destructive", title: "PDF Generation Failed" });
      } finally {
          setDownloadingTeacher(null);
      }
  };

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
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(teacher)} disabled={downloadingTeacher === teacher}>
                            {downloadingTeacher === teacher ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileDown className="h-4 w-4" />
                            )}
                        </Button>
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
