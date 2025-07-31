
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Printer } from "lucide-react";
import { Button } from "../ui/button";

interface TeacherLoadProps {
  teacherLoad: Record<string, Record<string, number>>;
  onPrintTeacher: (teacher: string) => void;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];

export default function TeacherLoad({ teacherLoad, onPrintTeacher }: TeacherLoadProps) {
  const teachers = Object.keys(teacherLoad).sort();

  if (teachers.length === 0) {
    return null;
  }

  return (
    <div className="px-6 md:px-0">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Teacher Workload
          </CardTitle>
          <CardDescription>Number of classes assigned per teacher per day. You can print individual routines from here.</CardDescription>
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
                        <Button variant="ghost" size="icon" onClick={() => onPrintTeacher(teacher)}>
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
    </div>
  );
}
