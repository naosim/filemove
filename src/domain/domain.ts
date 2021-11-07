export class InboxFile {
  constructor(readonly id:string, readonly name: string) {}
}

export module ArchiveCandidateStatus {
  export class Entity {
    constructor(readonly id:string, readonly isArchived: boolean) {}
    update(isArchived: boolean): Entity {
      return new Entity(this.id, isArchived);
    }
  }
  export class Repository {
    private map: {[key: string]: Entity} = {}
    find(id: string): Entity {
      if(!this.map[id]) {
        this.map[id] = new Entity(id, false);
      }
      return this.map[id];
    }
    findAllArchved(): Entity[] {
      return Object.values(this.map).filter(v => v.isArchived);
    }
    update(entity: Entity) {
      this.map[entity.id] = entity;
    }
    isArchived(id: string): boolean {
      return this.find(id).isArchived;
    }
  }
}


export interface InboxFileRepository {
  findAll(): InboxFile[]
  // update(id: string, data: any): void
  archive(id: string): Promise<void>
}

export interface DetailRepository {
  find(id: string): Promise<string>;
}