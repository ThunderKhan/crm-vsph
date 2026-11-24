import test from "node:test";
import assert from "node:assert/strict";
import {
  present, humanize, contactName, safeWebLink, usableEmail,
  emailLink, phoneLink, formatDate, taskDueDate, activityHistory, groupActivityByDate, activityTime, filterActivity,
} from "../src/components/contact/contactWorkspaceUtils.js";

test("missing properties are distinguished from zero values", () => {
  for (const value of [null,undefined,""," ","—","-"]) assert.equal(present(value),false);
  assert.equal(present(0),true);
  assert.equal(humanize("PITCH_DONE"),"Pitch done");
  assert.equal(humanize(null,"Not assigned"),"Not assigned");
});
test("contact identity retains name parts and handles missing names", () => {
  assert.equal(contactName({contact_salutation:"Dr.",contact_firstname:"Ada",contact_middlename:"M",contact_lastname:"Lovelace",contact_suffix:"Jr."}),"Dr. Ada M Lovelace Jr.");
  assert.equal(contactName({}),"Unnamed contact");
});
test("external profile links allow only HTTP(S)", () => {
  assert.equal(safeWebLink("https://example.com/a"),"https://example.com/a");
  assert.equal(safeWebLink("http://example.com"),"http://example.com/");
  for(const value of ["javascript:alert(1)","data:text/html,x","//example.com","not a URL",""]) assert.equal(safeWebLink(value),null);
});
test("mail client draft encodes the recipient, subject and body", () => {
  assert.equal(usableEmail("ada+work@example.com"),true);
  assert.equal(emailLink("ada+work@example.com","A & B?","First line\nSecond #"),"mailto:ada%2Bwork@example.com?subject=A%20%26%20B%3F&body=First%20line%0ASecond%20%23");
  assert.equal(emailLink("bad@example.com?bcc=x@y.com"),null);
  assert.equal(emailLink(""),null);
});
test("phone links reject missing or unsafe inputs", () => {
  assert.equal(phoneLink("+91 (123) 456-7890"),"tel:+911234567890");
  assert.equal(phoneLink("—"),null);
  assert.equal(phoneLink("javascript:alert(1)"),null);
  assert.equal(phoneLink("()"),null);
});
test("date formatting avoids invented timestamps and task dates use local time", () => {
  assert.equal(formatDate(null),null);
  assert.equal(formatDate("invalid"),null);
  assert.equal(taskDueDate("","12:30"),null);
  assert.equal(taskDueDate("2026-11-24","12:30"),new Date(2026,10,24,12,30).toISOString());
  assert.throws(()=>taskDueDate("invalid","12:30"),/valid due date/);
});
test("combined activity uses real creation times, sorts newest first, and filters independently", () => {
  const calls=[{call_id:"c1",call_created_at:"2026-11-20T12:00:00Z"},{call_id:"c2",call_created_at:null}];
  const tasks=[{task_id:"t1",task_created_at:"2026-11-24T12:00:00Z",task_due_date:"2026-11-30T00:00:00Z"}];
  assert.deepEqual(activityHistory(calls,tasks).map(x=>x.record.call_id||x.record.task_id),["t1","c1","c2"]);
  assert.equal(activityHistory(calls,tasks).at(-1).date,null);
  assert.deepEqual(activityHistory(calls,tasks,"call").map(x=>x.record.call_id),["c1","c2"]);
  assert.deepEqual(activityHistory(calls,tasks,"task").map(x=>x.record.task_id),["t1"]);
  assert.equal(calls.length,2);
});

test("timeline date grouping preserves sorted order and separates missing dates",()=>{
  const local=(y,m,d,h)=>new Date(y,m,d,h).toISOString();
  const items=[{date:local(2026,10,24,15),record:{id:1}},{date:local(2026,10,24,1),record:{id:2}},{date:local(2026,10,23,23),record:{id:3}},{date:null,record:{id:4}},{date:"invalid",record:{id:5}}];
  const groups=groupActivityByDate(items);
  assert.deepEqual(groups.map(g=>g.label),["24 November 2026","23 November 2026","Date unavailable"]);
  assert.deepEqual(groups.map(g=>g.items.map(i=>i.record.id)),[[1,2],[3],[4,5]]);
  assert.deepEqual(groupActivityByDate([]),[]);
  assert.equal(activityTime(null),"Time unavailable");
  assert.equal(activityTime("invalid"),"Time unavailable");
  assert.equal(activityTime(items[0].date),new Date(items[0].date).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}));
});

test("activity search, task filters and global alphabetical sorting compose",()=>{
  const items=activityHistory([{call_subject:"Beta call",call_created_at:"2026-11-24"}],[{task_subject:"Zulu task",task_status:"TODO",task_priority:"HIGH",task_created_at:"2026-11-23"},{task_subject:"Alpha task",task_status:"COMPLETED",task_priority:"LOW",task_created_at:"2026-11-22"}]);
  const names=rows=>rows.map(x=>x.record.call_subject||x.record.task_subject);
  assert.deepEqual(names(filterActivity(items,{sort:"az"})),["Alpha task","Beta call","Zulu task"]);
  assert.deepEqual(names(filterActivity(items,{sort:"za"})),["Zulu task","Beta call","Alpha task"]);
  assert.deepEqual(names(filterActivity(items,{sort:"oldest"})),["Alpha task","Zulu task","Beta call"]);
  assert.deepEqual(names(filterActivity(items,{status:"TODO",priority:"HIGH",query:" ZULU "})),["Zulu task"]);
  assert.deepEqual(filterActivity(items,{status:"TODO",priority:"LOW"}),[]);
  assert.deepEqual(names(filterActivity(items,{query:"beta"})),["Beta call"]);
});
