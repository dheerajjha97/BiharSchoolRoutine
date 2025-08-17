
"use client";

import type { GenerateScheduleOutput, Teacher, ScheduleEntry } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import { User } from "lucide-react";

interface TeacherRoutineDisplayProps {
    scheduleData: GenerateScheduleOutput | null;
    teacher: Teacher | null;
    timeSlots: string[];
}

const daysOfWeek: ScheduleEntry['day'][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherRoutineDisplay({ scheduleData, teacher, timeSlots }: TeacherRoutineDisplayProps) {

    const teacherSchedule = useMemo(() => {
        if (!scheduleData?.schedule || !teacher) return {};

        const scheduleByDay: Record<string, Record<string, { className: string; subject: string }>> = {};
        
        daysOfWeek.forEach(day => {
            scheduleByDay[day] = {};
        });

        scheduleData.schedule.forEach(entry => {
            if (entry.day && (entry.teacher || '').includes(teacher.id)) {
                 if (!scheduleByDay[entry.day]) {
                    scheduleByDay[entry.day] = {};
                }
                scheduleByDay[entry.day][entry.timeSlot] = {
                    className: entry.className,
                    subject: entry.subject
                };
            }
        });

        return scheduleByDay;
    }, [scheduleData, teacher]);


    if (!teacher) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> My Weekly Routine</CardTitle>
                    <CardDescription>Your personal routine will be displayed here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-10">Could not identify the logged-in teacher.</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!scheduleData || !scheduleData.schedule || scheduleData.schedule.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> My Weekly Routine</CardTitle>
                    <CardDescription>Your personal routine will be displayed here once a school routine is active.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-10">No active school routine found.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><User /> My Weekly Routine</CardTitle>
                <CardDescription>Here are your assigned classes for the week.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-semibold min-w-[120px]">Day</TableHead>
                                {timeSlots.map(slot => (
                                    <TableHead key={slot} className="font-semibold text-center min-w-[120px]">{slot}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {daysOfWeek.map(day => (
                                <TableRow key={day}>
                                    <TableCell className="font-semibold">{day}</TableCell>
                                    {timeSlots.map(slot => {
                                        const period = teacherSchedule[day]?.[slot];
                                        return (
                                            <TableCell key={slot} className="text-center">
                                                {period ? (
                                                    <div>
                                                        <div className="font-medium">{period.subject}</div>
                                                        <div className="text-xs text-muted-foreground">{period.className}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
