
"use client";

import { useState } from 'react';
import type { SubstitutionPlan, Teacher } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FileDown, Loader2, Printer } from 'lucide-react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface SubstitutionPlanProps {
  plan: SubstitutionPlan;
  teachers: Teacher[];
  pdfHeader?: string;
}

export default function SubstitutionPlanDisplay({ plan, teachers, pdfHeader = "" }: SubstitutionPlanProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const getTeacherName = (id: string): string => {
    if (id === "No Substitute Available") return id;
    return teachers.find(t => t.id === id)?.name || id;
  };

  const handlePrint = () => {
    const printableElement = document.getElementById('substitution-table-container');
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

    // Add a title for the printout
    const title = `Substitution Plan - ${new Date(plan.date).toLocaleDateString('en-GB')}`;
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


  const handleDownloadPdf = async (elementId: string, fileName: string) => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) {
        toast({ variant: 'destructive', title: "Error", description: "Could not find element to print." });
        return;
    }
    setIsDownloading(true);

    const pdfContainer = document.getElementById('pdf-container-substitution');
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
    
    const title = `Substitution Plan - ${new Date(plan.date).toLocaleDateString('en-GB')}`;
    const mainTitle = document.createElement('h2');
    mainTitle.textContent = title;
    mainTitle.style.textAlign = 'center';
    mainTitle.style.marginBottom = '10px';
    mainTitle.style.width = '100%';
    mainTitle.style.fontSize = '18px';
    
    wrapperDiv.appendChild(mainTitle);

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

  const dayOfWeek = new Date(plan.date).toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <CardTitle>Generated Substitution Plan</CardTitle>
              <CardDescription>
                Plan for {dayOfWeek}, {new Date(plan.date).toLocaleDateString('en-GB')}.
              </CardDescription>
            </div>
             <div className="flex items-center gap-2 no-print">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button size="sm" variant="outline" disabled={isDownloading} onClick={() => handleDownloadPdf('substitution-table-container', `substitution-plan-${plan.date}.pdf`)}>
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  {isDownloading ? '...' : 'PDF'}
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
         <div id="pdf-container-substitution" className="absolute -left-[9999px] top-auto" aria-hidden="true"></div>
         <div id="substitution-table-container" className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className='font-semibold'>Time Slot</TableHead>
                        <TableHead className='font-semibold'>Class</TableHead>
                        <TableHead className='font-semibold'>Subject</TableHead>
                        <TableHead className='font-semibold'>Absent Teacher</TableHead>
                        <TableHead className='font-semibold'>Assigned Substitute</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {plan.substitutions.length > 0 ? (
                        plan.substitutions.map((sub, index) => (
                            <TableRow key={index}>
                                <TableCell>{sub.timeSlot}</TableCell>
                                <TableCell>{sub.className}</TableCell>
                                <TableCell>{sub.subject}</TableCell>
                                <TableCell className="text-destructive">{getTeacherName(sub.absentTeacherId)}</TableCell>
                                <TableCell className="text-green-600 font-semibold">{getTeacherName(sub.substituteTeacherId)}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                No substitutions needed for the selected absent teachers on this day.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
         </div>
      </CardContent>
    </Card>
  );
}
