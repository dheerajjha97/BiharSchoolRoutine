
"use client";

import { useState } from 'react';
import type { DutyChart, Teacher } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface InvigilationDutyChartProps {
  dutyChart: DutyChart;
  teachers: Teacher[];
  pdfHeader?: string;
}

export default function InvigilationDutyChart({ dutyChart, teachers, pdfHeader = "" }: InvigilationDutyChartProps) {
  
  const handlePrint = () => {
    const printableElement = document.getElementById('duty-chart-table-container');
    if (!printableElement) return;

    const printWrapper = document.createElement('div');
    printWrapper.id = 'printable';

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
    
     const title = `Invigilation Duty Chart`;
     const mainTitle = document.createElement('h2');
     mainTitle.textContent = title;
     mainTitle.style.textAlign = 'center';
     mainTitle.style.marginBottom = '10px';
     mainTitle.style.fontSize = '18px';
     printWrapper.appendChild(mainTitle);

    printWrapper.appendChild(printableElement.cloneNode(true));
    document.body.appendChild(printWrapper);
    
    window.print();
    
    document.body.removeChild(printWrapper);
  };
  
  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || id;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <CardTitle>Generated Invigilation Duty Chart</CardTitle>
              <CardDescription>
                The following chart shows the assigned invigilation duties for each exam slot.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 no-print">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
         <div id="duty-chart-table-container" className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className='font-semibold'>Date</TableHead>
                        <TableHead className='font-semibold'>Time</TableHead>
                        <TableHead className='font-semibold'>Room</TableHead>
                        <TableHead className='font-semibold'>Invigilators</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {dutyChart.examSlots.map(slot => {
                        const key = `${slot.date}-${slot.startTime}`;
                        const dutiesForSlot = dutyChart.duties[key] || {};
                        const roomsInSlot = Object.keys(dutiesForSlot).sort();
                        
                        if (roomsInSlot.length === 0) {
                            return (
                                <TableRow key={key}>
                                    <TableCell className="font-medium">{slot.date}</TableCell>
                                    <TableCell className="font-medium">{slot.startTime} - {slot.endTime}</TableCell>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">No duties assigned</TableCell>
                                </TableRow>
                            );
                        }

                        return roomsInSlot.map((room, index) => {
                            const invigilatorIds = dutiesForSlot[room] || [];
                            return (
                                <TableRow key={`${key}-${room}`}>
                                    {index === 0 && (
                                        <>
                                            <TableCell className="font-medium align-top" rowSpan={roomsInSlot.length}>{slot.date}</TableCell>
                                            <TableCell className="font-medium align-top" rowSpan={roomsInSlot.length}>{slot.startTime} - {slot.endTime}</TableCell>
                                        </>
                                    )}
                                    <TableCell className="font-medium">{room}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {invigilatorIds.length > 0 ? (
                                                invigilatorIds.map((teacherId, idx) => (
                                                    <span key={idx} className="text-xs bg-secondary p-1 rounded-md">{getTeacherName(teacherId)}</span>
                                                ))
                                            ) : (
                                                <span className='text-xs text-muted-foreground'>-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        });
                    })}
                </TableBody>
            </Table>
         </div>
      </CardContent>
    </Card>
  );
}
