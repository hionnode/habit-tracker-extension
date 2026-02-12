// Test setup: install chrome mock and load source modules in dependency order

import { createChromeMock } from './chrome-mock.js';
import { loadModule } from './load-module.js';

// Install chrome mock globally
const chromeMock = createChromeMock();
globalThis.chrome = chromeMock;

// Load source modules in dependency order (Storage first, others depend on it)
loadModule('js/storage.js');
loadModule('js/habits.js');
loadModule('js/websites.js');
loadModule('js/chart.js');

// Reset chrome storage between tests
beforeEach(() => {
  chromeMock._reset();
});
