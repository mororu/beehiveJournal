import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	{
		// TypeScript files that are server-side / scripts — Node.js globals
		files: ['**/*.ts'],
		ignores: ['src/lib/client/**/*.ts'],
		plugins: { '@typescript-eslint': ts },
		languageOptions: {
			parser: tsParser,
			globals: {
				...globals.node,
			},
		},
		rules: {
			...ts.configs.recommended.rules,
		},
	},
	{
		// Client-side TypeScript files — browser globals
		files: ['src/lib/client/**/*.ts'],
		plugins: { '@typescript-eslint': ts },
		languageOptions: {
			parser: tsParser,
			globals: {
				...globals.browser,
			},
		},
		rules: {
			...ts.configs.recommended.rules,
		},
	},
	{
		files: ['**/*.svelte'],
		plugins: { svelte },
		languageOptions: {
			parser: svelteParser,
			parserOptions: { parser: tsParser },
			globals: {
				...globals.browser,
			},
		},
		rules: {
			...svelte.configs.recommended.rules,
			// Ignore unused function parameter names (common in TS type-only positions)
			'no-unused-vars': ['error', { args: 'none' }],
		},
	},
	{
		ignores: ['build/', '.svelte-kit/', 'node_modules/', 'src/lib/server/db/migrations/'],
	},
];
