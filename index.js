const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK = (process.env.B24_WEBHOOK || 'https://realpay.bitrix24.ru/rest/1/ijt2of2kuhcz7pnj').replace(/\/$/, '');

app.use(express.static(path.join(__dirname, 'public')));

// Helper: paginated fetch from Bitrix24
async function b24fetch(method, params = {}) {
  let all = [];
  let start = 0;
  while (true) {
    const res = await axios.get(`${WEBHOOK}/${method}`, {
      params: { ...params, start },
      timeout: 10000
    });
    const data = res.data;
    const items = data.result || [];
    all = all.concat(items);
    if (!data.next || items.length === 0) break;
    start = data.next;
    if (all.length > 500) break; // safety limit
  }
  return all;
}

// API: dashboard summary
app.get('/api/summary', async (req, res) => {
  try {
    const [deals, contacts, companies] = await Promise.all([
      b24fetch('crm.deal.list', {
        select: ['ID', 'TITLE', 'STAGE_ID', 'OPPORTUNITY', 'CURRENCY_ID', 'DATE_CREATE', 'ASSIGNED_BY_ID', 'CONTACT_ID', 'COMPANY_ID', 'CLOSEDATE'],
        order: { DATE_CREATE: 'DESC' }
      }),
      b24fetch('crm.contact.list', {
        select: ['ID', 'NAME', 'LAST_NAME', 'DATE_CREATE'],
        order: { DATE_CREATE: 'DESC' }
      }),
      b24fetch('crm.company.list', {
        select: ['ID', 'TITLE', 'DATE_CREATE'],
        order: { DATE_CREATE: 'DESC' }
      })
    ]);

    // Stage labels
    const stages = {};
try {
 const stages = {};
try {
  const stagesRes = await axios.get(`${WEBHOOK}/crm.status.list`, {
    params: { filter: { ENTITY_ID: 'DEAL_STAGE' } }
  });
  (stagesRes.data.result || []).forEach(s => {
    stages[s.STATUS_ID] = s.NAME;
  });
} catch(e) {}
  });
} catch(e) {}

    // Deals by stage
    const byStage = {};
    const byMonth = {};
    let totalWon = 0;
    let totalActive = 0;
    let totalLost = 0;

    deals.forEach(d => {
      const stage = stages[d.STAGE_ID] || d.STAGE_ID;
      byStage[stage] = (byStage[stage] || 0) + 1;

      const month = (d.DATE_CREATE || '').slice(0, 7);
      if (month) {
        if (!byMonth[month]) byMonth[month] = { count: 0, sum: 0 };
        byMonth[month].count++;
        byMonth[month].sum += parseFloat(d.OPPORTUNITY || 0);
      }

      if (d.STAGE_ID === 'WON') totalWon += parseFloat(d.OPPORTUNITY || 0);
      else if (d.STAGE_ID === 'LOSE') totalLost += parseFloat(d.OPPORTUNITY || 0);
      else totalActive += parseFloat(d.OPPORTUNITY || 0);
    });

    // Recent deals (top 20)
    const recentDeals = deals.slice(0, 20).map(d => ({
      id: d.ID,
      title: d.TITLE,
      stage: stages[d.STAGE_ID] || d.STAGE_ID,
      stageId: d.STAGE_ID,
      amount: parseFloat(d.OPPORTUNITY || 0),
      currency: d.CURRENCY_ID || 'RUB',
      date: d.DATE_CREATE
    }));

    res.json({
      totals: {
        deals: deals.length,
        contacts: contacts.length,
        companies: companies.length,
        totalWon,
        totalActive,
        totalLost
      },
      byStage,
      byMonth,
      recentDeals
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: deals list with filters
app.get('/api/deals', async (req, res) => {
  try {
    const { stage, search } = req.query;
    const filter = {};
    if (stage && stage !== 'all') filter['STAGE_ID'] = stage;

    const deals = await b24fetch('crm.deal.list', {
      select: ['ID', 'TITLE', 'STAGE_ID', 'OPPORTUNITY', 'CURRENCY_ID', 'DATE_CREATE', 'ASSIGNED_BY_ID', 'CONTACT_ID'],
      filter,
      order: { DATE_CREATE: 'DESC' }
    });

    const stagesRes = await axios.get(`${WEBHOOK}/crm.dealcategory.stages`, { params: { id: 0 } });
    const stages = {};
    (stagesRes.data.result || []).forEach(s => { stages[s.STATUS_ID] = s.NAME; });

    let result = deals.map(d => ({
      id: d.ID,
      title: d.TITLE,
      stage: stages[d.STAGE_ID] || d.STAGE_ID,
      stageId: d.STAGE_ID,
      amount: parseFloat(d.OPPORTUNITY || 0),
      currency: d.CURRENCY_ID || 'RUB',
      date: d.DATE_CREATE
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d => d.title.toLowerCase().includes(q));
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await b24fetch('crm.contact.list', {
      select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'POST', 'DATE_CREATE', 'PHONE', 'EMAIL'],
      order: { DATE_CREATE: 'DESC' }
    });

    const result = contacts.slice(0, 100).map(c => ({
      id: c.ID,
      name: [c.NAME, c.LAST_NAME].filter(Boolean).join(' ') || '—',
      post: c.POST || '',
      phone: (c.PHONE && c.PHONE[0]) ? c.PHONE[0].VALUE : '',
      email: (c.EMAIL && c.EMAIL[0]) ? c.EMAIL[0].VALUE : '',
      date: c.DATE_CREATE
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Сервер запущен: http://localhost:${PORT}`));
