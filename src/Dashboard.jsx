import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import useIsMobile from './useIsMobile';
import { B, S, CARRIER_COLORS, fmt, fmtD, fmtMoney, fmtDateShort } from './shared.jsx';

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
      <div style={{ ...S.kpiValue, color: color || '#e2e8f0', ...(compact ? { fontSize: 24 } : {}) }}>{value}</div>
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
    background: `linear-gradient(90deg, rgba(${B.rgb},0.05) 25%, rgba(${B.rgb},0.12) 50%, rgba(${B.rgb},0.05) 75%)`,
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

  const chartHeight = isMobile ? 220 : 340;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: '#0a1a0f', minHeight: '100vh', color: '#e2e8f0' }}>
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
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              <span style={{ color: B.lime, fontWeight: 700 }}>{countdown}s</span>
            </span>
          )}
        </div>
        <div style={{
          ...S.headerRight,
          ...(isMobile ? { display: 'flex', gap: 0 } : {}),
        }}>
          {[1, 7, 14, 30, 60, 90].map((r) => (
            <button key={r}
              style={{
                ...S.rangeBtn,
                ...(days === r ? S.rangeBtnActive : {}),
                ...(isMobile ? { flex: 1, padding: '8px 4px', borderRadius: 0, minHeight: 44, fontSize: 13 } : {}),
                ...(isMobile && r === 1 ? { borderRadius: '6px 0 0 6px' } : {}),
                ...(isMobile && r === 90 ? { borderRadius: '0 6px 6px 0' } : {}),
              }}
              onClick={() => changeRange(r)}>
              {r === 1 ? '1D' : `${r}D`}
            </button>
          ))}
          {!isMobile && (
            <span style={{ marginLeft: 8 }}>
              Next refresh: <span style={{ color: B.lime, fontWeight: 700 }}>{countdown}s</span>
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
        <KPICard compact={isMobile} label="Total Shipments" value={fmt(k.totalShipments)} color={B.lime} delay={0}
          sub={`${fmtD(k.avgShipmentsPerDay, 1)}/day`} />
        <KPICard compact={isMobile} label="Total Shipping Cost" value={fmtMoney(k.totalCost)} color={B.light} delay={50}
          sub={`${fmtMoney(k.avgDailyCost)}/day`} />
        <KPICard compact={isMobile} label="Avg Cost / Shipment" value={fmtMoney(k.avgCostPerShipment)} color="#10b981" delay={100} />
        <KPICard compact={isMobile} label="Ship to Patient" value={fmt(k.shipToPatient)} color="#34d399" delay={150}
          sub={k.totalShipments > 0 ? `${fmtD(k.shipToPatient / k.totalShipments * 100, 1)}% of shipments` : ''} />
        <KPICard compact={isMobile} label="Ship to Clinic" value={fmt(k.shipToClinic)} color="#f59e0b" delay={200}
          sub={k.totalShipments > 0 ? `${fmtD(k.shipToClinic / k.totalShipments * 100, 1)}% of shipments` : ''} />
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
            carrierBreakdown={carrierBreakdown}
            carrierPieData={carrierPieData}
            stateBreakdown={stateBreakdown}
            topCities={topCities}
            dowDist={dowDist}
            isMobile={isMobile}
            chartHeight={chartHeight}
          />
        </Suspense>
      </div>

      {/* ─── FOOTER ──────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: isMobile ? '12px 12px 16px' : '16px 24px 24px', fontSize: 11, color: '#475569' }}>
        Boudreaux's Pharmacy Shipping Dashboard
        {lastRefresh && ` | Last updated: ${lastRefresh.toLocaleTimeString()}`}
        {data.startDate && ` | Range: ${data.startDate} to ${data.endDate}`}
        {` | ${data.totalDays} day${data.totalDays !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}
