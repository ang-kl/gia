// dish-types.js — heuristic dictionary that classifies a dish name into
// a coarse type bucket (v0.60.181 / operator request — "succinct …
// type of dishes (meat, fish, vege, dessert, drink, fusion, starter)").
//
// Per operator: ship as a hard-coded heuristic now; curate later as
// misclassifications surface. NOT an authoritative source — it's
// regex-first and biased toward Soleat's SEA/SA/SG-dominant catalogue.
// Anything not matched falls back to `null` (caller decides whether to
// show "—" or hide the tag).
//
// Ordering matters: longer / more specific patterns run before generic
// ones (e.g. "dal makhani" should match the dal vege bucket before any
// generic fallback). The categories are deliberately COARSE — five
// course buckets (starter, main, side, dessert, drink) plus three
// protein/style overlays (meat, fish, vege). A dish can pick up both
// a course + a protein tag (e.g. "momo" → meat + starter; "dal bhat"
// → vege + main).

// Course buckets — what kind of dish in the meal flow.
const COURSE_PATTERNS = [
  // ── dessert ──
  { rx: /\b(cake|tart|pie|pudding|cookie|biscuit|chocolate|truffle|kheer|halwa|barfi|jalebi|gulab\s*jamun|laddu|kulfi|payasam|ondeh|chendol|cendol|ice\s*kachang|ais\s*kacang|kueh|kuih|kakigori|mochi|dorayaki|taiyaki|crepe|waffle|gelato|tiramisu|panna\s*cotta|baklava|knafeh|kanafeh|halva|sel\s*roti|yomari|sata|sata\s*andagi|brigadeiro|alfajor|tres\s*leches|flan|churros)\b/i, type: 'dessert' },
  // ── drink ──
  { rx: /\b(tea|kopi|coffee|teh|chai|chai\s*latte|lassi|juice|smoothie|milkshake|matcha|hojicha|chocolate\s*drink|hot\s*chocolate|bandung|barley|grass\s*jelly|herbal\s*tea|bubble\s*tea|boba|kombucha|cocktail|mocktail|wine|beer|sake|soju|raki|arak|jenever|ouzo|raksi|tongba|chhang|juju\s*dhau)\b/i, type: 'drink' },
  // ── starter (small / shared / appetiser) ──
  { rx: /\b(samosa|pakora|pakoda|tikki|chaat|momos?(?!\s*soup)|gyoza|dumpling|wonton|pierogi|empanada|spring\s*roll|popiah|kuay\s*pie\s*tee|otah|otak|satay|sate|kebab|kabab|skewer|tapas|mezze|hummus|baba\s*ganoush|tabbouleh|salad|gado|rojak|ngoh\s*hiang|crab\s*cake|fried\s*tofu|bara|jhol\s*momos?)\b/i, type: 'starter' },
  // ── side ──
  { rx: /\b(achaar|achar|atjar|pickle|raita|chutney|condiment|sambal|kimchi|banchan|naan|chapati|roti(?!\s*prata)|paratha|papad|papadum|prata|appam|idli|dosa|injera|gundruk|sinki|sukuti|nimona)\b/i, type: 'side' },
  // ── main (catch-all for anything left that's a substantial dish) ──
  { rx: /\b(curry|biryani|rice|noodle|pho|laksa|rendang|nasi|mee|kway|kuay|hokkien|chow|mein|pad\s*thai|tom\s*yum|tom\s*kha|sinigang|adobo|kare|bibimbap|bulgogi|tteok|tteokbokki|ramen|udon|soba|sukiyaki|shabu|nimono|donburi|sushi|sashimi|tonkatsu|katsu|stew|braise|braised|roast|roasted|hot\s*pot|hotpot|stir\s*fry|stir-fried|fried|grilled|baked|paella|risotto|pasta|lasagna|lasagne|tagine|moussaka|goulash|cassoulet|coq\s*au\s*vin|bouillabaisse|dal(?:\s*bhat|\s*makhani|\s*tadka)?|bhat|thukpa|choila|dhindo|chatamari|kwati|bara|chhoyala|lapsi|bhutuwa|sukuti|kachila|aloo\s*tama|kothey|jhol)\b/i, type: 'main' }
];

// Protein / style overlays — applied on top of the course bucket.
const PROTEIN_PATTERNS = [
  // ── fish / seafood ──
  { rx: /\b(fish|sashimi|sushi|salmon|tuna|cod|sea\s*bass|prawn|shrimp|crab|lobster|squid|octopus|clam|oyster|mussel|calamari|anchovy|sardine|mackerel|otah|otak|laksa|tom\s*yum\s*goong|bouillabaisse|paella(?:.*marisco)?|ceviche)\b/i, type: 'fish' },
  // ── meat ──
  { rx: /\b(chicken|beef|pork|lamb|mutton|goat|duck|turkey|bacon|sausage|chorizo|ham|venison|game|rabbit|buffalo|yak|kebab|kabab|satay|sate|sekuwa|sukuti|kachila|chhoyala|choila|bhutuwa|kothey|tonkatsu|katsu|bulgogi|wagyu|bistek|adobo|biryani(?!\s*veg)|tikka|tandoori|momos?(?!\s*veg)|gyoza|dumpling|chinchu)\b/i, type: 'meat' },
  // ── vegetarian ──
  { rx: /\b(vegetarian|veg(?:gie)?|vegan|paneer|tofu|tempeh|lentil|dal\b|chana|chickpea|bean|aloo|potato|spinach|sag\b|saag|gundruk|sinki|nettle|mushroom|cauliflower|brinjal|aubergine|eggplant|okra|bhindi|gobi|cabbage|nimona|kwati|chatamari|dhindo|sel\s*roti|yomari|chaat|samosa|pakora|idli|dosa|appam|injera|tabbouleh|hummus|gado)\b/i, type: 'vege' }
];

function classifyDishType(name, cuisineSlug = null) {
  if (!name || typeof name !== 'string') return { course: null, overlay: null, tags: [] };
  const text = String(name).toLowerCase();

  let course = null;
  for (const p of COURSE_PATTERNS) {
    if (p.rx.test(text)) { course = p.type; break; }
  }

  let overlay = null;
  for (const p of PROTEIN_PATTERNS) {
    if (p.rx.test(text)) { overlay = p.type; break; }
  }

  // Compose human-readable tags for the UI. Course first, then overlay
  // (drop overlay when course is already a non-edible category like
  // 'drink' or 'dessert' — those are self-describing).
  const tags = [];
  if (course === 'drink' || course === 'dessert') {
    tags.push(emojiFor(course) + ' ' + course);
  } else {
    if (overlay) tags.push(emojiFor(overlay) + ' ' + overlay);
    if (course) tags.push(emojiFor(course) + ' ' + course);
  }

  return { course, overlay, tags };
}

const EMOJI = {
  meat: '🥩', fish: '🐟', vege: '🥕', dessert: '🍰', drink: '🥤',
  starter: '🥟', main: '🍛', side: '🥗'
};
function emojiFor(t) { return EMOJI[t] || ''; }

module.exports = { classifyDishType, COURSE_PATTERNS, PROTEIN_PATTERNS, EMOJI };
