import { Fragment, type ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { AssessmentContent } from '../content/AssessmentContent.ts';
import { assess } from '../domain/Assessment.ts';
import { describe, profileDataText, profileText } from '../domain/Report.ts';
import { newSession, type Screen, type Session } from '../domain/Session.ts';
import { loadProgress, saveProgress } from '../infrastructure/LocalProgress.ts';
import { radar } from './Radar.ts';

type ContentProps = Readonly<{ content: AssessmentContent }>;
type QuestionFrameProps = Readonly<{
  content: AssessmentContent;
  index: number;
  category: string;
  prompt: string;
  onBack: () => void;
  children: ComponentChildren;
}>;

const Frame = ({ children }: Readonly<{ children: ComponentChildren }>) => (
  <div class="shell">
    <header class="brandbar">
      <a class="brand" href="#" aria-label="AI Fitness home">
        <span class="brand-mark" aria-hidden="true">AF</span><span>AI Fitness</span>
      </a>
      <div class="brandbar-right"><span class="session-tag">2 minute assessment</span><span class="byline"><span>by</span><span class="mbl-brand"><img src="./mbl-mark.svg" alt=""/><span><strong>Miami Beach Labs</strong><small>Software + AI</small></span></span></span></div>
    </header>
    {children}
    <footer><span>AI Fitness Assessment</span><span>Private by design. Your answers stay on this device.</span></footer>
  </div>
);

const QuestionFrame = ({ content, index, category, prompt, onBack, children }: QuestionFrameProps) => {
  const total = content.questions.length + 1;
  return <section class="quiz">
    <div class="quiz-top"><button class="text-button" onClick={onBack}>← Back</button><span>{String(index + 1).padStart(2, '0')} / {total}</span></div>
    <div class="progress"><i style={{ width: `${Math.round(index / total * 100)}%` }} /></div>
    <div class="question-wrap"><p class="kicker">{category}</p><h2>{prompt}</h2>{children}</div>
  </section>;
};

const Intro = ({ content, onStart }: ContentProps & Readonly<{ onStart: () => void }>) => {
  const { app } = content.interface;
  return <>
    <section class="intro-grid">
      <div class="intro-copy"><p class="kicker">{app.assessmentLabel}</p><h1>How fit are you<br/><em>with AI?</em></h1><p class="lede">{app.introduction}</p><button class="primary" onClick={onStart}>Start assessment <span>→</span></button><p class="privacy">{app.privacy}</p></div>
      <div class="profile-preview" aria-label="Example fitness profile"><div class="orbit orbit-one"/><div class="orbit orbit-two"/><div class="preview-center"><span>8</span><small>capacities</small></div>{content.ontology.capacities.map(({ id, name }, index) => <span key={id} class={`orbit-label label-${index}`}>{name}</span>)}</div>
    </section>
    <section class="principle-strip">{app.principles.map((principle, index) => <Fragment key={principle}><span>0{index + 1}</span><p>{principle}</p></Fragment>)}</section>
  </>;
};

type GoalsProps = ContentProps & Readonly<{
  session: Session;
  onBack: () => void;
  onChange: (domainId: string, relevance: number) => void;
  onContinue: () => void;
}>;

const Goals = ({ content, session, onBack, onChange, onContinue }: GoalsProps) => {
  const copy = content.interface.goals;
  return <QuestionFrame content={content} index={0} category={copy.category} prompt={copy.prompt} onBack={onBack}>
    <p class="hint">{copy.hint}</p>
    <div class="goal-sliders">{content.ontology.domains.map(domain => {
      const value = session.answers.goals[domain.id] ?? 0;
      return <div class="goal-slider" key={domain.id}><label for={`goal-${domain.id}`}>{domain.name}</label><input id={`goal-${domain.id}`} type="range" min="0" max="4" value={value} onInput={event => onChange(domain.id, Number(event.currentTarget.value))}/><output>{copy.levels[value]}</output></div>;
    })}</div>
    <div class="scale-legend"><span>Not relevant</span><span>Central</span></div>
    <button class="primary continue" onClick={onContinue}>Continue <span>→</span></button>
  </QuestionFrame>;
};

type QuestionProps = ContentProps & Readonly<{
  session: Session;
  onBack: () => void;
  onAnswer: (questionId: string, answerIndex: number) => void;
}>;

const Question = ({ content, session, onBack, onAnswer }: QuestionProps) => {
  const question = content.questions[session.step];
  const selected = session.answers.questions[question.id];
  return <QuestionFrame content={content} index={session.step + 1} category={question.category} prompt={question.prompt} onBack={onBack}>
    <div class="options" key={question.id}>{question.answers.map((answer, index) => <button key={answer.text} class={`option ${selected === index ? 'selected' : ''}`} onClick={() => onAnswer(question.id, index)}><span class="choice">{String.fromCharCode(65 + index)}</span><span>{answer.text}</span></button>)}</div>
  </QuestionFrame>;
};

type ResultsProps = ContentProps & Readonly<{ session: Session; onRestart: () => void }>;

const Results = ({ content, session, onRestart }: ResultsProps) => {
  const [toast, setToast] = useState('');
  const result = assess(content, session.answers);
  const view = describe(content, result);
  const capacities = Object.fromEntries(content.ontology.capacities.map(item => [item.id, item]));
  const compounds = Object.fromEntries(content.ontology.compounds.map(item => [item.id, item]));
  const opportunity = result.opportunities[0];
  const copy = content.interface.results;

  const copyToClipboard = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(success);
    } catch {
      setToast('Could not copy the profile');
    }
    window.setTimeout(() => setToast(''), 2200);
  };

  return <section class="results">
    <div class="result-heading"><div><p class="kicker">{copy.heading}</p><h1>{view.persona}</h1><p class="persona-description">{view.personaDescription}</p><div class="profile-summary"><strong>{view.profile}</strong><span>{view.profileDescription}</span></div></div><button class="retake-button" onClick={onRestart}>Retake assessment <span aria-hidden="true">↻</span></button></div>
    <div class="chart-comparison">
      <article class="chart-card"><div class="chart-head"><span>{copy.capacityChart}</span><span class="legend"><i/>You <i/>Goal</span></div><div dangerouslySetInnerHTML={{ __html: radar(content.ontology.capacities, result.capacities, result.targets, copy.capacityChart) }}/><div class="chart-definitions">{result.capacities.map(({ id, score }) => <div key={id}><p><strong>{capacities[id].name}</strong><span>{score}</span></p><small>{capacities[id].description}</small></div>)}</div></article>
      <article class="chart-card"><div class="chart-head"><span>{copy.compoundChart}</span><span class="legend"><i/>You <i/>Goal</span></div><div dangerouslySetInnerHTML={{ __html: radar(content.ontology.compounds, result.compounds, result.compoundTargets, copy.compoundChart) }}/><div class="chart-definitions compound-definitions">{result.compounds.map(({ id, score }) => <div key={id}><p><strong>{compounds[id].name}</strong><span>{score}</span></p><small>{compounds[id].description}</small></div>)}</div></article>
    </div>
    <article class="training-read-card"><p class="kicker">{copy.trainingRead}</p><dl class="training-read"><div><dt>{copy.generalFitness}</dt><dd>{view.profile}</dd></div><div><dt>{copy.lowestCapacity}</dt><dd>{capacities[view.training.lowest.id].name} <span>{view.training.lowest.score}/100</span></dd></div><div><dt>{copy.goalAdjustedGaps}</dt><dd>{view.training.gaps.length ? view.training.gaps.map(gap => `${capacities[gap.id].name} +${gap.gap}`).join(', ') : copy.none}</dd></div><div><dt>{copy.primaryPriorities}</dt><dd>{view.training.primaryPriorities.map(priority => priority.name).join(', ') || copy.notSpecified}</dd></div><div><dt>{copy.trainingDirection}</dt><dd>{view.training.direction === 'capacity' ? copy.capacityDirection : copy.domainDirection}</dd></div></dl><div class="stat-row"><div><small>{copy.strongest}</small><strong>{capacities[result.strongest.id].name}</strong><span>{result.strongest.score}/100</span></div><div><small>{copy.opportunity}</small><strong>{opportunity ? capacities[opportunity.id].name : copy.none}</strong><span>{opportunity ? `+${opportunity.gap} toward your goal` : copy.targetsMet}</span></div></div></article>
    <section class="training"><div><p class="kicker">{copy.prioritiesHeading}</p><h2>{copy.prioritiesPrompt}</h2><div class="priority-list">{view.priorities.map(priority => <div key={priority.id}><strong>{priority.name}</strong><span>{priority.level}</span></div>)}</div></div><div class="copy-actions"><button class="primary" onClick={() => void copyToClipboard(profileText(content, result), copy.copied)}>{copy.copy} <span>↗</span></button><button class="text-button" onClick={() => void copyToClipboard(profileDataText(result), copy.dataCopied)}>{copy.copyData}</button></div></section>
    <div class={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
  </section>;
};

export const App = ({ content }: ContentProps) => {
  const [session, setSession] = useState<Session>(() => loadProgress() ?? newSession(content));
  useEffect(() => saveProgress(session), [session]);

  const show = (screen: Screen) => setSession(current => ({ ...current, screen }));
  const back = () => setSession(current => current.screen === 'questions' && current.step > 0
    ? { ...current, step: current.step - 1 }
    : { ...current, screen: current.screen === 'questions' ? 'goals' : 'intro' });
  const changeGoal = (domainId: string, relevance: number) => setSession(current => ({
    ...current,
    answers: { ...current.answers, goals: { ...current.answers.goals, [domainId]: relevance } },
  }));
  const answer = (questionId: string, answerIndex: number) => {
    setSession(current => ({ ...current, answers: { ...current.answers, questions: { ...current.answers.questions, [questionId]: answerIndex } } }));
    window.setTimeout(() => setSession(current => current.step < content.questions.length - 1
      ? { ...current, step: current.step + 1 }
      : { ...current, screen: 'results' }), 120);
  };

  const screen = session.screen === 'intro'
    ? <Intro content={content} onStart={() => show('goals')}/>
    : session.screen === 'goals'
      ? <Goals content={content} session={session} onBack={back} onChange={changeGoal} onContinue={() => show('questions')}/>
      : session.screen === 'questions'
        ? <Question content={content} session={session} onBack={back} onAnswer={answer}/>
        : <Results content={content} session={session} onRestart={() => setSession(newSession(content))}/>;

  return <Frame>{screen}</Frame>;
};
