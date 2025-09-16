// api/episodes/[id].js
import fetch from "node-fetch";
const BASE = "https://www.kukufm.com";
const cache = global.__KUKU_CACHE ||= new Map();
function getCache(k){ const e=cache.get(k); if(!e) return null; if(Date.now()>e.expires){ cache.delete(k); return null; } return e.value; }
function setCache(k,v,ttl=30*1000){ cache.set(k,{value:v,expires:Date.now()+ttl}); }

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  if(req.method==="OPTIONS") return res.status(200).end();

  const id = req.query.id;
  if(!id) return res.status(400).json({ error: "missing_id" });

  const cacheKey = `episode:${id}`;
  const cached = getCache(cacheKey);
  if(cached) return res.status(200).json(cached);

  try {
    const url = `${BASE}/api/v1/episodes/${encodeURIComponent(id)}`;
    const r = await fetch(url, { headers:{ "User-Agent":"kuku-proxy/1.0" }, redirect:"follow" });
    if(!r.ok) return res.status(r.status).send(await r.text());
    const json = await r.json();
    setCache(cacheKey, json, 30*1000);
    res.json(json);
  } catch(e){
    console.error(e);
    res.status(500).json({ error: "fetch_failed" });
  }
}
