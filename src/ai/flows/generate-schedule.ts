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
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const GenerateScheduleOutputSchema = z.object({
  schedule: z.record(z.string(), z.record(z.string(), z.string().nullable())).describe('Generated schedule (day -> time slot -> class -> subject or null if empty).'),
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

  Given the following information, create a schedule that optimizes for subject priorities and teacher availability.

  Teacher Names: {{teacherNames}}
  Classes: {{classes}}
  Subjects: {{subjects}}
  Teacher Availability: {{availability}}
  Subject Priorities: {{subjectPriorities}}
  Class Requirements: {{classRequirements}}

  Ensure that all class requirements are met and that higher priority subjects are scheduled appropriately.

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
