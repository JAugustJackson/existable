// Vercel serverless function: proxies the Airtable feed so the token stays server-side.
// Env vars (set in Vercel dashboard and .env for local `vercel dev`):
//   AIRTABLE_TOKEN  — personal access token with data.records:read on the Existable base
//   AIRTABLE_BASE   — optional, defaults to the Existable base id
//   AIRTABLE_TABLE  — optional, defaults to the Existable table id
//
// Airtable's list API can only sort by real table fields, and the table has no date
// column — so we can't ask Airtable to sort newest-first. Instead we pull the whole
// category, sort by each record's implicit `createdTime` descending, and paginate over
// the sorted set ourselves. The `offset` we hand back to the client is just a numeric
// cursor into that sorted list, so the existing infinite-scroll contract is unchanged.
const PAGE_SIZE = 10;

module.exports = async (req, res) => {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    res.status(500).json({ error: { type: 'MISSING_TOKEN', message: 'AIRTABLE_TOKEN env var is not set' } });
    return;
  }
  const base = process.env.AIRTABLE_BASE || 'appJTn7cHXFraJfx1';
  const table = process.env.AIRTABLE_TABLE || 'tblgqzcrj0SSOHCQs';

  const category = String(req.query.category || 'home').toLowerCase().replace(/[^a-z]/g, '');
  const filter = encodeURIComponent("LOWER({Category})='" + category + "'");
  const baseUrl = 'https://api.airtable.com/v0/' + base + '/' + table + '?pageSize=100&filterByFormula=' + filter;

  try {
    // Page through Airtable to collect every record in this category.
    const all = [];
    let airtableOffset = null;
    // Safety cap so a runaway offset can never loop forever.
    for (let i = 0; i < 50; i++) {
      const url = airtableOffset ? baseUrl + '&offset=' + encodeURIComponent(airtableOffset) : baseUrl;
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      const data = await r.json();
      if (data.error) {
        res.status(r.status).json(data);
        return;
      }
      if (Array.isArray(data.records)) all.push(...data.records);
      if (!data.offset) break;
      airtableOffset = data.offset;
    }

    // Newest first, by Airtable's per-record creation timestamp.
    all.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

    // Slice out the requested page using our own numeric cursor.
    const start = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const page = all.slice(start, start + PAGE_SIZE);
    const nextOffset = start + PAGE_SIZE < all.length ? String(start + PAGE_SIZE) : undefined;

    // cache at the edge for 60s so bursts of visitors don't hammer Airtable's rate limit
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(nextOffset ? { records: page, offset: nextOffset } : { records: page });
  } catch (err) {
    res.status(502).json({ error: { type: 'UPSTREAM_ERROR', message: String(err) } });
  }
};
