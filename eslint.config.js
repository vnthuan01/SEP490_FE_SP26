import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { globalIgnores } from 'eslint/config';

export default tseslint.config([
  globalIgnores(['dist']),

  {
    files: ['**/*.{ts,tsx}'],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2025,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: globals.browser,
    },

    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },

    rules: {
      /* Base JS */
      ...js.configs.recommended.rules,

      /* TypeScript */
      ...tseslint.configs.recommended.rules,

      /* React Hooks */
      ...reactHooks.configs.recommended.rules,

      /* React Refresh */
      'react-refresh/only-export-components': 'off',

      /* Relax */
      '@typescript-eslint/no-explicit-any': 'off',

      /* Disable base no-redeclare — replaced by TS-aware version */
      /* Base rule doesn't understand TS enums (type + value same name) */
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
    },
  },
]);
