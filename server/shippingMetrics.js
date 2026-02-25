class ShippingMetrics {
  constructor(drxClient) {
    this.drx = drxClient;
  }

  async compute(shipments, deliveries, routes, startDate, endDate) {
    console.log(`  Computing shipping metrics for ${startDate} to ${endDate}...`);
    console.log(`  Raw data: ${shipments.length} shipments, ${deliveries.length} deliveries, ${routes.length} routes`);

    // ─── DATE RANGE INFO ────────────────────────
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));

    // ─── SHIPMENT METRICS ───────────────────────
    const totalShipments = shipments.length;
    const shipmentPatients = new Set();
    const shipmentsByDay = {};
    const shipmentsByDow = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat

    let shipToPatient = 0;
    let shipToClinic = 0;

    for (const s of shipments) {
      if (s.patient_id) shipmentPatients.add(s.patient_id);

      // Clinics are set up as patients with "Co." prefix in first_name
      const firstName = (s.patient && s.patient.first_name) || '';
      if (firstName.startsWith('Co.')) {
        shipToClinic++;
      } else {
        shipToPatient++;
      }

      const dateStr = this._extractDate(s.created_at || s.shipped_at);
      if (dateStr) {
        shipmentsByDay[dateStr] = (shipmentsByDay[dateStr] || 0) + 1;
        const dow = new Date(dateStr + 'T00:00:00').getDay();
        shipmentsByDow[dow]++;
      }
    }

    // ─── DELIVERY METRICS ───────────────────────
    const totalDeliveries = deliveries.length;
    const completed = deliveries.filter((d) => d.completed_at);
    const refused = deliveries.filter((d) => d.refused_at);
    const pending = deliveries.filter((d) => !d.completed_at && !d.refused_at);

    const completionRate = totalDeliveries > 0 ? (completed.length / totalDeliveries) * 100 : 0;
    const refusalRate = totalDeliveries > 0 ? (refused.length / totalDeliveries) * 100 : 0;

    const deliveryPatients = new Set();
    const deliveriesByDay = {};
    const deliveriesByDow = [0, 0, 0, 0, 0, 0, 0];

    for (const d of deliveries) {
      if (d.patient_id) deliveryPatients.add(d.patient_id);

      const dateStr = this._extractDate(d.delivery_on || d.created_at);
      if (dateStr) {
        deliveriesByDay[dateStr] = (deliveriesByDay[dateStr] || 0) + 1;
        const dow = new Date(dateStr + 'T00:00:00').getDay();
        deliveriesByDow[dow]++;
      }
    }

    // ─── COMBINED UNIQUE PATIENTS ───────────────
    const allPatients = new Set([...shipmentPatients, ...deliveryPatients]);

    // ─── DAILY TRENDS ───────────────────────────
    const allDates = new Set([...Object.keys(shipmentsByDay), ...Object.keys(deliveriesByDay)]);
    const dailyTrends = Array.from(allDates)
      .sort()
      .map((date) => ({
        date,
        shipments: shipmentsByDay[date] || 0,
        deliveries: deliveriesByDay[date] || 0,
        total: (shipmentsByDay[date] || 0) + (deliveriesByDay[date] || 0),
      }));

    // ─── DELIVERY STATUS BREAKDOWN ──────────────
    const statusBreakdown = [
      { name: 'Completed', value: completed.length, color: '#10b981' },
      { name: 'Pending', value: pending.length, color: '#f59e0b' },
      { name: 'Refused', value: refused.length, color: '#ef4444' },
    ];

    // ─── ROUTE BREAKDOWN ────────────────────────
    const routeMap = {};
    for (const d of deliveries) {
      const routeName = d.route || 'Unassigned';
      if (!routeMap[routeName]) {
        routeMap[routeName] = { name: routeName, total: 0, completed: 0, pending: 0, refused: 0 };
      }
      routeMap[routeName].total++;
      if (d.completed_at) routeMap[routeName].completed++;
      else if (d.refused_at) routeMap[routeName].refused++;
      else routeMap[routeName].pending++;
    }
    const routeBreakdown = Object.values(routeMap).sort((a, b) => b.total - a.total);

    // ─── DAY-OF-WEEK DISTRIBUTION ───────────────
    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowDistribution = dowNames.map((name, i) => ({
      name,
      shipments: shipmentsByDow[i],
      deliveries: deliveriesByDow[i],
      total: shipmentsByDow[i] + deliveriesByDow[i],
    }));

    // ─── CARRIER BREAKDOWN ──────────────────────
    const carrierMap = {};
    for (const s of shipments) {
      const carrier = (s.carrier_code || 'unknown').toUpperCase();
      const service = s.service_code || 'unknown';
      if (!carrierMap[carrier]) {
        carrierMap[carrier] = { name: carrier, shipments: 0, cost: 0, services: {} };
      }
      carrierMap[carrier].shipments++;
      carrierMap[carrier].cost += s.shipment_cost || 0;
      carrierMap[carrier].services[service] = (carrierMap[carrier].services[service] || 0) + 1;
    }
    const carrierBreakdown = Object.values(carrierMap)
      .map((c) => ({
        ...c,
        avgCost: c.shipments > 0 ? c.cost / c.shipments : 0,
        services: Object.entries(c.services)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.shipments - a.shipments);

    // ─── SHIPPING COSTS ─────────────────────────
    let totalCost = 0;
    const costByDay = {};
    for (const s of shipments) {
      const cost = s.shipment_cost || 0;
      totalCost += cost;
      const dateStr = this._extractDate(s.created_at || s.ship_date);
      if (dateStr) {
        if (!costByDay[dateStr]) costByDay[dateStr] = { cost: 0, count: 0 };
        costByDay[dateStr].cost += cost;
        costByDay[dateStr].count++;
      }
    }
    const avgCostPerShipment = totalShipments > 0 ? totalCost / totalShipments : 0;
    const avgDailyCost = totalDays > 0 ? totalCost / totalDays : 0;

    // Cost trends (merge into daily trends)
    const costTrends = Array.from(new Set([...Object.keys(shipmentsByDay), ...Object.keys(costByDay)]))
      .sort()
      .map((date) => ({
        date,
        name: date,
        cost: costByDay[date]?.cost || 0,
        shipments: shipmentsByDay[date] || 0,
        avgCost: costByDay[date] ? costByDay[date].cost / costByDay[date].count : 0,
      }));

    // ─── GEOGRAPHIC BREAKDOWN ─────────────────────
    const stateMap = {};
    const cityMap = {};
    for (const s of shipments) {
      const addr = s.address;
      if (!addr) continue;

      const state = (addr.state || '').toUpperCase().trim();
      if (state) {
        if (!stateMap[state]) stateMap[state] = { name: state, shipments: 0, cost: 0 };
        stateMap[state].shipments++;
        stateMap[state].cost += s.shipment_cost || 0;
      }

      const city = (addr.city || '').trim();
      if (city && state) {
        const cityKey = `${city}, ${state}`;
        if (!cityMap[cityKey]) cityMap[cityKey] = { name: cityKey, shipments: 0, cost: 0 };
        cityMap[cityKey].shipments++;
        cityMap[cityKey].cost += s.shipment_cost || 0;
      }
    }
    const stateBreakdown = Object.values(stateMap)
      .sort((a, b) => b.shipments - a.shipments);
    const topCities = Object.values(cityMap)
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 20);

    // ─── SHIP DATE vs CREATED DATE LAG ────────────
    const lagBuckets = { '0': 0, '1': 0, '2': 0, '3+': 0 };
    let totalLagDays = 0;
    let lagCount = 0;
    for (const s of shipments) {
      if (!s.ship_date || !s.created_at) continue;
      const created = new Date(s.created_at);
      const shipped = new Date(s.ship_date + 'T00:00:00');
      const lagMs = shipped.getTime() - created.getTime();
      // created_at can be after ship_date if label was made same day but timestamped later
      const lagDays = Math.max(0, Math.round(lagMs / 86400000));
      totalLagDays += lagDays;
      lagCount++;
      if (lagDays === 0) lagBuckets['0']++;
      else if (lagDays === 1) lagBuckets['1']++;
      else if (lagDays === 2) lagBuckets['2']++;
      else lagBuckets['3+']++;
    }
    const avgLagDays = lagCount > 0 ? totalLagDays / lagCount : 0;
    const lagDistribution = [
      { name: 'Same Day', value: lagBuckets['0'] },
      { name: '1 Day', value: lagBuckets['1'] },
      { name: '2 Days', value: lagBuckets['2'] },
      { name: '3+ Days', value: lagBuckets['3+'] },
    ];

    // ─── RETURN COMPLETE METRICS ────────────────
    return {
      startDate,
      endDate,
      totalDays,
      kpi: {
        totalShipments,
        totalCost,
        avgCostPerShipment,
        avgDailyCost,
        avgShipmentsPerDay: totalDays > 0 ? totalShipments / totalDays : 0,
        shipToPatient,
        shipToClinic,
        avgLagDays,
        uniquePatients: allPatients.size,
      },
      dailyTrends,
      costTrends,
      dowDistribution,
      carrierBreakdown,
      stateBreakdown,
      topCities,
      lagDistribution,
    };
  }

  _extractDate(dateStr) {
    if (!dateStr) return null;
    return String(dateStr).slice(0, 10);
  }
}

module.exports = ShippingMetrics;
