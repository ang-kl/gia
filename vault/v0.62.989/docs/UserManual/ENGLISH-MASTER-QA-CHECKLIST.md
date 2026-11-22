# Soleat English Master QA Checklist

Use this checklist before marking the English User Manual as ready for translation or TMA help integration.

## 1. User-facing clarity

- [ ] The manual explains who Soleat is for before listing features.
- [ ] The manual frames Soleat as food discovery, decision support, and eating planning — not only restaurant search.
- [ ] Sections use user-facing terms, not repo paths or implementation details.
- [ ] Owner/admin/diagnostic commands are not included as ordinary user commands.

## 2. Feature accuracy

- [ ] Each feature description matches current product behaviour.
- [ ] Features with partial or region-dependent availability use cautious wording.
- [ ] Live data features are described as decision support, not guarantees.
- [ ] Singapore-specific features are clearly labelled as Singapore-specific.

## 3. Command accuracy

- [ ] Public user commands are listed correctly.
- [ ] Aliases are correct where included.
- [ ] Retired, hidden, owner-only, or diagnostic commands are excluded from the public manual.

## 4. Terminology consistency

- [ ] Soleat Menu is named consistently.
- [ ] Cuisine Search is named consistently.
- [ ] Eatery Card is named consistently.
- [ ] Singapore Train Station Exits is named consistently.
- [ ] Singapore Bus Information is named consistently.
- [ ] Singapore Car Parks is named consistently.
- [ ] Sketchbook / Clipboard uses the approved structure: Catch-all → Cabinet → Drawer → Card.

## 5. Food-term and translation readiness

- [ ] Food examples preserve search intent.
- [ ] Ambiguous food words include cuisine or context where needed.
- [ ] Native-script and local food names are treated as food terminology, not ordinary prose.
- [ ] No translated manual should be produced before food-term review.

## 6. Help integration readiness

- [ ] Each major section has a stable help ID or planned help ID.
- [ ] Help IDs do not depend only on mutable headings.
- [ ] Help registry anchors match real manual headings.
- [ ] Future screenshot/image needs are identified.

## 7. Privacy and safety

- [ ] Privacy wording does not overpromise implementation details.
- [ ] `/forgetme` and `/privacy` are described cautiously and user-facingly.
- [ ] Users are advised to verify critical timing, availability, routes, and live information before acting.

## 8. Final editorial polish

- [ ] Repetitive explanations are removed.
- [ ] Sections are feature-rich but not padded.
- [ ] Wording is persuasive, polite, and succinct.
- [ ] All section numbers and links are correct.
