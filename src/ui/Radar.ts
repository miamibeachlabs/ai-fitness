import type { NamedConcept } from '../content/AssessmentContent.ts';
import type { Score } from '../domain/Assessment.ts';

export const radar = (
  capacities: readonly NamedConcept[],
  scores: readonly Score[],
  targets: readonly Score[],
): string => {
  const centerX = 220, centerY = 190, radius = 128;
  const values = Object.fromEntries(scores.map(({ id, score }) => [id, score]));
  const goals = Object.fromEntries(targets.map(({ id, score }) => [id, score]));
  const point = (index: number, value: number): readonly [number, number] => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / capacities.length;
    const distance = radius * value / 100;
    return [centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance];
  };
  const polygon = (profile: Readonly<Record<string, number>>): string =>
    capacities.map(({ id }, index) => point(index, profile[id]).join(',')).join(' ');
  const uniform = (value: number): Readonly<Record<string, number>> =>
    Object.fromEntries(capacities.map(({ id }) => [id, value]));
  const rings = [25, 50, 75, 100].map(value => `<polygon points="${polygon(uniform(value))}" />`).join('');
  const axes = capacities.map((_, index) => {
    const [x, y] = point(index, 100);
    return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}"/>`;
  }).join('');
  const labels = capacities.map(({ name }, index) => {
    const [x, y] = point(index, 116);
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${name}</text>`;
  }).join('');
  const markers = capacities.map(({ id }, index) => {
    const [x, y] = point(index, values[id]);
    return `<circle cx="${x}" cy="${y}" r="4"/>`;
  }).join('');
  return `<svg class="radar" viewBox="0 0 440 390" role="img" aria-label="Radar chart of eight AI fitness capacities"><g class="grid">${rings}${axes}</g><polygon class="target-shape" points="${polygon(goals)}"/><polygon class="score-shape" points="${polygon(values)}"/>${markers}<g class="labels">${labels}</g></svg>`;
};
