require('dotenv').config();
const express = require('express');
const path = require('path');
const DRXClient = require('./server/drxClient');
const ShippingMetrics = require('./server/shippingMetrics');

const app = express();
const PORT = process.env.PORT || 3500;

const drx = new DRXClient();
const metrics = new ShippingMetrics(drx);

// ─── SMART CACHING ──────────────────────────────
const cache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const fetching = {};

function getRangeParams(days) {
  const now = new Date();
  const centralDate = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const endDate = centralDate(now);
  const start = new Date(now.getTime() - (days - 1) * 86400000);
  const startDate = centralDate(start);
  return { startDate, endDate, rangeKey: `${startDate}_${endDate}` };
}

async function fetchInBackground(days) {
  const { startDate, endDate, rangeKey } = getRangeParams(days);

  if (fetching[rangeKey]) return;
  fetching[rangeKey] = { startedAt: Date.now(), status: 'fetching' };

  try {
    console.log(`\n[${new Date().toLocaleTimeString()}] Fetching shipping data for ${startDate} to ${endDate}...`);

    const [shipments, deliveries, routes] = await Promise.all([
      drx.fetchShipmentsInRange(startDate, endDate),
      drx.fetchDeliveriesInRange(startDate, endDate),
      drx.fetchDeliveryRoutes(),
    ]);

    fetching[rangeKey].status = 'computing';
    const data = await metrics.compute(shipments, deliveries, routes, startDate, endDate);
    cache[rangeKey] = { data, timestamp: Date.now() };

    console.log(`[${new Date().toLocaleTimeString()}] Shipping data cached for ${rangeKey}`);
  } catch (e) {
    console.error(`[${new Date().toLocaleTimeString()}] Error fetching shipping data:`, e.message);
    fetching[rangeKey].status = 'error';
    fetching[rangeKey].error = e.message;
  } finally {
    delete fetching[rangeKey];
  }
}

// ─── PRE-WARM CACHE ─────────────────────────────
setTimeout(() => fetchInBackground(1), 1000);

// ─── SERVE STATIC SPA ───────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// ─── NON-BLOCKING API ENDPOINT ──────────────────
app.get('/api/shipping', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const { rangeKey } = getRangeParams(days);

  // Return cached if fresh
  const cached = cache[rangeKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ status: 'ready', data: cached.data });
  }

  // Check if fetch already running
  const job = fetching[rangeKey];
  if (job) {
    return res.json({
      status: 'loading',
      phase: job.status,
      elapsed: Math.round((Date.now() - job.startedAt) / 1000),
    });
  }

  // Kick off background fetch and respond immediately
  fetchInBackground(days);
  res.json({ status: 'loading', phase: 'fetching', elapsed: 0 });
});

// ─── SPA FALLBACK ───────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Shipping Dashboard running at http://localhost:${PORT}`);
});
