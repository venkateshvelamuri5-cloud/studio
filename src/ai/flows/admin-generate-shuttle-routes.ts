'use server';
/**
 * @fileOverview High-fidelity AI agent for generating optimized mobility corridors.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ShuttleRouteSchema = z.object({
  routeName: z.string().describe('The name of the generated corridor.'),
  description: z.string().describe('Brief summary of the route purpose.'),
  stops: z.array(z.string()).describe('Ordered list of stops from Start to End.'),
  suggestedBaseFare: z.number().describe('The calculated base fare in ₹ based on distance and demand.'),
  schedule: z.string().describe('Operational frequency recommendation.'),
  estimatedDurationMinutes: z.number().describe('One-way duration in minutes.'),
  peakDemandCoverage: z.string().describe('How it handles high volume periods.'),
  aiJustification: z.string().describe('Reasoning for the fare and stops suggested.'),
});

const AdminGenerateShuttleRoutesInputSchema = z.object({
  startPoint: z.string().describe('The starting geographic node of the corridor.'),
  endPoint: z.string().describe('The terminal geographic node of the corridor.'),
  demandVolume: z.string().describe('Description of student/rider demand (e.g., "500+ daily", "High morning peak").'),
  trafficContext: z.string().describe('Traffic conditions like "Heavy at 9 AM", "Commercial zone delays".'),
  preferredServiceHours: z.string().optional().describe('Operational hours (e.g., "6 AM - 10 PM").'),
});
export type AdminGenerateShuttleRoutesInput = z.infer<typeof AdminGenerateShuttleRoutesInputSchema>;

const AdminGenerateShuttleRoutesOutputSchema = z.object({
  optimizedRoutes: z.array(ShuttleRouteSchema).describe('The newly architected corridor suggestions.'),
  optimizationSummary: z.string().describe('Overall strategy for this corridor.'),
});
export type AdminGenerateShuttleRoutesOutput = z.infer<typeof AdminGenerateShuttleRoutesOutputSchema>;

export async function generateShuttleRoutes(input: AdminGenerateShuttleRoutesInput): Promise<AdminGenerateShuttleRoutesOutput> {
  return adminGenerateShuttleRoutesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adminGenerateShuttleRoutesPrompt',
  input: { schema: AdminGenerateShuttleRoutesInputSchema },
  output: { schema: AdminGenerateShuttleRoutesOutputSchema },
  prompt: `You are the AAGO Grid Architect, a specialist in Indian urban mobility and corridor planning.
Your task is to design a high-efficiency mobility route between two specific points.

### Input Parameters:
- Start Node: {{{startPoint}}}
- End Node: {{{endPoint}}}
- Demand Context: {{{demandVolume}}}
- Traffic Context: {{{trafficContext}}}
{{#if preferredServiceHours}}
- Service Hours: {{{preferredServiceHours}}}
{{/if}}

### Your Architecture Guidelines:
1. **Node Selection**: Identify logical intermediate stops based on common commute patterns in an Indian city context.
2. **Fare Calculation**: Suggest a 'suggestedBaseFare' in ₹. Base it on typical segment lengths (usually ₹15-20 per 5km) but adjust for demand complexity.
3. **Efficiency**: Ensure the route estimatedDurationMinutes accounts for the traffic context provided.
4. **Naming**: Create a professional corridor name (e.g., "Tech-City Express", "Central-Market Hub").

Generate 1-2 variations of the optimized corridor. Provide a justification for the fare choice based on the demand.
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
    if (!output) throw new Error('Grid Architect failed to respond.');
    return output;
  }
);
