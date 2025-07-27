// This file implements the Genkit flow for the generateSchedule story.
// It allows teachers to automatically generate a draft schedule based on teacher availability, subject priorities, and class requirements.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateScheduleInputSchema = z.object({
  teacherNames: z.array(z.string()).describe('List of teacher names.'),
  classes: z.array(z.string()).describe('List of classes.'),
  subjects: z.array(z.string()).describe('List of subjects.'),
  availability: z.record(z.string(), z.array(z.string())).describe('Teacher availability per day and time slot.'),
  subjectPriorities: z.record(z.string(), z.number()).describe('Subject priorities (higher number = higher priority).'),
  classRequirements: z.record(z.string(), z.array(z.string())).describe('Subjects required for each class.'),
  teacherSubjects: z.record(z.string(), z.array(z.string())).describe('Subjects each teacher is qualified to teach.'),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const ScheduleEntrySchema = z.object({
  class: z.string(),
  subject: z.string(),
  teacher: z.string(),
});

const DayScheduleSchema = z.object({
  "09:00 - 10:00": z.union([ScheduleEntrySchema, z.null()]).optional(),
  "10:00 - 11:00": z.union([ScheduleEntrySchema, z.null()]).optional(),
  "11:00 - 12:00": z.union([ScheduleEntrySchema, z.null()]).optional(),
  "12:00 - 13:00": z.union([ScheduleEntrySchema, z.null()]).optional(),
  "13:00 - 14:00": z.union([ScheduleEntrySchema, z.null()]).optional(),
  "14:00 - 15:00": z.union([ScheduleEntrySchema, z.null()]).optional(),
  "15:00 - 16:00": z.union([ScheduleEntrySchema, z.null()]).optional(),
}).catchall(z.union([ScheduleEntrySchema, z.null()]));

const GenerateScheduleOutputSchema = z.object({
  schedule: z.object({
    Monday: DayScheduleSchema.optional(),
    Tuesday: DayScheduleSchema.optional(),
    Wednesday: DayScheduleSchema.optional(),
    Thursday: DayScheduleSchema.optional(),
    Friday: DayScheduleSchema.optional(),
    Saturday: DayScheduleSchema.optional(),
  }).catchall(DayScheduleSchema)
  .describe(
    'Generated schedule. The top-level keys are days of the week. The next level keys are time slots. The value is either a schedule entry or null if the slot is empty.'
  ),
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

  Given the following information, create a schedule for Monday, Tuesday, Wednesday, Thursday, and Friday.

  Teacher Names: {{teacherNames}}
  Classes: {{classes}}
  Subjects: {{subjects}}
  Teacher Availability: {{availability}}
  Subject Priorities: {{subjectPriorities}}
  Class Requirements: {{classRequirements}}
  Teacher-Subject Mapping: {{teacherSubjects}}

  When assigning a teacher to a class for a specific subject, you MUST ensure the teacher is qualified to teach that subject based on the Teacher-Subject Mapping.

  If "Lunch" is one of the subjects, schedule it for all classes at the same time. No teacher is required for Lunch. During the lunch period, no other subjects should be scheduled for any class. For lunch, the teacher can be "N/A".

  Constraint: Every teacher must be assigned at least one period each day across all classes.

  Ensure that all class requirements are met and that higher priority subjects are scheduled appropriately. For lunch, the teacher can be "N/A". If a slot is empty, return null.

  Return the schedule in a valid JSON format.
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
