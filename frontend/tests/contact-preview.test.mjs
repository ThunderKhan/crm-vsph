import test from "node:test";
import assert from "node:assert/strict";
import { createContactPreviewStore, PREVIEW_SCENARIOS, PREVIEW_SESSION } from "../src/dev/contactPreviewFixtures.js";

const full=PREVIEW_SCENARIOS[0].id, sparse=PREVIEW_SCENARIOS[1].id, long=PREVIEW_SCENARIOS[2].id, reference=PREVIEW_SCENARIOS[3].id;
const make=()=>{const store=createContactPreviewStore({now:()=>"2026-11-24T12:00:00.000Z"});store.setDelay(0);return store;};

test("seeded scenarios expose production-shaped responses without credentials",async()=>{
  const s=make(), detail=await s.request("GET","/api/contacts/"+full);
  assert.equal(detail.data.contact_firstname,"Priya");
  assert.equal(detail.data.contact_owner.user_name,"Arjun Mehta");
  assert.equal(detail.data.opportunities.length,2);
  assert.equal((await s.request("GET","/api/calls?contact_id="+full)).length,2);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+full)).data.length,2);
  assert.equal((await s.request("GET","/api/calls?contact_id="+sparse)).length,0);
  assert.equal((await s.request("GET","/api/contacts/"+sparse)).data.contact_professional_email,undefined);
  assert.equal((await s.request("GET","/api/calls?contact_id="+long)).length,8);
  const referenceContact=(await s.request("GET","/api/contacts/"+reference)).data;
  assert.equal(referenceContact.contact_code,"CON-000003");
  assert.equal(referenceContact.contact_call_status,"CONNECTED");
  assert.equal(referenceContact.contact_professional_email,"rakesh@example.com");
  assert.equal((await s.request("GET","/api/calls?contact_id="+reference)).length,0);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+reference)).data.length,0);
  assert.equal(PREVIEW_SESSION.vsph_auth_token,undefined);
});
test("call and task writes persist only in the selected contact",async()=>{
  const s=make();
  const c=await s.request("POST","/api/calls",{call_contact_fk:full,call_subject:"Demo",call_description:"Mock notes"});
  assert.ok(c.call_id);
  assert.equal(c.call_created_at,"2026-11-24T12:00:00.000Z");
  const t=await s.request("POST","/api/tasks",{task_contact_fk:full,task_subject:"Follow up",task_priority:"HIGH"});
  assert.equal(t.success,true);
  assert.equal((await s.request("GET","/api/calls?contact_id="+full)).length,3);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+full)).data.length,3);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+sparse)).data.length,0);
});
test("editing and campaign assignment derive relationships, and reset restores seed",async()=>{
  const s=make();
  const options=await s.request("GET","/api/campaigns?limit=1&page=2");
  const campaign=options.data[0];
  assert.equal(options.pagination.totalRecords,2);
  assert.equal((await s.request("PUT","/api/contacts/"+full,{contact_firstname:"Edited",contact_campaign_fk:campaign.campaign_id})).success,true);
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_campaign.campaign_name,campaign.campaign_name);
  s.reset();s.setDelay(0);
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_firstname,"Priya");
});
test("creation, deletion, pagination, and search operate on the fixture",async()=>{
  const s=make(), result=await s.request("POST","/api/contacts",{contact_firstname:"Demo",contact_lastname:"Record"});
  assert.equal(result.success,true);
  assert.equal((await s.request("GET","/api/contacts?limit=2")).pagination.totalRecords,5);
  assert.equal((await s.request("GET","/api/search?q=Demo")).length,1);
  assert.equal((await s.request("DELETE","/api/contacts/"+result.data.contact_id)).success,true);
  assert.equal((await s.request("GET","/api/contacts/"+result.data.contact_id)).success,false);
});
test("one-shot failure rejects mutations without changing data",async()=>{
  const s=make(), payload={call_contact_fk:full,call_subject:"Test",call_description:"Notes"};
  s.failNextWrite();
  assert.equal((await s.request("GET","/api/contacts/"+full)).success,true);
  assert.equal((await s.request("POST","/api/calls",payload)).success,false);
  assert.equal((await s.request("GET","/api/calls?contact_id="+full)).length,2);
  assert.ok((await s.request("POST","/api/calls",payload)).call_id);
});
test("unsupported endpoints fail closed; response mutations do not mutate store",async()=>{
  const s=make(), item=await s.request("GET","/api/contacts/"+full);
  item.data.contact_firstname="Corrupted";
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_firstname,"Priya");
  assert.equal((await s.request("GET","/api/unknown")).success,false);
  await assert.rejects(s.request("GET","https://example.com/api/contacts"),/Unsupported preview endpoint/);
});
test("reset invalidates in-flight writes",async()=>{
  const s=make();s.setDelay(10);
  const pending=s.request("DELETE","/api/contacts/"+full);
  s.reset();s.setDelay(0);
  assert.equal((await pending).success,false);
  assert.equal((await s.request("GET","/api/contacts/"+full)).success,true);
});
