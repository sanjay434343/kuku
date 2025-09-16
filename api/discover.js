// api/discover.js
import fetch from "node-fetch";
const BASE = "https://www.kukufm.com";
const CACHE_TTL = 60 * 1000;
const cache = global.__KUKU_CACHE ||= new Map();
function setCache(key, value, ttl = CACHE_TTL){ cache.set(key, { value, expires: Date.now() + ttl }); }
function getCache(key){ const e = cache.get(key); if(!e) return null; if(Date.now()>e.expires){ cache.delete(key); return null; } return e.value; }

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  if(req.method==="OPTIONS") return res.status(200).end();

  const cacheKey = "discover";
  const cached = getCache(cacheKey);
  if(cached) return res.status(200).json(cached);

  try {
    const r = await fetch(`${BASE}/api/v1/discover`, { redirect:"follow", headers:{ "User-Agent":"kuku-proxy/1.0" }});
    if(!r.ok) return res.status(r.status).send(await r.text());
    const json = await r.json();
    setCache(cacheKey, json, 30*1000);
    return res.status(200).json(json);
  } catch(e){
    console.error(e);
    return res.status(500).json({ error: "fetch_failed" });
  }
}
