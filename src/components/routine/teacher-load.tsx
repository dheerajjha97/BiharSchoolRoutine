
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileDown, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';


interface TeacherLoadProps {
  teacherLoad: Record<string, Record<string, number>>;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];

export default function TeacherLoad({ teacherLoad }: TeacherLoadProps) {
  const teachers = Object.keys(teacherLoad).sort();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfHeader, setPdfHeader] = useState("");

  if (teachers.length === 0) {
    return null;
  }
  
  const handleDownloadPdf = async (elementId: string, fileName: string) => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) {
        toast({ variant: 'destructive', title: "Error", description: "Could not find element to print." });
        return;
    }
    setIsDownloading(true);

    const pdfContainer = document.getElementById('pdf-container-teacher');
    if (!pdfContainer) {
        setIsDownloading(false);
        return;
    }
    
    const wrapperDiv = document.createElement('div');
    
    // Create and style the header div
    if (pdfHeader.trim()) {
        const headerDiv = document.createElement('div');
        headerDiv.style.textAlign = 'center';
        headerDiv.style.marginBottom = '20px';
        headerDiv.style.width = '100%';
        pdfHeader.trim().split('\n').forEach((line, index) => {
            const p = document.createElement('p');
            p.textContent = line;
            p.style.margin = '0';
            p.style.padding = '0';
            p.style.fontSize = index === 0 ? '16px' : '14px';
            p.style.fontWeight = index === 0 ? 'bold' : 'normal';
            headerDiv.appendChild(p);
        });
        wrapperDiv.appendChild(headerDiv);
    }

    const clonedElement = originalElement.cloneNode(true) as HTMLElement;
    const table = clonedElement.querySelector('table');
    if(table) {
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        table.querySelectorAll('th, td').forEach(cell => {
            const el = cell as HTMLElement;
            el.style.border = '1px solid black';
            el.style.padding = '4px';
        });
        table.querySelectorAll('th').forEach(th => {
            const el = th as HTMLElement;
            el.style.backgroundColor = 'hsl(217, 33%, 54%)';
            el.style.color = 'hsl(210, 40%, 98%)';
        });
    }

    clonedElement.querySelectorAll('th, td').forEach(el => {
        (el as HTMLElement).style.position = 'static';
    });
    
    wrapperDiv.appendChild(clonedElement);
    pdfContainer.appendChild(wrapperDiv);
    
    try {
        const canvas = await html2canvas(wrapperDiv, {
            scale: 2,
            useCORS: true,
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
        pdfContainer.innerHTML = '';
        setIsDownloading(false);
    }
  }


  return (
    <div className="px-6 md:px-0 break-after-page">
      <div id="pdf-container-teacher" className="absolute -left-[9999px] top-auto" aria-hidden="true"></div>
      <Card id="teacher-load-table">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Teacher Workload</CardTitle>
              </div>
              <CardDescription>Number of classes assigned per teacher per day.</CardDescription>
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
           <div className='pt-4'>
                <Label htmlFor="pdf-header-teacher">PDF Header (Optional)</Label>
                <Textarea 
                    id="pdf-header-teacher"
                    placeholder="e.g. Teacher Workload Summary"
                    value={pdfHeader}
                    onChange={(e) => setPdfHeader(e.target.value)}
                    className="mt-1"
                />
            </div>
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

    