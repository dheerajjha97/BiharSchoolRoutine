
"use client";

import { useContext, useMemo } from 'react';
import { AppStateContext } from '@/context/app-state-provider';
import type { Teacher, ScheduleEntry } from '@/types';
import PageHeader from '@/components/app/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { sortTimeSlots } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserCheck, UserX, UserPlus } from 'lucide-react';

const daysOfWeek: ScheduleEntry['day'][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function MySchedulePage() {
    const { appState, user } = useContext(AppStateContext);
    const { routineHistory, activeRoutineId, teachers, adjustments } = appState;
    const { substitutionPlan } = adjustments;

    const activeRoutine = useMemo(() => {
        return routineHistory.find(r => r.id === activeRoutineId);
    }, [routineHistory, activeRoutineId]);

    const loggedInTeacher: Teacher | undefined = useMemo(() => {
        if (!user || !user.email) return undefined;
        return teachers.find(t => t.email === user.email);
    }, [user, teachers]);

    const teacherWeeklySchedule = useMemo(() => {
        if (!activeRoutine?.schedule?.schedule || !loggedInTeacher) return {};
        
        const teacherId = loggedInTeacher.id;
        const weeklySchedule: Record<string, (ScheduleEntry & { substituteTeacherId?: string })[]> = {};

        daysOfWeek.forEach(day => {
            const scheduleForDay = activeRoutine.schedule.schedule
                .filter(entry => {
                    if (!entry || entry.day !== day || !entry.teacher) return false;
                    const teacherIdsInSlot = entry.teacher.split(' & ').map(id => id.trim());
                    return teacherIdsInSlot.includes(teacherId);
                })
                .map(entry => {
                    if (substitutionPlan && substitutionPlan.substitutions.length > 0) {
                        const substitution = substitutionPlan.substitutions.find(sub => 
                            sub.absentTeacherId === teacherId &&
                            sub.timeSlot === entry.timeSlot &&
                            sub.className === entry.className
                        );
                        if (substitution) {
                            return { ...entry, substituteTeacherId: substitution.substituteTeacherId };
                        }
                    }
                    return entry;
                })
                .sort((a, b) => sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(a.timeSlot) - sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(b.timeSlot));
            
            if (scheduleForDay.length > 0) {
                weeklySchedule[day] = scheduleForDay;
            }
        });
        
        return weeklySchedule;

    }, [activeRoutine, loggedInTeacher, substitutionPlan]);

    const weekHasClasses = Object.keys(teacherWeeklySchedule).length > 0;
    const getTeacherName = (id: string): string => teachers.find(t => t.id === id)?.name || id;

    if (!user) {
        return (
             <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertTitle>Please Log In</AlertTitle>
                <AlertDescription>You need to be logged in to view your schedule.</AlertDescription>
            </Alert>
        );
    }

    if (!loggedInTeacher) {
         return (
             <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertTitle>Teacher Not Found</AlertTitle>
                <AlertDescription>Your email ({user.email}) is not registered as a teacher in the system. Please contact the administrator.</AlertDescription>
            </Alert>
        );
    }
    
    if (!activeRoutine) {
        return (
             <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertTitle>No Active Routine</AlertTitle>
                <AlertDescription>An administrator has not set an active school routine yet.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader 
                title={`My Weekly Schedule`}
                description={`Welcome, ${loggedInTeacher.name}. Here are your classes for the week.`}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Your Classes</CardTitle>
                    <CardDescription>
                        A summary of your scheduled classes for the entire week. This is based on your registered email: {user.email}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {weekHasClasses ? (
                        <div className="space-y-6">
                            {daysOfWeek.map(day => {
                                const daySchedule = teacherWeeklySchedule[day];
                                if (!daySchedule || daySchedule.length === 0) return null;

                                return (
                                    <div key={day}>
                                        <h3 className="text-lg font-semibold mb-2 border-b pb-2">{day}</h3>
                                        <div className="border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="font-semibold">Time Slot</TableHead>
                                                        <TableHead className="font-semibold">Class</TableHead>
                                                        <TableHead className="font-semibold">Subject</TableHead>
                                                        <TableHead className="font-semibold text-right">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {daySchedule.map((entry, index) => (
                                                        <TableRow key={index} className={entry.substituteTeacherId ? 'bg-muted/50' : ''}>
                                                            <TableCell>{entry.timeSlot}</TableCell>
                                                            <TableCell>{entry.className}</TableCell>
                                                            <TableCell>{entry.subject}</TableCell>
                                                            <TableCell className="text-right">
                                                                {entry.substituteTeacherId ? (
                                                                    entry.substituteTeacherId === 'No Substitute Available' ? (
                                                                        <div className="flex items-center justify-end text-orange-600">
                                                                            <UserX className="mr-2 h-4 w-4" />
                                                                            <span>No Substitute</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-end text-green-600">
                                                                            <UserPlus className="mr-2 h-4 w-4" />
                                                                            <span>Sub: {getTeacherName(entry.substituteTeacherId)}</span>
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                     <span className="text-muted-foreground">Scheduled</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <div className="text-center py-12 text-muted-foreground">
                            <p>You have no classes scheduled for the week.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    