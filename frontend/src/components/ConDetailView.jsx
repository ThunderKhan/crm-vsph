import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, MoreHorizontal, Phone, CheckCircle, FileText, Copy, Trash2, UserPlus, ChevronDown, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { api } from "../utils/api";
import { readSessionValue } from "../utils/session.js";
import { canDoAction, hasModule, currentOrgRole } from "../utils/modules";
import AddContactModal from "./modals/AddContactModal";
import ContactProperties, { Expandable } from "./contact/ContactProperties";
import { SlidingTabs, CopyGlyph, useCopyFeedback, Tooltip, ContactSkeleton } from "./contact/ContactMotion";
import { ActivityFilters, AddActivityMenu } from "./contact/ActivityToolbar";
import { ActivityComposerDialog } from "./contact/ActivityComposerDialog";
import { ContactTaskEditor, TaskStatusControl } from "./contact/ContactTaskEditor";
import { useDialogExit } from "./contact/useDialogExit";
import { activityKey, requiredActivityFields, nextTaskCompletion, completionActor, allowedTaskStatuses, canManageTaskDetails } from "./contact/contactMotionUtils.js";
import { activityHistory, groupActivityByDate, activityTime, filterActivity, contactName, emailLink, usableEmail, formatDate, humanize, taskDueDate } from "./contact/contactWorkspaceUtils.js";
import "./contact/contactWorkspace.css";

const errorMessage = (response, fallback) => response?.message || response?.error || fallback;
const blankTask = { subject:"", description:"", priority:"NORMAL", date:"", time:"12:00" };
const blankCall = { subject:"", description:"" };
const blankEmail = { subject:"", body:"", recipient:"" };

function MoreActions({ canEdit, canDelete, onCampaign, onDelete, code }) {
  const [open, setOpen] = useState(false);
  const {copied,copy:copyId}=useCopyFeedback(code);
  const [align,setAlign] = useState("right");
  const container = useRef(null), trigger = useRef(null), menu = useRef(null);
  const id = useId();
  function close(focus = false) { setOpen(false); if (focus) trigger.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    const handleOutside = (event) => { if (!container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);
  function items() { return Array.from(menu.current?.querySelectorAll("button:not(:disabled)") || []); }
  function keyDown(event) {
    if (event.key === "Escape") { event.preventDefault(); close(true); }
    if (event.key === "Tab") { close(true); return; }
    if (["ArrowDown","ArrowUp","Home","End"].includes(event.key)) {
      event.preventDefault();
      const buttons = items(), index = buttons.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length-1 : event.key === "ArrowDown" ? (index+1)%buttons.length : (index<=0 ? buttons.length-1 : index-1);
      buttons[next]?.focus();
    }
  }
  const openMenu = (last = false) => {
    const bounds = trigger.current?.getBoundingClientRect();
    setAlign(bounds && bounds.right < 224 ? "left" : "right");
    setOpen(true);
    requestAnimationFrame(() => { const buttons = items(); buttons[last ? buttons.length-1 : 0]?.focus(); });
  };
  return <div className="cw-menu-anchor" ref={container} onKeyDown={keyDown}>
    <Tooltip text={copied ? "Contact ID copied" : "More contact actions"}><button type="button" className="cw-button cw-icon" ref={trigger} aria-label="More contact actions" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => open ? close(true) : openMenu()} onKeyDown={e => { if (["ArrowDown","ArrowUp"].includes(e.key) && !open) { e.stopPropagation(); e.preventDefault(); openMenu(e.key === "ArrowUp"); } }}><span className="cw-more-feedback" data-copied={copied}><MoreHorizontal size={20} className="cw-more-glyph" aria-hidden="true"/><CopyGlyph copied={copied}/></span></button></Tooltip>
    <div id={id} role="menu" aria-label="Contact actions" className="cw-menu" data-open={open} data-align={align} inert={!open} ref={menu}>
      {canEdit && <button type="button" role="menuitem" onClick={() => { close(true); onCampaign(trigger.current); }}><UserPlus size={16}/> Add to campaign</button>}
      {code && <button type="button" role="menuitem" onClick={async () => { close(true); if (await copyId()) toast.success("Contact ID copied",{id:"cw-copy-id",duration:1800}); else toast.error("Could not copy contact ID",{id:"cw-copy-id"}); }}><Copy size={16}/> Copy contact ID</button>}
      {canDelete && <button type="button" role="menuitem" className="cw-danger-text" onClick={() => { close(true); onDelete(trigger.current); }}><Trash2 size={16}/> Delete contact</button>}
    </div>
  </div>;
}

function DeleteDialog({ name, onConfirm, onClose, pending, error }) {
  const ref = useRef(null), title = useId();
  const {closing,close}=useDialogExit(onClose);
  // Close before React removes the native dialog, releasing its modal focus scope.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className="cw-dialog" data-closing={closing} aria-labelledby={title} aria-busy={pending||closing} onCancel={e => { e.preventDefault(); if (!pending) close(); }}>
    <div className="cw-dialog-body" inert={closing}>
      <h2 id={title}>Delete contact?</h2>
      <p>This will delete {name}. Confirm only if you no longer need this contact.</p>
      {error && <p role="alert" className="cw-error">{error}</p>}
      <div className="cw-actions cw-dialog-actions"><button type="button" autoFocus className="cw-button" onClick={close} disabled={pending||closing}>Cancel</button><button type="button" className="cw-button cw-danger" onClick={onConfirm} disabled={pending||closing}>{pending ? "Deleting…" : "Delete contact"}</button></div>
    </div>
  </dialog>;
}

function EventField({ label, children, className="" }) {
  return <div className={"cw-event-field "+className}><dt>{label}</dt><dd>{children}</dd></div>;
}

function TaskCompletionMeta({ record }) {
  const [audit,setAudit]=useState(null);
  const complete=record.task_status==="COMPLETED";
  const hasAudit=Array.isArray(record.task_updates);
  const key=record.task_id+":"+String(record.task_completed_at||"");
  useEffect(()=>{
    if(!complete || hasAudit || !record.task_id)return;
    let active=true;
    api.get("/api/tasks/"+encodeURIComponent(record.task_id)).then(result=>{
      if(active && result?.success && result.data?.task_status==="COMPLETED" &&
        result.data.task_completed_at===record.task_completed_at) setAudit({key,actor:completionActor(result.data)});
    }).catch(()=>{ /* Never invent completion attribution. */ });
    return ()=>{active=false;};
  },[complete,hasAudit,key,record.task_id,record.task_completed_at]);
  if(!complete)return null;
  const actor=completionActor(record) || (audit?.key===key ? audit.actor : null);
  const date=formatDate(record.task_completed_at);
  return <>
    <EventField label="Completed by" className="cw-completion-meta">{actor || "Not available"}</EventField>
    <EventField label="Completed at" className="cw-completion-meta">{date || "Date unavailable"}</EventField>
  </>;
}

function ActivityNode({ item, newActivity, taskAccess, taskWrites, taskErrors, onTaskToggle, onTaskStatus, onTaskEdit, expanded, onExpand, alphabetical }) {
  const {kind,record,date}=item;
  const call=kind==="call", Icon=call?Phone:CheckCircle;
  const subject=(call?record.call_subject:record.task_subject) || (call?"Call":"Untitled task");
  const description=call?record.call_description:record.task_description;
  const key=activityKey(kind,record), detailsId=useId();
  const done=!call && record.task_status==="COMPLETED";
  const next=call ? null : nextTaskCompletion(record,taskAccess);
  const updating=!call && !!taskWrites[record.task_id];
  const taskError=!call && taskErrors[record.task_id];
  // Mount secondary details on first expansion and retain them for the exit
  // animation. Historical audit requests are deferred until first disclosure.
  const [visited,setVisited]=useState(expanded);
  function toggle(){if(!expanded)setVisited(true);onExpand(key);}
  return <li className="cw-timeline-item" data-new={newActivity===key} data-completed={done}>
    <span className="cw-event-icon"><Icon size={18} strokeWidth={2} aria-hidden="true"/><span className="cw-sr">{call?"Call":"Task"}</span></span>
    <div className="cw-event-content">
      <div className="cw-event-top">
        <button type="button" className="cw-event-disclosure" aria-label={`${expanded?"Collapse":"Expand"} details: ${subject}`} aria-expanded={expanded} aria-controls={detailsId} onClick={toggle}><ChevronDown className="cw-chevron" size={18} aria-hidden="true"/></button>
        <div className="cw-event-summary">
          <h3>{subject}</h3>
          <div className="cw-event-summary-meta">
            {!call && <TaskStatusControl record={record} access={taskAccess} busy={updating} onStatus={onTaskStatus}/>}
            <span className="cw-event-time">{alphabetical ? formatDate(date)||"Date unavailable" : activityTime(date)}</span>
          </div>
        </div>
        <div className="cw-event-actions">
          {!call && <button type="button" role="checkbox" className="cw-task-check" aria-checked={done} aria-disabled={!next||updating} aria-busy={updating} aria-label={`Complete task: ${subject || "Untitled task"}`} title={updating ? "Saving status…" : !next ? "Status cannot be changed here" : done ? "Reopen task" : "Mark complete"} onClick={()=>{if(next&&!updating)onTaskToggle(record);}}><span className="cw-task-check-box" aria-hidden="true"><span className="cw-task-spinner"/><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path pathLength="1" d="m5 12 4 4L19 6"/></svg></span></button>}
        </div>
      </div>
      <Expandable id={detailsId} open={expanded} className="cw-event-expand">
        {(visited||expanded) && <div className="cw-event-details">
          {description ? <p className="cw-event-notes">{description}</p> : <p className="cw-event-no-notes">No notes recorded.</p>}
          <dl className="cw-event-fields">
            <EventField label={call?"Recorded by":"Assigned to"}>{record.user?.user_name || "Unknown user"}</EventField>
            <EventField label="Created">{formatDate(date) || "Date unavailable"}</EventField>
            {!call && <>
              <EventField label="Priority">{humanize(record.task_priority,"Normal")}</EventField>
              <EventField label="Due date">{formatDate(record.task_due_date) || "Not set"}</EventField>
              <TaskCompletionMeta record={record}/>
            </>}
          </dl>
          {!call&&canManageTaskDetails(record,taskAccess)&&<div className="cw-form-footer"><button type="button" className="cw-button" disabled={updating} onClick={e=>onTaskEdit(record,e.currentTarget)}>Edit task</button></div>}
        </div>}
      </Expandable>
      {taskError && <p className="cw-field-error" role="alert">{taskError}</p>}
    </div>
  </li>;
}

function useActivityView() {
  const [sort,setSort]=useState("newest"), [status,setStatus]=useState("all"), [priority,setPriority]=useState("all");
  const [query,setQuery]=useState(""), [searchOpen,setSearchOpen]=useState(false), [filterOpen,setFilterOpen]=useState(false);
  const [expandedKeys,setExpandedKeys]=useState(()=>new Set());
  const searchId=useId(), searchRef=useRef(null), searchButton=useRef(null);
  function resetFilters(){setSort("newest");setStatus("all");setPriority("all");}
  function closeSearch(){setSearchOpen(false);setQuery("");searchButton.current?.focus();}
  function toggle(key){setExpandedKeys(prev=>{const next=new Set(prev);if(next.has(key))next.delete(key);else next.add(key);return next;});}
  return {sort,setSort,status,setStatus,priority,setPriority,query,setQuery,searchOpen,setSearchOpen,filterOpen,setFilterOpen,searchId,searchRef,searchButton,expandedKeys,toggle,resetFilters,closeSearch};
}

function WorkspaceSwitch({view,onChange,contentId}) {
  return <div className="cw-workspace-switch" role="group" aria-label="Contact workspace views" data-view={view}>
    <span className="cw-workspace-switch-indicator" aria-hidden="true"/>
    {[["activity","Activity history"],["opportunities","Opportunities"]].map(([value,label])=><button type="button" key={value} aria-pressed={view===value} aria-controls={contentId} onClick={()=>onChange(value)}>{label}</button>)}
  </div>;
}

function ActivityControls({view,filter,canViewTasks,actions,onAddActivity}) {
  const {sort,setSort,status,setStatus,priority,setPriority,searchOpen,setSearchOpen,filterOpen,setFilterOpen,searchId,searchRef,searchButton,closeSearch,resetFilters}=view;
  const taskFilters=filter!=="call" && canViewTasks;
  const count=Number(sort!=="newest")+Number(taskFilters&&status!=="all")+Number(taskFilters&&priority!=="all");
  return <div className="cw-history-controls">
        <button ref={searchButton} type="button" className="cw-icon cw-history-search-button" aria-label="Search activities" aria-expanded={searchOpen} aria-controls={searchId} onClick={()=>{if(searchOpen)closeSearch();else{setSearchOpen(true);setFilterOpen(false);requestAnimationFrame(()=>searchRef.current?.focus());}}}><Search size={18} aria-hidden="true"/></button>
        <ActivityFilters open={filterOpen} onOpen={setFilterOpen} sort={sort} setSort={setSort} status={status} setStatus={setStatus} priority={priority} setPriority={setPriority} taskFilters={taskFilters} count={count} onReset={resetFilters}/>
        <AddActivityMenu actions={actions} onSelect={onAddActivity} onOpen={()=>setFilterOpen(false)}/>
      </div>;
}

function Timeline({ calls, tasks, loading, error, filter, setFilter, canViewTasks, onRetry, newActivity, taskAccess, taskWrites, taskErrors, onTaskToggle, onTaskStatus, onTaskEdit, feedback, lastCreated, view }) {
  const {sort,status,priority,query,setQuery,searchOpen,searchId,searchRef,closeSearch,expandedKeys,toggle,resetFilters}=view;
  const taskFilters=filter!=="call" && canViewTasks;
  const activeStatus=taskFilters?status:"all", activePriority=taskFilters?priority:"all";
  const items=filterActivity(activityHistory(calls,tasks,filter),{query,status:activeStatus,priority:activePriority,sort});
  const alphabetical=sort==="az"||sort==="za";
  const groups=alphabetical?[{key:"alphabetical",label:null,items}]:groupActivityByDate(items);
  return <>
    <Expandable id={searchId} open={searchOpen}><div className="cw-history-search"><Search size={18} aria-hidden="true"/><input ref={searchRef} type="search" aria-label="Search activity subjects" placeholder="Search activities…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")closeSearch();}}/><button type="button" className="cw-icon" aria-label="Close search" onClick={closeSearch}><X size={18} aria-hidden="true"/></button></div></Expandable>
    <SlidingTabs className="cw-history-tabs" label="Filter activity" options={[["all","All activity"],["call","Calls"],...(canViewTasks ? [["task","Tasks"]] : [])]} value={filter} onChange={setFilter}/>
    {feedback&&<p className="cw-feedback cw-history-feedback" role="status"><CheckCircle size={16} aria-hidden="true"/>{feedback}{lastCreated&&!items.some(item=>activityKey(item.kind,item.record)===lastCreated)&&" It is hidden by your current view or permissions."}</p>}
    {error && <div className="cw-error cw-history-error" role="alert">{error} <button type="button" className="cw-link" onClick={onRetry}>Retry</button></div>}
    {loading ? <ContactSkeleton history/> : items.length===0 ? <div className="cw-empty cw-history-empty"><FileText size={32} strokeWidth={1.75} aria-hidden="true"/><h3>{error ? "Activity unavailable" : (query.trim()||activeStatus!=="all"||activePriority!=="all") ? "No matching activities" : filter==="all" ? "Activity history appears here" : filter==="call" ? "No calls yet" : "No tasks yet"}</h3><p>{error ? "Retry to load the history." : (query.trim()||activeStatus!=="all"||activePriority!=="all") ? "Try changing your filters or search query." : filter==="all" ? "Calls and tasks in chronological order." : "Recorded interactions will appear here."}</p>{!error&&(query.trim()||activeStatus!=="all"||activePriority!=="all")&&<button type="button" className="cw-button" onClick={()=>{resetFilters();setQuery("");}}>Clear filters</button>}</div> :
      <div className="cw-timeline">{groups.map(group=><section className="cw-timeline-group" key={group.key}>
        {group.label&&<h3 className="cw-timeline-date">{group.label}</h3>}
        <ol className="cw-timeline-list">{group.items.map(item=>{
          const key=activityKey(item.kind,item.record);
          return <ActivityNode key={key} item={item} newActivity={newActivity} taskAccess={taskAccess} taskWrites={taskWrites} taskErrors={taskErrors} onTaskToggle={onTaskToggle} onTaskStatus={onTaskStatus} onTaskEdit={onTaskEdit} expanded={expandedKeys.has(key)} onExpand={toggle} alphabetical={alphabetical}/>;
        })}</ol>
      </section>)}</div>}
  </>;
}

function Opportunities({ opportunities = [] }) {
  return <div className="cw-opportunity-content"><div className="cw-panel-header"><h2>Linked opportunities</h2><span className="cw-muted">{opportunities.length} linked</span></div>
    {opportunities.length ? <ul className="cw-opportunities">{opportunities.map(o => <li key={o.opportunity_id}>
      <div><h3>{o.opportunity_name || "Untitled opportunity"}</h3><p className="cw-muted">{humanize(o.opportunity_stage,"No stage")}</p></div>
      <span className="cw-muted">{formatDate(o.opportunity_close_date,true) || "No close date"}</span>
    </li>)}</ul> : <div className="cw-empty"><h3>No linked opportunities</h3><p>Opportunities associated with this contact will appear here.</p></div>}
  </div>;
}

export default function ConDetailView({ isOpen, onClose, contactId, onChanged }) {
  // The parent keys this component by contact ID, so drafts and requests are isolated per record.
  const [contact, setContact] = useState(null), [loading, setLoading] = useState(true), [loadError,setLoadError] = useState("");
  const [taskWrites,setTaskWrites]=useState({}), [taskErrors,setTaskErrors]=useState({});
  const taskLocks=useRef(new Set());
  const [calls,setCalls] = useState([]), [tasks,setTasks] = useState([]), [historyLoading,setHistoryLoading] = useState(true), [historyError,setHistoryError] = useState("");
  const [revision,setRevision] = useState(0), [historyRevision,setHistoryRevision] = useState(0);
  const [searchParams,setSearchParams]=useSearchParams();
  const tab=searchParams.get("contact_view")==="opportunities"?"opportunities":"activity";
  const activityView=useActivityView(), workspaceContentId=useId();
  const [filter,setFilter] = useState("all"), [mode,setMode] = useState(null);
  function switchWorkspace(value){
    if(value===tab)return;
    activityView.setFilterOpen(false);setNewActivity(null);
    setSearchParams(previous=>{const next=new URLSearchParams(previous);if(value==="opportunities")next.set("contact_view","opportunities");else next.delete("contact_view");return next;},{replace:true,preventScrollReset:true});
  }
  const [call,setCall] = useState(blankCall), [task,setTask] = useState(blankTask), [email,setEmail] = useState(blankEmail);
  const [fieldErrors,setFieldErrors]=useState({});
  const [savedMode,setSavedMode] = useState(null), [newActivity,setNewActivity] = useState(null), [lastCreated,setLastCreated]=useState(null);
  const savedActivity=useRef(null);
  const [pending,setPending] = useState(null), [saveError,setSaveError] = useState(""), [feedback,setFeedback] = useState("");
  const [edit,setEdit] = useState(false), [focusCampaign,setFocusCampaign] = useState(false), [deleting,setDeleting] = useState(false), [deletePending,setDeletePending] = useState(false), [deleteError,setDeleteError] = useState("");
  const [taskEditing,setTaskEditing]=useState(null);
  const editSaved=useRef(false), dialogOpener=useRef(null);
  const composerId = useId(), composer = useRef(null), saveLock = useRef(false), deleteLock = useRef(false);
  const canEdit = canDoAction("CONTACTS","EDIT"), canDelete = canDoAction("CONTACTS","DELETE"), canCall = canDoAction("CONTACTS","CREATE");
  const canAssignCampaign = canEdit && hasModule("CAMPAIGNS") && canDoAction("CAMPAIGNS","VIEW");
  const canViewTasks = hasModule("TASKS") && canDoAction("TASKS","VIEW");
  const canTask = hasModule("TASKS") && canDoAction("TASKS","CREATE");
  const endpoint = `/api/contacts/${encodeURIComponent(contactId)}`;
  const currentUserId = readSessionValue("vsph_user_id") || undefined;
  const currentUserName = readSessionValue("vsph_user_name") || "Unknown user";
  const taskAccess={canEdit:canViewTasks && canDoAction("TASKS","EDIT"),role:currentOrgRole(),userId:currentUserId};
  // The opener is captured from the actual action, not document.activeElement
  // (which can already be inside an autofocused dialog). Restore after the
  // closing dialog has been removed and its modal focus scope released.
  useLayoutEffect(() => {
    if (edit || deleting || taskEditing || mode) return;
    const opener=dialogOpener.current;
    dialogOpener.current=null;
    if (opener?.isConnected && !opener.disabled && !opener.closest("[inert]")) opener.focus({preventScroll:true});
    else if(opener) (document.querySelector(".cw-filter-button")||document.querySelector(".cw-workspace-switch button[aria-pressed=true]"))?.focus({preventScroll:true});
  }, [edit,deleting,taskEditing,mode]);
  useEffect(() => {
    if (!isOpen || !contactId) return;
    let cancelled = false;
    api.get(endpoint).then(result => {
      if (!result.success || !result.data) throw new Error(errorMessage(result,"Contact not found."));
      if (!cancelled) { setContact(result.data); setLoadError(""); }
    }).catch(error => { if (!cancelled) setLoadError(error.message || "Could not load contact."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint,isOpen,contactId,revision]);
  useEffect(() => {
    if (!isOpen || !contactId) return;
    let cancelled = false;
    const id = encodeURIComponent(contactId);
    const fetchCalls = async () => {
      const result = await api.get(`/api/calls?contact_id=${id}`);
      if (!Array.isArray(result)) throw new Error(errorMessage(result,"Could not load calls."));
      if (!cancelled) setCalls(result);
    };
    const fetchTasks = async () => {
      if (!canViewTasks) return;
      const records = []; let page = 1, pages = 1;
      do {
        const result = await api.get(`/api/tasks?contact_id=${id}&limit=100&page=${page}`);
        if (!result.success || !Array.isArray(result.data)) throw new Error(errorMessage(result,"Could not load tasks."));
        records.push(...result.data);
        pages = result.pagination?.totalPages || 1;
        page++;
      } while (!cancelled && page <= pages);
      if (!cancelled) setTasks(records);
    };
    Promise.allSettled([fetchCalls(),fetchTasks()]).then(results => {
      if (!cancelled) {
        setHistoryError(results.filter(r => r.status==="rejected").map(r=>r.reason?.message || "Could not load activity.").join(" "));
        setHistoryLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [contactId,isOpen,canViewTasks,historyRevision]);
  useEffect(()=>{if(!newActivity)return;const timer=setTimeout(()=>setNewActivity(null),1250);return ()=>clearTimeout(timer);},[newActivity]);
  function openComposer(next,opener) {
    if (saveLock.current || pending || mode || (next==="call" && !canCall) || (next==="task" && !canTask)) return;
    dialogOpener.current=opener;
    savedActivity.current=null;
    setMode(next);setSavedMode(null);setFieldErrors({});setSaveError("");setFeedback("");setLastCreated(null);setNewActivity(null);
    requestAnimationFrame(()=>composer.current?.querySelector("input:not([disabled]),textarea:not([disabled]),select:not([disabled])")?.focus({preventScroll:true}));
  }
  function finishComposer() {
    if(savedActivity.current){
      setNewActivity(savedActivity.current);setLastCreated(savedActivity.current);savedActivity.current=null;
    }
    if(mode==="email")setFeedback("");
    setMode(null);setFieldErrors({});setSavedMode(null);setSaveError("");
  }
  const closeWorkspace = () => {
    if (pending || deletePending || taskLocks.current.size) return;
    const dirty = call.subject || call.description || task.subject || task.description || task.date || task.priority !== "NORMAL" || task.time !== "12:00" || email.subject || email.body;
    if (dirty && !window.confirm("Discard unsaved activity drafts?")) return;
    onClose();
  };
  function retryHistory() { if(taskLocks.current.size)return; setHistoryLoading(true); setHistoryError(""); setHistoryRevision(v=>v+1); }
  async function saveTaskPatch(record,patch) {
    const id=record.task_id;
    if(historyLoading||taskLocks.current.has(id))throw new Error("A task update is already in progress.");
    if(patch.task_status!==undefined&&!allowedTaskStatuses(record,taskAccess).includes(patch.task_status))throw new Error("This status change is not permitted.");
    if(Object.keys(patch).some(key=>key!=="task_status")&&!canManageTaskDetails(record,taskAccess))throw new Error("Task editing is not permitted.");
    taskLocks.current.add(id);
    setTaskWrites(prev=>({...prev,[id]:true}));setTaskErrors(prev=>({...prev,[id]:null}));
    try{
      const result=await api.patch("/api/tasks/"+encodeURIComponent(id),patch);
      const updated=result?.data;
      if(!result?.success||updated?.task_id!==id||(patch.task_status!==undefined&&updated.task_status!==patch.task_status))throw new Error(errorMessage(result,"Could not update task."));
      setTasks(prev=>prev.map(item=>item.task_id===id?{...item,...updated}:item));
      return updated;
    }finally{
      taskLocks.current.delete(id);setTaskWrites(prev=>({...prev,[id]:false}));
    }
  }
  async function changeTaskStatus(record,next){
    if(!next||next===record.task_status||taskLocks.current.has(record.task_id))return;
    try{await saveTaskPatch(record,{task_status:next});}
    catch(error){setTaskErrors(prev=>({...prev,[record.task_id]:error.message||"Could not update task status. Try again."}));}
  }
  function toggleTask(record){return changeTaskStatus(record,nextTaskCompletion(record,taskAccess));}
  function editTask(record,opener){
    if(!canManageTaskDetails(record,taskAccess)||taskLocks.current.has(record.task_id))return;
    dialogOpener.current=opener;setTaskEditing(record);
  }
  async function submit(event) {
    event.preventDefault();
    if (saveLock.current || pending || savedMode || !mode || (mode !== "email" && historyLoading)) return;
    setSavedMode(null); setSaveError(""); setFeedback("");
    if (mode === "email") {
      const available = [contact.contact_professional_email,contact.contact_personal_email].filter(usableEmail);
      const recipient = available.includes(email.recipient) ? email.recipient : available[0];
      const href = emailLink(recipient,email.subject,email.body);
      if (!href) { setSaveError("This contact does not have a usable email address."); return; }
      window.location.href = href; setFeedback("Email draft requested in your mail client. No email has been sent by CRM."); return;
    }
    const isCall = mode === "call";
    if (isCall ? !canCall : !canTask) return;
    const errors=requiredActivityFields(mode,isCall?call:task);
    setFieldErrors(errors);
    if(Object.keys(errors).length){composer.current?.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus();return;}
    saveLock.current = true; setPending(mode);
    try {
      const payload = isCall ? {call_user_fk:currentUserId,call_contact_fk:contactId,call_subject:call.subject.trim(),call_description:call.description.trim()} :
        {task_user_fk:currentUserId,task_contact_fk:contactId,task_subject:task.subject.trim(),task_description:task.description,task_priority:task.priority,task_due_date:taskDueDate(task.date,task.time)};
      const result = await api.post(isCall ? "/api/calls" : "/api/tasks",payload);
      const record = result?.data || result;
      if (!record || result.success === false || result.error || !(isCall ? record.call_id : record.task_id)) throw new Error(errorMessage(result,"Could not save activity."));
      const saved = {...record,user:record.user || {user_name:currentUserName}};
      if (isCall) { setCalls(prev=>[saved,...prev.filter(x=>x.call_id!==saved.call_id)]); setCall(blankCall); }
      else { if (canViewTasks) setTasks(prev=>[saved,...prev.filter(x=>x.task_id!==saved.task_id)]); setTask(blankTask); }
      savedActivity.current=activityKey(isCall ? "call" : "task",saved);
      setSavedMode(mode);setFeedback(isCall ? "Call saved." : "Task created.");setRevision(v=>v+1);
    } catch(error) { setSaveError(error.message || "Could not save activity. Try again."); }
    finally { saveLock.current=false; setPending(null); }
  }
  async function confirmDelete() {
    if (!canDelete || deleteLock.current) return;
    deleteLock.current=true; setDeletePending(true); setDeleteError("");
    try {
      const result=await api.delete(endpoint);
      if (!result.success) throw new Error(errorMessage(result,"Could not delete contact."));
      toast.success("Contact deleted",{id:"cw-contact-deleted",duration:2500}); onChanged?.(); onClose();
    } catch(error) { setDeleteError(error.message || "Could not delete contact."); }
    finally { deleteLock.current=false; setDeletePending(false); }
  }
  if (!isOpen) return null;
  const name=contactName(contact), initials=[contact?.contact_firstname,contact?.contact_lastname].filter(Boolean).map(v=>v[0].toUpperCase()).join("") || "C";
  const recipients=[...new Set([contact?.contact_professional_email,contact?.contact_personal_email].filter(usableEmail))];
  const actions=[...(canCall ? [{id:"call",label:"Log a call"}] : []),...(canTask ? [{id:"task",label:"Create task"}] : []),{id:"email",label:"Compose email"}];
  return <div className="cw-workspace">
    <nav className="cw-breadcrumb" aria-label="Breadcrumb"><button type="button" className="cw-back" onClick={closeWorkspace} disabled={!!pending||Object.values(taskWrites).some(Boolean)}><ArrowLeft size={16}/> Contacts</button></nav>
    {loading ? <ContactSkeleton/> : !contact ? <div className="cw-panel cw-empty"><h2>Contact unavailable</h2><p role="alert">{loadError || "Contact not found."}</p><button type="button" className="cw-button" onClick={()=>{setLoading(true);setRevision(v=>v+1);}}>Retry</button></div> : <>
      {loadError && <p className="cw-error" role="alert">{loadError}</p>}
      <div className="cw-grid cw-record-grid">
      <section className="cw-panel cw-identity">
        <div className="cw-identity-main"><div className="cw-avatar" aria-hidden="true">{initials}</div><div className="cw-identity-text"><h1>{name}</h1><div className="cw-identity-meta"><span>{contact.contact_code || "No record code"}</span></div></div></div>
        <div className="cw-identity-side"><div className="cw-actions">
          {canEdit && <button type="button" className="cw-button" onClick={event=>{dialogOpener.current=event.currentTarget;setFocusCampaign(false);setEdit(true);}}>Edit contact</button>}
          {(canAssignCampaign || canDelete || contact.contact_code) && <MoreActions canEdit={canAssignCampaign} canDelete={canDelete} code={contact.contact_code} onCampaign={opener=>{dialogOpener.current=opener;setFocusCampaign(true);setEdit(true);}} onDelete={opener=>{dialogOpener.current=opener;setDeleteError("");setDeleting(true);}}/>}
        </div></div>
      </section>

        <section className="cw-panel cw-activity cw-work-area" aria-label={tab==="activity"?"Activity history":"Opportunities"}>
          <div className="cw-panel-header cw-work-area-header">
            <WorkspaceSwitch view={tab} onChange={switchWorkspace} contentId={workspaceContentId}/>
            {tab==="activity"&&<ActivityControls view={activityView} filter={filter} canViewTasks={canViewTasks} actions={actions} onAddActivity={openComposer}/>}
          </div>
          <div id={workspaceContentId} className="cw-work-area-content">
            {tab==="activity" ? <Timeline calls={calls} tasks={tasks} loading={historyLoading} error={historyError} filter={filter} setFilter={value=>{setNewActivity(null);setFilter(value);}} canViewTasks={canViewTasks} onRetry={retryHistory} newActivity={newActivity} taskAccess={taskAccess} taskWrites={taskWrites} taskErrors={taskErrors} onTaskToggle={toggleTask} onTaskStatus={changeTaskStatus} onTaskEdit={editTask} feedback={!mode?feedback:""} lastCreated={lastCreated} view={activityView}/> : <Opportunities opportunities={contact.opportunities || []}/>}
          </div>
        </section>
        <ContactProperties contact={contact}/>
      </div>
      {mode&&<ActivityComposerDialog key={mode} title={actions.find(a=>a.id===mode)?.label} mode={mode} formId={composerId} pending={!!pending} saved={!!savedMode} disabled={(mode!=="email"&&historyLoading)||(mode==="email"&&!recipients.length)} onClose={finishComposer}>
        <form ref={composer} id={composerId} onSubmit={submit} noValidate className="cw-form cw-activity-form" aria-busy={!!pending}>
                <fieldset key={mode} disabled={!!pending||!!savedMode} className="cw-form-fields">
                {mode==="call" ? <>
                  <label><span className="cw-field-label">Subject / outcome <span className="cw-required" aria-hidden="true">*</span></span><input required name="subject" value={call.subject} aria-invalid={!!fieldErrors.subject} aria-describedby={fieldErrors.subject ? composerId+"-subject-error" : undefined} onChange={e=>{setCall({...call,subject:e.target.value});if(e.target.value.trim())setFieldErrors(prev=>({...prev,subject:undefined}));}} placeholder="Enter an outcome or call subject"/>{fieldErrors.subject && <span className="cw-field-error" id={composerId+"-subject-error"} role="alert">{fieldErrors.subject}</span>}</label>
                  <label><span className="cw-field-label">Call notes <span className="cw-required" aria-hidden="true">*</span></span><textarea required rows={4} name="description" value={call.description} aria-invalid={!!fieldErrors.description} aria-describedby={fieldErrors.description ? composerId+"-description-error" : undefined} onChange={e=>{setCall({...call,description:e.target.value});if(e.target.value.trim())setFieldErrors(prev=>({...prev,description:undefined}));}} placeholder="What was discussed?"/>{fieldErrors.description && <span className="cw-field-error" id={composerId+"-description-error"} role="alert">{fieldErrors.description}</span>}</label>
                </> : mode==="task" ? <>
                  <label><span className="cw-field-label">Task subject <span className="cw-required" aria-hidden="true">*</span></span><input required name="subject" value={task.subject} aria-invalid={!!fieldErrors.subject} aria-describedby={fieldErrors.subject ? composerId+"-subject-error" : undefined} onChange={e=>{setTask({...task,subject:e.target.value});if(e.target.value.trim())setFieldErrors(prev=>({...prev,subject:undefined}));}} placeholder="Enter a task name"/>{fieldErrors.subject && <span className="cw-field-error" id={composerId+"-subject-error"} role="alert">{fieldErrors.subject}</span>}</label>
                  <label>Priority<select value={task.priority} onChange={e=>setTask({...task,priority:e.target.value})}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option></select></label>
                  <div className="cw-date-row"><label>Due date<input type="date" value={task.date} onChange={e=>setTask({...task,date:e.target.value})}/></label><label>Due time<input type="time" value={task.time} onChange={e=>setTask({...task,time:e.target.value})} disabled={!task.date}/></label></div>
                  <label>Description<textarea rows={3} value={task.description} onChange={e=>setTask({...task,description:e.target.value})} placeholder="What needs to be done?"/></label>
                </> : <>
                  <label>Recipient<select value={recipients.includes(email.recipient) ? email.recipient : recipients[0] || ""} onChange={e=>setEmail({...email,recipient:e.target.value})}>{recipients.length ? recipients.map(address=><option key={address}>{address}</option>) : <option value="">No usable email address</option>}</select></label>
                  <label>Subject<input value={email.subject} onChange={e=>setEmail({...email,subject:e.target.value})} placeholder="Email subject"/></label>
                  <label>Message<textarea rows={5} value={email.body} onChange={e=>setEmail({...email,body:e.target.value})} placeholder="Write your email…"/></label>
                  <p className="cw-muted">Opens your mail client. CRM does not send or track this email.</p>
                </>}
                </fieldset>
          {saveError&&<p role="alert" className="cw-error">{saveError}</p>}
          {mode==="email"&&feedback&&<p className="cw-muted" role="status">{feedback}</p>}
        </form>
      </ActivityComposerDialog>}
      {edit && canEdit && <AddContactModal isOpen={edit} onClose={()=>{setEdit(false);if(editSaved.current){editSaved.current=false;setRevision(v=>v+1);onChanged?.();}}} onSuccess={()=>{editSaved.current=true;}} contactToEdit={contact} workspaceMotion focusCampaign={focusCampaign} canAssignCampaign={canAssignCampaign}/>}
      {taskEditing && <ContactTaskEditor key={taskEditing.task_id} record={taskEditing} access={taskAccess} onClose={()=>setTaskEditing(null)} onSave={saveTaskPatch}/>}
      {deleting && canDelete && <DeleteDialog name={name} pending={deletePending} error={deleteError} onClose={()=>setDeleting(false)} onConfirm={confirmDelete}/>}
    </>}
  </div>;
}
