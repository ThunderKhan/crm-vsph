import test from "node:test";
import assert from "node:assert/strict";
import {
  present, humanize, contactName, safeWebLink, usableEmail,
  emailLink, phoneLink, formatDate, taskDueDate, activityHistory,
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
