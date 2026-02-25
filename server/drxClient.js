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
    let offset = 0;
    let allShipments = [];
    const { before, after } = this._exclusiveDateRange(startDate, endDate);

    console.log(`  Fetching shipments from ${startDate} to ${endDate} (API filter: afterDate=${after}, beforeDate=${before})...`);

    const firstRes = await this._request('/shipping', {
      offset: 0, limit: BATCH,
      afterDate: after, beforeDate: before,
    });
    const totalExpected = firstRes.total || 0;
    const firstBatch = firstRes.data || firstRes.shipments || [];
    allShipments.push(...firstBatch);
    offset = firstBatch.length;

    console.log(`  API reports ${totalExpected} total shipments in range`);

    while (offset < totalExpected) {
      try {
        const res = await this._request('/shipping', {
          offset, limit: BATCH,
          afterDate: after, beforeDate: before,
        });
        const batch = res.data || res.shipments || [];
        if (batch.length === 0) break;
        allShipments.push(...batch);
        offset += batch.length;

        if (offset % 500 < BATCH) {
          console.log(`  ... fetched ${allShipments.length}/${totalExpected} shipments`);
        }
      } catch (e) {
        console.error(`  Error fetching shipments at offset ${offset}:`, e.message);
        offset += BATCH;
      }
    }

    console.log(`  Total shipments fetched: ${allShipments.length}`);
    return allShipments;
  }

  async fetchDeliveriesInRange(startDate, endDate) {
    const BATCH = 100;
    let offset = 0;
    let allDeliveries = [];

    console.log(`  Fetching deliveries from ${startDate} to ${endDate}...`);

    // Deliveries endpoint uses deliveryDate for single-day filtering
    // For a range, we iterate day by day or fetch all and filter
    // The API also supports limit/offset, so we paginate through all
    const firstRes = await this._request('/deliveries', {
      offset: 0, limit: BATCH,
    });
    const totalExpected = firstRes.total || 0;
    const firstBatch = firstRes.data || firstRes.deliveries || [];
    allDeliveries.push(...firstBatch);
    offset = firstBatch.length;

    console.log(`  API reports ${totalExpected} total deliveries`);

    while (offset < totalExpected) {
      try {
        const res = await this._request('/deliveries', {
          offset, limit: BATCH,
        });
        const batch = res.data || res.deliveries || [];
        if (batch.length === 0) break;
        allDeliveries.push(...batch);
        offset += batch.length;

        if (offset % 500 < BATCH) {
          console.log(`  ... fetched ${allDeliveries.length}/${totalExpected} deliveries`);
        }
      } catch (e) {
        console.error(`  Error fetching deliveries at offset ${offset}:`, e.message);
        offset += BATCH;
      }
    }

    // Filter to date range client-side
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    allDeliveries = allDeliveries.filter((d) => {
      const delivDate = new Date(d.delivery_on || d.created_at);
      return delivDate >= start && delivDate <= end;
    });

    console.log(`  Total deliveries in range: ${allDeliveries.length}`);
    return allDeliveries;
  }

  async fetchDeliveryRoutes() {
    const BATCH = 100;
    let offset = 0;
    let allRoutes = [];

    console.log(`  Fetching delivery routes...`);

    while (true) {
      try {
        const res = await this._request('/deliveries/routes', {
          offset, limit: BATCH,
        });
        const batch = res.data || res.routes || [];
        if (batch.length === 0) break;
        allRoutes.push(...batch);
        offset += batch.length;
      } catch (e) {
        console.error(`  Error fetching routes at offset ${offset}:`, e.message);
        break;
      }
    }

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
