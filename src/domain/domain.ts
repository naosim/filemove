export class InboxFile {
  constructor(readonly id:string, readonly name: string, readonly date: Date) {}
}

export interface InboxFileRepository {
  findAll(): InboxFile[]
  archive(id: string): Promise<void>
  reload(): Promise<void>
}

export interface DetailRepository {
  find(id: string): Promise<string>;
}