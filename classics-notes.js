// classics-notes.js — curated { local (native script), note:{en,fr}, sources }.
//
// CLASSIC_NOTES: keyed by ISO country code then dish name — feeds the GEO "More
//   classics" list (city-plates.js _overlayDishMeta).
// CUISINE_NOTES: keyed by cuisine slug then dish name — feeds the CUISINE-mode
//   "Pick local classic" plate (index.js enriches NATION_OVERLAY iconicDishes).
//
// Every entry is WEB-SOURCED and adversarially source-verified (non-inventive):
// drafted from a credited source (NLB Infopedia / Roots / BiblioAsia, Michelin,
// TasteAtlas, Wikipedia, established food media), then a second pass checked the
// fact + native script and trimmed each note to <=140 chars. APPEND batches here.
//
// v0.62.182 — + CUISINE_NOTES.peranakan (29 Nyonya dishes).

const CLASSIC_NOTES = {
  "SG": {
    "chilli crab": {
      "local": "辣椒螃蟹",
      "note": {
        "en": "Singapore's iconic dish: mud crab stir-fried in a sweet-savoury tomato-chilli gravy, credited to Cher Yam Tian's mid-1950s pushcart stall.",
        "fr": "Plat phare de Singapour : crabe de vase saute dans une sauce tomate-piment douce-salee, attribue a Cher Yam Tian au milieu des annees 1950."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Chilli crab",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1112_2011-06-17.html"
        },
        {
          "name": "Chilli Crab — Roots.gov.sg (National Heritage Board)",
          "url": "https://www.roots.gov.sg/ich-landing/ich/chilli-crab"
        }
      ]
    },
    "black pepper crab": {
      "local": "黑胡椒蟹",
      "note": {
        "en": "Singaporean dish of hard-shell crab stir-fried with crushed black pepper and garlic; created by Long Beach Seafood, drier than chilli crab.",
        "fr": "Plat singapourien de crabe sauté au poivre noir concassé et ail; créé par Long Beach Seafood, plus sec que le chilli crab."
      },
      "sources": [
        {
          "name": "Long Beach Seafood Restaurant - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Long_Beach_Seafood_Restaurant"
        },
        {
          "name": "Black pepper crab - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Black_pepper_crab"
        }
      ]
    },
    "cereal prawns": {
      "local": "麦片虾",
      "note": {
        "en": "Singapore zichar dish: shell-on tiger prawns deep-fried, then tossed in crisp Nestum cereal, curry leaves, bird's eye chillies and butter.",
        "fr": "Plat zichar singapourien : grosses crevettes frites en carapace, sautées au Nestum croustillant, feuilles de curry, piment et beurre."
      },
      "sources": [
        {
          "name": "Singapore Noodles (Pamelia Chia) - Cereal Prawns",
          "url": "https://sgpnoodles.substack.com/p/cereal-prawns"
        },
        {
          "name": "TasteAtlas - Cereal Prawns",
          "url": "https://www.tasteatlas.com/cereal-prawns"
        }
      ]
    },
    "salted egg yolk crab": {
      "local": "咸蛋黄炒蟹",
      "note": {
        "en": "Singapore zi char dish: deep-fried mud crab tossed in a buttery mashed salted-duck-egg-yolk sauce with curry leaves and chilli padi.",
        "fr": "Plat zi char singapourien : crabe de vase frit enrobé d'une sauce beurrée au jaune d'œuf de cane salé, feuilles de curry et piment."
      },
      "sources": [
        {
          "name": "epicure Magazine - Best salted egg yolk crabs in Singapore",
          "url": "https://www.epicureasia.com/food/1944/best-salted-egg-yolk-crabs-in-singapore/"
        },
        {
          "name": "DanielFoodDiary - 12 Salted Egg National Dishes in Singapore",
          "url": "https://danielfooddiary.com/2017/07/29/saltedeggshiok/"
        }
      ]
    },
    "salted egg fish skin": {
      "local": "咸蛋鱼皮",
      "note": {
        "en": "Singaporean zichar snack: crispy fried fish skin in creamy salted-egg-yolk sauce with curry leaves and chilli; now a packaged snack.",
        "fr": "Snack zichar singapourien : peau de poisson frite croustillante en sauce crémeuse au jaune d'oeuf salé, feuilles de curry et piment."
      },
      "sources": [
        {
          "name": "Michelin Guide Singapore — The Secrets Behind Salted Egg Fish Skin Snacks",
          "url": "https://guide.michelin.com/sg/en/article/people/5-questions-with-the-founders-of-crusty-s-on-the-secrets-behind-salted-egg-fish-skin-snacks"
        },
        {
          "name": "ieatishootipost — Yam's Treasures: Inventor of Salted Egg Fish Skin",
          "url": "https://ieatishootipost.sg/yams-treasures-inventor-of-salted-egg-fish-skin-and-other-zi-char-classics/"
        }
      ]
    },
    "butter prawns": {
      "local": "奶油虾",
      "note": {
        "en": "Malaysian-Chinese tze char prawns in butter, garlic and curry leaves, finished with crispy egg/coconut floss or creamy evaporated milk.",
        "fr": "Plat sino-malais (tze char) de crevettes au beurre, ail et feuilles de curry, avec floss d'oeuf croustillant ou lait concentre cremeux."
      },
      "sources": [
        {
          "name": "Rasa Malaysia – Butter Prawn",
          "url": "https://rasamalaysia.com/butter-prawn/"
        },
        {
          "name": "Nyonya Cooking – Butter Prawns",
          "url": "https://www.nyonyacooking.com/recipes/butter-prawns~ryACDwoDM5-7"
        }
      ]
    },
    "coffee pork ribs": {
      "local": "咖啡排骨",
      "note": {
        "en": "Singaporean zi char dish of deep-fried pork ribs glazed in a sticky sweet-savoury coffee sauce; popularised by chef Sam Leong.",
        "fr": "Plat singapourien zi char de cotes de porc frites nappees d'une sauce au cafe sucree-salee collante; popularise par le chef Sam Leong."
      },
      "sources": [
        {
          "name": "The Burning Kitchen - Sticky Coffee Pork Ribs (咖啡排骨)",
          "url": "https://theburningkitchen.com/sticky-coffee-kahlua-pork-ribs/"
        },
        {
          "name": "What To Cook Today - Singapore Coffee Pork Ribs (咖啡排骨)",
          "url": "https://whattocooktoday.com/singapore-coffee-pork-ribs.html"
        }
      ]
    },
    "marmite chicken": {
      "local": "妈蜜鸡",
      "note": {
        "en": "Singapore zi-char favourite: crispy fried chicken tossed in a sweet-savoury glaze of Marmite yeast extract, soy, honey and maltose.",
        "fr": "Plat phare des zi-char de Singapour : poulet frit croustillant nappe d'un glacage sucre-sale a base de Marmite, soja, miel et maltose."
      },
      "sources": [
        {
          "name": "Taste of Asian Food - Marmite Chicken (妈蜜鸡)",
          "url": "https://tasteasianfood.com/marmite-chicken/"
        },
        {
          "name": "Daniel Food Diary - Best Zi Char Eateries in Singapore",
          "url": "https://danielfooddiary.com/2024/02/03/zichareateries/"
        }
      ]
    },
    "honey pork ribs": {
      "local": "蜜汁排骨",
      "note": {
        "en": "Cantonese pork ribs braised tender, glazed with maltose and grilled hot for a sticky, glossy, charred finish; a Singapore zi char staple.",
        "fr": "Travers de porc cantonais braisés, glacés au maltose et grillés vif pour un fini collant et caramélisé; classique du zi char singapourien."
      },
      "sources": [
        {
          "name": "The Burning Kitchen — Sticky Chinese Honey Pork Ribs (蜜汁排骨)",
          "url": "https://theburningkitchen.com/honey-bbq-pork-rib-recipe/"
        },
        {
          "name": "LadyIronChef — A Guide to Zi Char",
          "url": "https://www.ladyironchef.com/2016/05/zi-char-guide/"
        }
      ]
    },
    "sambal kangkong": {
      "local": "马来风光",
      "note": {
        "en": "Water spinach (kangkong) stir-fried over high heat with sambal and belacan (shrimp paste); a Malay-origin zi char staple in Singapore.",
        "fr": "Liseron d'eau (kangkong) sauté à feu vif au sambal et au belacan (pâte de crevettes); plat zi char d'origine malaise prisé à Singapour."
      },
      "sources": [
        {
          "name": "Noob Cook Recipes — Sambal Kangkong 马来风光",
          "url": "https://noobcook.com/sambal-kangkong/"
        },
        {
          "name": "The Burning Kitchen — Spicy Water Spinach (Sambal Kangkong/马来风光)",
          "url": "https://theburningkitchen.com/sambal-kangkong/"
        }
      ]
    },
    "sambal sotong": {
      "local": "sambal sotong",
      "note": {
        "en": "Squid stir-fried in a Malay/Peranakan sambal of chilli, belacan and tamarind; a hawker and zi char favourite.",
        "fr": "Calmar sauté dans un sambal malais/peranakan de piment, belacan (pâte de crevette) et tamarin; favori des hawkers et zi char."
      },
      "sources": [
        {
          "name": "Share Food Singapore - Sambal Sotong",
          "url": "https://www.sharefood.sg/cuisine/asian/sambal-sotong/"
        }
      ]
    },
    "sambal stingray": {
      "local": "Ikan Pari Bakar",
      "note": {
        "en": "Stingray fins coated in chilli sambal, wrapped in banana leaf and charcoal-grilled; a Malay-origin hawker staple served with lime.",
        "fr": "Ailerons de raie au sambal piment, grillés en feuille de bananier sur charbon; plat malais de hawker servi avec citron vert."
      },
      "sources": [
        {
          "name": "Sambal stingray - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sambal_stingray"
        }
      ]
    },
    "fish head curry": {
      "local": "மீன் தலைக் கறி",
      "note": {
        "en": "Indian-Chinese fusion created in 1950s Singapore by Kerala migrant M.J. Gomez, who set South Indian curry on a fish head for Chinese diners.",
        "fr": "Fusion indo-chinoise créée dans le Singapour des années 1950 par M.J. Gomez, du Kerala, posant un curry sud-indien sur une tête de poisson."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Fish head curry",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_624_2005-01-04.html"
        },
        {
          "name": "Roots.gov.sg — Fish Head Curry (ICH)",
          "url": "https://www.roots.gov.sg/ich-landing/ich/fish-head-curry"
        }
      ]
    },
    "cereal butter chicken": {
      "local": "麦片鸡",
      "note": {
        "en": "Singapore zi char dish: crispy fried chicken tossed in butter, curry leaves, chili and toasted Nestum cereal; spin on cereal butter prawns.",
        "fr": "Plat zi char singapourien : poulet frit croustillant, beurre, curry, piment, céréales Nestum grillées ; variante des crevettes au beurre."
      },
      "sources": [
        {
          "name": "What To Cook Today — Cereal Butter Fried Chicken (Mai Pian Ji)",
          "url": "https://whattocooktoday.com/cereal-butter-fried-chicken-mai-pian-ji.html"
        },
        {
          "name": "Nestlé Singapore — Cereal Chicken recipe with Nestum",
          "url": "https://www.nestle.com.sg/brands/recipes/nestle-nestum/cereal-chicken"
        }
      ]
    },
    "drunken prawns": {
      "local": "醉虾",
      "note": {
        "en": "Fresh prawns steamed or poached in Chinese rice wine (Shaoxing/Hua Diao); Singapore's popular version adds herbs like goji and red dates.",
        "fr": "Crevettes fraiches cuites au vin de riz chinois (Shaoxing/Hua Diao); la version singapourienne y ajoute baies de goji et dattes rouges."
      },
      "sources": [
        {
          "name": "Wikipedia - Drunken shrimp",
          "url": "https://en.wikipedia.org/wiki/Drunken_shrimp"
        },
        {
          "name": "TasteAtlas - Drunken Prawn (Zui Xia)",
          "url": "https://www.tasteatlas.com/drunken-prawn"
        }
      ]
    },
    "yam ring": {
      "local": "芋头圈",
      "note": {
        "en": "Deep-fried ring of mashed taro filled with stir-fried meat or seafood; by chef Hooi Kok Wai of Singapore's Dragon Phoenix Restaurant.",
        "fr": "Anneau de taro frit garni de viande ou fruits de mer sautes; du chef Hooi Kok Wai du Dragon Phoenix de Singapour."
      },
      "sources": [
        {
          "name": "Wikipedia - Yam ring",
          "url": "https://en.wikipedia.org/wiki/Yam_ring"
        }
      ]
    },
    "hor fun (san lou)": {
      "local": "三捞河粉",
      "note": {
        "en": "Cantonese-rooted Singapore zi char dish: flat rice noodles tossed (\"san lou\") with fish slices and beansprouts in light wok-hei gravy.",
        "fr": "Plat zi char singapourien d'origine cantonaise : nouilles de riz plates sautees (\"san lou\") au poisson et germes, sauce claire au wok-hei."
      },
      "sources": [
        {
          "name": "What To Cook Today — San Lau Hor Fun (Three-tossed Flat Rice Noodles)",
          "url": "https://whattocooktoday.com/san-lau-hor-fun.html"
        },
        {
          "name": "Carry It Like Harry — Sam Lou Hor Fan 三捞河粉",
          "url": "https://carryitlikeharry.com/sam-lou-hor-fan-%E4%B8%89%E6%8D%9E%E6%B2%B3%E7%B2%89/"
        }
      ]
    },
    "wat tan hor": {
      "local": "滑蛋河",
      "note": {
        "en": "Cantonese-style wok-fried flat rice noodles (hor fun) blanketed in a silky egg gravy with seafood and meat; 'wat tan' means silky egg.",
        "fr": "Nouilles de riz plates (hor fun) sautees au wok, nappees d'une sauce a l'oeuf soyeuse, fruits de mer et viande; wat tan = oeuf soyeux."
      },
      "sources": [
        {
          "name": "Taste of Asian Food — Wat Tan Hor (滑旦河)",
          "url": "https://tasteasianfood.com/wat-tan-hor/"
        },
        {
          "name": "What To Cook Today — Wat Tan Hor Fun",
          "url": "https://whattocooktoday.com/kwe-tiau-siram-wat-tan-hor.html"
        }
      ]
    },
    "chicken curry SG style": {
      "local": "kari ayam",
      "note": {
        "en": "Singapore-style curry chicken: a fragrant rempah-and-coconut-milk gravy with potatoes, fusing Chinese, Malay and Indian spice traditions.",
        "fr": "Poulet au curry singapourien : sauce parfumée au rempah et lait de coco, pommes de terre, fusion d'épices chinoises, malaises et indiennes."
      },
      "sources": [
        {
          "name": "Vittles — Pamelia Chia's Curry Chicken",
          "url": "https://www.vittlesmagazine.com/p/pamelia-chias-curry-chicken"
        },
        {
          "name": "Rasa Malaysia — Chicken Curry with Potatoes",
          "url": "https://rasamalaysia.com/chicken-curry-with-potatoes/"
        }
      ]
    },
    "hainanese curry rice": {
      "local": "海南咖喱饭",
      "note": {
        "en": "Singapore dish by Hainanese chefs: rice drenched in thick curry with British-style pork chop, Peranakan chap chye and Indian-spiced gravy.",
        "fr": "Plat singapourien de chefs hainanais : riz nappe d'un curry epais, cotelette de porc panee, chap chye peranakan et sauce epicee indienne."
      },
      "sources": [
        {
          "name": "Roots.gov.sg (National Heritage Board, Singapore)",
          "url": "https://www.roots.gov.sg/ich-landing/ich/hainanese-curry-rice"
        },
        {
          "name": "Wikipedia: Hainanese curry rice",
          "url": "https://en.wikipedia.org/wiki/Hainanese_curry_rice"
        }
      ]
    },
    "singapore noodles (curry bee hoon)": {
      "local": "咖喱米粉",
      "note": {
        "en": "Rice vermicelli stir-fried or served in a laksa-like curry; a Singapore hawker staple distinct from Hong Kong-invented \"Singapore noodles.\"",
        "fr": "Vermicelles de riz sautés ou en curry façon laksa; plat de hawker singapourien, distinct des \"nouilles de Singapour\" nées à Hong Kong."
      },
      "sources": [
        {
          "name": "SBS Food — The curious case of Singapore noodles",
          "url": "https://www.sbs.com.au/food/article/2021/05/06/not-made-singapore-curious-case-singapore-noodles"
        },
        {
          "name": "Michelin Guide — Early Morning Economic Bee Hoon",
          "url": "https://guide.michelin.com/sg/en/article/dining-out/breakfast-club-early-morning-economic-bee-hoon"
        }
      ]
    },
    "bak chor mee": {
      "local": "肉脞面",
      "note": {
        "en": "Hokkien for \"minced meat noodles\"; Singapore's Teochew-rooted dish: mee pok tossed in chilli, lard and black-vinegar sauce with minced pork.",
        "fr": "\"Nouilles au porc hache\" en hokkien; plat singapourien d'origine teochew: mee pok au piment, saindoux et vinaigre noir, porc hache."
      },
      "sources": [
        {
          "name": "SG101 (National Heritage, gov.sg) — Bak Chor Mee",
          "url": "https://www.sg101.gov.sg/resources/archives/heritage-bak-chor-mee/"
        },
        {
          "name": "Michelin Guide Singapore — Bak Chor Mee",
          "url": "https://guide.michelin.com/sg/en/article/dining-out/iconic-dishes-hill-street-tai-hwa-bak-chor-mee"
        }
      ]
    },
    "wanton mee dry": {
      "local": "云吞面 (干)",
      "note": {
        "en": "Cantonese egg noodles tossed dry in sauce (less soy than Malaysia, often chilli/ketchup), char siu and cai-xin; wontons apart in soup.",
        "fr": "Nouilles aux oeufs cantonaises sautees a sec (moins de soja qu'en Malaisie, souvent piment), char siu et cai-xin; wontons a part en soupe."
      },
      "sources": [
        {
          "name": "Wonton noodles - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Wonton_noodles"
        },
        {
          "name": "20 Best Wonton Mee In Singapore - Eatbook",
          "url": "https://eatbook.sg/wonton-mee-singapore/"
        }
      ]
    },
    "wanton mee soup": {
      "local": "云吞面（汤）",
      "note": {
        "en": "Cantonese-origin soup: thin egg noodles, pork-chicken broth, wonton dumplings, char siew, leafy greens; SG version uses less soy than HK.",
        "fr": "Soupe cantonaise : nouilles fines aux oeufs, bouillon porc-poulet, raviolis wonton, char siew, legumes; version SG moins de soja qu'a HK."
      },
      "sources": [
        {
          "name": "Wikipedia — Wonton noodles",
          "url": "https://en.wikipedia.org/wiki/Wonton_noodles"
        },
        {
          "name": "Eatbook SG — Best Wonton Mee in Singapore",
          "url": "https://eatbook.sg/wonton-mee-singapore/"
        }
      ]
    },
    "char siu rice": {
      "local": "叉燒飯",
      "note": {
        "en": "Cantonese-style 'fork roasted' (叉燒) barbecued pork, glazed with maltose or honey, sliced over rice with cucumber, sweet gravy or dark soy.",
        "fr": "Porc barbecue cantonais « rôti à la fourchette » (叉燒), glacé au maltose ou miel, tranché sur riz avec concombre, sauce sucrée ou soja noir."
      },
      "sources": [
        {
          "name": "Char siu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Char_siu"
        },
        {
          "name": "13 Char Siew Rice In Singapore - Eatbook",
          "url": "https://eatbook.sg/char-siew-rice/"
        }
      ]
    },
    "roast meat rice (siu mei)": {
      "local": "烧味",
      "note": {
        "en": "Cantonese spit-roasted meats (char siew, roast pork, roast duck) over rice; sold at Singapore siu laap stalls in every hawker centre.",
        "fr": "Viandes cantonaises rôties à la broche (char siew, porc, canard) sur du riz; vendues aux stands siu laap de tout hawker singapourien."
      },
      "sources": [
        {
          "name": "Siu mei - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Siu_mei"
        },
        {
          "name": "11 best roast meat stalls in Singapore - SETHLUI.com",
          "url": "https://sethlui.com/roast-meat-stalls-food-guide-singapore/"
        }
      ]
    },
    "lor mee": {
      "local": "卤面",
      "note": {
        "en": "Hokkien hawker dish of flat yellow noodles in a thick, starch-thickened five-spice braised gravy, topped with egg, fish cake and ngoh hiang.",
        "fr": "Plat hokkien de nouilles jaunes plates dans une sauce braisée épaisse au cinq-épices, garnie d'œuf, de gâteau de poisson et de ngoh hiang."
      },
      "sources": [
        {
          "name": "SG101 (Singapore Government heritage archive) — Lor Mee in Singapore",
          "url": "https://www.sg101.gov.sg/resources/archives/heritage-lor-mee-in-singapore/"
        },
        {
          "name": "Wikipedia — Lor mee",
          "url": "https://en.wikipedia.org/wiki/Lor_mee"
        }
      ]
    },
    "fishball noodle": {
      "local": "鱼圆面",
      "note": {
        "en": "Teochew-origin Chinese hawker dish: springy fishballs with egg noodles (often flat mee pok), served dry in chili-vinegar sauce or in soup.",
        "fr": "Plat chinois teochew : boulettes de poisson sur nouilles aux oeufs (souvent mee pok plates), servi sec en sauce piment-vinaigre ou en soupe."
      },
      "sources": [
        {
          "name": "SETHLUI.com — fishball noodles guide Singapore",
          "url": "https://sethlui.com/fishball-noodles-guide-singapore/"
        },
        {
          "name": "DanielFoodDiary.com — Fishball Meepok in Singapore",
          "url": "https://danielfooddiary.com/2020/02/04/fishballnoodles/"
        }
      ]
    },
    "mee pok dry": {
      "local": "面薄 (干捞)",
      "note": {
        "en": "Flat yellow Teochew noodles, tossed dry (\"tah\") in chilli-vinegar-soy sauce instead of broth, topped with minced pork, liver and meatballs.",
        "fr": "Nouilles plates et jaunes teochew, sautées à sec (« tah ») dans une sauce piment-vinaigre-soja, garnies de porc haché, foie et boulettes."
      },
      "sources": [
        {
          "name": "Mee pok - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mee_pok"
        },
        {
          "name": "Eatbook SG - Best Bak Chor Mee",
          "url": "https://eatbook.sg/best-bak-chor-mee-singapore/"
        }
      ]
    },
    "yong tau foo": {
      "local": "酿豆腐",
      "note": {
        "en": "Hakka dish of tofu and vegetables stuffed with fish paste or minced meat; \"yong\" means \"to stuff.\" A Singapore hawker staple.",
        "fr": "Plat hakka de tofu et legumes farcis de pate de poisson ou viande hachee ; \"yong\" signifie \"farcir.\" Un classique des hawkers de Singapour."
      },
      "sources": [
        {
          "name": "Michelin Guide Singapore — What is Yong Tau Foo",
          "url": "https://guide.michelin.com/sg/en/article/features/what-is-yong-tau-foo"
        },
        {
          "name": "Wikipedia — Yong tau foo",
          "url": "https://en.wikipedia.org/wiki/Yong_tau_foo"
        }
      ]
    },
    "ngoh hiang": {
      "local": "五香",
      "note": {
        "en": "Hokkien/Teochew five-spice (五香) roll: minced pork and prawn seasoned with five-spice powder, wrapped in beancurd skin and deep-fried.",
        "fr": "Rouleau hokkien/teochew aux cinq-épices (五香) : porc haché et crevettes assaisonnés au cinq-épices, enroulés dans une peau de tofu et frits."
      },
      "sources": [
        {
          "name": "Ngo hiang - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ngo_hiang"
        },
        {
          "name": "NLB LearnX - Singapore Food Heritage",
          "url": "https://www.nlb.gov.sg/main/site/learnx/learnx-singapore/adults/food-heritage"
        }
      ]
    },
    "kway chap": {
      "local": "粿汁",
      "note": {
        "en": "Teochew dish: rice-noodle sheets (kway) in dark soya-sauce broth (chap) with braised pork offal; brought to Singapore by Chaoshan migrants.",
        "fr": "Plat teochew : feuilles de riz (kway) en bouillon de sauce soja (chap), abats de porc braisés ; apporté par les migrants du Chaoshan."
      },
      "sources": [
        {
          "name": "NLB / Roots.gov.sg — Kway Chap (Intangible Cultural Heritage)",
          "url": "https://www.roots.gov.sg/ich-landing/ich/kway-chap"
        },
        {
          "name": "Kway chap — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kway_chap"
        }
      ]
    },
    "teochew braised duck": {
      "local": "潮州卤鸭",
      "note": {
        "en": "Teochew dish (lor ah); Singaporean localisation of braised goose (lor gor), using less-gamey duck imported fresh from Malaysia or Indonesia.",
        "fr": "Plat teochew (lor ah); adaptation singapourienne de l'oie braisee (lor gor), au canard moins fort importe frais de Malaisie ou d'Indonesie."
      },
      "sources": [
        {
          "name": "Singapore Chinese Cultural Centre — Culturepaedia: How soon kueh, braised duck, bak chor mee and Teochew porridge became uniquely Singaporean",
          "url": "https://culturepaedia.singaporeccc.org.sg/popular-culture/how-soon-kueh-braised-duck-bak-chor-mee-and-teochew-porridge-became-uniquely-singaporean/"
        },
        {
          "name": "TasteAtlas — Teochew braised duck (Lor ark)",
          "url": "https://www.tasteatlas.com/teochew-braised-duck"
        }
      ]
    },
    "duck rice": {
      "local": "鸭饭",
      "note": {
        "en": "Teochew dish of braised or roasted duck over rice; Singapore's braised version swapped duck for the goose of the original Chaoshan lor gor.",
        "fr": "Plat teochew de canard braisé ou rôti sur riz; la version braisée de Singapour remplace l'oie du lor gor de Chaoshan par du canard."
      },
      "sources": [
        {
          "name": "Duck rice — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Duck_rice"
        },
        {
          "name": "How braised duck became uniquely Singaporean — Culturepaedia, Singapore Chinese Cultural Centre",
          "url": "https://culturepaedia.singaporeccc.org.sg/popular-culture/how-soon-kueh-braised-duck-bak-chor-mee-and-teochew-porridge-became-uniquely-singaporean/"
        }
      ]
    },
    "teochew porridge": {
      "local": "潮州糜",
      "note": {
        "en": "Teochew rice porridge with whole, firm grains (not mushy like congee), served with many small lightly-seasoned side dishes.",
        "fr": "Bouillie de riz teochew aux grains entiers et fermes (non pâteux comme le congee), servie avec de nombreux petits plats peu assaisonnés."
      },
      "sources": [
        {
          "name": "Wikipedia — Teochew porridge",
          "url": "https://en.wikipedia.org/wiki/Teochew_porridge"
        },
        {
          "name": "Eatbook.sg — Choon Seng Teochew Porridge",
          "url": "https://eatbook.sg/choon-seng-teochew-porridge/"
        }
      ]
    },
    "teochew fish soup bee hoon": {
      "local": "潮州鱼片米粉汤",
      "note": {
        "en": "Singaporean Teochew dish: sliced or fried fish in clear or milky broth with rice vermicelli; snakehead common, milk gives creamy version.",
        "fr": "Plat singapourien teochew: poisson tranché ou frit en bouillon clair ou laiteux, vermicelles de riz; poisson tête-de-serpent fréquent."
      },
      "sources": [
        {
          "name": "Fish soup bee hoon — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Fish_soup_bee_hoon"
        },
        {
          "name": "Jin Hua Fish Head Bee Hoon — DanielFoodDiary",
          "url": "https://danielfooddiary.com/2024/05/26/jinhuafishsoup/"
        }
      ]
    },
    "sliced fish soup": {
      "local": "鱼片汤",
      "note": {
        "en": "Teochew-origin clear broth with sliced fish, vegetables and beancurd; Singapore's milky version uses evaporated milk, a Cantonese touch.",
        "fr": "Bouillon clair teochew aux tranches de poisson, legumes et tofu; la version laiteuse de Singapour doit son lait evapore aux Cantonais."
      },
      "sources": [
        {
          "name": "Sliced fish soup - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sliced_fish_soup"
        },
        {
          "name": "Origins Of Singapore Fish Soup - SETHLUI.com",
          "url": "https://sethlui.com/origins-fish-soup-singapore/"
        }
      ]
    },
    "mee suah": {
      "local": "面线",
      "note": {
        "en": "Hokkien-origin thread-thin wheat noodle; in Singapore eaten as uncut birthday \"longevity noodles,\" slurped whole to symbolise a long life.",
        "fr": "Nouilles de ble tres fines, hokkien; a Singapour, \"nouilles de longevite\" d'anniversaire non coupees, aspirees entieres pour une longue vie."
      },
      "sources": [
        {
          "name": "Michelin Guide Singapore - Heng Hwa Mee Sua recipe",
          "url": "https://guide.michelin.com/sg/en/article/dining-in/easy-recipe-heng-hwa-mee-sua"
        },
        {
          "name": "Misua - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Misua"
        }
      ]
    },
    "beef hor fun": {
      "local": "牛肉河粉",
      "note": {
        "en": "Cantonese-style flat rice noodles with sliced beef, served in a silky savoury gravy or stir-fried \"dry\" for smoky wok hei; a zi char staple.",
        "fr": "Nouilles de riz plates cantonaises au boeuf emince, en sauce onctueuse ou sautees \"a sec\" pour le wok hei fume; un classique zi char."
      },
      "sources": [
        {
          "name": "Eatbook.sg — Lor 9 Beef Kway Teow (Michelin-approved beef hor fun)",
          "url": "https://eatbook.sg/lor-9-beef-kway-teow/"
        },
        {
          "name": "DanielFoodDiary.com — 10 Beef Horfun in Singapore",
          "url": "https://danielfooddiary.com/2019/02/19/beefhorfun/"
        }
      ]
    },
    "claypot rice": {
      "local": "煲仔饭",
      "note": {
        "en": "Cantonese one-pot dish: rice cooked in a clay pot over charcoal with chicken, lap cheong & salted fish, prized for its crispy charred crust.",
        "fr": "Plat cantonais en pot d'argile, riz cuit au charbon, poulet, saucisse chinoise et poisson salé, prisé pour sa croûte croustillante brûlée."
      },
      "sources": [
        {
          "name": "Claypot rice - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Claypot_rice"
        },
        {
          "name": "Lian He Ben Ji Claypot Rice - SETHLUI.com",
          "url": "https://sethlui.com/lian-he-ben-ji-claypot-rice-singapore/"
        }
      ]
    },
    "claypot frog leg porridge": {
      "local": "田鸡粥",
      "note": {
        "en": "Cantonese-style Singaporean dish: frog legs braised in dark, gingery soy sauce in a claypot, served beside plain rice porridge.",
        "fr": "Plat singapourien d'origine cantonaise : cuisses de grenouille braisees au soja noir et gingembre en marmite, servies avec un congee nature."
      },
      "sources": [
        {
          "name": "Eatbook.sg — 10 Best Frog Leg Porridge In Singapore",
          "url": "https://eatbook.sg/best-frog-leg-porridge-singapore/"
        },
        {
          "name": "Her World Singapore — Best frog porridge places",
          "url": "https://www.herworld.com/life/foodanddrink/best-frog-porridge-singapore"
        }
      ]
    },
    "hokkien fried rice": {
      "local": "福建炒饭",
      "note": {
        "en": "Egg fried rice topped with a thick savoury gravy of prawns, squid, mushrooms and vegetables; a Cantonese-style dish that originated in Hong",
        "fr": "Riz frit aux oeufs nappe d'une sauce epaisse de crevettes, calmar, champignons et legumes; plat de style cantonais ne a Hong Kong, et non"
      },
      "sources": [
        {
          "name": "Hokkien fried rice — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hokkien_fried_rice"
        },
        {
          "name": "Fujian Fried Rice — Quanzhou UNESCO City of Gastronomy",
          "url": "https://www.quanzhougastronomy.com/en/guide/flavors/202412/t20241213_3117083.htm"
        }
      ]
    },
    "yang chow fried rice": {
      "local": "扬州炒饭",
      "note": {
        "en": "Cantonese-style fried rice named for Yangzhou, China; a Singapore zi char staple set apart by its mix of proteins—egg, prawns and char siu.",
        "fr": "Riz sauté cantonais nommé d'après Yangzhou, Chine; classique zi char de Singapour, marqué par son mélange d'œuf, crevettes et char siu."
      },
      "sources": [
        {
          "name": "Yangzhou fried rice - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Yangzhou_fried_rice"
        },
        {
          "name": "Yang Zhou Chao Fan - TasteAtlas",
          "url": "https://www.tasteatlas.com/yangzhou-fried-rice"
        }
      ]
    },
    "mee tai mak": {
      "local": "米篩目 / 老鼠粉",
      "note": {
        "en": "Short semi-transparent rice noodles (5cm), nicknamed 'rat noodles' for their tapered shape; a Singapore hawker staple, fried or in soup.",
        "fr": "Courtes nouilles de riz translucides (5cm), dites 'nouilles-rat' pour leur forme effilee; classique des hawkers, sautees ou en soupe."
      },
      "sources": [
        {
          "name": "Silver needle noodles — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Silver_needle_noodles"
        },
        {
          "name": "Shu Heng Bi Tai Mak — DanielFoodDiary.com",
          "url": "https://danielfooddiary.com/2024/01/22/shuhengbitaimak/"
        }
      ]
    },
    "beef kway teow soup": {
      "local": "牛肉粿条汤",
      "note": {
        "en": "Flat rice noodles in clear beef broth with thinly sliced beef scalded underdone, tripe or beef balls, with chilli sauce; Teochew/Hainanese.",
        "fr": "Nouilles de riz plates en bouillon de bœuf clair, bœuf émincé saisi mi-cuit, tripes ou boulettes, avec sauce chili; Teochew/Hainanais."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Beef noodles",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1806_2011-03-30.html"
        },
        {
          "name": "Beef kway teow — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Beef_kway_teow"
        }
      ]
    },
    "hainanese pork chop": {
      "local": "海南猪排",
      "note": {
        "en": "Breadcrumbed deep-fried pork cutlet in tangy tomato-Worcestershire sauce, peas and potatoes; Hainanese 'Western food' from colonial cooks.",
        "fr": "Cotelette de porc panee, frite, sauce tomate-Worcestershire aigre-douce, petits pois et pommes de terre; plat occidental hainanais colonial."
      },
      "sources": [
        {
          "name": "Mothership.SG — Western food in S'pore popularised by Hainanese-run kopitiams set up in 1930s",
          "url": "https://mothership.sg/2018/08/western-food-singapore/"
        },
        {
          "name": "DanielFoodDiary.com — Best Hawker Western Food Stalls in Singapore (Old-School Hainanese Chops)",
          "url": "https://danielfooddiary.com/2025/09/16/westernfoodsingapore/"
        }
      ]
    },
    "hainanese mutton soup": {
      "local": "海南羊肉汤",
      "note": {
        "en": "Singapore Hainanese mutton soup in a clear herbal broth with wolfberries, red dates and dang gui, reddened by fermented beancurd (nam yue).",
        "fr": "Soupe de mouton hainanaise de Singapour, bouillon clair aux baies de goji, dattes rouges et dang gui, rougie au tofu fermenté (nam yue)."
      },
      "sources": [
        {
          "name": "CARRY IT LIKE HARRY — Hainanese Herbal Mutton Soup 海南羊肉汤",
          "url": "https://carryitlikeharry.com/hainanese-herbal-mutton-soup-%E6%B5%B7%E5%8D%97%E7%BE%8A%E8%82%89%E6%B1%A4/"
        },
        {
          "name": "SETHLUI — Ming Shan herbal mutton soup",
          "url": "https://sethlui.com/ming-shan-singapore/"
        }
      ]
    },
    "hainanese chicken cutlet": {
      "local": "海南鸡扒",
      "note": {
        "en": "Breaded, deep-fried deboned chicken thigh under a thick brown gravy; a colonial-era fusion by Hainanese cooks who learned Western cooking.",
        "fr": "Cuisse de poulet desossee, panee et frite, sous une sauce brune epaisse; fusion coloniale de cuisiniers hainanais formes a l'occidentale."
      },
      "sources": [
        {
          "name": "Daniel Food Diary - Hainanese curry rice / chicken chop",
          "url": "https://danielfooddiary.com/2020/08/23/hainanesecurryrice/"
        },
        {
          "name": "Wikipedia - Hainanese curry rice",
          "url": "https://en.wikipedia.org/wiki/Hainanese_curry_rice"
        }
      ]
    },
    "hainanese yam rice": {
      "local": "芋头饭",
      "note": {
        "en": "Chinese-style one-pot rice cooked with cubed yam (taro), dried shrimp, dried mushrooms and lap cheong/pork; popular in Singapore.",
        "fr": "Riz chinois en un plat cuit avec dés d'igname (taro), crevettes séchées, champignons et lap cheong/porc; populaire à Singapour."
      },
      "sources": [
        {
          "name": "The MeatMen — One-Pot Yam Rice",
          "url": "https://themeatmen.sg/recipes/one-pot-yam-rice/"
        },
        {
          "name": "Noob Cook — Yam Rice (Taro Rice / 芋头饭)",
          "url": "https://noobcook.com/yam-rice/"
        }
      ]
    },
    "bak kwa": {
      "local": "肉干",
      "note": {
        "en": "Sweet-savoury barbecued pork jerky; a Hokkien Fujian delicacy, once a Chinese New Year luxury, localised in Singapore: charcoal-grilled.",
        "fr": "Jerky de porc grille sucre-sale; delice hokkien du Fujian, jadis luxe du Nouvel An chinois, localise a Singapour: grille au charbon."
      },
      "sources": [
        {
          "name": "NLB Infopedia – Bak kwa",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1746_2010-12-30.html"
        },
        {
          "name": "NLB – Bak kwa (Singapore)",
          "url": "https://www.nlb.gov.sg/main/article-detail?cmsuuid=63e14324-c02c-4ef8-a3ce-c24e4640db96"
        }
      ]
    },
    "kong bak pau": {
      "local": "扣肉包",
      "note": {
        "en": "Hokkien dish: a slice of soy-braised pork belly with coriander tucked in a soft steamed foldover bun; a kopitiam staple.",
        "fr": "Plat hokkien : une tranche de poitrine de porc braisée au soja, avec coriandre, dans un pain vapeur plié ; classique des kopitiam."
      },
      "sources": [
        {
          "name": "The Meatmen (Singapore) — Kong Bak Pau (Braised Pork Buns)",
          "url": "https://themeatmen.sg/recipes/kong-bak-pau-braised-pork-buns/"
        },
        {
          "name": "ieatishootipost — Kong Bak Bao Recipe",
          "url": "https://ieatishootipost.sg/taiwanese-kong-bak-bao-recipe-with-kikkoman-less-salt/"
        }
      ]
    },
    "ngoh hiang platter": {
      "local": "五香",
      "note": {
        "en": "Sliced deep-fried beancurd-skin rolls; \"ngoh hiang\" is Hokkien for \"five-spice,\" the powder seasoning the minced pork-and-prawn filling.",
        "fr": "Rouleaux frits en peau de soja, tranchés; \"ngoh hiang\" veut dire \"cinq-épices\" en hokkien, qui assaisonne la farce de porc et crevette."
      },
      "sources": [
        {
          "name": "EatingMeals — What is Ngoh Hiang: A Deep Dive into Singapore's Quintessential Savory Roll",
          "url": "https://eatingmeals.com/what-is-ngoh-hiang-singapore/"
        },
        {
          "name": "Nyonya Cooking — Ngoh Hiang / Lor Bak / 五香",
          "url": "https://www.nyonyacooking.com/recipes/ngoh-hiang-lor-bak~ytL8BmpNv"
        }
      ]
    },
    "ti kway / png kueh": {
      "local": "饭粿 / 红桃粿",
      "note": {
        "en": "Teochew peach-shaped steamed kueh with a chewy glutinous-rice flour skin, filled with savoury sticky rice, peanuts, mushrooms and shallots.",
        "fr": "Kueh teochew en forme de peche, a la peau moelleuse de farine de riz gluant, fourre de riz gluant sale, cacahuetes, champignons, echalotes."
      },
      "sources": [
        {
          "name": "What To Cook Today - Teochew Png Kueh",
          "url": "https://whattocooktoday.com/teochew-png-kueh.html"
        },
        {
          "name": "ieatishootipost - Teochew Kueh: Why is there Red and White Png Kueh?",
          "url": "https://ieatishootipost.sg/teochew-kueh-why-is-there-red-and-white-png-kueh/"
        }
      ]
    },
    "orh nee (yam paste dessert)": {
      "local": "芋泥",
      "note": {
        "en": "Teochew dessert of steamed taro mashed smooth with sugar and lard, served warm and topped with gingko nuts and pumpkin to close a banquet.",
        "fr": "Dessert teochew de taro vapeur ecrase en puree lisse avec sucre et saindoux, servi chaud, garni de ginkgo et potiron pour clore un banquet."
      },
      "sources": [
        {
          "name": "Fortune Food - The Rich Legacy of Teochew Orh Nee",
          "url": "https://fortunefood.sg/blogs/spotlight/the-rich-legacy-of-teochew-orh-nee"
        },
        {
          "name": "Fu Yuan Dining - The Cultural Weight of Teochew Yam Paste",
          "url": "https://fuyuandining.sg/silky-sweet-and-sacred-the-cultural-weight-of-teochew-yam-paste/"
        }
      ]
    },
    "teochew steamed pomfret": {
      "local": "潮州蒸鲳鱼",
      "note": {
        "en": "Classic Chaoshan-origin Teochew dish: whole white pomfret steamed with sour salted plums, pickled mustard greens, tomato, mushroom and tofu.",
        "fr": "Plat teochew classique d'origine Chaoshan : pomfret blanc vapeur, prunes salees acidulees, moutarde marinee, tomate, champignon, tofu."
      },
      "sources": [
        {
          "name": "Foodelicacy — Quick and Easy Teochew Steamed Pomfret",
          "url": "https://www.foodelicacy.com/teochew-style-steamed-pomfret/"
        },
        {
          "name": "What To Cook Today — Teochew Steamed White Pomfret",
          "url": "https://whattocooktoday.com/teochew-steamed-white-pomfret.html"
        }
      ]
    },
    "teochew oyster cake": {
      "local": "蠔餅",
      "note": {
        "en": "Saucer-shaped Fuzhou-style fritter: rice batter packed with oysters, minced pork, prawns, coriander and peanuts, then deep-fried crisp.",
        "fr": "Beignet fuzhou en forme de soucoupe: pate de riz garnie d'huitres, porc hache, crevettes, coriandre et cacahuetes, frite croustillante."
      },
      "sources": [
        {
          "name": "Miss Tam Chiak — Maxwell Fuzhou Oyster Cake",
          "url": "https://www.misstamchiak.com/maxwell-fuzhou-oyster-cake/"
        },
        {
          "name": "SETHLUI — Maxwell Fuzhou Oyster Cake vs Teochew Meat Puff",
          "url": "https://sethlui.com/food-showdown-maxwell-fuzhou-oyster-cake-teochew-meat-puff-fuzhou-poh-hwa-oyster-cake-singapore/"
        }
      ]
    },
    "cold crab teochew": {
      "local": "冻蟹",
      "note": {
        "en": "Teochew dish of crab steamed then chilled and served cold over ice, prizing natural sweetness; eaten with a vinegar-ginger dip.",
        "fr": "Plat teochew de crabe cuit a la vapeur, refroidi et servi froid, misant sur sa douceur naturelle, avec trempette vinaigre-gingembre."
      },
      "sources": [
        {
          "name": "City Nomads — Authentic Teochew Restaurants in Singapore for Cold Crabs",
          "url": "https://citynomads.com/authentic-teochew-restaurants-in-singapore/"
        },
        {
          "name": "Daniel Food Diary — 10 Teochew Restaurants In Singapore",
          "url": "https://danielfooddiary.com/2024/06/29/teochewfood/"
        }
      ]
    },
    "teochew fish maw soup": {
      "local": "鱼鳔羹",
      "note": {
        "en": "Thick Teochew banquet soup of dried fish maw (swim bladder), a collagen-rich \"sea treasure\" simmered with pork ribs, scallops and mushrooms.",
        "fr": "Soupe teochew épaisse de vessie natatoire séchée, « trésor de la mer » riche en collagène, mijotée aux côtes, pétoncles et champignons."
      },
      "sources": [
        {
          "name": "The Ever Auspicious Fish Maw Soup - Hungry Peepor",
          "url": "https://peepor.net/pint/blog/?p=11171"
        },
        {
          "name": "Fish maw soup 鱼膘羹 - Carry It Like Harry",
          "url": "https://carryitlikeharry.com/fish-maw-soup-%E9%B1%BC%E8%86%98%E7%BE%B9/"
        }
      ]
    },
    "soon kueh": {
      "local": "笋粿",
      "note": {
        "en": "Teochew steamed dumpling with a translucent rice-and-tapioca-flour skin; named for bamboo shoots (笋) but now usually filled with jicama.",
        "fr": "Raviole teochew a la vapeur, peau translucide de farine de riz et tapioca; nommee d'apres la pousse de bambou (笋), farcie au jicama."
      },
      "sources": [
        {
          "name": "Soon kueh — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Soon_kueh"
        },
        {
          "name": "Soon Kueh Stories — BiblioAsia, NLB Singapore",
          "url": "https://biblioasia.nlb.gov.sg/videos/soon-kueh/"
        }
      ]
    },
    "dim sum brunch": {
      "local": "點心",
      "note": {
        "en": "Cantonese yum cha brunch: bite-size steamed and fried dishes (har gow, siew mai, char siew bao) in bamboo baskets, with tea. From Guangzhou.",
        "fr": "Brunch cantonais yum cha : bouchées vapeur et frites (har gow, siew mai, char siew bao) en paniers de bambou, avec du thé. De Canton."
      },
      "sources": [
        {
          "name": "Dim sum — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Dim_sum"
        },
        {
          "name": "What Is Dim Sum? — Asia Society",
          "url": "https://asiasociety.org/reference/what-dim-sum-beginners-guide-south-chinas-traditional-brunch-meal"
        }
      ]
    },
    "har gow": {
      "local": "蝦餃",
      "note": {
        "en": "Cantonese steamed prawn dumpling in a translucent wheat-and-tapioca-starch wrapper; tradition demands at least 7, ideally 10+, pleats.",
        "fr": "Bouchee cantonaise de crevettes vapeur dans une pate translucide de ble et tapioca; la tradition exige au moins 7, idealement 10+, plis."
      },
      "sources": [
        {
          "name": "Har gow - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Har_gow"
        },
        {
          "name": "6 Michelin-Starred Restaurants in Singapore For Dim Sum - Michelin Guide",
          "url": "https://guide.michelin.com/en/article/dining-out/6-michelin-starred-restaurants-in-singapore-for-dim-sum"
        }
      ]
    },
    "siu mai": {
      "local": "燒賣",
      "note": {
        "en": "Cantonese open-topped steamed dim sum dumpling of ground pork, shrimp and mushroom; a Singapore dim sum staple served beside har gow.",
        "fr": "Bouchée vapeur dim sum cantonaise à sommet ouvert: porc haché, crevette et champignon; classique de Singapour, servie avec le har gow."
      },
      "sources": [
        {
          "name": "Shumai - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Shumai"
        },
        {
          "name": "Shāomài - TasteAtlas",
          "url": "https://www.tasteatlas.com/shumai"
        }
      ]
    },
    "char siu bao": {
      "local": "叉烧包",
      "note": {
        "en": "Cantonese dim sum bun filled with sweet-savoury barbecued char siu pork; the steamed type splits open white, the baked type is glazed.",
        "fr": "Petit pain dim sum cantonais farci de porc char siu barbecué sucré-salé ; la version vapeur s'ouvre en blanc, la version cuite est glacée."
      },
      "sources": [
        {
          "name": "Wikipedia — Cha siu bao",
          "url": "https://en.wikipedia.org/wiki/Cha_siu_bao"
        },
        {
          "name": "Wikipedia — Char siu",
          "url": "https://en.wikipedia.org/wiki/Char_siu"
        }
      ]
    },
    "lo mai gai": {
      "local": "糯米雞",
      "note": {
        "en": "Cantonese dim sum of glutinous rice with chicken, mushroom and lap cheong, wrapped in lotus leaf and steamed; SG often serves it bowl-style.",
        "fr": "Dim sum cantonais de riz gluant au poulet, champignons et lap cheong, en feuille de lotus a la vapeur; souvent servi en bol a Singapour."
      },
      "sources": [
        {
          "name": "Wikipedia - Lo mai gai",
          "url": "https://en.wikipedia.org/wiki/Lo_mai_gai"
        }
      ]
    },
    "char siu": {
      "local": "叉燒",
      "note": {
        "en": "Cantonese-style barbecued pork (name means \"fork roasted\"); marinated in hoisin, soy, five-spice and honey-glazed, with a signature red hue.",
        "fr": "Porc grillé cantonais (le nom signifie \"rôti à la fourche\"); mariné au hoisin, soja, cinq-épices, glacé au miel, à la teinte rouge typique."
      },
      "sources": [
        {
          "name": "Char siu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Char_siu"
        }
      ]
    },
    "siu yuk (roast pork belly)": {
      "local": "燒肉",
      "note": {
        "en": "Cantonese siu mei roast: pork belly cured with salt and vinegar then roasted at high heat for shatteringly crisp crackling over tender meat.",
        "fr": "Roti siu mei cantonais : poitrine de porc salee au vinaigre puis rotie a feu vif pour une couenne croustillante sur une viande tendre."
      },
      "sources": [
        {
          "name": "Wikipedia — Siu yuk",
          "url": "https://en.wikipedia.org/wiki/Siu_yuk"
        },
        {
          "name": "The Woks of Life — Cantonese Roast Pork Belly (Siu Yuk)",
          "url": "https://thewoksoflife.com/cantonese-roast-pork-belly/"
        }
      ]
    },
    "roast duck": {
      "local": "烧鸭",
      "note": {
        "en": "Cantonese-style roast duck (siu ngap), crispy-skinned and tender; sold at Singapore roast-meat stalls beside char siu, over rice or noodles.",
        "fr": "Canard rôti cantonais (siu ngap), peau croustillante et chair tendre; vendu aux stands de viandes rôties de Singapour, sur riz ou nouilles."
      },
      "sources": [
        {
          "name": "Wikipedia — Duck rice",
          "url": "https://en.wikipedia.org/wiki/Duck_rice"
        },
        {
          "name": "ICON Singapore — Best roasted duck places in Singapore",
          "url": "https://www.iconsingapore.com/lifestyle/the-4-best-roasted-duck-places-in-singapore-you-have-to-try/"
        }
      ]
    },
    "roast goose": {
      "local": "烧鹅",
      "note": {
        "en": "Cantonese siu-mei: a whole goose charcoal-roasted for crisp skin and juicy meat; in Singapore it's made with imported (e.g. Hungarian) geese",
        "fr": "Siu-mei cantonais : oie entiere rotie au charbon pour une peau croustillante; a Singapour, faite avec des oies importees (ex. de Hongrie)."
      },
      "sources": [
        {
          "name": "Roast goose - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Roast_goose"
        },
        {
          "name": "Best restaurants in Singapore for goose delicacies - ICON Singapore",
          "url": "https://www.iconsingapore.com/lifestyle/goose-meat-delicacies-food-restaurants/"
        }
      ]
    },
    "soya sauce chicken": {
      "local": "豉油鸡",
      "note": {
        "en": "Cantonese siu-mei: whole chicken braised in spiced dark soy. Hawker Chan (Singapore) won a 2016 Michelin star, among street-stall firsts.",
        "fr": "Plat cantonais siu-mei: poulet braisé en soja épicé. Hawker Chan (Singapour) eut une étoile Michelin 2016, parmi les premiers stands de rue."
      },
      "sources": [
        {
          "name": "Hong Kong Soya Sauce Chicken Rice and Noodle - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hong_Kong_Soya_Sauce_Chicken_Rice_and_Noodle"
        },
        {
          "name": "Hawker Chan - SETHLUI.com",
          "url": "https://sethlui.com/hawker-chan-soya-sauce-chicken-rice-noodle-chinatown-complex-singapore/"
        }
      ]
    },
    "mutton soup (sup tulang)": {
      "local": "sup tulang merah",
      "note": {
        "en": "Singapore-invented Indian-Muslim dish: mutton bones stewed 12+ hours in a fiery red tomato-chilli-sambal sauce, eaten for the marrow.",
        "fr": "Plat indo-musulman inventé à Singapour : os de mouton mijotés 12 h+ dans une sauce rouge tomate-piment-sambal, savourés pour la moelle."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Soup tulang",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1822_2011-07-19.html"
        },
        {
          "name": "Rice Media — This Mutton Soup Was Invented In Singapore",
          "url": "https://www.ricemedia.co/food-features-sup-tulang/"
        }
      ]
    },
    "sup kambing": {
      "local": "sup kambing",
      "note": {
        "en": "Muslim-Indian mutton soup, broth simmered for hours with coriander, fennel, cumin, star anise and cinnamon; served with bread to dip.",
        "fr": "Soupe de mouton indo-musulmane, bouillon mijoté des heures avec coriandre, fenouil, cumin, anis étoilé et cannelle; servie avec du pain."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Kambing soup",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1821_2011-07-19.html"
        },
        {
          "name": "Eatbook — Soup Kambing in Singapore",
          "url": "https://eatbook.sg/soup-kambing-singapore/"
        }
      ]
    },
    "thosai sambal": {
      "local": "தோசை",
      "note": {
        "en": "South Indian crepe of fermented rice-and-lentil batter, crisp and slightly tangy; in Singapore served with sambar and chutneys.",
        "fr": "Crêpe sud-indienne de pâte fermentée de riz et lentilles, croustillante et légèrement acidulée ; servie à Singapour avec sambar et chutneys."
      },
      "sources": [
        {
          "name": "SG101 (gov.sg) — Heritage: Thosai",
          "url": "https://www.sg101.gov.sg/resources/archives/heritage-thosai/"
        },
        {
          "name": "NLB Singapore — Thosai",
          "url": "https://www.nlb.gov.sg/main/article-detail?cmsuuid=f14de8d8-28b7-4997-ba57-53e03279d1fa"
        }
      ]
    },
    "idli with sambar": {
      "local": "இட்லி சாம்பார்",
      "note": {
        "en": "South Indian steamed cakes of fermented rice and urad dal, served with sambar (tamarind-lentil stew); a staple Tamil breakfast in Singapore.",
        "fr": "Galettes sud-indiennes de riz et lentilles urad fermentés, cuites vapeur, servies avec un sambar; petit-dejeuner tamoul a Singapour."
      },
      "sources": [
        {
          "name": "Idli - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Idli"
        },
        {
          "name": "Idli | TasteAtlas",
          "url": "https://www.tasteatlas.com/idli"
        }
      ]
    },
    "vadai (SG hawker)": {
      "local": "வடை",
      "note": {
        "en": "South Indian deep-fried lentil fritter, crisp outside, soft within; Singapore's hawker version presses a whole prawn into the batter.",
        "fr": "Beignet de lentilles frit du sud de l'Inde, croustillant dehors, moelleux dedans; a Singapour, les hawkers y enfoncent une crevette entiere."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Vadai",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2014-12-30_093442.html"
        },
        {
          "name": "SETHLUI — Vadai Showdown Singapore",
          "url": "https://sethlui.com/vadai-showdown-singapore/"
        }
      ]
    },
    "putu mayam": {
      "local": "இடியப்பம் (idiyappam)",
      "note": {
        "en": "South Indian steamed rice-flour noodle (string hoppers); in early Singapore sold by itinerant Indian vendors with coconut and gula melaka.",
        "fr": "Vermicelles de riz sud-indiens a la vapeur ; jadis vendus a Singapour par des marchands ambulants, avec coco rapee et gula melaka."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Putu mayam",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1749_2011-01-05.html"
        },
        {
          "name": "Wikipedia — Idiyappam (string hoppers / putu mayam)",
          "url": "https://en.wikipedia.org/wiki/Idiyappam"
        }
      ]
    },
    "teh tarik": {
      "local": "teh tarik",
      "note": {
        "en": "Frothy \"pulled tea\": strong black tea with condensed milk, poured between vessels to froth it; traced to Indian-Muslim stalls in Malaya.",
        "fr": "Thé \"tiré\" mousseux : thé noir fort au lait concentré, versé entre récipients pour mousser ; issu des échoppes indo-musulmanes de Malaisie."
      },
      "sources": [
        {
          "name": "Teh tarik - NLB (Singapore Infopedia)",
          "url": "https://www.nlb.gov.sg/main/article-detail?cmsuuid=6ab8bcaa-5ca6-4c04-81c5-26605ef6e6ed"
        },
        {
          "name": "Teh tarik - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Teh_tarik"
        }
      ]
    },
    "butter chicken with naan": {
      "local": "मुर्ग़ मक्खनी",
      "note": {
        "en": "North Indian murgh makhani: tandoori chicken in a creamy tomato-butter gravy, born at Delhi's Moti Mahal in the 1950s, served with naan.",
        "fr": "Murgh makhani indien : poulet tandoori dans une sauce crémeuse tomate-beurre, né au Moti Mahal de Delhi vers 1950, servi avec naan."
      },
      "sources": [
        {
          "name": "Butter chicken — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Butter_chicken"
        },
        {
          "name": "What is butter chicken and where is it from? — National Geographic",
          "url": "https://www.nationalgeographic.com/travel/article/what-is-butter-chicken"
        }
      ]
    },
    "tandoori chicken": {
      "local": "தந்தூரி கோழி",
      "note": {
        "en": "Chicken marinated in yogurt (dahi) and tandoori-masala spices, roasted in a clay tandoor oven; a North Indian dish popular in Singapore.",
        "fr": "Poulet marine au yaourt (dahi) et epices tandoori-masala, roti au four tandoor en argile; plat nord-indien prise a Singapour."
      },
      "sources": [
        {
          "name": "Tandoori chicken - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tandoori_chicken"
        },
        {
          "name": "Tandoori chicken - Britannica",
          "url": "https://www.britannica.com/topic/tandoori-chicken"
        }
      ]
    },
    "fish head curry SG-Indian style": {
      "local": "மீன் தலைக் கறி",
      "note": {
        "en": "South Indian red curry of a whole fish head, created by Kerala immigrant M.J. Gomez and sold from 1949 at a Sophia Road stall for Chinese.",
        "fr": "Curry rouge sud-indien a base de tete de poisson; cree par l'immigrant keralais M.J. Gomez, vendu des 1949 a Sophia Road pour les Chinois."
      },
      "sources": [
        {
          "name": "NLB Infopedia - Fish head curry",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_624_2005-01-04.html"
        },
        {
          "name": "Roots.gov.sg (National Heritage Board) - Fish Head Curry",
          "url": "https://www.roots.gov.sg/ich-landing/ich/fish-head-curry"
        }
      ]
    },
    "nasi lemak SG": {
      "local": "nasi lemak",
      "note": {
        "en": "Malay-origin fragrant rice cooked in coconut milk with pandan, served with sambal, fried anchovies (ikan bilis), peanuts, egg and cucumber.",
        "fr": "Riz parfume d'origine malaise cuit au lait de coco et au pandan, servi avec sambal, anchois (ikan bilis), cacahuetes, oeuf et concombre."
      },
      "sources": [
        {
          "name": "NLB Infopedia – Nasi lemak",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1739_2010-12-13.html"
        },
        {
          "name": "Roots.gov.sg – Nasi Lemak (Singapore ICH)",
          "url": "https://www.roots.gov.sg/ich-landing/ich/nasi-lemak"
        }
      ]
    },
    "nasi padang": {
      "local": "Nasi Padang",
      "note": {
        "en": "Steamed rice served with an array of pre-cooked Minangkabau dishes (e.g. rendang) from West Sumatra, named after the city of Padang.",
        "fr": "Riz vapeur accompagné d'un assortiment de plats minangkabau précuisinés (ex. rendang) de Sumatra-Ouest, nommé d'après la ville de Padang."
      },
      "sources": [
        {
          "name": "Michelin Guide Singapore — Ultimate Guide to Nasi Padang",
          "url": "https://guide.michelin.com/sg/en/article/features/ultimate-guide-to-nasi-padang"
        },
        {
          "name": "Wikipedia — Nasi padang",
          "url": "https://en.wikipedia.org/wiki/Nasi_padang"
        }
      ]
    },
    "beef rendang SG": {
      "local": "rendang daging",
      "note": {
        "en": "Minangkabau-origin Malay dish: beef slow-cooked in spiced coconut milk to a dry curry; in SG a Hari Raya treat and hawker rice staple.",
        "fr": "Plat malais d'origine minangkabau : boeuf mijote longuement dans du lait de coco epice jusqu'a un curry sec ; a SG, regal de Hari Raya."
      },
      "sources": [
        {
          "name": "NLB Infopedia – Rendang",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1767_2011-02-11.html"
        },
        {
          "name": "NLB – Rendang",
          "url": "https://www.nlb.gov.sg/main/article-detail?cmsuuid=0f09b507-3994-4487-8f70-6c82037846a1"
        }
      ]
    },
    "lontong sayur lodeh": {
      "local": "lontong sayur lodeh",
      "note": {
        "en": "Javanese-rooted Malay dish: banana-leaf rice cakes (lontong) in sayur lodeh, a coconut-milk veg curry; a Singapore Hari Raya staple.",
        "fr": "Plat malais d'origine javanaise : galettes de riz (lontong) en sayur lodeh, curry de légumes au lait de coco ; classique de Singapour."
      },
      "sources": [
        {
          "name": "Lontong | NLB Infopedia",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2015-09-28_105540.html"
        },
        {
          "name": "Sayur lodeh | Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sayur_lodeh"
        }
      ]
    },
    "tahu goreng": {
      "local": "tauhu goreng",
      "note": {
        "en": "Malay fried tofu: golden deep-fried beancurd cut diagonally, topped with bean sprouts and cucumber, dressed in spicy peanut sauce.",
        "fr": "Tofu frit malais : beignets de tofu doré coupés en diagonale, garnis de germes de soja et concombre, nappés de sauce d'arachide épicée."
      },
      "sources": [
        {
          "name": "Tahu goreng - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tahu_goreng"
        }
      ]
    },
    "begedil": {
      "local": "begedil",
      "note": {
        "en": "Deep-fried mashed-potato patty, often bound with minced beef; its name comes from Dutch \"frikadel,\" a colonial import to the Malay world.",
        "fr": "Galette de pomme de terre frite, souvent liee au boeuf hache; son nom vient du neerlandais \"frikadel\", un apport colonial au monde malais."
      },
      "sources": [
        {
          "name": "Johor Kaki - History of Bergedil",
          "url": "https://johorkaki.blogspot.com/2024/07/history-of-bergedil-fried-potato-patty.html"
        },
        {
          "name": "Nomadette - Begedil (Malay Potato Patties)",
          "url": "https://nomadette.com/begedil/"
        }
      ]
    },
    "ayam penyet": {
      "local": "ayam penyet",
      "note": {
        "en": "East Javanese (Surabaya) fried chicken pressed flat with a pestle, served with fiery sambal, tofu, tempeh and rice; popular in Singapore.",
        "fr": "Poulet frit de Java-Est (Surabaya) aplati au pilon, servi avec sambal piquant, tofu, tempeh et riz; populaire à Singapour."
      },
      "sources": [
        {
          "name": "TasteAtlas - Ayam Penyet",
          "url": "https://www.tasteatlas.com/ayam-penyet"
        },
        {
          "name": "Wikipedia - Ayam penyet",
          "url": "https://en.wikipedia.org/wiki/Ayam_penyet"
        }
      ]
    },
    "ikan bakar SG": {
      "local": "ikan bakar",
      "note": {
        "en": "Malay for \"grilled fish\": charcoal-grilled seafood marinated in sambal and kecap manis, often wrapped in banana leaf for aroma.",
        "fr": "\"Poisson grille\" en malais : fruits de mer grilles au charbon, marines au sambal et kecap manis, souvent en feuille de bananier."
      },
      "sources": [
        {
          "name": "Ikan bakar - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ikan_bakar"
        },
        {
          "name": "TasteAtlas - Best Fish Dishes",
          "url": "https://www.tasteatlas.com/best-rated-fish-dishes-in-indonesia"
        }
      ]
    },
    "mee soto": {
      "local": "Mee soto",
      "note": {
        "en": "Spicy Malay noodle soup: yellow Hokkien noodles in a turmeric-rich soto ayam chicken broth, topped with shredded chicken and bean sprouts.",
        "fr": "Soupe de nouilles malaise : nouilles jaunes Hokkien, bouillon de poulet soto ayam au curcuma, poulet effiloche et pousses de soja."
      },
      "sources": [
        {
          "name": "Mee soto | Infopedia - NLB eResources",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2013-06-14_113834.html"
        },
        {
          "name": "Soto mi | Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Soto_mi"
        }
      ]
    },
    "kueh pie tee": {
      "local": "kuih pai tee",
      "note": {
        "en": "Peranakan crispy batter cups filled with braised bangkuang (jicama) and prawns; name likely from \"patty\" iron moulds, nicknamed \"top hat\".",
        "fr": "Coupelles peranakan croustillantes au bangkuang (jicama) braise et aux crevettes; nom issu des moules \"patty\", surnommees \"haut-de-forme\"."
      },
      "sources": [
        {
          "name": "NLB BiblioAsia — Cups and Sources: Hunting Down the Origins of Kueh Pie Tee",
          "url": "https://biblioasia.nlb.gov.sg/vol-20/issue-4/jan-mar-2025/origins-of-kueh-pie-tee/"
        },
        {
          "name": "Wikipedia — Pie tee",
          "url": "https://en.wikipedia.org/wiki/Pie_tee"
        }
      ]
    },
    "ayam buah keluak": {
      "local": "ayam buah keluak",
      "note": {
        "en": "Peranakan staple: chicken braised in spicy tamarind gravy with buah keluak, the earthy black nut of the kepayang (Pangium edule) tree.",
        "fr": "Plat peranakan: poulet braise dans une sauce epicee au tamarin avec le buah keluak, noix noire terreuse de l'arbre kepayang (Pangium edule)."
      },
      "sources": [
        {
          "name": "NLB Infopedia - Ayam buah keluak",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2013-05-16_111918.html"
        },
        {
          "name": "NLB Infopedia - Buah keluak",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2014-12-16_135833.html"
        }
      ]
    },
    "babi pongteh": {
      "local": "babi pongteh",
      "note": {
        "en": "Peranakan (Nyonya) braised pork in fermented soybean paste (taucheo) and palm sugar; savoury-sweet gravy with shallots and mushrooms.",
        "fr": "Ragout de porc braise peranakan a la pate de soja fermentee (taucheo) et au sucre de palme; sauce sucree-salee, echalotes, champignons."
      },
      "sources": [
        {
          "name": "Foodelicacy — Babi Pongteh (Nonya Braised Pork in Fermented Soy Bean Sauce)",
          "url": "https://www.foodelicacy.com/babi-pongteh/"
        },
        {
          "name": "The Peranakan Magazine — Mama Elsie's Recipe Book: Babi Pongtay Evolution",
          "url": "https://www.peranakan.org.sg/theperanakanmagazine/mama-elsies-recipe-book-babi-pongtay-evolution/"
        }
      ]
    },
    "itek tim": {
      "local": "itek tim",
      "note": {
        "en": "Peranakan salted-vegetable duck soup; \"itek\" is Malay for duck, \"tim\" (Hokkien/Teochew 炖) = to stew. Soured with tamarind and sour plum.",
        "fr": "Soupe peranakan de canard aux legumes sales ; \"itek\" = canard (malais), \"tim\" (hokkien 炖) = mijoter. Acidulee au tamarin et a la prune."
      },
      "sources": [
        {
          "name": "Johor Kaki — History of Peranakan Dish Itek Tim",
          "url": "https://johorkaki.blogspot.com/2022/09/history-of-peranakan-dish-itek-tim.html"
        },
        {
          "name": "Baba Nyonya Peranakans — Itek Tim",
          "url": "https://babanyonyaperanakans.org/2019/03/23/itek-tim/"
        }
      ]
    },
    "nasi ulam": {
      "local": "nasi ulam",
      "note": {
        "en": "Malay/Peranakan herb rice: rice tossed with finely-sliced fresh herbs (kaffir lime, daun kesum, turmeric leaf) and flaked fish.",
        "fr": "Riz aux herbes malais/peranakan : riz aux herbes fraiches emincees (combava, daun kesum, feuille de curcuma) et poisson emiette."
      },
      "sources": [
        {
          "name": "Nasi ulam - National Library Board (NLB) Singapore",
          "url": "https://www.nlb.gov.sg/main/article-detail?cmsuuid=7908591f-e7b7-4a82-9235-2a64637e2df4"
        },
        {
          "name": "Nasi ulam - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nasi_ulam"
        }
      ]
    },
    "nyonya curry chicken": {
      "local": "Kari Ayam Nyonya",
      "note": {
        "en": "Peranakan (Straits Chinese) chicken curry; a Chinese-Malay hybrid simmered in coconut milk with a rempah of lemongrass, galangal, belacan.",
        "fr": "Curry de poulet peranakan (sino-malais), mijoté au lait de coco avec un rempah de citronnelle, galanga et belacan."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Peranakan (Straits Chinese) community",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2013-08-30_181745.html"
        },
        {
          "name": "Roots.gov.sg — Peranakan Cuisine in Singapore",
          "url": "https://www.roots.gov.sg/ich-landing/ich/peranakan-cuisine-in-singapore"
        }
      ]
    },
    "assam pedas": {
      "local": "asam pedas",
      "note": {
        "en": "Malay for \"sour spicy\": a quintessential Singapore-Malay fish stew in tamarind-soured, chilli-spiced gravy with okra, brinjal and tomato.",
        "fr": "Malais pour \"aigre-piquant\": ragoût de poisson malais de Singapour, sauce au tamarin acidulée et piment, avec gombo, aubergine et tomate."
      },
      "sources": [
        {
          "name": "Asam pedas - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Asam_pedas"
        },
        {
          "name": "Asam Pedas Singapore - Nomadette",
          "url": "https://nomadette.com/asam-pedas/"
        }
      ]
    },
    "bak chang (rice dumpling)": {
      "local": "肉粽",
      "note": {
        "en": "Pyramid glutinous rice dumpling in bamboo leaves, eaten at Duan Wu festival; Hokkien, Teochew, Cantonese, Nyonya styles differ in Singapore.",
        "fr": "Boulette de riz gluant pyramidale en feuilles de bambou, mangee a Duan Wu; styles hokkien, teochew, cantonais et nyonya a Singapour."
      },
      "sources": [
        {
          "name": "Roots.gov.sg (National Heritage Board) - Duan Wu Festival",
          "url": "https://www.roots.gov.sg/ich-landing/ich/duan-wu-festival"
        },
        {
          "name": "Singapore Food Agency - Rice Dumplings",
          "url": "https://www.sfa.gov.sg/food-safety-tips/food-risk-concerns/risk-at-a-glance/rice-dumplings"
        }
      ]
    },
    "tau sar piah": {
      "local": "豆沙饼",
      "note": {
        "en": "Flaky Hokkien-name pastry filled with sweet or salty mung-bean paste; Singapore's Balestier Rd is famous for it, led by Loong Fatt.",
        "fr": "Pâtisserie feuilletée (nom hokkien) fourrée de pâte de haricot mungo sucrée ou salée; célèbre à Balestier Rd à Singapour, avec Loong Fatt."
      },
      "sources": [
        {
          "name": "NLB Singapore - Loong Fatt Tau Sar Piah",
          "url": "https://www.nlb.gov.sg/main/image-detail?cmsuuid=06d3edd6-a4c0-4250-a96d-803e1ae0739a"
        },
        {
          "name": "ieatishootipost - Tau Sar Piah: Singapore's very own pastry",
          "url": "https://ieatishootipost.sg/special-feature-tau-sar-piah-singapores-very-own-pastry/"
        }
      ]
    },
    "kaya puff": {
      "local": "咖椰角 (Kaya Kok)",
      "note": {
        "en": "Flaky baked pastry shaped like a curry puff, filled with kaya (coconut-egg jam); a traditional Chinese-style bakery snack in Singapore.",
        "fr": "Chausson feuilleté en forme de curry puff, fourré au kaya (confiture coco-œuf); en-cas de boulangerie chinoise traditionnel à Singapour."
      },
      "sources": [
        {
          "name": "Guai Shu Shu – Traditional Kaya Puff or Kaya Kok (咖椰角，咖央酥）",
          "url": "https://www.guaishushu1.com/traditional-kaya-puff-or-kaya-kok-%E5%92%96%E6%A4%B0%E8%A7%92%EF%BC%8C-%E5%92%96%E5%A4%AE%E9%85%A5%EF%BC%89/"
        },
        {
          "name": "SETHLUI – Old Chang Kee Kaya Butter Puff",
          "url": "https://sethlui.com/old-chang-kee-kaya-butter-puff-singapore-april-2019/"
        }
      ]
    },
    "pineapple tart": {
      "local": "kueh tair",
      "note": {
        "en": "Bite-size Peranakan pastry topped with slow-caramelised pineapple jam spiced with cinnamon, star anise and cloves; a Chinese New Year staple",
        "fr": "Petite pâtisserie peranakan garnie de confiture d'ananas aux épices (cannelle, anis étoilé, girofle); incontournable du Nouvel An chinois."
      },
      "sources": [
        {
          "name": "Pineapple tart - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Pineapple_tart"
        },
        {
          "name": "Pineapple Tarts in Singapore - SG101 (Gov.sg)",
          "url": "https://www.sg101.gov.sg/resources/archives/heritage-pineapple-tarts/"
        }
      ]
    },
    "love letters (kuih kapit)": {
      "local": "kuih kapit",
      "note": {
        "en": "Thin crisp coconut-milk-and-egg wafer baked by clamping batter between patterned iron moulds over charcoal (\"kapit\"=clamp); Peranakan treat.",
        "fr": "Gaufrette fine au lait de coco et oeuf, cuite en pressant la pate entre deux moules ferres sur braises (\"kapit\"=pincer); regal peranakan."
      },
      "sources": [
        {
          "name": "Michelin Guide Singapore — Iconic Dishes: Love Letters",
          "url": "https://guide.michelin.com/sg/en/article/features/iconic-dishes-love-letters-and-other-sweet-snacks-for-your-sweetheart"
        },
        {
          "name": "NLB BiblioAsia — The Evolution of Straits-born Cuisine",
          "url": "https://biblioasia.nlb.gov.sg/all-sections/vol-17-issue-2-jul-sep-2021-straits-born-cuisine/"
        }
      ]
    },
    "ang ku kueh": {
      "local": "红龟粿",
      "note": {
        "en": "Hokkien red tortoise cake: chewy glutinous-rice skin over sweet mung-bean paste, molded into a tortoise shell for longevity and luck.",
        "fr": "Gâteau-tortue rouge hokkien : pâte de riz gluant moulée en carapace, fourrée de haricot mungo sucré, symbole de longévité et de chance."
      },
      "sources": [
        {
          "name": "Roots.gov.sg (National Heritage Board) — Ang Ku Kueh: Significance, Traditions, And Its Relevance Today",
          "url": "https://www.roots.gov.sg/stories-landing/stories/Ang-Ku-Kueh-Significance-Traditions-And-Its-Relevance-Today/Ang-Ku-Kueh-Significance-Traditions-And-Its-Relevance-Today"
        },
        {
          "name": "Wikipedia — Ang ku kueh",
          "url": "https://en.wikipedia.org/wiki/Ang_ku_kueh"
        }
      ]
    },
    "kueh dadar": {
      "local": "kuih dadar",
      "note": {
        "en": "Nyonya/Malay kueh: a pandan green crepe rolled around grated coconut cooked in gula melaka; also called kuih ketayap or dadar gulung.",
        "fr": "Kueh nyonya/malais : crepe verte au pandan roulee autour de coco rapee cuite au gula melaka; aussi appelee kuih ketayap ou dadar gulung."
      },
      "sources": [
        {
          "name": "Michelin Guide — Different Types of Kueh in Malaysia and Singapore",
          "url": "https://guide.michelin.com/my/en/article/features/different-types-of-kueh-in-malaysia-and-singapore"
        },
        {
          "name": "Rasa Malaysia — Kuih Dadar (Kuih Ketayap)",
          "url": "https://rasamalaysia.com/kuih-dadar-kuih-tayap/"
        }
      ]
    },
    "kueh salat": {
      "local": "kueh salat",
      "note": {
        "en": "Two-layer Peranakan (Nyonya) kueh: a coconut-milk glutinous-rice base under a green pandan-coconut custard; also called kuih seri muka.",
        "fr": "Kueh peranakan (nyonya) a deux couches : base de riz gluant au lait de coco sous une creme verte pandan-coco ; dit aussi kuih seri muka."
      },
      "sources": [
        {
          "name": "Michelin Guide - Traditional Malay and Indonesian Kueh",
          "url": "https://guide.michelin.com/sg/en/article/features/traditional-malay-and-indonesian-kueh"
        },
        {
          "name": "Share Food Singapore - Kueh Sarlat",
          "url": "https://www.sharefood.sg/cuisine/asian/kueh-sarlat/"
        }
      ]
    },
    "png kueh": {
      "local": "红桃粿",
      "note": {
        "en": "Teochew peach-shaped, pink-dyed glutinous rice cake stuffed with savoury rice, dried shrimp & peanuts; the peach mould symbolises longevity.",
        "fr": "Gâteau teochew de riz gluant rose en forme de pêche, fourré de riz salé, crevettes séchées et cacahuètes ; la pêche symbolise la longévité."
      },
      "sources": [
        {
          "name": "ieatishootipost - Teochew Kueh: Why is there Red and White Png Kueh?",
          "url": "https://ieatishootipost.sg/teochew-kueh-why-is-there-red-and-white-png-kueh/"
        },
        {
          "name": "What To Cook Today - Teochew Png Kueh",
          "url": "https://whattocooktoday.com/teochew-png-kueh.html"
        }
      ]
    },
    "kueh ko swee": {
      "local": "碱水糕",
      "note": {
        "en": "Nyonya steamed rice-and-tapioca-flour kueh, sweetened with gula melaka or pandan, steamed in small Chinese cups, rolled in grated coconut.",
        "fr": "Kueh nyonya a la vapeur, farine de riz et tapioca, sucre au gula melaka ou pandan, en tasses chinoises, roule dans la noix de coco rapee."
      },
      "sources": [
        {
          "name": "Michelin Guide — Kueh 101: Your Guide to Enjoying Kueh in Malaysia and Singapore",
          "url": "https://guide.michelin.com/mo/en/article/features/different-types-of-kueh-in-malaysia-and-singapore"
        },
        {
          "name": "Singapore Noodles (Pamelia Chia) — Kueh Kosui",
          "url": "https://sgpnoodles.substack.com/p/kueh-kosui"
        }
      ]
    },
    "apam balik SG": {
      "local": "面煎粿 (min jiang kueh) / apam balik",
      "note": {
        "en": "Folded turnover pancake, locally called min jiang kueh; crisp-edged batter filled with crushed peanuts, sugar and sweetcorn.",
        "fr": "Crepe pliee, appelee localement min jiang kueh; pate aux bords croustillants garnie de cacahuetes pilees, sucre et mais (balik = repliee)."
      },
      "sources": [
        {
          "name": "Apam balik - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Apam_balik"
        },
        {
          "name": "Michelin Guide Singapore - Best Min Jiang Kueh Peanut Pancakes",
          "url": "https://guide.michelin.com/sg/en/article/dining-out/best-min-jiang-kueh-peanut-pancakes-singapore-2018"
        }
      ]
    },
    "goreng pisang": {
      "local": "goreng pisang",
      "note": {
        "en": "Malay-origin banana fritters: ripe bananas in a flour batter, deep-fried; a hawker-centre and street-vendor snack (Malay pisang goreng).",
        "fr": "Beignets de banane d'origine malaise : bananes mûres enrobées de pâte à farine et frites; en-cas des hawker centres (malais pisang goreng)."
      },
      "sources": [
        {
          "name": "Banana fritter - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Banana_fritter"
        },
        {
          "name": "ieatishootipost - Geylang Lor 20 Banana Fritters (Goreng Pisang)",
          "url": "https://ieatishootipost.sg/geylang-lor-20-banana-fritters-oh-man-i-just-rediscovered-goreng-pisang/"
        }
      ]
    },
    "roti john": {
      "local": "Roti John",
      "note": {
        "en": "Singapore omelette-sandwich from the 1960s: a French loaf split lengthwise, fried egg-side-down with minced meat, onions and spices.",
        "fr": "Sandwich-omelette singapourien des années 1960 : baguette fendue, frite côté œuf avec viande hachée, oignons et épices."
      },
      "sources": [
        {
          "name": "NLB Infopedia / Singapapore",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1663_2010-04-15.html"
        },
        {
          "name": "TasteAtlas - Roti John",
          "url": "https://www.tasteatlas.com/roti-john"
        }
      ]
    },
    "epok-epok": {
      "local": "epok-epok",
      "note": {
        "en": "The Malay curry puff: a deep-fried, crimped crescent of dough with a spicy sardine or potato filling, often eaten with chilli sauce.",
        "fr": "Le chausson au curry malais : un croissant de pate frit et festonne, fourre de sardine ou pomme de terre epicee, souvent avec sauce chili."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Curry puff",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1805_2011-03-30.html"
        },
        {
          "name": "Makansutra — Curry Puff and Epok epok are NOT the Same?",
          "url": "https://makansutra.com/curry-puff-and-epok-epok-are-not-the-same/"
        }
      ]
    },
    "youtiao SG breakfast": {
      "local": "油炸粿",
      "note": {
        "en": "Deep-fried golden wheat-dough fritter of Chinese origin; in Singapore (Hokkien 油炸粿, \"yu char kway\") dipped in coffee or eaten with congee.",
        "fr": "Beignet de pate frite dore d'origine chinoise; a Singapour (hokkien 油炸粿, \"yu char kway\") trempe dans le cafe ou mange avec congee."
      },
      "sources": [
        {
          "name": "Youtiao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Youtiao"
        },
        {
          "name": "Johor Kaki - History of Youtiao / You Cha Kway",
          "url": "https://johorkaki.blogspot.com/2020/07/History-Youtiao-You-Cha-Kway.html"
        }
      ]
    },
    "mua chee": {
      "local": "麻糍",
      "note": {
        "en": "Hokkien/Teochew snack of soft glutinous-rice dough tossed in ground peanuts and sugar; a pasar-malam (night-market) treat eaten with picks.",
        "fr": "En-cas hokkien/teochew de pate de riz gluant roulee dans cacahuetes pilees et sucre; vedette des marches de nuit, mange au cure-dent."
      },
      "sources": [
        {
          "name": "Singapore Noodles (Pamelia Chia) — Muah chee 麻糍",
          "url": "https://sgpnoodles.substack.com/p/muah-chee"
        },
        {
          "name": "Makansutra — A Paradise for Muah Chee",
          "url": "https://makansutra.com/a-paradise-for-muah-chee/"
        }
      ]
    },
    "bobo cha cha": {
      "local": "bubur cha cha",
      "note": {
        "en": "Nyonya (Peranakan) dessert of yam, sweet potato and tapioca pieces in warm pandan coconut milk; bubur = Malay for porridge.",
        "fr": "Dessert nyonya (peranakan): igname, patate douce et tapioca dans un lait de coco au pandan; bubur signifie bouillie en malais."
      },
      "sources": [
        {
          "name": "Nyonya Cooking — Bubur Cha Cha",
          "url": "https://www.nyonyacooking.com/recipes/bubur-cha-cha-nyonya-coconut-milk-dessert~rJ70DvivM9-X"
        },
        {
          "name": "SETHLUI — Bubur Cha Cha recipe (Singapore)",
          "url": "https://sethlui.com/bubur-cha-cha-recipe-singapore/"
        }
      ]
    },
    "cheng tng": {
      "local": "清汤",
      "note": {
        "en": "Teochew \"clear soup\": a sweet dried-longan broth with white fungus, gingko, barley and candied winter melon, served hot or cold.",
        "fr": "Soupe sucree teochew (\"soupe claire\") : longane sec, champignon blanc, ginkgo, orge et melon d'hiver confit, servie chaude ou froide."
      },
      "sources": [
        {
          "name": "TasteAtlas — Cheng Tng",
          "url": "https://www.tasteatlas.com/cheng-tng"
        },
        {
          "name": "Daniel Food Diary — Guide to Cheng Tng in Singapore",
          "url": "https://danielfooddiary.com/2020/06/07/chengtng/"
        }
      ]
    },
    "tau huay (douhua)": {
      "local": "豆花",
      "note": {
        "en": "Silken soybean-curd dessert; in Singapore (Hokkien tau huay) served with clear sweet, pandan or gula melaka syrup.",
        "fr": "Dessert de tofu soyeux; a Singapour (tau huay en hokkien), servi avec un sirop sucre clair, au pandan ou au gula melaka."
      },
      "sources": [
        {
          "name": "Douhua - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Douhua"
        },
        {
          "name": "Michelin Guide - When in Singapore: Must-try Desserts",
          "url": "https://guide.michelin.com/en/article/travel/singapore-must-try-local-desserts"
        }
      ]
    },
    "mango pomelo sago": {
      "local": "楊枝甘露",
      "note": {
        "en": "Chilled mango, pomelo, sago and coconut/evaporated milk dessert; created by Lei Garden's chef in 1984 at its first Singapore branch.",
        "fr": "Dessert glacé de mangue, pomelo, sagou et lait de coco; créé par le chef du Lei Garden en 1984 à sa première succursale singapourienne."
      },
      "sources": [
        {
          "name": "Mango pomelo sago — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mango_pomelo_sago"
        },
        {
          "name": "Behind the Name of an Immortal Hong Kong Dessert — The World of Chinese",
          "url": "https://www.theworldofchinese.com/2021/07/behind-the-name-of-an-immortal-hong-kong-dessert/"
        }
      ]
    },
    "durian pengat": {
      "local": "Pengat Durian",
      "note": {
        "en": "Malay/Peranakan semi-porridge dessert of durian flesh cooked with coconut milk, palm sugar (gula melaka) and pandan; served warm or chilled.",
        "fr": "Dessert malais/peranakan: durian en demi-bouillie au lait de coco, sucre de palme (gula melaka) et pandan; servi chaud ou froid."
      },
      "sources": [
        {
          "name": "SETHLUI - Best Durian Desserts & Snacks in Singapore",
          "url": "https://sethlui.com/best-durian-desserts-snacks-singapore/"
        },
        {
          "name": "The Meatmen - Pengat Durian with Sago",
          "url": "https://themeatmen.sg/recipes/pengat-durian-with-sago/"
        }
      ]
    },
    "kaya": {
      "local": "kaya",
      "note": {
        "en": "Sweet coconut-egg custard jam scented with pandan; \"kaya\" means \"rich\" in Malay. Popularised in Singapore by Hainanese cooks and kopitiam.",
        "fr": "Confiture coco-œuf sucrée au pandan ; «kaya» = «riche» en malais. Popularisée à Singapour par les cuisiniers hainanais et kopitiam."
      },
      "sources": [
        {
          "name": "NLB Infopedia - Kaya",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2022-07-20_115932.html"
        },
        {
          "name": "Wikipedia - Coconut jam",
          "url": "https://en.wikipedia.org/wiki/Coconut_jam"
        }
      ]
    },
    "kaya toast": {
      "local": "咖椰吐司",
      "note": {
        "en": "Toasted bread spread with kaya (coconut, egg, sugar, pandan jam) and butter; a kopitiam staple from Hainanese cooks adapting Western jams.",
        "fr": "Pain grille tartine de kaya (confiture coco, oeuf, sucre, pandan) et beurre ; classique kopitiam popularise par les cuisiniers hainanais."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Kaya",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2022-07-20_115932.html"
        },
        {
          "name": "Wikipedia — Kaya toast",
          "url": "https://en.wikipedia.org/wiki/Kaya_toast"
        }
      ]
    },
    "soft-boiled eggs with kaya toast": {
      "local": "咖椰烤面包 (kaya toast)",
      "note": {
        "en": "Nanyang breakfast from 19th-c. Hainanese kopitiam cooks: toast with pandan-coconut kaya jam, served with runny eggs in dark soy and pepper.",
        "fr": "Petit-déjeuner Nanyang des cuistots hainanais des kopitiam (19e s.): pain au kaya coco-pandan, oeufs coulants au soja noir et poivre blanc."
      },
      "sources": [
        {
          "name": "Roots.gov.sg (National Heritage Board) — Traditional Breakfast of Kaya and Kopi",
          "url": "https://www.roots.gov.sg/ich-landing/ich/traditional-breakfast-of-kaya-and-kopi"
        },
        {
          "name": "Michelin Guide — The Anatomy of the Quintessential Singaporean Breakfast",
          "url": "https://guide.michelin.com/en/article/features/singaporean-breakfast-kopitiam-kaya-toast-eggs"
        }
      ]
    },
    "french toast SG-style": {
      "local": "roti john",
      "note": {
        "en": "Singapore-Malay French toast: a split bun griddled with egg, onion and minced meat, served with chilli or tomato sauce.",
        "fr": "Pain perdu singapouro-malais : pain fendu saisi a l'oeuf, oignon et viande hachee, servi avec sauce chili ou tomate."
      },
      "sources": [
        {
          "name": "SETHLUI — 10 must-try Kaya Toasts in Singapore",
          "url": "https://sethlui.com/best-kaya-toasts-singapore/"
        },
        {
          "name": "Eatbook — Kaya Toast Stalls in Singapore",
          "url": "https://eatbook.sg/kaya-toast/"
        }
      ]
    },
    "tang yuan SG": {
      "local": "汤圆",
      "note": {
        "en": "Chewy glutinous rice balls in sweet ginger or peanut broth; eaten at Winter Solstice (Dong Zhi); name puns on tuan yuan, family reunion.",
        "fr": "Boulettes de riz gluant en bouillon sucre gingembre ou cacahuete; mangees au solstice d'hiver (Dong Zhi); nom evoquant la reunion familiale."
      },
      "sources": [
        {
          "name": "Daniel Food Diary — 10 Best Tang Yuan in Singapore",
          "url": "https://danielfooddiary.com/2024/12/21/tangyuan/"
        },
        {
          "name": "EasyParcel SG — Winter Solstice: What Does Tangyuan Symbolize?",
          "url": "https://blog.easyparcel.com/sg/winter-solstice-what-does-tangyuan-symbolize/"
        }
      ]
    },
    "red bean ice": {
      "local": "紅豆冰",
      "note": {
        "en": "Hong-Kong cha chaan teng cold drink of sweetened adzuki beans, rock-sugar syrup and evaporated milk over crushed ice.",
        "fr": "Boisson glacee hongkongaise (cha chaan teng): haricots adzuki sucres, sirop de sucre candi et lait evapore sur glace pilee."
      },
      "sources": [
        {
          "name": "Red bean ice - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Red_bean_ice"
        }
      ]
    },
    "gula melaka pudding": {
      "local": "sago gula melaka",
      "note": {
        "en": "Chilled pudding of soft sago pearls served with coconut milk and treacly gula melaka (palm sugar) syrup; popular in Singapore and Malaysia.",
        "fr": "Pudding froid de perles de sagou avec lait de coco et sirop de gula melaka (sucre de palme) ; populaire a Singapour et en Malaisie."
      },
      "sources": [
        {
          "name": "SETHLUI - Sago Pudding Drizzled With Gula Melaka",
          "url": "https://sethlui.com/sago-pudding-gula-melaka-recipe-singapore/"
        },
        {
          "name": "Nyonya Cooking - Sago Pudding with Palm Sugar",
          "url": "https://www.nyonyacooking.com/recipes/sago-pudding-with-palm-sugar~rJrJuvovz5W7"
        }
      ]
    },
    "coconut shake": {
      "local": "Coconut shake",
      "note": {
        "en": "Blended drink of coconut water, coconut ice cream and fresh coconut flesh; originated in Melaka and popularised in Singapore by Mr Coconut.",
        "fr": "Boisson mixée à base d'eau de coco, de glace à la noix de coco et de chair fraîche; née à Malacca, popularisée à Singapour par Mr Coconut."
      },
      "sources": [
        {
          "name": "Mothership SG - Mr Coconut interview",
          "url": "https://mothership.sg/2022/01/mr-coconut-interview/"
        },
        {
          "name": "SETHLUI - Coconut Shake recipe",
          "url": "https://sethlui.com/coconut-shake-recipe-singapore/"
        }
      ]
    },
    "kopi": {
      "local": "kopi",
      "note": {
        "en": "Nanyang-style coffee from Hainanese kopitiams: Robusta beans wok-roasted with sugar and margarine, sock-brewed, served with condensed milk.",
        "fr": "Cafe nanyang des kopitiams hainanais : grains robusta torrefies au wok avec sucre et margarine, filtres a la chaussette, au lait concentre."
      },
      "sources": [
        {
          "name": "Kopi (drink) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        },
        {
          "name": "The history and origins of kopi in Singapore - Singapore Chinese Cultural Centre (Culturepaedia)",
          "url": "https://culturepaedia.singaporeccc.org.sg/popular-culture/the-history-and-origins-of-kopi-in-singapore/"
        }
      ]
    },
    "kopi-O": {
      "local": "咖啡烏 (kopi-O)",
      "note": {
        "en": "Singapore kopitiam black coffee, no milk but sweetened with sugar; \"O\" is Hokkien o͘ (烏, \"black\"), from wok-roasted robusta beans.",
        "fr": "Cafe noir des kopitiam de Singapour, sans lait mais sucre ; \"O\" vient du hokkien o͘ (烏, \"noir\"), a base de robusta torrefie au wok."
      },
      "sources": [
        {
          "name": "Kopi (drink) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        }
      ]
    },
    "kopi-C": {
      "local": "咖啡C (鮮)",
      "note": {
        "en": "Singapore kopitiam coffee with sugar and evaporated milk; the 'C' is from the Carnation milk brand or Hainanese 鮮 (si, 'fresh').",
        "fr": "Cafe de kopitiam singapourien au sucre et lait evapore; le 'C' vient de la marque Carnation ou du hainanais 鮮 (si, 'frais')."
      },
      "sources": [
        {
          "name": "Kopi (drink) — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        },
        {
          "name": "Kopi vs Kopi-O vs Kopi-C — Singapore Food Festival",
          "url": "https://singaporefoodfestival.org/kopi-vs-kopi-o-vs-kopi-c-a-simple-guide-to-local-coffee/"
        }
      ]
    },
    "kopi gao": {
      "local": "咖啡厚",
      "note": {
        "en": "Singapore kopitiam coffee with condensed milk and sugar brewed extra-strong; \"gao\" is Hokkien 厚 (kāu), \"thick,\" for a bolder cup.",
        "fr": "Café de kopitiam singapourien au lait concentré et sucre, infusé corsé ; \"gao\" vient du hokkien 厚 (kāu), \"épais,\" pour une tasse plus forte."
      },
      "sources": [
        {
          "name": "Kopi (drink) — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        },
        {
          "name": "How to order kopi in Singapore like a local — The Honeycombers",
          "url": "https://thehoneycombers.com/singapore/order-kopi-singapore/"
        }
      ]
    },
    "kopi siu dai": {
      "local": "咖啡少底",
      "note": {
        "en": "Kopitiam coffee ordered \"siu dai\" (少底, Cantonese \"less base\"): the standard kopi with reduced sugar/condensed-milk sweetness.",
        "fr": "Café de kopitiam commandé « siu dai » (少底, cantonais « moins de base ») : le kopi habituel, mais moins sucré (moins de lait concentré)."
      },
      "sources": [
        {
          "name": "Kopi (drink) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        },
        {
          "name": "siew dai - Wiktionary",
          "url": "https://en.wiktionary.org/wiki/siew_dai"
        }
      ]
    },
    "kopi kosong": {
      "local": "咖啡 (kopi) kosong",
      "note": {
        "en": "Singaporean kopitiam coffee ordered \"kosong\" (Malay: empty) — Hainanese dark-roast kopi with no sugar and no condensed milk; just black",
        "fr": "Café de kopitiam singapourien commandé « kosong » (malais : vide) — kopi torréfié hainanais, sans sucre ni lait concentré ; café noir."
      },
      "sources": [
        {
          "name": "Kopi (drink) — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        },
        {
          "name": "How to order kopi in Singapore like a local — The Honeycombers",
          "url": "https://thehoneycombers.com/singapore/order-kopi-singapore/"
        }
      ]
    },
    "kopi peng": {
      "local": "咖啡冰",
      "note": {
        "en": "Iced version of Singapore's kopitiam coffee (brewed Nanyang-style coffee with condensed milk and sugar); \"peng\" is Hokkien 冰 for ice.",
        "fr": "Version glacee du cafe de kopitiam singapourien (cafe Nanyang au lait concentre et sucre) ; \"peng\" vient du hokkien 冰, glace."
      },
      "sources": [
        {
          "name": "Wikipedia — Kopi (drink)",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        },
        {
          "name": "Gardens by the Bay — Kopi Terms in Singapore",
          "url": "https://www.gardensbythebaysingapore.com/kopi-terms-in-singapore/"
        }
      ]
    },
    "kopi-O kosong": {
      "local": "咖啡乌空 (kopi-O kosong)",
      "note": {
        "en": "Nanyang-style black coffee, no milk and no sugar; \"O\" is Hokkien 烏 (black), \"kosong\" is Malay for empty/zero.",
        "fr": "Café noir de style Nanyang, sans lait ni sucre ; « O » vient du hokkien 烏 (noir) et « kosong » signifie vide/zéro en malais."
      },
      "sources": [
        {
          "name": "Kopi (drink) — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        },
        {
          "name": "Kopi Glossary: Local Coffee Terms Explained — Singapore Food Festival",
          "url": "https://singaporefoodfestival.org/kopi-glossary-local-coffee-terms-explained/"
        }
      ]
    },
    "teh": {
      "local": "teh",
      "note": {
        "en": "Malay for tea; Singapore kopitiam hot milk tea, brewed strong with condensed milk. Variants: teh-o (no milk), teh-c (evaporated milk).",
        "fr": "Malais pour the; the au lait chaud des kopitiams, infuse fort au lait concentre. Variantes: teh-o (sans lait), teh-c (lait evapore)."
      },
      "sources": [
        {
          "name": "NLB Roots - Making and Sharing of Tea",
          "url": "https://www.roots.gov.sg/ich-landing/ich/Making-and-Sharing-of-Tea"
        },
        {
          "name": "How to order coffee and tea like a local in Singapore - HoneyKids Asia",
          "url": "https://honeykidsasia.com/ordering-coffee-and-tea-like-a-local-in-singapore/"
        }
      ]
    },
    "teh-O": {
      "local": "茶乌",
      "note": {
        "en": "Singapore kopitiam tea brewed through a cloth \"sock\" filter, served hot with sugar but no milk; the \"O\" code means no milk added.",
        "fr": "Thé de kopitiam singapourien infusé dans un filtre en tissu, servi chaud avec du sucre mais sans lait ; le code « O » signifie sans lait."
      },
      "sources": [
        {
          "name": "SETHLUI — Secret Kopitiam Codewords",
          "url": "https://sethlui.com/secret-kopitiam-codewords-singapore/"
        },
        {
          "name": "NLB Infopedia — Teh tarik (kopitiam tea variations)",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2013-07-19_103055.html"
        }
      ]
    },
    "teh-C": {
      "local": "茶C",
      "note": {
        "en": "Kopitiam tea made with unsweetened evaporated milk; \"C\" is the Hainanese pronunciation of 鲜 (xian, \"fresh\"), short for fresh milk.",
        "fr": "Thé de kopitiam au lait évaporé non sucré ; le « C » vient du hainanais 鲜 (xian, « frais »), abrégé de lait frais."
      },
      "sources": [
        {
          "name": "Makansutra — What does C in Teh-C mean?",
          "url": "https://makansutra.com/what-does-c-in-teh-c-mean/"
        },
        {
          "name": "Singapore Food Festival — Kopi vs Kopi-O vs Kopi-C",
          "url": "https://singaporefoodfestival.org/kopi-vs-kopi-o-vs-kopi-c-a-simple-guide-to-local-coffee/"
        }
      ]
    },
    "teh peng": {
      "local": "茶冰",
      "note": {
        "en": "Singapore kopitiam iced tea; \"peng\" is Hokkien for ice, so teh peng is the chilled version of teh — black tea with condensed milk and sugar.",
        "fr": "Thé glacé des kopitiam de Singapour ; \"peng\" signifie glace en hokkien : version glacée du teh, thé noir au lait concentré sucré."
      },
      "sources": [
        {
          "name": "SETHLUI — Secret Kopitiam Codewords",
          "url": "https://sethlui.com/secret-kopitiam-codewords-singapore/"
        },
        {
          "name": "Seedly — How to Order Kopi & Teh in Singapore",
          "url": "https://blog.seedly.sg/singapore-coffee-kopi-tea-teh-guide-difference-in-price-how-to-order/"
        }
      ]
    },
    "teh-O peng": {
      "local": "茶乌冰",
      "note": {
        "en": "Kopitiam order: iced black tea, sweetened but no milk — \"teh\" (tea), \"O\" (black, Hokkien), \"peng\" (ice, Hokkien).",
        "fr": "Commande de kopitiam : thé noir glacé, sucré mais sans lait — « teh » (thé), « O » (noir, hokkien), « peng » (glace, hokkien)."
      },
      "sources": [
        {
          "name": "The Honeycombers — 16 ways to order teh in Singapore",
          "url": "https://thehoneycombers.com/singapore/order-teh-singapore/"
        },
        {
          "name": "SETHLUI — Secret Kopitiam Codewords",
          "url": "https://sethlui.com/secret-kopitiam-codewords-singapore/"
        }
      ]
    },
    "teh halia": {
      "local": "teh halia",
      "note": {
        "en": "Malay for \"ginger tea\": strong sweetened black tea brewed with ginger rhizome and condensed milk, a spiced kopitiam staple in Singapore.",
        "fr": "\"The au gingembre\" en malais : the noir sucre infuse au gingembre et au lait concentre, un classique epice des kopitiam de Singapour."
      },
      "sources": [
        {
          "name": "Wikipedia — Teh halia (Ginger tea)",
          "url": "https://en.wikipedia.org/wiki/Teh_halia"
        },
        {
          "name": "Indian Heritage Centre — Teh Halia",
          "url": "https://www.facebook.com/indianheritagecentre/posts/its-tea-time-how-about-a-classic-teh-haliateh-halia-ginger-tea-is-a-popular-spic/6030588773632810/"
        }
      ]
    },
    "teh masala": {
      "local": "teh masala",
      "note": {
        "en": "Singapore kopitiam/mamak spiced milk tea: black tea brewed with masala spices (cardamom, cinnamon, cloves, ginger), akin to Indian masala",
        "fr": "The au lait epice des kopitiam/mamak de Singapour : the noir infuse aux epices masala (cardamome, cannelle, girofle, gingembre), proche du"
      },
      "sources": [
        {
          "name": "Eatbook SG — 10 Best Teh Stalls In Singapore (Masala Tea, Teh Tarik)",
          "url": "https://eatbook.sg/best-teh-singapore/"
        },
        {
          "name": "Tribe Tours — Kopis & Tehs (Singapore tea glossary)",
          "url": "https://tribe-tours.com/kopis-tehs/"
        }
      ]
    },
    "milo": {
      "local": "Milo Dinosaur",
      "note": {
        "en": "Iced Milo malt drink piled with undissolved Milo powder; the \"Milo Dinosaur\" name arose in 1990s Singapore Indian-Muslim eateries.",
        "fr": "Milo glacé garni d'un tas de poudre Milo non dissoute; le nom \"Milo Dinosaur\" est né dans les gargotes indo-musulmanes de Singapour, 1990s."
      },
      "sources": [
        {
          "name": "Milo dinosaur - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Milo_dinosaur"
        },
        {
          "name": "Far from Extinct? A History of the \"Milo Dinosaur\" in Singapore (National Museum / NHB, Geoffrey Pakiam)",
          "url": "https://www.nhb.gov.sg/nationalmuseum/-/media/nms2017/documents/historiasg-transcripts/historiasg-lecture-6-14-sep-2019--geoffrey-pakiam-final.pdf?la=en"
        }
      ]
    },
    "milo dinosaur": {
      "local": "Milo Dinosaur (Milo tabur)",
      "note": {
        "en": "Iced Milo crowned with a heap of undissolved Milo powder; named at Singapore Indian-Muslim eateries in the mid-1990s.",
        "fr": "Milo glace couronne d'un tas de poudre de Milo non dissoute; nomme dans les gargotes indo-musulmanes de Singapour au milieu des annees 1990."
      },
      "sources": [
        {
          "name": "Milo dinosaur — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Milo_dinosaur"
        },
        {
          "name": "Milo Dinosaur: life and times of a Southeast Asian national beverage — IIAS (Geoffrey Pakiam)",
          "url": "https://www.iias.asia/the-newsletter/article/milo-dinosaur-life-and-times-southeast-asian-national-beverage"
        }
      ]
    },
    "milo godzilla": {
      "local": "Milo Godzilla",
      "note": {
        "en": "An iced Milo Dinosaur (Milo drink heaped with extra Milo powder) topped with a scoop of ice cream and/or whipped cream.",
        "fr": "Un Milo Dinosaur glacé (boisson Milo coiffée d'un surplus de poudre Milo) garni d'une boule de glace et/ou de crème fouettée."
      },
      "sources": [
        {
          "name": "Wikipedia — Milo dinosaur",
          "url": "https://en.wikipedia.org/wiki/Milo_dinosaur"
        }
      ]
    },
    "milo peng": {
      "local": "美禄冰",
      "note": {
        "en": "Kopitiam-style iced Milo — Nestle's chocolate-malt powder over ice; \"peng\" is Hokkien for ice, a staple cold drink in Singapore.",
        "fr": "Milo glace facon kopitiam : poudre chocolat-malt de Nestle sur glace ; \"peng\" signifie glace en hokkien, boisson froide prisee a Singapour."
      },
      "sources": [
        {
          "name": "Milo (drink) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Milo_(drink)"
        },
        {
          "name": "SETHLUI - Secret Kopitiam Codewords",
          "url": "https://sethlui.com/secret-kopitiam-codewords-singapore/"
        }
      ]
    },
    "horlicks dinosaur": {
      "local": "",
      "note": {
        "en": "Malted-milk twist on the Milo Dinosaur: iced Horlicks topped with a heap of undissolved Horlicks powder, a SG/Malaysia kopitiam drink.",
        "fr": "Variante maltee du Milo Dinosaur : Horlicks glace surmonte d'un tas de poudre Horlicks non dissoute, boisson des kopitiam de Singapour."
      },
      "sources": [
        {
          "name": "Milo dinosaur - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Milo_dinosaur"
        },
        {
          "name": "11 Secret Kopitiam Drinks - TheSmartLocal",
          "url": "https://thesmartlocal.com/read/secret-kopitiam-drinks/"
        }
      ]
    },
    "bandung": {
      "local": "air bandung",
      "note": {
        "en": "Pink Malay drink of evaporated or condensed milk with rose syrup; \"bandung\" means \"pairs,\" not the Indonesian city.",
        "fr": "Boisson malaise rose, lait concentre et sirop de rose; \"bandung\" signifie \"paires\", sans lien avec la ville indonesienne."
      },
      "sources": [
        {
          "name": "Wikipedia — Bandung (drink)",
          "url": "https://en.wikipedia.org/wiki/Bandung_(drink)"
        }
      ]
    },
    "bandung soda": {
      "local": "air bandung / sirap bandung",
      "note": {
        "en": "Pink Malay drink of rose syrup with evaporated or condensed milk; soda version adds soda water. Arose in early-1900s colonial Singapore.",
        "fr": "Boisson malaise rose au sirop de rose et lait concentre; la version soda ajoute de l'eau gazeuse. Nee a Singapour colonial vers 1900."
      },
      "sources": [
        {
          "name": "Bandung (drink) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bandung_(drink)"
        }
      ]
    },
    "michael jackson": {
      "local": "豆浆仙草",
      "note": {
        "en": "Singapore hawker drink of soya bean milk mixed with black grass jelly; named after the contrast in MJ song Black or White.",
        "fr": "Boisson hawker de Singapour: lait de soja mélangé à de la gelée noire; nommée pour le contraste de la chanson MJ Black or White."
      },
      "sources": [
        {
          "name": "SBS Food — Michael Jackson and rubber ducks: drinks in Singapore",
          "url": "https://www.sbs.com.au/food/article/michael-jackson-and-rubber-ducks-drinks-in-singapore-are-full-of-surprises/srb1u9hrx"
        },
        {
          "name": "TheSmartLocal — Michael Jackson (Singapore product review)",
          "url": "https://thesmartlocal.com/reviews/singapore/uniquely-singapore-2/singapore-products-uniquely-singapore-2/michael-jackson/"
        }
      ]
    },
    "soya bean drink": {
      "local": "豆浆",
      "note": {
        "en": "Soy milk (dòujiāng); fresh soybean drink and Chinese hawker staple, served hot or cold, sweet or savoury, often beside tau huay.",
        "fr": "Lait de soja (dòujiāng); boisson de soja, incontournable des hawkers, servie chaude ou froide, sucrée ou salée, souvent avec le tau huay."
      },
      "sources": [
        {
          "name": "Doujiang - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Doujiang"
        },
        {
          "name": "Offbeat.sg - Soya Bean: Its Culture, Our Stories",
          "url": "https://www.offbeat.sg/journal/soya-bean-our-culture-with-some-of-its-stories"
        }
      ]
    },
    "grass jelly drink (chin chow)": {
      "local": "仙草",
      "note": {
        "en": "Cooling black grass-jelly drink from boiled Mesona chinensis herb, served chilled over ice with syrup; eases heatiness in Chinese medicine.",
        "fr": "Boisson noire rafraichissante de Mesona chinensis bouillie, servie glacee avec sirop; calme la chaleur en medecine chinoise."
      },
      "sources": [
        {
          "name": "Wikipedia — Grass jelly",
          "url": "https://en.wikipedia.org/wiki/Grass_jelly"
        },
        {
          "name": "Johor Kaki — Zhao An Granny Grass Jelly (Chin Chow)",
          "url": "https://johorkaki.blogspot.com/2021/04/zhao-granny-grass-jelly-chin-chow.html"
        }
      ]
    },
    "calamansi juice": {
      "local": "limau kasturi",
      "note": {
        "en": "Tangy hawker-centre drink from the small lime (Citrus x microcarpa, Malay limau kasturi); juice crushed from the fruit, like local lemonade.",
        "fr": "Boisson acidulee des hawker centres, faite de la petite lime (Citrus x microcarpa, limau kasturi en malais) pressee, comme une limonade."
      },
      "sources": [
        {
          "name": "Calamansi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Calamansi"
        }
      ]
    },
    "lime juice with sour plum": {
      "local": "桔子酸梅 (limau asam boi)",
      "note": {
        "en": "Hawker thirst-quencher: tangy calamansi-lime juice with a salted-sweet Chinese preserved plum (asam boi / suan mei) dropped in.",
        "fr": "Boisson de hawker desalterante: jus de citron vert calamansi avec une prune chinoise confite, sucree-salee (asam boi / suan mei)."
      },
      "sources": [
        {
          "name": "New Malaysian Kitchen — Limau Asam Boi / Lime & Plum Juice",
          "url": "https://www.newmalaysiankitchen.com/calamansi-sour-plum-juice-limau-asam-boi/"
        },
        {
          "name": "JewelPie — Refreshing lime and sour plum drink (limau asam boi)",
          "url": "https://jewelpie.com/recipe-refreshing-lime-plum-drink-in-1-minute-asam-boi/"
        }
      ]
    },
    "sour plum drink": {
      "local": "酸梅汤",
      "note": {
        "en": "Chilled Chinese drink of smoked sour plums, hawthorn, liquorice root, osmanthus and sugar; tastes sweet, sour and slightly salty.",
        "fr": "Boisson chinoise glacee de prunes aigres fumees, aubepine, reglisse, osmanthe et sucre; gout sucre, acide et legerement sale."
      },
      "sources": [
        {
          "name": "Suanmeitang - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Suanmeitang"
        },
        {
          "name": "The Woks of Life - Sour Plum Drink (Suan Mei Tang)",
          "url": "https://thewoksoflife.com/sour-plum-drink-suan-mei-tang/"
        }
      ]
    },
    "sugarcane juice": {
      "local": "甘蔗汁",
      "note": {
        "en": "Murky-green drink of fresh sugarcane pressed through a mill; a hawker-centre staple, often served with lemon or sour plum to cut sweetness.",
        "fr": "Boisson vert trouble de cannes a sucre fraiches pressees au moulin; incontournable des hawker centres, servie avec citron ou prune salee."
      },
      "sources": [
        {
          "name": "City Nomads — Unique Hawker Drinks Found Only in Singapore and Malaysia",
          "url": "https://citynomads.com/unique-hawker-drinks-found-only-in-singapore-and-malaysia/"
        },
        {
          "name": "Wake Up Singapore — SuperCane Brings Sugarcane Juice Back",
          "url": "https://wakeup.sg/supercane-brings-sugarcane-sg/"
        }
      ]
    },
    "coconut water": {
      "local": "air kelapa",
      "note": {
        "en": "Clear electrolyte-rich liquid from young green coconuts (kelapa muda), a popular cooling drink in Singapore, sold fresh or packaged.",
        "fr": "Eau de jeune noix de coco (kelapa muda), riche en électrolytes, boisson rafraîchissante prisée à Singapour, vendue fraîche ou en bouteille."
      },
      "sources": [
        {
          "name": "Her World Singapore — Best coconut water brands in Singapore",
          "url": "https://www.herworld.com/life/review-best-coconut-water-singapore"
        },
        {
          "name": "Siam Coconut — Fresh Thai coconut water Singapore",
          "url": "https://www.siamco.co/"
        }
      ]
    },
    "winter melon tea": {
      "local": "冬瓜茶",
      "note": {
        "en": "Sweet caramel-hued drink (dōngguā chá) made by slow-boiling winter melon (wax gourd) with brown sugar into a syrup, served chilled.",
        "fr": "Boisson sucrée couleur caramel (dōngguā chá), faite en mijotant longuement le melon d'hiver avec du sucre roux en sirop, servie glacée."
      },
      "sources": [
        {
          "name": "Wikipedia — Winter melon punch",
          "url": "https://en.wikipedia.org/wiki/Winter_melon_punch"
        }
      ]
    },
    "chrysanthemum tea": {
      "local": "菊花茶",
      "note": {
        "en": "Dried chrysanthemum flowers steeped in hot water with rock or cane sugar; a 'cooling' hawker-centre and kopitiam staple in Singapore.",
        "fr": "Infusion de fleurs de chrysanthème séchées, eau chaude et sucre candi; boisson 'rafraîchissante' des hawker centres et kopitiam à Singapour."
      },
      "sources": [
        {
          "name": "Chrysanthemum tea — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Chrysanthemum_tea"
        },
        {
          "name": "Chrysanthemum Tea Recipe 菊花茶 — Noob Cook (Singapore)",
          "url": "https://noobcook.com/chrysanthemum-tea/"
        }
      ]
    },
    "barley water": {
      "local": "薏米水",
      "note": {
        "en": "Chinese cooling drink (Hokkien: ee bee chui) of pearl barley simmered soft with rock sugar, often pandan; said to reduce body 'heatiness'.",
        "fr": "Boisson chinoise rafraichissante (hokkien : ee bee chui), orge perle mijotee au sucre candi, souvent pandan; reputee calmer la 'chaleur'."
      },
      "sources": [
        {
          "name": "Noob Cook (Singapore) - Barley Water Recipe (薏米水)",
          "url": "https://noobcook.com/barley-water/"
        },
        {
          "name": "City Guide SG - Must-Try Drinks in Singapore Hawker Centers",
          "url": "https://www.sg-cityguide.com/expat-guide/span-classsqsrte-text-color-accentguide-to-must-try-drinks-in-singapore-hawker-centersspan/"
        }
      ]
    },
    "ice lemon tea SG-style": {
      "local": "Clementi",
      "note": {
        "en": "Sweet iced black tea with lemon; at Singapore kopitiams it's ordered by the rhyming codeword \"Clementi\", after the MRT station.",
        "fr": "Thé noir glacé sucré au citron ; au kopitiam de Singapour, on le commande par le mot-code rimant \"Clementi\", du nom de la station de MRT."
      },
      "sources": [
        {
          "name": "SETHLUI - Secret Kopitiam Codewords to Order Drinks Like a True Singaporean",
          "url": "https://sethlui.com/secret-kopitiam-codewords-singapore/"
        },
        {
          "name": "Wihardja - 11 Singapore Kopitiam Drinks And Their Unusual Nicknames",
          "url": "https://wihardja.com.sg/11-singapore-kopitiam-drinks-and-their-unusual-nicknames-only-locals-will-know-07oct19/"
        }
      ]
    },
    "yuan yang": {
      "local": "鴛鴦",
      "note": {
        "en": "Coffee-and-milk-tea blend (3 parts coffee, 7 parts tea); Hong Kong cha chaan teng origin, a Malaysia/Singapore kopitiam staple called kopi",
        "fr": "Mélange café et thé au lait (3 parts café, 7 parts thé); né des cha chaan teng de Hong Kong, courant en Malaisie et à Singapour sous le nom"
      },
      "sources": [
        {
          "name": "Wikipedia — Yuenyeung",
          "url": "https://en.wikipedia.org/wiki/Yuenyeung"
        },
        {
          "name": "TasteAtlas — Yuanyang",
          "url": "https://www.tasteatlas.com/yuanyang"
        }
      ]
    },
    "kopi tarik": {
      "local": "kopi tarik",
      "note": {
        "en": "\"Pulled\" coffee: kopi with condensed milk and sugar, poured between two vessels from height to aerate it into a frothy brew, like teh tarik.",
        "fr": "Cafe \"tire\" : kopi (lait concentre sucre) verse en hauteur entre deux recipients pour l'aerer en boisson mousseuse, comme le teh tarik."
      },
      "sources": [
        {
          "name": "Kopi (drink) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kopi_(drink)"
        },
        {
          "name": "Kopi Glossary: Local Coffee Terms Explained - Singapore Food Festival",
          "url": "https://singaporefoodfestival.org/kopi-glossary-local-coffee-terms-explained/"
        }
      ]
    },
    "100 plus (isotonic)": {
      "local": "100PLUS",
      "note": {
        "en": "Carbonated isotonic sports drink by Fraser & Neave, launched 1983 in Singapore and Malaysia; the name marks F&N's 100th anniversary.",
        "fr": "Boisson isotonique gazeuse de Fraser & Neave, lancée en 1983 à Singapour et en Malaisie ; le nom marque le centenaire de F&N."
      },
      "sources": [
        {
          "name": "100plus - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/100plus"
        },
        {
          "name": "100PLUS Singapore: Brand Mission",
          "url": "https://100plus.com.sg/brand-mission/"
        }
      ]
    },
    "iced milo with bread": {
      "local": "",
      "note": {
        "en": "Kopitiam breakfast pairing: iced Milo—Nestlé’s malt-chocolate drink (created in Australia, 1934), a Singapore staple—with toasted bread.",
        "fr": "Petit-déjeuner kopitiam : Milo glacé—boisson maltée au chocolat (Nestlé, créée en Australie 1934), classique singapourien—avec pain grillé."
      },
      "sources": [
        {
          "name": "Milo (drink) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Milo_(drink)"
        },
        {
          "name": "National Museum of Singapore — A History of the Milo Dinosaur (HistoriaSG lecture, Geoffrey Pakiam)",
          "url": "https://www.nhb.gov.sg/nationalmuseum/-/media/nms2017/documents/historiasg-transcripts/historiasg-lecture-6-14-sep-2019--geoffrey-pakiam-final.pdf"
        }
      ]
    }
  }
};

const CUISINE_NOTES = {
  "peranakan": {
    "ayam buah keluak": {
      "local": "ayam buah keluak",
      "note": {
        "en": "Peranakan chicken braised in spicy tamarind gravy with buah keluak (Pangium edule) nuts, whose raw cyanide needs days of soaking.",
        "fr": "Poulet peranakan braise en sauce epicee au tamarin, aux noix buah keluak (Pangium edule), dont le cyanure cru exige des jours de trempage."
      },
      "sources": [
        {
          "name": "NLB Infopedia - Ayam buah keluak",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2013-05-16_111918.html"
        },
        {
          "name": "Wikipedia - Ayam buah keluak",
          "url": "https://en.wikipedia.org/wiki/Ayam_buah_keluak"
        }
      ]
    },
    "babi pongteh": {
      "local": "babi pongteh",
      "note": {
        "en": "Peranakan (Nonya) braised pork in fermented soybean paste (taucheo) with garlic, shallots and palm sugar; sweet-salty-savoury.",
        "fr": "Porc braise peranakan (nonya) a la pate de soja fermente (taucheo), ail, echalotes et sucre de palme; sucre-sale-savoureux."
      },
      "sources": [
        {
          "name": "Foodelicacy — Babi Pongteh (Nonya Braised Pork in Fermented Soy Bean Sauce)",
          "url": "https://www.foodelicacy.com/babi-pongteh/"
        },
        {
          "name": "Baba Nyonya Peranakans — Pongteh",
          "url": "https://babanyonyaperanakans.org/2019/02/23/pongteh/"
        }
      ]
    },
    "itek tim": {
      "local": "咸菜鸭汤 (炖鸭汤)",
      "note": {
        "en": "Nyonya tangy duck soup with salted mustard greens, sour plum, tamarind & nutmeg; name = Malay 'itek' (duck) + Hokkien 炖 (tim, simmer).",
        "fr": "Soupe nyonya de canard acidulée: moutarde salée, prune aigre, tamarin, muscade; nom = malais 'itek' (canard) + hokkien 炖 (tim, mijoter)."
      },
      "sources": [
        {
          "name": "Johor Kaki — History of Peranakan Itek Tim",
          "url": "https://johorkaki.blogspot.com/2022/09/history-of-peranakan-dish-itek-tim.html"
        },
        {
          "name": "Baba Nyonya Peranakans — Itek Tim",
          "url": "https://babanyonyaperanakans.org/2019/03/23/itek-tim/"
        }
      ]
    },
    "nasi ulam": {
      "local": "nasi ulam",
      "note": {
        "en": "Nyonya herb rice: rice tossed with finely-chopped fresh herbs (kaffir lime, daun kesum, basil, lemongrass, turmeric leaf) and flaked fish.",
        "fr": "Riz aux herbes nyonya : riz mele d'herbes fraiches hachees (combava, daun kesum, basilic, citronnelle, curcuma) et de poisson emiette."
      },
      "sources": [
        {
          "name": "NLB Infopedia — Nasi ulam",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_916_2004-12-23.html"
        },
        {
          "name": "Wikipedia — Nasi ulam",
          "url": "https://en.wikipedia.org/wiki/Nasi_ulam"
        }
      ]
    },
    "kueh pie tee": {
      "local": "kueh pie tee",
      "note": {
        "en": "Peranakan \"top hat\" snack: a crispy fried batter cup filled with braised yambean, prawns and chilli; name likely from English \"patty\".",
        "fr": "Amuse-bouche peranakan dit \"chapeau haut-de-forme\" : coupelle frite garnie de jicama braisé, crevettes et piment ; nom venu de \"patty\"."
      },
      "sources": [
        {
          "name": "NLB BiblioAsia — Cups and Sources: Hunting Down the Origins of Kueh Pie Tee",
          "url": "https://biblioasia.nlb.gov.sg/vol-20/issue-4/jan-mar-2025/origins-of-kueh-pie-tee/"
        },
        {
          "name": "Wikipedia — Pie tee",
          "url": "https://en.wikipedia.org/wiki/Pie_tee"
        }
      ]
    },
    "nyonya curry chicken (kapitan)": {
      "local": "ayam kapitan",
      "note": {
        "en": "Peranakan (Nyonya) chicken curry; richer, drier and thicker than standard curry, with belacan, candlenut, lemongrass and kaffir lime.",
        "fr": "Curry de poulet peranakan (nyonya); plus riche, sec et epais qu'un curry ordinaire, aux belacan, noix de bancoul, citronnelle et combava."
      },
      "sources": [
        {
          "name": "Kari kapitan - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kari_kapitan"
        },
        {
          "name": "Nyonya-style chicken curry (Kari kapitan) - SBS Food",
          "url": "https://www.sbs.com.au/food/recipe/nyonya-style-chicken-curry-kari-kapitan/cd4utjdfm"
        }
      ]
    },
    "inchi kabin": {
      "local": "Inche Kabin",
      "note": {
        "en": "Nyonya (Straits Chinese) twice-fried chicken marinated in coconut milk and spices, served with a tangy dip; a Penang Peranakan classic.",
        "fr": "Poulet nyonya (Straits Chinese) frit deux fois, mariné au lait de coco et aux épices, sauce acidulée; classique peranakan de Penang."
      },
      "sources": [
        {
          "name": "Lin's Food — Enche Kabin (Nyonya Fried Chicken)",
          "url": "https://www.linsfood.com/enche-kabin-nyonya-fried-chicken/"
        },
        {
          "name": "Nyonya Cooking — Inchi Kabin",
          "url": "https://www.nyonyacooking.com/recipes/inchi-kabin~SyuADvowMc-Q"
        }
      ]
    },
    "cap chai": {
      "local": "杂菜",
      "note": {
        "en": "Nyonya braised mixed-vegetable stew of cabbage, beancurd skin, wood-ear fungus and glass noodles, flavoured with fermented soybean paste.",
        "fr": "Ragoût nyonya de légumes braisés (chou, peau de tofu, champignon noir, vermicelles), parfumé à la pâte de soja fermentée (taucheo)."
      },
      "sources": [
        {
          "name": "SilverStreak — All About Chap Chye",
          "url": "https://silverstreak.sg/all-about-chap-chye-nyonya-lo-han-chap-chye-png/"
        },
        {
          "name": "What To Cook Today — Nyonya/Peranakan Chap Chye",
          "url": "https://whattocooktoday.com/nyonya-chap-chye.html"
        }
      ]
    },
    "ayam tempra": {
      "local": "ayam tempra",
      "note": {
        "en": "Nyonya braised chicken cooked with plenty of onions and dark/light soy sauce, finished with calamansi or lime; savoury-sweet-tangy.",
        "fr": "Poulet braise nyonya cuit avec beaucoup d'oignons et sauce soja claire et foncee, releve de calamansi ou citron vert; sucre-sale-acidule."
      },
      "sources": [
        {
          "name": "Baba Nyonya Peranakans - Ayam Temprah",
          "url": "https://babanyonyaperanakans.org/2019/03/15/ayam-temprah/"
        },
        {
          "name": "What To Cook Today - Nyonya Ayam Tempra",
          "url": "https://whattocooktoday.com/nyonya-ayam-tempra-stove-and-instant-pot.html"
        }
      ]
    },
    "assam pedas": {
      "local": "Asam Pedas",
      "note": {
        "en": "Malay for \"sour spicy\": fish in a tamarind-soured chilli-and-spice broth; the Peranakan version is known as gerang asam ikan.",
        "fr": "\"Aigre-piquant\" en malais : poisson dans un bouillon de piment acidulé au tamarin ; la version peranakan se nomme gerang asam ikan."
      },
      "sources": [
        {
          "name": "Asam pedas - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Asam_pedas"
        },
        {
          "name": "Michelin Guide SG - Ceki Penang's Nyonya Asam Pedas Fish",
          "url": "https://guide.michelin.com/sg/en/article/dining-in/ceki-penang-recipe-for-nyonya-asam-pedas-fish"
        }
      ]
    },
    "perut ikan": {
      "local": "perut ikan",
      "note": {
        "en": "Nyonya/Peranakan spicy-sour stew of brine-preserved fish stomach and many herbs/veg, defined by daun kaduk (wild pepper leaf).",
        "fr": "Ragoût aigre-piquant nyonya/peranakan d'estomac de poisson saumuré, herbes et légumes, marqué par le daun kaduk (poivrier sauvage)."
      },
      "sources": [
        {
          "name": "Wikipedia — Peranakan cuisine",
          "url": "https://en.wikipedia.org/wiki/Peranakan_cuisine"
        },
        {
          "name": "Penang Travel Tips — Perut Ikan",
          "url": "https://www.penang-traveltips.com/perut-ikan.htm"
        }
      ]
    },
    "nyonya bak chang": {
      "local": "娘惹粽",
      "note": {
        "en": "Peranakan zongzi: glutinous rice partly dyed blue by butterfly-pea flower, filled with minced pork, candied winter melon, peanuts, spices.",
        "fr": "Zongzi peranakan : riz gluant teinté de bleu par la fleur de pois bleu, farci de porc haché, courge confite, cacahuètes et épices."
      },
      "sources": [
        {
          "name": "Wikipedia — Peranakan cuisine",
          "url": "https://en.wikipedia.org/wiki/Peranakan_cuisine"
        },
        {
          "name": "Kim Choo Kueh Chang (KrisShop / Singapore Airlines)",
          "url": "https://www.krisshop.com/en/the-edit/kim-choo-kueh-chang-made-with-passion"
        }
      ]
    },
    "nyonya kueh chang": {
      "local": "娘惹粽",
      "note": {
        "en": "Peranakan rice dumpling in pandan and bamboo leaves, with pork, candied winter melon and coriander; partly dyed blue with butterfly-pea.",
        "fr": "Boulette peranakan de riz gluant en feuilles de pandan et bambou, au porc, courge confite et coriandre; teintee au pois papillon bleu."
      },
      "sources": [
        {
          "name": "Wikipedia — Zongzi (Nyonya chang section)",
          "url": "https://en.wikipedia.org/wiki/Zongzi"
        },
        {
          "name": "NLB Infopedia — Butterfly Pea",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_763_2004-12-20.html"
        }
      ]
    },
    "nyonya rendang": {
      "local": "Rendang Nyonya",
      "note": {
        "en": "Peranakan take on Minangkabau (W. Sumatra) rendang: beef slow-braised in spiced coconut milk, deepened by toasted-coconut kerisik.",
        "fr": "Version peranakane du rendang minangkabau (Sumatra) : boeuf mijote au lait de coco epice, relevé du kerisik (coco grillee)."
      },
      "sources": [
        {
          "name": "Rendang - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Rendang"
        },
        {
          "name": "Peranakan cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Peranakan_cuisine"
        }
      ]
    },
    "chap chye masak titek": {
      "local": "杂菜 masak titek",
      "note": {
        "en": "Peranakan chap chye on a 'titek' rempah (shallots, candlenuts, chillies, belacan): cabbage, mushrooms and glass noodles in prawn broth.",
        "fr": "Chap chye peranakan, rempah 'titek' (echalotes, noix de bougie, piments, belacan) : chou, champignons, vermicelles, bouillon de crevettes."
      },
      "sources": [
        {
          "name": "Singapore Noodles (Pamelia Chia) — On chap chye",
          "url": "https://sgpnoodles.substack.com/p/on-chap-chye"
        },
        {
          "name": "Shiokman Recipes — Nyonya Papaya Masak Titek",
          "url": "https://shiokmanrecipes.com/2020/04/02/nyonya-papaya-masak-titek-green-papaya-in-savoury-spicy-soup/"
        }
      ]
    },
    "hee pio soup": {
      "local": "魚鰾湯",
      "note": {
        "en": "Peranakan ceremonial fish-maw (hee pio) soup in pork-prawn broth with handmade fish/prawn balls and egg rolls, served at Tok Panjang feasts.",
        "fr": "Soupe peranakan ceremonielle de vessie de poisson (hee pio), bouillon porc-crevette, boulettes et rouleaux d'oeuf, au Tok Panjang."
      },
      "sources": [
        {
          "name": "travellingfoodies — On the Trail of the Phoenix: Hee Pio Soup",
          "url": "https://travellingfoodies.wordpress.com/2014/09/19/hee-pio-soup/"
        },
        {
          "name": "CNN Travel — Peranakan food guide",
          "url": "https://www.cnn.com/travel/article/peranakan-nyonya-food-intl-hnk"
        }
      ]
    },
    "garam assam fish": {
      "local": "Gerang Asam Ikan",
      "note": {
        "en": "Peranakan spicy-sour fish stew: tamarind (asam) tang, pounded rempah of chilli, candlenut, belacan, lemongrass, scented with bunga kantan.",
        "fr": "Ragout de poisson nyonya aigre-piquant : tamarin (asam), rempah pile de piment, noix de bancoul, belacan, citronnelle, bunga kantan."
      },
      "sources": [
        {
          "name": "Baba Nyonya Peranakans — Gerang Asam Ikan",
          "url": "https://babanyonyaperanakans.org/2019/03/02/gerang-asam-ikan/"
        },
        {
          "name": "National Kitchen by Violet Oon — Garam Assam Fish",
          "url": "https://violetoon.com/product/garam-assam-fish/"
        }
      ]
    },
    "acar (pickled vegetables)": {
      "local": "acar awak",
      "note": {
        "en": "Nyonya mixed pickle of cucumber, long beans & cabbage in a turmeric-chilli-lemongrass-belacan paste, topped with ground peanuts & sesame.",
        "fr": "Pickle nyonya de concombre, haricots longs et chou dans une pâte curcuma-piment-citronnelle-belacan, garni d'arachides et de sésame."
      },
      "sources": [
        {
          "name": "Wikipedia — Peranakan cuisine",
          "url": "https://en.wikipedia.org/wiki/Peranakan_cuisine"
        },
        {
          "name": "Nyonya Cooking — Acar Awak",
          "url": "https://www.nyonyacooking.com/recipes/acar-awak~Bkd-dwjwMcZm"
        }
      ]
    },
    "kueh dadar": {
      "local": "kueh dadar gulung",
      "note": {
        "en": "Nyonya rolled pandan crepe, green from pandan/daun suji, wrapped round grated coconut cooked in gula melaka; \"dadar\"=pancake, \"gulung\"=roll.",
        "fr": "Crepe roulee nyonya au pandan, verte grace au pandan/daun suji, garnie de coco rape au gula melaka; \"dadar\"=crepe, \"gulung\"=rouler."
      },
      "sources": [
        {
          "name": "Wikipedia - Dadar gulung",
          "url": "https://en.wikipedia.org/wiki/Dadar_gulung"
        },
        {
          "name": "Michelin Guide - Kueh 101: Your Guide to Enjoying Kueh",
          "url": "https://guide.michelin.com/sg/en/article/features/different-types-of-kueh-in-malaysia-and-singapore"
        }
      ]
    },
    "kueh salat": {
      "local": "kuih seri muka",
      "note": {
        "en": "Two-layer Nyonya kueh: glutinous rice (often blue-tinted with bunga telang) under a green pandan-coconut custard; also called seri muka.",
        "fr": "Kueh nyonya à deux couches : riz gluant (souvent teinté de bleu) sous une crème verte pandan-coco ; aussi appelé seri muka."
      },
      "sources": [
        {
          "name": "Eatbook.sg — 20 Best Nyonya Kueh Stores In Singapore",
          "url": "https://eatbook.sg/nonya-kueh/"
        },
        {
          "name": "Share Food Singapore — Kueh Sarlat",
          "url": "https://www.sharefood.sg/cuisine/asian/kueh-sarlat/"
        }
      ]
    },
    "kueh bingka ubi": {
      "local": "bingka ubi kayu",
      "note": {
        "en": "Baked cassava (ubi kayu) cake of grated tapioca, coconut milk and sugar; dense, chewy with a caramelised crisp top; a Malay/Nyonya kueh.",
        "fr": "Gateau de manioc (ubi kayu) cuit au four: tapioca rape, lait de coco et sucre; dense, moelleux, croute caramelisee; un kueh malais/nyonya."
      },
      "sources": [
        {
          "name": "Nyonya Cooking — Kuih Bingka (Baked Tapioca Cake/Cassava)",
          "url": "https://www.nyonyacooking.com/recipes/kuih-bingka-baked-tapioca-cake-cassava~rKbfk55UtC"
        },
        {
          "name": "Huang Kitchen — Baked Tapioca Cake (Kuih Bingka Ubi)",
          "url": "https://huangkitchen.com/baked-tapioca-cake-kuih-bingka-ubi/"
        }
      ]
    },
    "bobo cha cha": {
      "local": "bubur cha cha",
      "note": {
        "en": "Nyonya coconut-milk dessert of sweet potato, yam, sago and chewy coloured tapioca jelly in pandan-scented santan; \"bubur\" means porridge.",
        "fr": "Dessert nyonya au lait de coco: patate douce, igname, sagou et gelee de tapioca coloree, santan au pandan; \"bubur\" signifie bouillie."
      },
      "sources": [
        {
          "name": "Bubur cha cha - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bubur_cha_cha"
        },
        {
          "name": "Bubur Cha Cha (Nyonya Coconut Milk Dessert) - Nyonya Cooking",
          "url": "https://www.nyonyacooking.com/recipes/bubur-cha-cha-nyonya-coconut-milk-dessert~rJ70DvivM9-X"
        }
      ]
    },
    "durian pengat": {
      "local": "pengat durian",
      "note": {
        "en": "A \"pengat\" cooks fruit in coconut milk and sugar; the Nyonya version simmers durian pulp with gula melaka into a thick custardy dessert.",
        "fr": "Un \"pengat\" cuit un fruit dans le lait de coco et le sucre; la version nyonya mijote la chair du durian au gula melaka, texture onctueuse."
      },
      "sources": [
        {
          "name": "Travelling Foodies — Pengat Durian",
          "url": "https://travellingfoodies.wordpress.com/2012/06/08/pengat-durian/"
        },
        {
          "name": "SETHLUI — Tingkat PeraMakan (durian pengat)",
          "url": "https://sethlui.com/tingkat-peramakan-peranakan-cuisine-singapore/"
        }
      ]
    },
    "kueh ambon": {
      "local": "Bingka Ambon (Bika Ambon)",
      "note": {
        "en": "Yeast-leavened tapioca-and-coconut-milk cake with a chewy honeycomb crumb, usually pandan or kaffir-lime scented; from Medan, Sumatra.",
        "fr": "Gateau de tapioca et lait de coco leve a la levure, mie alveolee et moelleuse, parfume au pandan ou combava; originaire de Medan, Sumatra."
      },
      "sources": [
        {
          "name": "Bika ambon - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bika_ambon"
        },
        {
          "name": "SETHLUI - Best Nonya Kueh in Singapore",
          "url": "https://sethlui.com/best-nonya-kueh-singapore/"
        }
      ]
    },
    "kueh bahulu": {
      "local": "bahulu",
      "note": {
        "en": "Bite-size eggy sponge cake baked in brass moulds (flower/fish shapes); the name traces to the Kristang/Portuguese 'bolu' (cake).",
        "fr": "Petit biscuit-eponge a l'oeuf cuit dans des moules en laiton (fleurs/poissons) ; son nom vient du kristang/portugais 'bolu' (gateau)."
      },
      "sources": [
        {
          "name": "Roots.gov.sg (Singapore National Heritage Board) - Kueh",
          "url": "https://www.roots.gov.sg/ich-landing/ich/kueh"
        },
        {
          "name": "Wikipedia - Bahulu",
          "url": "https://en.wikipedia.org/wiki/Bahulu"
        }
      ]
    },
    "lapis sagu": {
      "local": "kuih lapis sagu",
      "note": {
        "en": "Steamed Malay-Peranakan layered kuih of sago/tapioca starch and coconut milk; soft bouncy QQ texture, colourful layers peeled one by one.",
        "fr": "Kuih malais-peranakan a la vapeur, couches de sagou/tapioca au lait de coco; texture tendre elastique, couches colorees pelees une a une."
      },
      "sources": [
        {
          "name": "Beautiful Voyager - Kuih Sago Lapis",
          "url": "https://www.beautifulvoyager.com/kuih-sago-lapis-steamed-layered-sago-cake/"
        },
        {
          "name": "Shiokman Recipes - Kueh Rainbow Lapis Sagu",
          "url": "https://shiokmanrecipes.com/2016/12/20/kueh-lapis-sagu/"
        }
      ]
    },
    "agar agar": {
      "local": "agar-agar",
      "note": {
        "en": "Red-algae seaweed jelly set firm at room temp; Peranakan agar-agar laut is a Chinese New Year treat, molded auspiciously, laced with brandy.",
        "fr": "Gelee d'algues rouges figee a temperature ambiante; l'agar-agar laut peranakan, regal du Nouvel An chinois, moule porte-bonheur, au brandy."
      },
      "sources": [
        {
          "name": "A Unique Peranakan Sweet For Chinese New Year - Agar Agar Laut",
          "url": "https://kenneats.wordpress.com/2020/01/23/a-unique-peranakan-dish-for-chinese-new-year-agar-agar-laut/"
        },
        {
          "name": "Agar - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Agar"
        }
      ]
    },
    "pulut hitam": {
      "local": "Pulut Hitam (bubur pulut hitam)",
      "note": {
        "en": "Nyonya black glutinous rice porridge dessert sweetened with gula melaka, scented with pandan and served with thick coconut milk.",
        "fr": "Dessert nyonya de riz gluant noir en bouillie, sucre au gula melaka, parfume au pandan et servi avec du lait de coco epais."
      },
      "sources": [
        {
          "name": "Nyonya Cooking — Pulut Hitam (Black Glutinous Rice Sweet Soup)",
          "url": "https://www.nyonyacooking.com/recipes/pulut-hitam-black-glutinous-rice-sweet-soup~BJif_wswz5-X"
        },
        {
          "name": "SETHLUI — Godmama Peranakan restaurant (Pulut Hitam)",
          "url": "https://sethlui.com/godmama-parkway-parade-singapore-may-2024/"
        }
      ]
    },
    "pulut tai tai": {
      "local": "Pulut Tai Tai (Pulut Tekan)",
      "note": {
        "en": "Nyonya kuih of glutinous rice pressed in coconut milk, tinted blue with butterfly pea flowers (bunga telang) and served with kaya jam.",
        "fr": "Kuih nyonya de riz gluant pressé au lait de coco, teinté en bleu par les fleurs de pois papillon (bunga telang) et servi avec du kaya."
      },
      "sources": [
        {
          "name": "Free Malaysia Today — Pulut Tai Tai: the kuih for everyone",
          "url": "https://www.freemalaysiatoday.com/category/leisure/food/2021/11/01/pulut-tai-tai-the-kuih-for-everyone-not-just-rich-mens-wives"
        },
        {
          "name": "Nyonya Cooking — Pulut Tai Tai",
          "url": "https://www.nyonyacooking.com/recipes/pulut-tai-tai~HywZuPiPzc-X"
        }
      ]
    }
  },
  "vietnamese": {
    "pho bo": {
      "local": "Phở bò",
      "note": {
        "en": "Vietnamese beef noodle soup of rice noodles in an aromatic spiced bone broth, originating in early 20th-century northern Vietnam.",
        "fr": "Soupe vietnamienne de nouilles de riz au bœuf dans un bouillon d'os épicé, née au début du XXe siècle dans le nord du Vietnam."
      },
      "sources": [
        {
          "name": "TasteAtlas — Phở bò",
          "url": "https://www.tasteatlas.com/pho-bo"
        },
        {
          "name": "Wikipedia — Pho",
          "url": "https://en.wikipedia.org/wiki/Pho"
        }
      ]
    },
    "pho ga": {
      "local": "Phở gà",
      "note": {
        "en": "The chicken version of Vietnamese pho: rice noodles and shredded chicken in a clear simmered broth, popularized in northern Vietnam.",
        "fr": "La version au poulet du pho vietnamien : nouilles de riz et poulet effiloché dans un bouillon clair mijoté, popularisée au nord du Vietnam."
      },
      "sources": [
        {
          "name": "Pho - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Pho"
        },
        {
          "name": "Pho Ga Explained - KimEcopak",
          "url": "https://www.kimecopak.ca/blogs/cuisine/what-is-pho-ga"
        }
      ]
    },
    "banh mi": {
      "local": "Bánh mì",
      "note": {
        "en": "Vietnamese sandwich on a crisp, airy baguette (a French colonial legacy) filled with pâté, meats, pickled veg and herbs.",
        "fr": "Sandwich vietnamien sur une baguette croustillante (héritage colonial français) garni de pâté, viandes, légumes marinés et herbes."
      },
      "sources": [
        {
          "name": "Bánh mì - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/B%C3%A1nh_m%C3%AC"
        },
        {
          "name": "Bánh mì - TasteAtlas",
          "url": "https://www.tasteatlas.com/banh-mi"
        }
      ]
    },
    "bun cha": {
      "local": "Bún chả",
      "note": {
        "en": "Grilled pork over rice vermicelli with herbs and a dipping sauce, a Hanoi specialty traditionally eaten at lunchtime.",
        "fr": "Porc grillé sur vermicelles de riz, avec herbes et sauce trempette, spécialité de Hanoï traditionnellement mangée au déjeuner."
      },
      "sources": [
        {
          "name": "Bun cha - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bun_cha"
        },
        {
          "name": "Bún Chả - TasteAtlas",
          "url": "https://www.tasteatlas.com/bun-cha"
        }
      ]
    },
    "bun bo hue": {
      "local": "Bún bò Huế",
      "note": {
        "en": "A spicy beef-and-pork rice-noodle soup from Huế, central Vietnam, defined by lemongrass and shrimp paste, from the Nguyễn-lord era.",
        "fr": "Soupe épicée de nouilles de riz au bœuf de Huế (Vietnam central), à la citronnelle et pâte de crevettes, de l'époque des seigneurs Nguyễn."
      },
      "sources": [
        {
          "name": "Wikipedia — Bún bò Huế",
          "url": "https://en.wikipedia.org/wiki/B%C3%BAn_b%C3%B2_Hu%E1%BA%BF"
        },
        {
          "name": "TasteAtlas — Bún bò Huế",
          "url": "https://www.tasteatlas.com/bun-bo-hue"
        }
      ]
    },
    "bun rieu": {
      "local": "bún riêu",
      "note": {
        "en": "A Vietnamese rice-vermicelli noodle soup in a tomato broth topped with paste from pounded freshwater paddy crabs (bún riêu cua).",
        "fr": "Une soupe vietnamienne de vermicelles de riz dans un bouillon de tomate garnie de pâte de crabes d'eau douce pilés (bún riêu cua)."
      },
      "sources": [
        {
          "name": "Bún riêu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/B%C3%BAn_ri%C3%AAu"
        },
        {
          "name": "Bún Riêu - TasteAtlas",
          "url": "https://www.tasteatlas.com/bun-rieu"
        }
      ]
    },
    "bun thit nuong": {
      "local": "Bún thịt nướng",
      "note": {
        "en": "A Southern Vietnamese bowl of cold rice vermicelli topped with marinated grilled pork, fresh herbs, peanuts and nuoc cham fish sauce.",
        "fr": "Un bol du sud du Vietnam de vermicelles de riz froids garnis de porc grille marine, d'herbes fraiches, de cacahuetes et de sauce nuoc cham."
      },
      "sources": [
        {
          "name": "Wikipedia - Bún thịt nướng",
          "url": "https://en.wikipedia.org/wiki/B%C3%BAn_th%E1%BB%8Bt_n%C6%B0%E1%BB%9Bng"
        },
        {
          "name": "TasteAtlas - Bún Thịt Nướng",
          "url": "https://www.tasteatlas.com/bun-thit-nuong"
        }
      ]
    },
    "goi cuon": {
      "local": "Gỏi cuốn",
      "note": {
        "en": "Vietnamese fresh rice-paper rolls of pork, prawn, rice vermicelli and herbs, served uncooked at room temperature, unlike the fried chả giò.",
        "fr": "Rouleaux vietnamiens frais en galette de riz, garnis de porc, crevette, vermicelles et herbes, servis non frits, à l'inverse du chả giò."
      },
      "sources": [
        {
          "name": "Wikipedia — Gỏi cuốn",
          "url": "https://en.wikipedia.org/wiki/G%E1%BB%8Fi_cu%E1%BB%91n"
        },
        {
          "name": "TasteAtlas — Gỏi cuốn (Vietnamese Summer Rolls)",
          "url": "https://www.tasteatlas.com/goi-cuon"
        }
      ]
    },
    "cha gio (nem ran)": {
      "local": "Chả giò (Nem rán)",
      "note": {
        "en": "Vietnamese deep-fried spring rolls of seasoned pork, mushrooms and vermicelli in rice paper; called chả giò in the south, nem rán in the…",
        "fr": "Rouleaux de printemps frits vietnamiens au porc, champignons et vermicelles en galette de riz ; chả giò au sud, nem rán au nord."
      },
      "sources": [
        {
          "name": "Chả giò - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ch%E1%BA%A3_gi%C3%B2"
        },
        {
          "name": "Vietnamese Fried Spring Rolls (Chả giò) - TasteAtlas",
          "url": "https://www.tasteatlas.com/cha-gio"
        }
      ]
    },
    "com tam": {
      "local": "Cơm tấm",
      "note": {
        "en": "Cơm tấm is a southern Vietnamese dish of broken rice grains, originally a cheap food Mekong Delta farmers made from fragmented milled rice.",
        "fr": "Le cơm tấm est un plat du sud du Vietnam à base de brisures de riz, jadis un mets bon marché des paysans du delta du Mékong."
      },
      "sources": [
        {
          "name": "Wikipedia — Cơm tấm",
          "url": "https://en.wikipedia.org/wiki/C%C6%A1m_t%E1%BA%A5m"
        },
        {
          "name": "Michelin Guide — What Is Cơm Tấm?",
          "url": "https://guide.michelin.com/vn/en/article/dining-out/what-is-com-tam-com-tam-ba-ghien"
        }
      ]
    },
    "banh xeo": {
      "local": "Bánh xèo",
      "note": {
        "en": "A crispy Vietnamese pancake of rice flour, water and turmeric, filled with pork, shrimp and bean sprouts; named for its sizzling sound.",
        "fr": "Une crêpe vietnamienne croustillante de farine de riz, d'eau et de curcuma, garnie de porc, de crevettes et de germes ; nommée d'après son…"
      },
      "sources": [
        {
          "name": "Wikipedia — Bánh xèo",
          "url": "https://en.wikipedia.org/wiki/B%C3%A1nh_x%C3%A8o"
        },
        {
          "name": "TasteAtlas — Bánh Xèo",
          "url": "https://www.tasteatlas.com/banh-xeo"
        }
      ]
    },
    "banh khot": {
      "local": "Bánh Khọt",
      "note": {
        "en": "Southern Vietnamese mini savory pancakes of turmeric-coconut rice batter, topped with shrimp and crisped in molds; a Vung Tau specialty.",
        "fr": "Petites crepes salees du sud du Vietnam, a base de riz au curcuma et coco, garnies de crevettes; specialite de Vung Tau."
      },
      "sources": [
        {
          "name": "TasteAtlas - Banh Khot",
          "url": "https://www.tasteatlas.com/banh-khot"
        },
        {
          "name": "Wikipedia - Banh",
          "url": "https://en.wikipedia.org/wiki/B%C3%A1nh"
        }
      ]
    },
    "cao lau": {
      "local": "Cao lầu",
      "note": {
        "en": "A Hội An noodle dish of thick chewy rice noodles, char siu pork and greens, whose noodles need local ash-lye and Ba Le well water.",
        "fr": "Plat de nouilles de Hội An aux nouilles de riz épaisses, porc char siu et herbes, dont les nouilles exigent lessive de cendres et eau du…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Cao Lầu",
          "url": "https://www.tasteatlas.com/cao-lau"
        },
        {
          "name": "Wikipedia - Cao lầu",
          "url": "https://en.wikipedia.org/wiki/Cao_l%E1%BA%A7u"
        }
      ]
    },
    "mi quang": {
      "local": "Mì Quảng",
      "note": {
        "en": "Turmeric rice-noodle dish from Quảng Nam, central Vietnam, with little broth, peanuts and sesame crackers; named national heritage in 2024.",
        "fr": "Plat de nouilles de riz au curcuma du Quảng Nam, centre du Vietnam, peu de bouillon, cacahuètes et galettes de sésame ; patrimoine 2024."
      },
      "sources": [
        {
          "name": "Wikipedia — Mì Quảng",
          "url": "https://en.wikipedia.org/wiki/M%C3%AC_Qu%E1%BA%A3ng"
        },
        {
          "name": "Michelin Guide — What Is Da Nang's Mi Quang",
          "url": "https://guide.michelin.com/vn/en/article/features/what-is-da-nang-mi-quang"
        }
      ]
    },
    "cha ca la vong": {
      "local": "Chả Cá Lã Vọng",
      "note": {
        "en": "Hanoi dish of cá lăng catfish marinated in turmeric, charcoal-grilled with dill and scallion, served with bún and mắm tôm; an eatery opened…",
        "fr": "Plat hanoïen de poisson-chat cá lăng au curcuma, grillé au charbon avec aneth et ciboule, servi avec bún et mắm tôm; un restaurant ouvert…"
      },
      "sources": [
        {
          "name": "Wikipedia — Chả cá Lã Vọng",
          "url": "https://en.wikipedia.org/wiki/Cha_Ca_La_Vong"
        },
        {
          "name": "TasteAtlas — Chả cá lã Vọng",
          "url": "https://www.tasteatlas.com/cha-ca-la-vong"
        }
      ]
    },
    "bo kho": {
      "local": "Bò kho",
      "note": {
        "en": "Southern Vietnamese beef-and-carrot stew with lemongrass and star anise; arose under French colonial rule, which introduced beef.",
        "fr": "Ragoût de bœuf et carottes du sud du Vietnam à la citronnelle et anis étoilé, né sous la colonisation française qui introduisit le bœuf."
      },
      "sources": [
        {
          "name": "Wikipedia — Bò kho",
          "url": "https://en.wikipedia.org/wiki/B%C3%B2_kho"
        },
        {
          "name": "TasteAtlas — Bò Kho",
          "url": "https://www.tasteatlas.com/bo-kho"
        }
      ]
    },
    "ca kho to": {
      "local": "Cá kho tộ",
      "note": {
        "en": "Southern Vietnamese dish of catfish or snakehead braised (kho) in a clay pot (tộ) with fish sauce and caramelized sugar.",
        "fr": "Plat du sud du Vietnam: poisson-chat ou tête-de-serpent braisé (kho) en pot d'argile (tộ) au nuoc-mâm et sucre caramélisé."
      },
      "sources": [
        {
          "name": "TasteAtlas",
          "url": "https://www.tasteatlas.com/ca-kho-to"
        },
        {
          "name": "Hungry Huy",
          "url": "https://www.hungryhuy.com/ca-kho-to-recipe-vietnamese-braised-fish/"
        }
      ]
    },
    "thit kho trung": {
      "local": "Thịt Kho Trứng",
      "note": {
        "en": "Vietnamese pork belly and hard-boiled eggs braised in fish sauce and coconut water, a staple eaten at Tet (Lunar New Year).",
        "fr": "Poitrine de porc et œufs durs vietnamiens braisés au nuoc-mam et à l'eau de coco, plat phare du Têt (Nouvel An lunaire)."
      },
      "sources": [
        {
          "name": "Caramelized pork and eggs - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Caramelized_pork_and_eggs"
        },
        {
          "name": "Thịt Kho Trứng - Vicky Pham",
          "url": "https://vickypham.com/blog/braised-pork-and-boiled-eggs-in-coconut-juice-thit-kho-tau/"
        }
      ]
    },
    "canh chua": {
      "local": "Canh chua",
      "note": {
        "en": "A Southern Vietnamese sour soup from the Mekong Delta, made with fish, pineapple and tomato, soured with tamarind.",
        "fr": "Une soupe aigre du sud du Vietnam, du delta du Mekong, au poisson, ananas et tomate, acidulee au tamarin."
      },
      "sources": [
        {
          "name": "Canh chua - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Canh_chua"
        },
        {
          "name": "Canh Chua - TasteAtlas",
          "url": "https://www.tasteatlas.com/canh-chua"
        }
      ]
    },
    "nem nuong": {
      "local": "Nem nướng",
      "note": {
        "en": "Vietnamese grilled seasoned ground-pork sausage, a specialty of Nha Trang (Khánh Hòa Province), served with rice paper, herbs and nước chấm.",
        "fr": "Saucisse vietnamienne de porc haché assaisonné grillée, spécialité de Nha Trang (province de Khánh Hòa), servie avec galettes de riz…"
      },
      "sources": [
        {
          "name": "Wikipedia — Nem nướng",
          "url": "https://en.wikipedia.org/wiki/Nem_n%C6%B0%E1%BB%9Bng"
        },
        {
          "name": "TasteAtlas — Nem Nướng",
          "url": "https://www.tasteatlas.com/nem-nuong"
        }
      ]
    },
    "xoi": {
      "local": "Xôi",
      "note": {
        "en": "Vietnamese steamed glutinous (sticky) rice dish, served sweet or savory, traditionally a popular breakfast and street-vendor food.",
        "fr": "Plat vietnamien de riz gluant cuit à la vapeur, sucré ou salé, traditionnellement prisé au petit-déjeuner et chez les vendeurs de rue."
      },
      "sources": [
        {
          "name": "Wikipedia - Xôi",
          "url": "https://en.wikipedia.org/wiki/X%C3%B4i"
        },
        {
          "name": "TasteAtlas - Xôi",
          "url": "https://www.tasteatlas.com/xoi"
        }
      ]
    },
    "che": {
      "local": "Chè",
      "note": {
        "en": "Vietnamese sweet soup or pudding made with a water or coconut-cream base and beans, jelly, sticky rice or fruit, served hot or cold.",
        "fr": "Soupe ou crème sucrée vietnamienne à base d'eau ou de lait de coco, avec haricots, gelée, riz gluant ou fruits, servie chaude ou froide."
      },
      "sources": [
        {
          "name": "Chè - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ch%C3%A8"
        },
        {
          "name": "Chè - TasteAtlas",
          "url": "https://www.tasteatlas.com/che"
        }
      ]
    },
    "vietnamese coffee (ca phe sua da)": {
      "local": "Cà phê sữa đá",
      "note": {
        "en": "Dark-roast robusta dripped through a metal phin filter onto sweetened condensed milk over ice, a French-colonial take on cafe au lait.",
        "fr": "Robusta torrefie fonce filtre au phin metallique sur lait concentre sucre et glacons, version coloniale francaise du cafe au lait."
      },
      "sources": [
        {
          "name": "Vietnamese iced coffee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Vietnamese_iced_coffee"
        },
        {
          "name": "A Guide to Vietnamese Coffee - Michelin Guide",
          "url": "https://guide.michelin.com/en/article/features/iconic-dishes-a-guide-to-vietnamese-coffee"
        }
      ]
    },
    "vietnamese egg coffee (ca phe trung)": {
      "local": "Cà Phê Trứng",
      "note": {
        "en": "Hanoi coffee topped with a whipped foam of egg yolk and condensed milk, created in 1946 at Cafe Giang as a milk substitute.",
        "fr": "Cafe de Hanoi nappe d'une mousse fouettee de jaune d'oeuf et lait concentre, cree en 1946 au Cafe Giang en remplacement du lait."
      },
      "sources": [
        {
          "name": "Egg coffee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Egg_coffee"
        },
        {
          "name": "Michelin Guide - How to Make Vietnam's Iconic Egg Coffee the MICHELIN Way",
          "url": "https://guide.michelin.com/vn/en/article/dining-in/how-to-make-vietnam-egg-coffee-the-michelin-way"
        }
      ]
    }
  },
  "thai": {
    "pad thai": {
      "local": "ผัดไทย",
      "note": {
        "en": "A Thai stir-fried rice noodle dish with egg, tofu, tamarind and peanuts, invented in the 1930s-40s under PM Plaek Phibunsongkhram.",
        "fr": "Plat thai de nouilles de riz sautees aux oeufs, tofu, tamarin et cacahuetes, invente vers 1930-40 sous le Premier ministre Plaek…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pad thai",
          "url": "https://en.wikipedia.org/wiki/Pad_thai"
        },
        {
          "name": "Smithsonian Magazine - The Surprising History of Pad Thai",
          "url": "https://www.smithsonianmag.com/travel/the-surprising-history-of-pad-thai-180984625/"
        }
      ]
    },
    "tom kha gai": {
      "local": "ต้มข่าไก่",
      "note": {
        "en": "Thai hot-and-sour chicken soup in coconut milk flavoured with galangal, lemongrass and lime leaves; its name literally means \"boiled…",
        "fr": "Soupe thaïlandaise de poulet aigre-piquante au lait de coco parfumée au galanga, citronnelle et feuilles de combava ; son nom signifie «…"
      },
      "sources": [
        {
          "name": "Wikipedia — Tom kha kai",
          "url": "https://en.wikipedia.org/wiki/Tom_kha_kai"
        },
        {
          "name": "TasteAtlas — Tom Kha Gai",
          "url": "https://www.tasteatlas.com/tom-kha-gai/recipe"
        }
      ]
    },
    "green curry (gaeng keow wan)": {
      "local": "แกงเขียวหวาน",
      "note": {
        "en": "Coconut-milk curry from central Thailand, first recorded c. 1926; its name's \"sweet\" refers to the green colour, not the taste.",
        "fr": "Curry au lait de coco du centre de la Thaïlande, attesté vers 1926 ; le « doux » du nom désigne la couleur verte, pas le goût."
      },
      "sources": [
        {
          "name": "Green curry — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Green_curry"
        },
        {
          "name": "Kaeng Khiao Wan: Thailand's Iconic Green Curry — Thailand Foundation",
          "url": "https://thailandfoundation.or.th/kaeng-khiao-wan-thailands-iconic-green-curry/"
        }
      ]
    },
    "larb gai": {
      "local": "ลาบไก่",
      "note": {
        "en": "A Lao-origin Isan minced-chicken salad tossed with lime, fish sauce, chili, herbs and toasted ground rice (khao khua).",
        "fr": "Salade de poulet hache d'origine lao (Isan), assaisonnee de citron vert, sauce poisson, piment, herbes et riz grille moulu (khao khua)."
      },
      "sources": [
        {
          "name": "Larb - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Larb"
        },
        {
          "name": "Thai Chicken Salad | Larb Gai | ลาบไก่ - Rachel Cooks Thai",
          "url": "https://rachelcooksthai.com/ground-chicken-salad/"
        }
      ]
    },
    "larb moo": {
      "local": "ลาบหมู",
      "note": {
        "en": "A spicy Thai/Lao minced-pork salad from Isan, dressed with lime, fish sauce, chilli, herbs and toasted rice powder.",
        "fr": "Salade epicee de porc hache thai/lao de l'Isan, assaisonnee de citron vert, sauce poisson, piment, herbes et riz grille."
      },
      "sources": [
        {
          "name": "Larb - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Larb"
        },
        {
          "name": "Eating Thai Food - Thai larb recipe (larb moo ลาบหมู)",
          "url": "https://www.eatingthaifood.com/thai-larb-recipe/"
        }
      ]
    },
    "nam tok": {
      "local": "น้ำตก",
      "note": {
        "en": "A spicy Isan/Lao grilled-meat salad (pork: หมูน้ำตก, beef: เนื้อย่างน้ำตก) dressed with toasted rice powder, chilli, lime, fish sauce and…",
        "fr": "Salade épicée de viande grillée d'Isan/du Laos (porc ou bœuf), assaisonnée de riz grillé moulu, piment, citron vert, sauce de poisson et…"
      },
      "sources": [
        {
          "name": "Nam tok (food) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nam_tok_(food)"
        },
        {
          "name": "Mu Nam Tok - TasteAtlas",
          "url": "https://www.tasteatlas.com/mu-nam-tok"
        }
      ]
    },
    "khao pad": {
      "local": "ข้าวผัด",
      "note": {
        "en": "A Thai fried rice (RTGS: khao phat) typical of central Thai cuisine, made with Thai jasmine rice, egg and meat (commonly chicken, shrimp or…",
        "fr": "Riz frit thaïlandais (khao phat) typique de la cuisine du centre de la Thaïlande, préparé avec du riz jasmin, des oeufs et de la viande…"
      },
      "sources": [
        {
          "name": "Thai fried rice - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Thai_fried_rice"
        }
      ]
    },
    "khao pad sapparod": {
      "local": "ข้าวผัดสับปะรด",
      "note": {
        "en": "Thai pineapple fried rice with shrimp, cashews and curry powder, often served inside a hollowed-out pineapple.",
        "fr": "Riz frit thaï à l'ananas avec crevettes, noix de cajou et curry, souvent servi dans un ananas évidé."
      },
      "sources": [
        {
          "name": "Thai fried rice - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Thai_fried_rice"
        },
        {
          "name": "Khao Pad Sapparod (Thai Pineapple Fried Rice) - Tara's Multicultural Table",
          "url": "https://tarasmulticulturaltable.com/khao-pad-sapparot-thai-pineapple-fried-rice/"
        }
      ]
    },
    "pad krapow moo": {
      "local": "ผัดกะเพราหมู",
      "note": {
        "en": "Thai stir-fry of minced pork with holy basil, garlic and chillies over rice; the dish arose under Rama VII as Chinese immigrants began…",
        "fr": "Sauté thaïlandais de porc haché au basilic sacré, ail et piments sur du riz; le plat est né sous Rama VII grâce aux immigrants chinois."
      },
      "sources": [
        {
          "name": "Phat kaphrao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Phat_kaphrao"
        },
        {
          "name": "Rachel Cooks Thai - Pad Krapow Moo",
          "url": "https://rachelcooksthai.com/pad-kaprow-moo/"
        }
      ]
    },
    "pad see ew": {
      "local": "ผัดซีอิ๊ว",
      "note": {
        "en": "Thai stir-fried wide rice noodles in soy sauce with Chinese broccoli and egg; brought by Teochew Chinese immigrants from Guangdong.",
        "fr": "Nouilles de riz larges sautées thaïes à la sauce soja, avec brocoli chinois et œuf ; apportées par les immigrés chinois teochew du…"
      },
      "sources": [
        {
          "name": "Pad see ew - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Pad_see_ew"
        }
      ]
    },
    "pad kee mao": {
      "local": "ผัดขี้เมา",
      "note": {
        "en": "Spicy Thai stir-fried wide rice noodles with holy basil and chili; its name \"phat khi mao\" means \"drunkard's stir-fry\", though it has no…",
        "fr": "Nouilles de riz larges thaïes sautées épicées au basilic sacré et piment; son nom « phat khi mao » signifie « sauté de l'ivrogne », bien…"
      },
      "sources": [
        {
          "name": "Wikipedia — Drunken noodles",
          "url": "https://en.wikipedia.org/wiki/Drunken_noodles"
        },
        {
          "name": "TasteAtlas — Pad Kee Mao",
          "url": "https://www.tasteatlas.com/pad-kee-mao"
        }
      ]
    },
    "boat noodles (kuay teow rua)": {
      "local": "ก๋วยเตี๋ยวเรือ",
      "note": {
        "en": "Strongly-flavoured Thai pork or beef noodle soup whose dark broth is thickened with blood, named for the canal boats vendors once sold it…",
        "fr": "Soupe thaïe de nouilles au porc ou au bœuf au goût intense, dont le bouillon foncé est lié au sang, nommée d'après les bateaux des canaux…"
      },
      "sources": [
        {
          "name": "Boat noodles - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Boat_noodles"
        },
        {
          "name": "Hot Thai Kitchen - Authentic Thai Boat Noodles",
          "url": "https://hot-thai-kitchen.com/boat-noodles/"
        }
      ]
    },
    "thai beef noodle": {
      "local": "ก๋วยเตี๋ยวเนื้อ",
      "note": {
        "en": "Thai rice-noodle soup served in a long-simmered, spiced beef broth with sliced beef and beef balls, a popular Bangkok street food.",
        "fr": "Soupe thaïe de nouilles de riz dans un bouillon de bœuf épicé longuement mijoté, avec tranches de bœuf et boulettes, street food de Bangkok."
      },
      "sources": [
        {
          "name": "TasteAtlas - Kuay Teow Neua",
          "url": "https://www.tasteatlas.com/kuay-teow-neua"
        },
        {
          "name": "Thai Food Encyclopedia - Kuai Tiao Nam Sai Neua",
          "url": "https://en.ahaan-thai.de/encyclopedia/k/kuai-tiao-nam-sai-neua/"
        }
      ]
    },
    "thai chicken rice (khao man gai)": {
      "local": "ข้าวมันไก่",
      "note": {
        "en": "Thai poached chicken over chicken-fat rice with dipping sauce, the local form of Hainanese chicken rice brought by Hainanese Chinese…",
        "fr": "Poulet poché thaïlandais sur riz au gras de poulet avec sauce, version locale du riz au poulet hainanais apporté par les immigrants chinois…"
      },
      "sources": [
        {
          "name": "Hainanese chicken rice - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hainanese_chicken_rice"
        },
        {
          "name": "Michelin Guide - Khao Man Kai: Thai Chicken Rice",
          "url": "https://guide.michelin.com/vn/en/article/features/iconic-dishes-khao-man-gai-thai-chicken-rice"
        }
      ]
    },
    "moo ping": {
      "local": "หมูปิ้ง",
      "note": {
        "en": "Thai charcoal-grilled marinated pork skewers eaten as street food with sticky rice; popularized from 1952 via redesigned vendor carts.",
        "fr": "Brochettes de porc mariné grillées au charbon, street food thaïe servie avec riz gluant; popularisées dès 1952 par des chariots repensés."
      },
      "sources": [
        {
          "name": "Mu ping - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mu_ping"
        },
        {
          "name": "Hot Thai Kitchen - BBQ Pork Skewers หมูปิ้ง",
          "url": "https://hot-thai-kitchen.com/bbq-pork-skewers/"
        }
      ]
    },
    "thai fishcake (tod mun pla)": {
      "local": "ทอดมันปลา",
      "note": {
        "en": "Thai deep-fried fish cakes of minced fish (traditionally clown featherback) pounded springy with red curry paste and kaffir lime, served…",
        "fr": "Galettes de poisson thaïes frites, à base de poisson haché (traditionnellement le poisson-couteau) battu jusqu'à être élastique, avec pâte…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Tod Man Pla",
          "url": "https://www.tasteatlas.com/tod-man-pla"
        },
        {
          "name": "Takeaway.com Foodwiki - Tod man pla",
          "url": "https://www.takeaway.com/foodwiki/thailand/tod-man-pla/"
        }
      ]
    },
    "mango sticky rice": {
      "local": "ข้าวเหนียวมะม่วง (khao niao mamuang)",
      "note": {
        "en": "Thai dessert of glutinous rice cooked with sweet coconut milk and topped with fresh ripe mango, usually eaten during the peak mango season…",
        "fr": "Dessert thaï de riz gluant cuit avec du lait de coco sucré et garni de mangue fraîche bien mûre, généralement dégusté pendant la pleine…"
      },
      "sources": [
        {
          "name": "Mango sticky rice - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mango_sticky_rice"
        },
        {
          "name": "Michelin Guide - How to Make World-Renowned Thai Mango Sticky Rice Like a Two-MICHELIN-Star Restaurant",
          "url": "https://guide.michelin.com/en/article/dining-in/how-to-make-mango-sticky-rice-like-michelin-star-restaurant-r-haan"
        }
      ]
    },
    "thai coconut ice cream": {
      "local": "ไอติมกะทิ (i-tim kati)",
      "note": {
        "en": "Thai dairy-free coconut-milk ice cream, a street dessert sold by vendors and served in a coconut shell or in a soft bun/bread roll with…",
        "fr": "Glace thaïlandaise au lait de coco sans produits laitiers, dessert de rue vendu par des marchands et servi dans une coque de noix de coco…"
      },
      "sources": [
        {
          "name": "Eating Thai Food — Food Porn: Coconut Ice Cream and Sticky Rice (ไอติมกะทิ)",
          "url": "https://www.eatingthaifood.com/thai-coconut-ice-cream-sticky-rice/"
        },
        {
          "name": "Hot Thai Kitchen — Young Coconut Ice Cream ไอติมกะทิ (Pailin Chongchitnant)",
          "url": "https://hot-thai-kitchen.com/coconut-ice-cream/"
        }
      ]
    },
    "thai milk tea (cha yen)": {
      "local": "ชาเย็น",
      "note": {
        "en": "Iced Thai drink ('cha yen' means 'cold tea') of strongly brewed black tea — Ceylon or a locally grown Assam landrace — sweetened with sugar…",
        "fr": "Boisson thaïe glacée (« cha yen » signifie « thé froid ») de thé noir infusé fort — Ceylan ou une variété locale d'Assam — sucrée au sucre…"
      },
      "sources": [
        {
          "name": "Thai tea - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Thai_tea"
        },
        {
          "name": "Iconic Dishes: Thai Milk Tea Explained - Michelin Guide",
          "url": "https://guide.michelin.com/qa/en/article/features/iconic-dishes-thai-milk-tea-explained"
        }
      ]
    },
    "roti gluay": {
      "local": "โรตีกล้วย",
      "note": {
        "en": "Thai street-food pancake of paper-thin fried dough filled with banana and condensed milk, adapted from Indian/Muslim flatbread.",
        "fr": "Crêpe de rue thaïlandaise en pâte frite très fine garnie de banane et de lait concentré, adaptée du pain plat indien/musulman."
      },
      "sources": [
        {
          "name": "Hot Thai Kitchen - Thai Banana Pancake (Banana Roti) โรตีกล้วยหอม",
          "url": "https://hot-thai-kitchen.com/banana-roti/"
        },
        {
          "name": "Authentic Food Quest - Thai Roti Recipe: Thai Banana Pancake",
          "url": "https://authenticfoodquest.com/thai-roti-recipe-thai-banana-pancake/"
        }
      ]
    },
    "khanom krok": {
      "local": "ขนมครก",
      "note": {
        "en": "A traditional Thai dessert of coconut milk, rice flour and sugar cooked in an indented griddle, dating to the Ayutthaya period.",
        "fr": "Dessert thaï traditionnel de lait de coco, farine de riz et sucre cuit sur une plaque alvéolée, datant de la période d'Ayutthaya."
      },
      "sources": [
        {
          "name": "Khanom krok - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Khanom_krok"
        }
      ]
    },
    "kanom buang": {
      "local": "ขนมเบื้อง",
      "note": {
        "en": "A crispy Thai taco-shaped crepe of rice and mung-bean flour with meringue and sweet or savoury toppings, dating to the Ayutthaya era.",
        "fr": "Crepe thailandaise croustillante en forme de taco, a base de farine de riz et de haricot mungo, garnie de meringue, datant de l'ere…"
      },
      "sources": [
        {
          "name": "Khanom bueang - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Khanom_bueang"
        },
        {
          "name": "Khanom Bueang - Thailand Foundation",
          "url": "https://thailandfoundation.or.th/khanom-bueang/"
        }
      ]
    }
  },
  "malaysian": {
    "nasi lemak": {
      "local": "nasi lemak",
      "note": {
        "en": "Malaysia's national dish of rice cooked in coconut milk and pandan, served with sambal, anchovies, peanuts, cucumber and egg; recorded by…",
        "fr": "Plat national malaisien de riz cuit au lait de coco et pandan, servi avec sambal, anchois, cacahuetes, concombre et oeuf; atteste des 1875."
      },
      "sources": [
        {
          "name": "Wikipedia - Nasi lemak",
          "url": "https://en.wikipedia.org/wiki/Nasi_lemak"
        },
        {
          "name": "TasteAtlas - Nasi Lemak",
          "url": "https://www.tasteatlas.com/nasi-lemak"
        }
      ]
    },
    "roti canai": {
      "local": "roti canai",
      "note": {
        "en": "Flaky unleavened Malaysian flatbread of South Indian Tamil origin, introduced in the 19th century and usually served with dhal curry.",
        "fr": "Pain plat malaisien feuilleté sans levain, d'origine tamoule sud-indienne, introduit au XIXe siecle et servi avec du curry de dhal."
      },
      "sources": [
        {
          "name": "Wikipedia - Roti canai",
          "url": "https://en.wikipedia.org/wiki/Roti_canai"
        },
        {
          "name": "TasteAtlas - Roti Canai",
          "url": "https://www.tasteatlas.com/roti-canai"
        }
      ]
    },
    "curry mee penang": {
      "local": "咖哩麵",
      "note": {
        "en": "Penang curry mee is a spicy coconut-curry noodle soup of Hokkien noodles and vermicelli, distinctively served with coagulated pig's blood.",
        "fr": "Le curry mee de Penang est une soupe de nouilles au curry-coco epicee, melant nouilles Hokkien et vermicelles, servie avec du sang de porc…"
      },
      "sources": [
        {
          "name": "Curry mee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Curry_mee"
        },
        {
          "name": "Behind the Bib: Hot Bowl - Penang-style Curry Mee (Michelin Guide)",
          "url": "https://guide.michelin.com/sg/en/article/dining-out/behind-the-bib-hot-bowl-white-curry-mee"
        }
      ]
    },
    "asam laksa penang": {
      "local": "Laksa Asam (Pulau Pinang)",
      "note": {
        "en": "Penang's sour tamarind (asam) fish-based rice-noodle soup, made with mackerel and topped with hae ko shrimp paste.",
        "fr": "Soupe de nouilles de riz de Penang, aigre au tamarin (asam), a base de maquereau et garnie de pate de crevettes hae ko."
      },
      "sources": [
        {
          "name": "Wikipedia - Laksa",
          "url": "https://en.wikipedia.org/wiki/Laksa"
        },
        {
          "name": "TasteAtlas - Assam Laksa",
          "url": "https://www.tasteatlas.com/assam-laksa"
        }
      ]
    },
    "sarawak laksa": {
      "local": "Sarawak laksa (砂拉越叻沙)",
      "note": {
        "en": "Kuching, Sarawak noodle soup of rice vermicelli in a prawn-and-sambal-belacan broth; named TasteAtlas's best dish in Asia in 2021.",
        "fr": "Soupe de nouilles de Kuching (Sarawak), vermicelles de riz dans un bouillon de crevettes et sambal belacan; meilleur plat d'Asie selon…"
      },
      "sources": [
        {
          "name": "Laksa - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Laksa"
        },
        {
          "name": "All Hail Sarawak Laksa! - Sarawak Tourism",
          "url": "https://www.sarawaktourism.com/web/stories/story-view/all-hail-sarawak-laksa-"
        }
      ]
    },
    "nasi kandar": {
      "local": "nasi kandar",
      "note": {
        "en": "A Penang dish of steamed rice with assorted curries, named for the shoulder pole (kandar) early Indian-Muslim vendors used to carry it.",
        "fr": "Plat de Penang composé de riz vapeur et de currys variés, nomme d'apres la palanche (kandar) des vendeurs indo-musulmans d'antan."
      },
      "sources": [
        {
          "name": "Nasi kandar - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nasi_kandar"
        },
        {
          "name": "Nasi Kandar - TasteAtlas",
          "url": "https://www.tasteatlas.com/nasi-kandar"
        }
      ]
    },
    "wantan mee dry malaysian": {
      "local": "雲吞麵 (云吞面)",
      "note": {
        "en": "Cantonese-origin egg noodles tossed dry in dark soy with char siu and wonton dumplings; a Malaysian hawker take serving the broth on the…",
        "fr": "Nouilles aux oeufs d'origine cantonaise sautees a sec au soja noir avec char siu et raviolis wonton; version malaisienne servant le…"
      },
      "sources": [
        {
          "name": "Wikipedia — Wonton noodles",
          "url": "https://en.wikipedia.org/wiki/Wonton_noodles"
        },
        {
          "name": "TasteAtlas — Wonton noodles (Wàhn tān mihn)",
          "url": "https://www.tasteatlas.com/wonton-noodles"
        }
      ]
    },
    "apom balik": {
      "local": "apam balik",
      "note": {
        "en": "A folded Malaysian pancake of coconut-milk batter filled with crushed peanuts, sugar and sweetcorn, rooted in Fujianese cuisine.",
        "fr": "Crepe malaisienne pliee, a base de lait de coco, garnie de cacahuetes pilees, de sucre et de mais, d'origine fujianaise."
      },
      "sources": [
        {
          "name": "Wikipedia - Apam balik",
          "url": "https://en.wikipedia.org/wiki/Apam_balik"
        },
        {
          "name": "TasteAtlas - Apam Balik",
          "url": "https://www.tasteatlas.com/apam-balik"
        }
      ]
    },
    "lor mee penang": {
      "local": "滷麵 (Penang Loh Mee)",
      "note": {
        "en": "Penang-style braised Hokkien noodle dish in a thick starchy gravy, lighter than the Singapore version, with origins in Zhangzhou, China.",
        "fr": "Plat de nouilles hokkien braisées de style Penang dans une sauce épaisse à l'amidon, plus légère qu'à Singapour, originaire de Zhangzhou…"
      },
      "sources": [
        {
          "name": "Lor mee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lor_mee"
        },
        {
          "name": "Penang lor mee: Thick and flavourful like no other - Malay Mail",
          "url": "https://www.malaymail.com/news/eat/drink/2015/09/13/penang-lor-mee-thick-and-flavourful-like-no-other/968749"
        }
      ]
    },
    "cucur udang": {
      "local": "cucur udang",
      "note": {
        "en": "A Malaysian and Singaporean deep-fried prawn fritter of battered prawns, onion and chives, a Malay street-vendor snack served with sweet…",
        "fr": "Beignet de crevettes frit malaisien et singapourien, fait de crevettes, oignon et ciboule en pate, vendu par les marchands malais avec une…"
      },
      "sources": [
        {
          "name": "Nyonya Cooking - Cucur Udang Mamak (Prawn Fritters)",
          "url": "https://www.nyonyacooking.com/recipes/cucur-udang-mamak-prawn-fritters~HJ_4XBuK7"
        },
        {
          "name": "Taste of Asian Food - Cucur udang recipe",
          "url": "https://tasteasianfood.com/cucur-udang/"
        }
      ]
    },
    "rendang": {
      "local": "rendang (Minangkabau: randang)",
      "note": {
        "en": "Slow-cooked dry meat curry stewed in coconut milk and spices, originating with the Minangkabau people of West Sumatra.",
        "fr": "Curry de viande sec mijoté lentement dans du lait de coco et des epices, originaire des Minangkabau de Sumatra occidental."
      },
      "sources": [
        {
          "name": "Wikipedia - Rendang",
          "url": "https://en.wikipedia.org/wiki/Rendang"
        },
        {
          "name": "TasteAtlas - Rendang",
          "url": "https://www.tasteatlas.com/rendang"
        }
      ]
    },
    "kuih lapis penang": {
      "local": "kuih lapis (九層糕)",
      "note": {
        "en": "A soft steamed Peranakan layer cake of rice and tapioca flour, sugar and coconut milk, traditionally built in nine coloured layers.",
        "fr": "Gateau peranakan moelleux cuit a la vapeur, fait de farine de riz et de tapioca, sucre et lait de coco, en neuf couches colorees."
      },
      "sources": [
        {
          "name": "Wikipedia - Kue lapis",
          "url": "https://en.wikipedia.org/wiki/Kue_lapis"
        },
        {
          "name": "Nyonya Cooking - Kueh Lapis / Kuih Lapis",
          "url": "https://www.nyonyacooking.com/recipes/kueh-lapis-kuih-lapis~QC8re2dhOy"
        }
      ]
    },
    "cendol penang": {
      "local": "Cendol Pulau Pinang (Penang chendul)",
      "note": {
        "en": "Penang shaved-ice dessert of green pandan rice-flour jelly, coconut milk and gula melaka; the famed Teochew chendul dates to 1936.",
        "fr": "Dessert penangais de glace pilée aux vermicelles de riz pandan verts, lait de coco et gula melaka; le célèbre chendul teochew date de 1936."
      },
      "sources": [
        {
          "name": "Wikipedia — Cendol",
          "url": "https://en.wikipedia.org/wiki/Cendol"
        },
        {
          "name": "TasteAtlas — Cendol, Penang Road Famous Teochew Chendul",
          "url": "https://www.tasteatlas.com/penang-road-famous-teochew-chendul/cendol"
        }
      ]
    },
    "apam": {
      "local": "أڤم باليق",
      "note": {
        "en": "In Malay, \"apam\" broadly means any fluffy batter-based kuih. The most documented form, apam balik (lit. \"turnover pancake\"; also terang…",
        "fr": "En malais, \"apam\" designe largement tout kuih moelleux a base de pate. Sa forme la plus connue, l'apam balik (litt. \"crepe retournee\"…"
      },
      "sources": [
        {
          "name": "Wikipedia - Apam balik",
          "url": "https://en.wikipedia.org/wiki/Apam_balik"
        },
        {
          "name": "Wikipedia - Kuih",
          "url": "https://en.wikipedia.org/wiki/Kuih"
        }
      ]
    },
    "nasi kerabu": {
      "local": "nasi kerabu",
      "note": {
        "en": "Malay rice dish from Kelantan and Terengganu whose rice is tinted blue with butterfly pea flowers, served with herbs, salad and fried fish…",
        "fr": "Plat de riz malais de Kelantan et Terengganu dont le riz est teinte en bleu par la fleur de pois bleu, servi avec herbes, salade et poisson…"
      },
      "sources": [
        {
          "name": "Wikipedia — Nasi kerabu",
          "url": "https://en.wikipedia.org/wiki/Nasi_kerabu"
        },
        {
          "name": "TasteAtlas — Nasi Kerabu",
          "url": "https://www.tasteatlas.com/nasi-kerabu"
        }
      ]
    },
    "roti john malaysian": {
      "local": "Roti John",
      "note": {
        "en": "A Southeast Asian street-food omelette sandwich of a baguette griddled with egg, onions and minced meat, originating in 1960s Singapore.",
        "fr": "Sandwich-omelette de rue d'Asie du Sud-Est: une baguette grillee a l'oeuf, oignons et viande hachee, ne dans le Singapour des annees 1960."
      },
      "sources": [
        {
          "name": "Roti john - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Roti_john"
        },
        {
          "name": "Roti John - Singapore (NLB)",
          "url": "https://www.nlb.gov.sg/main/article-detail?cmsuuid=f0b6aec4-7fe5-4ec5-a4da-1bcfdad3ab27"
        }
      ]
    },
    "asam pedas": {
      "local": "asam pedas",
      "note": {
        "en": "Sour-and-spicy Malay/Minangkabau fish stew in a tamarind-and-chilli broth, associated with the trading port of Malacca.",
        "fr": "Ragout de poisson malais/minangkabau aigre-piquant dans un bouillon de tamarin et de piment, lie au port de Malacca."
      },
      "sources": [
        {
          "name": "Wikipedia - Asam pedas",
          "url": "https://en.wikipedia.org/wiki/Asam_pedas"
        },
        {
          "name": "TasteAtlas - Asam Pedas",
          "url": "https://www.tasteatlas.com/asam-pedas"
        }
      ]
    },
    "ayam masak merah": {
      "local": "ayam masak merah",
      "note": {
        "en": "A Malay dish of fried chicken braised in a spicy dried-chilli, onion and tomato sambal; its name means \"red-cooked chicken.\"",
        "fr": "Plat malais de poulet frit braisé dans un sambal épicé de piments séchés, oignon et tomate ; son nom signifie « poulet cuit rouge »."
      },
      "sources": [
        {
          "name": "Wikipedia - Ayam masak merah",
          "url": "https://en.wikipedia.org/wiki/Ayam_masak_merah"
        },
        {
          "name": "TasteAtlas - Ayam Masak Merah",
          "url": "https://www.tasteatlas.com/ayam-masak-merah"
        }
      ]
    },
    "patin tempoyak": {
      "local": "ikan patin masak tempoyak",
      "note": {
        "en": "Malay dish of freshwater silver catfish (patin) simmered in tangy fermented-durian (tempoyak) gravy, from Temerloh, Pahang.",
        "fr": "Plat malais de silure d'eau douce (patin) mijoté dans une sauce acidulée au durian fermenté (tempoyak), de Temerloh, Pahang."
      },
      "sources": [
        {
          "name": "Tempoyak - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tempoyak"
        },
        {
          "name": "Gulai Ikan Patin Tempoyak - JKKN (Malaysian Dept. of National Culture & Arts)",
          "url": "https://pemetaanbudaya.jkkn.gov.my/en/senibudaya/detail/924"
        }
      ]
    },
    "curry laksa kl": {
      "local": "Laksa Kari (Curry Mee / Laksa Lemak)",
      "note": {
        "en": "A Kuala Lumpur coconut-curry noodle soup of Peranakan-Chinese origin, served with tofu puffs, cockles, long beans and mint.",
        "fr": "Une soupe de nouilles au curry et lait de coco de Kuala Lumpur, d'origine sino-peranakan, servie avec tofu, coques, haricots longs et…"
      },
      "sources": [
        {
          "name": "Curry mee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Curry_mee"
        },
        {
          "name": "Laksa - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Laksa"
        }
      ]
    },
    "penang char kway teow": {
      "local": "炒粿條",
      "note": {
        "en": "Stir-fried flat rice noodles with prawns, cockles, Chinese sausage and bean sprouts; a Teochew dockworkers' dish from Penang.",
        "fr": "Nouilles de riz plates sautees aux crevettes, coques, saucisse chinoise et germes de soja; plat teochew des dockers de Penang."
      },
      "sources": [
        {
          "name": "Char kway teow - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Char_kway_teow"
        },
        {
          "name": "Char Kway Teow - TasteAtlas",
          "url": "https://www.tasteatlas.com/char-kway-teow-penang"
        }
      ]
    },
    "hokkien mee kl": {
      "local": "福建面 (Hokkien mee, KL-style; Cantonese: 大碌麵 tai lok mee)",
      "note": {
        "en": "Kuala Lumpur dish of thick yellow noodles braised in dark soy sauce with pork, prawns and crispy lard, created in 1920s KL by Hokkien…",
        "fr": "Plat de Kuala Lumpur fait de nouilles jaunes epaisses braisees a la sauce soja noire avec porc, crevettes et lard croustillant, cree dans…"
      },
      "sources": [
        {
          "name": "Hokkien mee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hokkien_mee"
        },
        {
          "name": "Hokkien Mee Malaysia - TasteAtlas",
          "url": "https://www.tasteatlas.com/hokkien-mee-malaysia"
        }
      ]
    },
    "hokkien mee penang": {
      "local": "檳城福建麵 (hae mee)",
      "note": {
        "en": "Penang's spicy prawn-and-pork noodle soup with a rich prawn-head and pork-bone stock, descended from Fujianese (Hokkien) immigrant cooking…",
        "fr": "Soupe de nouilles épicée aux crevettes et au porc de Penang, à base d'un bouillon riche de têtes de crevettes et d'os de porc, issue de la…"
      },
      "sources": [
        {
          "name": "Wikipedia - Hokkien mee",
          "url": "https://en.wikipedia.org/wiki/Hokkien_mee"
        },
        {
          "name": "Penang Travel Tips - Penang Hokkien Mee",
          "url": "https://www.penang-traveltips.com/hokkien-mee.htm"
        }
      ]
    },
    "mee mamak goreng": {
      "local": "mee goreng mamak",
      "note": {
        "en": "Malaysian stir-fried yellow egg noodles in a sweet, spicy sauce (typically kecap manis, chilli paste and tomato), introduced by the…",
        "fr": "Nouilles aux oeufs jaunes sautees, sauce sucree et epicee (kecap manis, pate de piment et tomate), introduites par la communaute…"
      },
      "sources": [
        {
          "name": "Wikipedia - Mee goreng",
          "url": "https://en.wikipedia.org/wiki/Mee_goreng"
        },
        {
          "name": "TasteAtlas - Mee Goreng Mamak",
          "url": "https://www.tasteatlas.com/mee-goreng-mamak"
        }
      ]
    },
    "teh tarik": {
      "local": "teh tarik",
      "note": {
        "en": "A Malaysian hot black tea with condensed milk, repeatedly poured (\"pulled\") between two vessels for froth; created by Indian-Muslim vendors.",
        "fr": "Thé noir chaud malaisien au lait concentré, versé en va-et-vient (\"tiré\") entre deux récipients pour la mousse; créé par des marchands…"
      },
      "sources": [
        {
          "name": "Wikipedia – Teh tarik",
          "url": "https://en.wikipedia.org/wiki/Teh_tarik"
        },
        {
          "name": "TasteAtlas – Teh Tarik",
          "url": "https://www.tasteatlas.com/teh-tarik"
        }
      ]
    },
    "dim sum kl style": {
      "local": "點心 (dím sām)",
      "note": {
        "en": "Cantonese bite-sized steamed or fried small dishes served with tea, brought to Kuala Lumpur by 20th-century Cantonese migrants.",
        "fr": "Petites bouchees cantonaises cuites a la vapeur ou frites servies avec du the, apportees a Kuala Lumpur par les migrants cantonais du XXe…"
      },
      "sources": [
        {
          "name": "Dim sum - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Dim_sum"
        },
        {
          "name": "Dim sum in Malaysia - TNG eWallet",
          "url": "https://www.touchngo.com.my/blog/dim-sum-malaysia/"
        }
      ]
    },
    "bak kut teh klang": {
      "local": "肉骨茶",
      "note": {
        "en": "Pork ribs simmered in a herbal, soy-darkened broth (Hokkien \"meat bone tea\"), popularised in Klang, Malaysia in the 1930s.",
        "fr": "Côtes de porc mijotées dans un bouillon aux herbes foncé au soja (hokkien « thé d'os de viande »), popularisé à Klang dans les années 1930."
      },
      "sources": [
        {
          "name": "Wikipedia - Bak kut teh",
          "url": "https://en.wikipedia.org/wiki/Bak_kut_teh"
        },
        {
          "name": "TasteAtlas - Bak Kut Teh (Klang, Malaysia)",
          "url": "https://www.tasteatlas.com/bak-kut-teh"
        }
      ]
    },
    "lobak": {
      "local": "五香肉卷 (Loh Bak / Lor Bak)",
      "note": {
        "en": "Penang Hokkien deep-fried five-spice pork roll wrapped in bean curd skin, originating with Fujian migrants to Southeast Asia.",
        "fr": "Rouleau de porc aux cinq épices frit, enveloppé de peau de tofu, de Penang, issu des migrants hokkien du Fujian."
      },
      "sources": [
        {
          "name": "Loh Bak and Ngo Hiang: Tracing the Paths of Migrants from Fujian to Southeast Asia (CCS.City)",
          "url": "https://ccs.city/en/chinese-cultural-club/chinese-culinary/loh-bak-and-ngo-hiang"
        },
        {
          "name": "Lobak Dish | Malaysian (World Food Guide)",
          "url": "https://worldfood.guide/dish/lobak/"
        }
      ]
    },
    "kuih kapit malaysian": {
      "local": "Kuih kapit",
      "note": {
        "en": "A thin, crisp Malaysian wafer of coconut milk, rice flour and egg clamped between hot iron moulds, nicknamed \"love letters.\"",
        "fr": "Une fine gaufrette malaisienne croustillante de lait de coco, farine de riz et oeuf cuite entre des moules en fer brulants, surnommee…"
      },
      "sources": [
        {
          "name": "Michelin Guide - Iconic Dishes: Love Letters",
          "url": "https://guide.michelin.com/my/en/article/features/iconic-dishes-love-letters-and-other-sweet-snacks-for-your-sweetheart"
        },
        {
          "name": "Wikipedia - Kue semprong",
          "url": "https://en.wikipedia.org/wiki/Kue_semprong"
        }
      ]
    },
    "ais kacang malaysian": {
      "local": "ais kacang (ABC – air batu campur)",
      "note": {
        "en": "Malaysian shaved-ice dessert (\"bean ice\"), aka ABC, layering red beans, jellies and syrups; dates to the early 20th century as ice became…",
        "fr": "Dessert malaisien de glace pilée (\"glace aux haricots\"), dit ABC, garni de haricots rouges, gelées et sirops; apparu au début du XXe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia – Ais kacang",
          "url": "https://en.wikipedia.org/wiki/Ais_kacang"
        }
      ]
    }
  },
  "indonesian": {
    "nasi goreng": {
      "local": "nasi goreng",
      "note": {
        "en": "Indonesian/Malay fried rice stir-fried with sweet soy sauce (kecap manis), shallots, garlic and shrimp paste, often using leftover rice.",
        "fr": "Riz frit indonesien/malais saute au soja sucre (kecap manis), echalotes, ail et pate de crevettes, souvent a partir de riz de la veille."
      },
      "sources": [
        {
          "name": "Nasi goreng - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nasi_goreng"
        },
        {
          "name": "Nasi Goreng Varieties - TasteAtlas",
          "url": "https://www.tasteatlas.com/best-rated-nasi-goreng-varieties-in-the-world"
        }
      ]
    },
    "rendang": {
      "local": "rendang",
      "note": {
        "en": "A Minangkabau dish from West Sumatra of meat slow-cooked in coconut milk and spices until dry, originally made to preserve meat.",
        "fr": "Plat minangkabau de Sumatra occidental, viande mijotee dans du lait de coco et des epices jusqu'a evaporation, conçu pour la conserver."
      },
      "sources": [
        {
          "name": "Wikipedia - Rendang",
          "url": "https://en.wikipedia.org/wiki/Rendang"
        },
        {
          "name": "TasteAtlas - Rendang",
          "url": "https://www.tasteatlas.com/rendang"
        }
      ]
    },
    "bakso": {
      "local": "bakso (Hokkien-derived: 肉酥, bak-so)",
      "note": {
        "en": "Indonesian beef-paste meatballs served in broth with noodles; the name derives from Hokkien bak-so (肉酥), reflecting Chinese-Indonesian…",
        "fr": "Boulettes indonésiennes de pâte de bœuf servies en bouillon avec nouilles; le nom vient du hokkien bak-so (肉酥), d'origine sino-indonésienne."
      },
      "sources": [
        {
          "name": "Bakso - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bakso"
        },
        {
          "name": "Bakso - TasteAtlas",
          "url": "https://www.tasteatlas.com/bakso"
        }
      ]
    },
    "soto betawi": {
      "local": "Soto Betawi",
      "note": {
        "en": "Jakarta beef-and-offal soup simmered in a rich, creamy broth of coconut milk (often combined with cow's milk), seasoned with spices such as…",
        "fr": "Soupe de boeuf et d'abats de Jakarta mijotee dans un bouillon riche et cremeux au lait de coco (souvent melange a du lait de vache)…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Soto Betawi",
          "url": "https://www.tasteatlas.com/soto-betawi"
        },
        {
          "name": "Wikipedia (Indonesian) — Soto Betawi",
          "url": "https://id.wikipedia.org/wiki/Soto_Betawi"
        }
      ]
    },
    "soto madura": {
      "local": "Soto Madura",
      "note": {
        "en": "A Madurese variant of soto: chicken, beef or offal in a clear yellow turmeric broth, from the island of Madura, East Java.",
        "fr": "Une variante madouraise du soto : poulet, bœuf ou abats dans un bouillon clair jaune au curcuma, de l'île de Madura."
      },
      "sources": [
        {
          "name": "Wikipedia — Soto (food)",
          "url": "https://en.wikipedia.org/wiki/Soto_(food)"
        },
        {
          "name": "Wikipedia — Madurese cuisine",
          "url": "https://en.wikipedia.org/wiki/Madurese_cuisine"
        }
      ]
    },
    "soto kudus": {
      "local": "Soto Kudus",
      "note": {
        "en": "A clear, aromatic Indonesian soup from Kudus, Central Java, made with chicken or water buffalo, the latter used out of respect for local…",
        "fr": "Une soupe indonesienne claire et aromatique de Kudus (Java central), au poulet ou au buffle, ce dernier par respect pour les hindous locaux."
      },
      "sources": [
        {
          "name": "Wikipedia - Soto (food)",
          "url": "https://en.wikipedia.org/wiki/Soto_(food)"
        },
        {
          "name": "The Jakarta Post - The diverse flavors of 'soto' across Indonesia",
          "url": "https://www.thejakartapost.com/paper/2022/08/21/twenties-the-diverse-flavors-of-soto-across-indonesia.html"
        }
      ]
    },
    "rawon": {
      "local": "rawon",
      "note": {
        "en": "East Javanese beef soup, blackened and given a nutty flavor by ground keluak nuts; named world's best soup by TasteAtlas in 2024.",
        "fr": "Soupe de boeuf de Java oriental, noircie et parfumee par les noix de keluak; elue meilleure soupe du monde par TasteAtlas en 2024."
      },
      "sources": [
        {
          "name": "Wikipedia - Rawon",
          "url": "https://en.wikipedia.org/wiki/Rawon"
        },
        {
          "name": "TasteAtlas - Rawon",
          "url": "https://www.tasteatlas.com/rawon"
        }
      ]
    },
    "ayam betutu": {
      "local": "ayam betutu",
      "note": {
        "en": "Balinese whole chicken rubbed and stuffed with base genep (bumbu betutu) spice paste, wrapped in banana leaves and slow-cooked over or…",
        "fr": "Poulet entier balinais frotte et farci de pate d'epices base genep (bumbu betutu), enveloppe de feuilles de bananier et cuit lentement sur…"
      },
      "sources": [
        {
          "name": "Betutu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Betutu"
        },
        {
          "name": "Ayam Betutu - TasteAtlas",
          "url": "https://www.tasteatlas.com/ayam-betutu"
        }
      ]
    },
    "babi guling": {
      "local": "babi guling",
      "note": {
        "en": "Balinese spit-roasted suckling pig whose cavity is stuffed with a spice paste (turmeric, garlic, ginger and other spices), traditionally…",
        "fr": "Cochon de lait balinais rôti à la broche dont la cavité est farcie d'une pâte d'épices (curcuma, ail, gingembre et autres épices), préparé…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Babi Guling",
          "url": "https://www.tasteatlas.com/babi-guling"
        },
        {
          "name": "Wikipedia - Babi panggang",
          "url": "https://en.wikipedia.org/wiki/Babi_panggang"
        }
      ]
    },
    "pepes ikan": {
      "local": "pepes ikan",
      "note": {
        "en": "Indonesian dish of spiced fish wrapped in a banana leaf then steamed or grilled; Sundanese in origin, the name deriving from the Sundanese…",
        "fr": "Plat indonesien de poisson epice enveloppe dans une feuille de bananier puis cuit a la vapeur ou grille; d'origine soundanaise, son nom…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pepes",
          "url": "https://en.wikipedia.org/wiki/Pepes"
        },
        {
          "name": "TasteAtlas - Pepes Ikan",
          "url": "https://www.tasteatlas.com/ikan-pepes"
        }
      ]
    },
    "nasi padang": {
      "local": "nasi padang",
      "note": {
        "en": "Minangkabau dish of steamed rice with assorted pre-cooked sides from West Sumatra, named after the city of Padang.",
        "fr": "Plat minangkabau de riz vapeur servi avec des accompagnements précuisinés du Sumatra occidental, nommé d'après la ville de Padang."
      },
      "sources": [
        {
          "name": "Nasi padang - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nasi_padang"
        },
        {
          "name": "Iconic Dishes: Your Ultimate Guide to Nasi Padang - Michelin Guide",
          "url": "https://guide.michelin.com/sg/en/article/features/ultimate-guide-to-nasi-padang"
        }
      ]
    },
    "gulai kambing": {
      "local": "Gulai kambing",
      "note": {
        "en": "Indonesian goat or mutton curry simmered in coconut milk and turmeric-based spices, rooted in Minangkabau cuisine of West Sumatra.",
        "fr": "Curry indonesien de chevre ou mouton mijote au lait de coco et epices au curcuma, issu de la cuisine minangkabau de Sumatra-Ouest."
      },
      "sources": [
        {
          "name": "Gulai - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Gulai"
        },
        {
          "name": "Gulai Kambing - TasteAtlas",
          "url": "https://www.tasteatlas.com/gulai-kambing"
        }
      ]
    },
    "gulai ikan": {
      "local": "gulai ikan",
      "note": {
        "en": "Indonesian fish stew simmered in a coconut-milk sauce coloured and spiced with turmeric; gulai is strongly associated with the Minangkabau…",
        "fr": "Ragout de poisson indonesien mijote dans une sauce au lait de coco coloree et parfumee au curcuma ; le gulai est fortement associe a la…"
      },
      "sources": [
        {
          "name": "Gulai - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Gulai"
        },
        {
          "name": "Gulai Masin Kepala Ikan (Padang-Style Red Snapper Curry) - Saveur",
          "url": "https://www.saveur.com/article/recipes/gulai-masin-kepala-ikan-padang-style-red-snapper-curry/"
        }
      ]
    },
    "ikan bakar indonesian": {
      "local": "ikan bakar",
      "note": {
        "en": "Indonesian and Malay charcoal-grilled fish, typically seasoned with bumbu, kecap manis and sambal, often wrapped in banana leaf.",
        "fr": "Poisson grillé au charbon indonésien et malais, assaisonné de bumbu, kecap manis et sambal, souvent enveloppé dans une feuille de bananier."
      },
      "sources": [
        {
          "name": "Wikipedia — Ikan bakar",
          "url": "https://en.wikipedia.org/wiki/Ikan_bakar"
        },
        {
          "name": "TasteAtlas — Ikan Bakar",
          "url": "https://www.tasteatlas.com/ikan-bakar"
        }
      ]
    },
    "ayam penyet": {
      "local": "ayam penyet",
      "note": {
        "en": "East Javanese fried chicken smashed with a pestle to tenderise it, served with spicy sambal, tofu, tempeh and raw vegetables.",
        "fr": "Poulet frit de Java oriental ecrase au pilon pour l'attendrir, servi avec sambal piquant, tofu, tempeh et legumes crus."
      },
      "sources": [
        {
          "name": "Ayam penyet - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ayam_penyet"
        },
        {
          "name": "Ayam Penyet - TasteAtlas",
          "url": "https://www.tasteatlas.com/ayam-penyet"
        }
      ]
    },
    "ayam goreng kalasan": {
      "local": "ayam goreng kalasan",
      "note": {
        "en": "Indonesian fried chicken topped with crispy batter bits (kremes), originating from the Kalasan area of Sleman, Yogyakarta.",
        "fr": "Poulet frit indonesien garni d'eclats de pate croustillants (kremes), originaire de la region de Kalasan a Sleman, Yogyakarta."
      },
      "sources": [
        {
          "name": "Wikipedia - Ayam goreng kalasan",
          "url": "https://en.wikipedia.org/wiki/Ayam_goreng_kalasan"
        },
        {
          "name": "TasteAtlas - Ayam Goreng Kalasan",
          "url": "https://www.tasteatlas.com/ayam-goreng-kalasan"
        }
      ]
    },
    "es teler": {
      "local": "es teler",
      "note": {
        "en": "Indonesian iced dessert of avocado, jackfruit and young coconut with shaved ice and condensed milk; won a 1982 national-drink contest.",
        "fr": "Dessert glace indonesien d'avocat, jacque et jeune coco, glace pilee et lait concentre; laureat d'un concours national en 1982."
      },
      "sources": [
        {
          "name": "Es teler - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Es_teler"
        },
        {
          "name": "Es Teler - TasteAtlas",
          "url": "https://www.tasteatlas.com/es-teler"
        }
      ]
    },
    "pisang goreng": {
      "local": "pisang goreng",
      "note": {
        "en": "An Indonesian/Malay snack of deep-fried bananas, often battered, traditionally eaten with tea or coffee.",
        "fr": "Une collation indonesienne et malaise de bananes frites, souvent enrobees de pate, mangees avec the ou cafe."
      },
      "sources": [
        {
          "name": "Wikipedia - Banana fritter",
          "url": "https://en.wikipedia.org/wiki/Banana_fritter"
        },
        {
          "name": "TasteAtlas - Pisang goreng",
          "url": "https://www.tasteatlas.com/pisang-goreng"
        }
      ]
    },
    "lontong sayur": {
      "local": "lontong sayur",
      "note": {
        "en": "Indonesian breakfast dish of compressed rice cakes (lontong) in a coconut-milk vegetable soup, popular in Betawi and Minangkabau cuisine.",
        "fr": "Plat indonesien du petit-dejeuner, galettes de riz compresse (lontong) dans une soupe de legumes au lait de coco, des cuisines betawi et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Lontong sayur",
          "url": "https://en.wikipedia.org/wiki/Lontong_sayur"
        },
        {
          "name": "Wikipedia - Lontong",
          "url": "https://en.wikipedia.org/wiki/Lontong"
        }
      ]
    },
    "martabak telur": {
      "local": "martabak telur",
      "note": {
        "en": "An Indonesian savoury fried stuffed pancake filled with egg, seasoned ground meat and scallions, introduced by Arab and Indian Muslim…",
        "fr": "Une crepe indonesienne salee, frite et farcie d'oeuf, de viande hachee epicee et de ciboule, introduite par des marchands musulmans arabes…"
      },
      "sources": [
        {
          "name": "Wikipedia - Murtabak",
          "url": "https://en.wikipedia.org/wiki/Murtabak"
        },
        {
          "name": "TasteAtlas - Martabak",
          "url": "https://www.tasteatlas.com/martabak"
        }
      ]
    },
    "martabak manis": {
      "local": "martabak manis",
      "note": {
        "en": "A thick sweet Indonesian pancake folded over fillings, originating in the Bangka Belitung Islands among ethnic Chinese as \"Hok Lo Pan\".",
        "fr": "Une epaisse crepe sucree indonesienne pliee sur sa garniture, nee aux iles Bangka Belitung chez les Sino-Indonesiens sous le nom \"Hok Lo…"
      },
      "sources": [
        {
          "name": "Martabak manis - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Martabak_manis"
        },
        {
          "name": "Kue terang bulan - Wikipedia bahasa Indonesia",
          "url": "https://id.wikipedia.org/wiki/Kue_terang_bulan"
        }
      ]
    },
    "siomay": {
      "local": "siomay",
      "note": {
        "en": "Indonesian steamed fish dumpling in peanut sauce, adapted by Chinese immigrants from Cantonese shumai using mackerel; Bandung style is most…",
        "fr": "Bouchee indonesienne de poisson vapeur en sauce cacahuete, adaptee du shumai cantonais au maquereau; la version de Bandung est la plus…"
      },
      "sources": [
        {
          "name": "Wikipedia - Siomay",
          "url": "https://en.wikipedia.org/wiki/Siomay"
        },
        {
          "name": "TasteAtlas - Siomay",
          "url": "https://www.tasteatlas.com/siomay"
        }
      ]
    },
    "batagor": {
      "local": "batagor (baso tahu goréng)",
      "note": {
        "en": "Sundanese dish of fried fish dumplings in peanut sauce, created in 1968 Bandung; name shortens \"baso tahu goréng\".",
        "fr": "Plat soundanais de raviolis de poisson frits sauce cacahuète, créé à Bandung en 1968 ; nom abrégé de \"baso tahu goréng\"."
      },
      "sources": [
        {
          "name": "Batagor - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Batagor"
        },
        {
          "name": "Batagor facts for kids - Kiddle",
          "url": "https://kids.kiddle.co/Batagor"
        }
      ]
    },
    "rujak": {
      "local": "rujak (rujak buah)",
      "note": {
        "en": "Indonesian Javanese-origin spicy fruit-and-vegetable salad in a palm-sugar, tamarind, chili and shrimp-paste sauce; named in a 901 CE…",
        "fr": "Salade indonesienne d'origine javanaise de fruits et legumes pimentee, sauce au sucre de palme, tamarin, piment et pate de crevettes; citee…"
      },
      "sources": [
        {
          "name": "Wikipedia - Rujak (Javanese fruit salad)",
          "url": "https://en.wikipedia.org/wiki/Rujak_(Javanese_fruit_salad)"
        }
      ]
    },
    "asinan": {
      "local": "asinan",
      "note": {
        "en": "Indonesian salad of brined or vinegared vegetables or fruit; name derives from \"asin\" (salty); main types are asinan Betawi and asinan…",
        "fr": "Salade indonesienne de legumes ou fruits saumures ou vinaigres; le nom vient de \"asin\" (sale); types principaux: asinan Betawi et asinan…"
      },
      "sources": [
        {
          "name": "Asinan - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Asinan"
        },
        {
          "name": "Asinan - TasteAtlas",
          "url": "https://www.tasteatlas.com/asinan"
        }
      ]
    },
    "tempeh goreng": {
      "local": "Tempe goreng",
      "note": {
        "en": "Indonesian deep-fried tempeh, the most popular dish made from Java's traditional fermented soybean cake, often marinated in garlic and…",
        "fr": "Tempeh frit indonesien, le plat le plus populaire a base du gateau de soja fermente traditionnel de Java, souvent marine a l'ail et a la…"
      },
      "sources": [
        {
          "name": "Tempeh - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tempeh"
        },
        {
          "name": "Tempe Goreng: Deep Fried Tempeh - Cook Me Indonesian",
          "url": "https://www.cookmeindonesian.com/tempe-goreng-deep-fried-tempeh-vegan/"
        }
      ]
    },
    "tahu goreng indonesian": {
      "local": "tahu goreng",
      "note": {
        "en": "Indonesian/Malay deep-fried tofu; \"tahu\" means tofu and \"goreng\" fried, often served with chili-shallot sweet soy sauce.",
        "fr": "Tofu frit indonésien/malais ; \"tahu\" signifie tofu et \"goreng\" frit, souvent servi avec une sauce soja sucrée pimentée."
      },
      "sources": [
        {
          "name": "Tahu goreng - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tahu_goreng"
        }
      ]
    },
    "nasi uduk": {
      "local": "nasi uduk",
      "note": {
        "en": "Indonesian rice steamed in coconut milk with clove, lemongrass and cassia bark; a Betawi specialty of Jakarta, served with side dishes.",
        "fr": "Riz indonesien cuit au lait de coco avec clou de girofle, citronnelle et cannelle; specialite betawi de Jakarta, servi avec accompagnements."
      },
      "sources": [
        {
          "name": "Nasi uduk - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nasi_uduk"
        },
        {
          "name": "Nasi Uduk - TasteAtlas",
          "url": "https://www.tasteatlas.com/nasi-uduk"
        }
      ]
    },
    "dadar gulung indonesian": {
      "local": "Dadar gulung",
      "note": {
        "en": "Indonesian rolled pancake, green from pandan or suji leaf, filled with grated coconut and palm sugar (gula melaka); popular in Java.",
        "fr": "Crepe roulee indonesienne, verdie au pandan ou suji, garnie de noix de coco rapee et sucre de palme (gula melaka); populaire a Java."
      },
      "sources": [
        {
          "name": "Wikipedia - Dadar gulung",
          "url": "https://en.wikipedia.org/wiki/Dadar_gulung"
        },
        {
          "name": "TasteAtlas - Most Popular Indonesian Desserts",
          "url": "https://www.tasteatlas.com/most-popular-desserts-in-indonesia"
        }
      ]
    }
  },
  "japanese": {
    "sushi": {
      "local": "寿司",
      "note": {
        "en": "Japanese dish of vinegared rice with seafood or vegetables; originated as narezushi, a fish-preservation method from Southeast Asia.",
        "fr": "Plat japonais de riz vinaigré avec fruits de mer ou legumes; ne du narezushi, methode de conservation du poisson d'Asie du Sud-Est."
      },
      "sources": [
        {
          "name": "Sushi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sushi"
        },
        {
          "name": "Sushi | Traditional Rice Dish From Japan | TasteAtlas",
          "url": "https://www.tasteatlas.com/sushi"
        }
      ]
    },
    "sashimi": {
      "local": "刺身",
      "note": {
        "en": "Thinly sliced raw fish or other raw meat, served with a soy-sauce dip and condiments such as wasabi; the Japanese word sashimi dates from…",
        "fr": "Fines tranches de poisson cru ou d'autre viande crue, servies avec une sauce soja et des condiments comme le wasabi ; le mot japonais…"
      },
      "sources": [
        {
          "name": "Sashimi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sashimi"
        },
        {
          "name": "What Is Sashimi? - Food Network",
          "url": "https://www.foodnetwork.com/how-to/packages/food-network-essentials/what-is-sashimi"
        }
      ]
    },
    "omakase": {
      "local": "お任せ",
      "note": {
        "en": "Chef's-choice Japanese dining where diners entrust the meal to the chef; the word \"omakase\" means \"I'll leave it up to you.\"",
        "fr": "Repas japonais au choix du chef, où le client lui confie le menu ; le mot « omakase » signifie « je m'en remets à vous »."
      },
      "sources": [
        {
          "name": "Omakase - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Omakase"
        },
        {
          "name": "Omakase | Britannica",
          "url": "https://www.britannica.com/topic/omakase"
        }
      ]
    },
    "chirashi don": {
      "local": "ちらし寿司",
      "note": {
        "en": "Japanese \"scattered sushi\": vinegared rice in a bowl topped with raw fish and garnishes, originating in the Edo period.",
        "fr": "« Sushi éparpillé » japonais : riz vinaigré en bol garni de poisson cru et d'accompagnements, né à l'époque d'Edo."
      },
      "sources": [
        {
          "name": "Wikipedia - Sushi (Chirashizushi)",
          "url": "https://en.wikipedia.org/wiki/Sushi"
        },
        {
          "name": "Chirashizushi - Simple English Wikipedia",
          "url": "https://simple.wikipedia.org/wiki/Chirashizushi"
        }
      ]
    },
    "tonkotsu ramen": {
      "local": "豚骨ラーメン",
      "note": {
        "en": "Japanese ramen in a cloudy pork-bone broth, originated 1937 in Kurume, Fukuoka, and a specialty of Kyushu.",
        "fr": "Ramen japonais au bouillon trouble d'os de porc, né en 1937 à Kurume, Fukuoka, spécialité de Kyushu."
      },
      "sources": [
        {
          "name": "Tonkotsu ramen - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tonkotsu_ramen"
        },
        {
          "name": "Kurume, the birthplace of Tonkotsu Ramen - ANA",
          "url": "https://www.ana.co.jp/en/us/japan-travel-planner/fukuoka/0000007.html"
        }
      ]
    },
    "miso ramen": {
      "local": "味噌ラーメン",
      "note": {
        "en": "Japanese noodle soup in a miso-seasoned broth, originated in 1950s Sapporo, Hokkaido, at the shop Aji no Sanpei.",
        "fr": "Soupe de nouilles japonaise au bouillon assaisonne de miso, nee dans les annees 1950 a Sapporo (Hokkaido), au restaurant Aji no Sanpei."
      },
      "sources": [
        {
          "name": "Ramen - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ramen"
        },
        {
          "name": "Aji no Sanpei - Japan's First Miso Ramen (5amramen)",
          "url": "https://www.5amramen.com/post/aji-no-sanpei-miso-ramen"
        }
      ]
    },
    "shio ramen": {
      "local": "塩ラーメン (shio rāmen)",
      "note": {
        "en": "Japanese wheat-noodle soup in a light, clear salt-seasoned broth; the oldest ramen style, traditionally tied to Hakodate, Hokkaido.",
        "fr": "Soupe japonaise de nouilles de blé dans un bouillon clair et léger assaisonné au sel; le plus ancien style de ramen, lié à Hakodate…"
      },
      "sources": [
        {
          "name": "Wikipedia - Ramen",
          "url": "https://en.wikipedia.org/wiki/Ramen"
        },
        {
          "name": "TasteAtlas - Shio Ramen",
          "url": "https://www.tasteatlas.com/shio-ramen"
        }
      ]
    },
    "tsukemen": {
      "local": "つけ麺",
      "note": {
        "en": "Japanese ramen style where chilled noodles are dipped into a separate bowl of strong, concentrated hot broth; invented in 1961 in Tokyo by…",
        "fr": "Style de ramen japonais où des nouilles refroidies se trempent dans un bol séparé de bouillon chaud, fort et concentré ; inventé en 1961 à…"
      },
      "sources": [
        {
          "name": "Tsukemen - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tsukemen"
        },
        {
          "name": "The Story Behind Tsukemen (Dipping Noodles) - Tokyo Ramen Tours",
          "url": "https://www.tokyoramentours.com/post/tsukemen-dipping-noodles-history"
        }
      ]
    },
    "tempura": {
      "local": "天ぷら (てんぷら, tempura)",
      "note": {
        "en": "Japanese dish of seafood or vegetables in light batter, deep-fried; introduced by 16th-century Portuguese missionaries via Nanban trade.",
        "fr": "Plat japonais de fruits de mer ou légumes en pâte légère et frits, introduit au XVIe siècle par les missionnaires portugais via le commerce…"
      },
      "sources": [
        {
          "name": "Tempura - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tempura"
        },
        {
          "name": "The History of Tempura - Michelin Guide",
          "url": "https://guide.michelin.com/hk/en/article/features/tempura_en"
        }
      ]
    },
    "tonkatsu": {
      "local": "とんかつ (豚カツ)",
      "note": {
        "en": "A Japanese deep-fried breaded pork cutlet, created in 1899 at Tokyo's Rengatei restaurant from the French côtelette.",
        "fr": "Une côtelette de porc panée et frite à la japonaise, créée en 1899 au restaurant Rengatei de Tokyo, d'après la côtelette française."
      },
      "sources": [
        {
          "name": "Tonkatsu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tonkatsu"
        }
      ]
    },
    "chicken katsu": {
      "local": "チキンカツ (chikinkatsu / 鶏カツ tori katsu)",
      "note": {
        "en": "A Japanese yōshoku dish of panko-breaded deep-fried chicken cutlet, derived from tonkatsu, itself adapted from European breaded cutlets in…",
        "fr": "Un plat japonais yōshoku d'escalope de poulet panée au panko et frite, dérivé du tonkatsu, lui-même adapté des escalopes panées européennes…"
      },
      "sources": [
        {
          "name": "Chicken katsu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Chicken_katsu"
        },
        {
          "name": "Tonkatsu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tonkatsu"
        }
      ]
    },
    "katsu curry": {
      "local": "カツカレー",
      "note": {
        "en": "Japanese yoshoku dish of a breaded, deep-fried tonkatsu cutlet (usually pork) served over rice with Japanese curry. Its origin is disputed…",
        "fr": "Plat japonais de type yoshoku compose d'une escalope panee et frite (tonkatsu, generalement de porc) servie sur du riz avec du curry…"
      },
      "sources": [
        {
          "name": "Katsu curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Katsu_curry"
        },
        {
          "name": "Japanese curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Japanese_curry"
        }
      ]
    },
    "japanese curry rice": {
      "local": "カレーライス (karē raisu)",
      "note": {
        "en": "A mild, thick curry over rice, introduced via the British Royal Navy and first appearing in Japanese cookbooks in 1872 (Meiji era).",
        "fr": "Un curry doux et épais servi sur du riz, introduit via la Royal Navy britannique et apparu dans les livres de cuisine japonais en 1872 (ère…"
      },
      "sources": [
        {
          "name": "Japanese curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Japanese_curry"
        },
        {
          "name": "Japanese Curry - Japan Guide",
          "url": "https://www.japan-guide.com/e/e2351.html"
        }
      ]
    },
    "gyoza": {
      "local": "餃子",
      "note": {
        "en": "Pan-fried crescent dumplings of ground meat and vegetables; Japan's adaptation of Chinese jiaozi, popularized after World War II.",
        "fr": "Raviolis en croissant poêlés farcis de viande hachée et légumes ; adaptation japonaise du jiaozi chinois, popularisée après la Seconde…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Gyoza",
          "url": "https://www.tasteatlas.com/gyoza"
        },
        {
          "name": "Wikipedia — Jiaozi",
          "url": "https://en.wikipedia.org/wiki/Jiaozi"
        }
      ]
    },
    "takoyaki": {
      "local": "たこ焼き",
      "note": {
        "en": "Ball-shaped wheat-batter snack filled with diced octopus, created in Osaka in 1935 by vendor Tomekichi Endo at Aizuya.",
        "fr": "Boulettes de pâte de blé garnies de poulpe, créées à Osaka en 1935 par le marchand Tomekichi Endo chez Aizuya."
      },
      "sources": [
        {
          "name": "Wikipedia — Takoyaki",
          "url": "https://en.wikipedia.org/wiki/Takoyaki"
        },
        {
          "name": "OSAKA-INFO — Takoyaki history and charm",
          "url": "https://osaka-info.jp/en/gourmet/gastronomy-takoyaki/"
        }
      ]
    },
    "okonomiyaki": {
      "local": "お好み焼き",
      "note": {
        "en": "A savory Japanese pancake of batter and shredded cabbage griddle-cooked with varied toppings; its name means \"grilled as you like.\"",
        "fr": "Une galette japonaise salee de pate et de chou emince cuite a la plaque avec garnitures variees; son nom signifie \"grille comme on aime.\""
      },
      "sources": [
        {
          "name": "Okonomiyaki - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Okonomiyaki"
        },
        {
          "name": "\"Okonomiyaki\": Kansai and Hiroshima Styles | Nippon.com",
          "url": "https://www.nippon.com/en/japan-data/h01765/"
        }
      ]
    },
    "yakitori": {
      "local": "焼き鳥（やきとり）",
      "note": {
        "en": "Japanese skewered chicken grilled over charcoal and seasoned with tare (a soy-based sweet-savoury sauce) or salt; the name 焼き鳥 literally…",
        "fr": "Brochettes de poulet japonaises grillées au charbon de bois et assaisonnées de tare (sauce sucrée-salée à base de soja) ou de sel ; le nom…"
      },
      "sources": [
        {
          "name": "Yakitori - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Yakitori"
        },
        {
          "name": "Yakitori 101: Your Guide to Japan's Grilled Chicken Skewers - TableCheck",
          "url": "https://www.tablecheck.com/blog/yakitori-101-your-guide-to-japan-s-grilled-chicken-skewers/"
        }
      ]
    },
    "yakiniku": {
      "local": "焼肉",
      "note": {
        "en": "Japanese grilled meat (literally \"grilled meat\"), where diners cook bite-sized beef and offal over a tabletop fire; popularized post-WWII…",
        "fr": "Viande grillée japonaise (litt. \"viande grillée\"), où l'on cuit bœuf et abats en bouchées sur un grill de table; popularisée après 1945…"
      },
      "sources": [
        {
          "name": "Wikipedia - Yakiniku",
          "url": "https://en.wikipedia.org/wiki/Yakiniku"
        }
      ]
    },
    "shabu shabu": {
      "local": "しゃぶしゃぶ",
      "note": {
        "en": "Japanese nabemono hot pot of thinly sliced meat and vegetables swished in boiling water; named at Osaka's Suehiro restaurant, trademarked…",
        "fr": "Fondue japonaise (nabemono) de fines tranches de viande et legumes plongees dans l'eau bouillante; nommee au restaurant Suehiro d'Osaka…"
      },
      "sources": [
        {
          "name": "Wikipedia — Shabu-shabu",
          "url": "https://en.wikipedia.org/wiki/Shabu-shabu"
        },
        {
          "name": "TasteAtlas — Shabu-shabu",
          "url": "https://www.tasteatlas.com/shabu-shabu"
        }
      ]
    },
    "sukiyaki": {
      "local": "すき焼き",
      "note": {
        "en": "A Japanese hot pot of thinly sliced beef simmered tableside in soy, sugar and mirin, popularized in the Meiji era as beef-eating spread.",
        "fr": "Fondue japonaise de bœuf finement tranché mijoté à table dans soja, sucre et mirin, popularisée à l'ère Meiji avec l'essor du bœuf."
      },
      "sources": [
        {
          "name": "Wikipedia — Sukiyaki",
          "url": "https://en.wikipedia.org/wiki/Sukiyaki"
        },
        {
          "name": "TasteAtlas — Sukiyaki",
          "url": "https://www.tasteatlas.com/sukiyaki"
        }
      ]
    },
    "unagi don": {
      "local": "鰻丼 (うな丼, unadon)",
      "note": {
        "en": "A rice bowl topped with kabayaki-style grilled eel glazed in sweet soy tare; the first donburi dish, created in Edo-era Tokyo (c. 1810).",
        "fr": "Un bol de riz garni d'anguille grillee facon kabayaki nappee de tare sucree au soja; premier donburi, cree a Tokyo a l'epoque d'Edo (v…"
      },
      "sources": [
        {
          "name": "Unadon - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Unadon"
        },
        {
          "name": "Unadon (うな丼) - Food in Japan",
          "url": "https://www.foodinjapan.org/kanto/tokyo-en/unadon/"
        }
      ]
    },
    "oyakodon": {
      "local": "親子丼（おやこどん）",
      "note": {
        "en": "Japanese rice bowl of chicken and egg simmered in dashi; its 'parent-child' name dates to Tokyo's Tamahide restaurant, c.1891.",
        "fr": "Bol de riz japonais au poulet et à l'œuf mijotés dans le dashi ; son nom « parent-enfant » remonte au restaurant Tamahide à Tokyo, v.1891."
      },
      "sources": [
        {
          "name": "Oyakodon - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Oyakodon"
        },
        {
          "name": "Jisho.org: 親子丼",
          "url": "https://jisho.org/word/%E8%A6%AA%E5%AD%90%E4%B8%BC"
        }
      ]
    },
    "katsudon": {
      "local": "カツ丼",
      "note": {
        "en": "Japanese rice bowl topped with a breaded deep-fried pork cutlet (tonkatsu) simmered with egg and onion in dashi-based sauce.",
        "fr": "Bol de riz japonais garni d'une escalope de porc panee et frite (tonkatsu) mijotee avec oeuf et oignon dans une sauce au dashi."
      },
      "sources": [
        {
          "name": "Katsudon - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Katsudon"
        },
        {
          "name": "Katsudon Origin Story - Waseda Weekly",
          "url": "https://www.waseda.jp/inst/weekly/feature-en/2018/04/13/43437/"
        }
      ]
    },
    "gyudon": {
      "local": "牛丼",
      "note": {
        "en": "A Japanese rice bowl topped with beef and onion simmered in dashi, soy sauce and mirin; it grew from Meiji-era gyunabe beef hotpot.",
        "fr": "Un bol de riz japonais garni de bœuf et d'oignon mijotés dans du dashi, sauce soja et mirin; issu du gyunabe de l'ère Meiji."
      },
      "sources": [
        {
          "name": "Gyudon - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Gy%C5%ABdon"
        }
      ]
    },
    "soba": {
      "local": "蕎麦（そば）",
      "note": {
        "en": "Japanese thin noodles of buckwheat flour; cut \"soba-kiri\" noodles became popular among Edo-period (1603-1868) commoners.",
        "fr": "Nouilles japonaises fines a base de sarrasin; les nouilles coupees \"soba-kiri\" se popularisent a l'epoque d'Edo (1603-1868)."
      },
      "sources": [
        {
          "name": "Wikipedia - Soba",
          "url": "https://en.wikipedia.org/wiki/Soba"
        },
        {
          "name": "byFood - Soba: History, Types & Health Benefits",
          "url": "https://www.byfood.com/blog/culture/guide-to-soba"
        }
      ]
    },
    "udon": {
      "local": "うどん (饂飩)",
      "note": {
        "en": "Udon is a thick, chewy Japanese wheat-flour noodle (made from wheat flour, water and salt) commonly served in a dashi-based broth. Its…",
        "fr": "L'udon est une nouille japonaise épaisse et moelleuse à base de farine de blé (farine de blé, eau et sel), généralement servie dans un…"
      },
      "sources": [
        {
          "name": "Udon - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Udon"
        },
        {
          "name": "Jisho - udon (饂飩) dictionary entry",
          "url": "https://jisho.org/search/udon"
        }
      ]
    },
    "onigiri": {
      "local": "おにぎり (お握り)",
      "note": {
        "en": "A Japanese rice ball of salted white rice, often wrapped in nori and filled; carbonized examples date to the Yayoi period.",
        "fr": "Boule de riz blanc salé japonaise, souvent enveloppée de nori et garnie; des restes carbonisés remontent à l'époque Yayoi."
      },
      "sources": [
        {
          "name": "Onigiri - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Onigiri"
        },
        {
          "name": "Onigiri: The Evolving Face of Japan's Beloved Rice Ball - Nippon.com",
          "url": "https://www.nippon.com/en/japan-topics/g02574/"
        }
      ]
    },
    "mochi": {
      "local": "餅（もち）",
      "note": {
        "en": "Japanese rice cake of glutinous mochigome rice steamed and pounded into a paste; a traditional New Year food.",
        "fr": "Gâteau de riz japonais en riz gluant mochigome cuit à la vapeur et pilé en pâte; aliment traditionnel du Nouvel An."
      },
      "sources": [
        {
          "name": "Mochi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mochi"
        },
        {
          "name": "Mochi | Definition, Facts - Britannica",
          "url": "https://www.britannica.com/topic/mochi"
        }
      ]
    },
    "sake": {
      "local": "日本酒（酒）",
      "note": {
        "en": "Japanese alcoholic drink brewed from rice polished to remove bran, fermented with kōji mold; true sake dates to the Nara period (710-794).",
        "fr": "Boisson alcoolisée japonaise brassée à partir de riz poli, fermenté avec la moisissure kōji ; le vrai saké remonte à l'époque de Nara…"
      },
      "sources": [
        {
          "name": "Sake - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sake"
        },
        {
          "name": "Sake | Definition & History | Britannica",
          "url": "https://www.britannica.com/topic/sake"
        }
      ]
    },
    "matcha": {
      "local": "抹茶",
      "note": {
        "en": "Finely stone-ground powder of shade-grown Japanese green tea, introduced from China by Zen monk Eisai around 1191.",
        "fr": "Poudre finement broyee a la meule de the vert japonais cultive a l'ombre, introduit de Chine par le moine zen Eisai vers 1191."
      },
      "sources": [
        {
          "name": "Matcha - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Matcha"
        },
        {
          "name": "Matcha | Britannica",
          "url": "https://www.britannica.com/topic/matcha"
        }
      ]
    }
  },
  "korean": {
    "bibimbap": {
      "local": "비빔밥",
      "note": {
        "en": "A Korean dish of warm rice topped with seasoned vegetables (namul), gochujang, egg and meat, mixed before eating; name means \"mixed rice\".",
        "fr": "Plat coréen de riz chaud garni de légumes assaisonnés (namul), gochujang, œuf et viande, mélangés avant de manger ; son nom signifie « riz…"
      },
      "sources": [
        {
          "name": "Wikipedia - Bibimbap",
          "url": "https://en.wikipedia.org/wiki/Bibimbap"
        },
        {
          "name": "National Geographic - Everything you need to know about bibimbap",
          "url": "https://www.nationalgeographic.com/travel/article/bibimbap-koreas-famous-dish"
        }
      ]
    },
    "dolsot bibimbap": {
      "local": "돌솥비빔밥",
      "note": {
        "en": "Korean mixed-rice dish served in a sizzling stone pot (dolsot) that crisps the rice and cooks a raw egg; the variant arose in 1960s-70s…",
        "fr": "Plat coreen de riz melange servi dans un pot en pierre brulant (dolsot) qui croustille le riz et cuit un oeuf cru; variante nee dans les…"
      },
      "sources": [
        {
          "name": "Bibimbap - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bibimbap"
        },
        {
          "name": "Dolsot - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Dolsot"
        }
      ]
    },
    "bulgogi": {
      "local": "불고기",
      "note": {
        "en": "Korean grilled dish of thin marinated slices of beef; its name means \"fire meat\" and traces to Pyongan Province cooking.",
        "fr": "Plat coreen grille de fines tranches de boeuf marine; son nom signifie \"viande de feu\" et vient de la province du Pyongan."
      },
      "sources": [
        {
          "name": "Wikipedia - Bulgogi",
          "url": "https://en.wikipedia.org/wiki/Bulgogi"
        },
        {
          "name": "Smithsonian Magazine - A Brief History of Bulgogi",
          "url": "https://www.smithsonianmag.com/arts-culture/brief-history-bulgogi-koreas-most-delicious-export-180968132/"
        }
      ]
    },
    "galbi": {
      "local": "갈비",
      "note": {
        "en": "Korean grilled beef short ribs marinated in soy sauce, sugar, garlic and sesame; \"galbi\" means \"rib\" in Korean.",
        "fr": "Travers de boeuf grillés coréens marinés dans sauce soja, sucre, ail et sesame ; \"galbi\" signifie \"cote\" en coreen."
      },
      "sources": [
        {
          "name": "Galbi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Galbi"
        },
        {
          "name": "Galbi - TasteAtlas",
          "url": "https://www.tasteatlas.com/kalbi"
        }
      ]
    },
    "samgyeopsal": {
      "local": "삼겹살",
      "note": {
        "en": "Korean grilled pork belly cooked at the table; its name means \"three-layered flesh,\" referring to the alternating layers of lean meat and…",
        "fr": "Poitrine de porc coréenne grillée à table ; son nom signifie « chair à trois couches », en référence aux couches alternées de viande maigre…"
      },
      "sources": [
        {
          "name": "Wikipedia — Samgyeopsal",
          "url": "https://en.wikipedia.org/wiki/Samgyeopsal"
        },
        {
          "name": "TasteAtlas — Samgyeopsal",
          "url": "https://www.tasteatlas.com/samgyeopsal"
        }
      ]
    },
    "korean fried chicken": {
      "local": "치킨 (chikin)",
      "note": {
        "en": "South Korean double-fried chicken, popularized after a 1977 Seoul franchise; the spicy yangnyeom (seasoned) style dates to 1982 in Daegu.",
        "fr": "Poulet sud-coréen frit deux fois, popularisé après une franchise de Séoul en 1977; le style épicé yangnyeom date de 1982 à Daegu."
      },
      "sources": [
        {
          "name": "Korean fried chicken - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Korean_fried_chicken"
        },
        {
          "name": "Yangnyeom chicken - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Yangnyeom_chicken"
        }
      ]
    },
    "kimchi jjigae": {
      "local": "김치찌개",
      "note": {
        "en": "A common Korean stew of fermented kimchi simmered with pork, tofu and scallions, thought to have developed after chili peppers reached…",
        "fr": "Un ragout coreen courant de kimchi fermente mijote avec porc, tofu et oignons verts, apparu apres l'arrivee du piment en Coree."
      },
      "sources": [
        {
          "name": "Kimchi-jjigae - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kimchi-jjigae"
        },
        {
          "name": "Jjigae - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jjigae"
        }
      ]
    },
    "sundubu jjigae": {
      "local": "순두부찌개",
      "note": {
        "en": "A Korean spicy stew built around sundubu, extra-soft uncurdled tofu, simmered with chili, seafood or meat and a cracked egg.",
        "fr": "Ragout coreen epice a base de sundubu, tofu extra-mou non caille, mijote avec piment, fruits de mer ou viande et un oeuf casse."
      },
      "sources": [
        {
          "name": "Sundubu-jjigae - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sundubu-jjigae"
        },
        {
          "name": "Haemul sundubu-jjigae recipe - Maangchi",
          "url": "https://www.maangchi.com/recipe/haemul-sundubu-jjigae"
        }
      ]
    },
    "doenjang jjigae": {
      "local": "된장찌개",
      "note": {
        "en": "A Korean soybean-paste (doenjang) stew with vegetables, tofu and often meat or seafood; doenjang dates to the Three Kingdoms period.",
        "fr": "Ragoût coréen à la pâte de soja (doenjang) avec légumes, tofu et souvent viande ou fruits de mer; le doenjang remonte à l'époque des Trois…"
      },
      "sources": [
        {
          "name": "Wikipedia — Doenjang-jjigae",
          "url": "https://en.wikipedia.org/wiki/Doenjang-jjigae"
        },
        {
          "name": "Korean Bapsang — Doenjang Jjigae",
          "url": "https://www.koreanbapsang.com/doenjang-jjigae-korean-soy-bean-paste/"
        }
      ]
    },
    "budae jjigae": {
      "local": "부대찌개",
      "note": {
        "en": "A Korean \"army stew\" of kimchi, broth, and US-military surplus meats like Spam and hot dogs, born from post-Korean War (1953) food scarcity.",
        "fr": "Un \"ragoût de l'armée\" coréen au kimchi, bouillon et surplus de viande militaire US (Spam, saucisses), né de la pénurie d'après-guerre…"
      },
      "sources": [
        {
          "name": "Wikipedia — Budae-jjigae",
          "url": "https://en.wikipedia.org/wiki/Budae-jjigae"
        },
        {
          "name": "Maangchi — Budae-jjigae (Army Base Stew)",
          "url": "https://www.maangchi.com/recipe/budae-jjigae"
        }
      ]
    },
    "dakgalbi": {
      "local": "닭갈비",
      "note": {
        "en": "Korean stir-fried chicken in gochujang sauce with cabbage, rice cake and sweet potato, developed in 1960s Chuncheon as a pub snack.",
        "fr": "Poulet sauté coréen au gochujang avec chou, gâteau de riz et patate douce, né dans les années 1960 à Chuncheon comme en-cas de taverne."
      },
      "sources": [
        {
          "name": "Wikipedia - Dak-galbi",
          "url": "https://en.wikipedia.org/wiki/Dak-galbi"
        },
        {
          "name": "TasteAtlas - Dak Galbi",
          "url": "https://www.tasteatlas.com/dak-galbi"
        }
      ]
    },
    "japchae": {
      "local": "잡채",
      "note": {
        "en": "Korean stir-fried dish; today made with sweet-potato glass noodles (dangmyeon), vegetables and meat. The name dates to an…",
        "fr": "Plat coréen sauté ; aujourd'hui préparé avec des nouilles de verre à la patate douce (dangmyeon), des légumes et de la viande. Le nom…"
      },
      "sources": [
        {
          "name": "Japchae - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Japchae"
        }
      ]
    },
    "jjajangmyeon": {
      "local": "짜장면",
      "note": {
        "en": "Korean-Chinese wheat noodles in a thick chunjang (black bean) sauce with pork and vegetables, created by Shandong immigrants in Incheon.",
        "fr": "Nouilles de ble sino-coreennes nappees d'une sauce epaisse au chunjang (haricots noirs), porc et legumes, creees par des immigres de…"
      },
      "sources": [
        {
          "name": "Wikipedia - Jajangmyeon",
          "url": "https://en.wikipedia.org/wiki/Jajangmyeon"
        },
        {
          "name": "VisitKorea - Jjajangmyeon",
          "url": "https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=221247"
        }
      ]
    },
    "jjamppong": {
      "local": "짬뽕",
      "note": {
        "en": "A Korean-Chinese spicy seafood noodle soup in a red gochugaru broth, named after Japanese chanpon during the Japanese occupation.",
        "fr": "Soupe de nouilles sino-coreenne aux fruits de mer dans un bouillon rouge au gochugaru, nommee d'apres le chanpon japonais sous l'occupation."
      },
      "sources": [
        {
          "name": "Jjamppong - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jjamppong"
        }
      ]
    },
    "naengmyeon": {
      "local": "냉면",
      "note": {
        "en": "Korean cold buckwheat noodle dish of North Korean origin (Pyongyang/Hamhung), recorded since the Joseon era in the 19th-century…",
        "fr": "Plat coréen de nouilles froides de sarrasin, originaire de Corée du Nord (Pyongyang/Hamhung), attesté dès l'ère Joseon dans le…"
      },
      "sources": [
        {
          "name": "Naengmyeon - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Naengmyeon"
        },
        {
          "name": "Naengmyeon (Cold Noodles) - Korean Bapsang",
          "url": "https://www.koreanbapsang.com/naengmyeon-cold-noodles/"
        }
      ]
    },
    "tteokbokki": {
      "local": "떡볶이",
      "note": {
        "en": "A Korean dish of cylindrical rice cakes (garae-tteok) simmered in spicy gochujang sauce; the popular spicy form is credited to Ma Bok-rim…",
        "fr": "Plat coreen de gateaux de riz cylindriques (garae-tteok) mijotes dans une sauce piquante au gochujang ; sa forme epicee populaire est…"
      },
      "sources": [
        {
          "name": "Wikipedia - Tteokbokki",
          "url": "https://en.wikipedia.org/wiki/Tteokbokki"
        },
        {
          "name": "Food Republic - The History Of Tteokbokki",
          "url": "https://www.foodrepublic.com/1807269/korean-food-tteokbokki-history/"
        }
      ]
    },
    "kimbap": {
      "local": "김밥",
      "note": {
        "en": "Korean dish of cooked rice, vegetables and often meat or egg rolled in dried gim (seaweed) and sliced; name first recorded 1935.",
        "fr": "Plat coréen de riz, légumes et souvent viande ou œuf roulés dans du gim (algue séchée) puis tranchés; nom attesté dès 1935."
      },
      "sources": [
        {
          "name": "Gimbap - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Gimbap"
        }
      ]
    },
    "mandu": {
      "local": "만두",
      "note": {
        "en": "Korean filled dumpling, steamed, boiled or fried, believed introduced from the Yuan dynasty during the 14th-century Goryeo period.",
        "fr": "Ravioli coréen farci, cuit à la vapeur, bouilli ou frit, introduit de la dynastie Yuan durant la période Goryeo au XIVe siècle."
      },
      "sources": [
        {
          "name": "Mandu (food) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mandu_(food)"
        },
        {
          "name": "Mandu (dumpling) - Simple English Wikipedia",
          "url": "https://simple.wikipedia.org/wiki/Mandu_(dumpling)"
        }
      ]
    },
    "bossam": {
      "local": "보쌈",
      "note": {
        "en": "Korean dish of boiled pork belly, thinly sliced and wrapped in cabbage or lettuce leaves; name means \"wrapped,\" tied to winter…",
        "fr": "Plat coréen de poitrine de porc bouillie, tranchée fine et enveloppée dans du chou ou de la laitue; \"bossam\" signifie \"emballé\"."
      },
      "sources": [
        {
          "name": "Bossam - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bossam"
        },
        {
          "name": "Bossam - TasteAtlas",
          "url": "https://www.tasteatlas.com/bossam"
        }
      ]
    },
    "jokbal": {
      "local": "족발",
      "note": {
        "en": "Korean pig's trotters braised in soy sauce, ginger, garlic and rice wine; popularized in 1960s Jangchung-dong, Seoul, by North Korean…",
        "fr": "Pieds de porc coréens braisés à la sauce soja, gingembre, ail et vin de riz; popularisés dans les années 1960 à Jangchung-dong, Séoul, par…"
      },
      "sources": [
        {
          "name": "Jokbal - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jokbal"
        },
        {
          "name": "Michelin Guide - Korean Braised Pig Trotters",
          "url": "https://guide.michelin.com/en/article/travel/seoul-food-korean-braised-pig-trotters"
        }
      ]
    },
    "gimbap": {
      "local": "김밥",
      "note": {
        "en": "Korean dish of cooked rice and fillings rolled in dried seaweed (gim) and sliced; the name 김밥 means \"seaweed rice.\"",
        "fr": "Plat coréen de riz et garnitures roulés dans une feuille d'algue séchée (gim) puis tranché ; 김밥 signifie « riz aux algues »."
      },
      "sources": [
        {
          "name": "Wikipedia — Gimbap",
          "url": "https://en.wikipedia.org/wiki/Gimbap"
        },
        {
          "name": "TasteAtlas — Gimbap",
          "url": "https://www.tasteatlas.com/kimbap"
        }
      ]
    },
    "seollangtang": {
      "local": "설렁탕",
      "note": {
        "en": "Korean ox bone soup of leg bones and brisket simmered for hours into a milky broth, served with rice; name tied to Joseon-era Seonnongje…",
        "fr": "Soupe coréenne d'os de bœuf et de poitrine mijotés des heures en bouillon laiteux, servie avec du riz; nom lié aux rites Seonnongje de…"
      },
      "sources": [
        {
          "name": "Wikipedia — Seolleongtang",
          "url": "https://en.wikipedia.org/wiki/Seolleongtang"
        },
        {
          "name": "TasteAtlas — Seolleongtang",
          "url": "https://www.tasteatlas.com/seolleongtang"
        }
      ]
    },
    "galbitang": {
      "local": "갈비탕",
      "note": {
        "en": "A Korean beef short rib soup (guk) of ribs simmered with radish and onion, documented in 1890s Joseon royal court banquet records.",
        "fr": "Soupe coréenne de côtes de bœuf (guk) mijotées avec radis et oignon, attestée dans les banquets royaux Joseon des années 1890."
      },
      "sources": [
        {
          "name": "Wikipedia — Galbi-tang",
          "url": "https://en.wikipedia.org/wiki/Galbi-tang"
        },
        {
          "name": "Korea.net — Galbitang beef rib soup (갈비탕)",
          "url": "https://www.korea.net/NewsFocus/Culture/view?articleId=141860"
        }
      ]
    },
    "samgyetang": {
      "local": "삼계탕 (蔘鷄湯)",
      "note": {
        "en": "Korean soup of a whole young chicken stuffed with glutinous rice and ginseng, eaten on the hottest summer (sambok) days; reached its modern…",
        "fr": "Soupe coréenne d'un poulet entier farci de riz gluant et de ginseng, mangée durant les jours d'été (sambok); forme moderne fixée dans les…"
      },
      "sources": [
        {
          "name": "Wikipedia — Samgye-tang",
          "url": "https://en.wikipedia.org/wiki/Samgye-tang"
        },
        {
          "name": "Korean Bapsang — Samgyetang (Ginseng Chicken Soup)",
          "url": "https://www.koreanbapsang.com/samgyetang/"
        }
      ]
    },
    "hotteok": {
      "local": "호떡",
      "note": {
        "en": "A Korean filled pancake street food, sweet with brown sugar, cinnamon and nuts, brought by Chinese merchants in the late 1800s.",
        "fr": "Une crêpe coréenne fourrée vendue dans la rue, sucrée au sucre roux, cannelle et noix, apportée par des marchands chinois à la fin du XIXe…"
      },
      "sources": [
        {
          "name": "Wikipedia - Hotteok",
          "url": "https://en.wikipedia.org/wiki/Hotteok"
        }
      ]
    },
    "bingsu": {
      "local": "빙수",
      "note": {
        "en": "A Korean milk-based shaved-ice dessert with sweet toppings that may include chopped fruit, condensed milk, fruit syrup, tteok, and red…",
        "fr": "Dessert coréen à base de glace pilée au lait, garni de fruits, de lait concentré, de sirop de fruits, de tteok ou de haricots rouges…"
      },
      "sources": [
        {
          "name": "Bingsu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bingsu"
        },
        {
          "name": "Bingsu: All you need to know about Korea's sweet summer treat - The Korea Times",
          "url": "https://www.koreatimes.co.kr/lifestyle/travel-food/20250712/bingsu-all-you-need-to-know-about-koreas-sweet-summer-treat"
        }
      ]
    },
    "banchan platter": {
      "local": "반찬 (飯饌)",
      "note": {
        "en": "An assortment of small Korean side dishes served with rice, traced to Buddhist meat-bans of the mid-Three Kingdoms era.",
        "fr": "Un assortiment de petits plats d'accompagnement coréens servis avec du riz, né des interdits bouddhistes de la viande de l'ère des Trois…"
      },
      "sources": [
        {
          "name": "Banchan - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Banchan"
        },
        {
          "name": "Beyond Kimchi: The Rich Variety of Side Dishes in Korean Cuisine - PBS SoCal",
          "url": "https://www.pbssocal.org/shows/the-migrant-kitchen/banchan-the-story-of-the-korean-side-dish"
        }
      ]
    },
    "kimchi": {
      "local": "김치",
      "note": {
        "en": "Korean dish of salted, fermented vegetables (usually napa cabbage) seasoned with chili; chili was only added after peppers reached Korea in…",
        "fr": "Plat coréen de légumes salés et fermentés (souvent du chou napa) assaisonnés au piment; le piment ne fut ajouté qu'après son arrivée en…"
      },
      "sources": [
        {
          "name": "Kimchi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kimchi"
        },
        {
          "name": "Baechu-kimchi - TasteAtlas",
          "url": "https://www.tasteatlas.com/baechu-kimchi"
        }
      ]
    },
    "soju": {
      "local": "소주 (燒酒)",
      "note": {
        "en": "A clear Korean distilled spirit named \"burned liquor\"; introduced via Mongols during the 13th-century Goryeo dynasty.",
        "fr": "Spiritueux coréen distillé et incolore nommé \"alcool brûlé\"; introduit par les Mongols sous la dynastie Goryeo au XIIIe siècle."
      },
      "sources": [
        {
          "name": "Soju - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Soju"
        },
        {
          "name": "Korean alcoholic beverages - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Korean_alcoholic_drinks"
        }
      ]
    },
    "makgeolli": {
      "local": "막걸리",
      "note": {
        "en": "Korea's oldest traditional alcoholic drink: a milky, lightly sparkling 6-9% rice wine fermented from rice and the starter nuruk.",
        "fr": "La plus ancienne boisson alcoolisee traditionnelle de Coree : un vin de riz laiteux et legerement petillant de 6 a 9 %, fermente avec le…"
      },
      "sources": [
        {
          "name": "Makgeolli - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Makgeolli"
        },
        {
          "name": "Michelin Guide: Korea's Oldest Brew, Explained",
          "url": "https://guide.michelin.com/kr/en/article/features/makgeolli"
        }
      ]
    }
  },
  "chinese": {
    "peking duck": {
      "local": "北京烤鸭",
      "note": {
        "en": "Beijing roast duck famed for thin, crispy skin, served sliced with pancakes; its first specialist restaurant, Bianyifang, opened in 1416.",
        "fr": "Canard laqué de Pékin réputé pour sa peau fine et croustillante, servi tranché avec des crêpes; premier restaurant spécialisé, Bianyifang…"
      },
      "sources": [
        {
          "name": "Peking duck - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Peking_duck"
        }
      ]
    },
    "xiao long bao": {
      "local": "小笼包 (xiǎolóngbāo)",
      "note": {
        "en": "A Shanghai-style steamed dumpling filled with pork and hot soup, originating in 19th-century Nanxiang, steamed in a small bamboo basket.",
        "fr": "Bouchee vapeur de style shanghaien farcie de porc et de soupe chaude, nee a Nanxiang au XIXe siecle, cuite dans un petit panier en bambou."
      },
      "sources": [
        {
          "name": "Xiaolongbao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Xiaolongbao"
        },
        {
          "name": "Xiaolongbao - TasteAtlas",
          "url": "https://www.tasteatlas.com/xiaolongbao"
        }
      ]
    },
    "mapo tofu": {
      "local": "麻婆豆腐",
      "note": {
        "en": "Spicy Sichuan dish of tofu in chili-bean sauce with minced meat, created around 1862 in Chengdu by Mrs. Chen, the \"pockmarked grandma.\"",
        "fr": "Plat épicé du Sichuan, tofu en sauce pimentée au haricot et viande hachée, créé vers 1862 à Chengdu par Mme Chen, la « grand-mère grêlée »."
      },
      "sources": [
        {
          "name": "Mapo tofu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mapo_tofu"
        },
        {
          "name": "Mapo Doufu (Chen Mapo Doufu) - TasteAtlas",
          "url": "https://www.tasteatlas.com/chen-mapo-doufu"
        }
      ]
    },
    "kung pao chicken": {
      "local": "宫保鸡丁 (Gōngbǎo jīdīng)",
      "note": {
        "en": "Spicy Sichuan stir-fry of diced chicken, peanuts and chilies, named after Qing official Ding Baozhen (1820-1886), titled Gongbao.",
        "fr": "Sauté sichuanais épicé de poulet en dés, cacahuètes et piments, nommé d'après le mandarin Qing Ding Baozhen (1820-1886), titré Gongbao."
      },
      "sources": [
        {
          "name": "Kung Pao chicken - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kung_Pao_chicken"
        },
        {
          "name": "Ding Baozhen - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ding_Baozhen"
        }
      ]
    },
    "sweet and sour pork": {
      "local": "咕嚕肉",
      "note": {
        "en": "Cantonese dish of batter-fried pork in a sweet-sour sauce, adapted in Qing-dynasty Guangzhou from sweet-sour ribs into boneless cubes for…",
        "fr": "Plat cantonais de porc frit en pate dans une sauce aigre-douce, adapte a Canton sous les Qing depuis les travers aigres-doux en cubes…"
      },
      "sources": [
        {
          "name": "Wikipedia — Sweet and sour pork",
          "url": "https://en.wikipedia.org/wiki/Sweet_and_sour_pork"
        },
        {
          "name": "South China Morning Post — Legends: Sweet and Sour Pork",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/1118279/legends-sweet-and-sour-pork"
        }
      ]
    },
    "hot pot": {
      "local": "火锅 (huǒguō)",
      "note": {
        "en": "A communal Chinese dish of simmering broth in which diners cook raw meats and vegetables at the table; the copper pot is traced to the…",
        "fr": "Plat chinois convivial de bouillon mijoté où les convives cuisent viandes et légumes à table; la marmite en cuivre remonte à l'époque des…"
      },
      "sources": [
        {
          "name": "Hot pot - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hot_pot"
        }
      ]
    },
    "zhajiangmian": {
      "local": "炸醬麵 (炸酱面, zhájiàngmiàn)",
      "note": {
        "en": "Northern Chinese dish of thick wheat noodles topped with zhajiang, a fried fermented-soybean-and-pork sauce; the Beijing style is one of…",
        "fr": "Plat du nord de la Chine: nouilles de blé épaisses nappées de zhajiang, sauce frite de soja fermenté et de porc; la version pékinoise est…"
      },
      "sources": [
        {
          "name": "Zhajiangmian - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Zhajiangmian"
        }
      ]
    },
    "jianbing": {
      "local": "煎饼 (jiānbǐng)",
      "note": {
        "en": "A savory Chinese street-breakfast crepe of wheat/grain batter, egg and crispy cracker, tracing to Shandong some 2,000 years ago.",
        "fr": "Crêpe salée chinoise du petit-déjeuner, à base de pâte de blé, d'œuf et de cracker croustillant, originaire du Shandong il y a environ 2000…"
      },
      "sources": [
        {
          "name": "Jianbing - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jianbing"
        },
        {
          "name": "The Jianbing Is Taking Over. Time To Learn Where It Comes From. - Food Republic",
          "url": "https://www.foodrepublic.com/2018/02/14/history-lesson-jianbing/"
        }
      ]
    },
    "baozi": {
      "local": "包子 (bāozi)",
      "note": {
        "en": "A Chinese yeast-leavened steamed bun made from wheat flour, filled with savoury fillings (such as pork or vegetables) or sweet ones (such…",
        "fr": "Petit pain chinois levé et cuit à la vapeur, à base de farine de blé, garni d'une farce salée (porc, légumes) ou sucrée (pâte de haricots…"
      },
      "sources": [
        {
          "name": "Wikipedia — Baozi",
          "url": "https://en.wikipedia.org/wiki/Baozi"
        },
        {
          "name": "Britannica — Bao",
          "url": "https://www.britannica.com/topic/bao-food"
        }
      ]
    },
    "jiaozi": {
      "local": "饺子 (jiǎozi)",
      "note": {
        "en": "Crescent-shaped Chinese dumplings of meat or vegetables in a thin wrapper, traditionally credited to Han-era physician Zhang Zhongjing.",
        "fr": "Raviolis chinois en forme de croissant, farcis de viande ou de légumes, attribués au médecin Zhang Zhongjing de l'époque Han."
      },
      "sources": [
        {
          "name": "Jiaozi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jiaozi"
        }
      ]
    },
    "mantou": {
      "local": "饅頭 (馒头)",
      "note": {
        "en": "A plain, fluffy steamed wheat bun and staple of northern China, attested in writing as “mantou” by the Western Jin dynasty (c. 300 CE).",
        "fr": "Petit pain de blé cuit à la vapeur, nature et moelleux, aliment de base du nord de la Chine, attesté sous le nom « mantou » dès les Jin (v…"
      },
      "sources": [
        {
          "name": "Mantou - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mantou"
        },
        {
          "name": "Mantou | TasteAtlas",
          "url": "https://www.tasteatlas.com/mantou"
        }
      ]
    },
    "lanzhou lamian": {
      "local": "兰州拉面 (兰州牛肉面)",
      "note": {
        "en": "Hand-pulled wheat noodles in a clear stewed-beef broth from Lanzhou, Gansu, developed by China's Hui Muslims along the Silk Road.",
        "fr": "Nouilles de ble etirees a la main dans un bouillon clair de boeuf mijote, de Lanzhou (Gansu), creees par les Hui musulmans sur la route de…"
      },
      "sources": [
        {
          "name": "Lanzhou beef noodles - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lanzhou_beef_noodles"
        },
        {
          "name": "Lanzhou Lamian - TasteAtlas",
          "url": "https://www.tasteatlas.com/lanzhou-lamian"
        }
      ]
    },
    "biang biang noodles": {
      "local": "𰻞𰻞麵 (biángbiáng miàn)",
      "note": {
        "en": "Thick, belt-like hand-pulled Shaanxi noodles whose name uses biáng, a 58-stroke character among the most complex in modern Chinese.",
        "fr": "Nouilles larges du Shaanxi, étirées à la main, dont le nom emploie biáng, caractère de 58 traits parmi les plus complexes du chinois…"
      },
      "sources": [
        {
          "name": "Wikipedia - Biangbiang noodles",
          "url": "https://en.wikipedia.org/wiki/Biangbiang_noodles"
        },
        {
          "name": "Wiktionary - 𰻞𰻞麵",
          "url": "https://en.wiktionary.org/wiki/%F0%B0%BB%9E%F0%B0%BB%9E%E9%BA%B5"
        }
      ]
    },
    "beggar's chicken": {
      "local": "叫化鸡 (jiàohuā jī)",
      "note": {
        "en": "A Hangzhou-origin Chinese dish of whole chicken stuffed, wrapped in lotus leaves and clay, and slow-baked for hours.",
        "fr": "Un plat chinois originaire de Hangzhou: poulet entier farci, enveloppé de feuilles de lotus et d'argile, puis cuit lentement des heures."
      },
      "sources": [
        {
          "name": "Wikipedia - Beggar's chicken",
          "url": "https://en.wikipedia.org/wiki/Beggar%27s_chicken"
        },
        {
          "name": "eHangzhou - Traditional Hangzhou dish: Beggar's chicken",
          "url": "https://www.ehangzhou.gov.cn/2020-08/04/c_270828.htm"
        }
      ]
    },
    "west lake fish": {
      "local": "西湖醋鱼 (xīhú cùyú)",
      "note": {
        "en": "A Hangzhou specialty of poached grass carp in a sweet-sour vinegar sauce, dating to the Southern Song dynasty.",
        "fr": "Specialite de Hangzhou: carpe herbivore pochee dans une sauce aigre-douce au vinaigre, datant des Song du Sud."
      },
      "sources": [
        {
          "name": "Wikipedia - West Lake Fish in Vinegar Gravy",
          "url": "https://en.wikipedia.org/wiki/West_Lake_Fish_in_Vinegar_Gravy"
        },
        {
          "name": "TravelChinaGuide - West Lake Fish in Vinegar Gravy",
          "url": "https://www.travelchinaguide.com/tour/food/chinese-cooking/west-lake-fish.htm"
        }
      ]
    },
    "yangzhou fried rice": {
      "local": "扬州炒饭 (Yángzhōu chǎofàn)",
      "note": {
        "en": "Chinese egg fried rice with vegetables and usually two proteins (shrimp and ham), named for Yangzhou and popularized by Qing official Yi…",
        "fr": "Riz sauté chinois aux œufs, légumes et souvent deux protéines (crevette et jambon), nommé d'après Yangzhou et popularisé par le mandarin Yi…"
      },
      "sources": [
        {
          "name": "Wikipedia - Yangzhou fried rice",
          "url": "https://en.wikipedia.org/wiki/Yangzhou_fried_rice"
        },
        {
          "name": "TasteAtlas - Yang Zhou Chao Fan",
          "url": "https://www.tasteatlas.com/yangzhou-fried-rice"
        }
      ]
    },
    "shaanxi rou jia mo": {
      "local": "肉夹馍",
      "note": {
        "en": "A Shaanxi street food of slow-stewed spiced meat stuffed in a baijimo flatbread, often called the world's oldest hamburger.",
        "fr": "Street food du Shaanxi : viande épicée mijotée fourrée dans un pain plat baijimo, souvent dit le plus ancien hamburger du monde."
      },
      "sources": [
        {
          "name": "Wikipedia - Roujiamo",
          "url": "https://en.wikipedia.org/wiki/Roujiamo"
        },
        {
          "name": "TasteAtlas - Ròujiāmó",
          "url": "https://www.tasteatlas.com/rou-jia-mo"
        }
      ]
    },
    "chongqing noodles": {
      "local": "重庆小面 (Chóngqìng xiǎomiàn)",
      "note": {
        "en": "Spicy wheat-noodle dish from Chongqing, China, dressed with chili oil and Sichuan peppercorn; a staple local street-food breakfast.",
        "fr": "Plat de nouilles de blé épicées de Chongqing, en Chine, à l'huile pimentée et au poivre du Sichuan; petit-déjeuner de rue local."
      },
      "sources": [
        {
          "name": "Wikipedia - Chongqing noodles",
          "url": "https://en.wikipedia.org/wiki/Chongqing_noodles"
        },
        {
          "name": "TasteAtlas - Chongqing xiaomian",
          "url": "https://www.tasteatlas.com/chongqing-xiaomian"
        }
      ]
    },
    "chinese new year nian gao": {
      "local": "年糕 (niángāo)",
      "note": {
        "en": "A sticky, sweet glutinous-rice cake eaten at Lunar New Year; 糕 (cake) puns on 高 (high), symbolizing a more prosperous year.",
        "fr": "Gateau collant et sucre de riz gluant mange au Nouvel An lunaire; 糕 (gateau) joue sur 高 (haut), symbole d'une annee plus prospere."
      },
      "sources": [
        {
          "name": "Nian gao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nian_gao"
        },
        {
          "name": "Nian Gao - TasteAtlas",
          "url": "https://www.tasteatlas.com/nian-gao"
        }
      ]
    },
    "moon cake": {
      "local": "月餅",
      "note": {
        "en": "Round Chinese pastry with dense lotus-seed or red-bean paste, often a salted egg yolk, eaten at the Mid-Autumn Festival.",
        "fr": "Pâtisserie chinoise ronde fourrée de pâte de lotus ou de haricot rouge, souvent un jaune d'œuf salé, mangée à la fête de la mi-automne."
      },
      "sources": [
        {
          "name": "Mooncake - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mooncake"
        },
        {
          "name": "Mid-Autumn Festival - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mid-Autumn_Festival"
        }
      ]
    },
    "zongzi": {
      "local": "粽子",
      "note": {
        "en": "Glutinous rice with sweet or savoury fillings wrapped in bamboo leaves, eaten at the Dragon Boat Festival to honour poet Qu Yuan.",
        "fr": "Riz gluant aux garnitures sucrées ou salées enveloppé de feuilles de bambou, mangé à la Fête des Bateaux-Dragons en l'honneur du poète Qu…"
      },
      "sources": [
        {
          "name": "Zongzi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Zongzi"
        },
        {
          "name": "Zongzi at Dragon Boat Festival - China Highlights",
          "url": "https://www.chinahighlights.com/festivals/dragon-boat-festival-zongzi.htm"
        }
      ]
    },
    "mooncake": {
      "local": "月餅 (月饼)",
      "note": {
        "en": "A dense round Chinese pastry filled with lotus-seed or sweet-bean paste, often with a salted egg yolk, eaten at the Mid-Autumn Festival.",
        "fr": "Pâtisserie chinoise ronde et dense fourrée de pâte de lotus ou de haricot sucré, souvent avec un jaune d'œuf salé, dégustée à la fête de la…"
      },
      "sources": [
        {
          "name": "Mooncake - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mooncake"
        },
        {
          "name": "Mooncake | Britannica",
          "url": "https://www.britannica.com/topic/moon-cake"
        }
      ]
    },
    "chow mein": {
      "local": "炒麵 (chǎomiàn)",
      "note": {
        "en": "Chinese stir-fried noodle dish with meat and vegetables; the name (炒麵, \"stir-fried noodles\") derives from the Taishanese pronunciation of…",
        "fr": "Plat chinois de nouilles sautées avec viande et légumes ; le nom (炒麵, « nouilles sautées ») vient de la prononciation taishanaise des…"
      },
      "sources": [
        {
          "name": "Chow mein - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Chow_mein"
        },
        {
          "name": "chow mein, n. - Oxford English Dictionary",
          "url": "https://www.oed.com/dictionary/chow-mein_n"
        }
      ]
    },
    "lo mein": {
      "local": "撈麵",
      "note": {
        "en": "A Cantonese dish of boiled wheat-flour egg noodles tossed in sauce; the name 撈麵 means \"tossed/stirred noodles.\"",
        "fr": "Plat cantonais de nouilles de blé aux œufs bouillies puis mélangées à une sauce; 撈麵 signifie « nouilles remuées »."
      },
      "sources": [
        {
          "name": "Lo mein - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lo_mein"
        },
        {
          "name": "撈麵 - Wiktionary",
          "url": "https://en.wiktionary.org/wiki/%E6%92%88%E9%BA%B5"
        }
      ]
    },
    "egg drop soup": {
      "local": "蛋花湯 (dànhuātāng)",
      "note": {
        "en": "Chinese soup of wispy beaten eggs streamed into seasoned chicken broth; its name means \"egg flower soup\" for the petal-like swirls.",
        "fr": "Soupe chinoise d'œufs battus versés en filaments dans un bouillon de poulet ; son nom signifie « soupe aux fleurs d'œuf »."
      },
      "sources": [
        {
          "name": "Wikipedia — Egg drop soup",
          "url": "https://en.wikipedia.org/wiki/Egg_drop_soup"
        },
        {
          "name": "TasteAtlas — Egg drop soup (Dan hua tang)",
          "url": "https://www.tasteatlas.com/egg-drop-soup"
        }
      ]
    },
    "hot and sour soup": {
      "local": "酸辣汤 (suānlàtāng)",
      "note": {
        "en": "A peppery, vinegary Chinese soup with tofu, wood-ear mushrooms and egg ribbons, derived from Henan's hulatang (pepper soup).",
        "fr": "Soupe chinoise poivrée et vinaigrée au tofu, champignons noirs et filets d'œuf, dérivée du hulatang (soupe au poivre) du Henan."
      },
      "sources": [
        {
          "name": "Hot and sour soup - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hot_and_sour_soup"
        },
        {
          "name": "酸辣湯 - Wiktionary",
          "url": "https://en.wiktionary.org/wiki/%E9%85%B8%E8%BE%A3%E6%B9%AF"
        }
      ]
    },
    "spring rolls": {
      "local": "春卷 (chūnjuǎn)",
      "note": {
        "en": "Savoury rolls of vegetables, sometimes meat, wrapped in thin wheat pancakes and pan-fried or deep-fried. Eaten at the Chinese Spring…",
        "fr": "Rouleaux salés de légumes, parfois de viande, enveloppés dans de fines crêpes de blé puis frits. Consommés lors de la fête du printemps…"
      },
      "sources": [
        {
          "name": "Spring roll - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Spring_roll"
        },
        {
          "name": "The origin of spring rolls, and why Chinese people eat them to celebrate Lunar New Year - South China Morning Post",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/3296829/origin-spring-rolls-and-why-chinese-people-eat-them-celebrate-lunar-new-year"
        }
      ]
    }
  },
  "cantonese": {
    "dim sum": {
      "local": "點心",
      "note": {
        "en": "A Cantonese tradition of small steamed or fried dishes served with tea (yum cha), originating in Guangdong's teahouses.",
        "fr": "Tradition cantonaise de petites bouchées vapeur ou frites servies avec du thé (yum cha), née dans les maisons de thé du Guangdong."
      },
      "sources": [
        {
          "name": "Dim sum - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Dim_sum"
        },
        {
          "name": "Dim sum | Britannica",
          "url": "https://www.britannica.com/topic/dim-sum"
        }
      ]
    },
    "har gow": {
      "local": "蝦餃",
      "note": {
        "en": "Cantonese dim sum dumpling of shrimp in a thin translucent wheat-starch wrapper, originating in early-20th-century Guangzhou teahouses.",
        "fr": "Bouchee dim sum cantonaise de crevettes dans une fine pate translucide d'amidon de ble, nee dans les maisons de the de Canton au debut du…"
      },
      "sources": [
        {
          "name": "Wikipedia - Har gow",
          "url": "https://en.wikipedia.org/wiki/Har_gow"
        },
        {
          "name": "Red House Spice - Har gow",
          "url": "https://redhousespice.com/har-gow-crystal-prawn-dumplings/"
        }
      ]
    },
    "siu mai": {
      "local": "燒賣 (sīu-máai)",
      "note": {
        "en": "An open-topped Cantonese dim sum dumpling of pork and shrimp in a thin wheat wrapper; the dish originated in Hohhot, Inner Mongolia.",
        "fr": "Bouchée cantonaise dim sum ouverte, au porc et aux crevettes dans une fine pâte de blé ; le plat est originaire de Hohhot, en…"
      },
      "sources": [
        {
          "name": "Shumai - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Shumai"
        },
        {
          "name": "Pop Cantonese: 燒賣 – Siu Mai (Zolima CityMag)",
          "url": "https://zolimacitymag.com/pop-cantonese-word-of-the-week-%E7%87%92%E8%B3%A3-siu-mai/"
        }
      ]
    },
    "char siu bao": {
      "local": "叉燒包",
      "note": {
        "en": "Cantonese steamed or baked bun filled with barbecued char siu pork, served as dim sum during yum cha in southern China.",
        "fr": "Petit pain cantonais cuit a la vapeur ou au four, fourre de porc char siu, servi en dim sum lors du yum cha en Chine du Sud."
      },
      "sources": [
        {
          "name": "Cha siu bao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Cha_siu_bao"
        }
      ]
    },
    "lo mai gai": {
      "local": "糯米雞",
      "note": {
        "en": "Cantonese dim sum of glutinous rice filled with chicken, mushroom and Chinese sausage, wrapped in lotus leaf and steamed.",
        "fr": "Dim sum cantonais de riz gluant garni de poulet, champignons et saucisse chinoise, enveloppé dans une feuille de lotus et cuit à la vapeur."
      },
      "sources": [
        {
          "name": "Lo mai gai - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lo_mai_gai"
        },
        {
          "name": "Lo Mai Gai (Dim Sum Sticky Rice Chicken) - Red House Spice",
          "url": "https://redhousespice.com/lo-mai-gai/"
        }
      ]
    },
    "xiao long bao": {
      "local": "小笼包 (xiǎolóngbāo)",
      "note": {
        "en": "Shanghainese steamed soup dumplings filled with pork and melted aspic, originating in 19th-century Nanxiang near Shanghai.",
        "fr": "Raviolis vapeur shanghaiens fourrés au porc et au bouillon en gelée fondu, nés au XIXe siècle à Nanxiang, près de Shanghai."
      },
      "sources": [
        {
          "name": "Wikipedia — Xiaolongbao",
          "url": "https://en.wikipedia.org/wiki/Xiaolongbao"
        },
        {
          "name": "TasteAtlas — Xiaolongbao",
          "url": "https://www.tasteatlas.com/xiaolongbao"
        }
      ]
    },
    "char siu": {
      "local": "叉燒",
      "note": {
        "en": "Cantonese barbecued pork from Guangdong, marinated in sweet-savoury sauce and roasted; the name 叉燒 means \"fork roasted.\"",
        "fr": "Porc grillé cantonais du Guangdong, mariné dans une sauce sucrée-salée et rôti; le nom 叉燒 signifie \"rôti à la fourche.\""
      },
      "sources": [
        {
          "name": "Wikipedia — Char siu",
          "url": "https://en.wikipedia.org/wiki/Char_siu"
        },
        {
          "name": "Michelin Guide — The Evolution of Char Siu",
          "url": "https://guide.michelin.com/en/article/features/iconic-dish-char-siu-history-recommendation"
        }
      ]
    },
    "siu yuk (roast pork belly)": {
      "local": "燒肉",
      "note": {
        "en": "Cantonese roast pork belly, a variety of siu mei roasted meats, made by roasting pork with salt and vinegar at high heat for…",
        "fr": "Poitrine de porc rôtie cantonaise, une variété de viandes rôties siu mei, cuite avec sel et vinaigre à feu vif pour une couenne…"
      },
      "sources": [
        {
          "name": "Siu yuk - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Siu_yuk"
        },
        {
          "name": "Siu mei - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Siu_mei"
        }
      ]
    },
    "roast duck": {
      "local": "燒鴨 (siu1 aap3)",
      "note": {
        "en": "Cantonese roast duck, a whole duck seasoned with five-spice and roasted crisp-skinned; a classic of the siu mei hanging-roasted-meats…",
        "fr": "Canard rôti cantonais, un canard entier assaisonné aux cinq-épices et rôti à peau croustillante; un classique de la tradition siu mei des…"
      },
      "sources": [
        {
          "name": "Siu mei - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Siu_mei"
        },
        {
          "name": "燒鴨 (siu1 aap3) : roast duck - CantoDict",
          "url": "http://www.cantonese.sheik.co.uk/dictionary/words/16144/"
        }
      ]
    },
    "roast goose": {
      "local": "燒鵝",
      "note": {
        "en": "Cantonese siu-mei roast goose: a whole goose seasoned and roasted at high temperature in a charcoal furnace to give crisp skin with juicy…",
        "fr": "Oie rôtie cantonaise (siu mei) : une oie entière assaisonnée et rôtie à haute température dans un four à charbon pour obtenir une peau…"
      },
      "sources": [
        {
          "name": "Roast goose - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Roast_goose"
        },
        {
          "name": "Siu mei - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Siu_mei"
        }
      ]
    },
    "soya sauce chicken": {
      "local": "豉油雞",
      "note": {
        "en": "A Cantonese siu mei dish of whole chicken poached or braised in an aromatic soy-sauce master stock, then chopped and served.",
        "fr": "Plat cantonais de type siu mei : poulet entier poché ou braisé dans un bouillon maître à la sauce soja, puis découpé et servi."
      },
      "sources": [
        {
          "name": "Soy sauce chicken - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Soy_sauce_chicken"
        },
        {
          "name": "Soy sauce chicken (See yao gai) - TasteAtlas",
          "url": "https://www.tasteatlas.com/soy-sauce-chicken"
        }
      ]
    },
    "cantonese steamed fish": {
      "local": "清蒸魚",
      "note": {
        "en": "A whole fish steamed with ginger and scallion, dressed in light soy sauce and hot oil; a Cantonese banquet and Lunar New Year staple.",
        "fr": "Un poisson entier cuit à la vapeur au gingembre et à l'oignon vert, nappé de sauce soja légère et d'huile chaude ; un classique des…"
      },
      "sources": [
        {
          "name": "The Woks of Life - Cantonese Steamed Fish",
          "url": "https://thewoksoflife.com/cantonese-steamed-fish/"
        },
        {
          "name": "SBS Chinese - 年年有餘：清蒸魚",
          "url": "https://www.sbs.com.au/language/chinese/zh-hant/article/chinese-whole-steamed-fish/91o6kvzfp"
        }
      ]
    },
    "cantonese-style claypot rice": {
      "local": "煲仔飯",
      "note": {
        "en": "Cantonese rice cooked in a clay pot over charcoal with meats like sausage, forming a prized crisp scorched-rice crust at the bottom.",
        "fr": "Riz cantonais cuit en pot d'argile sur charbon avec viandes comme la saucisse, formant une croûte croustillante prisée au fond."
      },
      "sources": [
        {
          "name": "Claypot rice - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Claypot_rice"
        },
        {
          "name": "煲仔飯 - Wiktionary",
          "url": "https://en.wiktionary.org/wiki/%E7%85%B2%E4%BB%94%E9%A3%AF"
        }
      ]
    },
    "san lou hor fun": {
      "local": "三捞河粉",
      "note": {
        "en": "A Cantonese-rooted zi char dish of flat rice noodles \"three-tossed\" with sliced fish and bean sprouts, served in a light savoury gravy.",
        "fr": "Plat zi char d'origine cantonaise de nouilles de riz plates \"trois fois sautées\" au poisson tranché et germes de soja, en sauce légère."
      },
      "sources": [
        {
          "name": "Wiktionary — 三撈河粉",
          "url": "https://en.wiktionary.org/wiki/%E4%B8%89%E6%92%88%E6%B2%B3%E7%B2%89"
        },
        {
          "name": "What To Cook Today — San Lau Hor Fun (Three-tossed Flat Rice Noodles)",
          "url": "https://whattocooktoday.com/san-lau-hor-fun.html"
        }
      ]
    },
    "wat tan hor (egg gravy hor fun)": {
      "local": "滑蛋河粉",
      "note": {
        "en": "Cantonese wok-fried flat rice noodles smothered in a silky egg gravy with pork and seafood, a zi char staple in Malaysia and Singapore.",
        "fr": "Nouilles de riz plates cantonaises sautees au wok, nappees d'une sauce onctueuse aux oeufs, porc et fruits de mer, classique des zi char en…"
      },
      "sources": [
        {
          "name": "Taste of Asian Food — Wat Tan Hor",
          "url": "https://tasteasianfood.com/wat-tan-hor/"
        },
        {
          "name": "Malaysian Chinese Kitchen — Wat Tan Hor",
          "url": "https://www.malaysianchinesekitchen.com/wat-tan-hor-cantonese-fried-noodles-silky-egg-sauce/"
        }
      ]
    },
    "beef hor fun (dry-fried ngau hor)": {
      "local": "乾炒牛河",
      "note": {
        "en": "Cantonese stir-fry of flat shahe rice noodles, beef and bean sprouts; the dry-fried (gon chau) style arose when cooks ran out of starch…",
        "fr": "Sauté cantonais de nouilles de riz plates shahe, de bœuf et de germes de soja; le style sauté à sec naquit d'une pénurie de fécule."
      },
      "sources": [
        {
          "name": "Wikipedia — Beef chow fun",
          "url": "https://en.wikipedia.org/wiki/Beef_chow_fun"
        },
        {
          "name": "Wiktionary — 乾炒牛河",
          "url": "https://en.wiktionary.org/wiki/%E4%B9%BE%E7%82%92%E7%89%9B%E6%B2%B3"
        }
      ]
    },
    "yang chow fried rice": {
      "local": "揚州炒飯",
      "note": {
        "en": "Wok-fried rice with mixed proteins like shrimp and char siu pork; named for Yangzhou, it was popularized by Qing official Yi Bingshou.",
        "fr": "Riz sauté au wok avec protéines variées comme crevettes et porc char siu; nommé d'après Yangzhou, popularisé par le mandarin Qing Yi…"
      },
      "sources": [
        {
          "name": "Wikipedia — Yangzhou fried rice",
          "url": "https://en.wikipedia.org/wiki/Yangzhou_fried_rice"
        }
      ]
    },
    "sweet & sour pork (gu lou yuk)": {
      "local": "咕嚕肉",
      "note": {
        "en": "Cantonese dish of batter-coated, deep-fried pork tossed in a sweet-and-sour sauce; it originated in Cantonese cuisine in 18th-century…",
        "fr": "Plat cantonais de porc enrobé de pâte, frit puis enrobé d'une sauce aigre-douce ; né dans la cuisine cantonaise du Guangdong au XVIIIe…"
      },
      "sources": [
        {
          "name": "Wikipedia — Sweet and sour pork",
          "url": "https://en.wikipedia.org/wiki/Sweet_and_sour_pork"
        },
        {
          "name": "Wiktionary — 咕嚕肉",
          "url": "https://en.wiktionary.org/wiki/%E5%92%95%E5%9A%95%E8%82%89"
        }
      ]
    },
    "claypot frog leg porridge": {
      "local": "砂煲田雞粥",
      "note": {
        "en": "A Singaporean-Cantonese congee of American bullfrog legs with ginger and scallion, simmered in a claypot; its Geylang late-night supper…",
        "fr": "Un congee sino-cantonais de Singapour, aux cuisses de grenouille-taureau américaine, gingembre et oignon vert, mijotées en marmite d'argile…"
      },
      "sources": [
        {
          "name": "Michelin Guide — Eminent Frog Porridge & Seafood (Lor 19), Singapore",
          "url": "https://guide.michelin.com/en/singapore-region/singapore/restaurant/eminent-frog-porridge-seafood-lor-19"
        },
        {
          "name": "HungryGoWhere — 15 places to get frog porridge in Singapore",
          "url": "https://hungrygowhere.com/what-to-eat/frog-porridge-singapore/"
        }
      ]
    },
    "cantonese double-boiled soup (lou foh tong)": {
      "local": "老火湯",
      "note": {
        "en": "Cantonese \"old fire soup,\" a clear broth of meat, bones and herbs simmered slowly for hours; a Guangzhou daily staple by the late Qing era.",
        "fr": "\"Soupe au vieux feu\" cantonaise, un bouillon clair de viande, d'os et d'herbes mijoté des heures; aliment quotidien de Canton dès la fin…"
      },
      "sources": [
        {
          "name": "Wikipedia – Lou fo tong",
          "url": "https://en.wikipedia.org/wiki/Lou_fo_tong"
        },
        {
          "name": "Sixth Tone – Slow Soup for You: 'Lo Foh Tong'",
          "url": "https://www.sixthtone.com/news/1005130"
        }
      ]
    },
    "fish maw soup": {
      "local": "花膠湯",
      "note": {
        "en": "A collagen-rich Cantonese banquet soup made from dried fish swim bladder, one of the \"four sea treasures\" served at weddings and New Year.",
        "fr": "Soupe cantonaise de banquet riche en collagène à base de vessie natatoire de poisson séchée, l'un des \"quatre trésors de la mer\"."
      },
      "sources": [
        {
          "name": "Fish maw - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Fish_maw"
        },
        {
          "name": "Four sea delicacies - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Four_sea_delicacies"
        }
      ]
    },
    "cantonese seafood platter": {
      "local": "粵式海鮮拼盤",
      "note": {
        "en": "A banquet-style assorted platter of fresh prawns, scallops and fish, typically steamed Cantonese-style with light seasoning, reflecting…",
        "fr": "Plateau assorti de style banquet, avec crevettes, coquilles Saint-Jacques et poisson frais, generalement cuits a la vapeur facon cantonaise…"
      },
      "sources": [
        {
          "name": "Cantonese cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Cantonese_cuisine"
        },
        {
          "name": "Guangdong Seafood Dishes: Best Recipes & Restaurants - TasteAtlas",
          "url": "https://www.tasteatlas.com/guangdong/seafood"
        }
      ]
    },
    "har lok (prawns in shell)": {
      "local": "干煎虾碌",
      "note": {
        "en": "Cantonese dish of whole shell-on prawns dry-fried then tossed in a ketchup-and-Worcestershire sauce; a festive centrepiece before cereal…",
        "fr": "Plat cantonais de crevettes entieres en carapace, poelees a sec puis enrobees d'une sauce ketchup-Worcestershire; un classique festif…"
      },
      "sources": [
        {
          "name": "KitchenTigress — Har Lok (Dry-Fried Prawns)",
          "url": "https://kitchentigress.com/har-lok/"
        },
        {
          "name": "Huang Kitchen — Dry Fried Prawns (Har Lok) 干煎虾碌",
          "url": "https://huangkitchen.com/dry-fried-prawns/"
        }
      ]
    },
    "egg tart (dan tat)": {
      "local": "蛋撻 (daahn tāat)",
      "note": {
        "en": "A Cantonese custard tart of egg filling in a flaky or shortcrust shell, derived from the English custard tart and first sold in 1920s…",
        "fr": "Tartelette cantonaise à la crème d'œufs en pâte feuilletée ou sablée, dérivée de la tarte anglaise et vendue dès les années 1920 à Canton."
      },
      "sources": [
        {
          "name": "Egg tart - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Egg_tart"
        },
        {
          "name": "蛋撻 - Wiktionary",
          "url": "https://en.wiktionary.org/wiki/%E8%9B%8B%E6%92%BB"
        }
      ]
    },
    "cantonese chrysanthemum tea": {
      "local": "菊花茶 (gūk fā chàh)",
      "note": {
        "en": "A floral infusion of dried chrysanthemum flowers, popularized in the Song dynasty and served as a cooling drink at Cantonese yum cha.",
        "fr": "Une infusion florale de fleurs de chrysanthème séchées, popularisée sous la dynastie Song et servie comme boisson rafraîchissante au yum…"
      },
      "sources": [
        {
          "name": "Chrysanthemum tea - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Chrysanthemum_tea"
        },
        {
          "name": "菊花茶 (chrysanthemum tea) - Learn Cantonese",
          "url": "https://gocantonese.com/dimsum/dishes/chrysanthemum-tea"
        }
      ]
    },
    "herbal jelly (gui ling gao)": {
      "local": "龜苓膏 (guīlínggāo)",
      "note": {
        "en": "A bittersweet dark jelly from Wuzhou, Guangxi, traditionally set from golden-coin turtle plastron and herbs like Smilax glabra.",
        "fr": "Une gelée brune douce-amère de Wuzhou, au Guangxi, faite traditionnellement de plastron de tortue boîte et d'herbes comme le Smilax glabra."
      },
      "sources": [
        {
          "name": "Guilinggao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Guilinggao"
        },
        {
          "name": "Tasting Table - Guilinggao",
          "url": "https://www.tastingtable.com/1379745/guilinggao-chinese-medicine-popular-dessert/"
        }
      ]
    },
    "mango pomelo sago": {
      "local": "楊枝甘露",
      "note": {
        "en": "A cold Cantonese dessert of mango, pomelo, sago and coconut milk, created by Hong Kong's Lei Garden restaurant in 1984.",
        "fr": "Un dessert cantonais froid de mangue, pomelo, sagou et lait de coco, créé par le restaurant Lei Garden de Hong Kong en 1984."
      },
      "sources": [
        {
          "name": "Wikipedia — Mango pomelo sago",
          "url": "https://en.wikipedia.org/wiki/Mango_pomelo_sago"
        },
        {
          "name": "The World of Chinese — Behind the Name of an Immortal Hong Kong Dessert",
          "url": "https://www.theworldofchinese.com/2021/07/behind-the-name-of-an-immortal-hong-kong-dessert/"
        }
      ]
    },
    "tau huay (douhua)": {
      "local": "豆花 (豆腐花)",
      "note": {
        "en": "A soft silken-tofu pudding dating to the Han dynasty, served in Cantonese style sweet with ginger or sugar syrup.",
        "fr": "Un flan de tofu soyeux remontant à la dynastie Han, servi à la cantonaise, sucré au sirop de gingembre ou de sucre."
      },
      "sources": [
        {
          "name": "Douhua - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Douhua"
        }
      ]
    },
    "cheong fun": {
      "local": "腸粉",
      "note": {
        "en": "A Cantonese dim sum from Guangdong: a thin steamed rice-flour sheet rolled, often around shrimp, beef or char siu.",
        "fr": "Un dim sum cantonais du Guangdong : une fine feuille de farine de riz vapeur roulée, souvent autour de crevettes, bœuf ou char siu."
      },
      "sources": [
        {
          "name": "Rice noodle roll - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Rice_noodle_roll"
        },
        {
          "name": "What is cheung fun? - South China Morning Post",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/3318414/what-cheung-fun-different-types-chinese-rice-noodle-rolls-and-how-make-them"
        }
      ]
    },
    "cantonese-style steamed prawns": {
      "local": "蒜蓉粉絲蒸蝦",
      "note": {
        "en": "Classic Cantonese dish of whole prawns topped with minced garlic and steamed over mung-bean vermicelli; auspicious as \"ha\" (prawn) sounds…",
        "fr": "Plat cantonais classique de crevettes entieres a l'ail haché, cuites a la vapeur sur des vermicelles de soja; auspicieux car \"ha\"…"
      },
      "sources": [
        {
          "name": "Red House Spice — Steamed Garlic Prawns with Vermicelli",
          "url": "https://redhousespice.com/steamed-garlic-prawns/"
        },
        {
          "name": "Made With Lau — Steamed Garlic Shrimp on Vermicelli",
          "url": "https://www.madewithlau.com/recipes/steamed-garlic-shrimp"
        }
      ]
    }
  },
  "sichuan": {
    "mapo tofu": {
      "local": "麻婆豆腐 (mápó dòufu)",
      "note": {
        "en": "Spicy Sichuan dish of soft tofu in chili-bean and Sichuan-peppercorn sauce, created in 1860s Chengdu by pockmarked \"Mapo\" Mrs Chen.",
        "fr": "Plat sichuanais épicé de tofu soyeux en sauce piment-fève et poivre du Sichuan, créé vers 1860 à Chengdu par la grêlée « Mapo » Mme Chen."
      },
      "sources": [
        {
          "name": "Wikipedia — Mapo tofu",
          "url": "https://en.wikipedia.org/wiki/Mapo_tofu"
        },
        {
          "name": "The World of Chinese — A Classic Dish: Mapo Tofu",
          "url": "https://www.theworldofchinese.com/2015/09/mapo-tofu/"
        }
      ]
    },
    "kung pao chicken (gong bao ji ding)": {
      "local": "宫保鸡丁 (Gōngbǎo jīdīng)",
      "note": {
        "en": "Spicy Sichuan stir-fry of diced chicken, peanuts, dried chili and Sichuan pepper, named after Qing governor Ding Baozhen (1820–1886).",
        "fr": "Sauté sichuanais épicé de poulet en dés, cacahuètes et piments, nommé d'après le gouverneur Qing Ding Baozhen (1820–1886)."
      },
      "sources": [
        {
          "name": "Kung Pao chicken - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kung_Pao_chicken"
        },
        {
          "name": "Kung Pao Chicken (Gong Bao Ji Ding) - Chinese Food Wiki",
          "url": "https://www.chinesefoodwiki.org/Kung_Pao_Chicken"
        }
      ]
    },
    "twice-cooked pork (hui guo rou)": {
      "local": "回锅肉 (huíguōròu)",
      "note": {
        "en": "A Sichuan dish of pork belly first simmered whole, then sliced and stir-fried with chili bean paste, so the meat is \"returned to the wok.\"",
        "fr": "Plat du Sichuan de poitrine de porc d'abord mijotée entière, puis tranchée et sautée avec de la pâte de piment, la viande étant ainsi «…"
      },
      "sources": [
        {
          "name": "Wikipedia — Twice-cooked pork",
          "url": "https://en.wikipedia.org/wiki/Twice-cooked_pork"
        },
        {
          "name": "The Mala Market — Sichuan Twice-Cooked Pork (Huiguo Rou)",
          "url": "https://blog.themalamarket.com/chengdu-challenge-8-twice-cooked-pork-hui-guo-rou/"
        }
      ]
    },
    "dan dan noodles": {
      "local": "担担面 (擔擔麵)",
      "note": {
        "en": "Sichuan street-food noodle dish from Chengdu, served with thin wheat noodles in a spicy chili-oil (mala) sauce with Sichuan pepper, minced…",
        "fr": "Plat de nouilles de rue du Sichuan, originaire de Chengdu : nouilles de blé fines dans une sauce piquante à l'huile de piment (mala), avec…"
      },
      "sources": [
        {
          "name": "Wikipedia — Dandan noodles",
          "url": "https://en.wikipedia.org/wiki/Dandan_noodles"
        },
        {
          "name": "Wiktionary — 擔擔麵",
          "url": "https://en.wiktionary.org/wiki/%E6%93%94%E6%93%94%E9%BA%B5"
        }
      ]
    },
    "sichuan hot pot": {
      "local": "四川火锅 (Sìchuān huǒguō)",
      "note": {
        "en": "A communal simmering broth dish flavored with numbing-spicy málà (Sichuan peppercorn and chili), rooted in early-20th-century Yangtze River…",
        "fr": "Un plat de bouillon mijoté à partager, parfumé au málà (poivre du Sichuan et piment), né au début du XXe siècle chez les ouvriers du fleuve…"
      },
      "sources": [
        {
          "name": "Wikipedia — Chongqing hot pot",
          "url": "https://en.wikipedia.org/wiki/Chongqing_hot_pot"
        },
        {
          "name": "Wikipedia — Hot pot",
          "url": "https://en.wikipedia.org/wiki/Hot_pot"
        }
      ]
    }
  }
};

module.exports = { CLASSIC_NOTES, CUISINE_NOTES };
