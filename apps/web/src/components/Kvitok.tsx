import { useState, useMemo, useEffect } from 'react';
import {
  Plus, X, Crown, Clock, Film, Music, Dumbbell, Cloud, Code2,
  ShoppingBag, MoreHorizontal, Lock, EyeOff, Trash2, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');`;

const CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  streaming: { label: 'Стриминг', icon: Film, color: '#B5442E' },
  music: { label: 'Музыка', icon: Music, color: '#C9A227' },
  fitness: { label: 'Спорт', icon: Dumbbell, color: '#3F6E5B' },
  cloud: { label: 'Облако', icon: Cloud, color: '#5B7A99' },
  software: { label: 'Софт', icon: Code2, color: '#8A5FB0' },
  shopping: { label: 'Покупки', icon: ShoppingBag, color: '#B0784F' },
  other: { label: 'Другое', icon: MoreHorizontal, color: '#5B6560' },
};

const CUR = '€';

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'мес',
  yearly: 'год',
  weekly: 'нед',
  quarterly: '3 мес',
  semiannual: '6 мес',
};

function monthlyEquivalent(sub: any) {
  if (sub.cycle === 'monthly') return Number(sub.price);
  if (sub.cycle === 'yearly') return Number(sub.price) / 12;
  if (sub.cycle === 'weekly') return Number(sub.price) * 4.345;
  if (sub.cycle === 'quarterly') return Number(sub.price) / 3;
  if (sub.cycle === 'semiannual') return Number(sub.price) / 6;
  return Number(sub.price);
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return Math.ceil(diff / 86400000);
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Perforation() {
  return (
    <div className="relative h-3 my-1 select-none" aria-hidden="true">
      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-0" style={{ borderTop: '2px dashed rgba(20,33,30,0.28)' }} />
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: '#14211E' }} />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: '#14211E' }} />
    </div>
  );
}

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any) => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('streaming');
  const canSubmit = name.trim() && Number(price) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(20,33,30,0.6)' }}>
      <div className="w-full max-w-md rounded-sm shadow-2xl" style={{ background: '#EFE9D8', color: '#14211E' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '2px dashed rgba(20,33,30,0.25)' }}>
          <h3 className="font-semibold" style={{ fontFamily: "'Fraunces', serif", fontSize: '20px' }}>Новая строка чека</h3>
          <button onClick={onClose} aria-label="Закрыть" className="opacity-60 hover:opacity-100 transition-opacity"><X size={20} /></button>
        </div>
        <div className="px-5 py-4 space-y-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div>
            <label className="text-xs uppercase tracking-wide opacity-60 block mb-1">Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Netflix" className="w-full px-3 py-2 rounded-sm outline-none" style={{ background: '#E4DCC6', border: '1px solid rgba(20,33,30,0.15)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide opacity-60 block mb-1">Сумма, {CUR}</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-sm outline-none" style={{ background: '#E4DCC6', border: '1px solid rgba(20,33,30,0.15)', fontFamily: "'IBM Plex Mono', monospace" }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide opacity-60 block mb-1">Периодичность</label>
              <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="w-full px-3 py-2 rounded-sm outline-none" style={{ background: '#E4DCC6', border: '1px solid rgba(20,33,30,0.15)' }}>
                <option value="monthly">Ежемесячно</option>
                <option value="quarterly">Раз в 3 месяца</option>
                <option value="semiannual">Раз в 6 месяцев</option>
                <option value="yearly">Ежегодно</option>
                <option value="weekly">Еженедельно</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide opacity-60 block mb-1">Следующее списание</label>
              <input value={nextDate} onChange={(e) => setNextDate(e.target.value)} type="date" className="w-full px-3 py-2 rounded-sm outline-none" style={{ background: '#E4DCC6', border: '1px solid rgba(20,33,30,0.15)' }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide opacity-60 block mb-1">Категория</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-sm outline-none" style={{ background: '#E4DCC6', border: '1px solid rgba(20,33,30,0.15)' }}>
                {Object.entries(CATEGORIES).map(([key, c]) => (
                  <option key={key} value={key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: '2px dashed rgba(20,33,30,0.25)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-sm text-sm opacity-70 hover:opacity-100 transition-opacity">Отмена</button>
          <button disabled={!canSubmit} onClick={() => canSubmit && onAdd({ name: name.trim(), price: Number(price), cycle, nextDate, category })} className="px-4 py-2 rounded-sm text-sm font-medium disabled:opacity-40 transition-transform hover:scale-[1.02]" style={{ background: '#C9A227', color: '#14211E' }}>Добавить в ленту</button>
        </div>
      </div>
    </div>
  );
}

function PaywallModal({ onClose, onUpgrade, reason }: { onClose: () => void; onUpgrade: () => void; reason: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(20,33,30,0.6)' }}>
      <div className="w-full max-w-sm rounded-sm shadow-2xl text-center px-6 py-8" style={{ background: '#14211E', color: '#EFE9D8' }}>
        <Crown size={28} className="mx-auto mb-3" style={{ color: '#C9A227' }} />
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px' }} className="mb-2">Квиток Pro</h3>
        <p className="text-sm opacity-75 mb-5" style={{ fontFamily: "'Inter', sans-serif" }}>{reason}</p>
        <ul className="text-left text-sm space-y-2 mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          <li className="flex items-center gap-2"><span style={{ color: '#C9A227' }}>✓</span> Неограниченное число подписок</li>
          <li className="flex items-center gap-2"><span style={{ color: '#C9A227' }}>✓</span> Разбивка расходов по категориям</li>
          <li className="flex items-center gap-2"><span style={{ color: '#C9A227' }}>✓</span> Подсказки, что стоит отменить</li>
          <li className="flex items-center gap-2"><span style={{ color: '#C9A227' }}>✓</span> Экспорт в CSV</li>
        </ul>
        <button onClick={onUpgrade} className="w-full py-3 rounded-sm font-medium mb-2 transition-transform hover:scale-[1.02]" style={{ background: '#C9A227', color: '#14211E' }}>Оформить Pro за 4.99€/мес</button>
        <button onClick={onClose} className="text-xs opacity-60 hover:opacity-90 transition-opacity">Не сейчас</button>
      </div>
    </div>
  );
}

export default function Kvitok() {
  const { user, logout, refreshUser } = useAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [paywall, setPaywall] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPro = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';
  const FREE_LIMIT = isPro ? Infinity : 5;
  const trialDaysLeft = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  const fetchSubs = async () => {
    try {
      const data = await api.subscriptions.list();
      setSubs(data.subscriptions);
    } catch (e) {
      console.error('Failed to fetch subscriptions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchSubs();
  }, [user]);

  const sorted = useMemo(() => [...subs].sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime()), [subs]);

  const monthlyTotal = useMemo(() => subs.reduce((sum, s) => sum + monthlyEquivalent(s), 0), [subs]);
  const yearlyTotal = monthlyTotal * 12;

  const soon = sorted.filter((s) => {
    const d = daysUntil(s.nextDate);
    return d <= 7 && d >= 0;
  });

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    subs.forEach((s) => {
      map[s.category] = (map[s.category] || 0) + monthlyEquivalent(s);
    });
    return Object.entries(map)
      .map(([key, value]) => ({ key, label: CATEGORIES[key]?.label || key, value, color: CATEGORIES[key]?.color || '#5B6560' }))
      .sort((a, b) => b.value - a.value);
  }, [subs]);

  const unusedSubs = subs.filter((s) => s.unused);
  const potentialSavings = unusedSubs.reduce((sum, s) => sum + monthlyEquivalent(s), 0);

  const handleAdd = async (data: any) => {
    if (!isPro && subs.length >= 5) {
      setShowAdd(false);
      setPaywall('На бесплатном тарифе доступно до 5 подписок. Оформите Pro, чтобы вести их без ограничений.');
      return;
    }
    try {
      await api.subscriptions.create(data);
      await fetchSubs();
      setShowAdd(false);
    } catch (err: any) {
      if (err.message?.includes('limit')) {
        setShowAdd(false);
        setPaywall(err.message);
      }
    }
  };

  const toggleUnused = async (id: string, current: boolean) => {
    await api.subscriptions.update(id, { unused: !current });
    await fetchSubs();
  };

  const removeSub = async (id: string) => {
    await api.subscriptions.remove(id);
    await fetchSubs();
  };

  const handleUpgrade = async () => {
    try {
      const data = await api.billing.createCheckout('monthly');
      window.location.href = data.url;
    } catch {
      setPaywall('Оплата временно недоступна. Попробуйте позже.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: '#14211E' }}>
        <p style={{ color: '#EFE9D8' }}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: '#14211E', fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <header className="max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '28px', color: '#EFE9D8', letterSpacing: '-0.01em' }}>Квиток</h1>
          <p className="text-xs" style={{ color: 'rgba(239,233,216,0.5)' }}>лента твоих подписок</p>
        </div>
        <div className="flex items-center gap-3">
          {!isPro && trialDaysLeft > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(239,233,216,0.08)', color: '#EFE9D8' }}>
              <Clock size={13} />
              Триал: осталось {trialDaysLeft} дн.
            </div>
          )}
          {isPro ? (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: '#C9A227', color: '#14211E' }}>
              <Crown size={13} /> Pro
            </div>
          ) : (
            <button onClick={() => setPaywall('Разблокируйте безлимитные подписки, аналитику по категориям и подсказки по экономии.')} className="text-xs px-3 py-1.5 rounded-full font-medium transition-transform hover:scale-105" style={{ background: '#C9A227', color: '#14211E' }}>
              Оформить Pro
            </button>
          )}
          <button onClick={logout} className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(239,233,216,0.08)', color: 'rgba(239,233,216,0.6)' }}>
            Выйти
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6">
        <div className="rounded-sm px-6 py-6 mb-6" style={{ background: 'linear-gradient(135deg, rgba(201,162,39,0.12), rgba(201,162,39,0.03))', border: '1px solid rgba(201,162,39,0.25)' }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(239,233,216,0.55)' }}>Итого в месяц</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '44px', color: '#EFE9D8', lineHeight: 1 }}>
                {CUR}{fmt(monthlyTotal)}
              </div>
              <div className="text-sm mt-1" style={{ color: 'rgba(239,233,216,0.5)' }}>
                ≈ {CUR}{fmt(yearlyTotal)} в год · {subs.length} подписок
              </div>
            </div>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-medium transition-transform hover:scale-[1.02]" style={{ background: '#EFE9D8', color: '#14211E' }}>
              <Plus size={16} /> Добавить подписку
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="rounded-sm px-5 pt-5 pb-3" style={{ background: '#EFE9D8' }}>
          <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(20,33,30,0.5)' }}>Лента подписок</h2>
          {sorted.map((s, i) => {
            const Icon = CATEGORIES[s.category]?.icon || MoreHorizontal;
            const d = daysUntil(s.nextDate);
            return (
              <div key={s.id}>
                <div className="flex items-center gap-3 py-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${CATEGORIES[s.category]?.color || '#5B6560'}22` }}>
                    <Icon size={16} style={{ color: CATEGORIES[s.category]?.color || '#5B6560' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: '#14211E' }}>{s.name}</span>
                      {s.unused && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(181,68,46,0.15)', color: '#B5442E' }}>не используется</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(20,33,30,0.5)' }}>
                      {d <= 3 && d >= 0 ? (
                        <span style={{ color: '#B5442E', fontWeight: 500 }}>спишется через {d === 0 ? 'сегодня' : `${d} дн.`}</span>
                      ) : (
                        `спишется ${new Date(s.nextDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#14211E', fontSize: '15px' }}>
                    {CUR}{fmt(Number(s.price))}
                    <span className="text-[10px] opacity-50 ml-0.5">/{CYCLE_LABELS[s.cycle] || s.cycle}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleUnused(s.id, s.unused)} title="Отметить как неиспользуемую" className="p-1.5 rounded-sm opacity-40 hover:opacity-90 transition-opacity"><EyeOff size={14} color="#14211E" /></button>
                    <button onClick={() => removeSub(s.id)} title="Удалить" className="p-1.5 rounded-sm opacity-40 hover:opacity-90 transition-opacity"><Trash2 size={14} color="#14211E" /></button>
                  </div>
                </div>
                {i < sorted.length - 1 && <Perforation />}
              </div>
            );
          })}
          {subs.length === 0 && (
            <div className="text-sm py-8 text-center" style={{ color: 'rgba(20,33,30,0.45)' }}>Лента пуста. Добавьте первую подписку.</div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-sm px-5 py-5" style={{ background: 'rgba(239,233,216,0.06)', border: '1px solid rgba(239,233,216,0.1)' }}>
            <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(239,233,216,0.55)' }}>Ближайшая неделя</h2>
            {soon.length === 0 && <p className="text-sm" style={{ color: 'rgba(239,233,216,0.4)' }}>Списаний не ожидается</p>}
            {soon.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                <span style={{ color: '#EFE9D8' }}>{s.name}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#C9A227' }}>{CUR}{fmt(Number(s.price))}</span>
              </div>
            ))}
          </div>

          <div className="rounded-sm px-5 py-5 relative overflow-hidden" style={{ background: 'rgba(239,233,216,0.06)', border: '1px solid rgba(239,233,216,0.1)' }}>
            <h2 className="text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'rgba(239,233,216,0.55)' }}>
              По категориям {!isPro && <Lock size={11} />}
            </h2>
            <div className={!isPro ? 'blur-sm pointer-events-none select-none' : ''}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="label" type="category" width={80} tick={{ fill: '#EFE9D8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${CUR}${fmt(v)}`, 'в месяц']} contentStyle={{ background: '#14211E', border: '1px solid rgba(239,233,216,0.2)', fontSize: 12 }} labelStyle={{ color: '#EFE9D8' }} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {categoryData.map((c) => <Cell key={c.key} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!isPro && (
              <button onClick={() => setPaywall('Аналитика по категориям доступна на Pro-тарифе.')} className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color: '#EFE9D8' }}>
                <span className="px-3 py-1.5 rounded-full" style={{ background: '#14211E', border: '1px solid rgba(239,233,216,0.25)' }}>Открыть в Pro</span>
              </button>
            )}
          </div>

          <div className="rounded-sm px-5 py-5" style={{ background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.25)' }}>
            <h2 className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: '#C9A227' }}>
              <TrendingUp size={13} /> Можно сэкономить
            </h2>
            {isPro ? (
              unusedSubs.length > 0 ? (
                <>
                  <p className="text-sm mb-2" style={{ color: '#EFE9D8' }}>
                    {unusedSubs.length} {unusedSubs.length === 1 ? 'подписка помечена' : 'подписки помечены'} как неиспользуемые
                  </p>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '20px', color: '#C9A227' }}>
                    {CUR}{fmt(potentialSavings)}<span className="text-xs opacity-60">/мес</span>
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: 'rgba(239,233,216,0.5)' }}>
                  Отметьте иконкой «глаз» неиспользуемые подписки — покажем, сколько на них уходит.
                </p>
              )
            ) : (
              <p className="text-sm" style={{ color: 'rgba(239,233,216,0.5)' }}>
                Подсказки по экономии доступны на Pro-тарифе.
              </p>
            )}
          </div>
        </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {paywall && <PaywallModal reason={paywall} onClose={() => setPaywall(null)} onUpgrade={handleUpgrade} />}
    </div>
  );
}
