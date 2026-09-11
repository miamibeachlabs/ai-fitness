import { render } from 'preact';
import generated from './generated/content.ts';
import { validateContent } from './content/AssessmentContent.ts';
import { App } from './ui/App.tsx';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing application root.');

const content = validateContent(generated);
const developingLocally = ['localhost', '127.0.0.1'].includes(location.hostname);
const showingLab = developingLocally && (location.hash === '#lab' || new URLSearchParams(location.search).has('lab'));

if (showingLab) {
  const { renderLab } = await import('./ui/Lab.ts');
  renderLab(root, content);
} else {
  render(<App content={content}/>, root);
}

if ('serviceWorker' in navigator)
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./service-worker.js')
      .catch(error => console.error('Offline installation failed.', error));
  });
