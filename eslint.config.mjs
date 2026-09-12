import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'no-fallthrough': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'Use getApiConfig() from src/config/env.ts instead of reading process.env directly.',
        },
      ],
    },
  },
  {
    files: ['src/config/env.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
);
