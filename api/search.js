// api/search.js
// Usage: GET /api/search?q=your+query
import fetch from "node-fetch";

const BASE = "https://www.kukufm.com";
const CACHE_TTL = 60 * 1000; // 60s

// --- simple in-memory cache (persists while lambda warm) ---
const cache = global.__KUKU_CACHE ||= new Map();

function setCache(key, value, ttl = CACHE_TTL){
  cache.set(key, { value, expires: Date.now() + ttl });
}
function getCache(key){
  const e = cache.get(key);
  if(!e) return null;
  if(Date.now() > e.expires){ cache.delete(key); return null; }
  return e.value;
}

// --- simple rate limit per IP (token bucket) ---
const RATE = global.__KUKU_RATE ||= new Map();
function allowRequest(ip){
  const now = Date.now();
  let st = RATE.get(ip);
  if(!st) { st = { tokens: 10, last: now }; RATE.set(ip, st); }
  const elapsed = (now - st.last) / 1000;
  st.tokens = Math.min(10, st.tokens + elapsed * 1); // refill 1 token/sec, cap 10
  st.last = now;
  if(st.tokens >= 1){ st.tokens -= 1; return true; }
  return false;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "anon";
  if(!allowRequest(ip)) return res.status(429).json({ error: "rate_limited" });

  const q = (req.query.q || "").toString().trim();
  if(!q) return res.status(400).json({ error: "missing_query" });

  const cacheKey = `search:${q}`;
  const cached = getCache(cacheKey);
  if(cached) return res.status(200).json(cached);

  try {
    const url = `${BASE}/api/v1/search?q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { "User-Agent": "kuku-proxy/1.0" }, redirect: "follow" });
    if(!r.ok) {
      const txt = await r.text().catch(()=>"");
      return res.status(r.status).json({ error: "upstream_error", status: r.status, body: txt });
    }
    const json = await r.json();
    setCache(cacheKey, json);
    return res.status(200).json(json);
  } catch (err) {
    console.error("search_err", err);
    return res.status(500).json({ error: "fetch_failed", message: String(err) });
  }
}
