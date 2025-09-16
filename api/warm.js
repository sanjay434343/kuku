// api/warm.js
// Endpoint to warm the cache (call after deploy or on schedule)
// usage: GET /api/warm?key=YOUR_KEY

import fetch from "node-fetch";
const BASE="https://www.kukufm.com";
const SECRET = process.env.PROXY_KEY || ""; // reuse PROXY_KEY

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  if(req.method==="OPTIONS") return res.status(200).end();

  const key = req.query.key;
  if(SECRET && key !== SECRET) return res.status(401).json({ error: "invalid_key" });

  // Warm a few endpoints (discover, genres, top search for a few langs)
  const toWarm = [
    `${BASE}/api/v1/discover`,
    `${BASE}/api/v1/genres`,
    `${BASE}/api/v1/search?q=motivational`,
    `${BASE}/api/v1/search?q=हिन्दी`,
  ];

  const results = [];
  for(const u of toWarm){
    try {
      const r = await fetch(u, { headers:{ "User-Agent":"kuku-proxy/1.0" }, redirect:"follow" });
      results.push({ url: u, status: r.status });
    } catch(e){
      results.push({ url: u, error: String(e) });
    }
  }
  return res.status(200).json({ warmed: results });
}
