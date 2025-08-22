
"use client";

import { useState } from 'react';
import type { DutyChart, Teacher } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvigilationDutyChartProps {
  dutyChart: DutyChart;
  teachers: Teacher[];
  pdfHeader?: string;
}

export default function InvigilationDutyChart({ dutyChart, teachers, pdfHeader = "" }: InvigilationDutyChartProps) {
  
  const handlePrint = () => {
    const printContent = document.getElementById('printable-duty-chart');
    const mainContent = document.querySelector('main');
    if (printContent && mainContent) {
        mainContent.childNodes.forEach(node => {
            if (node !== printContent && node instanceof HTMLElement) {
                node.classList.add('no-print');
            }
        });
        printContent.classList.remove('no-print');
        window.print();
        mainContent.childNodes.forEach(node => {
            if (node instanceof HTMLElement) {
                node.classList.remove('no-print');
            }
        });
    } else {
       window.print();
    }
  };
  
  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || id;

  return (
    <Card id="printable-duty-chart">
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
         <div className="printable-area">
            <div className="print-header hidden text-center mb-4">
                {pdfHeader && pdfHeader.trim().split('\n').map((line, index) => <p key={index} className={cn(index === 0 && 'font-bold')}>{line}</p>)}
                <h2 className="text-lg font-bold mt-2">Invigilation Duty Chart</h2>
            </div>
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
         </div>
      </CardContent>
    </Card>
  );
}
