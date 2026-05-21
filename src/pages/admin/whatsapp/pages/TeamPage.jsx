import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  Mail,
  Pencil,
  Phone,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  createSalesPerson,
  deleteSalesPerson,
  fetchSalesPersons,
  updateSalesPerson,
} from '../shared/api';
import { inputCls, modalCardCls, modalOverlayCls } from '../shared/cn';

export default function TeamPage() {
  const { reloadSalesPersons } = useOutletContext();
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editSp, setEditSp] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [err, setErr] = useState('');

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSalesPersons();
      setPeople(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openAdd = () => { setForm({ name: '', email: '', phone: '' }); setEditSp(null); setErr(''); setShowAdd(true); };
  const openEdit = (sp) => { setForm({ name: sp.name, email: sp.email, phone: sp.phone || '' }); setEditSp(sp); setErr(''); setShowAdd(true); };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      setErr('Name and email are required.');
      return;
    }
    setIsSaving(true);
    setErr('');
    try {
      if (editSp) await updateSalesPerson(editSp.id, form);
      else await createSalesPerson(form);
      setShowAdd(false);
      await refresh();
      reloadSalesPersons?.();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (sp) => {
    if (!window.confirm(`Remove ${sp.name} from the team? They'll be deactivated, not deleted.`)) return;
    await deleteSalesPerson(sp.id);
    await refresh();
    reloadSalesPersons?.();
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Sales team</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phone numbers receive WhatsApp follow-up reminders automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          <UserPlus size={14} />
          Add Person
        </button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading team…</p>
      ) : people.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <UserPlus size={20} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No team members yet</p>
          <p className="text-xs text-slate-400 mt-1">Add your first sales person to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {people.map((sp) => (
            <div key={sp.id} className="group rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Card top accent */}
              <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="p-4">
                {/* Avatar + name + actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white shadow-sm">
                      {sp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{sp.name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        sp.is_active === false
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sp.is_active === false ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                        {sp.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEdit(sp)}
                      title="Edit"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sp)}
                      title="Deactivate"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* Contact details */}
                <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{sp.email}</span>
                  </p>
                  {sp.phone ? (
                    <p className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{sp.phone}</span>
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-slate-400 italic">
                      <Phone size={12} className="shrink-0" />
                      No WhatsApp number
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <div className={modalOverlayCls} onClick={() => setShowAdd(false)}>
          <div className={`w-[420px] ${modalCardCls}`} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                <UserPlus size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-800">{editSp ? 'Edit team member' : 'Add team member'}</p>
                <p className="text-xs text-slate-400 mt-0.5">Sales person who handles leads</p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 block">
                  Full Name <span className="text-red-500 font-normal">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rounak Patel"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 block">
                  Email address <span className="text-red-500 font-normal">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@company.com"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 block">WhatsApp Phone</label>
                <p className="text-xs text-slate-400 -mt-1">Follow-up reminders will be sent to this number via WhatsApp.</p>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>

              {err && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <AlertCircle size={13} className="shrink-0" />
                  {err}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {isSaving ? 'Saving…' : editSp ? 'Save changes' : 'Add member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
