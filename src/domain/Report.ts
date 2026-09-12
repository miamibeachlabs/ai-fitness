import type { Assessment, Opportunity, Score } from './Assessment.ts';
import type { AssessmentContent, Identifier } from '../content/AssessmentContent.ts';

const indexById = <T extends { id: Identifier }>(items: readonly T[]): Readonly<Record<Identifier, T>> =>
  Object.fromEntries(items.map(item => [item.id, item]));

export type Priority = Readonly<{ id: Identifier; name: string; relevance: number; level: string }>;
export type PersonaView = Readonly<{
  id: Identifier;
  name: string;
  description: string;
  kind: 'archetype' | 'caution';
  resemblance: number;
}>;
export type TrainingRead = Readonly<{
  lowest: Score;
  gaps: readonly Opportunity[];
  primaryPriorities: readonly Priority[];
  direction: 'capacity' | 'domain';
}>;
export type Report = Readonly<{
  profile: string;
  profileDescription: string;
  personaMatches: readonly PersonaView[];
  priorities: readonly Priority[];
  training: TrainingRead;
}>;

const lowestScore = (scores: readonly Score[]): Score =>
  scores.reduce((lowest, score) => score.score < lowest.score ? score : lowest);

export const describe = (content: AssessmentContent, result: Assessment): Report => {
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
    profile: profile.name,
    profileDescription: profile.description,
    personaMatches: result.personaMatches.map(match => ({
      ...match,
      ...content.profiles.personas[match.id],
    })),
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
  const archetypes = view.personaMatches.filter(({ kind }) => kind === 'archetype');
  const cautions = view.personaMatches.filter(({ kind }) => kind === 'caution');
  const personaLines = (matches: readonly PersonaView[]) => matches.map(({ name, description, resemblance }) =>
    `- ${name}: ${resemblance}% resemblance — ${description}`
  );
  const priorities = view.priorities.map(({ name, level }) => `- ${name}: ${level}`);
  const capacityLines = result.capacities.map(({ id, score }) =>
    `- ${capacities[id].name}: ${score}/100 — ${capacities[id].description}`
  );
  const compoundLines = result.compounds.map(({ id, score }) =>
    `- ${compounds[id].name}: ${score}/100 — ${compounds[id].description}`
  );

  return [
    'AI FITNESS PROFILE',
    '',
    `General profile: ${view.profile}`,
    view.profileDescription,
    ...(archetypes.length ? ['', copy.patternsHeading.toUpperCase(), ...personaLines(archetypes)] : []),
    ...(cautions.length ? ['', copy.cautionsHeading.toUpperCase(), ...personaLines(cautions)] : []),
    '',
    copy.prioritiesHeading.toUpperCase(),
    ...(priorities.length ? priorities : [`- ${copy.notSpecified}`]),
    '',
    'CAPACITIES',
    ...capacityLines,
    '',
    'COMPOUND CAPACITIES',
    ...compoundLines,
    '',
    copy.trainingRead.toUpperCase(),
    `${copy.generalFitness}: ${view.profile}`,
    `${copy.lowestCapacity}: ${capacities[view.training.lowest.id].name} · ${view.training.lowest.score}/100`,
    `${copy.goalAdjustedGaps}: ${readableGaps(content, view.training.gaps)}`,
    `${copy.primaryPriorities}: ${readablePriorities(content, view.training.primaryPriorities)}`,
    `${copy.trainingDirection}: ${view.training.direction === 'capacity' ? copy.capacityDirection : copy.domainDirection}`,
  ].join('\n');
};

export const profileDataText = (result: Assessment): string => JSON.stringify({
  assessedAt: result.assessedAt,
  capacities: Object.fromEntries(result.capacities.map(({ id, score }) => [id, score])),
  personas: result.personaMatches,
  profile: result.profileId,
  goals: Object.fromEntries(Object.entries(result.goals).filter(([, relevance]) => relevance > 0)),
}, null, 2);
