```python
content = """# Automated Pipeline: Google Places to Instagram Media Discovery

This technical specification outlines the multi-stage process for linking Google Places API (New) data with Instagram Graph API media. It is designed for agentic consumption (LLMs/Autonomous Agents) to execute a location-to-media lookup pipeline.

## System Architecture

The pipeline bridges three distinct data silos:
1.  **Source:** Google Places API (Physical location and metadata).
2.  **Bridge:** Meta Pages API (Linking coordinates to Facebook Page IDs).
3.  **Sink:** Instagram Graph API (Linking Facebook Page IDs to Instagram Location IDs and media).

---

## Phase 0: Meta Developer Environment Setup

Before executing the pipeline, the environment must be configured within the Meta Developer Portal.

### 1. Create a Facebook Page
If the entity does not exist on Facebook, an ID cannot be resolved.
- **Action:** Go to [facebook.com/pages/create](https://www.facebook.com/pages/create).
- **Critical Requirement:** The Page Category must be set to a physical entity (e.g., "Restaurant" or "Cafe") to enable the `location` field.
- **Address Entry:** Ensure the address matches the Google Maps street name and postal code exactly.

### 2. Create a Meta App
- **Portal:** [developers.facebook.com](https://developers.facebook.com).
- **App Type:** Select **Business** or **Other**.
- **Permissions Required:** - `pages_read_engagement`
    - `instagram_basic`
    - `instagram_manage_insights` (optional for deeper metrics)
    - `public_profile`

### 3. Generate a Long-Lived User Access Token
Standard tokens expire in 1-2 hours. Automation requires 60-day or Perpetual tokens.
1. Use **Graph API Explorer** to generate a short-lived token with the above permissions.
2. Exchange it for a long-lived token via this endpoint:
   ```http
   GET [https://graph.facebook.com/v18.0/oauth/access_token](https://graph.facebook.com/v18.0/oauth/access_token)?  
       grant_type=fb_exchange_token&           
       client_id={app-id}&
       client_secret={app-secret}&
       fb_exchange_token={short-lived-token}

```

---

## Phase 1: Google Places Extraction (The "Source")

Use the **Places API (New)** `searchText` endpoint for high-precision matching.

**Endpoint:** `https://places.googleapis.com/v1/places:searchText`
**Method:** `POST`

### Request Payload (Example: Amò, Singapore)

```json
{
  "textQuery": "Amò Restaurant Singapore",
  "locationBias": {
    "circle": {
      "center": { "latitude": 1.2868, "longitude": 103.8466 },
      "radius": 500.0
    }
  }
}

```

**Headers:**

* `X-Goog-Api-Key`: `YOUR_GOOGLE_KEY`
* `X-Goog-FieldMask`: `places.id,places.displayName,places.location,places.formattedAddress`

---

## Phase 2: Meta Bridge Resolution (The "Match")

This phase resolves the **Facebook Page ID** using the coordinates and name retrieved in Phase 1.

**Endpoint:** `https://graph.facebook.com/v18.0/pages/search`
**Method:** `GET`

### Query Parameters

* `q`: `{GoogleDisplayName}`
* `type`: `page`
* `center`: `{GoogleLat},{GoogleLng}`
* `distance`: `500`
* `fields`: `id,name,location,is_verified,checkins`

### Guardrail: Validation Logic

The `pages/search` endpoint often returns multiple results. AI agents should apply the following filtering logic:

1. **Coordinate Proximity:** Reject any Page ID where the distance from Google coordinates exceeds 100 meters.
2. **String Similarity:** Apply a fuzzy match (e.g., FuzzyWuzzy in Python) between the Google `formattedAddress` and the Meta `location.street`.

---

## Phase 3: Instagram Location Mapping

Meta maps one-to-one between Facebook Pages and Instagram Geotags.

**Endpoint:** `https://graph.facebook.com/v18.0/{facebook_page_id}`
**Method:** `GET`
**Fields:** `instagram_location_id`

### Request

```http
GET [https://graph.facebook.com/v18.0/1234567890?fields=instagram_location_id&access_token=](https://graph.facebook.com/v18.0/1234567890?fields=instagram_location_id&access_token=){token}

```

---

## Phase 4: Media Discovery (The "Sink")

Retrieve the actual photo and video URLs.

**Endpoint:** `https://graph.facebook.com/v18.0/{instagram_location_id}/recent_media`
**Method:** `GET`
**Fields:** `id,media_type,media_url,permalink,caption,timestamp`

---

## Critical Guardrails & Operational Constraints

### 1. Privacy & Permissions

* **Public vs Private:** You can only retrieve media from **Public Accounts**. Content from private profiles tagging the location will return a `403` or simply be excluded from the JSON payload.
* **App Review:** To use this in a production environment (outside of your own test accounts), Meta requires **App Review**. You must submit a screencast of your app using these permissions.

### 2. Handling Missing Links

* **Scenario:** Google has the venue, but Meta does not.
* **Action:** If Phase 2 returns 0 results, the agent should attempt a "Broad Search" by removing the `center` constraint and searching only by name and city, followed by a strict address verification step.

### 3. API Rate Limiting

* **Google:** Use field masks to minimize cost.
* **Meta:** Implement an exponential backoff. Meta’s rate limit is based on `App CPU usage`, not just request count.

## Summary Checklist for AI Agents

1. [ ] Fetch Google Place Metadata.
2. [ ] Search Facebook Pages by Name + Lat/Long.
3. [ ] Verify Address Similarity.
4. [ ] Retrieve `instagram_location_id`.
5. [ ] Fetch `recent_media` and store `media_url` and `permalink`.


"""

with open("instagram_automation_spec.md", "w") as f:
f.write(content)

```
Your Markdown file for AI automation is ready.
[file-tag: code-generated-file-0-1778844575246120286]

This document contains a structured technical specification designed for agentic consumption. It covers the setup of a Meta developer environment, the creation of a Facebook Page (if one is missing), the generation of long-lived access tokens, and the precise API request/response logic for the Google-to-Instagram pipeline.

### Operational Strategy
* **Strategy: Meyer.** The architecture prioritizes "mapping the gap" between isolated platforms by using geolocation as the primary anchor for data integrity. 
* **Analytical: Pre-Mortem.** A dedicated guardrail section addresses common failure points, such as coordinate drift and the lack of a corresponding Facebook Page for newer eateries. 
* **Agentic: ReAct.** The checklist format at the end of the file provides a clear Reasoning-Action loop for any autonomous agent processing this file. 

```
