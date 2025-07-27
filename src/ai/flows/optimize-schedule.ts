'use server';

/**
 * @fileOverview An AI agent that optimizes the class schedule based on teacher feedback.
 *
 * - optimizeSchedule - A function that optimizes the class schedule.
 * - OptimizeScheduleInput - The input type for the optimizeSchedule function.
 * - OptimizeScheduleOutput - The return type for the optimizeSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeScheduleInputSchema = z.object({
  scheduleData: z
    .string()
    .describe('The current class schedule data in JSON format.'),
  teacherFeedback: z
    .string()
    .describe('Teacher feedback on the current schedule.'),
  constraints: z
    .string()
    .describe('Constraints for the schedule optimization.'),
});
export type OptimizeScheduleInput = z.infer<typeof OptimizeScheduleInputSchema>;

const OptimizeScheduleOutputSchema = z.object({
  optimizedSchedule: z
    .string()
    .describe('The optimized class schedule in JSON format.'),
  summary: z
    .string()
    .describe('A summary of the changes made to the schedule.'),
});
export type OptimizeScheduleOutput = z.infer<typeof OptimizeScheduleOutputSchema>;

export async function optimizeSchedule(input: OptimizeScheduleInput): Promise<OptimizeScheduleOutput> {
  return optimizeScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeSchedulePrompt',
  input: {schema: OptimizeScheduleInputSchema},
  output: {schema: OptimizeScheduleOutputSchema},
  prompt: `You are an AI assistant that optimizes class schedules based on teacher feedback and constraints.

You will receive the current class schedule, teacher feedback, and constraints for the schedule.

Based on this information, you will optimize the schedule to minimize conflicts and maximize resource utilization.

Current Schedule:
{{{scheduleData}}}

Teacher Feedback:
{{{teacherFeedback}}}

Constraints:
{{{constraints}}}

Output the optimized schedule in JSON format.
Also provide a summary of the changes made to the schedule.

Ensure the optimized schedule adheres to the provided constraints and addresses the teacher feedback.
`,
});

const optimizeScheduleFlow = ai.defineFlow(
  {
    name: 'optimizeScheduleFlow',
    inputSchema: OptimizeScheduleInputSchema,
    outputSchema: OptimizeScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
