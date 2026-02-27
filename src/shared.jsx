import { useState } from 'react';

// ─── FORMATTING HELPERS ──────────────────────────
export const fmt = (n) => (n || 0).toLocaleString();
export const fmtD = (n, d = 0) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtPct = (n) => fmtD(n, 1) + '%';
export const fmtMoney = (n) => '$' + fmtD(n, 2);

export const fmtDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const fmtServiceName = (code) => {
  if (!code) return 'Unknown';
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// ─── BRAND COLORS (matches KPI dashboard) ────────
export const B = {
  dark: '#1b6d2f',
  mid: '#2e8b3e',
  lime: '#7cc243',
  light: '#a8d86e',
  rgb: '27,109,47',
  limeRgb: '124,194,67',
};

export const CARRIER_COLORS = ['#7cc243', '#a8d86e', '#2e8b3e', '#10b981', '#34d399', '#6ee7b7'];
export const GEO_COLORS = ['#7cc243', '#a8d86e', '#2e8b3e', '#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46', '#064e3b'];

// ─── INLINE STYLES ───────────────────────────────
export const S = {
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

// ─── REUSABLE CARD COMPONENT ────────────────────
export function DashCard({ title, badge, compact, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ ...S.cardHeader, ...(compact ? { padding: '14px 16px 0' } : {}) }}>
        <span style={{ ...S.cardTitle, ...(compact ? { fontSize: 14 } : {}) }}>{title}</span>
        {badge && <span style={{ ...S.badge, ...S.liveBadge }}>{badge}</span>}
      </div>
      <div style={{ ...S.cardBody, ...(compact ? { padding: '12px 16px 16px' } : {}) }}>{children}</div>
    </div>
  );
}
