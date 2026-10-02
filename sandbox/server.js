// Sandbox Account API + Loyalty Points Redemption service
// training-plan-1 — Kerk Gerald Quinamot (Tracks 1-3)
// Zero dependencies (plain Node http) on purpose — `node server.js` and go.
// Not production code. See README.md in this folder for what's deliberate vs. an accident.

const http = require("http");
const crypto = require("crypto");
const seed = require("./seed-data.json");

const PORT = process.env.PORT || 3000;
const RATE_LIMIT_PER_SECOND = 50;

// ---- in-memory state (resets on restart) ----
const users = JSON.parse(JSON.stringify(seed.users));
const rewards = JSON.parse(JSON.stringify(seed.rewards));
const redemptionHistory = JSON.parse(JSON.stringify(seed.redemptionHistory));
const sessions = new Map(); // token -> userId
let outageEnabled = false; // toggled by /api/admin/toggle-outage (deliberately unauthenticated — see README)
const hitLog = new Map(); // ip -> array of timestamps (ms), for the rate limiter

function findUserByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());
}
function findUserById(id) {
  return users.find((u) => u.id === id);
}
function tokenFromReq(req) {
  const auth = req.headers["authorization"] || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}
function userFromToken(req) {
  const token = tokenFromReq(req);
  if (!token || !sessions.has(token)) return null;
  return findUserById(sessions.get(token));
}
function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(json) });
  res.end(json);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({ __invalidJson: true });
      }
    });
  });
}
function rateLimited(req) {
  const ip = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowStart = now - 1000;
  const hits = (hitLog.get(ip) || []).filter((t) => t > windowStart);
  hits.push(now);
  hitLog.set(ip, hits);
  return hits.length > RATE_LIMIT_PER_SECOND;
}

const server = http.createServer(async (req, res) => {
  if (rateLimited(req)) return send(res, 429, { error: "too many requests" });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // GET /api/health
  if (method === "GET" && path === "/api/health") {
    return send(res, 200, { status: "ok" });
  }

  // POST /api/auth/login
  if (method === "POST" && path === "/api/auth/login") {
    const body = await readBody(req);
    if (body.__invalidJson) return send(res, 400, { error: "malformed JSON body" });
    const { email, password } = body;
    if (!email || !password) return send(res, 400, { error: "email and password are required" });
    const user = findUserByEmail(email);
    if (!user) return send(res, 401, { error: "invalid credentials" });
    if (user.isLocked) return send(res, 423, { error: "account is locked" });
    if (user.password !== password) return send(res, 401, { error: "invalid credentials" });
    const token = crypto.randomBytes(16).toString("hex");
    sessions.set(token, user.id);
    return send(res, 200, { token, userId: user.id, points: user.points });
  }

  // GET /api/rewards
  if (method === "GET" && path === "/api/rewards") {
    if (outageEnabled) return send(res, 500, { error: "internal server error" });
    return send(res, 200, rewards);
  }

  // GET /api/rewards/:id
  const rewardMatch = path.match(/^\/api\/rewards\/([^/]+)$/);
  if (method === "GET" && rewardMatch) {
    if (outageEnabled) return send(res, 500, { error: "internal server error" });
    const reward = rewards.find((r) => r.id === rewardMatch[1]);
    if (!reward) return send(res, 404, { error: "reward not found" });
    return send(res, 200, reward);
  }

  // POST /api/redeem
  // NOTE (deliberate, Day 6 material — see README): does not validate that
  // pointsSpent/rewardId inputs are sane, and trusts a caller-supplied
  // userId over the authenticated session (IDOR).
  if (method === "POST" && path === "/api/redeem") {
    if (outageEnabled) return send(res, 500, { error: "internal server error" });
    const caller = userFromToken(req);
    if (!caller) return send(res, 401, { error: "authentication required" });
    const body = await readBody(req);
    if (body.__invalidJson) return send(res, 400, { error: "malformed JSON body" });
    const { rewardId, userId } = body;
    if (!rewardId) return send(res, 400, { error: "rewardId is required" });
    const targetUser = userId ? findUserById(userId) : caller; // <- IDOR: trusts body userId
    if (!targetUser) return send(res, 404, { error: "user not found" });
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return send(res, 404, { error: "reward not found" });
    if (targetUser.points < reward.costPoints) return send(res, 409, { error: "insufficient points balance" });
    targetUser.points -= reward.costPoints;
    const entry = {
      id: "h" + (redemptionHistory.length + 1),
      userId: targetUser.id,
      rewardId: reward.id,
      pointsSpent: reward.costPoints,
      date: new Date().toISOString().slice(0, 10),
    };
    redemptionHistory.push(entry);
    return send(res, 200, { redemption: entry, remainingPoints: targetUser.points });
  }

  // GET /api/redemption-history/:userId
  // NOTE (deliberate, Day 6 material — see README): no ownership check —
  // classic IDOR, change the id and see someone else's history.
  const historyMatch = path.match(/^\/api\/redemption-history\/([^/]+)$/);
  if (method === "GET" && historyMatch) {
    if (outageEnabled) return send(res, 500, { error: "internal server error" });
    const caller = userFromToken(req);
    if (!caller) return send(res, 401, { error: "authentication required" });
    const targetUser = findUserById(historyMatch[1]);
    if (!targetUser) return send(res, 404, { error: "user not found" });
    const history = redemptionHistory.filter((h) => h.userId === targetUser.id);
    return send(res, 200, history);
  }

  // POST /api/admin/toggle-outage  { "enabled": true|false }
  // Deliberately unauthenticated — a realistic broken-access-control finding
  // for Day 6, and a deterministic way to reproduce the 500 scenario for
  // Day 1/Day 2 status-code work without waiting for a real backend fault.
  if (method === "POST" && path === "/api/admin/toggle-outage") {
    const body = await readBody(req);
    outageEnabled = !!body.enabled;
    return send(res, 200, { outageEnabled });
  }

  return send(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`Sandbox Account API listening on port ${PORT}`);
});
