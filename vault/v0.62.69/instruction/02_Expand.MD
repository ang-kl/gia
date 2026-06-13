# Project Gia4lunch: Phase 2 Core Integration Spec

## 1. Objective
Transform Gia4lunch into a domain-specific, location-aware 'Solo-Diner Sanctuary' assistant for Singapore/Malaysia. The bot must integrate real-time transit data (LTA) with intelligent food discovery (Gemini 3.0 + Google Places) while strictly adhering to a defined topical domain.

## 2. Domain Lockdown & Logic
### 2.1 Topic Gatekeeper
- **Constraint:** Restrict AI responses to: Food, Meals, Groceries, and Singapore Transit.
- **Action:** If a query falls outside these bounds, use the 'Gia Persona' (mid-50s wise guide) to politely steer the user back.
- **Persona:** Professional, precise, helpful, and grounded in Singaporean urban context.

### 2.2 The "Sensing" Layer (Gemini 3.0 Flash)
- **Library:** `@google/generative-ai`
- **Model:** `gemini-3-flash`
- **Feature: Vibe Synthesis:**
    - Input: Raw reviews from Google Places API (New).
    - Output: A 3-bullet summary focused on 'Sanctuary' traits (Quietness, Solo Seating availability, Staff friendliness to solo diners).
    - Grounding: Use Gemini to verify 'Open Now' status and cross-reference recent review sentiment (last 7-30 days).

## 3. API Integrations
### 3.1 Google Places API (New)
- **Fields Required:** `displayName`, `formattedAddress`, `id` (Place ID), `currentOpeningHours`, `reviews`, `location`.
- **Search Logic:**
    - **Walking Radius:** 300m from current coordinates.
    - **Transit Radius:** 1 MRT stop away (requires LTA handshake).

### 3.2 LTA DataMall Expansion
- **Endpoints:**
    - `/TrainServiceAlerts`: Real-time status of MRT/LRT lines.
    - `/BusArrivalv2`: Real-time bus timings for nearby stops.
    - `/TrafficImages`: (Optional) Check for congestion if user query implies a drive/Grab.
- **MRT Logic:** If '1 MRT stop away' is requested, identify adjacent stations and check line health before recommending food near those stations.

## 4. Hardware & Interface (iPadOS/iOS Optimization)
### 4.1 Deep-Link Architecture
- **Requirement:** Every recommendation must use the Universal Link format to trigger native apps correctly on iPad/iPhone.
- **Link Format:** `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(Name)}&query_place_id=${place_id}`.
- **Why:** This prevents 'Generic Coordinate' pins and ensures the building name appears in the native map app.

### 4.2 Telegram Interface
- **Command:** Implement `/eat`, `/drink`, `/groceries`, and `/status`.
- **Venue Support:** Use `bot.sendVenue` for the primary response to show the native iOS map preview.
- **TMA (Telegram Mini App):** Create/Update `public/index.html` to embed a Google Map using the JS SDK to show the 'Pulse' of the CBD.

## 5. Data Migration (The Redis Vault)
- **Source:** Port the curated 200+ locations (CSV/KML) into the Railway Redis instance.
- **Priority:** Gia must check the 'Redis Vault' for a match before performing a general Google search.

## 6. Implementation Task List for Claude
1. Run `npm install @google/generative-ai`.
2. Update `.env` / Railway variables to include `GEMINI_API_KEY`.
3. Refactor `index.js` to include the `Gatekeeper` logic.
4. Implement the `getTransitContext()` function to fetch LTA alerts before food searches.
5. Build the `summarizeVibe()` function using the Gemini SDK.
6. Ensure all Map buttons use the `place_id` query string.
