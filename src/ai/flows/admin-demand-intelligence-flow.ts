'use server';
/**
 * @fileOverview AI agent for analyzing grid demand pools and suggesting high-demand hotspots.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DemandHotspotSchema = z.object({
  locationName: z.string().describe('The name of the geographic hotspot.'),
  demandLevel: z.enum(['CRITICAL', 'HIGH', 'MODERATE']).describe('The intensity of unmet demand.'),
  unmetRiderCount: z.string().describe('Estimated number of riders seeking transport here.'),
  recommendedCorridor: z.string().describe('Suggested route name to service this hotspot.'),
  justification: z.string().describe('Why this area is identified as a priority.'),
});

const DemandIntelligenceInputSchema = z.object({
  gridSnapshot: z.string().describe('Summary of current active missions and filled vs empty seats.'),
  unmetRequests: z.string().describe('Description of rider searches or requests that did not match existing routes.'),
  externalContext: z.string().optional().describe('External factors like events, weather, or peak office hours.'),
});
export type DemandIntelligenceInput = z.infer<typeof DemandIntelligenceInputSchema>;

const DemandIntelligenceOutputSchema = z.object({
  hotspots: z.array(DemandHotspotSchema).describe('Identified high-demand geographic clusters.'),
  strategicSummary: z.string().describe('High-level overview of the grid demand state.'),
  actionPlan: z.string().describe('Concrete steps for the administrator to optimize fleet yield.'),
});
export type DemandIntelligenceOutput = z.infer<typeof DemandIntelligenceOutputSchema>;

export async function analyzeDemandIntelligence(input: DemandIntelligenceInput): Promise<DemandIntelligenceOutput> {
  return adminDemandIntelligenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adminDemandIntelligencePrompt',
  input: { schema: DemandIntelligenceInputSchema },
  output: { schema: DemandIntelligenceOutputSchema },
  prompt: `You are the AAGO Grid Intelligence Agent. Your goal is to maximize vehicle utilization and identify revenue-rich corridors.

### Current Grid Snapshot:
{{{gridSnapshot}}}

### Unmet Rider Requests:
{{{unmetRequests}}}

{{#if externalContext}}
### External Context:
{{{externalContext}}}
{{/if}}

### Your Objectives:
1. **Identify Clusters**: Group unmet requests into logical geographic hotspots.
2. **Prioritize Yield**: Suggest where a new 7-seater corridor would fill the fastest.
3. **Sequential Logic**: Avoid suggesting fragmented routes; focus on corridors that can be cluster-filled.
4. **Actionable Steps**: Provide specific instructions on which landmarks to link.

Analyze the data and provide a high-fidelity intelligence report.`,
});

const adminDemandIntelligenceFlow = ai.defineFlow(
  {
    name: 'adminDemandIntelligenceFlow',
    inputSchema: DemandIntelligenceInputSchema,
    outputSchema: DemandIntelligenceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Demand Intelligence failed to synthesize report.');
    return output;
  }
);
