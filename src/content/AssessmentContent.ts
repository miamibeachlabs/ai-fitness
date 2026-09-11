export type Identifier = string;
export type Evidence = Readonly<Record<Identifier, number>>;
export type NamedConcept = Readonly<{ id: Identifier; name: string; description: string }>;
export type GoalDomain = Readonly<{ id: Identifier; name: string; targets: Evidence }>;
export type Answer = Readonly<{ text: string; capacity?: Evidence; context?: Evidence }>;
export type Question = Readonly<{ id: Identifier; category: string; prompt: string; answers: readonly Answer[] }>;
export type Profile = Readonly<{ name: string; description: string }>;
export type ResultsCopy = Readonly<{
  heading: string;
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
  interface: Readonly<{
    app: Readonly<{ assessmentLabel: string; introduction: string; privacy: string; principles: readonly string[] }>;
    goals: Readonly<{ category: string; prompt: string; hint: string; levels: readonly string[] }>;
    results: ResultsCopy;
  }>;
}>;

export const validateContent = (value: unknown): AssessmentContent => {
  const content = value as Partial<AssessmentContent>;
  if (!content.ontology || !content.questions || !content.profiles || !content.interface)
    throw new Error('Assessment content requires ontology, questions, profiles, and interface documents.');

  const capacityIds = new Set(content.ontology.capacities.map(({ id }) => id));
  const contextIds = new Set(content.ontology.contexts.map(({ id }) => id));
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

  return content as AssessmentContent;
};
