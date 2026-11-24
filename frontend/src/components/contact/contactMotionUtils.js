// Small pure helpers shared by the contact motion controls and their tests.
export function selectionIndicator(container, selected) {
  if (!container || !selected || selected.width <= 0) return null;
  return { x: selected.left - container.left, y: selected.bottom - container.top - 3, width: selected.width };
}
export function activityKey(kind, record) {
  const id = kind === "call" ? record?.call_id : record?.task_id;
  return id ? kind + "-" + id : null;
}
export function requiredActivityFields(mode, draft) {
  if (mode !== "call" && mode !== "task") return {};
  const errors = {};
  if (!draft.subject?.trim()) errors.subject = mode === "call" ? "Enter a call subject or outcome." : "Enter a task subject.";
  if (mode === "call" && !draft.description?.trim()) errors.description = "Enter call notes.";
  return errors;
}

// The backend's status enum uses TODO, not the display label Pending.
export function taskStatusLabel(status) {
  return ({TODO:"Pending",PENDING:"Pending",IN_PROGRESS:"In progress",BLOCKED:"Blocked",COMPLETED:"Completed"})[status] || "Unknown status";
}
export function nextTaskCompletion(task, {canEdit,role,userId}) {
  if (!canEdit || !task?.task_id) return null;
  const status=task.task_status;
  if (!["TODO","IN_PROGRESS","BLOCKED","COMPLETED"].includes(status)) return null;
  if (role==="EMPLOYEE" && (task.task_user_fk!==userId || !userId || status==="BLOCKED")) return null;
  // The list endpoint omits assignee role; known restricted assignees are
  // disabled, and the server remains authoritative for unknown roles.
  if (role==="ORG_ADMIN" && (task.user?.user_role==="ADMIN" || task.user?.user_role==="SUPER_ADMIN" || task.user?.user_is_tenant_owner)) return null;
  return status==="COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
}
export function completionActor(task) {
  if (task?.task_status!=="COMPLETED") return null;
  // Task detail/update returns audit entries newest first. Never substitute
  // the assignee or current viewer for the actual completing user.
  return task.task_updates?.find(update=>update.new_status==="COMPLETED" && update.previous_status!=="COMPLETED")?.user?.user_name || null;
}
