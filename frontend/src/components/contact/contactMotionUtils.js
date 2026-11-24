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
