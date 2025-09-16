// api/channels.js
import fetch from "node-fetch";
const BASE="https://www.kukufm.com";
const cache = global.__KUKU_CACHE ||= new Map();

function getCache(key){ const e = cache.get(key); if(!e) return null; if(Date.now()>e.expires){ cache.delete(key); return null; } return e.value; }
function setCache(key,val,ttl=60*1000){ cache.set(key,{value:val,expires:Date.now()+ttl}); }

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  if(req.method==="OPTIONS") return res.status(200).end();

  const { lang } = req.query;
  const cacheKey = lang ? `channels:lang:${lang}` : `channels:top`;
  const cached = getCache(cacheKey);
  if(cached) return res.status(200).json(cached);

  try {
    let url;
    if(lang){
      // use search endpoint to filter by language (site may not have direct /channels?lang=)
      url = `${BASE}/api/v1/search?q=${encodeURIComponent(lang)}`;
    } else {
      url = `${BASE}/api/v1/discover`;
    }
    const r = await fetch(url, { headers:{ "User-Agent":"kuku-proxy/1.0" }, redirect:"follow" });
    if(!r.ok) return res.status(r.status).send(await r.text());
    const json = await r.json();
    // normalize: if discover returned sections, try to map to channels object
    setCache(cacheKey, json, 30*1000);
    res.json(json);
  } catch(e){
    console.error(e);
    res.status(500).json({ error: "fetch_failed" });
  }
}
