export const present = (value) => value !== null && value !== undefined && String(value).trim() !== "" && !["—", "-"].includes(String(value).trim());

export function humanize(value, fallback = "Not provided") {
  if (!present(value)) return fallback;
  const text = String(value).replace(/_/g, " ").toLowerCase();
  return text[0].toUpperCase() + text.slice(1);
}

export function contactName(contact) {
  return [contact?.contact_salutation, contact?.contact_firstname, contact?.contact_middlename, contact?.contact_lastname, contact?.contact_suffix].filter(present).join(" ") || "Unnamed contact";
}

export function safeWebLink(value) {
  if (!present(value)) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export const usableEmail = (value) => typeof value === "string" && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value.trim());
export const emailLink = (value, subject = "", body = "") => usableEmail(value) ? `mailto:${encodeURIComponent(value.trim()).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;
export const phoneLink = (value) => {
  const number = String(value ?? "").trim();
  return /^\+?[\d().\s-]+$/.test(number) && /\d/.test(number) ? `tel:${number.replace(/[^\d+]/g, "")}` : null;
};
export function formatDate(value, dateOnly = false) {
  if (!present(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return dateOnly ? date.toLocaleDateString() : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
export function taskDueDate(date, time) {
  if (!date) return null;
  const result = new Date(`${date}T${time || "12:00"}:00`);
  if (!Number.isFinite(result.getTime())) throw new Error("Enter a valid due date and time.");
  return result.toISOString();
}
export function activityHistory(calls, tasks, filter = "all") {
  const items = [
    ...calls.map((record) => ({ kind: "call", record, date: record.call_created_at })),
    ...tasks.map((record) => ({ kind: "task", record, date: record.task_created_at })),
  ];
  const timestamp = (value) => { const ms = present(value) ? new Date(value).getTime() : NaN; return Number.isFinite(ms) ? ms : -Infinity; };
  return items.filter((item) => filter === "all" || item.kind === filter)
    .sort((a, b) => { const x = timestamp(a.date), y = timestamp(b.date); return x === y ? 0 : y - x; });
}

// Group by the same local calendar used by the displayed timestamps, not UTC.
// Missing dates stay unknown; the input is already ordered newest-first.
export function groupActivityByDate(items) {
  const groups=new Map();
  for(const item of items) {
    const date=present(item.date) ? new Date(item.date) : null;
    const valid=date && Number.isFinite(date.getTime());
    const key=valid ? [date.getFullYear(),date.getMonth()+1,date.getDate()].map(n=>String(n).padStart(2,"0")).join("-") : "unknown";
    if(!groups.has(key)) groups.set(key,{key,label:valid ? date.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) : "Date unavailable",items:[]});
    groups.get(key).items.push(item);
  }
  return Array.from(groups.values());
}
export function activityTime(value) {
  if(!present(value))return "Time unavailable";
  const date=new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}) : "Time unavailable";
}
