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
      <div style={{ fontWeight: 700, marginBottom: 4, color: B.dark }}>{label}</div>
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
    return <div style={{ color: '#6b7c85', fontSize: 13, padding: 12 }}>No carrier data</div>;
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
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{c.name}</span>
              </div>
              <span style={{ fontSize: 12, color: '#6b7c85' }}>
                <span style={{ fontWeight: 700, color: B.dark }}>{fmt(c.shipments)}</span> shipments ({fmtPct(pct)})
              </span>
            </div>
            <div style={S.progressBar}>
              <div style={{ ...S.progressFill, width: `${pct}%`, background: `linear-gradient(90deg, ${CARRIER_COLORS[i % CARRIER_COLORS.length]}88, ${CARRIER_COLORS[i % CARRIER_COLORS.length]})` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#6b7c85' }}>
              <span>Total cost: {fmtMoney(c.cost)}</span>
              <span>Avg/shipment: {fmtMoney(c.avgCost)}</span>
            </div>
            {c.services && c.services.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {c.services.map((svc) => (
                  <span key={svc.name} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 6,
                    background: '#e6f9ec', color: B.dark,
                    border: '1px solid #b4dfc2',
                  }}>
                    {fmtServiceName(svc.name)} ({svc.count}){svc.avgCost !== undefined ? ` · ${fmtMoney(svc.avgCost)}/ea` : ''}
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
export default function ChartsGrid({ dailyTrends, costTrends, weeklyCostTrends, carrierBreakdown, carrierPieData, stateBreakdown, topCities, dowDist, lagDistribution, statusBreakdown, hourDistribution, patientFrequency, isMobile, chartHeight }) {
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0eb" />
            <XAxis dataKey="name" tick={{ fill: '#6b7c85', fontSize: 10 }}
              angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
            <YAxis tick={{ fill: '#6b7c85', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="shipments" name="Shipments" stroke={B.lime} fill="url(#shipGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </DashCard>

      {/* Daily Shipping Spend */}
      <DashCard title="Daily Shipping Spend" compact={isMobile}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={costTrends}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0eb" />
            <XAxis dataKey="name" tick={{ fill: '#6b7c85', fontSize: 10 }}
              angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
            <YAxis tick={{ fill: '#6b7c85', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1).toLocaleString()}`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="cost" name="Daily Spend" stroke="#10b981" fill="url(#costGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </DashCard>

      {/* Delivery Status Breakdown */}
      {statusBreakdown.some(s => s.value > 0) && (
        <DashCard title="Delivery Status Breakdown" compact={isMobile}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={isMobile ? 40 : 60} outerRadius={isMobile ? 80 : 110} paddingAngle={3} strokeWidth={0}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </DashCard>
      )}

      {/* Weekly Cost Trend */}
      {weeklyCostTrends && weeklyCostTrends.length > 1 && (
        <DashCard title="Weekly Cost Trend" compact={isMobile}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={weeklyCostTrends}>
              <defs>
                <linearGradient id="weekCostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0eb" />
              <XAxis dataKey="name" tick={{ fill: '#6b7c85', fontSize: 10 }}
                angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
              <YAxis tick={{ fill: '#6b7c85', fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="cost" name="Weekly Spend" stroke="#059669" fill="url(#weekCostGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </DashCard>
      )}

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
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0eb" />
            <XAxis dataKey="name" tick={{ fill: '#6b7c85', fontSize: 11 }}
              angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
            <YAxis yAxisId="left" tick={{ fill: '#6b7c85', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#059669', fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip content={<ChartTooltip />} />
            <Bar yAxisId="left" dataKey="shipments" name="Shipments" fill={B.lime} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="avgCost" name="Avg Cost" fill="#059669" radius={[4, 4, 0, 0]} opacity={0.6} />
          </BarChart>
        </ResponsiveContainer>
      </DashCard>

      {/* Peak Hour Distribution */}
      {hourDistribution && hourDistribution.some(h => h.count > 0) && (
        <DashCard title="Peak Hour Distribution" compact={isMobile}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={hourDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0eb" />
              <XAxis dataKey="name" tick={{ fill: '#6b7c85', fontSize: 9 }}
                angle={isMobile ? -45 : -45} textAnchor="end" height={50} interval={isMobile ? 2 : 1} />
              <YAxis tick={{ fill: '#6b7c85', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Shipments" fill={B.mid} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashCard>
      )}

      {/* Top Cities */}
      <DashCard title="Top Destination Cities" badge={`${topCities.length}`} compact={isMobile}>
        {topCities.length === 0 ? (
          <div style={{ color: '#6b7c85', fontSize: 13, padding: 12 }}>No geographic data</div>
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
                    <td style={{ ...S.td, color: '#6b7c85', width: 30 }}>{i + 1}</td>
                    <td style={{ ...S.td, color: B.dark, fontWeight: 600 }}>{c.name}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmt(c.shipments)}</td>
                    <td style={{ ...S.td, textAlign: 'right', color: '#6b7c85' }}>{fmtMoney(c.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>

      {/* Order-to-Ship Lag Distribution */}
      {lagDistribution.length > 0 && (
        <DashCard title="Order-to-Ship Time" compact={isMobile}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={lagDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0eb" />
              <XAxis type="number" tick={{ fill: '#6b7c85', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#6b7c85', fontSize: 11 }} width={80} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Shipments" fill={B.mid} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashCard>
      )}

      {/* Patient Shipping Frequency */}
      {patientFrequency && patientFrequency.some(p => p.count > 0) && (
        <DashCard title="Patient Shipping Frequency" compact={isMobile}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={patientFrequency} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0eb" />
              <XAxis type="number" tick={{ fill: '#6b7c85', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#6b7c85', fontSize: 11 }} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Patients" fill={B.lime} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashCard>
      )}

      {/* Day-of-Week Distribution */}
      <DashCard title="Volume by Day of Week" compact={isMobile}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={dowDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0eb" />
            <XAxis dataKey="name" tick={{ fill: '#6b7c85', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7c85', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="shipments" name="Shipments" fill={B.lime} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </DashCard>
    </>
  );
}
