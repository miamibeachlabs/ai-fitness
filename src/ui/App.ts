import type { AssessmentContent, Identifier } from '../content/AssessmentContent.ts';
import { assess, type Answers } from '../domain/Assessment.ts';
import { describe, profileText } from '../domain/Report.ts';
import { radar } from './Radar.ts';

type Screen = 'intro' | 'goals' | 'questions' | 'results';
type State = { screen: Screen; step: number; answers: Answers };
const storageKey = 'ai-fitness-progress-v3';

const initialState = (content: AssessmentContent): State => ({
  screen: 'intro',
  step: 0,
  answers: {
    goals: Object.fromEntries(content.ontology.sports.map(({ id }) => [id, 0])),
    questions: {},
  },
});

const required = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
};

export class App {
  readonly #root: HTMLElement;
  readonly #toast: HTMLElement;
  readonly #content: AssessmentContent;
  #state: State;

  constructor(root: HTMLElement, toast: HTMLElement, content: AssessmentContent) {
    this.#root = root;
    this.#toast = toast;
    this.#content = content;
    this.#state = this.#restore() ?? initialState(content);
  }

  render(): void {
    if (this.#state.screen === 'intro') this.#renderIntro();
    else if (this.#state.screen === 'goals') this.#renderGoals();
    else if (this.#state.screen === 'questions') this.#renderQuestion();
    else this.#renderResults();
    localStorage.setItem(storageKey, JSON.stringify(this.#state));
  }

  #restore(): State | null {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) as State : null;
    } catch { return null; }
  }

  #renderIntro(): void {
    const { app } = this.#content.interface;
    this.#root.innerHTML = `<section class="intro-grid"><div class="intro-copy"><p class="kicker">${app.assessmentLabel} · v${this.#content.ontology.version}</p><h1>How fit are you<br/><em>with AI?</em></h1><p class="lede">${app.introduction}</p><button class="primary" id="start">Start assessment <span>→</span></button><p class="privacy">${app.privacy}</p></div><div class="profile-preview" aria-label="Example fitness profile"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="preview-center"><span>8</span><small>capacities</small></div>${this.#content.ontology.capacities.map(({ name }, index) => `<span class="orbit-label label-${index}">${name}</span>`).join('')}</div></section><section class="principle-strip">${app.principles.map((principle, index) => `<span>0${index + 1}</span><p>${principle}</p>`).join('')}</section>`;
    required(this.#root, '#start').addEventListener('click', () => this.#show('goals'));
  }

  #renderGoals(): void {
    const copy = this.#content.interface.goals;
    this.#root.innerHTML = this.#questionFrame(0, copy.category, copy.prompt, `<p class="hint">${copy.hint}</p><div class="sport-sliders">${this.#content.ontology.sports.map(sport => {
      const value = this.#state.answers.goals[sport.id] ?? 0;
      return `<div class="sport-slider"><label for="goal-${sport.id}">${sport.name}</label><input id="goal-${sport.id}" data-sport="${sport.id}" type="range" min="0" max="4" value="${value}"/><output>${copy.levels[value]}</output></div>`;
    }).join('')}</div><div class="scale-legend"><span>Not relevant</span><span>Central</span></div><button class="primary continue" id="continue">Continue <span>→</span></button>`);
    this.#bindBack('intro');
    this.#root.querySelectorAll<HTMLInputElement>('[data-sport]').forEach(slider => slider.addEventListener('input', () => {
      const sport = slider.dataset.sport as Identifier, value = Number(slider.value);
      this.#state = { ...this.#state, answers: { ...this.#state.answers, goals: { ...this.#state.answers.goals, [sport]: value } } };
      slider.nextElementSibling!.textContent = copy.levels[value];
    }));
    required(this.#root, '#continue').addEventListener('click', () => this.#show('questions'));
  }

  #renderQuestion(): void {
    const question = this.#content.questions[this.#state.step];
    const selected = this.#state.answers.questions[question.id];
    const options = `<div class="options">${question.answers.map((answer, index) => `<button class="option ${selected === index ? 'selected' : ''}" data-answer="${index}"><span class="choice">${String.fromCharCode(65 + index)}</span><span>${answer.text}</span></button>`).join('')}</div>`;
    this.#root.innerHTML = this.#questionFrame(this.#state.step + 1, question.category, question.prompt, options);
    this.#bindBack(this.#state.step === 0 ? 'goals' : 'questions');
    this.#root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button => button.addEventListener('click', () => {
      this.#state = { ...this.#state, answers: { ...this.#state.answers, questions: { ...this.#state.answers.questions, [question.id]: Number(button.dataset.answer) } } };
      setTimeout(() => this.#advance(), 120);
    }));
  }

  #questionFrame(index: number, category: string, prompt: string, body: string): string {
    const total = this.#content.questions.length + 1;
    return `<section class="quiz"><div class="quiz-top"><button class="text-button" id="back">← Back</button><span>${String(index + 1).padStart(2, '0')} / ${total}</span></div><div class="progress"><i style="width:${Math.round(index / total * 100)}%"></i></div><div class="question-wrap"><p class="kicker">${category}</p><h2>${prompt}</h2>${body}</div></section>`;
  }

  #bindBack(destination: Screen): void {
    required(this.#root, '#back').addEventListener('click', () => {
      if (destination === 'questions') this.#state.step--;
      this.#show(destination);
    });
  }

  #advance(): void {
    if (this.#state.step < this.#content.questions.length - 1) {
      this.#state.step++;
      this.render();
    } else this.#show('results');
  }

  #show(screen: Screen): void {
    this.#state.screen = screen;
    this.render();
  }

  #renderResults(): void {
    const result = assess(this.#content, this.#state.answers), view = describe(this.#content, result);
    const capacities = Object.fromEntries(this.#content.ontology.capacities.map(item => [item.id, item]));
    const opportunity = result.opportunities[0], copy = this.#content.interface.results;
    this.#root.innerHTML = `<section class="results"><div class="result-heading"><div><p class="kicker">${copy.heading}</p><h1>${view.persona}</h1><p class="persona-description">${view.personaDescription}</p><div class="profile-summary"><strong>${view.profile}</strong><span>${view.profileDescription}</span></div></div><button class="text-button" id="restart">Retake assessment ↻</button></div><div class="result-grid"><article class="chart-card"><div class="chart-head"><span>Current capacity</span><span class="legend"><i></i>You <i></i>Goal</span></div>${radar(this.#content.ontology.capacities, result.capacities, result.targets)}</article><article class="diagnosis-card"><p class="kicker">${copy.coachRead}</p><blockquote>“${view.diagnosis}”</blockquote><div class="stat-row"><div><small>${copy.strongest}</small><strong>${capacities[result.strongest.id].name}</strong><span>${result.strongest.score}/100</span></div><div><small>${copy.opportunity}</small><strong>${opportunity ? capacities[opportunity.id].name : 'Depth'}</strong><span>${opportunity ? `+${opportunity.gap} toward your goal` : 'Maintain'}</span></div></div></article></div><section class="capacities"><div class="section-title"><p class="kicker">The eight capacities</p><h2>${copy.map}</h2></div><div class="bars">${result.capacities.map(({ id, score }) => `<div class="bar-row"><div><strong>${capacities[id].name}</strong><span>${capacities[id].description}</span></div><div class="bar"><i style="width:${score}%"></i></div><b>${score}</b></div>`).join('')}</div></section><section class="training"><div><p class="kicker">${copy.nextSession}</p><h2>${copy.trainingHeadline}</h2><p>Your goal-adjusted profile points to ${result.opportunities.map(item => capacities[item.id].name.toLowerCase()).join(', ') || 'deeper practice'}. ${copy.trainingBody}</p></div><button class="primary" id="copy">${copy.copy} <span>↗</span></button></section></section>`;
    required(this.#root, '#restart').addEventListener('click', () => { this.#state = initialState(this.#content); this.render(); });
    required(this.#root, '#copy').addEventListener('click', () => void navigator.clipboard.writeText(profileText(this.#content, result)).then(() => this.#showToast(copy.copied)));
  }

  #showToast(message: string): void {
    this.#toast.textContent = message;
    this.#toast.classList.add('show');
    setTimeout(() => this.#toast.classList.remove('show'), 2200);
  }
}
