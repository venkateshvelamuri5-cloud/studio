'use server';
/**
 * @fileOverview An AI agent for generating and optimizing shuttle routes.
 *
 * - generateShuttleRoutes - A function that handles the shuttle route generation process.
 * - AdminGenerateShuttleRoutesInput - The input type for the generateShuttleRoutes function.
 * - AdminGenerateShuttleRoutesOutput - The return type for the generateShuttleRoutes function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ShuttleRouteSchema = z.object({
  routeName: z.string().describe('The name of the generated shuttle route.'),
  description: z
    .string()
    .describe('A brief summary and description of the route, including its purpose.'),
  stops: z.array(z.string()).describe('An ordered list of stops for this route.'),
  schedule: z
    .string()
    .describe('The operational schedule for this route, e.g., "Every 15 minutes from 6 AM to 11 PM".'),
  estimatedDurationMinutes: z.number().describe('The estimated one-way duration of the route in minutes.'),
  peakDemandCoverage: z
    .string()
    .describe(
      'Description of how well this route covers student demand during peak hours, e.g., "Covers 90% of morning peak demand from North Campus to Main Library".'
    ),
  notes: z.string().optional().describe('Any specific recommendations, considerations, or warnings for this route.'),
});

const AdminGenerateShuttleRoutesInputSchema = z.object({
  studentDemandPatterns: z
    .string()
    .describe(
      'A detailed description of student demand patterns, including locations, times, and volume, e.g., "high demand from North Campus to Main Library during morning peak hours (8-10 AM) and evening (4-6 PM), moderate demand from dorms to athletic facilities on weekends".'
    ),
  historicalTrafficData: z
    .string()
    .describe(
      'Summary of historical traffic conditions, e.g., "heavy congestion on Elm Street between 7-9 AM and 5-7 PM, light traffic on weekends, moderate traffic near downtown during lunch".'
    ),
  preferredServiceHours: z
    .string()
    .describe('The preferred operational hours for shuttle services, e.g., "Monday-Friday, 6 AM to 11 PM; Saturday-Sunday, 8 AM to 9 PM".'),
  currentRoutesDescription: z
    .string()
    .optional()
    .describe('A description of existing routes, their coverage, and any known performance issues or areas for improvement, if applicable.'),
  numberOfShuttlesAvailable: z
    .number()
    .optional()
    .describe('The total number of shuttles available for deployment across all routes.'),
  maxRouteDurationMinutes: z
    .number()
    .optional()
    .describe('The maximum desired duration for a single route from start to end in minutes, if any.'),
});
export type AdminGenerateShuttleRoutesInput = z.infer<
  typeof AdminGenerateShuttleRoutesInputSchema
>;

const AdminGenerateShuttleRoutesOutputSchema = z.object({
  optimizedRoutes: z
    .array(ShuttleRouteSchema)
    .describe('An array of newly generated or optimized shuttle route configurations.'),
  optimizationSummary: z
    .string()
    .describe(
      'A summary of the overall optimization strategy applied and the key benefits of the generated routes, considering all input factors.'
    ),
  potentialIssues: z
    .string()
    .optional()
    .describe('Any potential issues, trade-offs, or areas that might require further manual review or adjustment for the generated routes.'),
});
export type AdminGenerateShuttleRoutesOutput = z.infer<
  typeof AdminGenerateShuttleRoutesOutputSchema
>;

export async function generateShuttleRoutes(
  input: AdminGenerateShuttleRoutesInput
): Promise<AdminGenerateShuttleRoutesOutput> {
  return adminGenerateShuttleRoutesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adminGenerateShuttleRoutesPrompt',
  input: { schema: AdminGenerateShuttleRoutesInputSchema },
  output: { schema: AdminGenerateShuttleRoutesOutputSchema },
  prompt: `You are an expert transportation planner tasked with optimizing a shuttle service.
Your goal is to generate new and optimized shuttle routes based on the provided data.
Consider student demand patterns, historical traffic data, and preferred service hours to create efficient and effective routes.

### Input Data:

Student Demand Patterns: {{{studentDemandPatterns}}}

Historical Traffic Data: {{{historicalTrafficData}}}

Preferred Service Hours: {{{preferredServiceHours}}}

{{#if currentRoutesDescription}}
Current Existing Routes and Performance: {{{currentRoutesDescription}}}
{{/if}}

{{#if numberOfShuttlesAvailable}}
Number of Shuttles Available: {{{numberOfShuttlesAvailable}}}
{{/if}}

{{#if maxRouteDurationMinutes}}
Maximum Desired Route Duration: {{{maxRouteDurationMinutes}}} minutes
{{/if}}

### Task:

Generate a set of optimized shuttle routes. For each route, provide:
- A unique route name.
- A clear description of the route and its primary purpose.
- An ordered list of stops.
- Its operational schedule.
- The estimated one-way duration in minutes.
- A description of how it addresses peak student demand.
- Any specific notes or considerations.

Also, provide an overall summary of your optimization strategy and highlight any potential issues or trade-offs.

Ensure the output strictly adheres to the provided JSON schema.
`,
});

const adminGenerateShuttleRoutesFlow = ai.defineFlow(
  {
    name: 'adminGenerateShuttleRoutesFlow',
    inputSchema: AdminGenerateShuttleRoutesInputSchema,
    outputSchema: AdminGenerateShuttleRoutesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate shuttle routes. No output from prompt.');
    }
    return output;
  }
);
