import {InboxFile, InboxFileRepository, DetailRepository} from "../domain/domain.ts"

interface FileSystemDirectoryHandle {}

export class InboxFileRepositoryImpl  {
  private fileSystemDirectoryHandleMap: {[key: string]: FileSystemDirectoryHandle} = {};
  constructor(
    private readonly inboxDirHandle: any,
    private readonly archiveDirHandle: any,
  ) {
    verifyPermission(inboxDirHandle, true);
    verifyPermission(archiveDirHandle, true);
  }

  async init() {
    await this.reload()
  }
  async reload() {
    const map: {[key: string]: FileSystemDirectoryHandle} = {};
    for await (const [key, value] of this.inboxDirHandle.entries()) {
      map[key] = value;
      // console.log({ key, value })
    }
    this.fileSystemDirectoryHandleMap = map;
  }

  findAll(): InboxFile[] {
    return Object.keys(this.fileSystemDirectoryHandleMap).map(v => new InboxFile(v, v))
  }

  async archive(id: string): Promise<void> {
    // TODO 実装
    const fileHandle = await this.inboxDirHandle.getFileHandle(id)
    const file = await fileHandle.getFile();
    moveTo(fileHandle, this.inboxDirHandle, this.archiveDirHandle);
    // fileHandle.moveTo(this.archiveDirHandle)
  }

  async getBody(id: string): Promise<string> {
    const fileHandle = await this.inboxDirHandle.getFileHandle(id)
    const file = await fileHandle.getFile();
    return await file.text();
  }

  static async create() {
    var dirHandle = await (window as any).showDirectoryPicker();
    var archive: any = null;
    var inbox: any = null;
    for await (const [key, value] of dirHandle.entries()) {
      if(key == 'archive') {
        archive = value;
      }
      if(key == 'inbox') {
        inbox = value;
      }
    }
    if(archive == null) {
      throw new Error('archiveディレクトリがない');
    }
    if(inbox == null) {
      throw new Error('inboxディレクトリがない');
    }
    return new InboxFileRepositoryImpl(inbox, archive);
  }
}

export class DetailRepositoryImpl {
  private map: {[key: string]: string} = {}
  constructor(private readonly inboxFileRepositoryImpl: InboxFileRepositoryImpl) {}
  async find(id: string): Promise<string> {
    if(!this.map[id]) {
      this.map[id] = await this.inboxFileRepositoryImpl.getBody(id);
    }
    return this.map[id];
  }
}

async function verifyPermission(fileHandle: any, withWrite: boolean) {
  const opts: any = {};
  if (withWrite) {
    opts.mode = 'readwrite';
  }

  // Check if we already have permission, if so, return true.
  if (await fileHandle.queryPermission(opts) === 'granted') {
    return true;
  }

  // Request permission to the file, if the user grants permission, return true.
  if (await fileHandle.requestPermission(opts) === 'granted') {
    return true;
  }

  // The user did not grant permission, return false.
  return false;
}

async function moveTo(fileHandle, fromDirHandle, toDirHandle) {
  const file = await fileHandle.getFile();
  const name = file.name;
  const text = await file.text();
  await verifyPermission(fromDirHandle, true);
  await verifyPermission(toDirHandle, true);
  const newFileHandle = await toDirHandle.getFileHandle(name, {create: true});
  //verifyPermission(newFileHandle, true);
  const writable = await newFileHandle.createWritable();
  await writable.write(text);
  await writable.close();
  
  await fromDirHandle.removeEntry(name)
}