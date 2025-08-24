
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TeachersSettingsPage() {
    const { appState, updateConfig } = useContext(AppStateContext);
    const { config, teachers, classes, subjects } = appState;

    const handleTeacherSubjectChange = (teacherId: string, subject: string, checked: boolean) => {
        const currentSubjects = config.teacherSubjects[teacherId] || [];
        const newSubjects = checked
            ? [...currentSubjects, subject]
            : currentSubjects.filter(s => s !== subject);
        updateConfig('teacherSubjects', { ...config.teacherSubjects, [teacherId]: newSubjects });
    };

    const handleTeacherClassChange = (teacherId: string, className: string, checked: boolean) => {
        const currentClasses = config.teacherClasses[teacherId] || [];
        const newClasses = checked
            ? [...currentClasses, className]
            : currentClasses.filter(c => c !== className);
        updateConfig('teacherClasses', { ...config.teacherClasses, [teacherId]: newClasses });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Class Teacher Assignment</CardTitle>
                    <CardDescription>
                        Assign a class teacher to each class. They will be automatically scheduled for the first period for attendance.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Class</TableHead>
                                <TableHead>Class Teacher</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map(c => (
                                <TableRow key={c}>
                                    <TableCell className="font-medium"><Label>{c}</Label></TableCell>
                                    <TableCell>
                                        <Select
                                            value={config.classTeachers[c] || 'none'}
                                            onValueChange={(value) => updateConfig('classTeachers', { ...config.classTeachers, [c]: value === 'none' ? '' : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Class Teacher" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Accordion type="multiple" className="space-y-6">
                <Card>
                    <AccordionItem value="teacher-subjects" className="border-0">
                        <CardHeader>
                            <AccordionTrigger className="p-0 hover:no-underline">
                                <div className="text-left">
                                    <CardTitle>Teacher-Subject Mapping</CardTitle>
                                    <CardDescription>Assign which subjects each teacher can teach.</CardDescription>
                                </div>
                            </AccordionTrigger>
                        </CardHeader>
                        <AccordionContent>
                             <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                                {teachers.map(t => (
                                    <div key={t.id}>
                                    <h4 className="font-semibold mb-2 border-b pb-2">{t.name}</h4>
                                    <ScrollArea className="h-60">
                                        <div className="space-y-2 pr-4">
                                        {subjects.map(s => (
                                            <div key={s} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`${t.id}-${s}`}
                                                checked={config.teacherSubjects[t.id]?.includes(s) || false}
                                                onCheckedChange={(checked) => handleTeacherSubjectChange(t.id, s, !!checked)}
                                            />
                                            <Label htmlFor={`${t.id}-${s}`} className="font-normal">{s}</Label>
                                            </div>
                                        ))}
                                        </div>
                                    </ScrollArea>
                                    </div>
                                ))}
                            </CardContent>
                        </AccordionContent>
                    </AccordionItem>
                </Card>

                <Card>
                    <AccordionItem value="teacher-classes" className="border-0">
                         <CardHeader>
                            <AccordionTrigger className="p-0 hover:no-underline">
                                <div className="text-left">
                                    <CardTitle>Teacher-Class Mapping</CardTitle>
                                    <CardDescription>Assign which classes each teacher can teach.</CardDescription>
                                </div>
                            </AccordionTrigger>
                        </CardHeader>
                        <AccordionContent>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                                {teachers.map(t => (
                                    <div key={t.id}>
                                    <h4 className="font-semibold mb-2 border-b pb-2">{t.name}</h4>
                                    <ScrollArea className="h-60">
                                        <div className="space-y-2 pr-4">
                                        {classes.map(c => (
                                            <div key={c} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`${t.id}-${c}`}
                                                checked={config.teacherClasses[t.id]?.includes(c) || false}
                                                onCheckedChange={(checked) => handleTeacherClassChange(t.id, c, !!checked)}
                                            />
                                            <Label htmlFor={`${t.id}-${c}`} className="font-normal">{c}</Label>
                                            </div>
                                        ))}
                                        </div>
                                    </ScrollArea>
                                    </div>
                                ))}
                            </CardContent>
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            </Accordion>

        </div>
    );
}
