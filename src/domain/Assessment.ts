import type { AssessmentContent, Evidence, Identifier } from '../content/AssessmentContent.ts';

export type Answers = Readonly<{
  goals: Readonly<Record<Identifier, number>>;
  questions: Readonly<Record<Identifier, number>>;
}>;
export type Score = Readonly<{ id: Identifier; score: number }>;
export type Opportunity = Readonly<{ id: Identifier; score: number; target: number; gap: number }>;
export type Assessment = Readonly<{
  version: string; assessedAt: string; capacities: readonly Score[]; compounds: readonly Score[];
  context: readonly Score[]; goals: Readonly<Record<Identifier, number>>; targets: readonly Score[];
  personaId: Identifier; profileId: Identifier; strongest: Score; opportunities: readonly Opportunity[];
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

const targetProfile = (content: AssessmentContent, goals: Answers['goals']): readonly Score[] =>
  content.ontology.capacities.map(capacity => {
    const weighted = content.ontology.sports.flatMap(sport => {
      const relevance = goals[sport.id] ?? 0;
      return relevance === 0 ? [] : [{ relevance, target: (sport.targets[capacity.id] ?? 2) * 25 }];
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

const selectPersona = (scores: Readonly<Record<Identifier, number>>, context: Readonly<Record<Identifier, number>>): Identifier => {
  if ((context.activity ?? 0) <= 20 && Math.max(...Object.values(scores)) < 45) return 'walker';
  if (scores.strength > 72 && scores.range < 48) return 'powerlifter';
  if (scores.sense > 72 && scores.strength > 62 && scores.agency > 55) return 'sprinter';
  if (scores.agency > 70 && scores.judgment < 45) return 'recklessPowerlifter';
  if (scores.integration > 72 && scores.judgment < 48) return 'dependentAthlete';
  if (scores.range > 72 && scores.strength < 50) return 'aiYogi';
  if (Math.min(...Object.values(scores)) > 60) return 'crossTrainer';
  if ((context.activity ?? 0) >= 60 && scores.sense < 50) return 'plateauedRegular';
  return 'developingGeneralist';
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
  const compounds = content.ontology.compounds.map(compound => ({ id: compound.id, score: percentage(mean(compound.capacities.map(id => capacityScores[id]))) }));
  return { version: content.ontology.version, assessedAt: new Date().toISOString(), capacities, compounds, context: contexts,
    goals: answers.goals, targets, personaId: selectPersona(capacityScores, contextScores), profileId: selectProfile(capacityScores), strongest, opportunities };
};
