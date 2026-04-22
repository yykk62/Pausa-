import React, { useState, useEffect, useRef } from ‘react’;
import { Plus, Cigarette, Leaf, Coffee, Wine, Candy, Pill, Smartphone, Gamepad2, Heart, Zap, Trash2, Settings, X, Link2, TrendingDown, TrendingUp, BarChart3, Check, ChevronLeft, ChevronRight, Clock, Home, Activity, Target, Lock, Sparkles, Flame, Award, StickyNote, Calendar } from ‘lucide-react’;

// ============ CONSTANTS ============

const ICON_OPTIONS = [
{ name: ‘cigarette’, Icon: Cigarette },
{ name: ‘leaf’, Icon: Leaf },
{ name: ‘coffee’, Icon: Coffee },
{ name: ‘wine’, Icon: Wine },
{ name: ‘candy’, Icon: Candy },
{ name: ‘pill’, Icon: Pill },
{ name: ‘phone’, Icon: Smartphone },
{ name: ‘game’, Icon: Gamepad2 },
{ name: ‘heart’, Icon: Heart },
{ name: ‘zap’, Icon: Zap },
];

const COLOR_OPTIONS = [
‘#64748b’, // slate
‘#0891b2’, // cyan
‘#0d9488’, // teal
‘#7c3aed’, // violet
‘#db2777’, // pink
‘#dc2626’, // red
‘#d97706’, // amber
‘#059669’, // emerald
];

const FREE_TIER_LIMITS = {
maxTrackers: 2,
historyDays: 7,
};

// ============ HELPERS ============

const getIcon = (name) => {
const found = ICON_OPTIONS.find(i => i.name === name);
return found ? found.Icon : Cigarette;
};

const formatDuration = (ms) => {
if (ms < 0 || ms === null || ms === undefined) return ‘—’;
const seconds = Math.floor(ms / 1000);
const minutes = Math.floor(seconds / 60);
const hours = Math.floor(minutes / 60);
const days = Math.floor(hours / 24);
if (days > 0) return `${days}d ${hours % 24}h`;
if (hours > 0) return `${hours}h ${minutes % 60}m`;
if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
return `${seconds}s`;
};

const formatMinutes = (ms) => {
if (!ms || ms < 0) return ‘—’;
const minutes = Math.round(ms / 60000);
if (minutes < 60) return `${minutes} min`;
const hours = Math.floor(minutes / 60);
return `${hours}h ${minutes % 60}m`;
};

const isToday = (ts) => new Date(ts).toDateString() === new Date().toDateString();
const getTodayEntries = (entries) => entries.filter(e => isToday(e.timestamp));
const getAverageGap = (entries) => {
if (entries.length < 2) return null;
const sorted = […entries].sort((a, b) => a.timestamp - b.timestamp);
let total = 0;
for (let i = 1; i < sorted.length; i++) total += sorted[i].timestamp - sorted[i - 1].timestamp;
return total / (sorted.length - 1);
};

const formatTimeOfDay = (ts) => {
const d = new Date(ts);
return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getStreak = (entries, goalMinutes) => {
if (!goalMinutes || entries.length < 2) return 0;
const sorted = […entries].sort((a, b) => a.timestamp - b.timestamp);
// group by day
const byDay = {};
sorted.forEach(e => {
const d = new Date(e.timestamp);
d.setHours(0, 0, 0, 0);
const key = d.toDateString();
if (!byDay[key]) byDay[key] = [];
byDay[key].push(e);
});
// go backwards from today
let streak = 0;
const today = new Date();
today.setHours(0, 0, 0, 0);
for (let i = 0; i < 365; i++) {
const d = new Date(today);
d.setDate(d.getDate() - i);
const key = d.toDateString();
const dayEntries = byDay[key];
if (!dayEntries || dayEntries.length < 2) {
if (i === 0) continue; // today with no/few entries doesn’t break streak yet
break;
}
const avg = getAverageGap(dayEntries);
if (avg && avg / 60000 >= goalMinutes) streak++;
else break;
}
return streak;
};

// ============ MAIN APP ============

export default function App() {
const [trackers, setTrackers] = useState([]);
const [entries, setEntries] = useState([]);
const [combos, setCombos] = useState([]);
const [isPremium, setIsPremium] = useState(false);
const [loading, setLoading] = useState(true);
const [now, setNow] = useState(Date.now());
const [tab, setTab] = useState(‘home’);
const [modal, setModal] = useState(null); // {type, data}

// Load from localStorage
useEffect(() => {
try {
const t = localStorage.getItem(‘pausa_trackers’);
const e = localStorage.getItem(‘pausa_entries’);
const c = localStorage.getItem(‘pausa_combos’);
const p = localStorage.getItem(‘pausa_premium’);
if (t) setTrackers(JSON.parse(t));
if (e) setEntries(JSON.parse(e));
if (c) setCombos(JSON.parse(c));
if (p) setIsPremium(JSON.parse(p));
} catch (err) { console.error(err); }
finally { setLoading(false); }
}, []);

useEffect(() => {
const i = setInterval(() => setNow(Date.now()), 1000);
return () => clearInterval(i);
}, []);

const save = (key, val) => {
try { localStorage.setItem(`pausa_${key}`, JSON.stringify(val)); } catch (err) { console.error(err); }
};
const persistTrackers = (next) => { setTrackers(next); save(‘trackers’, next); };
const persistEntries = (next) => { setEntries(next); save(‘entries’, next); };
const persistCombos = (next) => { setCombos(next); save(‘combos’, next); };
const persistPremium = (next) => { setIsPremium(next); save(‘premium’, next); };

const addTracker = (t) => {
if (!isPremium && trackers.length >= FREE_TIER_LIMITS.maxTrackers) {
setModal({ type: ‘paywall’, data: { feature: ‘unlimited_trackers’ } });
return;
}
persistTrackers([…trackers, { …t, id: `t_${Date.now()}`, createdAt: Date.now() }]);
};

const updateTracker = (id, updates) => {
persistTrackers(trackers.map(t => t.id === id ? { …t, …updates } : t));
};

const deleteTracker = (id) => {
persistTrackers(trackers.filter(t => t.id !== id));
persistEntries(entries.filter(e => e.trackerId !== id));
persistCombos(combos.map(c => ({ …c, trackerIds: c.trackerIds.filter(tid => tid !== id) })).filter(c => c.trackerIds.length > 0));
};

const addCombo = (c) => persistCombos([…combos, { …c, id: `c_${Date.now()}` }]);
const deleteCombo = (id) => persistCombos(combos.filter(c => c.id !== id));

const logEntry = (trackerId, offsetMinutes = 0, note = ‘’) => {
const entry = {
id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
trackerId,
timestamp: Date.now() - offsetMinutes * 60000,
note: note || undefined,
};
persistEntries([…entries, entry]);
if (navigator.vibrate) navigator.vibrate(15);
return entry;
};

const undoLast = (trackerId) => {
const filtered = entries.filter(e => e.trackerId === trackerId).sort((a, b) => b.timestamp - a.timestamp);
if (filtered.length === 0) return;
persistEntries(entries.filter(e => e.id !== filtered[0].id));
};

const updateEntry = (id, updates) => {
persistEntries(entries.map(e => e.id === id ? { …e, …updates } : e));
};

if (loading) {
return (
<div style={{ minHeight: ‘100vh’, background: ‘#f5f6f8’, display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’ }}>
<div style={{ color: ‘#94a3b8’, fontFamily: ‘“DM Serif Display”, Georgia, serif’, fontStyle: ‘italic’, fontSize: ‘18px’ }}>pausa</div>
</div>
);
}

return (
<>
<style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; } input, textarea { -webkit-user-select: text; user-select: text; } body { margin: 0; } button { transition: all 0.15s ease; font-family: 'Inter', sans-serif; } button:active { transform: scale(0.97); } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } } @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } } @keyframes success-pop { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

```
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f5f6f8 0%, #eef1f5 100%)',
    color: '#1e293b',
    fontFamily: '"Inter", -apple-system, sans-serif',
    paddingBottom: '88px',
    position: 'relative',
  }}>
    {/* Soft color wash at top */}
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '40vh',
      background: 'radial-gradient(ellipse at 30% 0%, rgba(125, 159, 212, 0.25) 0%, transparent 60%)',
      pointerEvents: 'none',
      zIndex: 0,
    }} />

    <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px', margin: '0 auto' }}>
      {tab === 'home' && (
        <HomeTab
          trackers={trackers}
          entries={entries}
          combos={combos}
          now={now}
          isPremium={isPremium}
          onLog={logEntry}
          onUndo={undoLast}
          onShowStats={(item) => setModal({ type: 'stats', data: item })}
          onAddTracker={() => setModal({ type: 'addTracker' })}
          onAddCombo={() => setModal({ type: 'addCombo' })}
          onOpenSettings={() => setModal({ type: 'settings' })}
          onAddEntryWithNote={(tid) => setModal({ type: 'quickNote', data: { trackerId: tid } })}
        />
      )}
      {tab === 'history' && (
        <HistoryTab
          trackers={trackers}
          entries={entries}
          isPremium={isPremium}
          onUpdateEntry={updateEntry}
          onDeleteEntry={(id) => persistEntries(entries.filter(e => e.id !== id))}
          onShowPaywall={(f) => setModal({ type: 'paywall', data: { feature: f } })}
        />
      )}
      {tab === 'insights' && (
        <InsightsTab
          trackers={trackers}
          combos={combos}
          entries={entries}
          isPremium={isPremium}
          now={now}
          onUpdateTracker={updateTracker}
          onShowPaywall={(f) => setModal({ type: 'paywall', data: { feature: f } })}
        />
      )}
    </div>

    {/* Bottom tab bar */}
    <TabBar tab={tab} setTab={setTab} />

    {/* Modals */}
    {modal?.type === 'addTracker' && (
      <AddTrackerModal
        onClose={() => setModal(null)}
        onAdd={(t) => { addTracker(t); setModal(null); }}
      />
    )}
    {modal?.type === 'addCombo' && (
      <AddComboModal trackers={trackers} onClose={() => setModal(null)} onAdd={(c) => { addCombo(c); setModal(null); }} />
    )}
    {modal?.type === 'settings' && (
      <SettingsModal
        trackers={trackers}
        combos={combos}
        isPremium={isPremium}
        onClose={() => setModal(null)}
        onDeleteTracker={deleteTracker}
        onDeleteCombo={deleteCombo}
        onTogglePremium={() => persistPremium(!isPremium)}
      />
    )}
    {modal?.type === 'stats' && (
      <StatsModal
        item={modal.data}
        trackers={trackers}
        combos={combos}
        entries={entries}
        now={now}
        isPremium={isPremium}
        onClose={() => setModal(null)}
        onShowPaywall={(f) => setModal({ type: 'paywall', data: { feature: f } })}
      />
    )}
    {modal?.type === 'paywall' && (
      <PaywallModal
        feature={modal.data?.feature}
        onClose={() => setModal(null)}
        onUnlock={() => { persistPremium(true); setModal(null); }}
      />
    )}
    {modal?.type === 'quickNote' && (
      <QuickNoteModal
        trackerId={modal.data.trackerId}
        tracker={trackers.find(t => t.id === modal.data.trackerId)}
        onClose={() => setModal(null)}
        onSave={(note) => { logEntry(modal.data.trackerId, 0, note); setModal(null); }}
        isPremium={isPremium}
        onShowPaywall={(f) => setModal({ type: 'paywall', data: { feature: f } })}
      />
    )}
  </div>
</>
```

);
}

// ============ HOME TAB ============

function HomeTab({ trackers, entries, combos, now, isPremium, onLog, onUndo, onShowStats, onAddTracker, onAddCombo, onOpenSettings, onAddEntryWithNote }) {
return (
<>
<header style={{ padding: ‘28px 20px 20px’, display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘flex-end’ }}>
<div>
<div style={{ fontSize: ‘10px’, letterSpacing: ‘0.25em’, color: ‘#64748b’, textTransform: ‘uppercase’, fontWeight: 600, marginBottom: ‘4px’ }}>
{new Date().toLocaleDateString(‘de-DE’, { weekday: ‘long’, day: ‘numeric’, month: ‘long’ })}
</div>
<h1 style={{
fontFamily: ‘“DM Serif Display”, Georgia, serif’,
fontStyle: ‘italic’,
fontSize: ‘32px’,
fontWeight: 400,
margin: 0,
color: ‘#0f172a’,
letterSpacing: ‘-0.02em’,
}}>Pausa</h1>
</div>
<div style={{ display: ‘flex’, gap: ‘8px’ }}>
{isPremium && (
<div style={{
padding: ‘6px 10px’,
background: ‘linear-gradient(135deg, #fbbf24, #f59e0b)’,
borderRadius: ‘100px’,
fontSize: ‘10px’,
fontWeight: 700,
letterSpacing: ‘0.1em’,
color: ‘white’,
display: ‘flex’, alignItems: ‘center’, gap: ‘4px’,
}}>
<Sparkles size={10} /> PRO
</div>
)}
<button onClick={onOpenSettings} style={iconBtnStyle}>
<Settings size={16} />
</button>
</div>
</header>

```
  {trackers.length === 0 && (
    <EmptyState onAddTracker={onAddTracker} />
  )}

  <div style={{ padding: '0 16px' }}>
    {trackers.map(tracker => (
      <TrackerCard
        key={tracker.id}
        tracker={tracker}
        entries={entries.filter(e => e.trackerId === tracker.id)}
        now={now}
        onLog={(offset) => onLog(tracker.id, offset)}
        onLogWithNote={() => onAddEntryWithNote(tracker.id)}
        onUndo={() => onUndo(tracker.id)}
        onShowStats={() => onShowStats({ type: 'tracker', id: tracker.id })}
      />
    ))}

    {combos.length > 0 && (
      <div style={{ marginTop: '24px' }}>
        <SectionLabel icon={<Link2 size={10} />}>Kombiniert</SectionLabel>
        {combos.map(combo => (
          <ComboCard
            key={combo.id}
            combo={combo}
            trackers={trackers}
            entries={entries}
            now={now}
            onShowStats={() => onShowStats({ type: 'combo', id: combo.id })}
          />
        ))}
      </div>
    )}

    {trackers.length > 0 && (
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', padding: '0 4px' }}>
        <button onClick={onAddTracker} style={dashedBtnStyle}>
          <Plus size={14} /> Tracker
        </button>
        {trackers.length >= 2 && (
          <button onClick={onAddCombo} style={dashedBtnStyle}>
            <Link2 size={14} /> Combo
          </button>
        )}
      </div>
    )}
  </div>
</>
```

);
}

function EmptyState({ onAddTracker }) {
return (
<div style={{ padding: ‘60px 28px’, textAlign: ‘center’ }}>
<div style={{
width: ‘72px’, height: ‘72px’,
borderRadius: ‘50%’,
background: ‘white’,
boxShadow: ‘0 8px 32px rgba(125, 159, 212, 0.2)’,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’,
margin: ‘0 auto 20px’,
}}>
<Sparkles size={26} color="#7d9fd4" strokeWidth={1.5} />
</div>
<h2 style={{
fontFamily: ‘“DM Serif Display”, Georgia, serif’,
fontStyle: ‘italic’,
fontSize: ‘24px’,
fontWeight: 400,
color: ‘#0f172a’,
margin: ‘0 0 8px’,
}}>Willkommen</h2>
<p style={{ color: ‘#64748b’, fontSize: ‘14px’, lineHeight: 1.6, maxWidth: ‘260px’, margin: ‘0 auto 24px’ }}>
Beginne mit deinem ersten Tracker. Beobachte, verstehe, verändere.
</p>
<button onClick={onAddTracker} style={primaryBtnStyle}>Ersten Tracker erstellen</button>
</div>
);
}

// ============ TRACKER CARD WITH TIME SCRUBBER ============

function TrackerCard({ tracker, entries, now, onLog, onLogWithNote, onUndo, onShowStats }) {
const [offset, setOffset] = useState(0); // minutes in the past
const [justLogged, setJustLogged] = useState(false);
const scrubberRef = useRef(null);
const startXRef = useRef(0);
const startOffsetRef = useRef(0);
const [dragging, setDragging] = useState(false);

const sorted = […entries].sort((a, b) => a.timestamp - b.timestamp);
const todays = getTodayEntries(sorted);
const last = sorted[sorted.length - 1];
const timeSinceLast = last ? now - last.timestamp : null;
const avgToday = getAverageGap(todays);

// Compare today’s avg to last 7 days avg for trend
const last7DaysAvg = getAverageGap(sorted.filter(e => e.timestamp > now - 7 * 86400000));

const handleTouchStart = (e) => {
const x = e.touches ? e.touches[0].clientX : e.clientX;
startXRef.current = x;
startOffsetRef.current = offset;
setDragging(true);
};

const handleTouchMove = (e) => {
if (!dragging) return;
const x = e.touches ? e.touches[0].clientX : e.clientX;
const dx = startXRef.current - x; // drag left = more minutes
const minutesDiff = Math.round(dx / 12); // 12px per minute
const newOffset = Math.max(0, Math.min(180, startOffsetRef.current + minutesDiff));
setOffset(newOffset);
if (navigator.vibrate && newOffset !== offset && newOffset % 5 === 0) navigator.vibrate(3);
};

const handleTouchEnd = () => setDragging(false);

useEffect(() => {
if (!dragging) return;
const move = (e) => handleTouchMove(e);
const up = () => handleTouchEnd();
window.addEventListener(‘mousemove’, move);
window.addEventListener(‘mouseup’, up);
window.addEventListener(‘touchmove’, move);
window.addEventListener(‘touchend’, up);
return () => {
window.removeEventListener(‘mousemove’, move);
window.removeEventListener(‘mouseup’, up);
window.removeEventListener(‘touchmove’, move);
window.removeEventListener(‘touchend’, up);
};
}, [dragging]);

const targetTime = new Date(now - offset * 60000);
const timeLabel = `${targetTime.getHours().toString().padStart(2, '0')}:${targetTime.getMinutes().toString().padStart(2, '0')}`;

const handleLog = () => {
onLog(offset);
setJustLogged(true);
setTimeout(() => setJustLogged(false), 1200);
setTimeout(() => setOffset(0), 300);
};

const Icon = getIcon(tracker.icon);
const goalMet = tracker.goalMinutes && avgToday && avgToday / 60000 >= tracker.goalMinutes;

return (
<div style={{
background: ‘white’,
borderRadius: ‘24px’,
padding: ‘18px’,
marginBottom: ‘12px’,
boxShadow: ‘0 2px 16px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.03)’,
position: ‘relative’,
overflow: ‘hidden’,
}}>
{/* Top row: icon, name, stats button */}
<div style={{ display: ‘flex’, alignItems: ‘center’, justifyContent: ‘space-between’, marginBottom: ‘14px’ }}>
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: ‘10px’ }}>
<div style={{
width: ‘36px’, height: ‘36px’,
borderRadius: ‘11px’,
background: `${tracker.color}15`,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’,
color: tracker.color,
}}>
<Icon size={16} strokeWidth={2} />
</div>
<div>
<div style={{ fontSize: ‘15px’, fontWeight: 600, color: ‘#0f172a’, letterSpacing: ‘-0.01em’ }}>{tracker.name}</div>
<div style={{ fontSize: ‘11px’, color: ‘#94a3b8’, marginTop: ‘1px’, display: ‘flex’, alignItems: ‘center’, gap: ‘6px’ }}>
<span>Heute · {todays.length}×</span>
{goalMet && <Flame size={10} color="#f59e0b" fill="#f59e0b" />}
</div>
</div>
</div>
<button onClick={onShowStats} style={{ …iconBtnStyle, width: ‘32px’, height: ‘32px’ }}>
<BarChart3 size={13} />
</button>
</div>

```
  {/* Time since last - hero */}
  <div style={{ textAlign: 'center', padding: '8px 0 14px' }}>
    <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 500 }}>
      {last ? 'Seit dem Letzten' : 'Noch kein Eintrag'}
    </div>
    <div style={{
      fontFamily: '"DM Serif Display", Georgia, serif',
      fontSize: last ? '36px' : '24px',
      fontWeight: 400,
      fontStyle: 'italic',
      color: last ? '#0f172a' : '#cbd5e1',
      letterSpacing: '-0.03em',
      lineHeight: 1,
    }}>
      {last ? formatDuration(timeSinceLast) : '—'}
    </div>
    {avgToday && (
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
        Ø Pause heute: <span style={{ color: tracker.color, fontWeight: 600 }}>{formatMinutes(avgToday)}</span>
      </div>
    )}
  </div>

  {/* Time Scrubber */}
  <TimeScrubber
    offset={offset}
    setOffset={setOffset}
    onStart={handleTouchStart}
    timeLabel={timeLabel}
    color={tracker.color}
    dragging={dragging}
  />

  {/* Action buttons */}
  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
    <button
      onClick={handleLog}
      onDoubleClick={(e) => { e.preventDefault(); onLogWithNote(); }}
      style={{
        flex: 1,
        background: justLogged ? tracker.color : `${tracker.color}`,
        border: 'none',
        color: 'white',
        padding: '14px',
        borderRadius: '14px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        letterSpacing: '0.02em',
        animation: justLogged ? 'success-pop 0.4s ease' : 'none',
        boxShadow: `0 4px 14px ${tracker.color}40`,
      }}
    >
      {justLogged ? (
        <><Check size={16} strokeWidth={2.5} /> {offset > 0 ? `Vor ${offset}min` : 'Eingetragen'}</>
      ) : (
        <><Plus size={16} strokeWidth={2.5} /> +1 {offset > 0 && `vor ${offset}min`}</>
      )}
    </button>
    <button onClick={onLogWithNote} style={{
      background: '#f1f5f9',
      border: 'none',
      color: '#475569',
      padding: '0 14px',
      borderRadius: '14px',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <StickyNote size={15} />
    </button>
    {todays.length > 0 && (
      <button onClick={onUndo} style={{
        background: '#f1f5f9',
        border: 'none',
        color: '#475569',
        padding: '0 14px',
        borderRadius: '14px',
        cursor: 'pointer',
        fontSize: '15px',
      }}>↶</button>
    )}
  </div>
</div>
```

);
}

// ============ TIME SCRUBBER ============

function TimeScrubber({ offset, setOffset, onStart, timeLabel, color, dragging }) {
// tick marks every 5 min, labels every 15 min
const ticks = [];
for (let i = 0; i <= 60; i++) ticks.push(i);

const quickOptions = [0, 5, 15, 30, 60];

return (
<div
onMouseDown={onStart}
onTouchStart={onStart}
style={{
background: ‘linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)’,
borderRadius: ‘14px’,
padding: ‘10px 12px’,
cursor: dragging ? ‘grabbing’ : ‘grab’,
userSelect: ‘none’,
position: ‘relative’,
overflow: ‘hidden’,
}}
>
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘center’, marginBottom: ‘8px’ }}>
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: ‘6px’ }}>
<Clock size={11} color="#64748b" />
<span style={{ fontSize: ‘11px’, color: ‘#64748b’, fontWeight: 500 }}>
{offset === 0 ? ‘Jetzt’ : `Vor ${offset} min`}
</span>
</div>
<span style={{ fontSize: ‘13px’, fontWeight: 600, color: offset > 0 ? color : ‘#0f172a’, fontVariantNumeric: ‘tabular-nums’ }}>
{timeLabel}
</span>
</div>

```
  {/* Quick chips */}
  <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }} className="no-scrollbar">
    {quickOptions.map(m => (
      <button
        key={m}
        onClick={(e) => { e.stopPropagation(); setOffset(m); if (navigator.vibrate) navigator.vibrate(8); }}
        style={{
          flex: '0 0 auto',
          padding: '5px 10px',
          background: offset === m ? color : 'white',
          color: offset === m ? 'white' : '#64748b',
          border: `1px solid ${offset === m ? color : '#e2e8f0'}`,
          borderRadius: '100px',
          fontSize: '11px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {m === 0 ? 'Jetzt' : `-${m}m`}
      </button>
    ))}
  </div>

  <div style={{
    fontSize: '9px',
    color: '#94a3b8',
    marginTop: '6px',
    textAlign: 'center',
    opacity: offset === 0 ? 0.6 : 1,
  }}>
    ← zum Zurücktragen wischen →
  </div>
</div>
```

);
}

// ============ COMBO CARD ============

function ComboCard({ combo, trackers, entries, now, onShowStats }) {
const comboTrackers = trackers.filter(t => combo.trackerIds.includes(t.id));
const comboEntries = entries.filter(e => combo.trackerIds.includes(e.trackerId)).sort((a, b) => a.timestamp - b.timestamp);
const todays = getTodayEntries(comboEntries);
const last = comboEntries[comboEntries.length - 1];
const timeSinceLast = last ? now - last.timestamp : null;
const avgToday = getAverageGap(todays);

return (
<div style={{
background: ‘white’,
borderRadius: ‘18px’,
padding: ‘14px 16px’,
marginBottom: ‘8px’,
boxShadow: ‘0 1px 3px rgba(15, 23, 42, 0.03)’,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘space-between’,
}}>
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: ‘10px’, flex: 1, minWidth: 0 }}>
<div style={{ display: ‘flex’ }}>
{comboTrackers.slice(0, 3).map((t, i) => {
const Icon = getIcon(t.icon);
return (
<div key={t.id} style={{
width: ‘28px’, height: ‘28px’,
borderRadius: ‘8px’,
background: `${t.color}15`,
border: `2px solid white`,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’,
color: t.color,
marginLeft: i > 0 ? ‘-8px’ : 0,
zIndex: 3 - i,
}}>
<Icon size={12} strokeWidth={2} />
</div>
);
})}
</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontSize: ‘13px’, fontWeight: 600, color: ‘#0f172a’, whiteSpace: ‘nowrap’, overflow: ‘hidden’, textOverflow: ‘ellipsis’ }}>{combo.name}</div>
<div style={{ fontSize: ‘10px’, color: ‘#94a3b8’, marginTop: ‘1px’ }}>
{todays.length}× heute · {last ? `vor ${formatDuration(timeSinceLast)}` : ‘keine’}
</div>
</div>
</div>
<div style={{ textAlign: ‘right’, marginRight: ‘6px’ }}>
<div style={{ fontSize: ‘9px’, color: ‘#94a3b8’, letterSpacing: ‘0.1em’, textTransform: ‘uppercase’ }}>Ø</div>
<div style={{ fontSize: ‘12px’, color: combo.color, fontWeight: 600 }}>{avgToday ? formatMinutes(avgToday) : ‘—’}</div>
</div>
<button onClick={onShowStats} style={{ …iconBtnStyle, width: ‘28px’, height: ‘28px’ }}>
<BarChart3 size={12} />
</button>
</div>
);
}

// ============ HISTORY TAB ============

function HistoryTab({ trackers, entries, isPremium, onUpdateEntry, onDeleteEntry, onShowPaywall }) {
const [filter, setFilter] = useState(‘all’);
const [editingId, setEditingId] = useState(null);

const cutoff = isPremium ? 0 : now() - FREE_TIER_LIMITS.historyDays * 86400000;
function now() { return Date.now(); }

const filtered = entries
.filter(e => filter === ‘all’ || e.trackerId === filter)
.filter(e => e.timestamp >= cutoff)
.sort((a, b) => b.timestamp - a.timestamp);

// group by day
const grouped = {};
filtered.forEach(e => {
const d = new Date(e.timestamp);
d.setHours(0, 0, 0, 0);
const key = d.toDateString();
if (!grouped[key]) grouped[key] = { date: d, entries: [] };
grouped[key].entries.push(e);
});

const totalEntries = entries.length;
const locked = !isPremium && totalEntries > 0 && entries.some(e => e.timestamp < cutoff);

return (
<>
<header style={{ padding: ‘28px 20px 16px’ }}>
<div style={{ fontSize: ‘10px’, letterSpacing: ‘0.25em’, color: ‘#64748b’, textTransform: ‘uppercase’, fontWeight: 600, marginBottom: ‘4px’ }}>Verlauf</div>
<h1 style={{ fontFamily: ‘“DM Serif Display”, Georgia, serif’, fontStyle: ‘italic’, fontSize: ‘32px’, fontWeight: 400, margin: 0, color: ‘#0f172a’, letterSpacing: ‘-0.02em’ }}>
Alle Einträge
</h1>
</header>

```
  {/* Filter chips */}
  <div style={{ padding: '0 16px 16px', overflowX: 'auto' }} className="no-scrollbar">
    <div style={{ display: 'flex', gap: '6px' }}>
      <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Alle</FilterChip>
      {trackers.map(t => (
        <FilterChip key={t.id} active={filter === t.id} color={t.color} onClick={() => setFilter(t.id)}>
          {t.name}
        </FilterChip>
      ))}
    </div>
  </div>

  <div style={{ padding: '0 16px' }}>
    {Object.keys(grouped).length === 0 && (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
        Noch keine Einträge
      </div>
    )}

    {Object.entries(grouped).map(([key, { date, entries: dayEntries }]) => (
      <div key={key} style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, padding: '0 4px 8px' }}>
          {isToday(date.getTime()) ? 'Heute' : date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)' }}>
          {dayEntries.map((entry, i) => {
            const tracker = trackers.find(t => t.id === entry.trackerId);
            if (!tracker) return null;
            const Icon = getIcon(tracker.icon);
            return (
              <EntryRow
                key={entry.id}
                entry={entry}
                tracker={tracker}
                Icon={Icon}
                isLast={i === dayEntries.length - 1}
                editing={editingId === entry.id}
                onEdit={() => setEditingId(entry.id)}
                onSave={(updates) => { onUpdateEntry(entry.id, updates); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
                onDelete={() => { onDeleteEntry(entry.id); setEditingId(null); }}
                isPremium={isPremium}
                onShowPaywall={() => onShowPaywall('notes')}
              />
            );
          })}
        </div>
      </div>
    ))}

    {locked && (
      <div
        onClick={() => onShowPaywall('unlimited_history')}
        style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '16px',
          padding: '16px',
          marginTop: '10px',
          textAlign: 'center',
          cursor: 'pointer',
        }}>
        <Lock size={18} color="#b45309" style={{ marginBottom: '6px' }} />
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#78350f' }}>Vollen Verlauf freischalten</div>
        <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
          Free: letzte {FREE_TIER_LIMITS.historyDays} Tage · Pro: alle Einträge
        </div>
      </div>
    )}
  </div>
</>
```

);
}

function EntryRow({ entry, tracker, Icon, isLast, editing, onEdit, onSave, onCancel, onDelete, isPremium, onShowPaywall }) {
const [note, setNote] = useState(entry.note || ‘’);
const [time, setTime] = useState(formatTimeOfDay(entry.timestamp));

const handleSave = () => {
const [h, m] = time.split(’:’).map(Number);
const d = new Date(entry.timestamp);
d.setHours(h, m);
onSave({ timestamp: d.getTime(), note: note.trim() || undefined });
};

if (editing) {
return (
<div style={{ padding: ‘14px’, background: ‘#f8fafc’, borderBottom: isLast ? ‘none’ : ‘1px solid #f1f5f9’ }}>
<div style={{ display: ‘flex’, gap: ‘8px’, marginBottom: ‘10px’, alignItems: ‘center’ }}>
<input
type=“time”
value={time}
onChange={(e) => setTime(e.target.value)}
style={{
background: ‘white’,
border: ‘1px solid #e2e8f0’,
borderRadius: ‘10px’,
padding: ‘8px 12px’,
fontSize: ‘14px’,
fontFamily: ‘inherit’,
color: ‘#0f172a’,
}}
/>
<button onClick={onDelete} style={{
background: ‘#fee2e2’, border: ‘none’, color: ‘#dc2626’, padding: ‘8px 10px’, borderRadius: ‘10px’, cursor: ‘pointer’,
}}>
<Trash2 size={14} />
</button>
</div>
{isPremium ? (
<textarea
value={note}
onChange={(e) => setNote(e.target.value)}
placeholder=“Notiz hinzufügen… (z.B. Trigger, Ort, Stimmung)”
style={{
width: ‘100%’,
background: ‘white’,
border: ‘1px solid #e2e8f0’,
borderRadius: ‘10px’,
padding: ‘10px 12px’,
fontSize: ‘13px’,
fontFamily: ‘inherit’,
resize: ‘none’,
outline: ‘none’,
color: ‘#0f172a’,
}}
rows={2}
/>
) : (
<button onClick={onShowPaywall} style={{
width: ‘100%’, padding: ‘10px’, background: ‘#fef3c7’, border: ‘1px dashed #f59e0b’, borderRadius: ‘10px’,
color: ‘#b45309’, fontSize: ‘12px’, cursor: ‘pointer’, display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’, gap: ‘6px’,
}}>
<Lock size={12} /> Notizen mit Pro freischalten
</button>
)}
<div style={{ display: ‘flex’, gap: ‘6px’, marginTop: ‘10px’ }}>
<button onClick={onCancel} style={{ flex: 1, padding: ‘10px’, background: ‘white’, border: ‘1px solid #e2e8f0’, borderRadius: ‘10px’, cursor: ‘pointer’, color: ‘#64748b’, fontSize: ‘13px’ }}>Abbrechen</button>
<button onClick={handleSave} style={{ flex: 1, padding: ‘10px’, background: ‘#0f172a’, border: ‘none’, borderRadius: ‘10px’, cursor: ‘pointer’, color: ‘white’, fontSize: ‘13px’, fontWeight: 600 }}>Speichern</button>
</div>
</div>
);
}

return (
<div onClick={onEdit} style={{
padding: ‘12px 14px’,
display: ‘flex’, alignItems: ‘center’, gap: ‘12px’,
borderBottom: isLast ? ‘none’ : ‘1px solid #f1f5f9’,
cursor: ‘pointer’,
}}>
<div style={{
width: ‘32px’, height: ‘32px’,
borderRadius: ‘10px’,
background: `${tracker.color}15`,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’,
color: tracker.color,
flexShrink: 0,
}}>
<Icon size={14} strokeWidth={2} />
</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontSize: ‘13px’, fontWeight: 600, color: ‘#0f172a’ }}>{tracker.name}</div>
{entry.note && (
<div style={{ fontSize: ‘11px’, color: ‘#64748b’, marginTop: ‘2px’, whiteSpace: ‘nowrap’, overflow: ‘hidden’, textOverflow: ‘ellipsis’, fontStyle: ‘italic’ }}>
„{entry.note}”
</div>
)}
</div>
<div style={{ fontSize: ‘13px’, color: ‘#64748b’, fontVariantNumeric: ‘tabular-nums’ }}>{formatTimeOfDay(entry.timestamp)}</div>
</div>
);
}

function FilterChip({ active, color = ‘#0f172a’, onClick, children }) {
return (
<button onClick={onClick} style={{
flex: ‘0 0 auto’,
padding: ‘6px 12px’,
background: active ? color : ‘white’,
color: active ? ‘white’ : ‘#64748b’,
border: `1px solid ${active ? color : '#e2e8f0'}`,
borderRadius: ‘100px’,
fontSize: ‘12px’,
fontWeight: 500,
cursor: ‘pointer’,
whiteSpace: ‘nowrap’,
}}>
{children}
</button>
);
}

// ============ INSIGHTS TAB ============

function InsightsTab({ trackers, combos, entries, isPremium, now, onUpdateTracker, onShowPaywall }) {
const [selectedId, setSelectedId] = useState(trackers[0]?.id);

if (trackers.length === 0) {
return (
<>
<header style={{ padding: ‘28px 20px 16px’ }}>
<div style={{ fontSize: ‘10px’, letterSpacing: ‘0.25em’, color: ‘#64748b’, textTransform: ‘uppercase’, fontWeight: 600, marginBottom: ‘4px’ }}>Einsichten</div>
<h1 style={{ fontFamily: ‘“DM Serif Display”, Georgia, serif’, fontStyle: ‘italic’, fontSize: ‘32px’, fontWeight: 400, margin: 0, color: ‘#0f172a’, letterSpacing: ‘-0.02em’ }}>
Muster erkennen
</h1>
</header>
<div style={{ padding: ‘40px 20px’, textAlign: ‘center’, color: ‘#94a3b8’, fontSize: ‘14px’ }}>
Lege zuerst einen Tracker an, um hier Muster zu sehen.
</div>
</>
);
}

const tracker = trackers.find(t => t.id === selectedId) || trackers[0];
const trackerEntries = entries.filter(e => e.trackerId === tracker.id);

return (
<>
<header style={{ padding: ‘28px 20px 16px’ }}>
<div style={{ fontSize: ‘10px’, letterSpacing: ‘0.25em’, color: ‘#64748b’, textTransform: ‘uppercase’, fontWeight: 600, marginBottom: ‘4px’ }}>Einsichten</div>
<h1 style={{ fontFamily: ‘“DM Serif Display”, Georgia, serif’, fontStyle: ‘italic’, fontSize: ‘32px’, fontWeight: 400, margin: 0, color: ‘#0f172a’, letterSpacing: ‘-0.02em’ }}>
Muster erkennen
</h1>
</header>

```
  {/* Tracker selector */}
  <div style={{ padding: '0 16px 16px', overflowX: 'auto' }} className="no-scrollbar">
    <div style={{ display: 'flex', gap: '6px' }}>
      {trackers.map(t => (
        <FilterChip key={t.id} active={selectedId === t.id} color={t.color} onClick={() => setSelectedId(t.id)}>
          {t.name}
        </FilterChip>
      ))}
    </div>
  </div>

  <div style={{ padding: '0 16px' }}>
    {/* Goal & Streak section */}
    <GoalStreakSection tracker={tracker} entries={trackerEntries} onUpdateTracker={onUpdateTracker} />

    {/* 7-day chart - FREE */}
    <InsightCard title="Letzte 7 Tage" icon={<Calendar size={12} />}>
      <SevenDayChart entries={trackerEntries} color={tracker.color} />
    </InsightCard>

    {/* Hour Heatmap - PREMIUM */}
    <InsightCard title="Uhrzeit-Muster" icon={<Clock size={12} />} locked={!isPremium} onUnlock={() => onShowPaywall('heatmap')}>
      {isPremium ? (
        <HourHeatmap entries={trackerEntries} color={tracker.color} />
      ) : (
        <LockedPreview description="Erkenne zu welcher Tageszeit du am meisten triggerst. 24-Stunden-Heatmap der letzten 30 Tage." />
      )}
    </InsightCard>

    {/* Trigger times - PREMIUM */}
    <InsightCard title="Kritische Zeitfenster" icon={<Zap size={12} />} locked={!isPremium} onUnlock={() => onShowPaywall('hotspots')}>
      {isPremium ? (
        <HotspotsView entries={trackerEntries} color={tracker.color} />
      ) : (
        <LockedPreview description="Deine Top-3 Risikostunden und Wochentage — damit du dich darauf vorbereiten kannst." />
      )}
    </InsightCard>

    {/* Progress trend - PREMIUM */}
    <InsightCard title="Fortschritt im Trend" icon={<TrendingUp size={12} />} locked={!isPremium} onUnlock={() => onShowPaywall('trend')}>
      {isPremium ? (
        <ProgressTrend entries={trackerEntries} color={tracker.color} />
      ) : (
        <LockedPreview description="Sieh, wie sich deine Pausen über Wochen verändern. Wird es wirklich besser?" />
      )}
    </InsightCard>
  </div>
</>
```

);
}

function InsightCard({ title, icon, children, locked, onUnlock }) {
return (
<div style={{
background: ‘white’,
borderRadius: ‘20px’,
padding: ‘16px’,
marginBottom: ‘12px’,
boxShadow: ‘0 1px 3px rgba(15, 23, 42, 0.03)’,
position: ‘relative’,
}}>
<div style={{ display: ‘flex’, alignItems: ‘center’, justifyContent: ‘space-between’, marginBottom: ‘14px’ }}>
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: ‘6px’, color: ‘#64748b’, fontSize: ‘11px’, letterSpacing: ‘0.15em’, textTransform: ‘uppercase’, fontWeight: 600 }}>
{icon} {title}
</div>
{locked && (
<button onClick={onUnlock} style={{
display: ‘flex’, alignItems: ‘center’, gap: ‘4px’,
background: ‘linear-gradient(135deg, #fbbf24, #f59e0b)’,
color: ‘white’, border: ‘none’, padding: ‘4px 10px’, borderRadius: ‘100px’,
fontSize: ‘10px’, fontWeight: 700, letterSpacing: ‘0.05em’, cursor: ‘pointer’,
}}>
<Sparkles size={10} /> PRO
</button>
)}
</div>
{children}
</div>
);
}

function LockedPreview({ description }) {
return (
<div style={{
padding: ‘30px 16px’,
textAlign: ‘center’,
background: ‘linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)’,
borderRadius: ‘14px’,
}}>
<Lock size={20} color=”#b45309” style={{ marginBottom: ‘8px’ }} />
<div style={{ fontSize: ‘12px’, color: ‘#78350f’, lineHeight: 1.5, maxWidth: ‘260px’, margin: ‘0 auto’ }}>
{description}
</div>
</div>
);
}

function GoalStreakSection({ tracker, entries, onUpdateTracker }) {
const [editing, setEditing] = useState(false);
const [goalInput, setGoalInput] = useState(tracker.goalMinutes || 60);
const streak = getStreak(entries, tracker.goalMinutes);

const todays = getTodayEntries(entries);
const avgToday = getAverageGap(todays);
const goalProgress = tracker.goalMinutes && avgToday ? Math.min(100, (avgToday / 60000 / tracker.goalMinutes) * 100) : 0;

return (
<div style={{
background: `linear-gradient(135deg, ${tracker.color}10 0%, ${tracker.color}05 100%)`,
borderRadius: ‘20px’,
padding: ‘16px’,
marginBottom: ‘12px’,
border: `1px solid ${tracker.color}20`,
}}>
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘center’, marginBottom: ‘12px’ }}>
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: ‘6px’, color: tracker.color, fontSize: ‘11px’, letterSpacing: ‘0.15em’, textTransform: ‘uppercase’, fontWeight: 700 }}>
<Target size={12} /> Dein Ziel
</div>
<button onClick={() => setEditing(!editing)} style={{
background: ‘transparent’, border: ‘none’, color: tracker.color, cursor: ‘pointer’, fontSize: ‘11px’, fontWeight: 600,
}}>
{editing ? ‘Abbrechen’ : tracker.goalMinutes ? ‘Ändern’ : ‘Setzen’}
</button>
</div>

```
  {editing ? (
    <div>
      <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>Durchschnittliche Pause pro Tag mindestens:</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {[30, 60, 90, 120, 180].map(m => (
          <button key={m} onClick={() => setGoalInput(m)} style={{
            padding: '8px 12px',
            background: goalInput === m ? tracker.color : 'white',
            color: goalInput === m ? 'white' : '#475569',
            border: `1px solid ${goalInput === m ? tracker.color : '#e2e8f0'}`,
            borderRadius: '100px',
            fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          }}>{m < 60 ? `${m}min` : `${m / 60}h`}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {tracker.goalMinutes && (
          <button onClick={() => { onUpdateTracker(tracker.id, { goalMinutes: null }); setEditing(false); }} style={{
            flex: 1, padding: '10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#dc2626', fontSize: '12px',
          }}>Entfernen</button>
        )}
        <button onClick={() => { onUpdateTracker(tracker.id, { goalMinutes: goalInput }); setEditing(false); }} style={{
          flex: 2, padding: '10px', background: tracker.color, border: 'none', borderRadius: '10px', cursor: 'pointer', color: 'white', fontSize: '12px', fontWeight: 600,
        }}>Speichern</button>
      </div>
    </div>
  ) : tracker.goalMinutes ? (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontStyle: 'italic', fontSize: '28px', color: '#0f172a', letterSpacing: '-0.02em' }}>
          Ø {formatMinutes(tracker.goalMinutes * 60000)}
        </div>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '6px 10px', borderRadius: '100px', border: '1px solid #fef3c7' }}>
            <Flame size={14} color="#f59e0b" fill="#f59e0b" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#b45309' }}>{streak}</span>
            <span style={{ fontSize: '11px', color: '#92400e' }}>{streak === 1 ? 'Tag' : 'Tage'}</span>
          </div>
        )}
      </div>
      {/* Progress bar */}
      <div style={{ height: '6px', background: 'white', borderRadius: '100px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${goalProgress}%`,
          background: tracker.color,
          borderRadius: '100px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
        Heute: {avgToday ? formatMinutes(avgToday) : 'noch keine Pause'} ({Math.round(goalProgress)}%)
      </div>
    </>
  ) : (
    <div style={{ fontSize: '13px', color: '#64748b', padding: '6px 0' }}>
      Setze ein Ziel für deine durchschnittliche Pause und baue einen Streak auf.
    </div>
  )}
</div>
```

);
}

function SevenDayChart({ entries, color }) {
const days = [];
for (let i = 6; i >= 0; i–) {
const d = new Date();
d.setDate(d.getDate() - i);
d.setHours(0, 0, 0, 0);
const dayEntries = entries.filter(e => {
const ed = new Date(e.timestamp);
return ed.toDateString() === d.toDateString();
});
days.push({
date: d,
count: dayEntries.length,
avg: getAverageGap(dayEntries),
label: d.toLocaleDateString(‘de-DE’, { weekday: ‘short’ })[0],
});
}
const maxCount = Math.max(…days.map(d => d.count), 1);

return (
<div style={{ display: ‘flex’, alignItems: ‘flex-end’, justifyContent: ‘space-between’, height: ‘120px’, gap: ‘6px’ }}>
{days.map((d, i) => {
const h = d.count > 0 ? (d.count / maxCount) * 100 : 0;
const isToday = i === days.length - 1;
return (
<div key={i} style={{ flex: 1, display: ‘flex’, flexDirection: ‘column’, alignItems: ‘center’, gap: ‘6px’, height: ‘100%’ }}>
<div style={{ flex: 1, display: ‘flex’, alignItems: ‘flex-end’, width: ‘100%’, justifyContent: ‘center’, position: ‘relative’ }}>
{d.count > 0 && (
<div style={{ position: ‘absolute’, top: `${Math.max(0, 100 - h - 16)}%`, fontSize: ‘10px’, color: ‘#64748b’, fontWeight: 600 }}>
{d.count}
</div>
)}
<div style={{
width: ‘100%’,
height: `${h}%`,
minHeight: d.count > 0 ? ‘4px’ : ‘0’,
background: isToday ? color : `${color}50`,
borderRadius: ‘8px 8px 3px 3px’,
}} />
</div>
<div style={{ fontSize: ‘10px’, color: ‘#94a3b8’, fontWeight: 500 }}>{d.label}</div>
</div>
);
})}
</div>
);
}

function HourHeatmap({ entries, color }) {
const cutoff = Date.now() - 30 * 86400000;
const recent = entries.filter(e => e.timestamp >= cutoff);
const buckets = Array(24).fill(0);
recent.forEach(e => buckets[new Date(e.timestamp).getHours()]++);
const max = Math.max(…buckets, 1);

return (
<div>
<div style={{ display: ‘grid’, gridTemplateColumns: ‘repeat(24, 1fr)’, gap: ‘2px’, marginBottom: ‘8px’ }}>
{buckets.map((count, h) => {
const intensity = count / max;
return (
<div key={h} style={{
aspectRatio: ‘1’,
background: count === 0 ? ‘#f1f5f9’ : `${color}${Math.max(20, Math.round(intensity * 255)).toString(16).padStart(2, '0')}`,
borderRadius: ‘3px’,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’,
fontSize: ‘8px’,
color: intensity > 0.5 ? ‘white’ : ‘#64748b’,
fontWeight: 600,
}}>
{count > 0 ? count : ‘’}
</div>
);
})}
</div>
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, fontSize: ‘9px’, color: ‘#94a3b8’, padding: ‘0 2px’ }}>
<span>0</span><span>6</span><span>12</span><span>18</span><span>23</span>
</div>
<div style={{ fontSize: ‘11px’, color: ‘#64748b’, marginTop: ‘10px’, textAlign: ‘center’ }}>
{recent.length > 0 ? `${recent.length} Einträge · letzte 30 Tage` : ‘Noch keine Daten’}
</div>
</div>
);
}

function HotspotsView({ entries, color }) {
const cutoff = Date.now() - 30 * 86400000;
const recent = entries.filter(e => e.timestamp >= cutoff);

const hourCounts = Array(24).fill(0);
const dayCounts = Array(7).fill(0);
recent.forEach(e => {
const d = new Date(e.timestamp);
hourCounts[d.getHours()]++;
dayCounts[d.getDay()]++;
});

const topHours = hourCounts
.map((c, h) => ({ hour: h, count: c }))
.sort((a, b) => b.count - a.count)
.slice(0, 3)
.filter(x => x.count > 0);

const dayNames = [‘So’, ‘Mo’, ‘Di’, ‘Mi’, ‘Do’, ‘Fr’, ‘Sa’];
const topDay = dayCounts.reduce((best, c, i) => c > best.count ? { day: i, count: c } : best, { day: 0, count: 0 });

return (
<div>
<div style={{ fontSize: ‘11px’, color: ‘#64748b’, marginBottom: ‘10px’, fontWeight: 600 }}>KRITISCHSTE UHRZEITEN</div>
<div style={{ display: ‘flex’, gap: ‘8px’, marginBottom: ‘16px’ }}>
{topHours.map((h, i) => (
<div key={i} style={{
flex: 1,
background: `${color}15`,
borderRadius: ‘12px’,
padding: ‘12px’,
textAlign: ‘center’,
}}>
<div style={{ fontFamily: ‘“DM Serif Display”, Georgia, serif’, fontStyle: ‘italic’, fontSize: ‘20px’, color }}>
{h.hour.toString().padStart(2, ‘0’)}<span style={{ fontSize: ‘14px’ }}>:00</span>
</div>
<div style={{ fontSize: ‘10px’, color: ‘#64748b’, marginTop: ‘2px’ }}>{h.count} Einträge</div>
</div>
))}
</div>
{topDay.count > 0 && (
<>
<div style={{ fontSize: ‘11px’, color: ‘#64748b’, marginBottom: ‘8px’, fontWeight: 600 }}>SCHWÄCHSTER WOCHENTAG</div>
<div style={{
background: `${color}10`, padding: ‘12px’, borderRadius: ‘12px’,
display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘center’,
}}>
<span style={{ fontSize: ‘14px’, fontWeight: 600, color: ‘#0f172a’ }}>
{[‘Sonntag’, ‘Montag’, ‘Dienstag’, ‘Mittwoch’, ‘Donnerstag’, ‘Freitag’, ‘Samstag’][topDay.day]}
</span>
<span style={{ fontSize: ‘12px’, color: ‘#64748b’ }}>{topDay.count} Einträge</span>
</div>
</>
)}
</div>
);
}

function ProgressTrend({ entries, color }) {
// group by week, compute weekly avg gap
const now = Date.now();
const weeks = [];
for (let i = 3; i >= 0; i–) {
const end = now - i * 7 * 86400000;
const start = end - 7 * 86400000;
const weekEntries = entries.filter(e => e.timestamp >= start && e.timestamp < end);
weeks.push({
label: i === 0 ? ‘Diese’ : `-${i}W`,
avg: getAverageGap(weekEntries),
count: weekEntries.length,
});
}
const maxAvg = Math.max(…weeks.map(w => w.avg || 0), 1);

return (
<div>
<div style={{ display: ‘flex’, alignItems: ‘flex-end’, gap: ‘8px’, height: ‘100px’, marginBottom: ‘10px’ }}>
{weeks.map((w, i) => {
const h = w.avg ? (w.avg / maxAvg) * 100 : 0;
return (
<div key={i} style={{ flex: 1, display: ‘flex’, flexDirection: ‘column’, alignItems: ‘center’, height: ‘100%’, gap: ‘4px’ }}>
<div style={{ flex: 1, display: ‘flex’, alignItems: ‘flex-end’, width: ‘100%’ }}>
<div style={{
width: ‘100%’,
height: `${h}%`,
minHeight: w.avg ? ‘4px’ : ‘0’,
background: i === weeks.length - 1 ? color : `${color}60`,
borderRadius: ‘8px 8px 3px 3px’,
}} />
</div>
<div style={{ fontSize: ‘10px’, color: ‘#64748b’ }}>{w.label}</div>
<div style={{ fontSize: ‘10px’, color: ‘#0f172a’, fontWeight: 600 }}>{w.avg ? formatMinutes(w.avg) : ‘—’}</div>
</div>
);
})}
</div>
<div style={{ fontSize: ‘11px’, color: ‘#64748b’, textAlign: ‘center’, marginTop: ‘4px’ }}>
Längere Balken = längere Pausen = besser
</div>
</div>
);
}

// ============ TAB BAR ============

function TabBar({ tab, setTab }) {
const tabs = [
{ id: ‘home’, label: ‘Heute’, Icon: Home },
{ id: ‘history’, label: ‘Verlauf’, Icon: Calendar },
{ id: ‘insights’, label: ‘Einsichten’, Icon: Activity },
];

return (
<div style={{
position: ‘fixed’,
bottom: 0, left: 0, right: 0,
background: ‘rgba(255, 255, 255, 0.85)’,
backdropFilter: ‘blur(20px)’,
borderTop: ‘1px solid rgba(226, 232, 240, 0.5)’,
padding: ‘10px 16px calc(env(safe-area-inset-bottom, 10px) + 10px)’,
display: ‘flex’,
justifyContent: ‘center’,
gap: ‘6px’,
zIndex: 50,
}}>
<div style={{ display: ‘flex’, gap: ‘2px’, maxWidth: ‘400px’, width: ‘100%’ }}>
{tabs.map(({ id, label, Icon }) => (
<button
key={id}
onClick={() => setTab(id)}
style={{
flex: 1,
background: tab === id ? ‘#0f172a’ : ‘transparent’,
color: tab === id ? ‘white’ : ‘#64748b’,
border: ‘none’,
padding: ‘10px’,
borderRadius: ‘14px’,
display: ‘flex’, flexDirection: ‘column’, alignItems: ‘center’, gap: ‘3px’,
cursor: ‘pointer’,
fontSize: ‘10px’,
fontWeight: 600,
letterSpacing: ‘0.02em’,
}}
>
<Icon size={18} strokeWidth={tab === id ? 2.2 : 1.8} />
{label}
</button>
))}
</div>
</div>
);
}

// ============ MODALS ============

function ModalShell({ onClose, title, subtitle, children }) {
return (
<div onClick={onClose} style={{
position: ‘fixed’, inset: 0,
background: ‘rgba(15, 23, 42, 0.4)’,
backdropFilter: ‘blur(8px)’,
zIndex: 100,
display: ‘flex’,
alignItems: ‘flex-end’,
justifyContent: ‘center’,
animation: ‘fade-in 0.2s ease-out’,
}}>
<div onClick={(e) => e.stopPropagation()} style={{
width: ‘100%’,
maxWidth: ‘500px’,
maxHeight: ‘92vh’,
overflowY: ‘auto’,
background: ‘white’,
borderRadius: ‘28px 28px 0 0’,
padding: ‘10px 20px calc(env(safe-area-inset-bottom, 24px) + 24px)’,
animation: ‘slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)’,
}}>
<div style={{ width: ‘36px’, height: ‘4px’, background: ‘#e2e8f0’, borderRadius: ‘2px’, margin: ‘8px auto 16px’ }} />
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘flex-start’, marginBottom: ‘20px’ }}>
<div>
<h2 style={{ fontFamily: ‘“DM Serif Display”, Georgia, serif’, fontStyle: ‘italic’, fontWeight: 400, fontSize: ‘24px’, margin: 0, color: ‘#0f172a’, letterSpacing: ‘-0.02em’ }}>{title}</h2>
{subtitle && <div style={{ fontSize: ‘12px’, color: ‘#64748b’, marginTop: ‘4px’ }}>{subtitle}</div>}
</div>
<button onClick={onClose} style={{ …iconBtnStyle, width: ‘32px’, height: ‘32px’ }}>
<X size={14} />
</button>
</div>
{children}
</div>
</div>
);
}

function AddTrackerModal({ onClose, onAdd }) {
const [name, setName] = useState(’’);
const [icon, setIcon] = useState(‘cigarette’);
const [color, setColor] = useState(COLOR_OPTIONS[0]);

return (
<ModalShell onClose={onClose} title="Neuer Tracker">
<div style={{ marginBottom: ‘18px’ }}>
<Label>Name</Label>
<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder=“z.B. Rauchen” style={inputStyle} />
</div>
<div style={{ marginBottom: ‘18px’ }}>
<Label>Symbol</Label>
<div style={{ display: ‘grid’, gridTemplateColumns: ‘repeat(5, 1fr)’, gap: ‘8px’ }}>
{ICON_OPTIONS.map(({ name: n, Icon }) => (
<button key={n} onClick={() => setIcon(n)} style={{
aspectRatio: ‘1’,
background: icon === n ? `${color}15` : ‘#f8fafc’,
border: `1.5px solid ${icon === n ? color : 'transparent'}`,
borderRadius: ‘12px’, cursor: ‘pointer’,
color: icon === n ? color : ‘#64748b’,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’,
}}>
<Icon size={18} strokeWidth={1.8} />
</button>
))}
</div>
</div>
<div style={{ marginBottom: ‘24px’ }}>
<Label>Farbe</Label>
<div style={{ display: ‘flex’, gap: ‘10px’, flexWrap: ‘wrap’ }}>
{COLOR_OPTIONS.map(c => (
<button key={c} onClick={() => setColor(c)} style={{
width: ‘34px’, height: ‘34px’, borderRadius: ‘50%’,
background: c,
border: color === c ? ‘3px solid white’ : ‘3px solid transparent’,
boxShadow: color === c ? `0 0 0 2px ${c}` : ‘none’,
cursor: ‘pointer’, padding: 0,
}} />
))}
</div>
</div>
<button onClick={() => name.trim() && onAdd({ name: name.trim(), icon, color })} disabled={!name.trim()} style={{
…primaryBtnStyle,
width: ‘100%’,
background: name.trim() ? ‘#0f172a’ : ‘#e2e8f0’,
color: name.trim() ? ‘white’ : ‘#94a3b8’,
cursor: name.trim() ? ‘pointer’ : ‘not-allowed’,
}}>
Erstellen
</button>
</ModalShell>
);
}

function AddComboModal({ trackers, onClose, onAdd }) {
const [name, setName] = useState(’’);
const [selected, setSelected] = useState([]);
const [color, setColor] = useState(COLOR_OPTIONS[3]);

const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : […p, id]);
const valid = name.trim() && selected.length >= 2;

return (
<ModalShell onClose={onClose} title="Neue Combo" subtitle="Kombiniere Tracker, die zusammengehören">
<div style={{ marginBottom: ‘18px’ }}>
<Label>Name</Label>
<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder=“z.B. Alles Rauchen” style={inputStyle} />
</div>
<div style={{ marginBottom: ‘18px’ }}>
<Label>Tracker ({selected.length} gewählt)</Label>
<div style={{ display: ‘flex’, flexDirection: ‘column’, gap: ‘6px’ }}>
{trackers.map(t => {
const Icon = getIcon(t.icon);
const isSel = selected.includes(t.id);
return (
<button key={t.id} onClick={() => toggle(t.id)} style={{
display: ‘flex’, alignItems: ‘center’, gap: ‘10px’,
padding: ‘10px 12px’,
background: isSel ? `${t.color}10` : ‘#f8fafc’,
border: `1.5px solid ${isSel ? t.color : 'transparent'}`,
borderRadius: ‘12px’, cursor: ‘pointer’, color: ‘#0f172a’, textAlign: ‘left’,
}}>
<div style={{ width: ‘26px’, height: ‘26px’, borderRadius: ‘8px’, background: `${t.color}20`, display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’, color: t.color }}>
<Icon size={13} strokeWidth={2} />
</div>
<span style={{ flex: 1, fontSize: ‘13px’, fontWeight: 500 }}>{t.name}</span>
{isSel && <Check size={15} color={t.color} strokeWidth={2.5} />}
</button>
);
})}
</div>
</div>
<div style={{ marginBottom: ‘24px’ }}>
<Label>Farbe</Label>
<div style={{ display: ‘flex’, gap: ‘10px’, flexWrap: ‘wrap’ }}>
{COLOR_OPTIONS.map(c => (
<button key={c} onClick={() => setColor(c)} style={{
width: ‘34px’, height: ‘34px’, borderRadius: ‘50%’,
background: c,
border: color === c ? ‘3px solid white’ : ‘3px solid transparent’,
boxShadow: color === c ? `0 0 0 2px ${c}` : ‘none’,
cursor: ‘pointer’, padding: 0,
}} />
))}
</div>
</div>
<button onClick={() => valid && onAdd({ name: name.trim(), trackerIds: selected, color })} disabled={!valid} style={{
…primaryBtnStyle,
width: ‘100%’,
background: valid ? ‘#0f172a’ : ‘#e2e8f0’,
color: valid ? ‘white’ : ‘#94a3b8’,
cursor: valid ? ‘pointer’ : ‘not-allowed’,
}}>
Combo erstellen
</button>
</ModalShell>
);
}

function SettingsModal({ trackers, combos, isPremium, onClose, onDeleteTracker, onDeleteCombo, onTogglePremium }) {
return (
<ModalShell onClose={onClose} title="Einstellungen">
{/* Premium status */}
<div style={{
background: isPremium ? ‘linear-gradient(135deg, #fbbf24, #f59e0b)’ : ‘linear-gradient(135deg, #1e293b, #0f172a)’,
borderRadius: ‘18px’,
padding: ‘16px’,
marginBottom: ‘20px’,
color: ‘white’,
}}>
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘center’, marginBottom: ‘6px’ }}>
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: ‘6px’, fontSize: ‘11px’, letterSpacing: ‘0.2em’, textTransform: ‘uppercase’, fontWeight: 700, opacity: 0.8 }}>
<Sparkles size={12} /> {isPremium ? ‘Pro aktiv’ : ‘Upgrade’}
</div>
</div>
<div style={{ fontFamily: ‘“DM Serif Display”, serif’, fontStyle: ‘italic’, fontSize: ‘20px’, marginBottom: ‘4px’ }}>
{isPremium ? ‘Alle Features freigeschaltet’ : ‘Pausa Pro’}
</div>
<div style={{ fontSize: ‘12px’, opacity: 0.8, marginBottom: ‘12px’, lineHeight: 1.4 }}>
{isPremium ? ‘Danke für deinen Support!’ : ‘Unbegrenzte Tracker, tiefe Analysen, Ziele & Streaks, Notizen.’}
</div>
<button onClick={onTogglePremium} style={{
background: ‘rgba(255,255,255,0.2)’, border: ‘1px solid rgba(255,255,255,0.3)’,
color: ‘white’, padding: ‘8px 14px’, borderRadius: ‘10px’, cursor: ‘pointer’,
fontSize: ‘12px’, fontWeight: 600,
}}>
{isPremium ? ‘Auf Free zurück (Demo)’ : ‘Pro aktivieren (Demo)’}
</button>
</div>

```
  {trackers.length > 0 && (
    <>
      <Label>Tracker</Label>
      <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {trackers.map(t => {
          const Icon = getIcon(t.icon);
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', background: '#f8fafc', borderRadius: '12px',
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color }}>
                <Icon size={13} strokeWidth={2} />
              </div>
              <span style={{ flex: 1, color: '#0f172a', fontSize: '13px', fontWeight: 500 }}>{t.name}</span>
              <button onClick={() => { if (confirm(`"${t.name}" wirklich löschen?`)) onDeleteTracker(t.id); }} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  )}

  {combos.length > 0 && (
    <>
      <Label>Combos</Label>
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {combos.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '12px' }}>
            <Link2 size={13} color={c.color} />
            <span style={{ flex: 1, color: '#0f172a', fontSize: '13px', fontWeight: 500 }}>{c.name}</span>
            <button onClick={() => { if (confirm(`"${c.name}" löschen?`)) onDeleteCombo(c.id); }} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  )}

  <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '20px', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
    Pausa · v0.1 Preview
  </div>
</ModalShell>
```

);
}

function StatsModal({ item, trackers, combos, entries, now, isPremium, onClose, onShowPaywall }) {
const isCombo = item.type === ‘combo’;
const data = isCombo ? combos.find(c => c.id === item.id) : trackers.find(t => t.id === item.id);
if (!data) return null;

const relevant = isCombo
? entries.filter(e => data.trackerIds.includes(e.trackerId))
: entries.filter(e => e.trackerId === item.id);
const sorted = […relevant].sort((a, b) => a.timestamp - b.timestamp);
const todays = getTodayEntries(sorted);
const avgToday = getAverageGap(todays);
const avgAll = getAverageGap(sorted);
const last7Avg = getAverageGap(sorted.filter(e => e.timestamp > now - 7 * 86400000));
const trendBetter = avgToday && last7Avg && avgToday > last7Avg;

const accentColor = data.color;

return (
<ModalShell onClose={onClose} title={data.name}>
<div style={{ textAlign: ‘center’, marginBottom: ‘24px’, padding: ‘12px 0’ }}>
<div style={{ fontSize: ‘10px’, letterSpacing: ‘0.25em’, color: ‘#64748b’, textTransform: ‘uppercase’, marginBottom: ‘6px’, fontWeight: 600 }}>
Ø Pause heute
</div>
<div style={{ fontFamily: ‘“DM Serif Display”, Georgia, serif’, fontStyle: ‘italic’, fontSize: ‘42px’, color: accentColor, letterSpacing: ‘-0.03em’, lineHeight: 1 }}>
{avgToday ? formatMinutes(avgToday) : ‘—’}
</div>
{avgToday && last7Avg && (
<div style={{
display: ‘inline-flex’, alignItems: ‘center’, gap: ‘6px’,
marginTop: ‘12px’, padding: ‘5px 11px’,
background: trendBetter ? ‘#d1fae5’ : ‘#fee2e2’,
border: `1px solid ${trendBetter ? '#a7f3d0' : '#fecaca'}`,
borderRadius: ‘100px’,
color: trendBetter ? ‘#047857’ : ‘#b91c1c’,
fontSize: ‘11px’, fontWeight: 600,
}}>
{trendBetter ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
{trendBetter ? ‘Länger als 7-Tage-Ø’ : ‘Kürzer als 7-Tage-Ø’}
</div>
)}
</div>

```
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
    <StatBox label="Heute" value={todays.length} />
    <StatBox label="Gesamt" value={sorted.length} />
  </div>

  <Label>Letzte 7 Tage</Label>
  <div style={{ padding: '10px 0 16px' }}>
    <SevenDayChart entries={sorted} color={accentColor} />
  </div>

  {avgAll && (
    <div style={{
      padding: '12px 14px', background: '#f8fafc', borderRadius: '12px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ color: '#64748b', fontSize: '12px' }}>Gesamt-Durchschnitt</span>
      <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>{formatMinutes(avgAll)}</span>
    </div>
  )}

  {!isPremium && !isCombo && (
    <button onClick={() => onShowPaywall('detailed_stats')} style={{
      marginTop: '16px', width: '100%',
      padding: '14px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      border: '1px solid #fbbf24', borderRadius: '14px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      color: '#78350f', fontSize: '12px', fontWeight: 600,
    }}>
      <Sparkles size={14} /> Tiefere Analysen mit Pro
    </button>
  )}
</ModalShell>
```

);
}

function PaywallModal({ feature, onClose, onUnlock }) {
const features = [
{ Icon: Clock, title: ‘Uhrzeit-Heatmap’, desc: ‘Sieh genau, wann du triggerst’ },
{ Icon: Zap, title: ‘Kritische Zeitfenster’, desc: ‘Deine Top-Risikostunden’ },
{ Icon: TrendingUp, title: ‘Fortschritts-Trend’, desc: ‘Wöchentliche Entwicklung’ },
{ Icon: Target, title: ‘Ziele & Streaks’, desc: ‘Bau Gewohnheiten auf’ },
{ Icon: StickyNote, title: ‘Notizen pro Eintrag’, desc: ‘Trigger, Ort, Stimmung’ },
{ Icon: Plus, title: ‘Unbegrenzte Tracker’, desc: ‘Ohne Limits’ },
{ Icon: Calendar, title: ‘Voller Verlauf’, desc: ‘Alle Einträge für immer’ },
];

return (
<ModalShell onClose={onClose} title="Pausa Pro">
<div style={{
background: ‘linear-gradient(135deg, #fbbf24, #f59e0b)’,
borderRadius: ‘20px’,
padding: ‘20px’,
textAlign: ‘center’,
marginBottom: ‘20px’,
color: ‘white’,
}}>
<Sparkles size={28} style={{ marginBottom: ‘8px’ }} />
<div style={{ fontFamily: ‘“DM Serif Display”, serif’, fontStyle: ‘italic’, fontSize: ‘22px’, marginBottom: ‘4px’ }}>
Hol alles raus.
</div>
<div style={{ fontSize: ‘13px’, opacity: 0.95 }}>
Echte Muster. Echte Fortschritte. Echte Veränderung.
</div>
</div>

```
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
    {features.map(({ Icon, title, desc }, i) => (
      <div key={i} style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 12px', background: '#f8fafc', borderRadius: '12px',
      }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
          <Icon size={14} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{title}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{desc}</div>
        </div>
        <Check size={14} color="#10b981" strokeWidth={2.5} />
      </div>
    ))}
  </div>

  <div style={{
    background: '#f8fafc',
    borderRadius: '14px',
    padding: '14px',
    marginBottom: '16px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Nur</div>
    <div style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', fontSize: '28px', color: '#0f172a' }}>
      4,99 € <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'normal' }}>/ Monat</span>
    </div>
    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Jährlich: 39,99 € · spar 33%</div>
  </div>

  <button onClick={onUnlock} style={{
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    border: 'none', borderRadius: '14px', cursor: 'pointer',
    color: 'white', fontSize: '14px', fontWeight: 600,
    letterSpacing: '0.03em',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  }}>
    <Sparkles size={16} /> Pro aktivieren (Demo)
  </button>
  <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '10px', fontStyle: 'italic' }}>
    In dieser Preview kostenlos zum Testen
  </div>
</ModalShell>
```

);
}

function QuickNoteModal({ trackerId, tracker, onClose, onSave, isPremium, onShowPaywall }) {
const [note, setNote] = useState(’’);
const Icon = tracker ? getIcon(tracker.icon) : Cigarette;

if (!isPremium) {
return (
<ModalShell onClose={onClose} title="Notiz hinzufügen">
<div style={{
padding: ‘30px 20px’, textAlign: ‘center’,
background: ‘linear-gradient(135deg, #fef3c7, #fde68a)’,
borderRadius: ‘16px’, marginBottom: ‘16px’,
}}>
<Lock size={24} color=”#b45309” style={{ marginBottom: ‘10px’ }} />
<div style={{ fontSize: ‘14px’, fontWeight: 600, color: ‘#78350f’, marginBottom: ‘6px’ }}>
Notizen sind ein Pro-Feature
</div>
<div style={{ fontSize: ‘12px’, color: ‘#92400e’, lineHeight: 1.5 }}>
Erfasse Trigger, Stimmung oder Ort zu jedem Eintrag — und erkenne so echte Muster.
</div>
</div>
<button onClick={() => onShowPaywall(‘notes’)} style={{ …primaryBtnStyle, width: ‘100%’, background: ‘#0f172a’, color: ‘white’ }}>
<Sparkles size={14} style={{ marginRight: ‘6px’ }} /> Pro entdecken
</button>
</ModalShell>
);
}

return (
<ModalShell onClose={onClose} title={`+1 ${tracker?.name || ''}`} subtitle=“Was ist gerade los?”>
<textarea
autoFocus
value={note}
onChange={(e) => setNote(e.target.value)}
placeholder=“z.B. Stress bei Arbeit, nach Kaffee, mit Freunden…”
style={{
width: ‘100%’, minHeight: ‘100px’,
padding: ‘14px 16px’,
background: ‘#f8fafc’,
border: ‘1px solid #e2e8f0’,
borderRadius: ‘14px’,
fontSize: ‘14px’,
fontFamily: ‘inherit’,
outline: ‘none’,
resize: ‘none’,
color: ‘#0f172a’,
marginBottom: ‘16px’,
}}
/>
<div style={{ display: ‘flex’, gap: ‘8px’ }}>
<button onClick={onClose} style={{
flex: 1, padding: ‘14px’, background: ‘#f1f5f9’, border: ‘none’,
borderRadius: ‘14px’, cursor: ‘pointer’, color: ‘#64748b’, fontSize: ‘13px’, fontWeight: 600,
}}>Abbrechen</button>
<button onClick={() => onSave(note)} style={{
flex: 2, padding: ‘14px’, background: tracker?.color || ‘#0f172a’, border: ‘none’,
borderRadius: ‘14px’, cursor: ‘pointer’, color: ‘white’, fontSize: ‘13px’, fontWeight: 600,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’, gap: ‘6px’,
}}>
<Check size={14} strokeWidth={2.5} /> Eintragen
</button>
</div>
</ModalShell>
);
}

// ============ UI PRIMITIVES ============

function SectionLabel({ icon, children }) {
return (
<div style={{
fontSize: ‘10px’, letterSpacing: ‘0.25em’, color: ‘#64748b’, textTransform: ‘uppercase’,
padding: ‘0 8px 10px’, fontWeight: 600,
display: ‘flex’, alignItems: ‘center’, gap: ‘6px’,
}}>{icon} {children}</div>
);
}

function Label({ children }) {
return (
<div style={{
fontSize: ‘10px’, letterSpacing: ‘0.2em’, color: ‘#64748b’,
textTransform: ‘uppercase’, marginBottom: ‘10px’, fontWeight: 600,
}}>{children}</div>
);
}

function StatBox({ label, value }) {
return (
<div style={{ background: ‘#f8fafc’, borderRadius: ‘14px’, padding: ‘14px’, textAlign: ‘center’ }}>
<div style={{ fontSize: ‘10px’, letterSpacing: ‘0.2em’, color: ‘#64748b’, textTransform: ‘uppercase’, marginBottom: ‘4px’, fontWeight: 600 }}>{label}</div>
<div style={{ fontFamily: ‘“DM Serif Display”, Georgia, serif’, fontSize: ‘26px’, color: ‘#0f172a’, fontStyle: ‘italic’, lineHeight: 1 }}>{value}</div>
</div>
);
}

// ============ STYLES ============

const iconBtnStyle = {
background: ‘white’,
border: ‘1px solid #e2e8f0’,
color: ‘#64748b’,
width: ‘38px’, height: ‘38px’,
borderRadius: ‘50%’,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’,
cursor: ‘pointer’,
};

const primaryBtnStyle = {
background: ‘#0f172a’,
color: ‘white’,
border: ‘none’,
padding: ‘14px 24px’,
borderRadius: ‘14px’,
fontSize: ‘13px’,
fontWeight: 600,
letterSpacing: ‘0.03em’,
cursor: ‘pointer’,
};

const dashedBtnStyle = {
flex: 1,
background: ‘white’,
border: ‘1.5px dashed #cbd5e1’,
color: ‘#64748b’,
padding: ‘12px’,
borderRadius: ‘14px’,
fontSize: ‘12px’,
fontWeight: 500,
cursor: ‘pointer’,
display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’, gap: ‘6px’,
};

const inputStyle = {
width: ‘100%’,
background: ‘#f8fafc’,
border: ‘1.5px solid #e2e8f0’,
borderRadius: ‘12px’,
padding: ‘12px 14px’,
color: ‘#0f172a’,
fontSize: ‘14px’,
fontFamily: ‘inherit’,
outline: ‘none’,
};
