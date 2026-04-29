# gia
Gia4lunch. Telegram - Raffles Place Lunch Dilemma
# Gia4lunch (v1.0) 🌿

**Gia4lunch** is a predictive urban guide and "Vibe-Sensing" agent designed for the solo female diner in Singapore’s CBD. It transforms real-time transit data and merchant intelligence into a "Sanctuary Score," helping users navigate subterranean linkways and find quiet, high-quality dining spots during peak hours.

---

## 🏗 System Architecture

The project utilizes a **Zero-Server, Utility-First Personalization** strategy. Personal data stays in the user's private vault (Google Drive), while the intelligence layer runs on **Railway** via a multi-service "Hub and Spoke" model.

- **Hub:** Railway Orchestrator (Node.js/TypeScript)
- **Memory:** Redis (Internal Private Network)
- **Sensing Spokes:** - **LTA Sensor:** Real-time MRT/Bus sniffing via DataMall v6.8.
    - **Vibe Sensor:** Cheerio-based scrapers for SethLui, Honeycombers, and RSS discovery.
    - **Intelligence Layer:** GrabID OAuth 2.0 PKCE integration for merchant occupancy and indoor maps.

---

## 👤 Personas & Workflows

### The "Gia" User
- **Profile:** Professional woman, mid-50s, working in Raffles Place.
- **Goal:** Find a "Sanctuary" (quiet, high-vibe) lunch spot without the stress of crowds or weather.
- **Workflow:** 1. **11:45 AM Pulse:** Gia checks the user's "Favorites" against LTA disruptions and merchant "quietness" signals.
    2. **DryRoute Guidance:** If it's raining, Gia generates a subterranean route through B1/B2 linkways.
    3. **Handshake:** Securely logs in via GrabID to see live queue times without sharing data with the server.

---

## 🛠 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Runtime** | Node.js (TypeScript) |
| **Hosting** | [Railway](https://railway.app) (Hobby Plan) |
| **State** | Redis (Upstash / Railway Plugin) |
| **Interface** | Telegram Mini App (TMA) |
| **Scraping** | Cheerio / Axios |
| **Auth** | OAuth 2.0 PKCE (Zero-Secret) |

---

## 🚀 Deployment (Railway Browser Workflow)

This repository is optimized for **Railpack (2026)** deployment.

1. **GitHub Link:** Connect this private repo to your Railway project.
2. **Environment Variables:**
   - `TELEGRAM_BOT_TOKEN`: From @BotFather.
   - `LTA_ACCOUNT_KEY`: Your LTA DataMall v6.8 Key.
   - `REDIS_URL`: `${{Redis.REDIS_URL}}` (Internal reference).
3. **Internal Networking:** The bot and worker services communicate over Railway's private network for maximum security.

---

## 📝 Governance & Principles

- **[Agur's Wisdom]:** Restraint over provocation. The bot provides "smallness with wisdom"—precise, quiet notifications only when necessary.
- **Zero-Footprint:** No user identity or location history is stored on Railway; the "Personal Vault" (Google Drive) is the only source of truth.
- **Singaporean Context:** Adheres to local linguistic nuances and CBD-specific geographic data (e.g., Raffles Place linkway mapping).

---

## 📜 License
Internal Study Project. Proprietary to the Gia4lunch Development Team.


## Consolidating the Phase 1 Specification

I have generated the comprehensive **PHASE_1_SETUP_SPEC.md**. This document integrates the high-level project vision (Gia's persona and touchpoints) with the granular technical requirements for the Railway deployment and LTA sensing. [§82.1]

### 1. Expanded Functional Sections
* **Persona Calibration:** Formalizes the mid-50s professional's journey, focusing on the 11:45 AM "Pulse" and the "DryRoute" subterranean guidance. [§82.2]
* **Redis State Logic:** Defines exactly how Gia should remember the transit status to avoid excessive API calls, ensuring "Smallness with Wisdom" [Agur's Wisdom - context: Strategy]. [§82.3]
* **Verification Protocol:** Links the success of your Macbook CLI tests directly to the Railway environment variables. [§82.4]

### 2. The "Zero-Server" Mandate
The document reaffirms that no user identity will be held in the Redis memory or the Node.js runtime. By setting this standard in Phase 1, we ensure that as you scale into Phase 2 (Google/Grab), the privacy architecture remains uncompromised. [§82.5]

### 3. Immediate Action Plan
1.  **Commit the Spec:** Upload `PHASE_1_SETUP_SPEC.md` to your GitHub. This will be the "Source of Truth" for your build. [§82.6]
2.  **Verify Redis Internal Link:** Ensure your Railway "App" box is connected to your "Redis" box via the `${{Redis.REDIS_URL}}` variable. [§82.7]
3.  **The "Pulse" Test:** Deploy the provided boilerplate code and check if the `/status` command works in your Telegram bot. [§82.8]

