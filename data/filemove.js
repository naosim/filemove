class InboxFile {
    id;
    name;
    constructor(id, name){
        this.id = id;
        this.name = name;
    }
}
class InboxFileRepositoryImpl {
    inboxDirHandle;
    archiveDirHandle;
    fileSystemDirectoryHandleMap = {
    };
    constructor(inboxDirHandle, archiveDirHandle){
        this.inboxDirHandle = inboxDirHandle;
        this.archiveDirHandle = archiveDirHandle;
    }
    async init() {
        await this.reload();
    }
    async reload() {
        const map = {
        };
        for await (const [key, value] of this.inboxDirHandle.entries()){
            map[key] = value;
            console.log({
                key,
                value
            });
        }
        this.fileSystemDirectoryHandleMap = map;
    }
    findAll() {
        return Object.keys(this.fileSystemDirectoryHandleMap).map((v)=>new InboxFile(v, v)
        );
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
window.document.querySelector('#initButton').addEventListener('click', async ()=>{
    const rep = await InboxFileRepositoryImpl.create();
    await rep.init();
    rep.findAll().map((v)=>console.log(v)
    );
});
