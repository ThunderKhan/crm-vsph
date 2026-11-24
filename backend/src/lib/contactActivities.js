export const CALL_OUTCOMES = ["RINGING","PITCH_DONE","NOT_INTERESTED","NOT_RELEVANT","LEFT_ORGANIZATION","NOT_AVAILABLE","CONNECTED","NOT_CONNECTED","WRONG_NUMBER","DNC"];
export const ENTRY_KINDS = ["NOTE","EMAIL","MEETING","LINKEDIN"];

export function validateContactEntry(body, now = Date.now()) {
  const { entry_kind, entry_subject, entry_description, entry_occurred_at } = body;
  if (!ENTRY_KINDS.includes(entry_kind)) return { error: "Invalid activity type." };
  const subject = typeof entry_subject === "string" ? entry_subject.trim() : "";
  const description = typeof entry_description === "string" ? entry_description.trim() : "";
  if (!subject || subject.length > 191 || !description || description.length > 10000) return { error: "Enter a subject (up to 191 characters) and notes (up to 10,000 characters)." };
  const occurred = entry_occurred_at ? new Date(entry_occurred_at) : new Date(now);
  if (!Number.isFinite(occurred.getTime()) || occurred.getTime() > now) return { error: "Enter a valid past activity time." };
  return { data: { entry_kind, entry_subject: subject, entry_description: description, entry_occurred_at: occurred } };
}

export function validateFollowup(body) {
  if (!body || typeof body !== "object") return { error: "Invalid follow-up." };
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const due = body.due ? new Date(body.due) : null;
  if (!subject || subject.length > 191 || !due || !Number.isFinite(due.getTime())) return { error: "Enter a follow-up subject and valid due date." };
  if (typeof body.assignee !== "string" || !body.assignee) return { error: "Choose a follow-up assignee." };
  return { data: { task_subject: subject, task_due_date: due, task_user_fk: body.assignee } };
}
