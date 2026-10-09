import { virtualWindow } from '#schedule/virtual-window.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '#app/App.tsx';

import '#app/tokens.css';
import '#app/global.css';

virtualWindow();

const root = document.getElementById('root');
if (root === null || root === undefined) throw new Error('Нет корневого элемента');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
