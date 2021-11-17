class InboxFile {
    id;
    name;
    date;
    constructor(id1, name, date){
        this.id = id1;
        this.name = name;
        this.date = date;
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
    static getDateFromFilename(filename) {
        const segs = filename.split('_');
        const year = segs[0];
        const month = segs[1].slice(0, 2);
        const date1 = segs[1].slice(2);
        const hour = segs[2].slice(0, 2);
        const minute = segs[2].slice(2);
        return new Date(`${year}/${month}/${date1} ${hour}:${minute}`);
    }
    findAll() {
        return Object.keys(this.fileSystemDirectoryHandleMap).map((v)=>{
            return new InboxFile(v, v, InboxFileRepositoryImpl.getDateFromFilename(v));
        });
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
    today;
    #value;
    isChecked;
    constructor(value, today){
        this.today = today;
        this.#value = value;
        this.isChecked = value.isChecked;
        console.log(today);
    }
    get id() {
        return this.#value.id;
    }
    get subject() {
        return this.#value.subject;
    }
    get date() {
        const date1 = this.#value.date;
        if (date1.getTime() >= this.today.getTime()) {
            return date1.toLocaleTimeString().split(':').slice(0, -1).join(':');
        }
        if (date1.getFullYear() == this.today.getFullYear()) {
            return this.#value.date.toLocaleString().slice(5).split(':').slice(0, -1).join(':');
        }
        return this.#value.date.toLocaleString().split(':').slice(0, -1).join(':');
    }
}
function today1() {
    return new Date(new Date().toLocaleDateString());
}
var data = {
    message: 'Hello Vue!',
    list: [
        new MessageVM({
            id: "1",
            subject: "sample",
            isChecked: false,
            date: new Date()
        }, today1()), 
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
            if (!inboxFileRepository) {
                const rep = await InboxFileRepositoryImpl.create();
                inboxFileRepository = rep;
                detailRepository = new DetailRepositoryImpl(rep);
            }
            await this.reload();
        },
        reload: async function() {
            await inboxFileRepository.reload();
            data.list = inboxFileRepository.findAll().map((v)=>new MessageVM({
                    id: v.id,
                    subject: v.name,
                    isChecked: false,
                    date: v.date
                }, today1())
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
