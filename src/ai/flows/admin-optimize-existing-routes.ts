'use server';
/**
 * @fileOverview An AI agent for optimizing existing shuttle routes and schedules.
 *
 * - adminOptimizeExistingRoutes - A function that handles the route optimization process.
 * - AdminOptimizeExistingRoutesInput - The input type for the adminOptimizeExistingRoutes function.
 * - AdminOptimizeExistingRoutesOutput - The return type for the adminOptimizeExistingRoutes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdminOptimizeExistingRoutesInputSchema = z.object({
  currentRoutesAndSchedules: z
    .string()
    .describe(
      'A detailed description or JSON representation of the current shuttle routes and schedules, including route names, stops, times, and vehicle assignments.'
    ),
  realtimeTrafficConditions: z
    .string()
    .describe(
      'A description of current real-time traffic conditions, including specific incidents, general congestion levels, or any other relevant traffic information.'
    ),
  studentDemandPatterns: z
    .string()
    .describe(
      'Information about recent student demand patterns, such as booking trends, peak usage times, shifts in popular routes, or any changes in student preferences.'
    ),
});
export type AdminOptimizeExistingRoutesInput = z.infer<
  typeof AdminOptimizeExistingRoutesInputSchema
>;

const AdminOptimizeExistingRoutesOutputSchema = z.object({
  optimizationSuggestions: z
    .string()
    .describe(
      'Specific, actionable suggestions for optimizing the existing shuttle routes and schedules.'
    ),
  justification: z
    .string()
    .describe('An explanation and reasoning behind the provided optimization suggestions.'),
});
export type AdminOptimizeExistingRoutesOutput = z.infer<
  typeof AdminOptimizeExistingRoutesOutputSchema
>;

export async function adminOptimizeExistingRoutes(
  input: AdminOptimizeExistingRoutesInput
): Promise<AdminOptimizeExistingRoutesOutput> {
  return adminOptimizeExistingRoutesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adminOptimizeExistingRoutesPrompt',
  input: {schema: AdminOptimizeExistingRoutesInputSchema},
  output: {schema: AdminOptimizeExistingRoutesOutputSchema},
  prompt: `You are an expert logistics and route optimization specialist for a student shuttle service.

Given the following information, provide detailed and actionable suggestions to optimize the existing shuttle routes and schedules. Your goal is to improve service efficiency, reduce delays, and better meet student demand.

### Current Routes and Schedules:
{{{currentRoutesAndSchedules}}}

### Real-time Traffic Conditions:
{{{realtimeTrafficConditions}}}

### Student Demand Patterns:
{{{studentDemandPatterns}}}

Carefully analyze the provided data and propose concrete changes to routes, stop times, frequency, or vehicle assignments. Also, provide a clear justification for each suggestion based on the inputs.
`,
});

const adminOptimizeExistingRoutesFlow = ai.defineFlow(
  {
    name: 'adminOptimizeExistingRoutesFlow',
    inputSchema: AdminOptimizeExistingRoutesInputSchema,
    outputSchema: AdminOptimizeExistingRoutesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
