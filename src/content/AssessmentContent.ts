export type Identifier = string;
export type Evidence = Readonly<Record<Identifier, number>>;
export type NamedConcept = Readonly<{ id: Identifier; name: string; description: string }>;
export type GoalDomain = Readonly<{ id: Identifier; name: string; targets: Evidence }>;
export type Answer = Readonly<{ text: string; capacity?: Evidence; context?: Evidence }>;
export type Question = Readonly<{ id: Identifier; category: string; prompt: string; answers: readonly Answer[] }>;
export type Profile = Readonly<{ name: string; description: string }>;
export type PersonaKind = 'archetype' | 'caution';
type PersonaMeasure = Readonly<{
  source: 'capacity' | 'compound' | 'context' | 'goal' | 'summary';
  measure: Identifier;
  weight: number;
}>;
export type PersonaTrait = PersonaMeasure & (
  | Readonly<{ direction: 'high' | 'low'; target?: never }>
  | Readonly<{ target: number; direction?: never }>
);
export type PersonaPattern = Readonly<{
  persona: Identifier;
  kind: PersonaKind;
  threshold: number;
  traits: readonly PersonaTrait[];
}>;
export type ResultsCopy = Readonly<{
  heading: string;
  patternsHeading: string;
  cautionsHeading: string;
  resemblance: string;
  trainingRead: string;
  strongest: string;
  opportunity: string;
  capacityChart: string;
  compoundChart: string;
  prioritiesHeading: string;
  prioritiesPrompt: string;
  generalFitness: string;
  lowestCapacity: string;
  goalAdjustedGaps: string;
  primaryPriorities: string;
  trainingDirection: string;
  capacityDirection: string;
  domainDirection: string;
  copy: string;
  copyData: string;
  copied: string;
  dataCopied: string;
  none: string;
  notSpecified: string;
  targetsMet: string;
}>;

export type AssessmentContent = Readonly<{
  ontology: Readonly<{
    capacities: readonly NamedConcept[];
    contexts: readonly NamedConcept[];
    compounds: readonly (NamedConcept & { capacities: readonly Identifier[] })[];
    domains: readonly GoalDomain[];
  }>;
  questions: readonly Question[];
  profiles: Readonly<{
    personas: Readonly<Record<Identifier, Readonly<{ name: string; description: string }>>>;
    generalProfiles: Readonly<Record<Identifier, Profile>>;
  }>;
  personaModel: Readonly<{ maxArchetypes: number; patterns: readonly PersonaPattern[] }>;
  interface: Readonly<{
    app: Readonly<{ assessmentLabel: string; introduction: string; privacy: string; principles: readonly string[] }>;
    goals: Readonly<{ category: string; prompt: string; hint: string; levels: readonly string[] }>;
    results: ResultsCopy;
  }>;
}>;

export const validateContent = (value: unknown): AssessmentContent => {
  const content = value as Partial<AssessmentContent>;
  if (!content.ontology || !content.questions || !content.profiles || !content.personaModel || !content.interface)
    throw new Error('Assessment content requires ontology, questions, profiles, persona model, and interface documents.');

  const capacityIds = new Set(content.ontology.capacities.map(({ id }) => id));
  const contextIds = new Set(content.ontology.contexts.map(({ id }) => id));
  const compoundIds = new Set(content.ontology.compounds.map(({ id }) => id));
  const goalIds = new Set(content.ontology.domains.map(({ id }) => id));
  const validateEvidence = (questionId: Identifier, evidence: Evidence | undefined, validIds: ReadonlySet<Identifier>): void => {
    for (const [id, level] of Object.entries(evidence ?? {})) {
      if (!validIds.has(id)) throw new Error(`Question ${questionId} refers to unknown measure ${id}.`);
      if (!Number.isInteger(level) || level < 1 || level > 4)
        throw new Error(`Question ${questionId} gives ${id} level ${level}; behavioral levels must be integers from 1 to 4.`);
    }
  };
  for (const question of content.questions)
    for (const answer of question.answers) {
      validateEvidence(question.id, answer.capacity, capacityIds);
      validateEvidence(question.id, answer.context, contextIds);
    }

  for (const domain of content.ontology.domains)
    for (const [id, level] of Object.entries(domain.targets)) {
      if (!capacityIds.has(id)) throw new Error(`Goal domain ${domain.id} targets unknown capacity ${id}.`);
      if (!Number.isInteger(level) || level < 1 || level > 4)
        throw new Error(`Goal domain ${domain.id} gives ${id} target ${level}; target levels must be integers from 1 to 4.`);
    }

  const measuresBySource: Readonly<Record<PersonaTrait['source'], ReadonlySet<Identifier>>> = {
    capacity: capacityIds,
    compound: compoundIds,
    context: contextIds,
    goal: goalIds,
    summary: new Set(['average', 'minimum', 'spread']),
  };
  for (const pattern of content.personaModel.patterns) {
    if (!content.profiles.personas[pattern.persona])
      throw new Error(`Persona model refers to unknown persona ${pattern.persona}.`);
    if (pattern.threshold < 0 || pattern.threshold > 100)
      throw new Error(`Persona ${pattern.persona} has an invalid threshold.`);
    if (!pattern.traits.length)
      throw new Error(`Persona ${pattern.persona} needs at least one measurable trait.`);
    for (const trait of pattern.traits) {
      if (!measuresBySource[trait.source].has(trait.measure))
        throw new Error(`Persona ${pattern.persona} refers to unknown ${trait.source} measure ${trait.measure}.`);
      if (trait.weight <= 0) throw new Error(`Persona ${pattern.persona} has a non-positive trait weight.`);
      if (trait.target !== undefined && (trait.target < 0 || trait.target > 100))
        throw new Error(`Persona ${pattern.persona} has a trait target outside 0–100.`);
    }
  }

  return content as AssessmentContent;
};
