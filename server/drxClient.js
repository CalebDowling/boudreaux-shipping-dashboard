const https = require('https');

class DRXClient {
  constructor() {
    this.baseUrl = process.env.DRX_BASE_URL;
    this.apiKey = process.env.DRX_API_KEY;
  }

  _request(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      const queryStr = new URLSearchParams(params).toString();
      const fullUrl = `${this.baseUrl}${endpoint}${queryStr ? '?' + queryStr : ''}`;
      const parsed = new URL(fullUrl);

      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'X-DRX-Key': this.apiKey,
          'Accept': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse response from ${endpoint}: ${data.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  // Shipping date filters use afterDate/beforeDate (exclusive boundaries)
  _exclusiveDateRange(startDate, endDate) {
    const dayBefore = new Date(startDate + 'T00:00:00');
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(endDate + 'T00:00:00');
    dayAfter.setDate(dayAfter.getDate() + 1);
    return {
      before: dayAfter.toISOString().slice(0, 10),
      after: dayBefore.toISOString().slice(0, 10),
    };
  }

  async fetchShipmentsInRange(startDate, endDate) {
    const BATCH = 100;
    const { before, after } = this._exclusiveDateRange(startDate, endDate);
    const params = { afterDate: after, beforeDate: before };

    console.log(`  Fetching shipments from ${startDate} to ${endDate} (API filter: afterDate=${after}, beforeDate=${before})...`);

    const firstRes = await this._request('/shipping', { offset: 0, limit: BATCH, ...params });
    const totalExpected = firstRes.total || 0;
    const firstBatch = firstRes.data || firstRes.shipments || [];

    console.log(`  API reports ${totalExpected} total shipments in range`);

    if (firstBatch.length >= totalExpected) {
      console.log(`  Total shipments fetched: ${firstBatch.length}`);
      return firstBatch;
    }

    // Fetch all remaining pages in parallel
    const pagePromises = [];
    for (let offset = firstBatch.length; offset < totalExpected; offset += BATCH) {
      pagePromises.push(
        this._request('/shipping', { offset, limit: BATCH, ...params })
          .then(res => res.data || res.shipments || [])
          .catch(e => { console.error(`  Error fetching shipments at offset ${offset}:`, e.message); return []; })
      );
    }
    const pages = await Promise.all(pagePromises);
    const allShipments = firstBatch.concat(...pages);

    console.log(`  Total shipments fetched: ${allShipments.length}`);
    return allShipments;
  }

  async fetchDeliveriesInRange(startDate, endDate) {
    const BATCH = 100;

    console.log(`  Fetching deliveries from ${startDate} to ${endDate}...`);

    const firstRes = await this._request('/deliveries', { offset: 0, limit: BATCH });
    const totalExpected = firstRes.total || 0;
    const firstBatch = firstRes.data || firstRes.deliveries || [];

    console.log(`  API reports ${totalExpected} total deliveries`);

    let allDeliveries;
    if (firstBatch.length >= totalExpected) {
      allDeliveries = firstBatch;
    } else {
      // Fetch all remaining pages in parallel
      const pagePromises = [];
      for (let offset = firstBatch.length; offset < totalExpected; offset += BATCH) {
        pagePromises.push(
          this._request('/deliveries', { offset, limit: BATCH })
            .then(res => res.data || res.deliveries || [])
            .catch(e => { console.error(`  Error fetching deliveries at offset ${offset}:`, e.message); return []; })
        );
      }
      const pages = await Promise.all(pagePromises);
      allDeliveries = firstBatch.concat(...pages);
    }

    // Filter to date range client-side (API doesn't support date range filtering)
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    const endMs = new Date(endDate + 'T23:59:59').getTime();
    allDeliveries = allDeliveries.filter((d) => {
      const t = new Date(d.delivery_on || d.created_at).getTime();
      return t >= startMs && t <= endMs;
    });

    console.log(`  Total deliveries in range: ${allDeliveries.length}`);
    return allDeliveries;
  }

  async fetchDeliveryRoutes() {
    const BATCH = 100;
    console.log(`  Fetching delivery routes...`);

    const firstRes = await this._request('/deliveries/routes', { offset: 0, limit: BATCH });
    const firstBatch = firstRes.data || firstRes.routes || [];
    const totalExpected = firstRes.total || firstBatch.length;

    if (firstBatch.length === 0 || firstBatch.length >= totalExpected) {
      console.log(`  Total delivery routes fetched: ${firstBatch.length}`);
      return firstBatch;
    }

    const pagePromises = [];
    for (let offset = firstBatch.length; offset < totalExpected; offset += BATCH) {
      pagePromises.push(
        this._request('/deliveries/routes', { offset, limit: BATCH })
          .then(res => res.data || res.routes || [])
          .catch(e => { console.error(`  Error fetching routes at offset ${offset}:`, e.message); return []; })
      );
    }
    const pages = await Promise.all(pagePromises);
    const allRoutes = firstBatch.concat(...pages);

    console.log(`  Total delivery routes fetched: ${allRoutes.length}`);
    return allRoutes;
  }

  async fetchPackingLists() {
    const BATCH = 100;
    let offset = 0;
    let allLists = [];

    console.log(`  Fetching packing lists...`);

    while (true) {
      try {
        const res = await this._request('/packing-lists', {
          offset, limit: BATCH,
        });
        const batch = res.data || res.packing_lists || [];
        if (batch.length === 0) break;
        allLists.push(...batch);
        offset += batch.length;

        if (offset % 500 < BATCH) {
          console.log(`  ... fetched ${allLists.length} packing lists`);
        }
      } catch (e) {
        console.error(`  Error fetching packing lists at offset ${offset}:`, e.message);
        break;
      }
    }

    console.log(`  Total packing lists fetched: ${allLists.length}`);
    return allLists;
  }
}

module.exports = DRXClient;
