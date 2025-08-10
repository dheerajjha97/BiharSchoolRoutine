
"use client";

import { useContext, useState } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, dateToDay } from "@/lib/utils";
import { Check as CheckIcon, PlusCircle } from "lucide-react";
import { generateSubstitutionPlan, type SubstitutionPlan } from "@/lib/substitution-generator";
import SubstitutionPlanDisplay from "@/components/routine/substitution-plan";

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
                    <CommandInput placeholder="Search teachers..." />
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


export default function AdjustmentsPage() {
    const { appState, updateAdjustments } = useContext(AppStateContext);
    const { teachers, routineHistory, activeRoutineId, teacherLoad, pdfHeader } = appState;
    const { date, absentTeachers, substitutionPlan } = appState.adjustments;
    const { toast } = useToast();

    const activeRoutine = routineHistory.find(r => r.id === activeRoutineId);

    const handleGeneratePlan = () => {
        if (!activeRoutine?.schedule) {
            toast({ variant: "destructive", title: "No Active Routine Found", description: "Please generate or select a master routine on the dashboard first." });
            return;
        }
        if (absentTeachers.length === 0) {
            toast({ variant: "destructive", title: "No Absent Teachers", description: "Please select at least one absent teacher." });
            return;
        }

        if (dateToDay(date) === null) {
            toast({ variant: "destructive", title: "Cannot Generate for Sunday", description: "Sunday is a holiday." });
            return;
        }

        try {
            const plan = generateSubstitutionPlan({
                schedule: activeRoutine.schedule,
                allTeachers: teachers,
                absentTeachers,
                date: date, // Pass the date string directly
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
        <div className="space-y-6">
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
                                selected={absentTeachers} 
                                onSelectedChange={(newSelection) => {
                                    updateAdjustments('absentTeachers', newSelection);
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
                <SubstitutionPlanDisplay plan={substitutionPlan} pdfHeader={pdfHeader} />
            )}
        </div>
    );
}
