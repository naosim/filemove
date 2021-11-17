import {InboxFile, InboxFileRepository, DetailRepository} from "../domain/domain.ts"

interface FileSystemDirectoryHandle {}

export class InboxFileRepositoryImpl implements InboxFileRepository {
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
    }
    this.fileSystemDirectoryHandleMap = map;
  }

  /**
   * ファイル名から日付を取得する
   * 例：2021_1113_0401_hoge.txt => 2021/11/13 04:01
   * @param filename 
   * @returns 
   */
  static getDateFromFilename(filename: string): Date {
    const segs = filename.split('_');
    const year = segs[0];
    const month = segs[1].slice(0, 2);
    const date = segs[1].slice(2);
    const hour = segs[2].slice(0, 2);
    const minute = segs[2].slice(2);
    return new Date(`${year}/${month}/${date} ${hour}:${minute}`);
  }

  findAll(): InboxFile[] {
    return Object.keys(this.fileSystemDirectoryHandleMap).map(v => {
      return new InboxFile(v, v, InboxFileRepositoryImpl.getDateFromFilename(v))
    })
  }

  async archive(id: string): Promise<void> {
    // TODO 実装
    const fileHandle = await this.inboxDirHandle.getFileHandle(id)
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

export class DetailRepositoryImpl implements DetailRepository {
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

async function moveTo(fileHandle: any, fromDirHandle: any, toDirHandle: any) {
  const file = await fileHandle.getFile();
  const name = file.name;
  const text = await file.text();
  
  // TODO: 移動先、移動元ファイルの存在有無確認

  // 移動先ファイルの作成
  await verifyPermission(fromDirHandle, true);
  const newFileHandle = await toDirHandle.getFileHandle(name, {create: true});
  const writable = await newFileHandle.createWritable();
  await writable.write(text);
  await writable.close();
  
  // 移動元ファイルの削除
  await verifyPermission(toDirHandle, true);
  await fromDirHandle.removeEntry(name)
}