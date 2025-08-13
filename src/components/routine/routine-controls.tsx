
"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, PlusCircle, AlertTriangle } from "lucide-react";
import type { SchoolConfig, CombinedClassRule, SplitClassRule, Teacher } from "@/context/app-state-provider";
import type { SubjectPriority, SubjectCategory } from "@/lib/schedule-generator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "../ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { Check as CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Unavailability = {
  teacherId: string;
  day: string;
  timeSlot: string;
}

interface RoutineControlsProps {
  teachers: Teacher[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  config: SchoolConfig;
  updateConfig: <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => void;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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


export default function RoutineControls({
  teachers,
  classes,
  subjects,
  timeSlots,
  config,
  updateConfig
}: RoutineControlsProps) {
  
  const [newUnavailability, setNewUnavailability] = useState<Omit<Unavailability, ''>>({ teacherId: '', day: '', timeSlot: '' });
  const [ruleType, setRuleType] = useState<'combined' | 'split'>('combined');
  
  // State for new combined rule
  const [combinedRuleClasses, setCombinedRuleClasses] = useState<string[]>([]);
  const [combinedRuleSubject, setCombinedRuleSubject] = useState('');
  const [combinedRuleTeacherId, setCombinedRuleTeacherId] = useState('');

  // State for new split rule
  const [splitRuleClass, setSplitRuleClass] = useState('');
  const [splitRuleParts, setSplitRuleParts] = useState<{ subject: string, teacherId: string }[]>([{ subject: '', teacherId: '' }]);

  const handleRequirementChange = (className: string, subject: string, checked: boolean) => {
    const currentReqs = config.classRequirements[className] || [];
    const newReqs = checked
      ? [...currentReqs, subject]
      : currentReqs.filter(s => s !== subject);
    updateConfig('classRequirements', { ...config.classRequirements, [className]: newReqs });
  };

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
  
  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || id;


  return (
    <Accordion type="multiple" defaultValue={["scheduling-rules"]} className="w-full space-y-4">
      <AccordionItem value="scheduling-rules" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Scheduling Rules</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="daily-period-quota">Max Periods Per Teacher Per Day</Label>
                <Select
                  value={String(config.dailyPeriodQuota)}
                  onValueChange={(value) => updateConfig('dailyPeriodQuota', Number(value))}
                >
                  <SelectTrigger id="daily-period-quota">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5).keys()].map(i => <SelectItem key={i+4} value={String(i+4)}>{i+4}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prevent-consecutive"
              checked={config.preventConsecutiveClasses}
              onCheckedChange={(checked) => updateConfig('preventConsecutiveClasses', !!checked)}
            />
            <Label htmlFor="prevent-consecutive" className="font-normal">
              Prevent teachers from having 3 or more consecutive periods
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="special-rules" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Combined/Split Class Rules</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
             <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Define special rules for combining or splitting classes for specific periods.</p>
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
                                    <div><Label>Subject</Label><Select value={combinedRuleSubject} onValueChange={setCombinedRuleSubject}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label>Teacher</Label><Select value={combinedRuleTeacherId} onValueChange={setCombinedRuleTeacherId}><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger><SelectContent>{teachers.map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                                </div>
                            ) : (
                                <div className="space-y-4 p-4 border rounded-md">
                                    <h4 className="font-medium">Define Split Class</h4>
                                    <div><Label>Class to Split</Label><Select value={splitRuleClass} onValueChange={setSplitRuleClass}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="space-y-2">
                                        <Label>Parts</Label>
                                        {splitRuleParts.map((part, index) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <Select value={part.subject} onValueChange={(v) => handleUpdateSplitPart(index, 'subject', v)}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                                                <Select value={part.teacherId} onValueChange={(v) => handleUpdateSplitPart(index, 'teacherId', v)}><SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger><SelectContent>{teachers.map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
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
        </AccordionContent>
      </AccordionItem>


       <AccordionItem value="class-teacher" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Class Teacher Assignment</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
           <p className="text-sm text-muted-foreground">Assign a class teacher to each class. They will be automatically scheduled for the first period for attendance.</p>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Class Teacher</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {classes.map(c => (
                        <TableRow key={c}>
                            <TableCell><Label>{c}</Label></TableCell>
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
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="teacher-unavailability" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Teacher Unavailability</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
           <p className="text-sm text-muted-foreground">Add specific times when a teacher is not available.</p>
           <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Select value={newUnavailability.teacherId} onValueChange={(value) => setNewUnavailability({...newUnavailability, teacherId: value})}>
                  <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                  <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newUnavailability.day} onValueChange={(value) => setNewUnavailability({...newUnavailability, day: value})}>
                  <SelectTrigger><SelectValue placeholder="Select Day" /></SelectTrigger>
                  <SelectContent>{daysOfWeek.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newUnavailability.timeSlot} onValueChange={(value) => setNewUnavailability({...newUnavailability, timeSlot: value})}>
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
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="breaks" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Breaks (Prayer & Lunch)</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Prayer Period</Label>
              <Select value={config.prayerTimeSlot} onValueChange={(v) => updateConfig('prayerTimeSlot', v === 'none' ? '' : v)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select Prayer Time Slot" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lunch Period</Label>
              <Select value={config.lunchTimeSlot} onValueChange={(v) => updateConfig('lunchTimeSlot', v === 'none' ? '' : v)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select Lunch Time Slot" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="teacher-subjects" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Teacher-Subject Mapping</AccordionTrigger>
        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
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
        </AccordionContent>
      </AccordionItem>

       <AccordionItem value="teacher-classes" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Teacher-Class Mapping</AccordionTrigger>
        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
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
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="class-requirements" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Class-Subject Requirements</AccordionTrigger>
        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
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
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="subject-categories" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Subject Categories</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
           <p className="text-sm text-muted-foreground">
            Categorize subjects as Main (prioritized, no daily repeats) or Additional (fills remaining slots).
          </p>
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
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="subject-priority" className="border p-4 rounded-lg bg-card">
        <AccordionTrigger>Subject Priority (Time of Day)</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Optionally, set when subjects should be prioritized. This helps in scheduling important subjects before lunch.
          </p>
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

    