
"use client";

import { useState } from 'react';
import type { DutyChart } from '@/context/app-state-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FileDown, Loader2 } from 'lucide-react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface InvigilationDutyChartProps {
  dutyChart: DutyChart;
  pdfHeader?: string;
}

export default function InvigilationDutyChart({ dutyChart, pdfHeader = "" }: InvigilationDutyChartProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async (elementId: string, fileName: string) => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) {
        toast({ variant: 'destructive', title: "Error", description: "Could not find element to print." });
        return;
    }
    setIsDownloading(true);

    const pdfContainer = document.getElementById('pdf-container-duty');
    if (!pdfContainer) {
        setIsDownloading(false);
        return;
    }
    
    const wrapperDiv = document.createElement('div');
    
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
            el.style.textAlign = 'center';
            el.style.fontSize = '10px';
        });
        table.querySelectorAll('th').forEach(th => {
            const el = th as HTMLElement;
            el.style.backgroundColor = '#f2f2f2';
        });
    }
    
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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <CardTitle>Generated Invigilation Duty Chart</CardTitle>
              <CardDescription>
                The following chart shows the assigned invigilation duties for each exam slot.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" disabled={isDownloading} onClick={() => handleDownloadPdf('duty-chart-table', 'invigilation-duty-chart.pdf')}>
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </Button>
        </div>
      </CardHeader>
      <CardContent>
         <div id="pdf-container-duty" className="absolute -left-[9999px] top-auto" aria-hidden="true"></div>
         <div id="duty-chart-table" className="border rounded-lg overflow-x-auto">
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
                            const invigilators = dutiesForSlot[room] || [];
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
                                            {invigilators.length > 0 ? (
                                                invigilators.map((teacher, idx) => (
                                                    <span key={idx} className="text-xs bg-secondary p-1 rounded-md">{teacher}</span>
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
