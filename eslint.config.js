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
		// All TypeScript files (server + scripts) run in Node.js
		files: ['**/*.ts'],
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
		},
	},
	{
		ignores: ['build/', '.svelte-kit/', 'node_modules/', 'src/lib/server/db/migrations/'],
	},
];
