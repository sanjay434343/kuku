// api/genres.js
import fetch from "node-fetch";
const BASE="https://www.kukufm.com";
const cache = global.__KUKU_CACHE ||= new Map();

function getCache(key){ const e = cache.get(key); if(!e) return null; if(Date.now()>e.expires){ cache.delete(key); return null; } return e.value; }
function setCache(key,val,ttl=60*1000){ cache.set(key,{value:val,expires:Date.now()+ttl}); }

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  if(req.method==="OPTIONS") return res.status(200).end();
  const cached = getCache("genres");
  if(cached) return res.status(200).json(cached);
  try {
    const r = await fetch(`${BASE}/api/v1/genres`, { headers:{ "User-Agent":"kuku-proxy/1.0" }, redirect:"follow" });
    if(!r.ok) return res.status(r.status).send(await r.text());
    const json = await r.json();
    setCache("genres", json, 60*1000);
    res.json(json);
  } catch(e) {
    console.error(e);
    res.status(500).json({error:"fetch_failed"});
  }
}
