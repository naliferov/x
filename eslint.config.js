// Flat ESLint config (ESLint v9). One root config covers every package — the
// repo is ESM throughout. Prettier owns formatting; ESLint owns code quality +
// the repo's naming conventions (see README — Conventions & coding rules).
import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default [
  // Not project source: deps, build output, and the backend data plane (node
  // bodies / state / assets — sandboxed user content).
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'data/**',
      'runtime/executions/**',
      'runtime/state/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended, // parser + TS-aware rules for .ts (disables base no-unused-vars)
  ...pluginVue.configs['flat/recommended'],

  // <script lang="ts"> in .vue needs the TS parser under vue-eslint-parser.
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },

  // House rules — encode the repo conventions + ESM. Applies to all JS/TS and Vue.
  {
    files: ['**/*.{js,ts}', '**/*.vue'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      // README convention: no single-letter variable names, EXCEPT i/j/k as numeric
      // loop counters (exempted below). The ~150 pre-existing single-letter names
      // (callback args, catch errors, graphics math) were renamed to descriptive
      // names; only i/j/k loop indices remain, by design.
      // Kept as 'warn'; bump to 'error' to hard-enforce once it's proven stable.
      'id-length': ['warn', { min: 2, properties: 'never', exceptions: ['_', 'i', 'j', 'k'] }],
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // The migration uses `any` deliberately for arbitrary JSON (readBody, res.json())
      // and ad-hoc-field objects — minimal types, not exhaustive generics.
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
      // Always brace control bodies — no one-line `if (x) foo()`. This is ESLint's
      // job (Prettier never adds braces); auto-fixable via `npm run lint:fix`.
      // NOTE: eslint-config-prettier (kept last) defensively turns `curly` OFF, so
      // it is RE-ASSERTED in a final block below — without that, this line is
      // silently overridden and the convention goes unenforced.
      curly: ['error', 'all'],
      // Node-type components are intentionally single-word (Html, Script, …).
      'vue/multi-word-component-names': 'off',
      // The editor edits the `node` prop in place, then persists via store.save()
      // — a deliberate edit-in-place model, not accidental prop mutation. (A future
      // refactor to store actions / emits could re-enable this.)
      'vue/no-mutating-props': 'off',
      // The `html` node renders its own stored HTML by design — a single-user
      // local tool over trusted local content, not untrusted input.
      'vue/no-v-html': 'off',
    },
  },

  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },

  // Node runtime: everything except the frontend app source.
  {
    files: ['**/*.{js,ts}'],
    ignores: ['frontend/src/**'],
    languageOptions: { globals: globals.node },
  },

  // Browser runtime: the frontend app and the scripts it runs.
  {
    files: ['frontend/src/**/*.{js,ts,vue}', 'frontend/scripts/**/*.{js,ts,jsx,tsx,vue}'],
    languageOptions: { globals: globals.browser },
  },

  // Keep last: turn off stylistic rules that would fight Prettier.
  prettier,

  // Re-assert rules eslint-config-prettier disables defensively but that the repo
  // genuinely wants. `curly: 'all'` requires braces everywhere — it does NOT fight
  // Prettier (Prettier never adds/removes braces; the conflict prettier guards
  // against only exists for the 'multi'/'multi-line' options, not 'all'). Placed
  // after the prettier block so last-wins keeps it on.
  {
    files: ['**/*.{js,ts}', '**/*.vue'],
    rules: { curly: ['error', 'all'] },
  },
]
