
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Printer } from "lucide-react";
import { Button } from "../ui/button";

interface TeacherLoadProps {
  teacherLoad: Record<string, Record<string, number>>;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];

export default function TeacherLoad({ teacherLoad }: TeacherLoadProps) {
  const teachers = Object.keys(teacherLoad).sort();
  const { handlePrintTeacherRoutine } = useContext(AppStateContext);

  if (teachers.length === 0) {
    return null;
  }

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Teacher Workload
        </CardTitle>
        <CardDescription>Number of classes assigned per teacher per day. You can print individual routines from here.</CardDescription>
      </CardHeader>
      <CardContent>
        <h3 className="hidden print:block print-title">Teacher Workload Summary</h3>
        <div className="border rounded-lg">
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
                      <Button variant="ghost" size="icon" onClick={() => handlePrintTeacherRoutine(teacher)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
