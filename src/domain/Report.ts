import type { Assessment, Opportunity, Score } from './Assessment.ts';
import type { AssessmentContent, Identifier } from '../content/AssessmentContent.ts';

const indexById = <T extends { id: Identifier }>(items: readonly T[]): Readonly<Record<Identifier, T>> =>
  Object.fromEntries(items.map(item => [item.id, item]));

export type Priority = Readonly<{ id: Identifier; name: string; relevance: number; level: string }>;
export type TrainingRead = Readonly<{
  lowest: Score;
  gaps: readonly Opportunity[];
  primaryPriorities: readonly Priority[];
  direction: 'capacity' | 'domain';
}>;
export type Report = Readonly<{
  persona: string;
  personaDescription: string;
  profile: string;
  profileDescription: string;
  priorities: readonly Priority[];
  training: TrainingRead;
}>;

const lowestScore = (scores: readonly Score[]): Score =>
  scores.reduce((lowest, score) => score.score < lowest.score ? score : lowest);

export const describe = (content: AssessmentContent, result: Assessment): Report => {
  const persona = content.profiles.personas[result.personaId];
  const profile = content.profiles.generalProfiles[result.profileId];
  const priorities = content.ontology.domains
    .flatMap(domain => {
      const relevance = result.goals[domain.id] ?? 0;
      return relevance > 0
        ? [{ id: domain.id, name: domain.name, relevance, level: content.interface.goals.levels[relevance] }]
        : [];
    })
    .sort((left, right) => right.relevance - left.relevance);
  const highestRelevance = priorities[0]?.relevance;

  return {
    persona: persona.name,
    personaDescription: persona.description,
    profile: profile.name,
    profileDescription: profile.description,
    priorities,
    training: {
      lowest: lowestScore(result.capacities),
      gaps: result.opportunities,
      primaryPriorities: priorities.filter(priority => priority.relevance === highestRelevance).slice(0, 3),
      direction: result.opportunities.length ? 'capacity' : 'domain',
    },
  };
};

const readableGaps = (content: AssessmentContent, gaps: readonly Opportunity[]): string => {
  const capacities = indexById(content.ontology.capacities);
  return gaps.length ? gaps.map(({ id, gap }) => `${capacities[id].name} +${gap}`).join(', ') : content.interface.results.none;
};

const readablePriorities = (content: AssessmentContent, priorities: readonly Priority[]): string =>
  priorities.length ? priorities.map(({ name }) => name).join(', ') : content.interface.results.notSpecified;

export const profileText = (content: AssessmentContent, result: Assessment): string => {
  const capacities = indexById(content.ontology.capacities);
  const compounds = indexById(content.ontology.compounds);
  const view = describe(content, result);
  const copy = content.interface.results;

  return `AI FITNESS PROFILE\n\nPersona: ${view.persona}\n${view.personaDescription}\nGeneral profile: ${view.profile}\n${view.profileDescription}\n\n${copy.prioritiesHeading.toUpperCase()}\n${view.priorities.map(({ name, level }) => `- ${name}: ${level}`).join('\n') || `- ${copy.notSpecified}`}\n\nCAPACITIES\n${result.capacities.map(({ id, score }) => `- ${capacities[id].name}: ${score}/100 — ${capacities[id].description}`).join('\n')}\n\nCOMPOUND CAPACITIES\n${result.compounds.map(({ id, score }) => `- ${compounds[id].name}: ${score}/100 — ${compounds[id].description}`).join('\n')}\n\n${copy.trainingRead.toUpperCase()}\n${copy.generalFitness}: ${view.profile}\n${copy.lowestCapacity}: ${capacities[view.training.lowest.id].name} · ${view.training.lowest.score}/100\n${copy.goalAdjustedGaps}: ${readableGaps(content, view.training.gaps)}\n${copy.primaryPriorities}: ${readablePriorities(content, view.training.primaryPriorities)}\n${copy.trainingDirection}: ${view.training.direction === 'capacity' ? copy.capacityDirection : copy.domainDirection}`;
};

export const profileDataText = (result: Assessment): string => JSON.stringify({
  assessedAt: result.assessedAt,
  capacities: Object.fromEntries(result.capacities.map(({ id, score }) => [id, score])),
  persona: result.personaId,
  profile: result.profileId,
  goals: Object.fromEntries(Object.entries(result.goals).filter(([, relevance]) => relevance > 0)),
}, null, 2);
