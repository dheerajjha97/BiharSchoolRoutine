
"use client";

import type { SubstitutionPlan, Teacher } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface SubstitutionPlanProps {
  plan: SubstitutionPlan;
  teachers: Teacher[];
  pdfHeader?: string;
}

export default function SubstitutionPlanDisplay({ plan, teachers, pdfHeader = "" }: SubstitutionPlanProps) {

  const getTeacherName = (id: string): string => {
    if (id === "No Substitute Available") return id;
    return teachers.find(t => t.id === id)?.name || id;
  };

  const handlePrint = () => {
    const printableElement = document.getElementById('substitution-table-container');
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

    const title = `Substitution Plan - ${new Date(plan.date).toLocaleDateString('en-GB')}`;
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
            </div>
        </div>
      </CardHeader>
      <CardContent>
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
