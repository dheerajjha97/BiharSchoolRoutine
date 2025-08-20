
"use client";

import { useContext, useState, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import type { Teacher } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, dateToDay } from "@/lib/utils";
import { Check as CheckIcon, PlusCircle } from "lucide-react";
import { generateSubstitutionPlan } from "@/lib/substitution-generator";
import SubstitutionPlanDisplay from "@/components/routine/substitution-plan";

function MultiSelectPopover({ options, selected, onSelectedChange, placeholder }: { options: Teacher[], selected: string[], onSelectedChange: (selected: string[]) => void, placeholder: string }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (optionId: string) => {
        const newSelected = selected.includes(optionId)
            ? selected.filter(item => item !== optionId)
            : [...selected, optionId];
        onSelectedChange(newSelected);
    };

    const selectedNames = useMemo(() => {
        return options.filter(opt => selected.includes(opt.id)).map(opt => opt.name).join(', ');
    }, [options, selected]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    <span className="truncate">
                        {selected.length > 0 ? selectedNames : placeholder}
                    </span>
                    <PlusCircle className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search teachers..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.id}
                                    value={option.name}
                                    onSelect={() => handleSelect(option.id)}
                                >
                                    <CheckIcon
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}


export default function AdjustmentsPage() {
    const { appState, updateAdjustments } = useContext(AppStateContext);
    const { teachers, routineHistory, activeRoutineId, teacherLoad, schoolInfo, holidays = [] } = appState;
    const { pdfHeader } = schoolInfo;
    const { date, absentTeacherIds, substitutionPlan } = appState.adjustments;
    const { toast } = useToast();
    
    // Get today's date in YYYY-MM-DD format for the min attribute
    const today = new Date().toISOString().split('T')[0];

    const activeRoutine = routineHistory.find(r => r.id === activeRoutineId);

    const handleGeneratePlan = () => {
        if (!activeRoutine?.schedule?.schedule) {
            toast({ variant: "destructive", title: "No Active Routine Found", description: "Please generate or select a master routine on the dashboard first." });
            return;
        }
        if (absentTeacherIds.length === 0) {
            toast({ variant: "destructive", title: "No Absent Teachers", description: "Please select at least one absent teacher." });
            return;
        }
        
        const isHoliday = holidays.some(h => h.date === date);
        if (isHoliday) {
            const holidayName = holidays.find(h => h.date === date)?.name;
            toast({ variant: "destructive", title: "Cannot Generate on Holiday", description: `The selected date is a holiday: ${holidayName}.` });
            return;
        }
        
        if (dateToDay(date) === null) {
            toast({ variant: "destructive", title: "Cannot Generate for Sunday", description: "Sunday is a holiday." });
            return;
        }

        try {
            const plan = generateSubstitutionPlan({
                schedule: activeRoutine.schedule.schedule,
                allTeachers: teachers,
                absentTeacherIds,
                date: date,
                teacherLoad
            });
            updateAdjustments('substitutionPlan', plan);
            toast({ title: "Substitution Plan Generated", description: "Available teachers have been assigned to cover the periods." });
        } catch (error) {
            console.error("Error generating substitution plan:", error);
            toast({ variant: "destructive", title: "Generation Failed", description: error instanceof Error ? error.message : "Could not generate the plan." });
        }
    };

    return (
        <div className="space-y-6 p-6">
            <PageHeader
                title="Daily Adjustments & Substitutions"
                description="Manage daily teacher absences and generate substitution plans. The master routine remains unchanged."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Create Substitution Plan</CardTitle>
                    <CardDescription>
                        Select the date and the teachers who are absent. The system will assign available teachers to cover their periods based on the active routine.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <Label htmlFor="adjustment-date">Date for Adjustment</Label>
                            <Input 
                                id="adjustment-date" 
                                type="date"
                                min={today}
                                value={date} 
                                onChange={e => {
                                    updateAdjustments('date', e.target.value);
                                    updateAdjustments('substitutionPlan', null); // Reset plan if date changes
                                }} 
                            />
                        </div>
                        <div>
                            <Label>Absent Teachers</Label>
                            <MultiSelectPopover 
                                options={teachers} 
                                selected={absentTeacherIds} 
                                onSelectedChange={(newSelection) => {
                                    updateAdjustments('absentTeacherIds', newSelection);
                                    updateAdjustments('substitutionPlan', null); // Reset plan if selection changes
                                }}
                                placeholder="Select absent teachers..." 
                            />
                        </div>
                    </div>
                     <Button onClick={handleGeneratePlan} disabled={!activeRoutine}>
                        Generate Substitution Plan
                    </Button>
                </CardContent>
            </Card>

            {substitutionPlan && (
                <SubstitutionPlanDisplay plan={substitutionPlan} teachers={teachers} pdfHeader={pdfHeader} />
            )}
        </div>
    );
}
