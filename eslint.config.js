import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	{
		files: ['**/*.ts'],
		plugins: { '@typescript-eslint': ts },
		languageOptions: { parser: tsParser },
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
		},
		rules: {
			...svelte.configs.recommended.rules,
		},
	},
	{
		ignores: ['build/', '.svelte-kit/', 'node_modules/', 'src/lib/server/db/migrations/'],
	},
];
