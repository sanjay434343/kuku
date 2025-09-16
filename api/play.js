// api/play.js
// streams audio from upstream url parameter: ?url=<encoded_url>
// Be careful: proxying large audio will consume bandwidth on your Vercel plan.
// We forward content-type and stream the body.

import fetch from "node-fetch";
const ALLOWED_ORIGINS = ["*"]; // CORS already handled below

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  if(req.method==="OPTIONS") return res.status(200).end();

  const raw = req.query.url || req.query.u;
  if(!raw) return res.status(400).json({ error: "missing_url" });

  // tiny security: require PROXY_KEY if set in env
  const PROXY_KEY = process.env.PROXY_KEY;
  if(PROXY_KEY){
    const ak = req.headers["x-proxy-key"] || req.query.key;
    if(!ak || ak !== PROXY_KEY) return res.status(401).json({ error: "invalid_key" });
  }

  let upstream;
  try {
    upstream = decodeURIComponent(raw.toString());
  } catch(e){ upstream = raw.toString(); }

  try {
    // follow redirects and stream body
    const up = await fetch(upstream, { headers: { "User-Agent": "kuku-proxy/1.0" }, redirect:"follow" });
    if(!up.ok) {
      const txt = await up.text().catch(()=>"");
      return res.status(up.status).json({ error: "upstream_error", status: up.status, body: txt });
    }

    // forward headers
    const ct = up.headers.get("content-type");
    if(ct) res.setHeader("Content-Type", ct);
    const cl = up.headers.get("content-length");
    if(cl) res.setHeader("Content-Length", cl);

    // stream
    const body = up.body;
    if(!body) return res.status(500).json({ error: "no_stream" });

    // Node fetch Response.body is a ReadableStream / stream — pipe it
    body.pipe ? body.pipe(res) : body.getReader ? streamWebToNode(body, res) : res.end();
  } catch(e){
    console.error("play_err", e);
    res.status(500).json({ error: "fetch_failed", message: String(e) });
  }
}

// helper: convert WHATWG stream to node response (if needed)
async function streamWebToNode(webStream, nodeRes) {
  const reader = webStream.getReader();
  while(true){
    const { done, value } = await reader.read();
    if(done) { nodeRes.end(); break; }
    nodeRes.write(Buffer.from(value));
  }
}
