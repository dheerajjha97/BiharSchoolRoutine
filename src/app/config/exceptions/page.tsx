
"use client";

import { useContext, useState } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Trash2, PlusCircle, Check as CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Unavailability, CombinedClassRule, SplitClassRule } from "@/types";

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

export default function ExceptionsSettingsPage() {
    const { appState, updateConfig } = useContext(AppStateContext);
    const { config, teachers, timeSlots, classes, subjects } = appState;
    
    const [newUnavailability, setNewUnavailability] = useState<Omit<Unavailability, ''>>({ teacherId: '', day: '', timeSlot: '' });
    const [ruleType, setRuleType] = useState<'combined' | 'split'>('combined');
    
    // State for new combined rule
    const [combinedRuleClasses, setCombinedRuleClasses] = useState<string[]>([]);
    const [combinedRuleSubject, setCombinedRuleSubject] = useState('');
    const [combinedRuleTeacherId, setCombinedRuleTeacherId] = useState('');

    // State for new split rule
    const [splitRuleClass, setSplitRuleClass] = useState('');
    const [splitRuleParts, setSplitRuleParts] = useState<{ subject: string, teacherId: string }[]>([{ subject: '', teacherId: '' }]);
    
    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || id;

    const handleAddUnavailability = () => {
        if (newUnavailability.teacherId && newUnavailability.day && newUnavailability.timeSlot) {
            if (!config.unavailability.some(u => 
                u.teacherId === newUnavailability.teacherId && 
                u.day === newUnavailability.day && 
                u.timeSlot === newUnavailability.timeSlot
            )) {
                updateConfig('unavailability', [...config.unavailability, newUnavailability as Unavailability]);
            }
            setNewUnavailability({ teacherId: '', day: '', timeSlot: '' });
        }
    };

    const handleRemoveUnavailability = (index: number) => {
        updateConfig('unavailability', config.unavailability.filter((_, i) => i !== index));
    };

    const handleAddSpecialRule = () => {
        if (ruleType === 'combined') {
            if (combinedRuleClasses.length > 1 && combinedRuleSubject && combinedRuleTeacherId) {
                const newRule: CombinedClassRule = { classes: combinedRuleClasses, subject: combinedRuleSubject, teacherId: combinedRuleTeacherId };
                updateConfig('combinedClasses', [...(config.combinedClasses || []), newRule]);
                setCombinedRuleClasses([]);
                setCombinedRuleSubject('');
                setCombinedRuleTeacherId('');
            }
        } else { // split
            if (splitRuleClass && splitRuleParts.length > 1 && splitRuleParts.every(p => p.subject && p.teacherId)) {
                const newRule: SplitClassRule = { className: splitRuleClass, parts: splitRuleParts };
                updateConfig('splitClasses', [...(config.splitClasses || []), newRule]);
                setSplitRuleClass('');
                setSplitRuleParts([{ subject: '', teacherId: '' }]);
            }
        }
    };

    const handleUpdateSplitPart = (index: number, field: 'subject' | 'teacherId', value: string) => {
        const newParts = [...splitRuleParts];
        newParts[index][field] = value;
        setSplitRuleParts(newParts);
    };
    
    const handleAddSplitPart = () => {
        setSplitRuleParts([...splitRuleParts, { subject: '', teacherId: '' }]);
    };
    
    const handleRemoveSplitPart = (index: number) => {
        setSplitRuleParts(splitRuleParts.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Teacher Unavailability</CardTitle>
                    <CardDescription>
                        Add specific times when a teacher is not available.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        <Select value={newUnavailability.teacherId} onValueChange={(value) => setNewUnavailability({ ...newUnavailability, teacherId: value })}>
                            <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                            <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={newUnavailability.day} onValueChange={(value) => setNewUnavailability({ ...newUnavailability, day: value })}>
                            <SelectTrigger><SelectValue placeholder="Select Day" /></SelectTrigger>
                            <SelectContent>{config.workingDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={newUnavailability.timeSlot} onValueChange={(value) => setNewUnavailability({ ...newUnavailability, timeSlot: value })}>
                            <SelectTrigger><SelectValue placeholder="Select Time Slot" /></SelectTrigger>
                            <SelectContent>{timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={handleAddUnavailability}>Add Rule</Button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {config.unavailability.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Teacher</TableHead>
                                        <TableHead>Day</TableHead>
                                        <TableHead>Time Slot</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {config.unavailability.map((rule, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{getTeacherName(rule.teacherId)}</TableCell>
                                            <TableCell>{rule.day}</TableCell>
                                            <TableCell>{rule.timeSlot}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveUnavailability(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No unavailability rules added.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <div>
                            <CardTitle>Combined/Split Class Rules</CardTitle>
                            <CardDescription>Define special rules for combining or splitting classes for specific periods.</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Rule</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>Add New Special Rule</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <RadioGroup defaultValue="combined" onValueChange={(v: 'combined' | 'split') => setRuleType(v)} className="grid grid-cols-2 gap-4">
                                        <div><RadioGroupItem value="combined" id="r-combined" className="peer sr-only" /><Label htmlFor="r-combined" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Combined Class</Label></div>
                                        <div><RadioGroupItem value="split" id="r-split" className="peer sr-only" /><Label htmlFor="r-split" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Split Class</Label></div>
                                    </RadioGroup>

                                    {ruleType === 'combined' ? (
                                        <div className="space-y-4 p-4 border rounded-md">
                                            <h4 className="font-medium">Define Combined Class</h4>
                                            <div><Label>Classes to Combine</Label><MultiSelectPopover options={classes} selected={combinedRuleClasses} onSelectedChange={setCombinedRuleClasses} placeholder="Select classes..." /></div>
                                            <div><Label>Subject</Label><Select value={combinedRuleSubject} onValueChange={setCombinedRuleSubject}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                                            <div><Label>Teacher</Label><Select value={combinedRuleTeacherId} onValueChange={setCombinedRuleTeacherId}><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 p-4 border rounded-md">
                                            <h4 className="font-medium">Define Split Class</h4>
                                            <div><Label>Class to Split</Label><Select value={splitRuleClass} onValueChange={setSplitRuleClass}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                                            <div className="space-y-2">
                                                <Label>Parts</Label>
                                                {splitRuleParts.map((part, index) => (
                                                    <div key={index} className="flex gap-2 items-center">
                                                        <Select value={part.subject} onValueChange={(v) => handleUpdateSplitPart(index, 'subject', v)}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                                                        <Select value={part.teacherId} onValueChange={(v) => handleUpdateSplitPart(index, 'teacherId', v)}><SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSplitPart(index)} disabled={splitRuleParts.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={handleAddSplitPart}>Add Another Part</Button>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                                    <DialogClose asChild><Button onClick={handleAddSpecialRule}>Add Rule</Button></DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="mt-4 space-y-2">
                        {(config.combinedClasses?.length || 0) === 0 && (config.splitClasses?.length || 0) === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No special rules added.</p>
                        ) : (
                            <Table>
                                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {config.combinedClasses?.map((rule, index) => (
                                        <TableRow key={`c-${index}`}>
                                            <TableCell>Combined</TableCell>
                                            <TableCell>{rule.classes.join(' & ')} {'->'} {rule.subject} ({getTeacherName(rule.teacherId)})</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => updateConfig('combinedClasses', config.combinedClasses.filter((_, i) => i !== index))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {config.splitClasses?.map((rule, index) => (
                                        <TableRow key={`s-${index}`}>
                                            <TableCell>Split</TableCell>
                                            <TableCell>{rule.className} {'->'} {rule.parts.map(p => `${p.subject} (${getTeacherName(p.teacherId)})`).join(' | ')}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => updateConfig('splitClasses', config.splitClasses.filter((_, i) => i !== index))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
