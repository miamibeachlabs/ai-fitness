import type { AssessmentContent, Evidence, Identifier } from '../content/AssessmentContent.ts';

const indexById = <T extends { id: Identifier }>(items: readonly T[]): Readonly<Record<Identifier, T>> =>
  Object.fromEntries(items.map(item => [item.id, item]));

const sectionTitle = (number: string, title: string, description: string): string =>
  `<div class="lab-section-title"><span>${number}</span><div><h2>${title}</h2><p>${description}</p></div></div>`;

const evidenceTags = (
  evidence: Evidence | undefined,
  names: Readonly<Record<Identifier, { name: string }>>,
  className = '',
): string =>
  Object.entries(evidence ?? {})
    .map(([id, value]) => `<span class="evidence ${className}">${names[id].name} ${value}</span>`)
    .join('');

export const renderLab = (root: HTMLElement, content: AssessmentContent): void => {
  const capacities = indexById(content.ontology.capacities);
  const contexts = indexById(content.ontology.contexts);
  const coverage = content.ontology.capacities.map(capacity => ({
    ...capacity,
    questions: content.questions.filter(question =>
      question.answers.some(answer => answer.capacity?.[capacity.id] !== undefined)
    ),
  }));

  root.innerHTML = `<section class="lab">
    <header class="lab-header">
      <div><p class="kicker">Local development view</p><h1>Assessment Lab</h1><p>The complete instrument on one page: language, ontology, evidence, and result vocabulary.</p></div>
      <a class="lab-exit" href="/">View client assessment →</a>
    </header>
    <nav class="lab-nav"><a href="#ontology">Ontology</a><a href="#goals">Goals</a><a href="#questions">Questions</a><a href="#coverage">Coverage</a><a href="#profiles">Profiles</a></nav>

    <section id="ontology" class="lab-section">
      ${sectionTitle('01', 'Ontology', 'Primitive capacities are coordinates. Compounds and personas are recognizable patterns over them.')}
      <div class="ontology-grid">${content.ontology.capacities.map(({ id, name, description }) => `<article><code>${id}</code><h3>${name}</h3><p>${description}</p></article>`).join('')}</div>
      <h3 class="subhead">Compound capacities</h3>
      <div class="compound-grid">${content.ontology.compounds.map(compound => `<article><strong>${compound.name}</strong><span>${compound.capacities.map(id => capacities[id].name).join(' + ')}</span><p>${compound.description}</p></article>`).join('')}</div>
      <h3 class="subhead">Context, not capacity</h3>
      <div class="context-row">${content.ontology.contexts.map(({ name, description }) => `<article><strong>${name}</strong><span>${description}</span></article>`).join('')}</div>
    </section>

    <section id="goals" class="lab-section">
      ${sectionTitle('02', 'Goal profiles', 'Each sport contributes these desired capacity levels. The client sliders determine how strongly each sport contributes.')}
      <div class="question-table">${content.ontology.sports.map(sport => `<article class="lab-question"><div class="q-number">${sport.id.slice(0, 2).toUpperCase()}</div><div class="q-body"><h3>${sport.name}</h3><aside>${evidenceTags(sport.targets, capacities)}</aside></div></article>`).join('')}</div>
    </section>

    <section id="questions" class="lab-section">
      ${sectionTitle('03', 'Question instrument', 'Every answer shows the exact behavioral level it contributes on the 1–4 scale.')}
      <div class="question-table">${content.questions.map((question, questionIndex) => `<article class="lab-question"><div class="q-number">${String(questionIndex + 1).padStart(2, '0')}</div><div class="q-body"><span>${question.category}</span><h3>${question.prompt}</h3><div class="answer-stack">${question.answers.map((answer, answerIndex) => `<div><b>${String.fromCharCode(65 + answerIndex)}</b><p>${answer.text}</p><aside>${evidenceTags(answer.capacity, capacities)}${evidenceTags(answer.context, contexts, 'context')}</aside></div>`).join('')}</div></div></article>`).join('')}</div>
    </section>

    <section id="coverage" class="lab-section">
      ${sectionTitle('04', 'Evidence coverage', 'This makes under-sampling, over-sampling, and overlapping constructs visible.')}
      <div class="coverage-grid">${coverage.map(capacity => `<article><div><strong>${capacity.name}</strong><b>${capacity.questions.length} questions</b></div><p>${capacity.questions.map(question => `${content.questions.indexOf(question) + 1}. ${question.category}`).join(' · ')}</p></article>`).join('')}</div>
    </section>

    <section id="profiles" class="lab-section">
      ${sectionTitle('05', 'Result vocabulary', 'The labels and descriptions available to the classifier and report.')}
      <div class="rules-grid"><article><h3>Personas</h3>${Object.values(content.profiles.personas).map((persona, index) => `<div><b>${index + 1}</b><strong>${persona.name}</strong><span>${persona.description}</span></div>`).join('')}</article><article><h3>General profiles</h3>${Object.values(content.profiles.generalProfiles).map((profile, index) => `<div><b>${index + 1}</b><strong>${profile.name}</strong><span>${profile.description}</span></div>`).join('')}</article></div>
    </section>
  </section>`;
};
