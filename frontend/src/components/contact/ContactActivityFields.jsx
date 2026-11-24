import { useEffect, useState } from "react";
import { api } from "../../utils/api";
import { assignableTaskUser } from "./contactMotionUtils.js";
import { humanize } from "./contactWorkspaceUtils.js";

const outcomes=["CONNECTED","NOT_CONNECTED","RINGING","NOT_AVAILABLE","PITCH_DONE","NOT_INTERESTED","NOT_RELEVANT","LEFT_ORGANIZATION","WRONG_NUMBER","DNC"];

export function TaskAssigneeField({draft,setDraft,role,userId,tenantId}) {
  const [users,setUsers]=useState([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const employee=role==="EMPLOYEE";
  useEffect(()=>{
    if(employee)return;
    let active=true;
    api.get("/api/users?limit=100").then(result=>{
      if(!result.success||!Array.isArray(result.data))throw new Error("Could not load assignees.");
      if(active)setUsers(result.data.filter(user=>assignableTaskUser(user,role,tenantId)));
    }).catch(error=>{if(active)setError(error.message||"Could not load assignees.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[employee,role,tenantId]);
  if(employee)return <p className="cw-muted">Assigned to you</p>;
  return <label>Assignee<select value={draft.assignee||""} onChange={event=>setDraft(prev=>({...prev,assignee:event.target.value}))} disabled={loading}>
    <option value="">{role==="ORG_ADMIN"?"Choose an assignee":"Assign to me"}</option>
    {users.map(user=><option key={user.user_id} value={user.user_id}>{user.user_name}</option>)}
  </select>{error&&<span className="cw-field-error" role="alert">{error}</span>}</label>;
}

export function CallOutcomeFields({draft,setDraft,canTask,role,userId,tenantId}) {
  const set=(key,value)=>setDraft(prev=>({...prev,[key]:value}));
  return <>
    <label>Call outcome<select value={draft.outcome} onChange={e=>set("outcome",e.target.value)}><option value="">Not recorded</option>{outcomes.map(outcome=><option key={outcome} value={outcome}>{humanize(outcome)}</option>)}</select></label>
    {canTask&&<><label className="cw-filter-mine"><input type="checkbox" checked={draft.followup} onChange={e=>set("followup",e.target.checked)}/> Schedule a follow-up</label>
      {draft.followup&&<div className="cw-form-fields">
        <label>Follow-up subject<input required value={draft.followupSubject} maxLength={191} onChange={e=>set("followupSubject",e.target.value)}/></label>
        <div className="cw-date-row"><label>Follow-up date<input type="date" required value={draft.followupDate} onChange={e=>set("followupDate",e.target.value)}/></label><label>Follow-up time<input type="time" value={draft.followupTime} onChange={e=>set("followupTime",e.target.value)}/></label></div>
        <TaskAssigneeField draft={draft} setDraft={setDraft} role={role} userId={userId} tenantId={tenantId}/>
      </div>}
    </>}
  </>;
}

export function EntryFields({draft,onChange,kind}) {
  const set=(key,value)=>onChange({...draft,[key]:value});
  return <>
    <label>Subject<input required maxLength={191} value={draft.subject} onChange={e=>set("subject",e.target.value)}/></label>
    <label>{kind==="NOTE"?"Note":"Interaction notes"}<textarea required maxLength={10000} rows={5} value={draft.description} onChange={e=>set("description",e.target.value)}/></label>
    <label>Occurred at<input type="datetime-local" value={draft.occurred} onChange={e=>set("occurred",e.target.value)}/></label>
    <p className="cw-muted">{kind==="NOTE"?"Internal note; leave time empty to record now.":"Manual record only. CRM does not send messages or schedule meetings."}</p>
  </>;
}
