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

// ─── BRAND COLORS (matches Employee KPI dashboard) ────────
export const B = {
  dark: '#1a7f37',
  mid: '#2da44e',
  lime: '#4caf62',
  light: '#82d694',
  rgb: '26,127,55',
  limeRgb: '45,164,78',
};

export const CARRIER_COLORS = ['#4caf62', '#82d694', '#2da44e', '#10b981', '#34d399', '#6ee7b7'];
export const GEO_COLORS = ['#4caf62', '#82d694', '#2da44e', '#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46', '#064e3b'];

// ─── INLINE STYLES ───────────────────────────────
export const S = {
  header: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'linear-gradient(135deg, #ffffff 0%, #f0faf3 100%)',
    borderBottom: '1px solid #d1e7d8',
    padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backdropFilter: 'blur(12px)', flexWrap: 'wrap', gap: 12,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoImg: { height: 44, width: 'auto', objectFit: 'contain' },
  logoText: { fontSize: 18, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.02em' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#5a6b72', flexWrap: 'wrap' },
  rangeBtn: {
    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
    border: '1px solid #c6ddd0', color: '#1a7f37',
    background: '#f0faf3',
  },
  rangeBtnActive: {
    background: B.mid, border: `1px solid ${B.mid}`,
    color: '#ffffff', boxShadow: `0 0 12px rgba(${B.limeRgb},0.25)`,
  },
  kpiRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16, padding: '0 28px', marginTop: 24,
  },
  kpiCard: {
    background: '#ffffff',
    borderRadius: 14, border: '1px solid #e2ebe6',
    padding: '20px 24px', transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    animation: 'fadeInUp 0.5s ease forwards',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  kpiCardHover: {
    border: '1px solid #b4dfc2',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  },
  kpiLabel: {
    fontSize: 12, fontWeight: 600, color: '#6b7c85',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
  },
  kpiValue: { fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 },
  kpiSub: { fontSize: 12, color: '#6b7c85', marginTop: 8 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: 20, padding: '24px 28px',
  },
  card: {
    background: '#ffffff',
    borderRadius: 14, border: '1px solid #e2ebe6',
    overflow: 'hidden', transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    position: 'relative', animation: 'fadeInUp 0.5s ease forwards',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardHover: {
    border: '1px solid #b4dfc2',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 22px 8px',
  },
  cardTitle: {
    fontSize: 13, fontWeight: 600, color: '#5a6b72',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  cardBody: { padding: '8px 14px 18px' },
  tooltip: {
    background: '#ffffff',
    border: '1px solid #d1e7d8',
    borderRadius: 8, padding: '8px 12px', fontSize: 12,
    color: '#1e293b', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  liveBadge: {
    background: '#e6f9ec',
    border: '1px solid #b4dfc2', color: '#1a7f37',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left', padding: '8px 10px', color: '#6b7c85', fontWeight: 700,
    borderBottom: '1px solid #e8f0eb', fontSize: 10, textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  td: { padding: '8px 10px', borderBottom: '1px solid #e8f0eb', color: '#334155' },
  statusDot: (color) => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: color, marginRight: 6,
  }),
  loadingOverlay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#f8faf9', color: '#5a6b72', gap: 16,
  },
  spinner: {
    width: 40, height: 40, border: '3px solid #e2ebe6',
    borderTop: `3px solid ${B.mid}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  progressBar: {
    width: '100%', height: 6, background: '#e8f0eb',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 3,
    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
  },
};

// ─── REUSABLE CARD COMPONENT ────────────────────
export function DashCard({ title, badge, compact, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ ...S.cardHeader, ...(compact ? { padding: '14px 16px 0' } : {}) }}>
        <span style={{ ...S.cardTitle, ...(compact ? { fontSize: 12 } : {}) }}>{title}</span>
        {badge && <span style={{ ...S.badge, ...S.liveBadge }}>{badge}</span>}
      </div>
      <div style={{ ...S.cardBody, ...(compact ? { padding: '8px 14px 14px' } : {}) }}>{children}</div>
    </div>
  );
}
