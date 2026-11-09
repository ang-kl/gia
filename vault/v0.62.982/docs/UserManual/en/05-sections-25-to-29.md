# Soleat User Manual — Sections 25 to 29

## 25. Sketchbook / Clipboard

Sketchbook / Clipboard helps you save food ideas and turn them into a plan.

It is more than a simple copied-items list. It lets you keep eatery cards, organise them into planning groups, and reuse them later when deciding where to go.

### 25.1 What Clipboard is

Clipboard is the catch-all holding area.

When you copy one eatery card or copy all results, those cards first land in Clipboard. Use Clipboard when you want to keep useful candidates without deciding immediately.

### 25.2 What Sketchbook is

Sketchbook is the planning space built around saved cards.

Use Sketchbook when you want to turn saved eateries into a food trail, trip, day plan, event plan, lunch shortlist, dinner shortlist, or backup list.

### 25.3 Catch-all, Cabinet, Drawer, and Card

Sketchbook uses a simple structure:

```text
Catch-all
  = copied cards land here first

Cabinet
  = larger plan, such as a trip, outing, event, or food trail

Drawer
  = section inside a cabinet, such as breakfast, lunch, dinner, supper, whole day, day tag, route segment, or backup options

Card
  = saved eatery card or planning note
```

### 25.4 When to use Sketchbook

Use Sketchbook when you want to:

- save places before deciding;
- plan a food trail;
- organise places by meal time;
- group eateries by trip, day, event, or area;
- keep backup options;
- compare possible stops;
- share a selected drawer where supported; or
- return to a plan later.

### 25.5 Example food plan

You could create a cabinet called:

```text
Saturday Food Trail
```

Then add drawers such as:

```text
Breakfast
Lunch
Tea Break
Dinner
Backup Options
```

Each drawer can hold saved eatery cards that fit that part of the day.

### 25.6 Use `/clipboard`

To open Sketchbook / Clipboard from Telegram chat, type:

```text
/clipboard
```

Where available, this opens or recalls your saved cards and planning space.

### 25.7 Planning tips

Do not save every result.

Save the places that are useful, interesting, convenient, or worth revisiting.

When planning a trip or food trail, file cards by time slot and check opening hours before relying on the plan.

## 26. Search Tips

Good searches usually combine food intent with location and context.

Start broad when exploring. Get specific when deciding.

### 26.1 Start broad, then narrow

If you do not know what you want, start with a cuisine or food style.

Example:

```text
Japanese near Orchard
```

Then narrow the search if needed:

```text
ramen near Orchard MRT
Japanese grilled fish near Orchard
```

### 26.2 Use dish names when cuisine is too broad

Cuisine can be too wide.

If “Chinese” returns too many possibilities, try a dish or dish family:

```text
dim sum near Chinatown
Chinese dumplings near Chinatown
roasted duck near Bugis
```

### 26.3 Use cuisine context when dish words are ambiguous

Some food words mean different things in different cuisines.

Better:

```text
Japanese gyoza near Orchard
Korean mandu near Tanjong Pagar
Singapore dumpling soup near Bugis
```

Less clear:

```text
dumpling
```

### 26.4 Use practical words when time or occasion matters

If you are choosing around real-life constraints, include the situation.

Examples:

```text
quick lunch near Raffles Place
solo dinner near Orchard
late supper near Bugis
set meal near City Hall
```

### 26.5 Use map, transport, and weather context

A good food result may still be inconvenient.

Before deciding, check map view, station context, Singapore Train Station Exits, Singapore Bus Information, Singapore Car Parks, and weather where relevant.

### 26.6 Save good candidates

If a place looks interesting but does not fit the current moment, save it into Sketchbook.

A saved place can become useful later for a trip, food trail, event, or backup option.

## 27. Common Problems

This section lists common issues and practical ways to recover.

### 27.1 Results are too broad

Add more context.

Try adding:

- a cuisine;
- a dish name;
- a location;
- a cooking method;
- a time of day;
- a practical need; or
- a recognised or hidden-gem intent.

Example:

```text
dumpling
```

can become:

```text
Chinese dumplings near Chinatown
```

### 27.2 Results are too narrow

Remove one constraint.

Try a broader cuisine, nearby area, simpler dish term, or fewer filters.

Example:

```text
Korean BBQ set meal near one small street before 6 PM
```

can become:

```text
Korean near Tanjong Pagar
```

### 27.3 No results appear

Try again with a broader location or simpler food term.

If the search depends on live data, map data, transport data, car park data, weather data, or external services, results may vary.

### 27.4 The place is not practical to visit

Use map view and practical context.

Check station access, station exits, bus information, car parks, weather, and opening hours.

If the place is still interesting, save it into Sketchbook for another day.

### 27.5 The food term is misunderstood

Add cuisine or local context.

For example, instead of:

```text
dumpling
```

try:

```text
Japanese gyoza
Chinese dumplings
Singapore dumpling soup
Korean mandu
```

### 27.6 The Mini App does not open

Try returning to the Telegram chat and using the relevant command again.

If the issue continues, check your network connection, Telegram app state, and whether the feature is currently available.

### 27.7 The map looks crowded

Hide layers you do not need.

Turn on only the layer that helps the current decision, such as food results, train, bus, car park, hawker centres, or attractions.

### 27.8 A saved card is in the wrong place

Move it to the correct drawer where supported.

If you are unsure, keep it in the catch-all first, then file it later into a cabinet and drawer.

## 28. Privacy, Data, and User Control

Soleat may use location, saved cards, language preference, and other user choices to support search and planning features.

Use privacy and control commands when you want to review or remove stored information.

### 28.1 Saved locations

Saved locations help you reuse places for future searches.

Only save locations that are useful to you. You can use typed places when you do not want to rely on current location.

### 28.2 Saved cards and Sketchbook items

Copied eatery cards may appear in Clipboard and may be organised into Sketchbook.

Use Sketchbook for planning, but avoid saving unnecessary personal notes or sensitive information.

### 28.3 Shared drawer links

Where sharing is supported, a shared drawer is meant for sharing a selected part of a plan, not necessarily your whole Sketchbook.

Share only what you are comfortable showing to others.

### 28.4 Use `/privacy`

To read privacy information, type:

```text
/privacy
```

### 28.5 Use `/forgetme`

To request removal of stored user data where supported, type:

```text
/forgetme
```

Use this when you want Soleat to remove stored information associated with your use.

### 28.6 Language preference

Use `/language` when you want to change the interface language.

Food meaning may still depend on local dish names, cuisine context, and native-script names, not only interface language.

## 29. Support and Limitations

Soleat helps with food discovery, decision support, and eating plans, but it should not replace user judgment.

Use Soleat as a planning assistant, then verify critical details before going.

### 29.1 What Soleat can help with

Soleat can help you:

- choose where to eat;
- discover cuisines and dishes;
- compare food places;
- check practical context;
- save and organise places;
- plan food stops; and
- reduce decision friction.

### 29.2 What Soleat may not know

Soleat may not always know:

- sudden closures;
- temporary menu changes;
- sold-out items;
- queue length;
- exact seating conditions;
- last-minute transport disruption;
- changed car park availability;
- weather changes after forecast; or
- whether a set meal is still available at the time you arrive.

### 29.3 Verify important details

Before making time-sensitive plans, verify opening hours, route, transport, car park availability, reservation needs, and any must-have dish or set meal.

### 29.4 Use good judgment

A result can be interesting but still unsuitable for the current situation.

Choose based on food interest, timing, location, budget, route, weather, queue tolerance, and who you are eating with.

### 29.5 Keep planning flexible

For trips, food trails, or events, keep backup options in Sketchbook.

A good plan should include alternatives if a place is closed, crowded, too far, or no longer suitable.
