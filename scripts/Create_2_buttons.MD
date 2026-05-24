# 2 buttons
# 24 May 2026
Implement two special toggle buttons inside the Cuisine list:

1. Add special cuisine buttons:
- “Fruits”
- “Durian”

These two buttons are not normal cuisine filters. They are exclusive search-mode filters.

Behaviour for “Fruits”:
- When “Fruits” is toggled ON, the search mode must focus only on fruit-related sellers.
- Prioritise:
  - fruit sellers
  - fruit stalls
  - fresh fruit shops
  - fruit juice sellers
  - fruit juice stalls
- Do not combine “Fruits” with normal cuisine filters.
- Do not combine “Fruits” with Michelin filters.
- Do not combine “Fruits” with dessert filters.
- “Fruits” may be combined only with:
  - place name
  - specific fruit name, e.g. mango, papaya, watermelon, guava
  - fruit preparation style, e.g. cut fruit, fresh juice, smoothie, blended, chilled, rojak-style only if fruit-led
- The search intent should remain fruit-led, not dessert-led or beverage-led generally.

Behaviour for “Durian”:
- When “Durian” is toggled ON, the search mode must focus only on durian-related sellers.
- Prioritise:
  - durian sellers
  - durian stalls
  - durian shops
  - durian delivery or takeaway listings only if relevant to the current location search
- Do not combine “Durian” with normal cuisine filters.
- Do not combine “Durian” with Michelin filters.
- Do not combine “Durian” with dessert filters unless the result is clearly durian-led.
- “Durian” may be combined only with:
  - place name
  - durian type, e.g. Mao Shan Wang, D24, Red Prawn, Black Thorn
  - durian preparation style, e.g. fresh durian, durian puree, durian puff, durian dessert only if durian is the main intent

Exclusive toggle logic:
- “Fruits” and “Durian” are mutually exclusive.
- If “Fruits” is toggled ON, automatically clear “Durian”.
- If “Durian” is toggled ON, automatically clear “Fruits”.
- When either “Fruits” or “Durian” is ON:
  - grey out all normal cuisine toggle choices
  - disable Michelin toggle choices
  - disable dessert toggle choices
  - prevent the user from selecting conflicting filters
- The disabled toggles should visually appear inactive.
- They should not be clickable until the special toggle is cleared or Reset is tapped.

Reset and clearing behaviour:
- If the user taps the active “Fruits” button again, clear the “Fruits” mode and re-enable all normal cuisine choices.
- If the user taps the active “Durian” button again, clear the “Durian” mode and re-enable all normal cuisine choices.
- If the user taps Reset, clear both special modes and restore all cuisine, Michelin, and dessert filters to their default usable state.

Search query construction:
- When “Fruits” is active, build search terms around fruit sellers and fruit juice sellers only.
- When “Durian” is active, build search terms around durian sellers only.
- Do not append normal cuisine terms when either special mode is active.
- Do not append Michelin terms when either special mode is active.
- Do not append dessert terms unless explicitly allowed above and still led by the special mode.

UI placement:
- Place “Fruits” and “Durian” visibly inside the Cuisine list.
- Mark them as special filters, visually distinct if the current UI style allows it.
- Keep the label short:
  - Fruits
  - Durian

Acceptance checks:
- Selecting “Fruits” disables other cuisine choices and searches only fruit-related sellers.
- Selecting “Durian” disables other cuisine choices and searches only durian-related sellers.
- Selecting “Fruits” then “Durian” switches from Fruits mode to Durian mode.
- Selecting “Durian” then “Fruits” switches from Durian mode to Fruits mode.
- Tapping the active special button clears it.
- Reset clears all special states and restores normal filter behaviour.
- No search should combine Fruits or Durian with normal cuisine, Michelin, or general dessert filters.

Create a Pull Request and include test coverage for returned-result sufficiency.

PR requirement:
- Create a PR for this change.
- The PR must include the implementation, test cases, and a short test report.
- The PR should clearly explain how “Fruits” and “Durian” exclusive-mode search logic works.
- The PR should also document how the search behaves across different geographic zones.

Returned-result sufficiency tests:
Test that “Fruits” and “Durian” return enough useful results across these zones:

Singapore zones:
- Central Singapore
- North Singapore
- North-East Singapore
- East Singapore
- West Singapore
- South Singapore / HarbourFront / Sentosa area

Malaysia zones:
- Johor Bahru
- Petrajaya / Petra Jaya, Sarawak

Important note:
- Treat “Petrajaya” and “Petra Jaya” as possible spelling variants.
- If the app’s location system cannot support Sarawak / Petra Jaya yet, the PR must state this clearly in the test report instead of silently passing.

Minimum result sufficiency logic:
- For dense food areas, aim for at least 8 to 12 relevant results.
- For less dense areas, return the best available relevant results and show a clear fallback message if results are limited.
- Results must be relevant to the active special mode.
- Do not fill weak results by adding unrelated cuisines, Michelin places, general desserts, cafés, or broad restaurants.

Test scenarios:
1. Fruits active in each Singapore zone:
- Expected: fruit sellers, fruit stalls, fresh fruit shops, juice stalls, or fruit-led beverage sellers.
- Reject: general dessert shops, cafés, Michelin restaurants, or mixed cuisine places unless fruit is the main search intent.

2. Durian active in each Singapore zone:
- Expected: durian stalls, durian sellers, durian shops, or durian delivery/takeaway listings where relevant.
- Reject: general dessert shops or restaurants unless durian is the main search intent.

3. Fruits active in Johor Bahru:
- Expected: fruit sellers, fruit stalls, fruit juice sellers, pasar-style fruit stalls, or fruit-led shops.
- Reject: normal restaurants or dessert cafés unless fruit-led.

4. Durian active in Johor Bahru:
- Expected: durian stalls, durian sellers, durian shops, durian farms or durian-specialist sellers if within useful search range.
- Reject: unrelated desserts, cafés, or general restaurants.

5. Fruits active in Petrajaya / Petra Jaya:
- Expected: fruit sellers, fruit stalls, fruit juice sellers, or relevant local fruit shops.
- If results are weak, report actual count and fallback behaviour.

6. Durian active in Petrajaya / Petra Jaya:
- Expected: durian sellers, durian stalls, durian shops, or durian-led listings.
- If results are weak, report actual count and fallback behaviour.

Fallback behaviour:
- If fewer than the target number of results are found, widen the search radius progressively.
- Do not weaken the semantic intent.
- Show a user-friendly message such as:
  “Limited matches nearby. Showing the closest fruit-related results.”
  or
  “Limited durian sellers nearby. Showing the closest relevant matches.”
- Do not secretly mix in unrelated cuisine results just to increase the count.

Quality checks:
- Returned result title, category, or description should contain strong signals such as:
  - fruit
  - fruits
  - fresh fruit
  - fruit juice
  - juice
  - smoothie
  - durian
  - durian seller
  - durian stall
  - durian shop
  - specific durian variety names
- For multilingual/local results, allow relevant Malay or Chinese terms where available, for example:
  - buah
  - jus buah
  - durian
  - 榴莲
  - 水果
  - 果汁

PR test report should include:
- Zone tested
- Special mode tested: Fruits or Durian
- Search radius used
- Number of returned results
- Number of relevant results after filtering
- Examples of accepted results
- Examples of rejected results, if any
- Whether fallback was triggered
- Any known limitation

Acceptance criteria:
- “Fruits” and “Durian” work as exclusive modes.
- Other cuisine, Michelin, and dessert toggles are greyed off while either special mode is active.
- Returned results remain strongly relevant to Fruits or Durian.
- Singapore zone tests pass with sufficient relevant results where data is available.
- Johor Bahru tests pass or clearly report data limitations.
- Petrajaya / Petra Jaya tests pass or clearly report location/data limitations.
- The PR must not pass by adding unrelated restaurants or generic dessert listings.
``` [

