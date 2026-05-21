import { UserRound } from 'lucide-react';

export default function WhoAmIPicker({ activeSp, salesPersons, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-3 pr-1 py-1 shadow-sm">
      <UserRound size={13} className="text-slate-500 shrink-0" />
      <select
        value={activeSp?.id ?? ''}
        onChange={(e) => {
          const sp = salesPersons.find((s) => s.id === Number(e.target.value)) || null;
          onChange(sp);
        }}
        className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
      >
        <option value="">Who am I?</option>
        {salesPersons.map((sp) => (
          <option key={sp.id} value={sp.id}>{sp.name}</option>
        ))}
      </select>
    </div>
  );
}
