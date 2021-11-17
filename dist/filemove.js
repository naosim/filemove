class InboxFile {
    id;
    name;
    constructor(id1, name){
        this.id = id1;
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
    const name1 = file.name;
    const text = await file.text();
    await verifyPermission(fromDirHandle, true);
    const newFileHandle = await toDirHandle.getFileHandle(name1, {
        create: true
    });
    const writable = await newFileHandle.createWritable();
    await writable.write(text);
    await writable.close();
    await verifyPermission(toDirHandle, true);
    await fromDirHandle.removeEntry(name1);
}
var inboxFileRepository;
var detailRepository;
class MessageVM {
    #value;
    isChecked;
    constructor(value){
        this.#value = value;
        this.isChecked = value.isChecked;
    }
    get id() {
        return this.#value.id;
    }
    get subject() {
        return this.#value.subject;
    }
    get date() {
        return "mm/dd";
    }
}
var data = {
    message: 'Hello Vue!',
    list: [
        new MessageVM({
            id: "1",
            subject: "sample",
            isChecked: false
        }), 
    ],
    detail: {
        subject: 'さぶじぇくと',
        body: 'ぼでぃー'
    }
};
var app = new Vue({
    el: '#app',
    data: data,
    methods: {
        inboxMessages: function() {
            return data.list.filter((v)=>!v.isChecked
            );
        },
        stageMessages: function() {
            return data.list.filter((v)=>v.isChecked
            );
        },
        stage: function(item) {
            console.log("click");
            item.isChecked = true;
            console.log(item.isChecked);
        },
        unstage: function(item) {
            item.isChecked = false;
        },
        showDetail: async function(item) {
            console.log('click show detail ' + item.id);
            const body = await detailRepository.find(item.id);
            data.detail.subject = item.id;
            data.detail.body = body;
        },
        init: async function() {
            const rep = await InboxFileRepositoryImpl.create();
            await rep.init();
            inboxFileRepository = rep;
            detailRepository = new DetailRepositoryImpl(rep);
            this.reload();
        },
        reload: function() {
            data.list = inboxFileRepository.findAll().map((v)=>new MessageVM({
                    id: v.id,
                    subject: v.name,
                    isChecked: false
                })
            );
        },
        archiveAll: async function() {
            const list = this.stageMessages();
            for(let i = 0; i < list.length; i++){
                const v = list[i];
                await inboxFileRepository.archive(v.id);
            }
            data.list = this.inboxMessages();
        }
    }
});
