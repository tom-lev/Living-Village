/* מאגר השמות המשותף: הקובץ app/public/names.json בפרויקט ב-GitHub (באתר: names.json).
   קריאה: כל מבקר טוען אותו בכניסה. כתיבה: רק במכשיר שהוזן בו מפתח GitHub (נשמר רק במכשיר, לא בקוד),
   וכל שינוי נשמר ישר לקובץ דרך GitHub API. הדחיפה מפעילה את בניית האתר, ותוך דקה-שתיים כולם רואים.
   המפתח: fine-grained token עם הרשאת Contents: Read and write לפרויקט הזה בלבד. */
const REPO = 'tom-lev/Living-Village', BRANCH = 'ccr-7419da80-z53gxw', PATH = 'app/public/names.json';
const TOKEN_KEY = 'village-gh-token';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = (t: string) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

/** השמות כפי שהם באתר עכשיו (מהקובץ שנפרס) */
export async function loadNames(): Promise<Record<string, string>> {
  try {
    const r = await fetch(`names.json?t=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? await r.json() : {};
  } catch { return {}; }
}

const b64 = (s: string) => { const b = new TextEncoder().encode(s); let x = ''; b.forEach(c => x += String.fromCharCode(c)); return btoa(x); };
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));

/** שומר שם אחד (או מוחק, אם name ריק) ישר לקובץ ב-GitHub. זורק שגיאה עם הודעה בעברית אם נכשל */
export async function saveName(key: string, name: string) {
  const token = getToken(); if (!token) throw new Error('אין מפתח');
  const api = `https://api.github.com/repos/${REPO}/contents/${PATH}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await fetch(`${api}?ref=${BRANCH}&t=${Date.now()}`, { headers, cache: 'no-store' });
    if (cur.status === 401 || cur.status === 403) throw new Error('המפתח לא תקין או שאין לו הרשאה לפרויקט');
    let sha: string | undefined, data: Record<string, string> = {};
    if (cur.ok) { const j = await cur.json(); sha = j.sha; try { data = JSON.parse(unb64(j.content)); } catch {} }
    if (name) data[key] = name; else delete data[key];
    const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
    const res = await fetch(api, {
      method: 'PUT', headers,
      body: JSON.stringify({ message: name ? `Rename "${key}" to "${name}"` : `Restore the name "${key}"`, content: b64(JSON.stringify(sorted, null, 1) + '\n'), sha, branch: BRANCH }),
    });
    if (res.ok) return;
    if (res.status === 409 || res.status === 422) continue;   // מישהו שמר בדיוק עכשיו: מנסים שוב על הגרסה החדשה
    if (res.status === 401 || res.status === 403) throw new Error('המפתח לא תקין או שאין לו הרשאה לכתוב');
    throw new Error(`השמירה נכשלה (${res.status})`);
  }
  throw new Error('השמירה נכשלה, נסה שוב');
}
