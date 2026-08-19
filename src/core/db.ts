import Dexie, { type EntityTable } from 'dexie'
import type { Project } from './types'

export class ApiBridgeDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  constructor(name = 'api-bridge') {
    super(name)
    this.version(1).stores({ projects: 'id, updatedAt' })
  }
}
export const db = new ApiBridgeDatabase()
