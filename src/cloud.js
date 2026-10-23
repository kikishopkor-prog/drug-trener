// Связь с Supabase через обычные запросы (без дополнительных библиотек).
// Если переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY не заданы,
// приложение работает в локальном режиме (данные только в браузере).

const URL_ = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "");
export const CLOUD = !!(URL_ && KEY);

/* ---------- вход тренера (e-mail + пароль) ---------- */
const AUTH_KEY = "fitcoach-auth";
let auth = null;
try { auth = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { auth = null; }
const saveAuth = (a) => { auth = a; try { a ? localStorage.setItem(AUTH_KEY, JSON.stringify(a)) : localStorage.removeItem(AUTH_KEY); } catch {} };
export const hasAuth = () => !!auth?.refresh_token;

const toAuth = (j) => ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 });

export async function signIn(email, password) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
  if (!r.ok) { const e = new Error(r.status === 400 || r.status === 401 ? "bad_credentials" : "network"); e.code = e.message; throw e; }
  saveAuth(toAuth(await r.json()));
}
export function signOut() { saveAuth(null); }

async function refreshAuth() {
  if (!auth?.refresh_token) throw Object.assign(new Error("auth"), { code: "auth" });
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: auth.refresh_token }) });
  if (!r.ok) { if (r.status === 400 || r.status === 401) saveAuth(null); throw Object.assign(new Error("auth"), { code: "auth" }); }
  saveAuth(toAuth(await r.json()));
}

async function rpc(fn, params, asTrainer) {
  const go = async () => {
    const headers = { apikey: KEY, "Content-Type": "application/json" };
    if (asTrainer) headers.Authorization = `Bearer ${auth.access_token}`;
    return fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(params || {}) });
  };
  if (asTrainer) {
    if (!auth) throw Object.assign(new Error("auth"), { code: "auth" });
    if (auth.expires_at - Date.now() < 60000) await refreshAuth();
  }
  let r;
  try { r = await go(); } catch { throw Object.assign(new Error("network"), { code: "network" }); }
  if (asTrainer && r.status === 401) { await refreshAuth(); try { r = await go(); } catch { throw Object.assign(new Error("network"), { code: "network" }); } }
  if (!r.ok) {
    let msg = ""; try { msg = (await r.json()).message || ""; } catch {}
    const code = r.status === 401 || /not authenticated/i.test(msg) ? "auth" : r.status === 403 || /forbidden/i.test(msg) ? "forbidden" : r.status >= 500 ? "network" : "error";
    throw Object.assign(new Error(msg || code), { code });
  }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

export const trainerPoll = (ver) => rpc("trainer_poll", { p_ver: ver ?? null }, true);
export const trainerInit = (data) => rpc("trainer_init", { p_data: data }, true);
export const trainerSave = (patch) => rpc("trainer_save", { p_patch: patch }, true);
export const trainerLogsPatch = (cid, patch) => rpc("trainer_logs_patch", { p_cid: cid, p_patch: patch }, true);
export const clientGet = (token, ver) => rpc("client_get", { p_token: token, p_ver: ver ?? null }, false);
export const clientPatch = (token, patch) => rpc("client_patch", { p_token: token, p_patch: patch }, false);

/* ---------- разница между двумя состояниями (null = удалить) ---------- */
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
export function diff(a, b) {
  if (isObj(a) && isObj(b)) {
    const out = {};
    for (const k of Object.keys(b)) {
      if (b[k] === undefined) { if (k in a) out[k] = null; continue; }
      if (!(k in a)) { out[k] = b[k]; continue; }
      const d = diff(a[k], b[k]);
      if (d !== undefined) out[k] = d;
    }
    for (const k of Object.keys(a)) if (!(k in b)) out[k] = null;
    return Object.keys(out).length ? out : undefined;
  }
  return JSON.stringify(a) === JSON.stringify(b) ? undefined : b;
}
export function mergePatch(a, b) {
  if (!isObj(a) || !isObj(b)) return b;
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = isObj(out[k]) && isObj(b[k]) ? mergePatch(out[k], b[k]) : b[k];
  return out;
}

/* ---------- случайный секрет для личной ссылки клиента ---------- */
export const secret = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
