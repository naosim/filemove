import {InboxFileRepositoryImpl, DetailRepositoryImpl} from "./datasource/datasource.ts"
import { InboxFile, InboxFileRepository, DetailRepository } from "./domain/domain.ts";


var inboxFileRepository: InboxFileRepository;
var detailRepository: DetailRepository;


class MessageVM {
  #value;
  isChecked: boolean;
  constructor(value: {id: string, subject: string, isChecked: boolean, date: Date}, private readonly today: Date) {
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
    const date = this.#value.date;
    if(date.getTime() >= this.today.getTime()) {
      return date.toLocaleTimeString().split(':').slice(0, -1).join(':');
    }
    if(date.getFullYear() == this.today.getFullYear()) {
      return this.#value.date.toLocaleString().slice(5).split(':').slice(0, -1).join(':');
    }
    return this.#value.date.toLocaleString().split(':').slice(0, -1).join(':');
  }  
}

function today(): Date {
  return new Date(new Date().toLocaleDateString());
}

var data = {
  list: [
    new MessageVM({id:"1", subject: "sample", isChecked: false, date: new Date()}, today()),
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
      item.isChecked = true;
    },
    unstage: function(item: MessageVM) {
      item.isChecked = false;
    },
    showDetail: async function(item: MessageVM) {
      const body = await detailRepository.find(item.id)

      data.detail.subject = item.id;
      data.detail.body = body;
    },
    init: async function() {
      if(!inboxFileRepository) {
        const rep = await InboxFileRepositoryImpl.create()
        inboxFileRepository = rep;
        detailRepository = new DetailRepositoryImpl(rep);
      }
      await this.reload();
    },
    reload: async function() {
      await inboxFileRepository.reload()
      data.list = inboxFileRepository.findAll()
        .map(v => new MessageVM({id: v.id, subject: v.name, isChecked: false, date: v.date}, today()))
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