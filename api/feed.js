// Vercel serverless function: proxies the Airtable feed so the token stays server-side.
// Env vars (set in Vercel dashboard and .env for local `vercel dev`):
//   AIRTABLE_TOKEN  — personal access token with data.records:read on the Existable base
//   AIRTABLE_BASE   — optional, defaults to the Existable base id
//   AIRTABLE_TABLE  — optional, defaults to the Existable table id
module.exports = async (req, res) => {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    res.status(500).json({ error: { type: 'MISSING_TOKEN', message: 'AIRTABLE_TOKEN env var is not set' } });
    return;
  }
  const base = process.env.AIRTABLE_BASE || 'appJTn7cHXFraJfx1';
  const table = process.env.AIRTABLE_TABLE || 'tblgqzcrj0SSOHCQs';

  const category = String(req.query.category || 'home').toLowerCase().replace(/[^a-z]/g, '');
  let url = 'https://api.airtable.com/v0/' + base + '/' + table +
    '?pageSize=10&filterByFormula=' + encodeURIComponent("LOWER({Category})='" + category + "'");
  if (req.query.offset) url += '&offset=' + encodeURIComponent(String(req.query.offset));

  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const data = await r.json();
    // cache at the edge for 60s so bursts of visitors don't hammer Airtable's rate limit
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { type: 'UPSTREAM_ERROR', message: String(err) } });
  }
};
