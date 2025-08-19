
"use client";

import { useContext, useState } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { ExamEntry, DutyChart, Teacher } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateInvigilationDuty } from "@/lib/exam-duty-generator";
import { useToast } from "@/hooks/use-toast";
import InvigilationDutyChart from "@/components/routine/invigilation-duty-chart";
import { PlusCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check as CheckIcon } from "lucide-react";

function MultiSelectPopover({ options, selected, onSelectedChange, placeholder }: { options: string[], selected: string[], onSelectedChange: (selected: string[]) => void, placeholder: string }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onSelectedChange(newSelected);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    <span className="truncate">
                        {selected.length > 0 ? selected.join(', ') : placeholder}
                    </span>
                    <PlusCircle className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option}
                                    value={option}
                                    onSelect={() => handleSelect(option)}
                                >
                                    <CheckIcon
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function ReportsPage() {
    const { appState, updateState } = useContext(AppStateContext);
    const { teachers, classes, subjects, rooms, examTimetable = [], pdfHeader } = appState;
    const [dutyChart, setDutyChart] = useState<DutyChart | null>(null);
    const { toast } = useToast();

    // State for the new exam entry form
    const [newExamDate, setNewExamDate] = useState("");
    const [newExamStartTime, setNewExamStartTime] = useState("");
    const [newExamEndTime, setNewExamEndTime] = useState("");
    const [newExamClasses, setNewExamClasses] = useState<string[]>([]);
    const [newExamRooms, setNewExamRooms] = useState<string[]>([]);
    const [newExamSubject, setNewExamSubject] = useState("");

    const handleAddExamEntry = () => {
        if (!newExamDate || !newExamStartTime || !newExamEndTime || newExamClasses.length === 0 || newExamRooms.length === 0 || !newExamSubject) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill all fields to add an exam entry." });
            return;
        }

        const newEntry: ExamEntry = {
            id: Date.now().toString(), // simple unique id
            date: newExamDate,
            startTime: newExamStartTime,
            endTime: newExamEndTime,
            classes: newExamClasses,
            rooms: newExamRooms,
            subject: newExamSubject
        };

        updateState('examTimetable', [...examTimetable, newEntry]);

        // Reset form
        setNewExamDate("");
        setNewExamStartTime("");
        setNewExamEndTime("");
        setNewExamClasses([]);
        setNewExamRooms([]);
        setNewExamSubject("");
    };

    const handleRemoveExamEntry = (id: string) => {
        updateState('examTimetable', examTimetable.filter(entry => entry.id !== id));
    };

    const handleGenerateDutyChart = () => {
        if (examTimetable.length === 0) {
            toast({
                variant: "destructive",
                title: "No Exam Timetable Found",
                description: "Please create an exam timetable first.",
            });
            return;
        }

        try {
            const chart = generateInvigilationDuty(examTimetable, teachers);
            setDutyChart(chart);
            toast({
                title: "Duty Chart Generated",
                description: "Invigilation duties have been assigned based on the exam timetable."
            });
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Generation Failed",
                description: "Could not generate the duty chart.",
            });
        }
    };

    return (
        <div className="space-y-6 p-6">
            <PageHeader
                title="Exams & Reports"
                description="Create exam timetables and generate invigilation duty charts."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Create Exam Timetable</CardTitle>
                    <CardDescription>
                       Add exam entries below. The generated invigilation duty will be based on this timetable.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <Label htmlFor="exam-date">Date</Label>
                            <Input id="exam-date" type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <Label htmlFor="exam-start-time">Start Time</Label>
                                <Input id="exam-start-time" type="time" value={newExamStartTime} onChange={e => setNewExamStartTime(e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="exam-end-time">End Time</Label>
                                <Input id="exam-end-time" type="time" value={newExamEndTime} onChange={e => setNewExamEndTime(e.target.value)} />
                            </div>
                        </div>
                        <div>
                             <Label>Classes</Label>
                             <MultiSelectPopover options={classes} selected={newExamClasses} onSelectedChange={setNewExamClasses} placeholder="Select classes..." />
                        </div>
                        <div>
                            <Label>Rooms</Label>
                            <MultiSelectPopover options={rooms} selected={newExamRooms} onSelectedChange={setNewExamRooms} placeholder="Select rooms..." />
                        </div>
                        <div className="lg:col-span-2">
                            <Label htmlFor="exam-subject">Subject</Label>
                            <Select value={newExamSubject} onValueChange={setNewExamSubject}>
                                <SelectTrigger id="exam-subject"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="lg:col-span-2 flex items-end">
                             <Button onClick={handleAddExamEntry} className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add to Timetable
                            </Button>
                        </div>
                    </div>

                    {examTimetable.length > 0 && (
                        <div className="border rounded-md mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Classes</TableHead>
                                        <TableHead>Rooms</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {examTimetable.map(entry => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{entry.date}</TableCell>
                                            <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                                            <TableCell>{entry.classes.join(', ')}</TableCell>
                                            <TableCell>{entry.rooms.join(', ')}</TableCell>
                                            <TableCell>{entry.subject}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveExamEntry(entry.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invigilation Duty Chart</CardTitle>
                    <CardDescription>
                       Generate an invigilation duty chart based on the timetable you created above.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateDutyChart}>
                        Generate & Display Duty Chart
                    </Button>
                </CardContent>
            </Card>

            {dutyChart && (
                <InvigilationDutyChart dutyChart={dutyChart} teachers={teachers} pdfHeader={pdfHeader} />
            )}
        </div>
    );
}
