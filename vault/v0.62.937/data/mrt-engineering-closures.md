# Singapore MRT Engineering Closures (rolling 90-day window)

**Source:** SMRT (smrt.com.sg/Travel/Service-Updates), SBS Transit, LTA  
**Last updated:** 03 May 2026  
**Schema:** `date` (YYYY-MM-DD) · `line` (NSL/EWL/CCL/NEL/DTL/TEL/CGL/BPL/SLRT/PLRT) · `direction` · `type` (early-closure / late-opening / closure / extension-test) · `time` · `note`

Maintainer: Human Lead. Update this file when SMRT/SBS publishes new advisories.
Closures past their date are auto-pruned by `mrt-engineering.js` (next deploy).

---

## Active closures

| Date | Line | Direction | Type | Time | Note |
|---|---|---|---|---|---|
| 2026-05-10 | TEL | Outram Park → Marina Bay | early-closure | from 23:00 | TEL4 extension testing |
| 2026-05-17 | EWL | Pasir Ris → Tanah Merah | late-opening | until 07:30 | Track maintenance |
| 2026-05-24 | NSL | Marina South Pier → Marina Bay | early-closure | from 22:30 | Signalling upgrade |
| 2026-06-07 | CCL | HarbourFront → Telok Blangah | late-opening | until 08:00 | CCL6 extension prep |

---

## Notes

- Replacement bus services are typically provided by SMRT/SBS — see official channels for routes.
- LTA's TrainServiceAlerts API (live `/api/transport/status` feed) covers same-day disruptions; this file is for advance scheduled works.
- When NEA/SMRT announces a multi-day closure, add one row per affected day for accurate "today's closures" filtering.
