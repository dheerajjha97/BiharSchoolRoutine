
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

interface TeacherLoadProps {
  teacherLoad: Record<string, Record<string, number>>;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"];

export default function TeacherLoad({ teacherLoad }: TeacherLoadProps) {
  const teachers = Object.keys(teacherLoad).sort();

  if (teachers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Teacher Workload
        </CardTitle>
        <CardDescription>Number of classes assigned per teacher per day.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
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
  );
}
