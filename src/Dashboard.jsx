import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, LineChart, Line,
} from 'recharts';

// ─── FORMATTING HELPERS ──────────────────────────
const fmt = (n) => (n || 0).toLocaleString();
const fmtD = (n, d = 0) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n) => fmtD(n, 1) + '%';
const fmtMoney = (n) => '$' + fmtD(n, 2);

const fmtDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtServiceName = (code) => {
  if (!code) return 'Unknown';
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// ─── BRAND COLORS (matches KPI dashboard) ────────
const B = {
  dark: '#1b6d2f',
  mid: '#2e8b3e',
  lime: '#7cc243',
  light: '#a8d86e',
  rgb: '27,109,47',
  limeRgb: '124,194,67',
};

const CARRIER_COLORS = ['#7cc243', '#a8d86e', '#2e8b3e', '#10b981', '#34d399', '#6ee7b7'];
const GEO_COLORS = ['#7cc243', '#a8d86e', '#2e8b3e', '#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46', '#064e3b'];

// ─── INLINE STYLES ───────────────────────────────
const S = {
  header: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'linear-gradient(135deg, #0a1a0f 0%, #0f2416 100%)',
    borderBottom: `1px solid rgba(${B.rgb},0.2)`,
    padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backdropFilter: 'blur(12px)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoImg: { height: 36, borderRadius: 6 },
  logoText: { fontSize: 18, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' },
  rangeBtn: {
    padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)',
    background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    transition: 'all 0.15s',
  },
  rangeBtnActive: {
    background: `rgba(${B.limeRgb},0.2)`, color: B.lime,
    border: `1px solid rgba(${B.limeRgb},0.4)`,
  },
  kpiRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20, padding: '24px 24px',
  },
  kpiCard: {
    background: 'linear-gradient(135deg, rgba(10,26,15,0.8), rgba(27,109,47,0.15))',
    border: `1px solid rgba(${B.rgb},0.15)`, borderRadius: 14, padding: '28px 28px',
    animation: 'fadeInUp 0.4s ease both',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  kpiCardHover: { transform: 'translateY(-2px)', boxShadow: `0 8px 24px rgba(${B.rgb},0.2)` },
  kpiLabel: { fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 },
  kpiValue: { fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },
  kpiSub: { fontSize: 13, color: '#64748b', marginTop: 8 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: 24, padding: '0 24px 24px',
  },
  card: {
    background: 'linear-gradient(135deg, rgba(10,26,15,0.9), rgba(27,109,47,0.1))',
    border: `1px solid rgba(${B.rgb},0.1)`, borderRadius: 14, overflow: 'hidden',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  cardHover: { transform: 'translateY(-1px)', boxShadow: `0 6px 20px rgba(${B.rgb},0.12)` },
  cardHeader: {
    padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' },
  cardBody: { padding: '16px 24px 24px' },
  tooltip: {
    background: 'rgba(10,26,15,0.95)', border: `1px solid rgba(${B.limeRgb},0.3)`,
    borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e2e8f0',
    backdropFilter: 'blur(8px)',
  },
  badge: {
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  liveBadge: { background: `rgba(${B.limeRgb},0.15)`, color: B.lime },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left', padding: '8px 10px', color: '#94a3b8', fontWeight: 600,
    borderBottom: `1px solid rgba(${B.rgb},0.15)`, fontSize: 10, textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  td: { padding: '8px 10px', borderBottom: `1px solid rgba(${B.rgb},0.08)`, color: '#cbd5e1' },
  statusDot: (color) => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: color, marginRight: 6,
  }),
  loadingOverlay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#0a1a0f', color: '#94a3b8', gap: 16,
  },
  spinner: {
    width: 40, height: 40, border: `3px solid rgba(${B.rgb},0.15)`,
    borderTop: `3px solid ${B.lime}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  progressBar: {
    height: 6, background: `rgba(${B.rgb},0.15)`, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
  },
};

// ─── CUSTOM CHART TOOLTIP ────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={S.tooltip}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: B.lime }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>
            {/cost|spend/i.test(p.name) ? fmtMoney(p.value) : fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── LOADING OVERLAY ─────────────────────────────
function LoadingOverlay({ message }) {
  return (
    <div style={S.loadingOverlay}>
      <div style={S.spinner} />
      <div style={{ fontSize: 14, fontWeight: 500 }}>{message}</div>
    </div>
  );
}

// ─── REUSABLE CARD COMPONENTS ────────────────────
function DashCard({ title, badge, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={S.cardHeader}>
        <span style={S.cardTitle}>{title}</span>
        {badge && <span style={{ ...S.badge, ...S.liveBadge }}>{badge}</span>}
      </div>
      <div style={S.cardBody}>{children}</div>
    </div>
  );
}

function KPICard({ label, value, sub, color, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ ...S.kpiCard, ...(hovered ? S.kpiCardHover : {}), animationDelay: `${delay}ms` }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiValue, color: color || '#e2e8f0' }}>{value}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </div>
  );
}

// ─── CARRIER BREAKDOWN TABLE ─────────────────────
function CarrierTable({ carriers }) {
  if (!carriers || carriers.length === 0) {
    return <div style={{ color: '#64748b', fontSize: 13, padding: 12 }}>No carrier data</div>;
  }
  const totalShipments = carriers.reduce((s, c) => s + c.shipments, 0);
  return (
    <div>
      {carriers.map((c, i) => {
        const pct = totalShipments > 0 ? (c.shipments / totalShipments) * 100 : 0;
        return (
          <div key={c.name} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={S.statusDot(CARRIER_COLORS[i % CARRIER_COLORS.length])} />
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{c.name}</span>
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                <span style={{ fontWeight: 700, color: B.lime }}>{fmt(c.shipments)}</span> shipments ({fmtPct(pct)})
              </span>
            </div>
            <div style={S.progressBar}>
              <div style={{ ...S.progressFill, width: `${pct}%`, background: `linear-gradient(90deg, ${CARRIER_COLORS[i % CARRIER_COLORS.length]}88, ${CARRIER_COLORS[i % CARRIER_COLORS.length]})` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#64748b' }}>
              <span>Total cost: {fmtMoney(c.cost)}</span>
              <span>Avg/shipment: {fmtMoney(c.avgCost)}</span>
            </div>
            {c.services && c.services.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {c.services.map((svc) => (
                  <span key={svc.name} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 6,
                    background: `rgba(${B.limeRgb},0.1)`, color: B.light,
                    border: `1px solid rgba(${B.limeRgb},0.15)`,
                  }}>
                    {fmtServiceName(svc.name)} ({svc.count})
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN DASHBOARD COMPONENT ────────────────────
export default function Dashboard() {
  const [countdown, setCountdown] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Connecting to API...');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [days, setDays] = useState(1);
  const daysRef = useRef(1);

  const REFRESH_INTERVAL = days === 1 ? 15 : 30;

  const loadData = useCallback(async (rangeDays) => {
    setLoading(true);
    setLoadingMsg('Connecting to API...');
    try {
      for (let i = 0; i < 120; i++) {
        const resp = await fetch(`/api/shipping?days=${rangeDays}`);
        if (!resp.ok) throw new Error('API error: ' + resp.status);
        const result = await resp.json();

        if (result.status === 'ready') {
          setData(result.data);
          setLastRefresh(new Date());
          setLoading(false);
          setCountdown(REFRESH_INTERVAL);
          return;
        }

        const phase = result.phase === 'computing' ? 'Computing metrics' : 'Fetching shipping data';
        setLoadingMsg(`${phase}... (${result.elapsed || 0}s)`);
        await new Promise((r) => setTimeout(r, 5000));
      }
      throw new Error('Timed out waiting for data');
    } catch (e) {
      setLoadingMsg(`Error: ${e.message}`);
      setTimeout(() => setLoading(false), 3000);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const resp = await fetch(`/api/shipping?days=${daysRef.current}`);
      if (!resp.ok) return;
      const result = await resp.json();
      if (result.status === 'ready') {
        setData(result.data);
        setLastRefresh(new Date());
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadData(days); }, []);

  const changeRange = useCallback((newDays) => {
    setDays(newDays);
    daysRef.current = newDays;
    loadData(newDays);
  }, [loadData]);

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { silentRefresh(); return REFRESH_INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, silentRefresh, REFRESH_INTERVAL]);

  if (loading) return <LoadingOverlay message={loadingMsg} />;
  if (!data) return <LoadingOverlay message="No data available..." />;

  const k = data.kpi;
  const dailyTrends = (data.dailyTrends || []).map((d) => ({ ...d, name: fmtDateShort(d.date) }));
  const costTrends = (data.costTrends || []).map((d) => ({ ...d, name: fmtDateShort(d.date) }));
  const dowDist = data.dowDistribution || [];
  const carrierBreakdown = data.carrierBreakdown || [];
  const stateBreakdown = (data.stateBreakdown || []).slice(0, 10);
  const topCities = data.topCities || [];
  const carrierPieData = carrierBreakdown.map((c, i) => ({
    name: c.name, value: c.shipments, color: CARRIER_COLORS[i % CARRIER_COLORS.length],
  }));

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: '#0a1a0f', minHeight: '100vh', color: '#e2e8f0' }}>
      {/* ─── HEADER ──────────────────────────────── */}
      <header style={S.header}>
        <div style={S.logo}>
          <img src="/boudreaux-logo.webp" alt="Logo" style={S.logoImg} onError={(e) => { e.target.style.display = 'none'; }} />
          <span style={S.logoText}>Shipping Dashboard</span>
        </div>
        <div style={S.headerRight}>
          {[1, 7, 14, 30, 60, 90].map((r) => (
            <button key={r}
              style={{ ...S.rangeBtn, ...(days === r ? S.rangeBtnActive : {}) }}
              onClick={() => changeRange(r)}>
              {r === 1 ? '1D' : `${r}D`}
            </button>
          ))}
          <span style={{ marginLeft: 8 }}>
            Next refresh: <span style={{ color: B.lime, fontWeight: 700 }}>{countdown}s</span>
          </span>
        </div>
      </header>

      {/* ─── KPI CARDS ───────────────────────────── */}
      <div style={S.kpiRow}>
        <KPICard label="Total Shipments" value={fmt(k.totalShipments)} color={B.lime} delay={0}
          sub={`${fmtD(k.avgShipmentsPerDay, 1)}/day`} />
        <KPICard label="Total Shipping Cost" value={fmtMoney(k.totalCost)} color={B.light} delay={50}
          sub={`${fmtMoney(k.avgDailyCost)}/day`} />
        <KPICard label="Avg Cost / Shipment" value={fmtMoney(k.avgCostPerShipment)} color="#10b981" delay={100} />
        <KPICard label="Ship to Patient" value={fmt(k.shipToPatient)} color="#34d399" delay={150}
          sub={k.totalShipments > 0 ? `${fmtD(k.shipToPatient / k.totalShipments * 100, 1)}% of shipments` : ''} />
        <KPICard label="Ship to Clinic" value={fmt(k.shipToClinic)} color="#f59e0b" delay={200}
          sub={k.totalShipments > 0 ? `${fmtD(k.shipToClinic / k.totalShipments * 100, 1)}% of shipments` : ''} />
      </div>

      {/* ─── CHARTS GRID ─────────────────────────── */}
      <div style={S.grid}>
        {/* Daily Shipment Trends */}
        <DashCard title="Daily Shipment Volume" badge="LIVE">
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={dailyTrends}>
              <defs>
                <linearGradient id="shipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={B.lime} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={B.lime} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${B.rgb},0.08)`} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="shipments" name="Shipments" stroke={B.lime} fill="url(#shipGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </DashCard>

        {/* Daily Cost Trends */}
        <DashCard title="Daily Shipping Spend">
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={costTrends}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${B.rgb},0.08)`} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1).toLocaleString()}`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="cost" name="Daily Spend" stroke="#10b981" fill="url(#costGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </DashCard>

        {/* Shipments per Carrier */}
        <DashCard title="Shipments per Carrier" badge={`${carrierBreakdown.length}`}>
          <div style={{ display: 'flex', gap: 20 }}>
            {carrierPieData.length > 0 && (
              <ResponsiveContainer width="40%" height={300}>
                <PieChart>
                  <Pie data={carrierPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                    {carrierPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div style={{ flex: 1 }}>
              <CarrierTable carriers={carrierBreakdown} />
            </div>
          </div>
        </DashCard>

        {/* Top States */}
        <DashCard title="Shipments by State" badge={`${stateBreakdown.length}`}>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={stateBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${B.rgb},0.08)`} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="shipments" name="Shipments" fill={B.lime} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashCard>

        {/* Top Cities */}
        <DashCard title="Top Destination Cities" badge={`${topCities.length}`}>
          {topCities.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13, padding: 12 }}>No geographic data</div>
          ) : (
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>City</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Shipments</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {topCities.map((c, i) => (
                    <tr key={c.name}>
                      <td style={{ ...S.td, color: '#64748b', width: 30 }}>{i + 1}</td>
                      <td style={{ ...S.td, color: B.lime, fontWeight: 600 }}>{c.name}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmt(c.shipments)}</td>
                      <td style={{ ...S.td, textAlign: 'right', color: '#94a3b8' }}>{fmtMoney(c.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashCard>

        {/* Day-of-Week Distribution */}
        <DashCard title="Volume by Day of Week">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={dowDist}>
              <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${B.rgb},0.08)`} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="shipments" name="Shipments" fill={B.lime} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashCard>
      </div>

      {/* ─── FOOTER ──────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '16px 24px 24px', fontSize: 11, color: '#475569' }}>
        Boudreaux's Pharmacy Shipping Dashboard
        {lastRefresh && ` | Last updated: ${lastRefresh.toLocaleTimeString()}`}
        {data.startDate && ` | Range: ${data.startDate} to ${data.endDate}`}
        {` | ${data.totalDays} day${data.totalDays !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}
