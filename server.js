// Ludothèque : serveur sans dépendance (Node >= 20). Sert le site + 2 routes API. 100 % gratuit.
const http = require("http"), fs = require("fs"), path = require("path");
const { PORT = 3000, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;
const PUB = path.join(__dirname, "public");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".gz": "application/gzip", ".wasm": "application/wasm", ".webmanifest": "application/manifest+json", ".json": "application/json" };

// --- IGDB ---
let tok = { v: null, exp: 0 };
async function igdbToken() {
  if (tok.v && Date.now() < tok.exp) return tok.v;
  const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, { method: "POST" });
  if (!r.ok) throw new Error("Authentification Twitch/IGDB refusée");
  const j = await r.json();
  tok = { v: j.access_token, exp: Date.now() + (j.expires_in - 600) * 1000 };
  return tok.v;
}
async function igdbSearch(q, limit = 8) {
  const t = await igdbToken();
  const body = `search "${String(q).replace(/["\\;]/g, " ").slice(0, 100)}"; fields name,first_release_date,platforms.abbreviation,cover.image_id; where category = (0,8,9,10,11); limit ${limit};`;
  const r = await fetch("https://api.igdb.com/v4/games", { method: "POST", headers: { "Client-ID": TWITCH_CLIENT_ID, Authorization: "Bearer " + t, "Content-Type": "text/plain" }, body });
  if (!r.ok) throw new Error("IGDB a répondu " + r.status);
  return (await r.json()).map(g => ({
    id: g.id, name: g.name,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    platforms: (g.platforms || []).map(p => p.abbreviation).filter(Boolean).slice(0, 4).join(", "),
    cover: g.cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null
  }));
}

// --- Code-barres -> titre (UPCitemdb, offre d'essai sans clé, quota limité) ---
async function eanTitle(code) {
  const r = await fetch("https://api.upcitemdb.com/prod/trial/lookup?upc=" + encodeURIComponent(code));
  if (!r.ok) return null;
  const j = await r.json();
  return j.items && j.items[0] ? j.items[0].title : null;
}

const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname === "/api/search") return send(res, 200, { games: await igdbSearch(u.searchParams.get("q") || "") });
    if (u.pathname === "/api/ean") {
      const code = (u.searchParams.get("code") || "").replace(/\D/g, "");
      const title = await eanTitle(code);
      return send(res, 200, { code, title, games: title ? await igdbSearch(title) : [] });
    }
    // fichiers statiques
    let p = path.normalize(path.join(PUB, u.pathname === "/" ? "index.html" : u.pathname));
    if (!p.startsWith(PUB) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("Introuvable"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  } catch (e) { send(res, 500, { error: e.message }); }
}).listen(PORT, () => console.log("Ludothèque sur http://localhost:" + PORT));
