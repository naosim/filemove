import {InboxFileRepositoryImpl, DetailRepositoryImpl} from "./datasource/datasource.ts"
import { InboxFile, InboxFileRepository, DetailRepository } from "./domain/domain.ts";


var inboxFileRepository: InboxFileRepository;
var detailRepository: DetailRepository;


class MessageVM {
  #value;
  isChecked: boolean;
  selected: boolean;
  constructor(value: {id: string, subject: string, isChecked: boolean, date: Date}, private readonly today: Date) {
    this.#value = value;
    this.isChecked = value.isChecked;
    this.selected = false;
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
  get dateRaw(): Date {
    return this.#value.date
  }
}

class MessageVMList {
  constructor(readonly values: MessageVM[]) {
  }
  inboxMessages(filterTextList: string[]): MessageVM[] {
    return this.values
      .filter(v => !v.isChecked)
      .filter(v => {
        for(let i = 0; i < filterTextList.length; i++) {
          if(`${v.dateRaw.toLocaleString()} ${v.subject}`.indexOf(filterTextList[i]) == -1) {
            return false;
          }
        }
        return true;
      })
  }
  stageMessages(): MessageVM[] {
    return this.values.filter(v => v.isChecked)
  }
  select(id: string) {
    this.values.forEach(v => v.selected = (v.id == id))
  }
}

function today(): Date {
  return new Date(new Date().toLocaleDateString());
}

var data = {
  list: new MessageVMList([
    new MessageVM({id:"1", subject: "sample", isChecked: false, date: new Date()}, today()),
  ]),
  detail: {
    subject: 'さぶじぇくと',
    body: 'ぼでぃー'
  },
  filterText: ''
}
declare var Vue: any;

var app = new Vue({
  el: '#app',
  data: data,
  methods: {
    inboxMessages: function() {
      return data.list.inboxMessages(data.filterText.split(' '))
    },
    stageMessages: function() {
      return data.list.stageMessages()
    },
    stage: function(item: MessageVM) {
      item.isChecked = true;
    },
    unstage: function(item: MessageVM) {
      item.isChecked = false;
    },
    showDetail: async function(item: MessageVM) {
      const body = await detailRepository.find(item.id)
      data.list.select(item.id);
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
      const list = inboxFileRepository.findAll()
      .map(v => new MessageVM({id: v.id, subject: v.name, isChecked: false, date: v.date}, today()))
      data.list = new MessageVMList(list)
    },
    archiveAll: async function() {
      const list = this.stageMessages();
      for(let i = 0; i < list.length; i++) {
        const v = list[i];
        await inboxFileRepository.archive(v.id);
      }
      data.list = new MessageVMList(data.list.inboxMessages([]));
      
    }
  },
})