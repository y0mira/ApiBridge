import Dexie, { type EntityTable } from 'dexie'
import type { Project } from './types'
import type { MockScenario, SpecVersion } from './types'

type StoredScenario = MockScenario & { projectId: string }
type StoredVersion = SpecVersion & { projectId: string }

export class ApiBridgeDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  scenarios!: EntityTable<StoredScenario, 'id'>
  versions!: EntityTable<StoredVersion, 'id'>
  constructor(name = 'api-bridge') {
    super(name)
    this.version(1).stores({ projects: 'id, updatedAt' })
    this.version(2).stores({
      projects: 'id, updatedAt',
      scenarios: 'id, operationId',
      versions: 'id, projectId',
    })
    this.version(3).stores({
      projects: 'id, updatedAt',
      scenarios: 'id, operationId, projectId',
      versions: 'id, projectId',
    })
  }
}
export const db = new ApiBridgeDatabase()
