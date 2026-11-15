import '@fontsource-variable/fraunces';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '../design/tokens.css';
import '../design/components.css';
import './styles/app.css';

import { store } from './state/store';
import { mountApp } from './ui/app';

const root = document.getElementById('app');
if (root) mountApp(root, store);
