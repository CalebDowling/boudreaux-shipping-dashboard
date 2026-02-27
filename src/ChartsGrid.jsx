import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { B, S, CARRIER_COLORS, fmt, fmtMoney, fmtPct, fmtServiceName, DashCard } from './shared.jsx';

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

// ─── CHARTS GRID ─────────────────────────────────
export default function ChartsGrid({ dailyTrends, costTrends, carrierBreakdown, carrierPieData, stateBreakdown, topCities, dowDist, isMobile, chartHeight }) {
  return (
    <>
      {/* Daily Shipment Trends */}
      <DashCard title="Daily Shipment Volume" badge="LIVE" compact={isMobile}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={dailyTrends}>
            <defs>
              <linearGradient id="shipGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={B.lime} stopOpacity={0.3} />
                <stop offset="95%" stopColor={B.lime} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${B.rgb},0.08)`} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }}
              angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="shipments" name="Shipments" stroke={B.lime} fill="url(#shipGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </DashCard>

      {/* Daily Cost Trends */}
      <DashCard title="Daily Shipping Spend" compact={isMobile}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={costTrends}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${B.rgb},0.08)`} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }}
              angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1).toLocaleString()}`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="cost" name="Daily Spend" stroke="#10b981" fill="url(#costGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </DashCard>

      {/* Shipments per Carrier */}
      <DashCard title="Shipments per Carrier" badge={`${carrierBreakdown.length}`} compact={isMobile}>
        <div style={{ display: 'flex', gap: 20, ...(isMobile ? { flexDirection: 'column', gap: 12 } : {}) }}>
          {carrierPieData.length > 0 && (
            <ResponsiveContainer width={isMobile ? '100%' : '40%'} height={isMobile ? 200 : 300}>
              <PieChart>
                <Pie data={carrierPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={isMobile ? 35 : 45} outerRadius={isMobile ? 65 : 75} paddingAngle={3} strokeWidth={0}>
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
      <DashCard title="Shipments by State" badge={`${stateBreakdown.length}`} compact={isMobile}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={stateBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${B.rgb},0.08)`} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }}
              angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="shipments" name="Shipments" fill={B.lime} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </DashCard>

      {/* Top Cities */}
      <DashCard title="Top Destination Cities" badge={`${topCities.length}`} compact={isMobile}>
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
      <DashCard title="Volume by Day of Week" compact={isMobile}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={dowDist}>
            <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${B.rgb},0.08)`} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="shipments" name="Shipments" fill={B.lime} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </DashCard>
    </>
  );
}
