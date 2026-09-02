// nation-overlay-taxonomy.generated.js — drafted by script, EXTENDED BY HAND.
//
// Fixed-enum dish taxonomy (type / mealTime / dietary / course) for nation-overlay
// iconicDishes, keyed `${slug}::${dish}`. nation-overlay.js folds these onto each dish at
// load, overriding dish-food-group.js's regex fallback (which only covers SG/
// Malaysian hawker vocabulary — this overlay covers every cuisine directly).
//
// ⚠ THE HEADER USED TO SAY "GENERATED, do not hand-edit", AND THAT IS NO LONGER TRUE.
// v0.62.903 extends it by hand and later versions will fill it the same way, so the warning
// is replaced rather than left to be obeyed by someone who would then reopen the defect below.
// scripts/draft-dish-taxonomy.mjs remains the drafter and is idempotent — it only sends dishes
// that have no row here — so a future dispatch adds to this file without touching what is
// already written.
//
// ⚠ WHY THE HAND-EDIT WAS NEEDED. The drafting enum offered five mealTime values
// (breakfast · lunch · dinner · snack · anytime) while `mealPeriodSGT` asks about six periods
// (breakfast · lunch · afternoon · dinner · supper · night_supper). Measured over these 99 rows
// before the change: afternoon 0, supper 0, night_supper 0 exact matches, and `snack` matched no
// period at all. Half the periods were inert even where the taxonomy existed. `snack` is kept
// and aliased to `afternoon` in taste-score.js rather than rewritten (AU-1: add, never compress);
// the afternoon/supper/night_supper values here were authored against Singapore's actual late
// trade, not derived from the dish type.
//
'use strict';

module.exports = {
  "singaporean::assam pedas": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::ayam buah keluak": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::ayam penyet": { type: "other", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::babi pongteh": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::bak chang (rice dumpling)": { type: "rice", mealTime: ["anytime"], dietary: "mixed", course: "main" },
  "singaporean::bak chor mee": { type: "noodles", mealTime: ["breakfast","lunch","dinner","supper","night_supper"], dietary: "meat", course: "main" },
  "singaporean::bak kwa": { type: "snack", mealTime: ["snack","anytime"], dietary: "meat", course: "bites" },
  "singaporean::beef hor fun": { type: "noodles", mealTime: ["lunch","dinner","supper"], dietary: "meat", course: "main" },
  "singaporean::beef kway teow soup": { type: "noodles", mealTime: ["lunch","dinner","supper"], dietary: "meat", course: "main" },
  "singaporean::beef rendang sg": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::begedil": { type: "veg", mealTime: ["lunch","dinner","snack"], dietary: "mixed", course: "side" },
  "singaporean::black pepper crab": { type: "seafood", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::butter chicken with naan": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::butter prawns": { type: "seafood", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::cereal butter chicken": { type: "other", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::cereal prawns": { type: "seafood", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::char siu": { type: "grilled", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::char siu bao": { type: "bread-dumpling", mealTime: ["breakfast","lunch","snack"], dietary: "meat", course: "bites" },
  "singaporean::char siu rice": { type: "rice", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::chicken curry sg style": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::chilli crab": { type: "seafood", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::claypot frog leg porridge": { type: "rice", mealTime: ["dinner","supper","snack"], dietary: "meat", course: "main" },
  "singaporean::claypot rice": { type: "rice", mealTime: ["lunch","dinner","supper"], dietary: "meat", course: "main" },
  "singaporean::coffee pork ribs": { type: "other", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::cold crab teochew": { type: "seafood", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::dim sum brunch": { type: "other", mealTime: ["breakfast","lunch","afternoon"], dietary: "mixed", course: "main" },
  "singaporean::drunken prawns": { type: "seafood", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::duck rice": { type: "rice", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::fish head curry": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::fish head curry sg-indian style": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::fishball noodle": { type: "noodles", mealTime: ["breakfast","lunch","dinner","supper"], dietary: "seafood", course: "main" },
  "singaporean::hainanese chicken cutlet": { type: "other", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::hainanese curry rice": { type: "rice", mealTime: ["lunch","dinner"], dietary: "mixed", course: "main" },
  "singaporean::hainanese mutton soup": { type: "soup", mealTime: ["lunch","dinner","supper"], dietary: "meat", course: "soup" },
  "singaporean::hainanese pork chop": { type: "other", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::hainanese yam rice": { type: "rice", mealTime: ["lunch","dinner"], dietary: "mixed", course: "main" },
  "singaporean::har gow": { type: "bread-dumpling", mealTime: ["breakfast","lunch","snack"], dietary: "seafood", course: "bites" },
  "singaporean::hokkien fried rice": { type: "rice", mealTime: ["lunch","dinner"], dietary: "mixed", course: "main" },
  "singaporean::honey pork ribs": { type: "other", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::hor fun (san lou)": { type: "noodles", mealTime: ["lunch","dinner","supper"], dietary: "seafood", course: "main" },
  "singaporean::idli with sambar": { type: "bread-dumpling", mealTime: ["breakfast","lunch","dinner","supper","night_supper"], dietary: "vegetarian", course: "main" },
  "singaporean::ikan bakar sg": { type: "seafood", mealTime: ["lunch","dinner","supper"], dietary: "seafood", course: "main" },
  "singaporean::itek tim": { type: "soup", mealTime: ["lunch","dinner"], dietary: "meat", course: "soup" },
  "singaporean::kaya puff": { type: "sweet", mealTime: ["anytime"], dietary: "vegetarian", course: "bites" },
  "singaporean::kong bak pau": { type: "bread-dumpling", mealTime: ["lunch","dinner","snack"], dietary: "meat", course: "bites" },
  "singaporean::kueh pie tee": { type: "snack", mealTime: ["lunch","dinner","snack"], dietary: "mixed", course: "appetiser" },
  "singaporean::kway chap": { type: "noodles", mealTime: ["breakfast","lunch","dinner","supper"], dietary: "meat", course: "main" },
  "singaporean::lo mai gai": { type: "rice", mealTime: ["breakfast","lunch","snack"], dietary: "meat", course: "bites" },
  "singaporean::lontong sayur lodeh": { type: "stew-curry", mealTime: ["breakfast","lunch","dinner"], dietary: "mixed", course: "main" },
  "singaporean::lor mee": { type: "noodles", mealTime: ["breakfast","lunch","dinner","supper"], dietary: "mixed", course: "main" },
  "singaporean::love letters (kuih kapit)": { type: "sweet", mealTime: ["anytime"], dietary: "vegetarian", course: "bites" },
  "singaporean::marmite chicken": { type: "other", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::mee pok dry": { type: "noodles", mealTime: ["breakfast","lunch","dinner","supper"], dietary: "mixed", course: "main" },
  "singaporean::mee soto": { type: "noodles", mealTime: ["breakfast","lunch","dinner","supper"], dietary: "meat", course: "main" },
  "singaporean::mee suah": { type: "noodles", mealTime: ["breakfast","lunch","dinner","supper"], dietary: "mixed", course: "main" },
  "singaporean::mee tai mak": { type: "noodles", mealTime: ["breakfast","lunch","dinner","supper"], dietary: "mixed", course: "main" },
  "singaporean::mutton soup (sup tulang)": { type: "soup", mealTime: ["lunch","dinner","supper","snack"], dietary: "meat", course: "soup" },
  "singaporean::nasi lemak sg": { type: "rice", mealTime: ["breakfast","lunch","dinner","supper","night_supper"], dietary: "mixed", course: "main" },
  "singaporean::nasi padang": { type: "rice", mealTime: ["lunch","dinner"], dietary: "mixed", course: "main" },
  "singaporean::nasi ulam": { type: "rice", mealTime: ["lunch","dinner"], dietary: "mixed", course: "main" },
  "singaporean::ngoh hiang": { type: "snack", mealTime: ["lunch","dinner","snack"], dietary: "meat", course: "appetiser" },
  "singaporean::ngoh hiang platter": { type: "snack", mealTime: ["lunch","dinner","snack"], dietary: "mixed", course: "appetiser" },
  "singaporean::nyonya curry chicken": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::orh nee (yam paste dessert)": { type: "sweet", mealTime: ["lunch","afternoon","dinner"], dietary: "mixed", course: "dessert" },
  "singaporean::pineapple tart": { type: "sweet", mealTime: ["anytime"], dietary: "vegetarian", course: "bites" },
  "singaporean::putu mayam": { type: "noodles", mealTime: ["breakfast","snack"], dietary: "vegetarian", course: "dessert" },
  "singaporean::roast duck": { type: "grilled", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::roast goose": { type: "grilled", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::roast meat rice (siu mei)": { type: "rice", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::salted egg fish skin": { type: "snack", mealTime: ["snack","anytime"], dietary: "seafood", course: "bites" },
  "singaporean::salted egg yolk crab": { type: "seafood", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::sambal kangkong": { type: "veg", mealTime: ["lunch","dinner"], dietary: "mixed", course: "side" },
  "singaporean::sambal sotong": { type: "seafood", mealTime: ["lunch","dinner","supper"], dietary: "seafood", course: "main" },
  "singaporean::sambal stingray": { type: "grilled", mealTime: ["lunch","dinner","supper"], dietary: "seafood", course: "main" },
  "singaporean::singapore noodles (curry bee hoon)": { type: "noodles", mealTime: ["lunch","dinner","supper"], dietary: "mixed", course: "main" },
  "singaporean::siu mai": { type: "bread-dumpling", mealTime: ["breakfast","lunch","snack"], dietary: "mixed", course: "bites" },
  "singaporean::siu yuk (roast pork belly)": { type: "grilled", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::sliced fish soup": { type: "soup", mealTime: ["lunch","dinner","supper","night_supper"], dietary: "seafood", course: "main" },
  "singaporean::soon kueh": { type: "bread-dumpling", mealTime: ["breakfast","snack","anytime"], dietary: "mixed", course: "bites" },
  "singaporean::soya sauce chicken": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::sup kambing": { type: "soup", mealTime: ["lunch","dinner","supper","snack"], dietary: "meat", course: "soup" },
  "singaporean::tahu goreng": { type: "veg", mealTime: ["lunch","dinner","snack"], dietary: "vegetarian", course: "side" },
  "singaporean::tandoori chicken": { type: "grilled", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::tau sar piah": { type: "snack", mealTime: ["anytime"], dietary: "mixed", course: "bites" },
  "singaporean::teochew braised duck": { type: "stew-curry", mealTime: ["lunch","dinner"], dietary: "meat", course: "main" },
  "singaporean::teochew fish maw soup": { type: "soup", mealTime: ["lunch","dinner"], dietary: "mixed", course: "soup" },
  "singaporean::teochew fish soup bee hoon": { type: "noodles", mealTime: ["lunch","dinner","supper"], dietary: "seafood", course: "main" },
  "singaporean::teochew oyster cake": { type: "snack", mealTime: ["lunch","dinner","snack"], dietary: "mixed", course: "bites" },
  "singaporean::teochew porridge": { type: "rice", mealTime: ["breakfast","lunch","dinner","supper","night_supper"], dietary: "mixed", course: "main" },
  "singaporean::teochew steamed pomfret": { type: "seafood", mealTime: ["lunch","dinner"], dietary: "seafood", course: "main" },
  "singaporean::thosai sambal": { type: "bread-dumpling", mealTime: ["breakfast","lunch","dinner","supper","night_supper"], dietary: "vegetarian", course: "main" },
  "singaporean::ti kway / png kueh": { type: "snack", mealTime: ["breakfast","snack","anytime"], dietary: "mixed", course: "bites" },
  "singaporean::vadai (sg hawker)": { type: "snack", mealTime: ["snack","anytime"], dietary: "mixed", course: "bites" },
  "singaporean::wanton mee dry": { type: "noodles", mealTime: ["lunch","dinner","supper"], dietary: "meat", course: "main" },
  "singaporean::wanton mee soup": { type: "noodles", mealTime: ["lunch","dinner","supper"], dietary: "meat", course: "main" },
  "singaporean::wat tan hor": { type: "noodles", mealTime: ["lunch","dinner","supper"], dietary: "mixed", course: "main" },
  "singaporean::yam ring": { type: "other", mealTime: ["lunch","dinner"], dietary: "mixed", course: "main" },
  "singaporean::yang chow fried rice": { type: "rice", mealTime: ["lunch","dinner"], dietary: "mixed", course: "main" },
  "singaporean::yong tau foo": { type: "soup", mealTime: ["lunch","dinner","supper"], dietary: "mixed", course: "main" },
};
