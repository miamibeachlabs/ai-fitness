import type { Assessment } from './Assessment.ts';
import type { AssessmentContent, Identifier } from '../content/AssessmentContent.ts';
const indexById = <T extends { id: Identifier }>(items: readonly T[]): Readonly<Record<Identifier, T>> => Object.fromEntries(items.map(item => [item.id, item]));
export type Diagnosis = Readonly<{
  persona: string;
  personaDescription: string;
  profile: string;
  profileDescription: string;
  sports: readonly string[];
  diagnosis: string;
}>;

export const describe = (content: AssessmentContent, result: Assessment): Diagnosis => {
  const capacities = indexById(content.ontology.capacities), persona = content.profiles.personas[result.personaId];
  const sports = content.ontology.sports.filter(sport => (result.goals[sport.id] ?? 0) > 0)
    .sort((left, right) => result.goals[right.id] - result.goals[left.id]).map(({ name }) => name);
  const direction = sports.length ? `for ${sports.map(name => name.toLowerCase()).join(' and ')}` : 'for your goals';
  const opportunity = result.opportunities[0];
  const prescription = opportunity
    ? `Your next useful move ${direction} is to train ${capacities[opportunity.id].name.toLowerCase()} through real work—not study it in the abstract.`
    : `Your current profile already meets the broad targets ${direction}; the useful move now is deeper sport-specific practice.`;
  const profile = content.profiles.generalProfiles[result.profileId];
  return {
    persona: persona.name,
    personaDescription: persona.description,
    profile: profile.name,
    profileDescription: profile.description,
    sports,
    diagnosis: prescription,
  };
};

export const profileText = (content: AssessmentContent, result: Assessment): string => {
  const capacities = indexById(content.ontology.capacities), compounds = indexById(content.ontology.compounds), view = describe(content, result);
  return `AI FITNESS PROFILE v${result.version}\n\nPersona: ${view.persona}\n${view.personaDescription}\nGeneral profile: ${view.profile}\n${view.profileDescription}\nAI sports: ${view.sports.join(', ') || 'Not specified'}\n\nCAPACITIES\n${result.capacities.map(({ id, score }) => `- ${capacities[id].name}: ${score}/100 — ${capacities[id].description}`).join('\n')}\n\nCOMPOUND CAPACITIES\n${result.compounds.map(({ id, score }) => `- ${compounds[id].name}: ${score}/100`).join('\n')}\n\nTRAINING OPPORTUNITIES\n${result.opportunities.map(({ id, score, gap }) => `- ${capacities[id].name}: current ${score}, goal-adjusted gap ${gap}`).join('\n') || '- Maintain and deepen current practice'}\n\nDIAGNOSIS\n${view.diagnosis}\n\nMachine-readable profile:\n${JSON.stringify(result, null, 2)}`;
};
