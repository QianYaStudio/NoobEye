import test from 'node:test';
import assert from 'node:assert/strict';
import {issueValid} from './issue-identity.js';
test('custom statistics opt in independently of ordinary issue numbering',()=>{
 const env={CUSTOM_ISSUE_IDS:'custom-000, custom-003'};
 assert.equal(issueValid('041',env),true);
 assert.equal(issueValid('059',env),true);
 assert.equal(issueValid('060',env),false);
 assert.equal(issueValid('custom-000'),false);
 assert.equal(issueValid('custom-000',env),true);
 assert.equal(issueValid('custom-003',env),true);
 assert.equal(issueValid('custom-001',env),false);
 assert.equal(issueValid('custom-0000',{CUSTOM_ISSUE_IDS:'custom-0000'}),false);
 assert.equal(issueValid(null,env),false);
});
