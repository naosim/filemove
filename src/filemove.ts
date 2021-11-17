import {InboxFileRepositoryImpl, DetailRepositoryImpl} from "./datasource/datasource.ts"
import { InboxFile, InboxFileRepository, DetailRepository } from "./domain/domain.ts";


var inboxFileRepository: InboxFileRepository;
var detailRepository: DetailRepository;

// (window as any).document.querySelector('#initButton').addEventListener('click', async ()=> {
//   const rep = await InboxFileRepositoryImpl.create()
//   await rep.init()
//   inboxFileRepository = rep;
//   detailRepository = new DetailRepositoryImpl(rep);

//   reload();
// })


// function reload() {
//   const ul = (window as any).document.querySelector('ul');
//   ul.innerHTML = '';// clear child
//   // const list: InboxFile[] = inboxFileRepository.findAll();
//   inboxFileRepository.findAll().map((v) => createInboxLi(v)).forEach(v => ul.appendChild(v));

//   (window as any).document.querySelectorAll('a.row').forEach((v:any) => {
//     v.addEventListener('click', () => console.log(v.innerText))
//   })
// }

// (window as any).document.querySelector('#archiveAllButton').addEventListener('click', async () => archiveAll());

class MessageVM {
  #value;
  isChecked: boolean;
  constructor(value: {id: string, subject: string, isChecked: boolean}) {
    this.#value = value;
    this.isChecked = value.isChecked;
    // this.subject = value.subject;
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
  // map: {
  //   "1": new MessageVM({id:"1", subject: "sample", isChecked: false})
  // } as {[key: string]: MessageVM},
  list: [
    new MessageVM({id:"1", subject: "sample", isChecked: false}),
  ],
  detail: {
    subject: 'さぶじぇくと',
    body: 'ぼでぃー'
  }
}
declare var Vue: any;

var app = new Vue({
  el: '#app',
  data: data,
  methods: {
    inboxMessages: function() {
      return data.list.filter(v => !v.isChecked)
    },
    stageMessages: function() {
      return data.list.filter(v => v.isChecked)
    },
    stage: function(item: MessageVM) {
      console.log("click");
      item.isChecked = true;
      console.log(item.isChecked);
    },
    unstage: function(item: MessageVM) {
      item.isChecked = false;
    },
    showDetail: async function(item: MessageVM) {
      console.log('click show detail ' + item.id)
      const body = await detailRepository.find(item.id)

      data.detail.subject = item.id;
      data.detail.body = body;
    },
    init: async function() {
      const rep = await InboxFileRepositoryImpl.create()
      await rep.init()
      inboxFileRepository = rep;
      detailRepository = new DetailRepositoryImpl(rep);

      this.reload();
    },
    reload: function() {
      // data.list
      // while(data.list.length > 0) {
      //   data.list.pop();
      // }
      data.list = inboxFileRepository.findAll()
        .map(v => new MessageVM({id: v.id, subject: v.name, isChecked: false}))
        // .forEach(v => data.map[v.id] = v);
    },
    archiveAll: async function() {
      const list = this.stageMessages();
      for(let i = 0; i < list.length; i++) {
        const v = list[i];
        await inboxFileRepository.archive(v.id);
      }
      data.list = this.inboxMessages();
      
    }
  },
})