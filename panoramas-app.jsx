import { useState, useEffect, useCallback, useMemo } from "react";

const FERIADOS_CHILE_2026 = [
  { date: "2026-01-01", name: "Año Nuevo", type: "irrenunciable" },
  { date: "2026-04-03", name: "Viernes Santo", type: "religioso" },
  { date: "2026-04-04", name: "Sábado Santo", type: "religioso" },
  { date: "2026-05-01", name: "Día del Trabajo", type: "irrenunciable" },
  { date: "2026-05-21", name: "Glorias Navales", type: "civil" },
  { date: "2026-06-21", name: "Pueblos Indígenas", type: "civil" },
  { date: "2026-06-29", name: "San Pedro y San Pablo", type: "religioso" },
  { date: "2026-07-16", name: "Virgen del Carmen", type: "religioso" },
  { date: "2026-08-15", name: "Asunción de la Virgen", type: "religioso" },
  { date: "2026-09-18", name: "Independencia Nacional", type: "irrenunciable" },
  { date: "2026-09-19", name: "Glorias del Ejército", type: "irrenunciable" },
  { date: "2026-10-12", name: "Encuentro de Dos Mundos", type: "civil" },
  { date: "2026-10-31", name: "Iglesias Evangélicas", type: "religioso" },
  { date: "2026-11-01", name: "Todos los Santos", type: "religioso" },
  { date: "2026-12-08", name: "Inmaculada Concepción", type: "religioso" },
  { date: "2026-12-25", name: "Navidad", type: "irrenunciable" },
];

const CATEGORIES = [
  { id: "carrete", label: "Carrete", emoji: "🎉", color: "#e74c3c" },
  { id: "asado", label: "Asado", emoji: "🔥", color: "#e67e22" },
  { id: "deporte", label: "Deporte", emoji: "⚽", color: "#27ae60" },
  { id: "playa", label: "Playa", emoji: "🏖️", color: "#3498db" },
  { id: "camping", label: "Camping", emoji: "⛺", color: "#2ecc71" },
  { id: "cine", label: "Cine/Series", emoji: "🎬", color: "#9b59b6" },
  { id: "comer", label: "Salir a comer", emoji: "🍽️", color: "#f39c12" },
  { id: "viaje", label: "Viaje", emoji: "✈️", color: "#1abc9c" },
  { id: "otro", label: "Otro", emoji: "📌", color: "#7f8c8d" },
];

const AVATARS = ["😎","🤙","🧑‍🎤","🦊","🐻","🦁","🐸","🦄","🐧","🎃","👻","🤖","🦖","🐶","🐱","🦋"];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ─── STORAGE ──────────────────────────────────────────────
async function loadData(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function saveData(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch(e) { console.error(e); }
}

// ─── MAIN APP ──────────────────────────────────────────────
export default function PanoramasApp() {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await loadData("panoramas-members", []);
      const e = await loadData("panoramas-events", []);
      setMembers(m);
      setEvents(e);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) saveData("panoramas-members", members);
  }, [members, loaded]);

  useEffect(() => {
    if (loaded) saveData("panoramas-events", events);
  }, [events, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const todayKey = dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    setEvents(prev => {
      let changed = false;
      const next = prev.map(ev => {
        if (ev.status !== "voting") return ev;
        if (ev.date > todayKey) return ev;
        const yesVotes = Object.values(ev.votes).filter(v => v === "yes").length;
        if (yesVotes < (ev.minVoters ?? 1)) {
          changed = true;
          return { ...ev, status: "cancelled" };
        }
        return ev;
      });
      return changed ? next : prev;
    });
  }, [loaded]);

  const feriadoMap = useMemo(() => {
    const m = {};
    FERIADOS_CHILE_2026.forEach(f => { m[f.date] = f; });
    return m;
  }, []);

  const eventsByDate = useMemo(() => {
    const m = {};
    events.forEach(e => {
      if (!m[e.date]) m[e.date] = [];
      m[e.date].push(e);
    });
    return m;
  }, [events]);

  const absences = useMemo(() => {
    const counts = {};
    members.forEach(m => { counts[m.id] = 0; });
    events.forEach(ev => {
      if (ev.status === "confirmed") {
        members.forEach(m => {
          if (ev.absent && ev.absent.includes(m.id)) {
            counts[m.id] = (counts[m.id] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [events, members]);

  const bombas = useMemo(() => {
    const counts = {};
    members.forEach(m => { counts[m.id] = 0; });
    events.forEach(ev => {
      if (ev.status === "cancelled") {
        members.forEach(m => {
          if (ev.votes[m.id] === undefined) {
            counts[m.id] = (counts[m.id] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [events, members]);

  function addMember(name, avatar) {
    setMembers(prev => [...prev, { id: generateId(), name, avatar }]);
  }
  function removeMember(id) {
    setMembers(prev => prev.filter(m => m.id !== id));
  }
  function addEvent(ev) {
    setEvents(prev => [...prev, { ...ev, id: generateId(), votes: {}, absent: [], status: "voting" }]);
  }
  function voteEvent(eventId, memberId, vote) {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, votes: { ...e.votes, [memberId]: vote } } : e));
  }
  function confirmEvent(eventId) {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: "confirmed" } : e));
  }
  function markAbsent(eventId, memberId) {
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      const abs = e.absent.includes(memberId) ? e.absent.filter(a => a !== memberId) : [...e.absent, memberId];
      return { ...e, absent: abs };
    }));
  }
  function deleteEvent(eventId) {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setSelectedEvent(null);
  }
  function cancelEvent(eventId) {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: "cancelled" } : e));
  }

  if (!loaded) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "'Outfit', sans-serif",
      background: "#07070f", color: "#fff",
      flexDirection: "column", gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "linear-gradient(135deg, #7c6ff7, #a855f7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24,
        boxShadow: "0 0 40px rgba(124,111,247,0.5)",
      }}>🎉</div>
      <p style={{ fontSize: 14, opacity: 0.4, margin: 0, letterSpacing: "0.05em" }}>CARGANDO...</p>
    </div>
  );

  const NAV_TABS = [
    { key: "calendar", label: "Calendario", icon: "📅" },
    { key: "events", label: "Panoramas", icon: "🎯" },
    { key: "ranking", label: "Ranking", icon: "🏆" },
    { key: "members", label: "Grupo", icon: "👥" },
  ];

  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif",
      background: "#07070f",
      color: "#f1f0ff",
      minHeight: "100vh",
      maxWidth: 520,
      margin: "0 auto",
      position: "relative",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Ambient glow background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        maxWidth: 520, margin: "0 auto",
        background: `
          radial-gradient(ellipse at 15% 10%, rgba(124,111,247,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 85%, rgba(168,85,247,0.12) 0%, transparent 55%),
          radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.04) 0%, transparent 70%)
        `,
      }} />

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 1,
        padding: "52px 24px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(124,111,247,0.12)",
              border: "1px solid rgba(124,111,247,0.25)",
              borderRadius: 20, padding: "4px 12px",
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 12 }}>🇨🇱</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#a5b4fc", letterSpacing: "0.06em" }}>CHILE 2026</span>
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              background: "linear-gradient(135deg, #e0d7ff 0%, #c084fc 50%, #818cf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Panoramas</h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(241,240,255,0.35)", fontWeight: 300 }}>
              Organiza juntas con los cabros
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", gap: -4 }}>
              {members.slice(0, 4).map((m, i) => (
                <div key={m.id} style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(124,111,247,0.15)",
                  border: "2px solid rgba(124,111,247,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, marginLeft: i > 0 ? -8 : 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }} title={m.name}>{m.avatar}</div>
              ))}
              {members.length > 4 && (
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  border: "2px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                  marginLeft: -8,
                }}>+{members.length - 4}</div>
              )}
            </div>
            {members.length === 0 && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Sin miembros</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, padding: "0 16px 140px" }}>
        {view === "calendar" && (
          <CalendarView
            year={currentYear} month={currentMonth}
            setYear={setCurrentYear} setMonth={setCurrentMonth}
            feriadoMap={feriadoMap} eventsByDate={eventsByDate}
            onSelectDate={(d) => { setSelectedDate(d); setShowNewEvent(true); }}
            members={members}
          />
        )}
        {view === "events" && (
          <EventsView
            events={events} members={members}
            onVote={voteEvent} onConfirm={confirmEvent}
            onCancel={cancelEvent}
            onMarkAbsent={markAbsent} onDelete={deleteEvent}
            onNew={() => setShowNewEvent(true)}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
          />
        )}
        {view === "ranking" && (
          <RankingView members={members} absences={absences} bombas={bombas} events={events} />
        )}
        {view === "members" && (
          <MembersView
            members={members}
            absences={absences}
            bombas={bombas}
            onAdd={() => setShowAddMember(true)}
            onRemove={removeMember}
          />
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowNewEvent(true)} style={{
        position: "fixed",
        bottom: 100,
        right: "calc(50% - 245px)",
        width: 52, height: 52,
        borderRadius: "50%",
        border: "none",
        background: "linear-gradient(135deg, #7c6ff7, #a855f7)",
        color: "#fff",
        fontSize: 26,
        cursor: "pointer",
        boxShadow: "0 4px 20px rgba(124,111,247,0.55), 0 0 0 1px rgba(255,255,255,0.1) inset",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50,
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(124,111,247,0.7), 0 0 0 1px rgba(255,255,255,0.15) inset"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,111,247,0.55), 0 0 0 1px rgba(255,255,255,0.1) inset"; }}
      >
        +
      </button>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        background: "rgba(12,10,25,0.88)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 32,
        padding: "6px",
        gap: 2,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,111,247,0.08) inset",
        zIndex: 100,
        maxWidth: 400,
        width: "calc(100% - 48px)",
        justifyContent: "space-around",
      }}>
        {NAV_TABS.map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            flex: 1,
            padding: "10px 8px",
            border: "none",
            borderRadius: 26,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: view === t.key ? 700 : 400,
            fontFamily: "inherit",
            background: view === t.key
              ? "linear-gradient(135deg, rgba(124,111,247,0.3), rgba(168,85,247,0.25))"
              : "transparent",
            color: view === t.key ? "#c4b5fd" : "rgba(255,255,255,0.35)",
            transition: "all 0.2s",
            outline: view === t.key ? "1px solid rgba(124,111,247,0.35)" : "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ letterSpacing: "0.01em" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Modals */}
      {showNewEvent && (
        <NewEventModal
          date={selectedDate}
          members={members}
          onClose={() => { setShowNewEvent(false); setSelectedDate(null); }}
          onSave={(ev) => { addEvent(ev); setShowNewEvent(false); setSelectedDate(null); }}
        />
      )}
      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onSave={(name, avatar) => { addMember(name, avatar); setShowAddMember(false); }}
        />
      )}
    </div>
  );
}

// ─── CALENDAR VIEW ─────────────────────────────────────
function CalendarView({ year, month, setYear, setMonth, feriadoMap, eventsByDate, onSelectDate, members }) {
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  function prev() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Month nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20,
        padding: "14px 18px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
      }}>
        <button onClick={prev} style={navBtn}>‹</button>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#e0d7ff" }}>
            {MONTH_NAMES[month]}
          </h2>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>{year}</span>
        </div>
        <button onClick={next} style={navBtn}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center", marginBottom: 6 }}>
        {["Lu","Ma","Mi","Ju","Vi","Sá","Do"].map(d => (
          <div key={d} style={{
            fontSize: 11, fontWeight: 700, color: "rgba(196,181,253,0.4)",
            padding: "4px 0", fontFamily: "'Space Mono', monospace", letterSpacing: "0.04em",
          }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const dk = dateKey(year, month, d);
          const feriado = feriadoMap[dk];
          const evts = eventsByDate[dk] || [];
          const isToday = dk === todayKey;
          const isWeekend = (i % 7 === 5) || (i % 7 === 6);

          return (
            <button key={dk} onClick={() => onSelectDate(dk)} style={{
              position: "relative",
              padding: "8px 2px 10px",
              border: isToday
                ? "1.5px solid rgba(124,111,247,0.7)"
                : feriado
                  ? "1px solid rgba(239,68,68,0.2)"
                  : "1px solid rgba(255,255,255,0.05)",
              borderRadius: 14,
              background: isToday
                ? "rgba(124,111,247,0.18)"
                : feriado
                  ? "rgba(239,68,68,0.08)"
                  : evts.length > 0
                    ? "rgba(124,111,247,0.08)"
                    : "rgba(255,255,255,0.025)",
              cursor: "pointer",
              color: feriado ? "#fca5a5" : isToday ? "#c4b5fd" : isWeekend ? "rgba(255,255,255,0.45)" : "#e0d7ff",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              fontWeight: isToday ? 800 : 400,
              transition: "all 0.15s",
              minHeight: 52,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              boxShadow: isToday ? "0 0 16px rgba(124,111,247,0.2)" : "none",
            }}>
              <span>{d}</span>
              {feriado && (
                <span style={{
                  fontSize: 7, lineHeight: 1.2, color: "#fca5a5",
                  maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", display: "block", padding: "0 2px",
                  opacity: 0.8,
                }}>{feriado.name.split(" ")[0]}</span>
              )}
              {evts.length > 0 && (
                <div style={{ display: "flex", gap: 1, marginTop: 1, justifyContent: "center" }}>
                  {evts.slice(0, 3).map(e => {
                    const cat = CATEGORIES.find(c => c.id === e.category);
                    return <span key={e.id} style={{ fontSize: 9 }}>{cat?.emoji}</span>;
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Upcoming feriados */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>PRÓXIMOS FERIADOS</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>
        {FERIADOS_CHILE_2026
          .filter(f => f.date >= dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))
          .slice(0, 4)
          .map(f => (
            <div key={f.date} onClick={() => onSelectDate(f.date)} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              marginBottom: 6,
              borderRadius: 16,
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.12)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "linear-gradient(135deg, #ef4444, #f97316)",
                flexShrink: 0,
                boxShadow: "0 0 8px rgba(239,68,68,0.5)",
              }} />
              <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#fca5a5", minWidth: 88 }}>
                {formatDate(f.date)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{f.name}</span>
              {f.type === "irrenunciable" && (
                <span style={{
                  fontSize: 9, padding: "2px 8px", borderRadius: 20,
                  background: "rgba(239,68,68,0.15)", color: "#fca5a5", fontWeight: 700,
                  letterSpacing: "0.04em",
                }}>IRR.</span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

const navBtn = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#c4b5fd",
  width: 38, height: 38,
  borderRadius: 12,
  fontSize: 20,
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "background 0.15s",
};

// ─── EVENTS VIEW ──────────────────────────────────────
function EventsView({ events, members, onVote, onConfirm, onCancel, onMarkAbsent, onDelete, onNew, selectedEvent, setSelectedEvent }) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const voting = sorted.filter(e => e.status === "voting");
  const confirmed = sorted.filter(e => e.status === "confirmed");
  const cancelled = sorted.filter(e => e.status === "cancelled");

  if (selectedEvent) {
    const ev = events.find(e => e.id === selectedEvent);
    if (!ev) { setSelectedEvent(null); return null; }
    return <EventDetail ev={ev} members={members} onVote={onVote} onConfirm={onConfirm} onCancel={onCancel} onMarkAbsent={onMarkAbsent} onDelete={onDelete} onBack={() => setSelectedEvent(null)} />;
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {events.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          borderRadius: 24,
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.08)",
          marginTop: 8,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(124,111,247,0.12)",
            border: "1px solid rgba(124,111,247,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>🎯</div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: "#e0d7ff" }}>Sin panoramas aún</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>Crea el primero con el botón +</p>
        </div>
      ) : (
        <>
          {voting.length > 0 && (
            <>
              <div style={sectionTitle}>
                <span>🗳️</span>
                <span>En votación</span>
                <span style={{
                  marginLeft: 8, fontSize: 11, padding: "2px 8px",
                  borderRadius: 20, background: "rgba(251,191,36,0.15)", color: "#fbbf24",
                }}>{voting.length}</span>
              </div>
              {voting.map(ev => <EventCard key={ev.id} ev={ev} members={members} onClick={() => setSelectedEvent(ev.id)} />)}
            </>
          )}
          {confirmed.length > 0 && (
            <>
              <div style={{ ...sectionTitle, marginTop: voting.length > 0 ? 24 : 0 }}>
                <span>✅</span>
                <span>Confirmados</span>
                <span style={{
                  marginLeft: 8, fontSize: 11, padding: "2px 8px",
                  borderRadius: 20, background: "rgba(16,185,129,0.15)", color: "#34d399",
                }}>{confirmed.length}</span>
              </div>
              {confirmed.map(ev => <EventCard key={ev.id} ev={ev} members={members} onClick={() => setSelectedEvent(ev.id)} />)}
            </>
          )}
          {cancelled.length > 0 && (
            <>
              <div style={{ ...sectionTitle, marginTop: (voting.length > 0 || confirmed.length > 0) ? 24 : 0 }}>
                <span>💨</span>
                <span>Cancelados</span>
                <span style={{
                  marginLeft: 8, fontSize: 11, padding: "2px 8px",
                  borderRadius: 20, background: "rgba(100,100,100,0.2)", color: "rgba(255,255,255,0.4)",
                }}>{cancelled.length}</span>
              </div>
              {cancelled.map(ev => <EventCard key={ev.id} ev={ev} members={members} onClick={() => setSelectedEvent(ev.id)} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}

const sectionTitle = {
  fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.45)",
  margin: "0 0 10px", letterSpacing: "0.04em",
  display: "flex", alignItems: "center", gap: 6,
};

function EventCard({ ev, members, onClick }) {
  const cat = CATEGORIES.find(c => c.id === ev.category);
  const yesVotes = Object.values(ev.votes).filter(v => v === "yes").length;
  const total = members.length;
  const pct = total > 0 ? (yesVotes / total) * 100 : 0;

  return (
    <div onClick={onClick} style={{
      padding: "16px",
      marginBottom: 10,
      borderRadius: 20,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      cursor: "pointer",
      transition: "all 0.15s",
      backdropFilter: "blur(12px)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.055)"; e.currentTarget.style.borderColor = "rgba(124,111,247,0.25)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `${cat?.color}18`,
          border: `1px solid ${cat?.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0,
        }}>{cat?.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#e0d7ff", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}>{formatDate(ev.date)}</div>
        </div>
        <span style={{
          fontSize: 10, padding: "4px 10px", borderRadius: 20, fontWeight: 700,
          background: ev.status === "voting" ? "rgba(251,191,36,0.12)" : ev.status === "confirmed" ? "rgba(16,185,129,0.12)" : "rgba(100,100,100,0.15)",
          color: ev.status === "voting" ? "#fbbf24" : ev.status === "confirmed" ? "#34d399" : "rgba(255,255,255,0.35)",
          border: `1px solid ${ev.status === "voting" ? "rgba(251,191,36,0.2)" : ev.status === "confirmed" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.1)"}`,
          flexShrink: 0,
          letterSpacing: "0.04em",
        }}>
          {ev.status === "voting" ? "VOTANDO" : ev.status === "confirmed" ? "CONFIRMADO" : "CANCELADO"}
        </span>
      </div>
      {total > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              background: "linear-gradient(90deg, #7c6ff7, #a855f7)",
              width: `${pct}%`, transition: "width 0.4s ease",
              boxShadow: pct > 0 ? "0 0 8px rgba(124,111,247,0.4)" : "none",
            }} />
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace", minWidth: 32, textAlign: "right" }}>{yesVotes}/{total}</span>
        </div>
      )}
    </div>
  );
}

// ─── EVENT DETAIL ──────────────────────────────────────
function EventDetail({ ev, members, onVote, onConfirm, onCancel, onMarkAbsent, onDelete, onBack }) {
  const cat = CATEGORIES.find(c => c.id === ev.category);
  const yesVotes = Object.values(ev.votes).filter(v => v === "yes").length;
  const noVotes = Object.values(ev.votes).filter(v => v === "no").length;
  const maybeVotes = Object.values(ev.votes).filter(v => v === "maybe").length;

  return (
    <div style={{ paddingTop: 8 }}>
      <button onClick={onBack} style={{
        background: "rgba(124,111,247,0.1)",
        border: "1px solid rgba(124,111,247,0.2)",
        color: "#a5b4fc", cursor: "pointer", fontSize: 13,
        fontFamily: "inherit", padding: "7px 14px", marginBottom: 16,
        borderRadius: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
      }}>
        ← Volver
      </button>

      {/* Event header card */}
      <div style={{
        padding: "20px",
        borderRadius: 24,
        background: `linear-gradient(135deg, ${cat?.color}12 0%, rgba(124,111,247,0.06) 100%)`,
        border: `1px solid ${cat?.color}20`,
        marginBottom: 12,
        backdropFilter: "blur(16px)",
        boxShadow: `0 8px 32px ${cat?.color}10`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: `${cat?.color}20`,
            border: `1px solid ${cat?.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32,
          }}>{cat?.emoji}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#e0d7ff", letterSpacing: "-0.02em" }}>{ev.title}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>{formatDate(ev.date)}</p>
          </div>
        </div>
        {ev.description && (
          <p style={{ margin: "0 0 10px", fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{ev.description}</p>
        )}
        {ev.location && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
            <span>📍</span><span>{ev.location}</span>
          </div>
        )}
      </div>

      {/* Voting / attendance section */}
      <div style={{
        padding: "18px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        marginBottom: 10,
        backdropFilter: "blur(12px)",
      }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#c4b5fd", display: "flex", alignItems: "center", gap: 6 }}>
          {ev.status === "voting" ? <><span>🗳️</span><span>Votación</span></> : ev.status === "confirmed" ? <><span>✅</span><span>Asistencia</span></> : <><span>💨</span><span>Cancelado — sin quórum</span></>}
        </h3>

        {ev.status === "cancelled" && (
          <div style={{
            padding: "10px 14px", borderRadius: 12, marginBottom: 14,
            background: "rgba(100,100,100,0.1)", border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5,
          }}>
            El evento no alcanzó el mínimo de <strong style={{ color: "rgba(255,255,255,0.7)" }}>{ev.minVoters ?? 1} sí</strong> antes de la fecha.
            Los que no votaron quedan como <strong style={{ color: "#fbbf24" }}>bombas de humo 💨</strong>.
          </div>
        )}

        {members.length === 0 ? (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "16px 0" }}>
            Agrega participantes primero en la pestaña Grupo
          </p>
        ) : (
          members.map(m => {
            const vote = ev.votes[m.id];
            const isAbsent = ev.absent?.includes(m.id);

            return (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}>{m.avatar}</div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#e0d7ff" }}>{m.name}</span>

                {ev.status === "voting" ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => onVote(ev.id, m.id, "yes")} style={{
                      ...voteBtn,
                      background: vote === "yes" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                      color: vote === "yes" ? "#34d399" : "rgba(255,255,255,0.3)",
                      borderColor: vote === "yes" ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)",
                      boxShadow: vote === "yes" ? "0 0 12px rgba(16,185,129,0.2)" : "none",
                    }}>👍</button>
                    <button onClick={() => onVote(ev.id, m.id, "maybe")} style={{
                      ...voteBtn,
                      background: vote === "maybe" ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)",
                      color: vote === "maybe" ? "#fbbf24" : "rgba(255,255,255,0.3)",
                      borderColor: vote === "maybe" ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)",
                      boxShadow: vote === "maybe" ? "0 0 12px rgba(251,191,36,0.2)" : "none",
                    }}>🤔</button>
                    <button onClick={() => onVote(ev.id, m.id, "no")} style={{
                      ...voteBtn,
                      background: vote === "no" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                      color: vote === "no" ? "#ef4444" : "rgba(255,255,255,0.3)",
                      borderColor: vote === "no" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)",
                      boxShadow: vote === "no" ? "0 0 12px rgba(239,68,68,0.2)" : "none",
                    }}>👎</button>
                  </div>
                ) : ev.status === "confirmed" ? (
                  <button onClick={() => onMarkAbsent(ev.id, m.id)} style={{
                    ...voteBtn,
                    width: "auto",
                    padding: "5px 14px",
                    fontSize: 11, fontWeight: 700,
                    background: isAbsent ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.1)",
                    color: isAbsent ? "#fca5a5" : "#6ee7b7",
                    borderColor: isAbsent ? "rgba(239,68,68,0.35)" : "rgba(16,185,129,0.25)",
                    letterSpacing: "0.03em",
                  }}>
                    {isAbsent ? "FALTÓ 💀" : "ASISTIÓ ✓"}
                  </button>
                ) : (
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
                    color: vote === "no" ? "rgba(255,255,255,0.35)" : vote === undefined ? "#fbbf24" : "rgba(255,255,255,0.35)",
                    padding: "5px 10px", borderRadius: 10,
                    background: vote === undefined ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${vote === undefined ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                    {vote === "yes" ? "Quería ir" : vote === "maybe" ? "Quizás" : vote === "no" ? "No iba" : "💨 No votó"}
                  </span>
                )}
              </div>
            );
          })
        )}

        {ev.status === "voting" && (
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            {[
              { count: yesVotes, label: "Sí van", color: "#34d399", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
              { count: maybeVotes, label: "Quizás", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)" },
              { count: noVotes, label: "No van", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
            ].map(item => (
              <div key={item.label} style={{
                flex: 1, textAlign: "center", padding: "12px 6px",
                borderRadius: 14,
                background: item.bg,
                border: `1px solid ${item.border}`,
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: item.color, fontFamily: "'Space Mono', monospace" }}>{item.count}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2, letterSpacing: "0.04em" }}>{item.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}

        {ev.status === "voting" && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => onConfirm(ev.id)} style={{
              flex: 1, padding: "13px",
              borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #7c6ff7, #a855f7)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 16px rgba(124,111,247,0.35)",
              letterSpacing: "0.02em",
            }}>
              Confirmar ✓
            </button>
            <button onClick={() => onCancel(ev.id)} style={{
              padding: "13px 16px",
              borderRadius: 14,
              border: "1px solid rgba(251,191,36,0.25)",
              background: "rgba(251,191,36,0.08)",
              color: "#fbbf24", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.02em",
            }}>
              💨 Cancelar
            </button>
          </div>
        )}
      </div>

      <button onClick={() => onDelete(ev.id)} style={{
        width: "100%", padding: "11px",
        borderRadius: 14,
        border: "1px solid rgba(239,68,68,0.18)",
        background: "rgba(239,68,68,0.05)",
        color: "#fca5a5", fontWeight: 600, fontSize: 13,
        cursor: "pointer", fontFamily: "inherit",
        transition: "background 0.15s",
      }}>
        Eliminar panorama
      </button>
    </div>
  );
}

const voteBtn = {
  width: 38, height: 34,
  borderRadius: 10,
  border: "1px solid",
  cursor: "pointer",
  fontSize: 15,
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.15s",
  fontFamily: "inherit",
};

// ─── RANKING VIEW ──────────────────────────────────────
function RankingView({ members, absences, bombas, events }) {
  const confirmedEvents = events.filter(e => e.status === "confirmed");
  const cancelledEvents = events.filter(e => e.status === "cancelled");
  const sorted = [...members].sort((a, b) => {
    const scoreB = (absences[b.id] || 0) + (bombas[b.id] || 0);
    const scoreA = (absences[a.id] || 0) + (bombas[a.id] || 0);
    return scoreB - scoreA;
  });
  const maxScore = Math.max(...members.map(m => (absences[m.id] || 0) + (bombas[m.id] || 0)), 1);

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Title section */}
      <div style={{
        padding: "18px 20px",
        borderRadius: 20,
        background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.06))",
        border: "1px solid rgba(239,68,68,0.15)",
        marginBottom: 16,
        backdropFilter: "blur(12px)",
      }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#fca5a5", letterSpacing: "-0.02em" }}>💀 Muro de la Vergüenza</h3>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Inasistencias a panoramas confirmados</p>
      </div>

      {confirmedEvents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0 }}>Confirma panoramas para ver el ranking</p>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0 }}>Agrega participantes primero</p>
        </div>
      ) : (
        sorted.map((m, i) => {
          const faltas = absences[m.id] || 0;
          const humos = bombas[m.id] || 0;
          const total = faltas + humos;
          const pct = (total / maxScore) * 100;
          const isWorst = i === 0 && total > 0;

          return (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", marginBottom: 8,
              borderRadius: 18,
              background: isWorst ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.025)",
              border: isWorst ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(255,255,255,0.05)",
              backdropFilter: "blur(8px)",
              transition: "all 0.15s",
            }}>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 13, fontWeight: 700,
                color: i === 0 ? "rgba(239,68,68,0.7)" : i === 1 ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.2)",
                minWidth: 26, textAlign: "center",
              }}>#{i + 1}</span>
              <div style={{
                width: 40, height: 40, borderRadius: 13,
                background: "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>{m.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#e0d7ff", display: "flex", alignItems: "center", gap: 6 }}>
                  {m.name}
                  {isWorst && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, letterSpacing: "0.04em" }}>👑 REY FALTÓN</span>}
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${pct}%`,
                    background: total > 2 ? "linear-gradient(90deg, #ef4444, #f97316)" : total > 0 ? "linear-gradient(90deg, #fbbf24, #f97316)" : "transparent",
                    transition: "width 0.4s ease",
                    boxShadow: total > 0 ? "0 0 8px rgba(239,68,68,0.3)" : "none",
                  }} />
                </div>
                <div style={{ fontSize: 10, marginTop: 4, display: "flex", gap: 6 }}>
                  {faltas > 0 && <span>{"💀".repeat(Math.min(faltas, 5))}</span>}
                  {humos > 0 && <span>{"💨".repeat(Math.min(humos, 5))}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 48 }}>
                {faltas > 0 && <div style={{ fontSize: 11, color: "#fca5a5", fontFamily: "'Space Mono', monospace" }}>💀 {faltas}</div>}
                {humos > 0 && <div style={{ fontSize: 11, color: "#fbbf24", fontFamily: "'Space Mono', monospace" }}>💨 {humos}</div>}
                {total === 0 && <div style={{ fontSize: 18, color: "#34d399" }}>✓</div>}
              </div>
            </div>
          );
        })
      )}

      {/* Stats bento grid */}
      {(confirmedEvents.length > 0 || cancelledEvents.length > 0) && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>ESTADÍSTICAS</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { value: confirmedEvents.length, label: "Confirmados", color: "#34d399", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
              { value: cancelledEvents.length, label: "Cancelados", color: "rgba(255,255,255,0.4)", bg: "rgba(100,100,100,0.08)", border: "rgba(255,255,255,0.08)" },
              { value: Object.values(absences).reduce((a, b) => a + b, 0), label: "💀 Faltas", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)" },
              { value: Object.values(bombas).reduce((a, b) => a + b, 0), label: "💨 Bombas", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.15)" },
            ].map(stat => (
              <div key={stat.label} style={{
                textAlign: "center", padding: "16px 12px",
                borderRadius: 18,
                background: stat.bg,
                border: `1px solid ${stat.border}`,
                backdropFilter: "blur(8px)",
              }}>
                <div style={{
                  fontSize: 30, fontWeight: 900, color: stat.color,
                  fontFamily: "'Space Mono', monospace", lineHeight: 1,
                }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 6, letterSpacing: "0.06em" }}>{stat.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MEMBERS VIEW ──────────────────────────────────────
function MembersView({ members, absences, bombas, onAdd, onRemove }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e0d7ff", letterSpacing: "-0.02em" }}>El Grupo</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{members.length} participante{members.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onAdd} style={{
          padding: "9px 18px",
          borderRadius: 14,
          border: "1px solid rgba(124,111,247,0.35)",
          background: "rgba(124,111,247,0.12)",
          color: "#c4b5fd",
          fontWeight: 700, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit",
          transition: "all 0.15s",
          letterSpacing: "0.02em",
        }}>
          + Agregar
        </button>
      </div>

      {members.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          borderRadius: 24,
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.08)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(124,111,247,0.1)",
            border: "1px solid rgba(124,111,247,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>👥</div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: "#e0d7ff" }}>Sin participantes</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>Agrega a los cabros del grupo</p>
        </div>
      ) : (
        members.map(m => (
          <div key={m.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px", marginBottom: 8,
            borderRadius: 18,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 15,
              background: "rgba(124,111,247,0.1)",
              border: "1px solid rgba(124,111,247,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26,
            }}>{m.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#e0d7ff" }}>{m.name}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 1 }}>
                {absences[m.id] > 0 && <span style={{ fontSize: 11, color: "#fca5a5" }}>💀 {absences[m.id]} falta{absences[m.id] !== 1 ? "s" : ""}</span>}
                {bombas[m.id] > 0 && <span style={{ fontSize: 11, color: "#fbbf24" }}>💨 {bombas[m.id]} bomba{bombas[m.id] !== 1 ? "s" : ""}</span>}
                {!absences[m.id] && !bombas[m.id] && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Sin faltas ✓</span>}
              </div>
            </div>
            {confirmDelete === m.id ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { onRemove(m.id); setConfirmDelete(null); }} style={{ ...smallBtn, background: "rgba(239,68,68,0.18)", color: "#fca5a5", borderColor: "rgba(239,68,68,0.3)", fontWeight: 700 }}>Sí</button>
                <button onClick={() => setConfirmDelete(null)} style={{ ...smallBtn }}>No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(m.id)} style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 18, padding: 6,
                transition: "color 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(239,68,68,0.6)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
              >✕</button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

const smallBtn = {
  padding: "5px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.06)",
  color: "#e0d7ff",
  fontSize: 12, fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

// ─── NEW EVENT MODAL ──────────────────────────────────
function NewEventModal({ date, members, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("carrete");
  const [eventDate, setEventDate] = useState(date || "");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [minVoters, setMinVoters] = useState(Math.max(1, Math.ceil((members.length || 2) / 2)));

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalContent} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#e0d7ff", letterSpacing: "-0.02em" }}>Nuevo panorama</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>¿Qué se viene?</p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16,
            width: 34, height: 34, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <label style={labelStyle}>Nombre del panorama</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Asado en la casa del Juancho" style={inputStyle} />

        <label style={labelStyle}>Categoría</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, marginBottom: 18 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              padding: "11px 6px",
              borderRadius: 14,
              border: category === c.id ? `1.5px solid ${c.color}60` : "1px solid rgba(255,255,255,0.07)",
              background: category === c.id ? `${c.color}18` : "rgba(255,255,255,0.03)",
              cursor: "pointer",
              color: category === c.id ? "#e0d7ff" : "rgba(255,255,255,0.45)",
              fontSize: 11, fontFamily: "inherit", fontWeight: category === c.id ? 700 : 400,
              textAlign: "center", transition: "all 0.15s",
              boxShadow: category === c.id ? `0 0 16px ${c.color}20` : "none",
            }}>
              <span style={{ fontSize: 22, display: "block", marginBottom: 4 }}>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Fecha</label>
        <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={inputStyle} />

        <label style={labelStyle}>Lugar (opcional)</label>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Casa del Toto, Cajón del Maipo" style={inputStyle} />

        <label style={labelStyle}>Descripción (opcional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles, qué llevar, etc..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />

        <label style={labelStyle}>Mín. de "sí" para confirmar</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button onClick={() => setMinVoters(v => Math.max(1, v - 1))} style={{
            width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)", color: "#e0d7ff", fontSize: 18,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>−</button>
          <div style={{
            flex: 1, textAlign: "center", fontFamily: "'Space Mono', monospace",
            fontSize: 20, fontWeight: 700, color: "#c4b5fd",
          }}>{minVoters}</div>
          <button onClick={() => setMinVoters(v => Math.min(members.length || 99, v + 1))} style={{
            width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)", color: "#e0d7ff", fontSize: 18,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>+</button>
        </div>

        <button onClick={() => {
          if (!title.trim() || !eventDate) return;
          onSave({ title: title.trim(), category, date: eventDate, description: description.trim(), location: location.trim(), minVoters });
        }} disabled={!title.trim() || !eventDate} style={{
          width: "100%", marginTop: 4, padding: "14px",
          borderRadius: 14, border: "none",
          background: title.trim() && eventDate
            ? "linear-gradient(135deg, #7c6ff7, #a855f7)"
            : "rgba(255,255,255,0.07)",
          color: title.trim() && eventDate ? "#fff" : "rgba(255,255,255,0.25)",
          fontWeight: 700, fontSize: 15,
          cursor: title.trim() && eventDate ? "pointer" : "default",
          fontFamily: "inherit",
          transition: "all 0.2s",
          boxShadow: title.trim() && eventDate ? "0 4px 20px rgba(124,111,247,0.35)" : "none",
          letterSpacing: "0.02em",
        }}>
          Crear panorama 🎉
        </button>
      </div>
    </div>
  );
}

// ─── ADD MEMBER MODAL ──────────────────────────────────
function AddMemberModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)]);

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalContent} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#e0d7ff", letterSpacing: "-0.02em" }}>Agregar al grupo</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>¿Quién se suma?</p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16,
            width: 34, height: 34, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Avatar preview */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: "rgba(124,111,247,0.12)",
            border: "2px solid rgba(124,111,247,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40, margin: "0 auto",
            boxShadow: "0 0 24px rgba(124,111,247,0.2)",
          }}>{avatar}</div>
        </div>

        <label style={labelStyle}>Nombre o apodo</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: El Juancho" style={inputStyle} autoFocus />

        <label style={labelStyle}>Elige tu avatar</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 20 }}>
          {AVATARS.map(a => (
            <button key={a} onClick={() => setAvatar(a)} style={{
              padding: "8px 0",
              borderRadius: 12,
              border: avatar === a ? "2px solid #7c6ff7" : "1px solid rgba(255,255,255,0.07)",
              background: avatar === a ? "rgba(124,111,247,0.2)" : "rgba(255,255,255,0.03)",
              cursor: "pointer", fontSize: 22, textAlign: "center",
              transition: "all 0.15s",
              boxShadow: avatar === a ? "0 0 12px rgba(124,111,247,0.3)" : "none",
            }}>
              {a}
            </button>
          ))}
        </div>

        <button onClick={() => {
          if (!name.trim()) return;
          onSave(name.trim(), avatar);
        }} disabled={!name.trim()} style={{
          width: "100%", padding: "14px",
          borderRadius: 14, border: "none",
          background: name.trim() ? "linear-gradient(135deg, #7c6ff7, #a855f7)" : "rgba(255,255,255,0.07)",
          color: name.trim() ? "#fff" : "rgba(255,255,255,0.25)",
          fontWeight: 700, fontSize: 15,
          cursor: name.trim() ? "pointer" : "default",
          fontFamily: "inherit",
          boxShadow: name.trim() ? "0 4px 20px rgba(124,111,247,0.35)" : "none",
          letterSpacing: "0.02em",
          transition: "all 0.2s",
        }}>
          Agregar {avatar}
        </button>
      </div>
    </div>
  );
}

const modalOverlay = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.75)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
  zIndex: 200, padding: "0 0 0 0",
};

const modalContent = {
  width: "100%", maxWidth: 520,
  maxHeight: "90vh", overflowY: "auto",
  padding: "28px 22px 36px",
  borderRadius: "28px 28px 0 0",
  background: "rgba(14,12,28,0.97)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderBottom: "none",
  boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
};

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "rgba(196,181,253,0.5)", marginBottom: 7,
  textTransform: "uppercase", letterSpacing: "0.08em",
};

const inputStyle = {
  width: "100%", padding: "13px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#f1f0ff", fontSize: 14,
  fontFamily: "'Outfit', sans-serif",
  marginBottom: 16, outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};
