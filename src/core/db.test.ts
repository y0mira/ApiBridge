import { afterEach, describe, expect, it } from 'vitest'
import { ApiBridgeDatabase } from './db'
import { parseOpenApi } from './parser'

const names: string[] = []
afterEach(async () => { await Promise.all(names.splice(0).map((name) => new ApiBridgeDatabase(name).delete())) })
describe('IndexedDB projects', () => {
  it('saves, restores, and deletes a project', async () => { const name = `test-${Math.random()}`; names.push(name); const database = new ApiBridgeDatabase(name); const now = '2020-01-01T00:00:00.000Z'; const project = { id: 'one', name: 'Test', sourceFormat: 'yaml' as const, source: '', parsed: parseOpenApi('openapi: 3.0.0\ninfo: {title: x, version: 1}\npaths: {}'), createdAt: now, updatedAt: now, selectedOperationIds: [] }; await database.projects.put(project); expect(await database.projects.get('one')).toEqual(project); await database.projects.delete('one'); expect(await database.projects.count()).toBe(0); database.close() })
})
