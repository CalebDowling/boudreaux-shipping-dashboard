import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import useIsMobile from './useIsMobile';
import { B, S, CARRIER_COLORS, fmt, fmtD, fmtPct, fmtMoney, fmtDateShort } from './shared.jsx';

const ChartsGrid = lazy(() => import('./ChartsGrid'));

// ─── LOADING OVERLAY ─────────────────────────────
function LoadingOverlay({ message }) {
  return (
    <div style={S.loadingOverlay}>
      <div style={S.spinner} />
      <div style={{ fontSize: 14, fontWeight: 500 }}>{message}</div>
    </div>
  );
}

// ─── KPI CARD ────────────────────────────────────
function KPICard({ label, value, sub, color, delay = 0, compact }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      ...S.kpiCard,
      ...(hovered ? S.kpiCardHover : {}),
      ...(compact ? { padding: '16px 14px' } : {}),
      animationDelay: `${delay}ms`,
    }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ ...S.kpiLabel, ...(compact ? { fontSize: 11, marginBottom: 6 } : {}) }}>{label}</div>
      <div style={{ ...S.kpiValue, color: color || '#1e293b', ...(compact ? { fontSize: 24 } : {}) }}>{value}</div>
      {sub && <div style={{ ...S.kpiSub, ...(compact ? { fontSize: 11, marginTop: 4 } : {}) }}>{sub}</div>}
    </div>
  );
}

// ─── CHARTS SKELETON FALLBACK ────────────────────
function ChartsSkeleton({ isMobile }) {
  const skeletonCard = {
    ...S.card,
    minHeight: isMobile ? 280 : 400,
  };
  const shimmer = {
    background: `linear-gradient(90deg, #e8f0eb 25%, #d1e7d8 50%, #e8f0eb 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
    borderRadius: 8,
  };
  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={skeletonCard}>
          <div style={{ ...S.cardHeader }}>
            <div style={{ ...shimmer, width: 160, height: 16 }} />
            <div style={{ ...shimmer, width: 40, height: 16 }} />
          </div>
          <div style={{ ...S.cardBody }}>
            <div style={{ ...shimmer, width: '100%', height: isMobile ? 200 : 300 }} />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── MAIN DASHBOARD COMPONENT ────────────────────
export default function Dashboard() {
  const isMobile = useIsMobile();
  const [countdown, setCountdown] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Connecting to API...');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [days, setDays] = useState(1);
  const [customDate, setCustomDate] = useState('');
  const dateRef = useRef(null);
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
    setCustomDate('');
    daysRef.current = newDays;
    loadData(newDays);
  }, [loadData]);

  const handleDatePick = useCallback((dateStr) => {
    if (!dateStr) return;
    const picked = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.max(1, Math.round((today - picked) / 86400000) + 1);
    setCustomDate(dateStr);
    setDays(diff);
    daysRef.current = diff;
    loadData(diff);
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
  const statusBreakdown = data.statusBreakdown || [];
  const hourDistribution = data.hourDistribution || [];
  const patientFrequency = data.patientFrequency || [];
  const weeklyCostTrends = (data.weeklyCostTrends || []).map(d => ({ ...d, name: fmtDateShort(d.date) }));

  const chartHeight = isMobile ? 220 : 340;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: '#f8faf9', minHeight: '100vh', color: '#1e293b' }}>
      {/* ─── HEADER ──────────────────────────────── */}
      <header style={{
        ...S.header,
        ...(isMobile ? {
          flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: '10px 12px',
        } : {}),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={S.logo}>
            <img src="/boudreaux-logo.webp" alt="Logo" style={S.logoImg} onError={(e) => { e.target.style.display = 'none'; }} />
            <span style={S.logoText}>Shipping Dashboard</span>
          </div>
          {isMobile && (
            <span style={{ fontSize: 12, color: '#5a6b72' }}>
              <span style={{ color: B.mid, fontWeight: 700 }}>{countdown}s</span>
            </span>
          )}
        </div>
        <div style={{
          ...S.headerRight,
          ...(isMobile ? { display: 'flex', gap: 0 } : {}),
        }}>
          {[1, 7, 30].map((r, i, arr) => (
            <button key={r}
              style={{
                ...S.rangeBtn,
                ...(!customDate && days === r ? S.rangeBtnActive : {}),
                ...(isMobile ? { flex: 1, padding: '8px 4px', borderRadius: 0, minHeight: 44, fontSize: 13 } : {}),
                ...(isMobile && i === 0 ? { borderRadius: '6px 0 0 6px' } : {}),
              }}
              onClick={() => changeRange(r)}>
              {r === 1 ? '1D' : `${r}D`}
            </button>
          ))}
          {/* Calendar date picker */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              style={{
                ...S.rangeBtn,
                ...(customDate ? S.rangeBtnActive : {}),
                ...(isMobile ? { flex: 'none', padding: '8px 10px', borderRadius: '0 6px 6px 0', minHeight: 44, fontSize: 16 } : {}),
                display: 'flex', alignItems: 'center', gap: 4,
              }}
              onClick={() => dateRef.current?.showPicker?.()}
              title="Pick a start date"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
                <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
                <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="1.3" />
                <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {customDate && !isMobile && (
                <span style={{ fontSize: 11, fontWeight: 600 }}>
                  {new Date(customDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </button>
            <input
              ref={dateRef}
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={customDate}
              onChange={(e) => handleDatePick(e.target.value)}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer', pointerEvents: 'none',
              }}
            />
          </div>
          {!isMobile && (
            <span style={{ marginLeft: 8 }}>
              Next refresh: <span style={{ color: B.mid, fontWeight: 700 }}>{countdown}s</span>
            </span>
          )}
        </div>
      </header>

      {/* ─── KPI CARDS ───────────────────────────── */}
      <div style={{
        ...S.kpiRow,
        ...(isMobile ? {
          gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '12px 12px',
        } : {}),
      }}>
        <KPICard compact={isMobile} label="Total Shipments" value={fmt(k.totalShipments)} color={B.dark} delay={0}
          sub={`${fmtD(k.avgShipmentsPerDay, 1)}/day`} />
        <KPICard compact={isMobile} label="Total Shipping Cost" value={fmtMoney(k.totalCost)} color={B.mid} delay={50}
          sub={`${fmtMoney(k.avgDailyCost)}/day`} />
        <KPICard compact={isMobile} label="Avg Cost / Shipment" value={fmtMoney(k.avgCostPerShipment)} color="#059669" delay={100} />
        <KPICard compact={isMobile} label="Ship to Patient" value={fmt(k.shipToPatient)} color={B.lime} delay={150}
          sub={k.totalShipments > 0 ? `${fmtD(k.shipToPatient / k.totalShipments * 100, 1)}% of shipments` : ''} />
        <KPICard compact={isMobile} label="Ship to Clinic" value={fmt(k.shipToClinic)} color="#d97706" delay={200}
          sub={k.totalShipments > 0 ? `${fmtD(k.shipToClinic / k.totalShipments * 100, 1)}% of shipments` : ''} />
        <KPICard compact={isMobile} label="Avg Order-to-Ship" value={`${fmtD(k.avgLagDays, 1)} days`} color="#059669" delay={250}
          sub={(() => {
            const ld = data.lagDistribution;
            if (!ld || !ld.length) return '';
            const top = ld.reduce((a, b) => b.count > a.count ? b : a, ld[0]);
            const total = ld.reduce((s, b) => s + b.count, 0);
            return total > 0 ? `${fmtD(top.count / total * 100, 0)}% ${top.name.toLowerCase()}` : '';
          })()} />
      </div>

      {/* ─── KPI ROW 2: DELIVERY & PROCESSING ──────── */}
      <div style={{
        ...S.kpiRow,
        ...(isMobile ? {
          gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '12px 12px',
        } : { marginTop: 16 }),
      }}>
        <KPICard compact={isMobile} label="Delivery Success Rate" value={fmtPct(k.deliverySuccessRate)} color="#10b981" delay={300}
          sub={`${fmt(k.totalDeliveries)} total deliveries`} />
        <KPICard compact={isMobile} label="Avg Turnaround" value={`${fmtD(k.avgDeliveryTurnaroundHours, 1)} hrs`} color={B.mid} delay={350} />
        <KPICard compact={isMobile} label="Same-Day Processing" value={fmtPct(k.sameDayProcessingRate)} color={B.lime} delay={400}
          sub="of orders ship same day" />
        <KPICard compact={isMobile} label="Unique Patients" value={fmt(k.uniquePatients)} color={B.dark} delay={450}
          sub={(() => {
            const pf = patientFrequency;
            if (!pf.length) return '';
            const top = pf.reduce((a, b) => b.count > a.count ? b : a, pf[0]);
            return `${fmt(top.count)} with ${top.name.toLowerCase()}`;
          })()} />
      </div>

      {/* ─── CHARTS GRID (lazy-loaded) ────────────── */}
      <div style={{
        ...S.grid,
        ...(isMobile ? {
          gridTemplateColumns: '1fr', gap: 12, padding: '0 12px 12px',
        } : {}),
      }}>
        <Suspense fallback={<ChartsSkeleton isMobile={isMobile} />}>
          <ChartsGrid
            dailyTrends={dailyTrends}
            costTrends={costTrends}
            weeklyCostTrends={weeklyCostTrends}
            carrierBreakdown={carrierBreakdown}
            carrierPieData={carrierPieData}
            stateBreakdown={stateBreakdown}
            topCities={topCities}
            dowDist={dowDist}
            lagDistribution={data.lagDistribution || []}
            statusBreakdown={statusBreakdown}
            hourDistribution={hourDistribution}
            patientFrequency={patientFrequency}
            isMobile={isMobile}
            chartHeight={chartHeight}
          />
        </Suspense>
      </div>

      {/* ─── FOOTER ──────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: isMobile ? '12px 12px 16px' : '16px 24px 24px', fontSize: 11, color: '#6b7c85' }}>
        Boudreaux's Pharmacy Shipping Dashboard
        {lastRefresh && ` | Last updated: ${lastRefresh.toLocaleTimeString()}`}
        {data.startDate && ` | Range: ${data.startDate} to ${data.endDate}`}
        {` | ${data.totalDays} day${data.totalDays !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}
