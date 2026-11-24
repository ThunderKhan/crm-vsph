import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, MoreHorizontal, Phone, CheckCircle, FileText, Plus, Copy, Trash2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../utils/api";
import { readSessionValue } from "../utils/session.js";
import { canDoAction, hasModule } from "../utils/modules";
import AddContactModal from "./modals/AddContactModal";
import ContactProperties, { Expandable } from "./contact/ContactProperties";
import { activityHistory, contactName, emailLink, usableEmail, formatDate, humanize, taskDueDate } from "./contact/contactWorkspaceUtils.js";
import "./contact/contactWorkspace.css";

const errorMessage = (response, fallback) => response?.message || response?.error || fallback;
const blankTask = { subject:"", description:"", priority:"NORMAL", date:"", time:"12:00" };
const blankCall = { subject:"", description:"" };
const blankEmail = { subject:"", body:"", recipient:"" };

function MoreActions({ canEdit, canDelete, onCampaign, onDelete, code }) {
  const [open, setOpen] = useState(false);
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
    <button type="button" className="cw-button cw-icon" ref={trigger} aria-label="More contact actions" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => open ? close(true) : openMenu()} onKeyDown={e => { if (["ArrowDown","ArrowUp"].includes(e.key) && !open) { e.stopPropagation(); e.preventDefault(); openMenu(e.key === "ArrowUp"); } }}><MoreHorizontal size={20}/></button>
    <div id={id} role="menu" aria-label="Contact actions" className="cw-menu" data-open={open} data-align={align} inert={!open} ref={menu}>
      {canEdit && <button type="button" role="menuitem" onClick={() => { close(true); onCampaign(); }}><UserPlus size={16}/> Add to campaign</button>}
      {code && <button type="button" role="menuitem" onClick={async () => { close(true); try { await navigator.clipboard.writeText(code); toast.success("Contact ID copied"); } catch { toast.error("Could not copy contact ID"); } }}><Copy size={16}/> Copy contact ID</button>}
      {canDelete && <button type="button" role="menuitem" className="cw-danger-text" onClick={() => { close(true); onDelete(); }}><Trash2 size={16}/> Delete contact</button>}
    </div>
  </div>;
}

function DeleteDialog({ name, onConfirm, onClose, pending, error }) {
  const ref = useRef(null), title = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className="cw-dialog" aria-labelledby={title} onCancel={e => { e.preventDefault(); if (!pending) onClose(); }}>
    <div className="cw-dialog-body">
      <h2 id={title}>Delete contact?</h2>
      <p>This will delete {name}. Confirm only if you no longer need this contact.</p>
      {error && <p role="alert" className="cw-error">{error}</p>}
      <div className="cw-actions cw-dialog-actions"><button type="button" autoFocus className="cw-button" onClick={onClose} disabled={pending}>Cancel</button><button type="button" className="cw-button cw-danger" onClick={onConfirm} disabled={pending}>{pending ? "Deleting…" : "Delete contact"}</button></div>
    </div>
  </dialog>;
}

function Timeline({ calls, tasks, loading, error, filter, setFilter, canViewTasks, onRetry }) {
  const items = activityHistory(calls, tasks, filter);
  return <section className="cw-panel cw-history-panel" aria-labelledby="cw-history-heading">
    <div className="cw-panel-header"><h2 id="cw-history-heading">Activity history</h2><span className="cw-muted">Newest first</span></div>
    <div className="cw-tabs cw-history-tabs" role="group" aria-label="Filter activity">
      {[["all","All activity"],["call","Calls"],...(canViewTasks ? [["task","Tasks"]] : [])].map(([value,label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    {error && <div className="cw-error cw-history-error" role="alert">{error} <button type="button" className="cw-link" onClick={onRetry}>Retry</button></div>}
    {loading ? <p className="cw-empty" role="status">Loading activity…</p> : items.length === 0 ? <div className="cw-empty cw-history-empty"><FileText size={44} strokeWidth={1.4} aria-hidden="true"/><h3>{error ? "Activity unavailable" : filter === "all" ? "Activity history appears here" : filter === "call" ? "No calls yet" : "No tasks yet"}</h3><p>{error ? "Retry to load the history." : filter === "all" ? "Calls and tasks in chronological order." : "Recorded interactions will appear here."}</p></div> :
      <ol className="cw-timeline">{items.map(({kind,record,date}) => {
        const call = kind === "call", Icon = call ? Phone : CheckCircle;
        const subject = call ? record.call_subject : record.task_subject;
        const description = call ? record.call_description : record.task_description;
        return <li key={kind+"-"+(call ? record.call_id : record.task_id)} className="cw-timeline-item">
          <span className="cw-event-icon"><Icon size={18} aria-hidden="true"/></span>
          <div className="cw-event-content"><div className="cw-event-top"><h3>{subject || (call ? "Call" : "Task")}</h3><span className="cw-muted">{call ? "Call" : "Task"}</span></div>
            {description && <p className="cw-event-notes">{description}</p>}
            <div className="cw-event-meta">{record.user?.user_name || "Unknown user"} · {formatDate(date) || "Date unavailable"}</div>
            {!call && <div className="cw-event-meta">{humanize(record.task_priority,"Normal")} priority{record.task_status && " · "+humanize(record.task_status)}{record.task_due_date && " · Due "+(formatDate(record.task_due_date) || "date unavailable")}</div>}
          </div>
        </li>;
      })}</ol>}
  </section>;
}

function Opportunities({ opportunities = [] }) {
  return <section className="cw-panel"><div className="cw-panel-header"><h2>Linked opportunities</h2><span className="cw-muted">{opportunities.length} linked</span></div>
    {opportunities.length ? <ul className="cw-opportunities">{opportunities.map(o => <li key={o.opportunity_id}>
      <div><h3>{o.opportunity_name || "Untitled opportunity"}</h3><p className="cw-muted">{humanize(o.opportunity_stage,"No stage")}</p></div>
      <span className="cw-muted">{formatDate(o.opportunity_close_date,true) || "No close date"}</span>
    </li>)}</ul> : <div className="cw-empty"><h3>No linked opportunities</h3><p>Opportunities associated with this contact will appear here.</p></div>}
  </section>;
}

export default function ConDetailView({ isOpen, onClose, contactId, onChanged }) {
  // The parent keys this component by contact ID, so drafts and requests are isolated per record.
  const [contact, setContact] = useState(null), [loading, setLoading] = useState(true), [loadError,setLoadError] = useState("");
  const [calls,setCalls] = useState([]), [tasks,setTasks] = useState([]), [historyLoading,setHistoryLoading] = useState(true), [historyError,setHistoryError] = useState("");
  const [revision,setRevision] = useState(0), [historyRevision,setHistoryRevision] = useState(0);
  const [tab,setTab] = useState("overview"), [filter,setFilter] = useState("all"), [mode,setMode] = useState(null), [lastMode,setLastMode] = useState(null);
  const displayMode = mode || lastMode;
  const [call,setCall] = useState(blankCall), [task,setTask] = useState(blankTask), [email,setEmail] = useState(blankEmail);
  const [pending,setPending] = useState(null), [saveError,setSaveError] = useState(""), [feedback,setFeedback] = useState("");
  const [edit,setEdit] = useState(false), [focusCampaign,setFocusCampaign] = useState(false), [deleting,setDeleting] = useState(false), [deletePending,setDeletePending] = useState(false), [deleteError,setDeleteError] = useState("");
  const composerId = useId(), composer = useRef(null), quickActions = useRef(null), saveLock = useRef(false), deleteLock = useRef(false);
  const canEdit = canDoAction("CONTACTS","EDIT"), canDelete = canDoAction("CONTACTS","DELETE"), canCall = canDoAction("CONTACTS","CREATE");
  const canAssignCampaign = canEdit && hasModule("CAMPAIGNS") && canDoAction("CAMPAIGNS","VIEW");
  const canViewTasks = hasModule("TASKS") && canDoAction("TASKS","VIEW");
  const canTask = hasModule("TASKS") && canDoAction("TASKS","CREATE");
  const endpoint = `/api/contacts/${encodeURIComponent(contactId)}`;
  const currentUserId = readSessionValue("vsph_user_id") || undefined;
  const currentUserName = readSessionValue("vsph_user_name") || "Unknown user";
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
  function openComposer(next) {
    if (pending || (next==="call" && !canCall) || (next==="task" && !canTask)) return;
    setTab("overview"); setMode(next); setLastMode(next); setSaveError(""); setFeedback("");
    requestAnimationFrame(() => composer.current?.querySelector("input:not([disabled]),textarea:not([disabled]),select:not([disabled])")?.focus());
  }
  function cancelComposer() {
    if (saveLock.current || pending || !mode) return;
    // Closing is not a destructive reset: keep per-mode drafts for reopening.
    const previousMode = mode;
    setMode(null);
    setSaveError("");
    setFeedback("");
    quickActions.current?.querySelector(`[data-mode="${previousMode}"]`)?.focus({preventScroll:true});
  }
  const closeWorkspace = () => {
    if (pending || deletePending) return;
    const dirty = call.subject || call.description || task.subject || task.description || task.date || task.priority !== "NORMAL" || task.time !== "12:00" || email.subject || email.body;
    if (dirty && !window.confirm("Discard unsaved activity drafts?")) return;
    onClose();
  };
  function retryHistory() { setHistoryLoading(true); setHistoryError(""); setHistoryRevision(v=>v+1); }
  async function submit(event) {
    event.preventDefault();
    if (saveLock.current || pending || !mode || (mode !== "email" && historyLoading)) return;
    setSaveError(""); setFeedback("");
    if (mode === "email") {
      const available = [contact.contact_professional_email,contact.contact_personal_email].filter(usableEmail);
      const recipient = available.includes(email.recipient) ? email.recipient : available[0];
      const href = emailLink(recipient,email.subject,email.body);
      if (!href) { setSaveError("This contact does not have a usable email address."); return; }
      window.location.href = href; setFeedback("Email draft requested in your mail client. No email has been sent by CRM."); return;
    }
    const isCall = mode === "call";
    if (isCall ? !canCall || !call.subject.trim() || !call.description.trim() : !canTask || !task.subject.trim()) {
      setSaveError(isCall ? "Enter a call subject and notes." : "Enter a task subject."); return;
    }
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
      setFeedback(isCall ? "Call saved." : "Task created."); setFilter("all"); setRevision(v=>v+1);
    } catch(error) { setSaveError(error.message || "Could not save activity. Try again."); }
    finally { saveLock.current=false; setPending(null); }
  }
  async function confirmDelete() {
    if (!canDelete || deleteLock.current) return;
    deleteLock.current=true; setDeletePending(true); setDeleteError("");
    try {
      const result=await api.delete(endpoint);
      if (!result.success) throw new Error(errorMessage(result,"Could not delete contact."));
      toast.success("Contact deleted"); onChanged?.(); onClose();
    } catch(error) { setDeleteError(error.message || "Could not delete contact."); }
    finally { deleteLock.current=false; setDeletePending(false); }
  }
  if (!isOpen) return null;
  const name=contactName(contact), initials=[contact?.contact_firstname,contact?.contact_lastname].filter(Boolean).map(v=>v[0].toUpperCase()).join("") || "C";
  const recipients=[...new Set([contact?.contact_professional_email,contact?.contact_personal_email].filter(usableEmail))];
  const actions=[...(canCall ? [{id:"call",label:"Log a call"}] : []),...(canTask ? [{id:"task",label:"Create task"}] : []),{id:"email",label:"Compose email"}];
  return <div className="cw-workspace">
    <nav className="cw-breadcrumb" aria-label="Breadcrumb"><button type="button" className="cw-back" onClick={closeWorkspace} disabled={!!pending}><ArrowLeft size={16}/> Contacts</button></nav>
    {loading ? <div className="cw-panel cw-empty" role="status">Loading contact…</div> : !contact ? <div className="cw-panel cw-empty"><h2>Contact unavailable</h2><p role="alert">{loadError || "Contact not found."}</p><button type="button" className="cw-button" onClick={()=>{setLoading(true);setRevision(v=>v+1);}}>Retry</button></div> : <>
      {loadError && <p className="cw-error" role="alert">{loadError}</p>}
      <section className="cw-panel cw-identity">
        <div className="cw-identity-main"><div className="cw-avatar" aria-hidden="true">{initials}</div><div className="cw-identity-text"><h1>{name}</h1><div className="cw-identity-meta"><span>{contact.contact_code || "No record code"}</span></div></div></div>
        <div className="cw-identity-side"><div className="cw-actions">
          {canEdit && <button type="button" className="cw-button" onClick={()=>{setFocusCampaign(false);setEdit(true);}}>Edit contact</button>}
          {canCall && (!mode || tab !== "overview") && <button type="button" className={`cw-button ${tab !== "overview" ? "cw-primary" : ""}`} onClick={()=>openComposer("call")} disabled={!!pending}><Plus size={16}/> Log call</button>}
          {(canAssignCampaign || canDelete || contact.contact_code) && <MoreActions canEdit={canAssignCampaign} canDelete={canDelete} code={contact.contact_code} onCampaign={()=>{setFocusCampaign(true);setEdit(true);}} onDelete={()=>{setDeleteError("");setDeleting(true);}}/>}
        </div></div>
      </section>
      <div className="cw-tabs cw-main-tabs" role="group" aria-label="Contact workspace views">
        {[["overview","Overview"],["opportunities","Opportunities"]].map(([value,label])=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}
      </div>
      {tab==="overview" ? <div className="cw-grid">
        <div className="cw-activity">
          <section className="cw-panel cw-composer-panel" aria-labelledby="cw-composer-heading">
            <div className="cw-panel-header"><h2 id="cw-composer-heading">Quick actions</h2></div>
            <div className="cw-quick-actions" ref={quickActions}>{actions.map(({id,label})=><button type="button" className={`cw-button ${!mode && id===actions[0]?.id ? "cw-primary" : ""}`} key={id} data-mode={id} aria-pressed={mode===id} aria-expanded={mode===id} aria-controls={composerId} onClick={()=>openComposer(id)} disabled={!!pending}>{label}</button>)}</div>
            {!mode && <p className="cw-muted cw-composer-hint">Record an interaction or plan a follow-up.</p>}
            <Expandable open={!!mode} id={composerId}><div ref={composer} className="cw-composer">
              {displayMode && <form onSubmit={submit} className="cw-form">
                <h3>{actions.find(a=>a.id===displayMode)?.label}</h3>
                <fieldset disabled={!!pending} className="cw-form-fields">
                {displayMode==="call" ? <>
                  <label><span className="cw-field-label">Subject / outcome <span className="cw-required" aria-hidden="true">*</span></span><input required value={call.subject} onChange={e=>setCall({...call,subject:e.target.value})} placeholder="Enter an outcome or call subject"/></label>
                  <label><span className="cw-field-label">Call notes <span className="cw-required" aria-hidden="true">*</span></span><textarea required rows={4} value={call.description} onChange={e=>setCall({...call,description:e.target.value})} placeholder="What was discussed?"/></label>
                </> : displayMode==="task" ? <>
                  <label><span className="cw-field-label">Task subject <span className="cw-required" aria-hidden="true">*</span></span><input required value={task.subject} onChange={e=>setTask({...task,subject:e.target.value})} placeholder="Enter a task name"/></label>
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
                {saveError && <p role="alert" className="cw-error">{saveError}</p>}
                <div className="cw-form-footer"><span className="cw-muted">{mode==="email" ? "" : `Recorded by ${currentUserName}`}</span><div className="cw-actions"><button type="button" className="cw-button" disabled={!!pending} onClick={cancelComposer}>Cancel</button>
                <button type="submit" className="cw-button cw-primary" disabled={!!pending || (mode!=="email" && historyLoading) || (mode==="email" && !recipients.length)}>{pending ? "Saving…" : displayMode==="call" ? "Save call" : displayMode==="task" ? "Create task" : "Open email client"}</button></div></div>
              </form>}
            </div></Expandable>
            {feedback && <p className="cw-feedback" role="status"><CheckCircle size={16} aria-hidden="true"/>{feedback}</p>}
          </section>
          <Timeline calls={calls} tasks={tasks} loading={historyLoading} error={historyError} filter={filter} setFilter={setFilter} canViewTasks={canViewTasks} onRetry={retryHistory}/>
        </div>
        <ContactProperties contact={contact}/>
      </div> : <Opportunities opportunities={contact.opportunities || []}/>}
      {edit && canEdit && <AddContactModal isOpen={edit} onClose={()=>setEdit(false)} onSuccess={()=>{setEdit(false);setRevision(v=>v+1);onChanged?.();}} contactToEdit={contact} workspaceMotion focusCampaign={focusCampaign} canAssignCampaign={canAssignCampaign}/>}
      {deleting && canDelete && <DeleteDialog name={name} pending={deletePending} error={deleteError} onClose={()=>setDeleting(false)} onConfirm={confirmDelete}/>}
    </>}
  </div>;
}
