# SAT Math Practice by Topic

**Live site:** https://benchvue.github.io/SAT-Math/

A study website that takes every math question from the eight official SAT practice tests (Practice Tests 4 through 11, digital SAT, linear/paper versions) and reorganizes them by topic, so you can see how the College Board tests each skill across many different tests.

## Why this exists

The official practice tests are the best predictor of what appears on the real SAT. But working through them one full test at a time makes it hard to see patterns: the same idea shows up again and again in different tests, often with only the numbers or the context changed.

This site sorts all **432 questions** (8 tests × 2 modules × 27 questions) into **24 topics** grouped by the four official SAT Math content domains. The goal is to make question relationships visible: open one topic and you see every version of that question type side by side, in test order, so you can learn the pattern rather than a single problem.

## What's on the site

- **24 topic buttons**, grouped into the four SAT Math domains. Click one to see only that topic's questions.
- **One question per page**, shown exactly as printed in the official practice test (cropped directly from the PDFs, including graphs, tables and figures), with **Previous** and **Next** buttons. Arrow keys also work.
- **Instant checking**: A/B/C/D buttons for multiple choice and an answer box for student-produced responses (fractions like `15/17` are accepted), plus a short explanation for every question.
- **Question breakdown** on the home page showing the total count and each domain's share.
- **Graph quizzes**: five interactive drills (angles on a circle, the Pythagorean theorem, linear, quadratic and exponential graphs) with answer checking and a score out of 100 saved in the browser.
- **Math score table**: converts the number of correct answers (out of 54) into an SAT Math section score range.
- **Learning path** (`learning.html`): 42 short, hands-on lessons in 6 groups that build each idea step by step before students practice the matching SAT questions.
- **Student sign-in** (Google): every answer is saved to the student's record. Each question shows up to 4 circles for the first tries (green ✓ = right, orange ✕ = wrong), so you can see whether it was right the first time or how many tries it took. Questions can be answered again with **Try again**.
- **Progress** (bottom of the home page, no sign-in needed): each student's progress per domain and topic, questions answered over 7 days / 4 weeks / 12 months, and a summary card for parents.

## Learning path

| Group | Steps | Leads to SAT topics |
|---|---|---|
| Linear functions | 8 | Linear functions & graphs, linear equations, linear models, systems |
| Quadratic functions | 9 | Quadratic functions & graphs, quadratic equations, nonlinear systems |
| Exponential functions | 8 | Exponential functions & growth, percentages |
| Angles and triangles | 9 | Lines, angles & triangles; circles: arcs and angles |
| Pythagorean theorem | 4 | Right triangles & trigonometry |
| Circles on the coordinate plane | 4 | Circle equations |

Most lessons come from the 8-week GeoGebra course (https://benchvue.github.io/GeoGebra/). The 8 exponential lessons and 2 quadratic lessons (factored form, find the quadratic) were added in `learning/`. Every group ends with links to the graph quiz and the matching SAT topic, and links like `index.html#topic-8` open a topic directly.

## Student records and the Progress section

### How it works

```
Student signs in with Google ──► index.html ──(answers + Google ID token)──► Apps Script web app ──► Google Sheet
                                     ▲                                        (runs as Isaac)        "SAT Math Progress"
Anyone (parents) ────────────────────┴──────────(read: nicknames + results only)───────────────┘     in Isaac's Drive
```

- Students sign in with **Sign in with Google**. Only the emails listed in `SYNC.users` (index.html) and `STUDENTS` (apps-script/Code.gs) are accepted; the Apps Script checks every sign-in token with Google before saving.
- Answers are first saved on the device, then sent to the sheet. If the internet drops, they wait and sync later.
- The public Progress section shows nicknames and results only, never email addresses.
- Everything is stored in one Google Sheet in Isaac's Drive, so it can also be opened, filtered or downloaded directly.
- To preview the Progress section with made-up numbers before setup: open `index.html?demo`.

### One-time setup (about 10 minutes)

1. **Create the backend.** Signed in as benchvue101@gmail.com, go to https://script.google.com → **New project**. Replace the code with the contents of `apps-script/Code.gs` and save.
2. **Authorize it.** In the editor, choose the function `doGet` and press **Run**. Allow the permissions (Sheets, external requests, email). This creates the sheet **SAT Math Progress** in your Drive.
3. **Deploy.** **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Press **Deploy** and copy the **Web app URL** (it ends in `/exec`).
4. **Connect the site.** In `index.html`, find `apiUrl: ""` near the top of the main script and paste the URL between the quotes. Commit and push.
5. **Let the students sign in.** In Google Cloud Console → **APIs & Services → OAuth consent screen**: if the app is in *Testing*, add mosesforg@gmail.com and benchvue101@gmail.com as **Test users** (or publish the app; sign-in only uses basic profile and email, which needs no review).
6. **Weekly email (optional).** In the Apps Script editor, run `setupWeeklyEmail` once. Every Sunday around 6 PM you get a summary email for both students.

Sign-in works only on https://benchvue.github.io (the authorized origin). To test on your own computer, add for example `http://localhost:8000` to **Authorized JavaScript origins** and run `python3 -m http.server 8000`.

**When you change Code.gs later:** Deploy → Manage deployments → ✏️ Edit → Version: *New version* → Deploy. The URL stays the same.

**Adding a student:** add the email and nickname to `SYNC.users` in index.html (with a color) and to `STUDENTS` in Code.gs, then redeploy the script.

### Security notes

- The **client secret** and the **Drive API key** are not used anywhere on this site and must never be put in a web page. Because they were shared in a chat, reset the client secret (Credentials → your OAuth client → *Reset secret*) and restrict or delete the API key.
- The Client ID in index.html is public by design; Google only accepts it from the authorized origin.

## Topic distribution

| Domain | Questions | Share | Topics |
|---|---|---|---|
| Algebra | 133 | 30.8% | Linear equations, linear functions & graphs, systems of linear equations, linear inequalities, linear models & word problems |
| Advanced Math | 146 | 33.8% | Quadratic equations, quadratic functions & graphs, exponential functions, polynomials, radicals & exponents, rational expressions, nonlinear systems, function notation & transformations |
| Problem-Solving & Data Analysis | 75 | 17.4% | Percentages, ratios & unit conversion, probability & two-way tables, statistics, data displays & scatterplots, sampling & margin of error |
| Geometry & Trigonometry | 78 | 18.1% | Lines, angles & triangles, right triangles & trigonometry, circles, circle equations, area & volume |
| **Total** | **432** | **100%** | |

This is close to the official digital SAT blueprint (about 35% / 35% / 15% / 15%). Some borderline questions, such as a linear model shown in a table, could reasonably fit more than one topic.

## Source material

All questions come from the official College Board SAT practice tests, available free at:
https://satsuite.collegeboard.org/practice/practice-tests/paper

The SAT and the practice test content belong to the College Board. This site is a non-commercial study aid. Please use the official tests and answer explanations from the College Board as the authoritative reference.

## Notes on the answer key

The practice test PDFs used here do not include answer keys, so the answers and explanations on this site were worked out independently. If an answer looks wrong, check it against the official College Board scoring guide and answer explanations.

## Files

- `index.html`: the practice site (question images are embedded, so it also works offline).
- `learning.html`: the learning path hub.
- `learning/lab.css`, `learning/lab.js`: shared style and graph helpers for the new lessons.
- `learning/exponential/*.html`: 8 exponential lessons.
- `learning/quadratic/*.html`: 2 quadratic lessons.
- `apps-script/Code.gs`: the Google Apps Script backend that saves answers to a Google Sheet and sends the weekly email.
- `README.md`: this file.
