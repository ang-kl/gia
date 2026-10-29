# GIA / Cuisine TMA — Michelin-Only Footer Pagination

**Implementation instruction for AI coding agent**  
**Scope:** Existing Gia repository and existing Michelin Guide result flow only  
**Reference UI:** Footer contains left controls (`hide results`, `list`), a centred status area, and right controls (`top`, `end`).

---

## Objective

Implement pagination for Michelin Guide results with the pagination control placed **only in the centre of the results footer**.

Pagination must appear only when the final Michelin result count is greater than the existing selected display criterion or page-size limit.

Do not place pagination at the top of the result list, inside result cards, in a floating control, in a drawer header, or anywhere else.

---

## Required Data Flow

Apply operations in this exact order:

```text
Year Filter → Michelin Sorting → Pagination
```

Use the existing Michelin records, fields, filters, result limits, state management, and rendering pipeline.

Do not create a new table, schema, dataset, storage layer, or parallel result system.

---

## 1. Michelin Year Filter

Use the existing award-year field:

```js
awardYears: ["'26", "'25"]
```

Provide Michelin year filter chips:

```text
'26
'25
```

Both years are selected by default.

Use intersection logic:

```js
const matchesSelectedYear = restaurant.awardYears.some(
  year => selectedAwardYears.includes(year)
);
```

A record is included when at least one value in `awardYears` overlaps the selected year chips.

---

## 2. Michelin Sorting

Sorting must occur after filtering and before pagination.

### Year priority

```text
'26 > '25
```

### Michelin category priority

```text
3★ → 2★ → 1★ → Bib Gourmand
```

Use the existing category values and fields. A compatible rank map may be used locally in the existing sorting pipeline:

```js
const MichelinRankMap = {
  "three-star": 4,
  "two-star": 3,
  "one-star": 2,
  "bib-gourmand": 1
};
```

Sort in this order:

1. Newest applicable selected award year
2. Michelin category rank
3. Existing alphabetical fallback

Do not modify the stored Michelin records merely to support sorting.

---

## 3. Pagination Trigger

Pagination must be conditional.

Show the pagination control only when:

```js
filteredAndSortedResults.length > selectedPageSize
```

Here, `selectedPageSize` means the existing result quantity, display criterion, or page-size value already selected by the user or configured by the application.

Examples:

```text
12 filtered Michelin results, page size 12 → no pagination
13 filtered Michelin results, page size 12 → show pagination
24 filtered Michelin results, page size 12 → show pagination
```

When filtering reduces the result count to the selected page size or fewer, remove the pagination control immediately.

Do not render disabled or empty pagination merely to reserve space.

---

## 4. Michelin Guide Only

The new footer pagination behaviour applies only when the active result source or mode is Michelin Guide.

Do not activate it for:

- ordinary cuisine searches;
- nearby results;
- hawker-only listings;
- station or location searches;
- saved places;
- non-Michelin recognition filters;
- any other existing result mode.

Use the repository's existing Michelin-mode or recognition-state detection. Do not infer Michelin mode from visible text when a reliable application state already exists.

Example guard:

```js
const shouldShowMichelinPagination =
  isMichelinGuideMode &&
  filteredAndSortedResults.length > selectedPageSize;
```

Adapt names to the repository's actual state and component structure.

---

## 5. Footer Placement

Place the pagination UI only in the **centre section of the existing footer**.

Preserve the current footer arrangement:

```text
LEFT                      CENTRE                     RIGHT
hide results · list       Michelin pagination       top · end
```

The control must be visually centred relative to the footer, not merely inserted after the left-side controls.

Use the footer's existing layout system. Prefer the smallest compatible change, such as a three-region grid:

```css
.results-footer {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.results-footer__left {
  justify-self: start;
}

.results-footer__centre {
  justify-self: center;
}

.results-footer__right {
  justify-self: end;
}
```

Do not change the footer's existing outer shape, rounded treatment, safe-area handling, background, border, spacing language, or Telegram Mini App behaviour unless required for correct centring.

The existing environment/version text may remain in its current footer row. Do not replace it with pagination. Add or use a dedicated centred pagination region in the appropriate footer row.

---

## 6. Compact Mobile UI

UI estate is expensive. Keep the pagination control compact.

Preferred formats:

```text
‹ 1 / 3 ›
```

or, when the repository already uses page buttons:

```text
‹ 1 2 3 ›
```

Prefer the first format on narrow screens.

Requirements:

- Previous and next controls must have accessible labels.
- Disable Previous on the first page.
- Disable Next on the last page.
- Do not show first/last-page text links unless already supported by the existing component.
- Do not duplicate the existing `top` and `end` footer controls.
- Avoid verbose labels such as `Previous page` and `Next page` in visible mobile UI.
- Maintain suitable Telegram touch targets even when the visible control is compact.

Example:

```html
<nav class="michelin-pagination" aria-label="Michelin result pages">
  <button aria-label="Previous Michelin results page">‹</button>
  <span>1 / 3</span>
  <button aria-label="Next Michelin results page">›</button>
</nav>
```

---

## 7. Pagination Calculation

Use the existing page-size value.

```js
const totalResults = filteredAndSortedResults.length;
const totalPages = Math.ceil(totalResults / selectedPageSize);

const startIndex = (currentPage - 1) * selectedPageSize;
const endIndex = startIndex + selectedPageSize;

const visibleResults = filteredAndSortedResults.slice(
  startIndex,
  endIndex
);
```

Do not paginate before filtering or sorting.

Do not calculate the page count from the unfiltered Michelin dataset.

The visible result count and page count must reflect the active year selection and all other applicable Michelin criteria.

---

## 8. State Reset Rules

Reset `currentPage` to page 1 when any result-defining criterion changes, including:

- Michelin award-year chips;
- Michelin category selection;
- selected page size or result quantity;
- country, city, location, or search area;
- Michelin mode entering or leaving;
- another filter that changes the Michelin result set.

Also clamp the current page when the result count decreases:

```js
const safePage = Math.min(currentPage, Math.max(totalPages, 1));
```

This prevents blank pages after filtering.

Do not reset the page because of unrelated footer interactions such as `top`, `end`, `hide results`, or list/map display switching unless the existing application intentionally resets all result state.

---

## 9. Page Navigation Behaviour

When the user changes page:

1. update only the Michelin result page;
2. preserve the selected Michelin criteria;
3. preserve the current search area and map state;
4. render the correct result slice;
5. move focus or scroll to the beginning of the Michelin result list using the repository's existing behaviour;
6. do not perform a new external data fetch when all filtered records are already locally available.

Do not scroll the entire Telegram Mini App unpredictably. Use the existing results container or anchor where available.

---

## 10. No-Result and Single-Page Behaviour

When there are no matching Michelin results:

- use the existing empty-state message;
- hide pagination.

When there is exactly one page:

- hide pagination.

When there are multiple pages:

- show pagination only in the footer centre.

---

## 11. Preserve Existing Structures

Do not:

- create a new database table;
- create a Michelin history table;
- redesign the Michelin schema;
- duplicate the Michelin dataset;
- add a separate backend pagination service;
- replace the existing result drawer;
- move or remove `hide results`, `list`, `top`, or `end`;
- change the footer layout beyond what is needed to provide a true centre region;
- show promotion, downgrade, or lost-award commentary.

Use the existing Michelin record structure, including:

```js
awardYears: ["'26", "'25"]
```

Consecutive years remain compactly displayed as:

```text
'26, '25
```

A changed award category shows only the year applicable to that displayed category. Do not explain that it was promoted or downgraded.

---

## 12. Responsive Behaviour

Verify the footer at:

- narrow iPhone width;
- Telegram in-app browser;
- Android narrow width;
- larger mobile and desktop widths;
- safe-area inset devices;
- increased text size where supported.

The centre pagination must not overlap:

- `hide results`;
- `list`;
- `top`;
- `end`;
- the footer edge or rounded corners.

When horizontal space becomes constrained:

1. keep pagination centred;
2. preserve all existing controls;
3. reduce nonessential gaps before reducing touch-target size;
4. use the compact `‹ n / total ›` format;
5. do not wrap pagination into a random position.

---

## 13. Accessibility

Ensure:

- the pagination container has an accessible label;
- icon-only buttons have meaningful `aria-label` values;
- disabled buttons use the correct disabled state;
- keyboard activation works where applicable;
- screen readers announce the current page and total pages;
- focus is not lost after a page change;
- colour alone is not used to indicate disabled state.

---

## 14. Required Tests

Add or update tests within the existing test structure.

Cover at least:

1. Michelin results equal to page size → pagination hidden.
2. Michelin results greater than page size → pagination shown.
3. Non-Michelin results greater than page size → this Michelin pagination hidden.
4. Filtering from multiple pages to one page → pagination disappears.
5. Filtering while on a later page → current page resets or clamps safely.
6. `'26` and `'25` filtering occurs before pagination.
7. Year and category sorting occur before slicing.
8. Page 1 displays the first correct slice.
9. Last page displays the remaining records without duplication.
10. Previous is disabled on page 1.
11. Next is disabled on the final page.
12. Pagination appears only in the footer centre.
13. Existing footer controls remain functional.
14. Existing Michelin/Hawker joins and result cards remain unaffected.

---

## 15. Acceptance Criteria

The implementation is complete only when all statements below are true:

- Pagination is visible only for Michelin Guide mode.
- Pagination appears only when filtered Michelin results exceed the selected page-size criterion.
- Pagination is rendered only at the centre of the existing footer.
- No pagination control appears at the top or inside the result list.
- The execution order is `Filter → Sort → Paginate`.
- The count and total pages use the filtered Michelin result set.
- Page state resets or clamps after criteria changes.
- The footer's left and right controls remain unchanged and functional.
- The mobile footer remains balanced and usable.
- No database table or schema is created.
- Existing Michelin records and integrations remain compatible.
- Tests and production build pass.

---

## 16. AI Working Method

Before changing code:

1. inspect the current Michelin result pipeline;
2. identify the existing page-size or selected-result criterion;
3. identify the existing footer component and its left, centre, and right regions;
4. identify the reliable Michelin-mode state;
5. identify any existing pagination utility that can be reused;
6. report the exact files proposed for modification.

Then implement the smallest safe change.

Do not make unrelated visual or architectural changes.

After implementation, report:

- files changed;
- existing state and utilities reused;
- pagination trigger used;
- footer placement method;
- tests added or updated;
- build and test results;
- any repository-specific limitation that required a deviation.

If repository evidence conflicts with this instruction, stop and explain the conflict before introducing a new structure.
