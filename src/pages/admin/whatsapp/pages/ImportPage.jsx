import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { cn, textareaCls } from '../shared/cn';
import { importContacts } from '../shared/api';

function StepIndicator({ step }) {
  const labels = ['Paste', 'Review', 'Done'];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const isActive = step === n;
        const isDone = step > n;
        return (
          <div key={l} className="flex items-center gap-2">
            <div className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
              isDone ? 'bg-emerald-600 text-white' : isActive ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' : 'bg-slate-100 text-slate-500',
            )}>
              {isDone ? '✓' : n}
            </div>
            <span className={cn('text-xs font-medium', isActive ? 'text-slate-900' : 'text-slate-500')}>{l}</span>
            {n < labels.length && <span className="h-px w-6 bg-slate-200" />}
          </div>
        );
      })}
    </div>
  );
}

export default function ImportPage() {
  const { reloadSalesPersons } = useOutletContext();
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [assignRR, setAssignRR] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const handleParse = () => {
    const lines = rawText.trim().split('\n').filter(Boolean);
    const rows = lines.map((line) => {
      const parts = line.split(/[,\t]/);
      return { phone: (parts[0] || '').trim(), name: (parts[1] || '').trim() };
    }).filter((r) => r.phone);
    setParsed(rows);
    setStep(2);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setErr('');
    try {
      const r = await importContacts(parsed, assignRR);
      setResult(r);
      setStep(3);
      reloadSalesPersons?.();
    } catch (e) {
      setErr(e.response?.data?.error || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setRawText('');
    setParsed([]);
    setResult(null);
    setErr('');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Step indicator */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <StepIndicator step={step} />
      </div>

      {/* Step 1 — paste */}
      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1">Paste phone numbers</h2>
            <p className="text-xs text-slate-500">
              One per line. Optional: add a name after a comma —
              <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-emerald-700 font-mono">phone, name</code>
            </p>
          </div>

          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"9876543210, Ramesh Kumar\n9123456789\n+91 98765 43210, Sunita Patel"}
            className={`${textareaCls} font-mono resize-y`}
          />

          <div className="flex justify-between items-center pt-2">
            <p className="text-xs text-slate-500">
              {rawText.trim().split('\n').filter(Boolean).length} lines
            </p>
            <button
              type="button"
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              Parse contacts
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — review */}
      {step === 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Upload size={16} />
            </span>
            <div>
              <p className="text-base font-bold text-slate-800">
                {parsed.length} contact{parsed.length !== 1 ? 's' : ''} detected
              </p>
              <p className="text-xs text-slate-500">Review before importing</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left">
                  <th className="px-3 py-1.5 w-12">#</th>
                  <th className="px-3 py-1.5">Phone</th>
                  <th className="px-3 py-1.5">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parsed.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-white">
                    <td className="px-3 py-1.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-slate-800">{r.phone}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-700">{r.name || <span className="text-slate-400 italic">—</span>}</td>
                  </tr>
                ))}
                {parsed.length > 50 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-center text-xs text-slate-500 italic">
                      … and {parsed.length - 50} more
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={assignRR}
              onChange={(e) => setAssignRR(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span className="text-sm text-slate-700">Round-robin assign to active sales people</span>
          </label>

          {err && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={13} />
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || !parsed.length}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isImporting ? 'Importing…' : `Import ${parsed.length} contact${parsed.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — done */}
      {step === 3 && result && (
        <div className="rounded-xl border border-emerald-200 bg-white p-8 shadow-sm text-center space-y-3">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={28} />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-800">
              <span className="text-emerald-600">{result.created}</span> contact{result.created !== 1 ? 's' : ''} imported
            </p>
            {(result.skipped ?? 0) > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                {result.skipped} duplicates skipped
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            Import more
          </button>
        </div>
      )}
    </div>
  );
}
