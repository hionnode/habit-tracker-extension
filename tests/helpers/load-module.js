// Load window-global JS modules into Node.js via vm

import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

const ROOT = resolve(import.meta.dirname, '..', '..');

/**
 * Load a JS file that defines a global (e.g. `const Storage = { ... }`)
 * and make it available on globalThis.
 */
export function loadModule(relativePath) {
  const filePath = resolve(ROOT, relativePath);
  const code = readFileSync(filePath, 'utf-8');
  // Run in the current global context so the module's `const` becomes accessible
  // We wrap in an IIFE that assigns to globalThis
  const moduleName = getModuleName(code);
  if (!moduleName) {
    throw new Error(`Could not detect module name in ${relativePath}`);
  }
  const wrappedCode = `(function() { ${code}; globalThis.${moduleName} = ${moduleName}; })();`;
  vm.runInThisContext(wrappedCode, { filename: filePath });
}

/**
 * Extract the top-level `const Name = {` from file contents.
 */
function getModuleName(code) {
  const match = code.match(/^const\s+(\w+)\s*=\s*\{/m);
  return match ? match[1] : null;
}
