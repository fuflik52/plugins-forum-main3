// @ts-check

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import tseslint from 'typescript-eslint';
import suggestMembers from '@ton-ai-core/eslint-plugin-suggest-members';
import jestPlugin from 'eslint-plugin-jest';

export default tseslint.config(
  { ignores: ['dist', 'build/**'] },
  {
    // Сохраняем «старые» типо-осознанные проверки из прежней конфигурации
    extends: [js.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        // Для типо-осознанных правил
        tsconfigRootDir: import.meta.dirname,
        projectService: true,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@eslint-community/eslint-comments': eslintComments,
      'jest': jestPlugin,
      '@ton-ai-core/suggest-members': suggestMembers,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': 'off',
      // STRICT MODE
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      // ESLint comments rules (полный запрет eslint-disable)
      '@eslint-community/eslint-comments/no-use': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/disable-enable-pair': 'error',
      '@eslint-community/eslint-comments/no-unused-disable': 'error',
      // suggest-members rules
      '@ton-ai-core/suggest-members/suggest-members': 'error',
      '@ton-ai-core/suggest-members/suggest-imports': 'error',
      '@ton-ai-core/suggest-members/suggest-module-paths': 'error',
    },
  },
  // Jest override
  {
    files: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
    plugins: {
      'jest': jestPlugin,
    },
    languageOptions: {
      globals: { ...globals.jest }
    },
    rules: {
      ...(jestPlugin.configs.recommended?.rules ?? {}),
      'jest/expect-expect': 'off',
      'jest/no-standalone-expect': 'off',
    },
  }
);