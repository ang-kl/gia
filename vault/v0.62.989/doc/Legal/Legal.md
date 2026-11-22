# Legal Template

> Per CLAUDE.md §3: this folder records **disclaimer, data sources, jurisdiction notes**. Per §4.1: add + amendment, no deletion.

Versioned files: `legal-<v>-<d>.md`. Copy this template to bootstrap a new entry.

---

## 1. Disclaimer

Plain-language disclaimer surfaced to end users:

> _<placeholder — copy-paste into a /legal command response or website footer>_

## 2. Data Sources & Attribution

| Source | URL | Use | Attribution required | Status |
|---|---|---|---|---|
| Google Places API | maps.googleapis.com | venue lookup + reviews | "Data © Google" + Maps Platform branding | active |
| Google Maps Routes Matrix | routes.googleapis.com | walking minutes | per Maps Platform terms | active |
| Gemini API | ai.google.dev | reasoning + refinement | "Summarized with Gemini" disclosure | active |
| LTA DataMall | datamall2.mytransport.sg | MRT alerts, traffic incidents, bus stops | "Source: LTA" | active |
| NEA | api-open.data.gov.sg | weather + 2-hour forecast | "Source: NEA" | active |
| HDB carpark availability | api.data.gov.sg | carpark lots | "Source: HDB / Data.gov.sg" | active |
| data.gov.sg | api-open.data.gov.sg | public holidays | "Source: data.gov.sg" | active |
| Telegram WebApp | telegram.org | bot + WebApp shell | per Telegram Bot Terms | active |

## 3. Jurisdiction & Privacy

- **Jurisdiction:** Singapore. Bot serves SG-specific data sets and complies with Singapore-side terms (LTA / NEA data licences, HDB carpark licence).
- **Personal data:** Telegram chat IDs (numeric), Telegram user IDs (numeric), language code, geolocation (when shared by the user). No persistent identity binding beyond Telegram's own user record.
- **Storage:** Redis-only (no SQL DB). TTLs: location 24 h, pick cache 60 s, share tokens 7 d, recent picks 24 h, place reviews 24 h, public holidays 90 d.
- **Retention:** no off-platform export; no analytics SDK; no third-party cookies; no advertising IDs.

## 4. AI Disclosure

> Gemini-generated content (Sanctuary read, dish recommendations, cost estimates, travel advice) is labelled with "Summarized with Gemini" or equivalent on each surface where it appears. Estimates (queue minutes, cost band) carry an explicit "(est)" suffix to avoid implying ground-truth accuracy.

---

## Rule reference

- **AU-3:** Legal is permanent record; no deletions.
- **AU-7:** amendments quote prior verbatim then append change with rationale + serial number.
