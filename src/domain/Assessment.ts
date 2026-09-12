import type { AssessmentContent, Evidence, Identifier, PersonaKind, PersonaTrait } from '../content/AssessmentContent.ts';

export type Answers = Readonly<{
  goals: Readonly<Record<Identifier, number>>;
  questions: Readonly<Record<Identifier, number>>;
}>;
export type Score = Readonly<{ id: Identifier; score: number }>;
export type Opportunity = Readonly<{ id: Identifier; score: number; target: number; gap: number }>;
export type PersonaMatch = Readonly<{ id: Identifier; kind: PersonaKind; resemblance: number }>;
export type Assessment = Readonly<{
  assessedAt: string; capacities: readonly Score[]; compounds: readonly Score[];
  context: readonly Score[]; goals: Readonly<Record<Identifier, number>>; targets: readonly Score[]; compoundTargets: readonly Score[];
  personaMatches: readonly PersonaMatch[]; profileId: Identifier; strongest: Score; opportunities: readonly Opportunity[];
}>;

const percentage = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const mean = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
const scoreEvidence = (ids: readonly Identifier[], evidence: readonly Evidence[]): readonly Score[] =>
  ids.map(id => {
    const values = evidence.flatMap(item => item[id] === undefined ? [] : [item[id]]);
    return { id, score: values.length ? percentage(mean(values) * 25) : 0 };
  });
const byId = (scores: readonly Score[]): Readonly<Record<Identifier, number>> =>
  Object.fromEntries(scores.map(({ id, score }) => [id, score]));

const compoundProfile = (content: AssessmentContent, capacityScores: Readonly<Record<Identifier, number>>): readonly Score[] =>
  content.ontology.compounds.map(compound => ({
    id: compound.id,
    score: percentage(mean(compound.capacities.map(id => capacityScores[id]))),
  }));

const targetProfile = (content: AssessmentContent, goals: Answers['goals']): readonly Score[] =>
  content.ontology.capacities.map(capacity => {
    const weighted = content.ontology.domains.flatMap(domain => {
      const relevance = goals[domain.id] ?? 0;
      return relevance === 0 ? [] : [{ relevance, target: (domain.targets[capacity.id] ?? 2) * 25 }];
    });
    const score = weighted.length
      ? weighted.reduce((sum, item) => sum + item.relevance * item.target, 0) /
        weighted.reduce((sum, item) => sum + item.relevance, 0)
      : 55;
    return { id: capacity.id, score: percentage(score) };
  });

const selectProfile = (scores: Readonly<Record<Identifier, number>>): Identifier => {
  const values = Object.values(scores), average = mean(values), spread = Math.max(...values) - Math.min(...values);
  if (average >= 82 && Math.min(...values) >= 65) return 'elite';
  if (spread > 42 && Math.max(...values) >= 70) return 'specialized';
  if (average >= 65 && spread < 28) return 'balanced';
  return average >= 42 ? 'developing' : 'foundation';
};

type PersonaEvidence = Readonly<Record<PersonaTrait['source'], Readonly<Record<Identifier, number>>>>;

const observedLevel = (score: number): number => percentage((score - 25) / 75 * 100);

const resemblance = (trait: PersonaTrait, evidence: PersonaEvidence): number => {
  const level = evidence[trait.source][trait.measure] ?? 0;
  if (trait.target !== undefined) return 100 - Math.abs(level - trait.target);
  return trait.direction === 'high' ? level : 100 - level;
};

const matchPersonas = (
  content: AssessmentContent,
  capacities: readonly Score[],
  compounds: readonly Score[],
  context: readonly Score[],
  goals: Answers['goals'],
): readonly PersonaMatch[] => {
  const capacityScores = capacities.map(({ id, score }) => [id, observedLevel(score)] as const);
  const compoundScores = compounds.map(({ id, score }) => [id, observedLevel(score)] as const);
  const contextScores = context.map(({ id, score }) => [id, observedLevel(score)] as const);
  const rawCapacityScores = capacities.map(({ score }) => score);
  const evidence: PersonaEvidence = {
    capacity: Object.fromEntries(capacityScores),
    compound: Object.fromEntries(compoundScores),
    context: Object.fromEntries(contextScores),
    goal: Object.fromEntries(Object.entries(goals).map(([id, level]) => [id, level * 25])),
    summary: {
      average: observedLevel(mean(rawCapacityScores)),
      minimum: observedLevel(Math.min(...rawCapacityScores)),
      spread: percentage((Math.max(...rawCapacityScores) - Math.min(...rawCapacityScores)) / 75 * 100),
    },
  };

  const matches = content.personaModel.patterns
    .map(pattern => {
      const totalWeight = pattern.traits.reduce((sum, trait) => sum + trait.weight, 0);
      const score = pattern.traits.reduce((sum, trait) => sum + resemblance(trait, evidence) * trait.weight, 0) / totalWeight;
      return { id: pattern.persona, kind: pattern.kind, resemblance: percentage(score), threshold: pattern.threshold };
    })
    .filter(match => match.resemblance >= match.threshold)
    .sort((left, right) => right.resemblance - left.resemblance);
  const archetypes = matches.filter(({ kind }) => kind === 'archetype').slice(0, content.personaModel.maxArchetypes);
  const cautions = matches.filter(({ kind }) => kind === 'caution');
  return [...archetypes, ...cautions].map(({ id, kind, resemblance: score }) => ({ id, kind, resemblance: score }));
};

export const assess = (content: AssessmentContent, answers: Answers): Assessment => {
  const observations = content.questions.flatMap(question => {
    const answer = question.answers[answers.questions[question.id]];
    return answer ? [answer] : [];
  });
  const capacities = scoreEvidence(content.ontology.capacities.map(({ id }) => id), observations.map(({ capacity }) => capacity ?? {}));
  const contexts = scoreEvidence(content.ontology.contexts.map(({ id }) => id), observations.map(({ context }) => context ?? {}));
  const capacityScores = byId(capacities), contextScores = byId(contexts), targets = targetProfile(content, answers.goals), targetScores = byId(targets);
  const opportunities = capacities.map(({ id, score }) => ({ id, score, target: targetScores[id], gap: targetScores[id] - score }))
    .filter(({ gap }) => gap > 5).sort((left, right) => right.gap - left.gap).slice(0, 3);
  const strongest = capacities.reduce((best, score) => score.score > best.score ? score : best);
  const compounds = compoundProfile(content, capacityScores);
  const compoundTargets = compoundProfile(content, targetScores);
  return { assessedAt: new Date().toISOString(), capacities, compounds, context: contexts,
    goals: answers.goals, targets, compoundTargets, personaMatches: matchPersonas(content, capacities, compounds, contexts, answers.goals), profileId: selectProfile(capacityScores), strongest, opportunities };
};
