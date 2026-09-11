import generated from './generated/content.ts';
import { validateContent } from './content/AssessmentContent.ts';
import { App } from './ui/App.ts';

const root = document.querySelector<HTMLElement>('#app');
const toast = document.querySelector<HTMLElement>('#toast');
if (!root || !toast) throw new Error('Missing application root.');

const content = validateContent(generated);
const developingLocally = ['localhost', '127.0.0.1'].includes(location.hostname);

if (developingLocally && location.hash === '#lab') {
  const { renderLab } = await import('./ui/Lab.ts');
  renderLab(root, content);
} else {
  new App(root, toast, content).render();
}

if ('serviceWorker' in navigator)
  window.addEventListener('load', () => {
    if (developingLocally) {
      void navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(registration => registration.unregister())));
      void caches.keys()
        .then(keys => Promise.all(keys.filter(key => key.startsWith('ai-fitness-')).map(key => caches.delete(key))));
      return;
    }

    void navigator.serviceWorker.register('./service-worker.js')
      .catch(error => console.error('Offline installation failed.', error));
  });
