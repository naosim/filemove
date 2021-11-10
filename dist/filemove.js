class InboxFile {
    id;
    name;
    constructor(id, name){
        this.id = id;
        this.name = name;
    }
}
var ArchiveCandidateStatus;
(function(ArchiveCandidateStatus) {
    class Entity {
        id;
        isArchived;
        constructor(id, isArchived){
            this.id = id;
            this.isArchived = isArchived;
        }
        update(isArchived) {
            return new Entity(this.id, isArchived);
        }
    }
    ArchiveCandidateStatus.Entity = Entity;
    class Repository {
        map = {
        };
        find(id) {
            if (!this.map[id]) {
                this.map[id] = new Entity(id, false);
            }
            return this.map[id];
        }
        findAllArchved() {
            return Object.values(this.map).filter((v)=>v.isArchived
            );
        }
        update(entity) {
            this.map[entity.id] = entity;
        }
        isArchived(id) {
            return this.find(id).isArchived;
        }
    }
    ArchiveCandidateStatus.Repository = Repository;
})(ArchiveCandidateStatus || (ArchiveCandidateStatus = {
}));
class InboxFileRepositoryImpl {
    inboxDirHandle;
    archiveDirHandle;
    fileSystemDirectoryHandleMap = {
    };
    constructor(inboxDirHandle, archiveDirHandle){
        this.inboxDirHandle = inboxDirHandle;
        this.archiveDirHandle = archiveDirHandle;
        verifyPermission(inboxDirHandle, true);
        verifyPermission(archiveDirHandle, true);
    }
    async init() {
        await this.reload();
    }
    async reload() {
        const map = {
        };
        for await (const [key, value] of this.inboxDirHandle.entries()){
            map[key] = value;
        }
        this.fileSystemDirectoryHandleMap = map;
    }
    findAll() {
        return Object.keys(this.fileSystemDirectoryHandleMap).map((v)=>new InboxFile(v, v)
        );
    }
    async archive(id) {
        const fileHandle = await this.inboxDirHandle.getFileHandle(id);
        await fileHandle.getFile();
        moveTo(fileHandle, this.inboxDirHandle, this.archiveDirHandle);
    }
    async getBody(id) {
        const fileHandle = await this.inboxDirHandle.getFileHandle(id);
        const file = await fileHandle.getFile();
        return await file.text();
    }
    static async create() {
        var dirHandle = await window.showDirectoryPicker();
        var archive = null;
        var inbox = null;
        for await (const [key, value] of dirHandle.entries()){
            if (key == 'archive') {
                archive = value;
            }
            if (key == 'inbox') {
                inbox = value;
            }
        }
        if (archive == null) {
            throw new Error('archiveディレクトリがない');
        }
        if (inbox == null) {
            throw new Error('inboxディレクトリがない');
        }
        return new InboxFileRepositoryImpl(inbox, archive);
    }
}
class DetailRepositoryImpl {
    inboxFileRepositoryImpl;
    map = {
    };
    constructor(inboxFileRepositoryImpl){
        this.inboxFileRepositoryImpl = inboxFileRepositoryImpl;
    }
    async find(id) {
        if (!this.map[id]) {
            this.map[id] = await this.inboxFileRepositoryImpl.getBody(id);
        }
        return this.map[id];
    }
}
async function verifyPermission(fileHandle, withWrite) {
    const opts = {
    };
    if (withWrite) {
        opts.mode = 'readwrite';
    }
    if (await fileHandle.queryPermission(opts) === 'granted') {
        return true;
    }
    if (await fileHandle.requestPermission(opts) === 'granted') {
        return true;
    }
    return false;
}
async function moveTo(fileHandle, fromDirHandle, toDirHandle) {
    const file = await fileHandle.getFile();
    const name = file.name;
    const text = await file.text();
    await verifyPermission(fromDirHandle, true);
    const newFileHandle = await toDirHandle.getFileHandle(name, {
        create: true
    });
    const writable = await newFileHandle.createWritable();
    await writable.write(text);
    await writable.close();
    await verifyPermission(toDirHandle, true);
    await fromDirHandle.removeEntry(name);
}
var inboxFileRepository;
var detailRepository;
const archiveCandidateStatusRepository = new ArchiveCandidateStatus.Repository();
window.document.querySelector('#initButton').addEventListener('click', async ()=>{
    const rep = await InboxFileRepositoryImpl.create();
    await rep.init();
    inboxFileRepository = rep;
    detailRepository = new DetailRepositoryImpl(rep);
    reload();
});
function createInboxLi(inboxFile) {
    const status = archiveCandidateStatusRepository.find(inboxFile.id);
    const button = window.document.createElement('button');
    button.innerHTML = 'archived';
    button.addEventListener('click', ()=>{
        console.log('archive');
        archiveCandidateStatusRepository.update(status.update(true));
        aLink.className = 'archived';
    });
    const aLink = window.document.createElement('a');
    aLink.innerHTML = inboxFile.name;
    aLink.className = status.isArchived ? 'archived' : '';
    aLink.addEventListener('click', async ()=>{
        console.log(inboxFile.name);
        const body = window.document.querySelector('#body');
        body.innerHTML = await detailRepository.find(inboxFile.id);
    });
    const li = window.document.createElement('li');
    li.appendChild(button);
    li.appendChild(aLink);
    return li;
}
function reload() {
    const ul = window.document.querySelector('ul');
    ul.innerHTML = '';
    inboxFileRepository.findAll().map((v)=>createInboxLi(v)
    ).forEach((v)=>ul.appendChild(v)
    );
    window.document.querySelectorAll('a.row').forEach((v)=>{
        v.addEventListener('click', ()=>console.log(v.innerText)
        );
    });
}
async function archiveAll() {
    archiveCandidateStatusRepository.findAllArchved().forEach(async (v)=>{
        await inboxFileRepository.archive(v.id);
        console.log('archved');
    });
    console.log('archive end');
}
window.document.querySelector('#archiveAllButton').addEventListener('click', async ()=>archiveAll()
);
