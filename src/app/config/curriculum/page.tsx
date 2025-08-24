
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SubjectCategory, SubjectPriority } from "@/types";

export default function CurriculumSettingsPage() {
    const { appState, updateConfig } = useContext(AppStateContext);
    const { config, classes, subjects } = appState;

    const handleRequirementChange = (className: string, subject: string, checked: boolean) => {
        const currentReqs = config.classRequirements[className] || [];
        const newReqs = checked
            ? [...currentReqs, subject]
            : currentReqs.filter(s => s !== subject);
        updateConfig('classRequirements', { ...config.classRequirements, [className]: newReqs });
    };

    return (
        <div className="space-y-6">
            <Card>
                <Accordion type="single" collapsible>
                    <AccordionItem value="class-requirements" className="border-0">
                        <CardHeader>
                            <AccordionTrigger className="p-0 hover:no-underline">
                                <div className="text-left">
                                    <CardTitle>Class-Subject Requirements</CardTitle>
                                    <CardDescription>Select which subjects are required for each class.</CardDescription>
                                </div>
                            </AccordionTrigger>
                        </CardHeader>
                        <AccordionContent>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                                {classes.map(c => (
                                    <div key={c}>
                                        <h4 className="font-semibold mb-2 border-b pb-2">{c}</h4>
                                        <ScrollArea className="h-60">
                                            <div className="space-y-2 pr-4">
                                                {subjects.map(s => (
                                                    <div key={s} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`${c}-${s}`}
                                                            checked={config.classRequirements[c]?.includes(s) || false}
                                                            onCheckedChange={(checked) => handleRequirementChange(c, s, !!checked)}
                                                        />
                                                        <Label htmlFor={`${c}-${s}`} className="font-normal">{s}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                ))}
                            </CardContent>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Subject Categories</CardTitle>
                    <CardDescription>
                        Categorize subjects as Main (prioritized, no daily repeats) or Additional (fills remaining slots).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead className="text-center">Main</TableHead>
                                <TableHead className="text-center">Additional</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subjects
                                .filter(s => !['Prayer', 'Lunch'].includes(s))
                                .map(s => (
                                <TableRow key={s}>
                                    <TableCell><Label>{s}</Label></TableCell>
                                    <TableCell colSpan={2}>
                                        <RadioGroup
                                            value={config.subjectCategories[s] || 'additional'}
                                            onValueChange={(value: SubjectCategory) => updateConfig('subjectCategories', { ...config.subjectCategories, [s]: value })}
                                            className="grid grid-cols-2"
                                        >
                                            <div className="flex items-center justify-center space-x-2">
                                                <RadioGroupItem value="main" id={`${s}-main`} />
                                            </div>
                                            <div className="flex items-center justify-center space-x-2">
                                                <RadioGroupItem value="additional" id={`${s}-additional`} />
                                            </div>
                                        </RadioGroup>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Subject Priority (Time of Day)</CardTitle>
                    <CardDescription>
                        Optionally, set when subjects should be prioritized. This helps in scheduling important subjects before lunch.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead className="text-center">Before Lunch</TableHead>
                                <TableHead className="text-center">After Lunch</TableHead>
                                <TableHead className="text-center">No Preference</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subjects
                                .filter(s => !['Prayer', 'Lunch'].includes(s))
                                .map(s => (
                                <TableRow key={s}>
                                    <TableCell><Label>{s}</Label></TableCell>
                                    <TableCell colSpan={3}>
                                        <RadioGroup
                                            value={config.subjectPriorities[s] || 'none'}
                                            onValueChange={(value: SubjectPriority) => updateConfig('subjectPriorities', { ...config.subjectPriorities, [s]: value })}
                                            className="grid grid-cols-3"
                                        >
                                            <div className="flex items-center justify-center space-x-2">
                                                <RadioGroupItem value="before" id={`${s}-before`} />
                                            </div>
                                            <div className="flex items-center justify-center space-x-2">
                                                <RadioGroupItem value="after" id={`${s}-after`} />
                                            </div>
                                            <div className="flex items-center justify-center space-x-2">
                                                <RadioGroupItem value="none" id={`${s}-none`} />
                                            </div>
                                        </RadioGroup>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
