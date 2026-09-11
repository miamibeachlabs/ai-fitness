import { Fragment, type ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { AssessmentContent } from '../content/AssessmentContent.ts';
import { assess } from '../domain/Assessment.ts';
import { describe, profileText } from '../domain/Report.ts';
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
      <span class="session-tag">2 minute assessment</span>
    </header>
    {children}
    <footer><span>AI Fitness Assessment · v0.1</span><span>Private by design. Your answers stay on this device.</span></footer>
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
      <div class="intro-copy"><p class="kicker">{app.assessmentLabel} · v{content.ontology.version}</p><h1>How fit are you<br/><em>with AI?</em></h1><p class="lede">{app.introduction}</p><button class="primary" onClick={onStart}>Start assessment <span>→</span></button><p class="privacy">{app.privacy}</p></div>
      <div class="profile-preview" aria-label="Example fitness profile"><div class="orbit orbit-one"/><div class="orbit orbit-two"/><div class="preview-center"><span>8</span><small>capacities</small></div>{content.ontology.capacities.map(({ id, name }, index) => <span key={id} class={`orbit-label label-${index}`}>{name}</span>)}</div>
    </section>
    <section class="principle-strip">{app.principles.map((principle, index) => <Fragment key={principle}><span>0{index + 1}</span><p>{principle}</p></Fragment>)}</section>
  </>;
};

type GoalsProps = ContentProps & Readonly<{
  session: Session;
  onBack: () => void;
  onChange: (sportId: string, relevance: number) => void;
  onContinue: () => void;
}>;

const Goals = ({ content, session, onBack, onChange, onContinue }: GoalsProps) => {
  const copy = content.interface.goals;
  return <QuestionFrame content={content} index={0} category={copy.category} prompt={copy.prompt} onBack={onBack}>
    <p class="hint">{copy.hint}</p>
    <div class="sport-sliders">{content.ontology.sports.map(sport => {
      const value = session.answers.goals[sport.id] ?? 0;
      return <div class="sport-slider" key={sport.id}><label for={`goal-${sport.id}`}>{sport.name}</label><input id={`goal-${sport.id}`} type="range" min="0" max="4" value={value} onInput={event => onChange(sport.id, Number(event.currentTarget.value))}/><output>{copy.levels[value]}</output></div>;
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
    <div class="options">{question.answers.map((answer, index) => <button key={answer.text} class={`option ${selected === index ? 'selected' : ''}`} onClick={() => onAnswer(question.id, index)}><span class="choice">{String.fromCharCode(65 + index)}</span><span>{answer.text}</span></button>)}</div>
  </QuestionFrame>;
};

type ResultsProps = ContentProps & Readonly<{ session: Session; onRestart: () => void }>;

const Results = ({ content, session, onRestart }: ResultsProps) => {
  const [toast, setToast] = useState('');
  const result = assess(content, session.answers);
  const view = describe(content, result);
  const capacities = Object.fromEntries(content.ontology.capacities.map(item => [item.id, item]));
  const opportunity = result.opportunities[0];
  const copy = content.interface.results;

  const copyProfile = async () => {
    try {
      await navigator.clipboard.writeText(profileText(content, result));
      setToast(copy.copied);
    } catch {
      setToast('Could not copy the profile');
    }
    window.setTimeout(() => setToast(''), 2200);
  };

  return <section class="results">
    <div class="result-heading"><div><p class="kicker">{copy.heading}</p><h1>{view.persona}</h1><p class="persona-description">{view.personaDescription}</p><div class="profile-summary"><strong>{view.profile}</strong><span>{view.profileDescription}</span></div></div><button class="text-button" onClick={onRestart}>Retake assessment ↻</button></div>
    <div class="result-grid"><article class="chart-card"><div class="chart-head"><span>Current capacity</span><span class="legend"><i/>You <i/>Goal</span></div><div dangerouslySetInnerHTML={{ __html: radar(content.ontology.capacities, result.capacities, result.targets) }}/></article><article class="diagnosis-card"><p class="kicker">{copy.coachRead}</p><blockquote>“{view.diagnosis}”</blockquote><div class="stat-row"><div><small>{copy.strongest}</small><strong>{capacities[result.strongest.id].name}</strong><span>{result.strongest.score}/100</span></div><div><small>{copy.opportunity}</small><strong>{opportunity ? capacities[opportunity.id].name : 'Depth'}</strong><span>{opportunity ? `+${opportunity.gap} toward your goal` : 'Maintain'}</span></div></div></article></div>
    <section class="capacities"><div class="section-title"><p class="kicker">The eight capacities</p><h2>{copy.map}</h2></div><div class="bars">{result.capacities.map(({ id, score }) => <div class="bar-row" key={id}><div><strong>{capacities[id].name}</strong><span>{capacities[id].description}</span></div><div class="bar"><i style={{ width: `${score}%` }}/></div><b>{score}</b></div>)}</div></section>
    <section class="training"><div><p class="kicker">{copy.nextSession}</p><h2>{copy.trainingHeadline}</h2><p>Your goal-adjusted profile points to {result.opportunities.map(item => capacities[item.id].name.toLowerCase()).join(', ') || 'deeper practice'}. {copy.trainingBody}</p></div><button class="primary" onClick={() => void copyProfile()}>{copy.copy} <span>↗</span></button></section>
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
  const changeGoal = (sportId: string, relevance: number) => setSession(current => ({
    ...current,
    answers: { ...current.answers, goals: { ...current.answers.goals, [sportId]: relevance } },
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
