
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileDown, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


interface TeacherLoadProps {
  teacherLoad: Record<string, Record<string, number>>;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];

export default function TeacherLoad({ teacherLoad }: TeacherLoadProps) {
  const teachers = Object.keys(teacherLoad).sort();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  if (teachers.length === 0) {
    return null;
  }
  
  const handleDownloadPdf = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      toast({ variant: 'destructive', title: "Error", description: "Could not find element to print."});
      return;
    }
    
    const scrollContainer = element.querySelector<HTMLDivElement>('.relative.w-full.overflow-auto');
    const originalOverflow = scrollContainer ? scrollContainer.style.overflow : '';
    if (scrollContainer) {
      scrollContainer.style.overflow = 'visible';
    }

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4'); 
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;

      let finalImgWidth = pdfWidth - 20;
      let finalImgHeight = finalImgWidth / ratio;

      if (finalImgHeight > pdfHeight - 20) {
        finalImgHeight = pdfHeight - 20;
        finalImgWidth = finalImgHeight * ratio;
      }
      
      const x = (pdfWidth - finalImgWidth) / 2;
      const y = (pdfHeight - finalImgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
      pdf.save(fileName);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "PDF Download Failed" });
    } finally {
      if (scrollContainer) {
        scrollContainer.style.overflow = originalOverflow;
      }
      setIsDownloading(false);
    }
  }


  return (
    <div className="px-6 md:px-0 break-after-page">
      <Card id="teacher-load-table">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Teacher Workload</CardTitle>
            </div>
            <Button size="sm" variant="outline" disabled={isDownloading} onClick={() => handleDownloadPdf('teacher-load-table', 'teacher-workload.pdf')}>
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
          <CardDescription>Number of classes assigned per teacher per day.</CardDescription>
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
