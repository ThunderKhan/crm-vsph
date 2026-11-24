import { useEffect, useState } from "react";
import {
  Plus, Search, Edit2, Trash2, Save, X, Mail, Code2,
} from "lucide-react";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import { api } from "../utils/api";
import toast from "react-hot-toast";

const VARIABLES = [
  { key: "{{contact_firstname}}", label: "Contact First Name" },
  { key: "{{contact_lastname}}", label: "Contact Last Name" },
  { key: "{{contact_name}}", label: "Contact Full Name" },
  { key: "{{contact_email}}", label: "Contact Email" },
  { key: "{{employee_name}}", label: "Your Name (sender)" },
  { key: "{{employee_email}}", label: "Your Email (sender)" },
  { key: "{{company_name}}", label: "Company Name" },
  { key: "{{company_tagline}}", label: "Company Tagline" },
  { key: "{{company_website}}", label: "Company Website" },
  { key: "{{current_date}}", label: "Current Date" },
];

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    body_html: "",
    body_text: "",
    is_default: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/api/email-templates");
      if (res.success) setTemplates(res.data || []);
    } catch (err) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", subject: "", body_html: "", body_text: "", is_default: false });
    setFormOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name || "",
      subject: t.subject || "",
      body_html: t.body_html || "",
      body_text: t.body_text || "",
      is_default: Boolean(t.is_default),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm({ name: "", subject: "", body_html: "", body_text: "", is_default: false });
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Template name is required.");
    if (!form.subject.trim()) return toast.error("Subject is required.");
    if (!form.body_html.trim()) return toast.error("Body is required.");

    try {
      const res = editing
        ? await api.put(`/api/email-templates/${editing.email_template_id}`, form)
        : await api.post("/api/email-templates", form);
      if (!res.success) throw new Error(res.message || "Failed to save template.");
      toast.success(editing ? "Template updated." : "Template created.");
      closeForm();
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || "Failed to save template.");
    }
  };

  const deleteTemplate = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      const res = await api.delete(`/api/email-templates/${id}`);
      if (!res.success) throw new Error(res.message || "Failed to delete.");
      toast.success("Template deleted.");
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || "Failed to delete template.");
    }
  };

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const insertVar = (key) => {
    setForm((f) => ({ ...f, body_html: (f.body_html || "") + key }));
  };

  return (
    <div className="p-6">
      <PageHeader title="Email Templates" subtitle="Create and manage reusable email templates" />

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="w-full max-w-md border border-slate-200 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-400"
        />
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading templates…</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Subject</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase text-center">Default</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                    No templates found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.email_template_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-[13px] font-medium text-slate-800">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600 truncate max-w-xs">
                      {t.subject}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.is_default ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Default</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(t)}
                        className="mr-2"
                      >
                        <Edit2 size={14} /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplate(t.email_template_id, t.name)}
                        className="text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} /> Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {formOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={closeForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">
                  {editing ? "Edit Template" : "New Email Template"}
                </h3>
                <Button variant="outline" size="sm" onClick={closeForm}>
                  <X size={16} />
                </Button>
              </div>

              <form onSubmit={saveTemplate} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Template Name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Welcome New Client"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Subject</label>
                    <input
                      name="subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Welcome to {{company_name}}!"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Email Body (HTML)</label>
                  <textarea
                    name="body_html"
                    value={form.body_html}
                    onChange={(e) => setForm({ ...form, body_html: e.target.value })}
                    rows={12}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400"
                    placeholder="Use variables like {{contact_firstname}}, {{company_name}}, etc."
                  />
                  <div className="flex gap-2 mb-2">
                    <span className="text-[10px] text-slate-500">Insert variable:</span>
                    {VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVar(v.key)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600"
                        title={v.label}
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Plain Text Body (optional)</label>
                  <textarea
                    name="body_text"
                    value={form.body_text}
                    onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                    rows={4}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Plain text fallback for email clients"
                  />
                </div>

                <div className="items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm text-slate-700 cursor-pointer">
                    Set as default template
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    <Save size={16} /> {editing ? "Update Template" : "Create Template"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Variables help */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
          <Code2 size={14} /> Available Template Variables
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
          {VARIABLES.map((v) => (
            <span key={v.key} className="flex items-center gap-1.5">
              <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{v.key}</span>
              <span>{v.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplates;
