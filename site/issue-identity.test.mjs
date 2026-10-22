import test from 'node:test';
import assert from 'node:assert/strict';
import {publicIssueNumber,newestFirst,nextRegularIssueNumber,issueAnnouncementTitle} from './issue-identity.js';
import {releaseTranslations} from './i18n.js';
test('custom insertion preserves normal numbers and hides its internal identity',()=>{
  const issues=[{id:'041'},{id:'040'},{id:'custom-000',kind:'custom',number:null,displayOrder:41.5}];
  assert.deepEqual([...issues].sort(newestFirst).map(i=>i.id),['custom-000','041','040']);
  assert.equal(publicIssueNumber(issues[2]),null);
  assert.equal(publicIssueNumber(issues[0]),'041');
  assert.equal(nextRegularIssueNumber(issues),42);
  assert.equal(nextRegularIssueNumber([...issues,{id:'custom-999',kind:'custom',displayOrder:99}]),42);
  for(const language of ['zh','en','ja'])assert.doesNotMatch(issueAnnouncementTitle(issues[2],language),/000|custom-/);
  assert.match(issueAnnouncementTitle(issues[0],'en'),/041/);
});
test('custom editorial translations survive the release feed',()=>{
 const issue={id:'custom-000',kind:'custom',title:'定制',english:'Custom',intro:'介绍',width:100,height:100,translations:{ja:{title:'特別な作品',intro:'紹介文'}},targets:[{id:'nut',label:'栗子',bounds:[10,10,20,20],translations:{en:{label:'Chestnut'},ja:{label:'栗'}}}]};
 const copy=releaseTranslations(issue);
 assert.equal(copy.issue.ja.title,'特別な作品');
 assert.equal(copy.issue.ja.intro,'紹介文');
 assert.equal(copy.targets.nut.en.label,'Chestnut');
 assert.equal(copy.targets.nut.ja.label,'栗');
});
