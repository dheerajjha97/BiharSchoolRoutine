
"use client";

import { useContext, useMemo } from 'react';
import { AppStateContext, type Teacher } from '@/context/app-state-provider';
import PageHeader from '@/components/app/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dateToDay, sortTimeSlots } from '@/lib/utils';
import { ScheduleEntry } from '@/ai/flows/generate-schedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserCheck } from 'lucide-react';

export default function MySchedulePage() {
    const { appState, user } = useContext(AppStateContext);
    const { routineHistory, activeRoutineId, timeSlots, teachers } = appState;

    const activeRoutine = useMemo(() => {
        return routineHistory.find(r => r.id === activeRoutineId);
    }, [routineHistory, activeRoutineId]);

    const todayDay = useMemo(() => {
        return dateToDay(new Date().toISOString().split('T')[0]);
    }, []);

    const loggedInTeacher: Teacher | undefined = useMemo(() => {
        if (!user || !user.email) return undefined;
        return teachers.find(t => t.email === user.email);
    }, [user, teachers]);

    const teacherSchedule = useMemo(() => {
        if (!activeRoutine || !loggedInTeacher || !todayDay) return [];
        
        const teacherId = loggedInTeacher.id;
        return activeRoutine.schedule.schedule
            .filter(entry => 
                entry.day === todayDay && 
                entry.teacher.includes(teacherId) &&
                entry.subject !== '---' &&
                entry.subject !== 'Prayer' &&
                entry.subject !== 'Lunch'
            )
            .sort((a, b) => sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(a.timeSlot) - sortTimeSlots([a.timeSlot, b.timeSlot]).indexOf(b.timeSlot));
    }, [activeRoutine, loggedInTeacher, todayDay]);

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
                title={`My Schedule for ${todayDay || 'Today'}`}
                description={`Welcome, ${loggedInTeacher.name}. Here are your classes for today, ${new Date().toLocaleDateString('en-GB')}.`}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Today's Classes</CardTitle>
                    <CardDescription>
                        A summary of your scheduled classes and periods for today. This is based on your registered email: {user.email}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-semibold">Time Slot</TableHead>
                                    <TableHead className="font-semibold">Class</TableHead>
                                    <TableHead className="font-semibold">Subject</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teacherSchedule.length > 0 ? (
                                    teacherSchedule.map((entry, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{entry.timeSlot}</TableCell>
                                            <TableCell>{entry.className}</TableCell>
                                            <TableCell>{entry.subject}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                            You have no classes scheduled for today.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
