export class InboxFile {
  constructor(readonly id:string, readonly name: string, readonly date: Date) {}
}

export interface InboxFileRepository {
  findAll(): InboxFile[]
  // update(id: string, data: any): void
  archive(id: string): Promise<void>
  reload(): Promise<void>
}

export interface DetailRepository {
  find(id: string): Promise<string>;
}