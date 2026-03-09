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

    // ─── SHIPMENT METRICS (single pass) ──────────
    const totalShipments = shipments.length;
    const shipmentPatients = new Set();
    const shipmentsByDay = {};
    const shipmentsByDow = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const patientShipCounts = {};
    const carrierMap = {};
    const stateMap = {};
    const cityMap = {};
    const costByDay = {};
    const hourBuckets = new Array(24).fill(0);
    const lagBuckets = { '0': 0, '1': 0, '2': 0, '3+': 0 };
    let shipToPatient = 0;
    let shipToClinic = 0;
    let totalCost = 0;
    let totalLagDays = 0;
    let lagCount = 0;

    for (const s of shipments) {
      // Patient tracking
      if (s.patient_id) {
        shipmentPatients.add(s.patient_id);
        patientShipCounts[s.patient_id] = (patientShipCounts[s.patient_id] || 0) + 1;
      }

      // Clinic vs patient
      const firstName = (s.patient && s.patient.first_name) || '';
      if (firstName.startsWith('Co.')) shipToClinic++;
      else shipToPatient++;

      // Date bucketing
      const dateStr = this._extractDate(s.created_at || s.shipped_at);
      if (dateStr) {
        shipmentsByDay[dateStr] = (shipmentsByDay[dateStr] || 0) + 1;
        const dow = new Date(dateStr + 'T00:00:00').getDay();
        shipmentsByDow[dow]++;
      }

      // Carrier breakdown
      const carrier = (s.carrier_code || 'unknown').toUpperCase();
      const service = s.service_code || 'unknown';
      if (!carrierMap[carrier]) carrierMap[carrier] = { name: carrier, shipments: 0, cost: 0, services: {} };
      carrierMap[carrier].shipments++;
      carrierMap[carrier].cost += s.shipment_cost || 0;
      if (!carrierMap[carrier].services[service]) carrierMap[carrier].services[service] = { count: 0, cost: 0 };
      carrierMap[carrier].services[service].count++;
      carrierMap[carrier].services[service].cost += s.shipment_cost || 0;

      // Cost tracking
      const cost = s.shipment_cost || 0;
      totalCost += cost;
      const costDateStr = this._extractDate(s.created_at || s.ship_date);
      if (costDateStr) {
        if (!costByDay[costDateStr]) costByDay[costDateStr] = { cost: 0, count: 0 };
        costByDay[costDateStr].cost += cost;
        costByDay[costDateStr].count++;
      }

      // Geographic breakdown
      const addr = s.address;
      if (addr) {
        const state = (addr.state || '').toUpperCase().trim();
        if (state) {
          if (!stateMap[state]) stateMap[state] = { name: state, shipments: 0, cost: 0 };
          stateMap[state].shipments++;
          stateMap[state].cost += cost;
        }
        const city = (addr.city || '').trim();
        if (city && state) {
          const cityKey = `${city}, ${state}`;
          if (!cityMap[cityKey]) cityMap[cityKey] = { name: cityKey, shipments: 0, cost: 0 };
          cityMap[cityKey].shipments++;
          cityMap[cityKey].cost += cost;
        }
      }

      // Order-to-ship lag
      if (s.ship_date && s.created_at) {
        const created = new Date(s.created_at);
        const shipped = new Date(s.ship_date + 'T00:00:00');
        const lagDays = Math.max(0, Math.round((shipped.getTime() - created.getTime()) / 86400000));
        totalLagDays += lagDays;
        lagCount++;
        if (lagDays === 0) lagBuckets['0']++;
        else if (lagDays === 1) lagBuckets['1']++;
        else if (lagDays === 2) lagBuckets['2']++;
        else lagBuckets['3+']++;
      }

      // Peak hour
      if (s.created_at) {
        hourBuckets[new Date(s.created_at).getHours()]++;
      }
    }

    // Patient frequency buckets
    const freqBuckets = { '1 shipment': 0, '2-3': 0, '4-5': 0, '6+': 0 };
    for (const count of Object.values(patientShipCounts)) {
      if (count === 1) freqBuckets['1 shipment']++;
      else if (count <= 3) freqBuckets['2-3']++;
      else if (count <= 5) freqBuckets['4-5']++;
      else freqBuckets['6+']++;
    }
    const patientFrequency = Object.entries(freqBuckets).map(([name, count]) => ({ name, count }));

    // ─── DELIVERY METRICS (single pass) ─────────
    const totalDeliveries = deliveries.length;
    const completed = [];
    const deliveryPatients = new Set();
    const deliveriesByDay = {};
    const deliveriesByDow = [0, 0, 0, 0, 0, 0, 0];
    const routeMap = {};
    let completedCount = 0, refusedCount = 0, pendingCount = 0;

    for (const d of deliveries) {
      if (d.patient_id) deliveryPatients.add(d.patient_id);

      // Status
      if (d.completed_at) { completedCount++; completed.push(d); }
      else if (d.refused_at) refusedCount++;
      else pendingCount++;

      // Date bucketing
      const dateStr = this._extractDate(d.delivery_on || d.created_at);
      if (dateStr) {
        deliveriesByDay[dateStr] = (deliveriesByDay[dateStr] || 0) + 1;
        const dow = new Date(dateStr + 'T00:00:00').getDay();
        deliveriesByDow[dow]++;
      }

      // Route breakdown
      const routeName = d.route || 'Unassigned';
      if (!routeMap[routeName]) routeMap[routeName] = { name: routeName, total: 0, completed: 0, pending: 0, refused: 0 };
      routeMap[routeName].total++;
      if (d.completed_at) routeMap[routeName].completed++;
      else if (d.refused_at) routeMap[routeName].refused++;
      else routeMap[routeName].pending++;
    }

    const completionRate = totalDeliveries > 0 ? (completedCount / totalDeliveries) * 100 : 0;
    const refusalRate = totalDeliveries > 0 ? (refusedCount / totalDeliveries) * 100 : 0;

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
      { name: 'Completed', value: completedCount, color: '#10b981' },
      { name: 'Pending', value: pendingCount, color: '#f59e0b' },
      { name: 'Refused', value: refusedCount, color: '#ef4444' },
    ];

    // ─── AVG DELIVERY TURNAROUND ──────────────────
    let totalTurnaroundHours = 0;
    let turnaroundCount = 0;
    for (const d of completed) {
      if (d.completed_at && d.delivery_on) {
        const scheduled = new Date(d.delivery_on + 'T00:00:00');
        const completedAt = new Date(d.completed_at);
        const hours = (completedAt - scheduled) / 3600000;
        if (hours >= 0) {
          totalTurnaroundHours += hours;
          turnaroundCount++;
        }
      }
    }
    const avgDeliveryTurnaroundHours = turnaroundCount > 0 ? totalTurnaroundHours / turnaroundCount : 0;

    const routeBreakdown = Object.values(routeMap).sort((a, b) => b.total - a.total);

    // ─── DAY-OF-WEEK DISTRIBUTION ───────────────
    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowDistribution = dowNames.map((name, i) => ({
      name,
      shipments: shipmentsByDow[i],
      deliveries: deliveriesByDow[i],
      total: shipmentsByDow[i] + deliveriesByDow[i],
    }));

    // ─── CARRIER & COST AGGREGATION ───────────────
    const carrierBreakdown = Object.values(carrierMap)
      .map((c) => ({
        ...c,
        avgCost: c.shipments > 0 ? c.cost / c.shipments : 0,
        services: Object.entries(c.services)
          .map(([name, svc]) => ({ name, count: svc.count, cost: svc.cost, avgCost: svc.count > 0 ? svc.cost / svc.count : 0 }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.shipments - a.shipments);

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

    // ─── WEEKLY COST TREND ──────────────────────────
    const weekMap = {};
    for (const ct of costTrends) {
      const d = new Date(ct.date + 'T00:00:00');
      // ISO week: Monday start
      const day = d.getDay() || 7; // convert Sunday=0 to 7
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      const weekKey = monday.toISOString().slice(0, 10);
      if (!weekMap[weekKey]) weekMap[weekKey] = { date: weekKey, cost: 0, shipments: 0, days: 0 };
      weekMap[weekKey].cost += ct.cost;
      weekMap[weekKey].shipments += ct.shipments;
      weekMap[weekKey].days++;
    }
    const weeklyCostTrends = Object.values(weekMap)
      .map((w) => ({ ...w, avgDailyCost: w.days > 0 ? w.cost / w.days : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── GEOGRAPHIC AGGREGATION ────────────────────
    const stateBreakdown = Object.values(stateMap)
      .map((s) => ({ ...s, avgCost: s.shipments > 0 ? s.cost / s.shipments : 0 }))
      .sort((a, b) => b.shipments - a.shipments);
    const topCities = Object.values(cityMap)
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 20);

    // ─── LAG & HOUR AGGREGATION ─────────────────────
    const avgLagDays = lagCount > 0 ? totalLagDays / lagCount : 0;
    const sameDayProcessingRate = lagCount > 0 ? (lagBuckets['0'] / lagCount) * 100 : 0;
    const lagDistribution = [
      { name: 'Same Day', count: lagBuckets['0'] },
      { name: '1 Day', count: lagBuckets['1'] },
      { name: '2 Days', count: lagBuckets['2'] },
      { name: '3+ Days', count: lagBuckets['3+'] },
    ];
    const hourLabels = ['12AM','1AM','2AM','3AM','4AM','5AM','6AM','7AM','8AM','9AM','10AM','11AM',
      '12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM','11PM'];
    const hourDistribution = hourBuckets.map((count, hour) => ({ name: hourLabels[hour], hour, count }));

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
        totalDeliveries,
        deliverySuccessRate: completionRate,
        deliveryRefusalRate: refusalRate,
        avgDeliveryTurnaroundHours,
        sameDayProcessingRate,
      },
      dailyTrends,
      costTrends,
      weeklyCostTrends,
      dowDistribution,
      carrierBreakdown,
      stateBreakdown,
      topCities,
      lagDistribution,
      statusBreakdown,
      hourDistribution,
      patientFrequency,
    };
  }

  _extractDate(dateStr) {
    if (!dateStr) return null;
    return String(dateStr).slice(0, 10);
  }
}

module.exports = ShippingMetrics;
