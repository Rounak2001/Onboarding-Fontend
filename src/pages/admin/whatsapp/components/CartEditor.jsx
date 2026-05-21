import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Package,
  Plus,
  RefreshCw,
  Send,
  ShoppingCart,
  X,
} from 'lucide-react';
import { fetchConversationCart, updateConversationCart } from '../shared/api';

export default function CartEditor({ conversationId, onCartUpdated }) {
  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draftItems, setDraftItems] = useState(null);
  const [addServiceCode, setAddServiceCode] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await fetchConversationCart(conversationId);
      setCart(data);
      const items = data.order_items?.length
        ? data.order_items.map((i) => ({
            service_code: i.service_code,
            category: i.category || '',
            addon_codes: [...(i.addon_codes || [])],
            quantities: { ...(i.quantities || {}) },
            details: { ...(i.details || {}) },
          }))
        : data.single_service
          ? [{
              service_code: data.single_service.code,
              category: data.single_service.category || '',
              addon_codes: [],
              quantities: {},
              details: {},
            }]
          : [];
      setDraftItems(items);
      return true;
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load cart.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) load();
  }, [conversationId, load]);

  const handleRemoveItem = (idx) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
    setSuccess('');
  };

  const handleAddService = (serviceCode) => {
    if (!serviceCode || !cart) return;
    let category = '';
    for (const cat of cart.catalogue || []) {
      if (cat.services.some((s) => s.code === serviceCode)) {
        category = cat.category;
        break;
      }
    }
    setDraftItems([{ service_code: serviceCode, addon_codes: [], quantities: {}, details: {}, category }]);
    setSuccess('');
  };

  const handleToggleAddon = (itemIdx, addonCode) => {
    setDraftItems((prev) => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      const has = item.addon_codes.includes(addonCode);
      return {
        ...item,
        addon_codes: has
          ? item.addon_codes.filter((c) => c !== addonCode)
          : [...item.addon_codes, addonCode],
      };
    }));
    setSuccess('');
  };

  const handleSave = async () => {
    if (!draftItems?.length) {
      setError('Cart cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateConversationCart(conversationId, draftItems);
      const reloaded = await load();
      if (reloaded) setSuccess('Cart updated and price summary sent to user.');
      onCartUpdated?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update cart.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#8696a0]">
        <RefreshCw size={12} className="animate-spin" /> Loading cart…
      </div>
    );
  }

  if (!cart) return null;

  const catalogueServices = (cart.catalogue || []).flatMap((cat) =>
    cat.services.map((s) => ({ ...s, category: cat.category })),
  );
  const addonServices = Object.values(cart.addon_options || {}).flatMap((o) => o);
  const serviceByCode = Object.fromEntries([...catalogueServices, ...addonServices].map((s) => [s.code, s]));
  const getAddonOptionsForService = (code) => cart.addon_options?.[code] || [];

  const cartTotal = (draftItems || []).reduce((sum, item) => {
    const svc = serviceByCode[item.service_code];
    const base = Number(svc?.price || 0);
    const addonsTotal = item.addon_codes.reduce(
      (aSum, code) => aSum + Number(serviceByCode[code]?.price || 0),
      0,
    );
    return sum + base + addonsTotal;
  }, 0);

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2.5 text-[11px] text-red-400">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-[#00a884]/30 bg-[#00a884]/10 px-3 py-2.5 text-[11px] text-[#06cf9c]">
          <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> <span>{success}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShoppingCart size={12} className="text-[#00a884]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8696a0]">Cart Items</span>
          {draftItems?.length > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#00a884] px-1 text-[9px] font-bold text-white">
              {draftItems.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          title="Reload cart"
          className="flex h-5 w-5 items-center justify-center rounded-full text-[#8696a0] transition hover:bg-white/10 hover:text-[#e9edef]"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {draftItems?.length ? (
        <div className="space-y-2">
          {draftItems.map((item, idx) => {
            const svc = serviceByCode[item.service_code];
            const addonOptions = getAddonOptionsForService(item.service_code);
            const hasAvailableAddons = addonOptions.some((s) => !item.addon_codes.includes(s.code));
            return (
              <div
                key={item.service_code || idx}
                className="group relative overflow-hidden rounded-xl border border-[#2a3942] bg-gradient-to-b from-[#1f2c34] to-[#182229] shadow-sm"
              >
                <div className="h-0.5 w-full bg-gradient-to-r from-[#00a884] to-[#06cf9c] opacity-60" />
                <div className="flex items-start gap-2 px-3 pt-2.5 pb-2">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00a884]/15">
                    <Package size={13} className="text-[#00a884]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold leading-snug text-[#e9edef]">
                      {svc?.title || item.service_code}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {svc?.category && (
                        <span className="rounded-full bg-[#2a3942] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#8696a0]">
                          {svc.category}
                        </span>
                      )}
                      <span className="text-[12px] font-bold text-[#00a884]">
                        ₹{Number(svc?.price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    title="Remove service"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#8696a0] transition hover:bg-red-500/15 hover:text-red-400"
                  >
                    <X size={11} />
                  </button>
                </div>

                {item.addon_codes.length > 0 && (
                  <div className="border-t border-[#2a3942]/60 px-3 py-2">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#8696a0]">Add-ons</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.addon_codes.map((code) => {
                        const addon = serviceByCode[code];
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 rounded-full border border-[#00a884]/30 bg-[#00a884]/10 py-0.5 pl-2 pr-1 text-[10px] font-medium text-[#06cf9c]"
                          >
                            <span className="truncate max-w-[100px]">{addon?.title || code}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleAddon(idx, code)}
                              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#06cf9c]/20 text-[#06cf9c] transition hover:bg-red-500/30 hover:text-red-400"
                            >
                              <X size={8} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {hasAvailableAddons && (
                  <div className="border-t border-[#2a3942]/60 px-3 py-2">
                    <select
                      className="w-full rounded-lg border border-[#2a3942] bg-[#111b21] px-2.5 py-1.5 text-[11px] text-[#8696a0] outline-none transition focus:border-[#00a884]/40 focus:text-[#e9edef]"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleToggleAddon(idx, e.target.value);
                      }}
                    >
                      <option value="">＋ Add add-on…</option>
                      {addonOptions
                        .filter((s) => !item.addon_codes.includes(s.code))
                        .map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.title} (₹{Number(s.price).toLocaleString('en-IN')})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#2a3942] py-6 text-center">
          <ShoppingCart size={20} className="text-[#2a3942]" strokeWidth={1.5} />
          <p className="text-[11px] text-[#8696a0]">Cart is empty</p>
        </div>
      )}

      {draftItems?.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-[#1f2c34] px-3 py-2.5">
          <span className="text-[11px] font-medium text-[#8696a0]">Estimated Total</span>
          <span className="text-[13px] font-bold text-[#00a884]">
            ₹{cartTotal.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8696a0]">Add Service</p>
        <div className="flex gap-1.5">
          <select
            className="min-w-0 flex-1 rounded-lg border border-[#2a3942] bg-[#111b21] px-2.5 py-1.5 text-[11px] text-[#8696a0] outline-none transition focus:border-[#00a884]/40 focus:text-[#e9edef]"
            value={addServiceCode}
            onChange={(e) => setAddServiceCode(e.target.value)}
          >
            <option value="">Select a service…</option>
            {(cart.catalogue || []).map((cat) => {
              const baseServices = cat.services.filter((s) => !s.is_addon);
              if (!baseServices.length) return null;
              return (
                <optgroup key={cat.category} label={cat.category}>
                  {baseServices.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.title} (₹{Number(s.price).toLocaleString('en-IN')})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => { handleAddService(addServiceCode); setAddServiceCode(''); }}
            disabled={!addServiceCode}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#00a884] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#06cf9c] active:scale-95 disabled:opacity-40"
          >
            <Plus size={11} />
            Add
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !draftItems?.length}
        className="relative w-full overflow-hidden rounded-xl py-3 text-[12px] font-bold text-white shadow-lg shadow-[#00a884]/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: isSaving ? '#00a884' : 'linear-gradient(135deg, #00a884 0%, #06cf9c 100%)',
        }}
      >
        <span className="flex items-center justify-center gap-2">
          {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
          {isSaving ? 'Sending…' : 'Save & Send to User'}
        </span>
      </button>
    </div>
  );
}
