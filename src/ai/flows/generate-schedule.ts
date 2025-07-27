
// This file implements the Genkit flow for the generateSchedule story.
// It allows teachers to automatically generate a draft schedule based on teacher availability, subject priorities, and class requirements.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateScheduleInputSchema = z.object({
  teacherNames: z.array(z.string()).describe('List of teacher names.'),
  classes: z.array(z.string()).describe('List of classes.'),
  subjects: z.array(z.string()).describe('List of subjects.'),
  timeSlots: z.array(z.string()).describe('List of available time slots for the day (e.g., "09:00 - 10:00").'),
  availability: z.record(z.string(), z.array(z.string())).describe('Teacher availability per day and time slot.'),
  subjectPriorities: z.record(z.string(), z.number()).describe('Subject priorities (higher number = higher priority).'),
  classRequirements: z.record(z.string(), z.array(z.string())).describe('Subjects required for each class.'),
  teacherSubjects: z.record(z.string(), z.array(z.string())).describe('Subjects each teacher is qualified to teach.'),
  teacherClasses: z.record(z.string(), z.array(z.string())).describe('Classes each teacher is qualified to teach.'),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const ScheduleEntrySchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
  timeSlot: z.string(),
  className: z.string(),
  subject: z.string(),
  teacher: z.string(),
});

const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleEntrySchema).describe("A flat list of all the scheduled classes for the week."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;


export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const generateSchedulePrompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: GenerateScheduleInputSchema},
  output: {schema: GenerateScheduleOutputSchema},
  prompt: `You are an AI assistant designed to generate class schedules for schools.

  Given the following information, create a schedule for Monday, Tuesday, Wednesday, Thursday, and Friday. The schedule should be a flat list of individual class bookings.

  Teacher Names: {{teacherNames}}
  Classes: {{classes}}
  Subjects: {{subjects}}
  Time Slots: {{timeSlots}}
  Teacher Availability: {{availability}}
  Subject Priorities: {{subjectPriorities}}
  Class Requirements: {{classRequirements}}
  Teacher-Subject Mapping: {{teacherSubjects}}
  Teacher-Class Mapping: {{teacherClasses}}

  When assigning a teacher to a class for a specific subject, you MUST ensure:
  1. The teacher is qualified to teach that subject based on the Teacher-Subject Mapping.
  2. The teacher is assigned to teach that class based on the Teacher-Class Mapping.

  If "Prayer" or "Lunch" are among the subjects, schedule them for all classes at the same time. No teacher is required for Prayer or Lunch. During these periods, all teachers are considered busy, so no other subjects should be scheduled for any class. For "Prayer" and "Lunch", the teacher can be "N/A".

  Constraint: Every teacher must be assigned at least one period each day across all classes, excluding Prayer and Lunch periods.

  Ensure that all class requirements are met and that higher priority subjects are scheduled appropriately.

  IMPORTANT: Your response MUST be a valid JSON object that strictly follows the provided output schema. Ensure every object in the 'schedule' array contains all the required fields: 'day', 'timeSlot', 'className', 'subject', and 'teacher'. Do not generate incomplete entries.
  `,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async input => {
    const {output} = await generateSchedulePrompt(input);
    return output!;
  }
);
