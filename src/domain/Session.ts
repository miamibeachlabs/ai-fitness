import type { AssessmentContent } from '../content/AssessmentContent.ts';
import type { Answers } from './Assessment.ts';

export type Screen = 'intro' | 'goals' | 'questions' | 'results';

export type Session = Readonly<{
  screen: Screen;
  step: number;
  answers: Answers;
}>;

export const newSession = (content: AssessmentContent): Session => ({
  screen: 'intro',
  step: 0,
  answers: {
    goals: Object.fromEntries(content.ontology.sports.map(({ id }) => [id, 0])),
    questions: {},
  },
});
