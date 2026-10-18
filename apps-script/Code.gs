/**
 * SAT Math progress backend — Google Apps Script web app.
 *
 * Saves every answer the students submit into a Google Sheet called
 * "SAT Math Progress" in the Drive of the account that deploys this script (Isaac).
 *   - GET  ?action=progress  → everyone's answers (nicknames only, no emails). Public, for the Progress section.
 *   - POST {idToken, attempts:[...]} → saves answers. Only works with a valid Google sign-in from a listed student.
 * Optional: run setupWeeklyEmail() once to get a progress email every Sunday evening.
 * Setup steps are in README.md.
 */
const CLIENT_ID = '1075824030904-5ehdg01idafeap3n6ij28oouf9mbkisf.apps.googleusercontent.com';
const STUDENTS = {                     // email → nickname (lowercase emails)
  'mosesforg@gmail.com': 'Moses',
  'benchvue101@gmail.com': 'Isaac'
};
const REPORT_TO = 'benchvue101@gmail.com';   // who gets the weekly email
const SITE_URL = 'https://benchvue.github.io/SAT-Math/';
const HEADER = ['id', 'time', 'email', 'nick', 'question', 'correct', 'answer', 'seconds'];

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty('SHEET_ID');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create('SAT Math Progress'); props.setProperty('SHEET_ID', ss.getId()); }
  let sh = ss.getSheetByName('attempts');
  if (!sh) {
    sh = ss.getSheets()[0].setName('attempts');
    sh.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows_() {
  const sh = sheet_(), n = sh.getLastRow();
  return n > 1 ? sh.getRange(2, 1, n - 1, HEADER.length).getValues() : [];
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Public read: compact list of answers, nicknames only. */
function doGet(e) {
  const nicks = Object.keys(STUDENTS).map(k => STUDENTS[k]);
  const attempts = rows_().map(r => [nicks.indexOf(String(r[3])), String(r[4]), r[5] === true || r[5] === 'TRUE' ? 1 : 0,
    Math.round(new Date(r[1]).getTime() / 1000), Number(r[7]) || 0]).filter(a => a[0] >= 0);
  return json_({ ok: true, users: nicks, attempts: attempts, updated: Date.now() });
}

/** Signed-in write: verifies the Google ID token, then appends new answers (duplicates are skipped by id). */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad request' }); }
  const who = verify_(body.idToken);
  if (!who) return json_({ ok: false, error: 'not signed in' });
  const list = Array.isArray(body.attempts) ? body.attempts.slice(0, 500) : [];
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(), n = sh.getLastRow();
    const seen = new Set(n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(r => String(r[0])) : []);
    const now = Date.now(), out = [];
    list.forEach(a => {
      const id = String(a.id || '').slice(0, 40), q = String(a.q || '');
      if (!id || seen.has(id) || !/^T\d{1,2}-M[12]-Q\d{1,2}$/.test(q)) return;
      let t = Number(a.t) || now; if (t > now + 6e4 || t < now - 400 * 864e5) t = now;
      seen.add(id);
      out.push([id, new Date(t), who.email, who.nick, q, !!a.ok, String(a.ans == null ? '' : a.ans).slice(0, 20),
        Math.max(0, Math.min(3600, Math.round(Number(a.s) || 0)))]);
    });
    if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, HEADER.length).setValues(out);
    return json_({ ok: true, saved: out.length, nick: who.nick });
  } finally { lock.releaseLock(); }
}

/** Checks a Google Sign-In ID token with Google, and that it belongs to a listed student. */
function verify_(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const key = 't' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  const p = JSON.parse(res.getContentText());
  if (p.aud !== CLIENT_ID || String(p.email_verified) !== 'true' || Number(p.exp) * 1000 < Date.now()) return null;
  const email = String(p.email).toLowerCase(), nick = STUDENTS[email];
  if (!nick) return null;
  const who = { email: email, nick: nick };
  cache.put(key, JSON.stringify(who), 300);
  return who;
}

/* ---------------- Weekly email for parents ---------------- */
const DOMAINS = [['Algebra', [1, 2, 3, 4, 5]], ['Advanced Math', [6, 7, 8, 9, 10, 11, 12, 13]],
  ['Problem-Solving & Data Analysis', [14, 15, 16, 17, 18, 19]], ['Geometry & Trigonometry', [20, 21, 22, 23, 24]]];
const CATS = {1:"Linear equations (one variable)",2:"Linear functions & graphs",3:"Systems of linear equations",
  4:"Linear inequalities",5:"Linear models & word problems",6:"Quadratic equations",
  7:"Quadratic functions & graphs",8:"Exponential functions & growth",9:"Polynomials & equivalent expressions",
  10:"Radicals & exponents",11:"Rational expressions & isolating a variable",12:"Nonlinear systems",
  13:"Function notation & transformations",14:"Percentages",15:"Ratios, rates & unit conversion",
  16:"Probability & two-way tables",17:"Statistics: center & spread",18:"Data displays & scatterplots",
  19:"Sampling & margin of error",20:"Lines, angles & triangles",21:"Right triangles & trigonometry",
  22:"Circles: arcs, angles & inscribed figures",23:"Circle equations",24:"Area, volume & surface area"};
const QCAT = {"T4-M1-Q1":18,"T4-M1-Q2":14,"T4-M1-Q3":6,"T4-M1-Q4":5,"T4-M1-Q5":5,"T4-M1-Q6":15,"T4-M1-Q7":5,"T4-M1-Q8":2,"T4-M1-Q9":20,"T4-M1-Q10":18,"T4-M1-Q11":5,"T4-M1-Q13":1,"T4-M1-Q14":3,"T4-M1-Q15":2,"T4-M1-Q16":8,"T4-M1-Q17":15,"T4-M1-Q18":24,"T4-M1-Q19":11,"T4-M1-Q20":22,"T4-M1-Q21":10,"T4-M1-Q22":20,"T4-M1-Q23":9,"T4-M1-Q24":12,"T4-M1-Q25":21,"T4-M1-Q26":7,"T4-M1-Q27":8,"T4-M2-Q1":18,"T4-M2-Q2":15,"T4-M2-Q3":9,"T4-M2-Q4":3,"T4-M2-Q5":4,"T4-M2-Q6":1,"T4-M2-Q7":13,"T4-M2-Q8":13,"T4-M2-Q9":8,"T4-M2-Q10":19,"T4-M2-Q11":4,"T4-M2-Q12":6,"T4-M2-Q13":16,"T4-M2-Q14":2,"T4-M2-Q15":5,"T4-M2-Q17":1,"T4-M2-Q18":7,"T4-M2-Q19":7,"T4-M2-Q20":21,"T4-M2-Q21":6,"T4-M2-Q23":8,"T4-M2-Q24":17,"T4-M2-Q25":23,"T4-M2-Q26":24,"T4-M2-Q27":14,"T5-M1-Q2":5,"T5-M1-Q4":3,"T5-M1-Q5":2,"T5-M1-Q7":17,"T5-M1-Q9":5,"T5-M1-Q10":19,"T5-M1-Q11":1,"T5-M1-Q12":4,"T5-M1-Q13":12,"T5-M1-Q14":5,"T5-M1-Q15":24,"T5-M1-Q17":15,"T5-M1-Q18":5,"T5-M1-Q19":21,"T5-M1-Q20":21,"T5-M1-Q21":7,"T5-M1-Q22":23,"T5-M1-Q23":24,"T5-M1-Q24":8,"T5-M1-Q25":14,"T5-M1-Q26":7,"T5-M1-Q27":9,"T5-M2-Q1":14,"T5-M2-Q3":13,"T5-M2-Q4":9,"T5-M2-Q5":5,"T5-M2-Q6":1,"T5-M2-Q7":6,"T5-M2-Q8":2,"T5-M2-Q10":13,"T5-M2-Q12":16,"T5-M2-Q13":2,"T5-M2-Q14":24,"T5-M2-Q15":17,"T5-M2-Q16":20,"T5-M2-Q17":9,"T5-M2-Q18":10,"T5-M2-Q19":4,"T5-M2-Q20":3,"T5-M2-Q21":22,"T5-M2-Q22":24,"T5-M2-Q23":11,"T5-M2-Q24":6,"T5-M2-Q25":8,"T5-M2-Q26":23,"T5-M2-Q27":24,"T7-M1-Q1":18,"T7-M1-Q2":24,"T7-M1-Q3":1,"T7-M1-Q4":5,"T7-M1-Q6":2,"T7-M1-Q7":9,"T7-M1-Q9":20,"T7-M1-Q10":13,"T7-M1-Q12":3,"T7-M1-Q13":1,"T7-M1-Q14":3,"T7-M1-Q15":23,"T7-M1-Q16":13,"T7-M1-Q17":8,"T7-M1-Q18":8,"T7-M1-Q19":11,"T7-M1-Q20":18,"T7-M1-Q21":5,"T7-M1-Q22":22,"T7-M1-Q23":4,"T7-M1-Q24":2,"T7-M1-Q25":21,"T7-M1-Q26":5,"T7-M1-Q27":7,"T7-M2-Q1":5,"T7-M2-Q2":14,"T7-M2-Q4":15,"T7-M2-Q5":16,"T7-M2-Q6":13,"T7-M2-Q7":13,"T7-M2-Q8":1,"T7-M2-Q9":9,"T7-M2-Q10":9,"T7-M2-Q11":5,"T7-M2-Q13":24,"T7-M2-Q14":20,"T7-M2-Q15":8,"T7-M2-Q16":4,"T7-M2-Q17":10,"T7-M2-Q18":3,"T7-M2-Q19":6,"T7-M2-Q20":6,"T7-M2-Q21":20,"T7-M2-Q22":13,"T7-M2-Q23":13,"T7-M2-Q24":21,"T7-M2-Q25":23,"T7-M2-Q26":15,"T7-M2-Q27":12,"T8-M1-Q1":5,"T8-M1-Q2":16,"T8-M1-Q4":9,"T8-M1-Q5":19,"T8-M1-Q6":1,"T8-M1-Q7":14,"T8-M1-Q8":2,"T8-M1-Q9":20,"T8-M1-Q10":2,"T8-M1-Q11":18,"T8-M1-Q12":8,"T8-M1-Q13":3,"T8-M1-Q14":9,"T8-M1-Q16":9,"T8-M1-Q17":11,"T8-M1-Q18":22,"T8-M1-Q19":21,"T8-M1-Q20":7,"T8-M1-Q21":4,"T8-M1-Q22":4,"T8-M1-Q23":17,"T8-M1-Q24":6,"T8-M1-Q25":7,"T8-M1-Q26":8,"T8-M1-Q27":22,"T8-M2-Q2":15,"T8-M2-Q4":5,"T8-M2-Q5":21,"T8-M2-Q6":13,"T8-M2-Q7":13,"T8-M2-Q8":2,"T8-M2-Q9":5,"T8-M2-Q10":13,"T8-M2-Q11":3,"T8-M2-Q12":21,"T8-M2-Q13":24,"T8-M2-Q14":11,"T8-M2-Q15":5,"T8-M2-Q16":1,"T8-M2-Q17":5,"T8-M2-Q18":10,"T8-M2-Q20":22,"T8-M2-Q21":14,"T8-M2-Q22":24,"T8-M2-Q23":3,"T8-M2-Q24":20,"T8-M2-Q25":3,"T8-M2-Q26":10,"T8-M2-Q27":7,"T9-M1-Q1":20,"T9-M1-Q2":1,"T9-M1-Q3":15,"T9-M1-Q4":13,"T9-M1-Q5":9,"T9-M1-Q6":17,"T9-M1-Q7":5,"T9-M1-Q8":5,"T9-M1-Q9":5,"T9-M1-Q10":11,"T9-M1-Q11":8,"T9-M1-Q12":22,"T9-M1-Q13":3,"T9-M1-Q14":17,"T9-M1-Q15":21,"T9-M1-Q16":5,"T9-M1-Q17":13,"T9-M1-Q18":15,"T9-M1-Q19":3,"T9-M1-Q20":14,"T9-M1-Q21":10,"T9-M1-Q22":13,"T9-M1-Q23":2,"T9-M1-Q24":13,"T9-M1-Q25":15,"T9-M1-Q26":16,"T9-M1-Q27":24,"T9-M2-Q1":1,"T9-M2-Q2":9,"T9-M2-Q3":16,"T9-M2-Q4":3,"T9-M2-Q5":2,"T9-M2-Q7":13,"T9-M2-Q8":2,"T9-M2-Q9":12,"T9-M2-Q10":2,"T9-M2-Q11":8,"T9-M2-Q12":5,"T9-M2-Q13":2,"T9-M2-Q14":6,"T9-M2-Q15":21,"T9-M2-Q16":14,"T9-M2-Q18":7,"T9-M2-Q19":20,"T9-M2-Q20":8,"T9-M2-Q21":8,"T9-M2-Q22":4,"T9-M2-Q23":15,"T9-M2-Q24":22,"T9-M2-Q25":11,"T9-M2-Q26":8,"T9-M2-Q27":6,"T11-M1-Q2":1,"T11-M1-Q3":2,"T11-M1-Q5":16,"T11-M1-Q6":14,"T11-M1-Q8":5,"T11-M1-Q10":19,"T11-M1-Q13":5,"T11-M1-Q14":8,"T11-M1-Q16":6,"T11-M1-Q17":5,"T11-M1-Q20":23,"T11-M1-Q21":6,"T11-M1-Q22":17,"T11-M1-Q27":2,"T11-M2-Q1":9,"T11-M2-Q3":24,"T11-M2-Q4":3,"T11-M2-Q5":13,"T11-M2-Q6":1,"T11-M2-Q8":4,"T11-M2-Q12":2,"T11-M2-Q14":23,"T11-M2-Q15":18,"T11-M2-Q16":9,"T11-M2-Q17":2,"T11-M2-Q21":14,"T11-M2-Q26":21,"T11-M2-Q27":15,"T4-M1-Q12":2,"T4-M2-Q16":20,"T4-M2-Q22":3,"T5-M1-Q1":12,"T5-M1-Q3":2,"T5-M1-Q6":3,"T5-M1-Q8":20,"T5-M1-Q16":13,"T5-M2-Q2":18,"T5-M2-Q9":7,"T5-M2-Q11":18,"T7-M1-Q5":18,"T7-M1-Q8":8,"T7-M1-Q11":12,"T7-M2-Q3":7,"T7-M2-Q12":18,"T8-M1-Q3":8,"T8-M1-Q15":9,"T8-M2-Q1":2,"T8-M2-Q3":20,"T9-M2-Q6":20,"T9-M2-Q17":17,"T6-M1-Q1":1,"T6-M1-Q2":18,"T6-M1-Q3":6,"T6-M1-Q4":4,"T6-M1-Q5":7,"T6-M1-Q6":15,"T6-M1-Q7":5,"T6-M1-Q8":2,"T6-M1-Q9":8,"T6-M1-Q10":5,"T6-M1-Q11":4,"T6-M1-Q12":9,"T6-M1-Q13":13,"T6-M1-Q14":24,"T6-M1-Q15":7,"T6-M1-Q16":2,"T6-M1-Q17":11,"T6-M1-Q18":6,"T6-M1-Q19":17,"T6-M1-Q20":2,"T6-M1-Q21":7,"T6-M1-Q22":14,"T6-M1-Q23":23,"T6-M1-Q24":21,"T6-M1-Q25":8,"T6-M1-Q26":13,"T6-M1-Q27":20,"T6-M2-Q1":13,"T6-M2-Q2":20,"T6-M2-Q3":16,"T6-M2-Q4":2,"T6-M2-Q5":2,"T6-M2-Q6":3,"T6-M2-Q7":14,"T6-M2-Q8":9,"T6-M2-Q9":15,"T6-M2-Q10":1,"T6-M2-Q11":5,"T6-M2-Q12":9,"T6-M2-Q13":15,"T6-M2-Q14":6,"T6-M2-Q15":17,"T6-M2-Q16":24,"T6-M2-Q17":6,"T6-M2-Q18":2,"T6-M2-Q19":2,"T6-M2-Q20":10,"T6-M2-Q21":3,"T6-M2-Q22":21,"T6-M2-Q23":8,"T6-M2-Q24":10,"T6-M2-Q25":23,"T6-M2-Q26":18,"T6-M2-Q27":3,"T8-M2-Q19":17,"T10-M1-Q1":18,"T10-M1-Q2":3,"T10-M1-Q3":4,"T10-M1-Q4":13,"T10-M1-Q5":5,"T10-M1-Q6":13,"T10-M1-Q7":4,"T10-M1-Q8":16,"T10-M1-Q9":20,"T10-M1-Q10":1,"T10-M1-Q11":10,"T10-M1-Q12":2,"T10-M1-Q13":3,"T10-M1-Q14":13,"T10-M1-Q15":13,"T10-M1-Q16":8,"T10-M1-Q17":8,"T10-M1-Q18":2,"T10-M1-Q19":4,"T10-M1-Q20":3,"T10-M1-Q21":21,"T10-M1-Q22":24,"T10-M1-Q23":23,"T10-M1-Q24":20,"T10-M1-Q25":14,"T10-M1-Q26":5,"T10-M1-Q27":6,"T10-M2-Q1":15,"T10-M2-Q2":18,"T10-M2-Q3":2,"T10-M2-Q4":24,"T10-M2-Q5":11,"T10-M2-Q6":17,"T10-M2-Q7":13,"T10-M2-Q8":14,"T10-M2-Q9":5,"T10-M2-Q10":12,"T10-M2-Q11":20,"T10-M2-Q12":1,"T10-M2-Q13":5,"T10-M2-Q14":8,"T10-M2-Q15":21,"T10-M2-Q16":5,"T10-M2-Q17":11,"T10-M2-Q18":8,"T10-M2-Q19":5,"T10-M2-Q20":23,"T10-M2-Q21":2,"T10-M2-Q22":1,"T10-M2-Q23":8,"T10-M2-Q24":6,"T10-M2-Q25":9,"T10-M2-Q26":17,"T10-M2-Q27":20,"T11-M1-Q1":20,"T11-M1-Q4":6,"T11-M1-Q7":3,"T11-M1-Q9":13,"T11-M1-Q11":9,"T11-M1-Q12":12,"T11-M1-Q15":18,"T11-M1-Q18":3,"T11-M1-Q19":21,"T11-M1-Q23":8,"T11-M1-Q24":20,"T11-M1-Q25":3,"T11-M1-Q26":24,"T11-M2-Q2":18,"T11-M2-Q7":8,"T11-M2-Q9":8,"T11-M2-Q10":4,"T11-M2-Q11":8,"T11-M2-Q13":20,"T11-M2-Q18":7,"T11-M2-Q19":5,"T11-M2-Q20":10,"T11-M2-Q22":7,"T11-M2-Q23":20,"T11-M2-Q24":6,"T11-M2-Q25":17};

/** Run once from the editor: sends weeklyReport() every Sunday around 6 PM (script time zone). */
function setupWeeklyEmail() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'weeklyReport').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('weeklyReport').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).create();
}

function weeklyReport() {
  const rows = rows_(), now = Date.now(), wk = now - 7 * 864e5;
  const totals = DOMAINS.map(d => Object.keys(QCAT).filter(k => d[1].indexOf(QCAT[k]) >= 0).length);
  let html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#18233A">';
  html += '<h2 style="margin:0 0 4px">SAT Math — weekly progress</h2><p style="color:#5B6578;margin:0 0 16px">' +
    Utilities.formatDate(new Date(wk), Session.getScriptTimeZone(), 'MMM d') + ' – ' + Utilities.formatDate(new Date(now), Session.getScriptTimeZone(), 'MMM d') + '</p>';
  Object.keys(STUDENTS).forEach(email => {
    const nick = STUDENTS[email], mine = rows.filter(r => String(r[3]) === nick).sort((a, b) => new Date(a[1]) - new Date(b[1]));
    const week = mine.filter(r => new Date(r[1]).getTime() >= wk);
    const byQ = {}; mine.forEach(r => (byQ[r[4]] = byQ[r[4]] || []).push(r));
    const days = {}; week.forEach(r => days[Utilities.formatDate(new Date(r[1]), Session.getScriptTimeZone(), 'yyyy-MM-dd')] = 1);
    const right = week.filter(r => r[5] === true).length;
    const open = Object.keys(byQ).filter(k => byQ[k][byQ[k].length - 1][5] !== true).length;
    const topic = {}; Object.keys(byQ).forEach(k => { const c = QCAT[k]; if (!c) return; topic[c] = topic[c] || { n: 0, f: 0 }; topic[c].n++; if (byQ[k][0][5] === true) topic[c].f++; });
    const weak = Object.keys(topic).filter(c => topic[c].n >= 3).sort((a, b) => topic[a].f / topic[a].n - topic[b].f / topic[b].n).slice(0, 2);
    html += '<h3 style="margin:18px 0 6px">' + nick + '</h3><ul style="margin:0;padding-left:18px">' +
      '<li>This week: <b>' + week.length + '</b> answers on <b>' + Object.keys(days).length + '</b> day(s), ' + (week.length ? Math.round(right / week.length * 100) : 0) + '% correct</li>' +
      '<li>Total questions tried: <b>' + Object.keys(byQ).length + '</b> of 432</li>' +
      '<li>Open mistakes to review: <b>' + open + '</b></li>' +
      (weak.length ? '<li>Focus next: ' + weak.map(c => CATS[c] + ' (' + Math.round(topic[c].f / topic[c].n * 100) + '% first try)').join(', ') + '</li>' : '') +
      '</ul><p style="margin:6px 0 0;color:#5B6578">' + DOMAINS.map((d, i) => d[0] + ' ' + Object.keys(byQ).filter(k => d[1].indexOf(QCAT[k]) >= 0).length + '/' + totals[i]).join(' · ') + '</p>';
  });
  html += '<p style="margin-top:20px"><a href="' + SITE_URL + '#progress">Open the Progress page</a></p></div>';
  MailApp.sendEmail({ to: REPORT_TO, subject: 'SAT Math weekly progress', htmlBody: html });
}
