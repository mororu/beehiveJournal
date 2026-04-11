// src/lib/server/db/queries/todos.ts
//
// All Drizzle queries for the todos table.

import { eq, asc, desc, isNull } from 'drizzle-orm';
import { db } from '../index.js';
import { todos, hives } from '../schema.js';
import type { Todo, NewTodo } from '../schema.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TodoWithHive extends Todo {
	hiveName: string | null;
	hiveNumber: number | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all todos joined with their hive name (null for general todos),
 * ordered by hive (general first) then creation date.
 */
export function getAllTodos(): TodoWithHive[] {
	const rows = db
		.select({
			id: todos.id,
			hiveId: todos.hiveId,
			title: todos.title,
			isCompleted: todos.isCompleted,
			createdAt: todos.createdAt,
			updatedAt: todos.updatedAt,
			hiveName: hives.name,
			hiveNumber: hives.number,
		})
		.from(todos)
		.leftJoin(hives, eq(todos.hiveId, hives.id))
		.orderBy(
			// General todos (no hive) first, then by hive number/name
			asc(hives.number),
			asc(hives.name),
			desc(todos.createdAt)
		)
		.all();

	return rows as TodoWithHive[];
}

/**
 * Returns todos for a specific hive, open first then newest.
 */
export function getTodosByHiveId(hiveId: number): Todo[] {
	return db
		.select()
		.from(todos)
		.where(eq(todos.hiveId, hiveId))
		.orderBy(asc(todos.isCompleted), desc(todos.createdAt))
		.all();
}

/**
 * Returns general todos (not linked to any hive), open first then newest.
 */
export function getGeneralTodos(): Todo[] {
	return db
		.select()
		.from(todos)
		.where(isNull(todos.hiveId))
		.orderBy(asc(todos.isCompleted), desc(todos.createdAt))
		.all();
}

/**
 * Returns a single todo by ID, or null if not found.
 */
export function getTodoById(id: number): Todo | null {
	const row = db.select().from(todos).where(eq(todos.id, id)).get();
	return row ?? null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new todo and returns the created row.
 * hiveId is optional — omit for a general (non-hive) todo.
 */
export function createTodo(data: { hiveId?: number | null; title: string }): Todo {
	const now = Math.floor(Date.now() / 1000);
	const inserted = db
		.insert(todos)
		.values({
			hiveId: data.hiveId ?? null,
			title: data.title,
			isCompleted: false,
			createdAt: now,
			updatedAt: now,
		} satisfies NewTodo)
		.returning()
		.get();
	return inserted;
}

/**
 * Toggles the isCompleted status of a todo. Returns the updated row or null.
 */
export function toggleTodo(id: number): Todo | null {
	const todo = getTodoById(id);
	if (!todo) return null;
	const now = Math.floor(Date.now() / 1000);
	const updated = db
		.update(todos)
		.set({ isCompleted: !todo.isCompleted, updatedAt: now })
		.where(eq(todos.id, id))
		.returning()
		.get();
	return updated ?? null;
}

/**
 * Deletes a todo. Returns true if a row was deleted.
 */
export function deleteTodo(id: number): boolean {
	const result = db.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id }).get();
	return result !== undefined;
}
