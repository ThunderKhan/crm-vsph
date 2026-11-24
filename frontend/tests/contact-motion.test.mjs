import test from "node:test";
import assert from "node:assert/strict";
import { selectionIndicator, activityKey, requiredActivityFields, taskStatusLabel, nextTaskCompletion, completionActor } from "../src/components/contact/contactMotionUtils.js";

test("indicator follows actual tab bounds including wrapped rows",()=>{
  assert.deepEqual(selectionIndicator({left:10,top:20},{left:30,bottom:64,width:90}),{x:20,y:41,width:90});
  assert.deepEqual(selectionIndicator({left:10,top:20},{left:10,bottom:108,width:75}),{x:0,y:85,width:75});
  assert.equal(selectionIndicator({left:0,top:0},{width:0}),null);
  assert.equal(selectionIndicator(null,null),null);
});
test("new activity keys distinguish record types and reject missing IDs",()=>{
  assert.equal(activityKey("call",{call_id:"42"}),"call-42");
  assert.equal(activityKey("task",{task_id:"42"}),"task-42");
  assert.equal(activityKey("call",{}),null);
});
test("composer validates only required fields for the current mode",()=>{
  assert.deepEqual(requiredActivityFields("call",{subject:" ",description:""}),{subject:"Enter a call subject or outcome.",description:"Enter call notes."});
  assert.deepEqual(requiredActivityFields("call",{subject:"Call",description:"Notes"}),{});
  assert.deepEqual(requiredActivityFields("task",{subject:""}),{subject:"Enter a task subject."});
  assert.deepEqual(requiredActivityFields("email",{}),{});
});

test("completion follows existing role and task transition boundaries",()=>{
  const t={task_id:"t1",task_user_fk:"u1",task_status:"TODO"};
  const employee={canEdit:true,role:"EMPLOYEE",userId:"u1"};
  assert.equal(nextTaskCompletion(t,employee),"COMPLETED");
  assert.equal(nextTaskCompletion({...t,task_status:"COMPLETED"},employee),"IN_PROGRESS");
  assert.equal(nextTaskCompletion({...t,task_status:"BLOCKED"},employee),null);
  assert.equal(nextTaskCompletion(t,{...employee,userId:"u2"}),null);
  assert.equal(nextTaskCompletion(t,{...employee,canEdit:false}),null);
  assert.equal(nextTaskCompletion({...t,user:{user_role:"ADMIN"}},{canEdit:true,role:"ORG_ADMIN"}),null);
  assert.equal(taskStatusLabel("TODO"),"Pending");
  assert.equal(taskStatusLabel("COMPLETED"),"Completed");
});
test("completion attribution comes from the audit actor, not task owner",()=>{
  const task={task_status:"COMPLETED",user:{user_name:"Assignee"},task_updates:[{previous_status:"COMPLETED",new_status:"COMPLETED",user:{user_name:"Note author"}},{previous_status:"TODO",new_status:"COMPLETED",user:{user_name:"Completing user"}}]};
  assert.equal(completionActor(task),"Completing user");
  assert.equal(completionActor({...task,task_updates:[]}),null);
  assert.equal(completionActor({...task,task_status:"IN_PROGRESS"}),null);
});
