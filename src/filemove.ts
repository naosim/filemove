import {InboxFileRepositoryImpl, DetailRepositoryImpl} from "./datasource/datasource.ts"
import { InboxFile, ArchiveCandidateStatus, InboxFileRepository, DetailRepository } from "./domain/domain.ts";


var inboxFileRepository: InboxFileRepository;
var detailRepository: DetailRepository;
const archiveCandidateStatusRepository = new ArchiveCandidateStatus.Repository();

(window as any).document.querySelector('#initButton').addEventListener('click', async ()=> {
  const rep = await InboxFileRepositoryImpl.create()
  await rep.init()
  inboxFileRepository = rep;
  detailRepository = new DetailRepositoryImpl(rep);

  reload();
})

function createInboxLi(inboxFile: InboxFile) {
  const status = archiveCandidateStatusRepository.find(inboxFile.id);
    
  const button = (window as any).document.createElement('button');
  button.innerHTML = 'archived';
  button.addEventListener('click', () => {
    // アーカイブ状態を更新
    console.log('archive');
    archiveCandidateStatusRepository.update(status.update(true));
    aLink.className = 'archived';
  });
  
  const aLink = (window as any).document.createElement('a');
  aLink.innerHTML = inboxFile.name;
  aLink.className = status.isArchived ? 'archived' : ''
  aLink.addEventListener('click', async () => {
    console.log(inboxFile.name);
    const body = (window as any).document.querySelector('#body');
    body.innerHTML = await detailRepository.find(inboxFile.id);
  });
  
  const li = (window as any).document.createElement('li');
  li.appendChild(button);
  li.appendChild(aLink);
  return li;
}

function reload() {
  const ul = (window as any).document.querySelector('ul');
  ul.innerHTML = '';// clear child
  // const list: InboxFile[] = inboxFileRepository.findAll();
  inboxFileRepository.findAll().map((v) => createInboxLi(v)).forEach(v => ul.appendChild(v));

  (window as any).document.querySelectorAll('a.row').forEach((v:any) => {
    v.addEventListener('click', () => console.log(v.innerText))
  })
}

async function archiveAll() {
  archiveCandidateStatusRepository.findAllArchved().forEach(async (v) => {
    await inboxFileRepository.archive(v.id)
    console.log('archved')
  })
  console.log('archive end')
}
(window as any).document.querySelector('#archiveAllButton').addEventListener('click', async () => archiveAll());