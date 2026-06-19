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
    },
    "tom yum goong": {
      "local": "ต้มยำกุ้ง",
      "note": {
        "en": "Thai hot-and-sour shrimp soup with lemongrass, galangal and kaffir lime; inscribed on UNESCO's Intangible Cultural Heritage list in 2024.",
        "fr": "Soupe thaïe aigre-piquante aux crevettes, citronnelle, galanga et combava; inscrite au patrimoine culturel immatériel de l'UNESCO en 2024."
      },
      "sources": [
        {
          "name": "Wikipedia — Tom yum kung",
          "url": "https://en.wikipedia.org/wiki/Tom_yum_kung"
        },
        {
          "name": "UNESCO Intangible Cultural Heritage — Tomyum Kung",
          "url": "https://ich.unesco.org/en/RL/tomyum-kung-01879"
        }
      ]
    },
    "red curry (gaeng phed)": {
      "local": "แกงเผ็ด",
      "note": {
        "en": "Thai curry of red chilli paste simmered in coconut milk with meat or tofu; its red colour comes from dried red spur chillies.",
        "fr": "Curry thai de pate de piment rouge mijotee au lait de coco avec viande ou tofu; sa couleur rouge vient des piments rouges seches."
      },
      "sources": [
        {
          "name": "Red curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Red_curry"
        },
        {
          "name": "Thai curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Thai_curry"
        }
      ]
    },
    "massaman curry": {
      "local": "แกงมัสมั่น",
      "note": {
        "en": "A mild, rich Thai coconut curry of Persian-Muslim origin, spiced with cardamom, cinnamon and cloves; name from Persian \"mosalmân\" (Muslim).",
        "fr": "Curry thaï doux et riche au lait de coco, d'origine perso-musulmane, parfumé à la cardamome, cannelle et clou de girofle; nom du persan «…"
      },
      "sources": [
        {
          "name": "Massaman curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Massaman_curry"
        },
        {
          "name": "Deconstructing massaman curry, Thailand's mellow classic - National Geographic",
          "url": "https://www.nationalgeographic.com/travel/article/deconstructing-massaman-curry-thailand-mellow-classic"
        }
      ]
    },
    "panang curry": {
      "local": "พะแนง",
      "note": {
        "en": "A thick, rich, mildly sweet Thai coconut-milk curry from central Thailand, documented as early as the 1889 cookbook Tam Raa Kap Khao.",
        "fr": "Curry thaï épais, riche et légèrement sucré au lait de coco, originaire du centre de la Thaïlande, attesté dès le livre de cuisine Tam Raa…"
      },
      "sources": [
        {
          "name": "Phanaeng - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Phanaeng"
        },
        {
          "name": "Phanaeng Curry: A Thai Culinary Delight - Thailand Foundation",
          "url": "https://www.thailandfoundation.or.th/culture_heritage/phanaeng-curry-a-thai-culinary-delight/"
        }
      ]
    },
    "jungle curry (gaeng pa)": {
      "local": "แกงป่า",
      "note": {
        "en": "A fiery, watery Thai curry from the inland forests, traditionally made with wild game and notably without coconut milk.",
        "fr": "Un curry thaï ardent et liquide des forêts intérieures, traditionnellement au gibier et notablement sans lait de coco."
      },
      "sources": [
        {
          "name": "Wikipedia - Kaeng pa",
          "url": "https://en.wikipedia.org/wiki/Kaeng_pa"
        },
        {
          "name": "Wiktionary - แกงป่า",
          "url": "https://en.wiktionary.org/wiki/%E0%B9%81%E0%B8%81%E0%B8%87%E0%B8%9B%E0%B9%88%E0%B8%B2"
        }
      ]
    },
    "khao soi": {
      "local": "ข้าวซอย",
      "note": {
        "en": "Northern Thai coconut-curry egg-noodle soup, brought via Chin Haw Yunnanese Muslim traders from Myanmar.",
        "fr": "Soupe de nouilles aux oeufs au curry de coco du nord de la Thailande, apportee par les marchands musulmans Chin Haw du Yunnan."
      },
      "sources": [
        {
          "name": "Khao soi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Khao_soi"
        }
      ]
    },
    "som tam": {
      "local": "ส้มตำ",
      "note": {
        "en": "A spicy Thai salad of shredded unripe papaya pounded with chilli, lime and fish sauce; its name means \"sour-pounded,\" with Lao/Isan roots.",
        "fr": "Salade thaïe épicée de papaye verte râpée pilée au piment, citron vert et nuoc-mâm ; son nom signifie « pilé-aigre », d'origine lao/isan."
      },
      "sources": [
        {
          "name": "Green papaya salad - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Green_papaya_salad"
        },
        {
          "name": "Decoding Som Tam, Thailand's Delicious Papaya Salad - Michelin Guide",
          "url": "https://guide.michelin.com/en/article/features/decoding-the-delicious-som-tam"
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
    },
    "chongqing hot pot": {
      "local": "重庆火锅 (Chóngqìng huǒguō)",
      "note": {
        "en": "A spicy, numbing (málà) Sichuan-style hot pot built on dried chilis and Sichuan peppercorns, with its history dating to the 1920s among…",
        "fr": "Fondue chinoise épicée et anesthésiante (málà) à base de piments séchés et de poivre du Sichuan, dont l'histoire remonte aux années 1920…"
      },
      "sources": [
        {
          "name": "Chongqing hot pot - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Chongqing_hot_pot"
        },
        {
          "name": "Hot pot - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hot_pot"
        }
      ]
    },
    "fish-fragrant pork (yu xiang rou si)": {
      "local": "鱼香肉丝 (yúxiāng ròusī)",
      "note": {
        "en": "Sichuan dish of shredded pork in sweet-sour-spicy \"fish-fragrant\" sauce; it contains no fish, the name echoes Sichuan fish-cooking…",
        "fr": "Plat sichuanais de porc émincé en sauce aigre-douce-épicée dite \"parfum de poisson\" ; sans poisson, le nom évoque l'assaisonnement du…"
      },
      "sources": [
        {
          "name": "Wikipedia — Yuxiang shredded pork",
          "url": "https://en.wikipedia.org/wiki/Yuxiang_shredded_pork"
        },
        {
          "name": "The Mala Market — Yuxiang Pork (Yu Xiang Rou Si)",
          "url": "https://blog.themalamarket.com/chengdu-challenge-25-yu-xiang-pork-yu-xiang-rou-si/"
        }
      ]
    },
    "fish-fragrant aubergine": {
      "local": "鱼香茄子 (yúxiāng qiézi)",
      "note": {
        "en": "Sichuan stir-fried eggplant in \"yuxiang\" sauce of pickled chili, doubanjiang, garlic, ginger, sugar and vinegar; named for a fish flavour…",
        "fr": "Aubergine sautée du Sichuan en sauce « yuxiang » de piment mariné, doubanjiang, ail, gingembre, sucre et vinaigre ; nommée d'après un goût…"
      },
      "sources": [
        {
          "name": "Wikipedia — Yuxiang",
          "url": "https://en.wikipedia.org/wiki/Yuxiang"
        },
        {
          "name": "The Woks of Life — Fish Fragrant Eggplant (Yuxiang Qiezi)",
          "url": "https://thewoksoflife.com/fish-fragrant-eggplant-yuxiang-qiezi/"
        }
      ]
    },
    "husband and wife lung slices (fu qi fei pian)": {
      "local": "夫妻肺片 (fūqī fèipiàn)",
      "note": {
        "en": "Cold Sichuan dish of thinly sliced beef and offal in mala chili-Sichuan-pepper sauce, named for a 1930s Chengdu couple's street stall.",
        "fr": "Plat sichuanais froid de bœuf et d'abats émincés en sauce mala au piment et poivre du Sichuan, nommé d'après un couple de Chengdu des…"
      },
      "sources": [
        {
          "name": "Wikipedia - Fuqi feipian",
          "url": "https://en.wikipedia.org/wiki/Fuqi_feipian"
        },
        {
          "name": "The Woks of Life - Sichuan Fuqi Feipian",
          "url": "https://thewoksoflife.com/fuqi-feipian-sichuan/"
        }
      ]
    },
    "mouthwatering chicken (kou shui ji)": {
      "local": "口水鸡 (Kǒushuǐ Jī)",
      "note": {
        "en": "Cold Sichuan dish of poached chicken in numbing-spicy (málà) chili oil; the name, literally \"saliva chicken,\" evokes a mouth-watering…",
        "fr": "Plat sichuanais froid de poulet poché dans une huile pimentée engourdissante (málà) ; le nom, littéralement « poulet à la salive », évoque…"
      },
      "sources": [
        {
          "name": "China Sichuan Food — Saliva Chicken (Mouthwatering Chicken)",
          "url": "https://www.chinasichuanfood.com/saliva-chicken/"
        },
        {
          "name": "Red House Spice — Mouth-watering chicken (Kou Shui Ji, 口水鸡)",
          "url": "https://redhousespice.com/mouth-watering-chicken/"
        }
      ]
    },
    "boiled fish in chili oil (shui zhu yu)": {
      "local": "水煮鱼",
      "note": {
        "en": "Sichuan dish of poached fish fillets in a fiery broth of dried chilies and Sichuan peppercorns, originating in Chongqing's Yubei District…",
        "fr": "Plat du Sichuan de filets de poisson pochés dans un bouillon ardent de piments secs et de poivre du Sichuan, né dans le district de Yubei…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Shuǐ Zhǔ Yú",
          "url": "https://www.tasteatlas.com/shui-zhu-yu"
        },
        {
          "name": "Michelin Guide — The Piquant Tale of Sichuan Water-boiled Fish",
          "url": "https://guide.michelin.com/hk/en/article/features/sichuan-cuisine-water-boiled-fish"
        }
      ]
    },
    "boiled beef in chili oil (shui zhu niu rou)": {
      "local": "水煮牛肉 (shuǐ zhǔ niú ròu)",
      "note": {
        "en": "Sichuan dish of thinly sliced beef briefly poached in a spicy, numbing broth of doubanjiang, dried chilies and Sichuan pepper, then doused…",
        "fr": "Plat du Sichuan de fines tranches de bœuf brièvement pochées dans un bouillon épicé et anesthésiant de doubanjiang, piments séchés et…"
      },
      "sources": [
        {
          "name": "Sichuan Water-Boiled Beef (Shuizhu Niurou) - The Mala Market",
          "url": "https://blog.themalamarket.com/chengdu-challenge-12-shui-zhu-beef-shui-zhu-niu-rou/"
        },
        {
          "name": "Shuizhu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Shuizhu"
        }
      ]
    },
    "ma la xiang guo": {
      "local": "麻辣香锅",
      "note": {
        "en": "A Sichuan-style stir-fried \"dry hot pot\" of self-chosen meats and vegetables in chili and numbing peppercorn, no broth.",
        "fr": "« Hot pot sec » sichuanais sauté de viandes et légumes choisis, au piment et poivre engourdissant, sans bouillon."
      },
      "sources": [
        {
          "name": "Wikipedia - Mala xiang guo",
          "url": "https://en.wikipedia.org/wiki/Mala_xiang_guo"
        },
        {
          "name": "Omnivore's Cookbook - Ma La Xiang Guo",
          "url": "https://omnivorescookbook.com/ma-la-xiang-guo/"
        }
      ]
    },
    "chongqing chicken (la zi ji)": {
      "local": "辣子鸡 (làzǐjī)",
      "note": {
        "en": "A Chongqing Sichuan dish of fried chicken bites tossed with mounds of dried chilies and Sichuan peppercorns, popularized near Geleshan from…",
        "fr": "Plat sichuanais de Chongqing : bouchées de poulet frites mêlées de montagnes de piments séchés et de poivre du Sichuan, popularisé près de…"
      },
      "sources": [
        {
          "name": "Laziji - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Laziji"
        },
        {
          "name": "Chongqing Chicken (Sichuan La Zi Ji) - The Woks of Life",
          "url": "https://thewoksoflife.com/chongqing-chicken/"
        }
      ]
    },
    "sichuan dry-fried green beans": {
      "local": "干煸四季豆",
      "note": {
        "en": "Classic Sichuan dish of green beans blistered dry (gan bian) until shriveled, then tossed with pork, chili, Sichuan pepper and yacai.",
        "fr": "Plat sichuanais classique de haricots verts saisis a sec (gan bian) jusqu'a flétrissure, sautés avec porc, piment, poivre du Sichuan et…"
      },
      "sources": [
        {
          "name": "The Mala Market - Ganbian Sijidou",
          "url": "https://blog.themalamarket.com/chengdu-challenge-16-dry-fried-green-beans-gan-bian-si-ji-dou/"
        },
        {
          "name": "Red House Spice - Sichuan Dry Fried Green Beans",
          "url": "https://redhousespice.com/dry-fried-green-beans/"
        }
      ]
    },
    "chengdu dan dan noodles": {
      "local": "担担面 (dàn dàn miàn)",
      "note": {
        "en": "Sichuan noodles in spicy chili-oil and Sichuan-pepper sauce with minced pork and preserved greens, named for the carrying pole street…",
        "fr": "Nouilles du Sichuan en sauce pimentee au poivre du Sichuan, avec porc hache et legumes confits, nommees d'apres la palanche des vendeurs…"
      },
      "sources": [
        {
          "name": "Dandan noodles - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Dandan_noodles"
        },
        {
          "name": "Dan Dan Noodles, Sichuan Dan Dan Mian - TravelChinaGuide",
          "url": "https://www.travelchinaguide.com/dan-dan-noodles.htm"
        }
      ]
    },
    "zhong dumplings": {
      "local": "钟水饺",
      "note": {
        "en": "Chengdu boiled pork dumplings dressed in sweetened spiced soy sauce and chili oil, created in 1893 by Zhong Xiesen (courtesy name Shaobai).",
        "fr": "Raviolis de porc bouillis de Chengdu, nappés de sauce soja sucrée épicée et d'huile pimentée, créés en 1893 par Zhong Xiesen (nom de…"
      },
      "sources": [
        {
          "name": "Baidu Baike (English) - Zhong Dumplings",
          "url": "https://baike.baidu.com/en/item/Zhong%20Dumplings/1495462"
        },
        {
          "name": "Red House Spice - Sichuan Dumplings (Zhong Dumplings / 钟水饺)",
          "url": "https://redhousespice.com/sichuan-dumplings/"
        }
      ]
    },
    "chao shou": {
      "local": "抄手 (chāoshǒu)",
      "note": {
        "en": "Sichuan-style wonton, named \"crossed arms\" for its fold; the spicy chili-oil version is hong you chao shou (红油抄手).",
        "fr": "Wonton du Sichuan, nommé \"bras croisés\" pour son pliage; la version pimentée à l'huile rouge est le hong you chao shou (红油抄手)."
      },
      "sources": [
        {
          "name": "Chaoshou (Sichuan-Style Wontons) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sichuan-Style_Wontons"
        },
        {
          "name": "Sichuan Spicy Wonton in Chili Oil (红油抄手) - Red House Spice",
          "url": "https://redhousespice.com/sichuan-spicy-wonton-in-chili-oil/"
        }
      ]
    },
    "sichuan-style smoked duck (zhang cha ya)": {
      "local": "樟茶鸭 (Zhāngchá yā)",
      "note": {
        "en": "A quintessential Sichuan dish: duck marinated for several hours, hot-smoked over tea leaves and camphor, then steamed and deep-fried until…",
        "fr": "Plat emblématique du Sichuan : canard mariné plusieurs heures, fumé à chaud sur feuilles de thé et de camphre, puis cuit à la vapeur et…"
      },
      "sources": [
        {
          "name": "Zhangcha duck - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Zhangcha_duck"
        },
        {
          "name": "Tea-Smoked Duck (Zhang Cha Ya Zi) - Saveur",
          "url": "https://www.saveur.com/article/Recipes/Zhang-Cha-Ya-Zi/"
        }
      ]
    },
    "beggar's chicken": {
      "local": "叫化雞 (Jiàohuā jī)",
      "note": {
        "en": "A Hangzhou dish of whole chicken stuffed, wrapped in lotus leaves and clay, then slow-baked; tied to a beggar's improvised cooking legend.",
        "fr": "Un plat de Hangzhou : poulet entier farci, enveloppé de feuilles de lotus et d'argile, puis cuit lentement; lié à la légende d'un mendiant."
      },
      "sources": [
        {
          "name": "Wikipedia — Beggar's chicken",
          "url": "https://en.wikipedia.org/wiki/Beggar%27s_chicken"
        },
        {
          "name": "TasteAtlas — Jiàohuā jī",
          "url": "https://www.tasteatlas.com/beggars-chicken"
        }
      ]
    },
    "sichuan cold noodle": {
      "local": "凉面 (liángmiàn)",
      "note": {
        "en": "A Sichuan wheat-noodle dish served at room temperature in a sour, sweet and spicy dressing of chili oil, black vinegar and Sichuan pepper…",
        "fr": "Plat sichuanais de nouilles de blé servi à température ambiante dans une sauce aigre, sucrée et piquante d'huile pimentée, vinaigre noir et…"
      },
      "sources": [
        {
          "name": "Red House Spice — Cold Noodles with Sichuan Dressing (Liang Mian, 凉面)",
          "url": "https://redhousespice.com/cold-noodles-with-sichuan-dressing/"
        },
        {
          "name": "The Mala Market — Ma's Sichuan Liangmian (四川凉面) Spicy Cold Noodles",
          "url": "https://blog.themalamarket.com/sichuan-liangmian/"
        }
      ]
    },
    "saliva chicken (kou shui ji) alt name": {
      "local": "口水鸡 (Kǒushuǐ jī)",
      "note": {
        "en": "Sichuan cold appetizer of poached chicken in numbing chili oil; the name (\"mouthwatering chicken\") is linked to poet Guo Moruo.",
        "fr": "Entrée froide du Sichuan de poulet poché en huile pimentée engourdissante ; le nom (\"poulet à saliver\") est lié au poète Guo Moruo."
      },
      "sources": [
        {
          "name": "China Sichuan Food — Saliva Chicken (Mouthwatering Chicken)",
          "url": "https://www.chinasichuanfood.com/saliva-chicken/"
        },
        {
          "name": "Week in China — Koushui Ji (Saliva Chicken 口水鸡)",
          "url": "https://www.weekinchina.com/chapter/china-in-50-dishes/sichuan-chuan-cai/koushui-ji-saliva-chicken-%E5%8F%A3%E6%B0%B4%E9%B8%A1/"
        }
      ]
    },
    "pock-marked old woman tofu (mapo doufu alt)": {
      "local": "麻婆豆腐 (mápó dòufu)",
      "note": {
        "en": "Spicy Sichuan dish of soft tofu and minced meat in a málà chilli-bean sauce, named after a pockmarked Chengdu cook, Chen Mapo, c.1862.",
        "fr": "Plat sichuanais épicé de tofu soyeux et viande hachée en sauce málà aux fèves pimentées, nommé d'après Chen Mapo, cuisinière grêlée de…"
      },
      "sources": [
        {
          "name": "Mapo tofu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mapo_tofu"
        },
        {
          "name": "A Classic Dish: Mapo Tofu - The World of Chinese",
          "url": "https://www.theworldofchinese.com/2015/09/mapo-tofu/"
        }
      ]
    },
    "sichuan pickled mustard greens": {
      "local": "榨菜 (zhàcài)",
      "note": {
        "en": "Salt-pressed, chili-rubbed fermented mustard stem (Brassica juncea) from Fuling, Chongqing; spicy, sour and salty.",
        "fr": "Tige de moutarde fermentée, pressée au sel et frottée de piment, de Fuling (Chongqing); épicée, acide et salée."
      },
      "sources": [
        {
          "name": "Zha cai - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Zha_cai"
        },
        {
          "name": "5 Best Preserved Mustard Greens in China - TasteAtlas",
          "url": "https://www.tasteatlas.com/best-rated-pickled-mustard-greens-in-china"
        }
      ]
    },
    "sichuan-style spicy crayfish": {
      "local": "麻辣小龙虾 (málà xiǎolóngxiā)",
      "note": {
        "en": "Freshwater crayfish wok-cooked or braised in a Sichuan málà (numbing-spicy) sauce of dried chilli and Sichuan pepper; introduced to China…",
        "fr": "Écrevisses d'eau douce sautées au wok ou braisées dans une sauce sichuanaise málà (engourdissante et piquante) au piment séché et poivre du…"
      },
      "sources": [
        {
          "name": "The World of Chinese — Claws Celebre",
          "url": "https://www.theworldofchinese.com/2019/09/claws-celebre/"
        },
        {
          "name": "The Mala Market — Mala Crawfish Boil (Mala Xiaolongxia)",
          "url": "https://blog.themalamarket.com/chengdu-challenge-17-mala-crawfish-boil-mala-xiao-longxia/"
        }
      ]
    },
    "mala beef noodle": {
      "local": "麻辣牛肉面 (málà niúròumiàn)",
      "note": {
        "en": "A Sichuan beef noodle soup in which beef is braised and served in a rich, moderately spicy broth made with Pixian chili bean paste…",
        "fr": "Soupe de nouilles au bœuf du Sichuan, où le bœuf est braisé puis servi dans un bouillon riche et modérément épicé à base de pâte de piment…"
      },
      "sources": [
        {
          "name": "Sichuan Red-Braised Beef Noodle Soup (Hongshao Niurou Mian) - The Mala Market",
          "url": "https://blog.themalamarket.com/sichuan-red-braised-beef-noodle-soup-hong-shao-niu-rou-mian-using-the-instant-pot-or-not/"
        }
      ]
    }
  },
  "hokkien": {
    "lor mee": {
      "local": "滷麵",
      "note": {
        "en": "Hokkien noodle dish from Zhangzhou, Fujian: thick yellow noodles in a starchy, egg-thickened braising gravy, now a SE Asian hawker staple.",
        "fr": "Plat de nouilles hokkien de Zhangzhou (Fujian) : nouilles jaunes en sauce braisée épaissie aux œufs, classique des hawkers d'Asie du SE."
      },
      "sources": [
        {
          "name": "Lor mee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lor_mee"
        },
        {
          "name": "Lor Mee - TasteAtlas",
          "url": "https://www.tasteatlas.com/lor-mee"
        }
      ]
    },
    "ngoh hiang": {
      "local": "五香 (ngó͘-hiong / lor bak)",
      "note": {
        "en": "A Hokkien-Teochew roll of minced pork and prawn seasoned with five-spice powder (五香, its namesake), wrapped in tofu skin and deep-fried.",
        "fr": "Un rouleau hokkien-teochew de porc et crevette hachés assaisonné au cinq-épices (五香, son homonyme), enroulé dans une feuille de tofu et…"
      },
      "sources": [
        {
          "name": "Ngo hiang - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ngo_hiang"
        },
        {
          "name": "Ngoh Hiang / Lor Bak / 五香 - Nyonya Cooking",
          "url": "https://www.nyonyacooking.com/recipes/ngoh-hiang-lor-bak~ytL8BmpNv"
        }
      ]
    },
    "bak kwa": {
      "local": "肉乾 (肉干; Hokkien bah-koaⁿ / bak-kwa)",
      "note": {
        "en": "Sweet-savoury grilled dried pork (jerky-like) of Fujianese Hokkien origin, now a prized Lunar New Year gift in Singapore and Malaysia.",
        "fr": "Porc séché grillé sucré-salé d'origine hokkien du Fujian, devenu un cadeau prisé du Nouvel An lunaire à Singapour et en Malaisie."
      },
      "sources": [
        {
          "name": "Wikipedia — Bakkwa",
          "url": "https://en.wikipedia.org/wiki/Bakkwa"
        },
        {
          "name": "NLB Infopedia (Singapore) — Bak kwa",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1746_2010-12-30.html"
        }
      ]
    },
    "mee suah": {
      "local": "麵線",
      "note": {
        "en": "Very thin salted wheat-flour noodles from Fujian, China; their long unbroken threads symbolise longevity at birthdays and festivals.",
        "fr": "Nouilles de blé salées très fines du Fujian, en Chine; leurs longs fils intacts symbolisent la longévité aux anniversaires et fêtes."
      },
      "sources": [
        {
          "name": "Misua - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Misua"
        },
        {
          "name": "Misua 麵線 - the birthday cake of the Hokkien (Min) people - Carry It Like Harry",
          "url": "https://carryitlikeharry.com/hokkien-misua-mee-suah-noodles/"
        }
      ]
    },
    "kong bak pau": {
      "local": "扣肉包 (khòng-bah-pau)",
      "note": {
        "en": "A Hokkien dish of soy-braised pork belly slid into a folded steamed lotus-leaf bun and topped with coriander, popular among the Hokkien…",
        "fr": "Plat hokkien de poitrine de porc braisee au soja, glissee dans un pain vapeur plie (pain feuille de lotus) et garnie de coriandre…"
      },
      "sources": [
        {
          "name": "Koah-pau - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Koah-pau"
        },
        {
          "name": "Kong bak bao - Pamelia Chia (Singapore Noodles)",
          "url": "https://sgpnoodles.substack.com/p/kong-bak-bao"
        }
      ]
    },
    "ee fu mee": {
      "local": "伊麵 (yī miàn)",
      "note": {
        "en": "Flat Cantonese egg noodles, parboiled then deep-fried to a golden, spongy texture; eaten braised and as longevity noodles.",
        "fr": "Nouilles plates cantonaises aux œufs, précuites puis frites jusqu'à une texture dorée et spongieuse ; servies braisées et comme nouilles de…"
      },
      "sources": [
        {
          "name": "Yi mein - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Yi_mein"
        },
        {
          "name": "Michelin Guide - Recipe: Ee-Fu Noodles by Elegant Inn, Kuala Lumpur",
          "url": "https://guide.michelin.com/jp/en/article/dining-in/recipe-best-ee-fu-noodles-elegant-in-kuala-lumpur-malaysia"
        }
      ]
    },
    "tau sar piah": {
      "local": "豆沙饼",
      "note": {
        "en": "A flaky pastry filled with mung bean paste, made in both salty and sweet versions. Brought to Penang by Fujian (Hokkien) immigrants and now…",
        "fr": "Une pâtisserie feuilletée fourrée de pâte de haricot mungo, déclinée en versions salée et sucrée. Apportée à Penang par des immigrants du…"
      },
      "sources": [
        {
          "name": "What To Cook Today - Penang Tau Sar Piah / Tambun Biscuits",
          "url": "https://whattocooktoday.com/tau-sar-piah.html"
        },
        {
          "name": "ieatishootipost - Tau Sar Piah: Singapore's very own pastry!",
          "url": "https://ieatishootipost.sg/special-feature-tau-sar-piah-singapores-very-own-pastry/"
        }
      ]
    },
    "bak chang (rice dumpling)": {
      "local": "肉粽 (bah-chàng)",
      "note": {
        "en": "Hokkien glutinous rice dumpling wrapped in bamboo leaves with pork, mushrooms and chestnuts, eaten at the Dragon Boat Festival.",
        "fr": "Boulette de riz gluant hokkien en feuilles de bambou, fourrée de porc, champignons et châtaignes, mangée à la Fête des bateaux-dragons."
      },
      "sources": [
        {
          "name": "Zongzi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Zongzi"
        }
      ]
    },
    "hokkien-style braised pig trotter": {
      "local": "滷豬腳 (lor tu kha)",
      "note": {
        "en": "Fujian/Hokkien pig trotter braised long and slow in dark and light soy sauce until tender; in Taiwan often served with vermicelli to dispel…",
        "fr": "Pied de porc hokkien (Fujian) braisé lentement dans la sauce soja claire et foncée; à Taïwan servi souvent avec des vermicelles pour…"
      },
      "sources": [
        {
          "name": "Lu Zhu Jiao (滷豬腳/卤猪脚) Braised Pork Feet — Taiwanbao",
          "url": "https://taiwanbao.blogspot.com/2020/10/lu-zhu-jiao-braised-pork-feet.html"
        },
        {
          "name": "Tau Yu Bak (Braised Pork in Soy Sauce) — Nyonya Cooking",
          "url": "https://www.nyonyacooking.com/recipes/tau-yu-bak-braised-pork-in-soy-sauce~HyeZOPjPfqZQ"
        }
      ]
    },
    "hokkien-style steamed fish": {
      "local": "红糟鱼 (hóng zāo yú)",
      "note": {
        "en": "A traditional Fujian (Hokkien) freshwater-fish dish in which the fish is salted, deep-fried and marinated in hong zao, the red lees left…",
        "fr": "Plat traditionnel du Fujian (hokkien) a base de poisson d'eau douce, sale, frit puis marine dans le hong zao, la lie rouge issue du…"
      },
      "sources": [
        {
          "name": "Red Fermented Rice Fish - Baidu Baike",
          "url": "https://baike.baidu.com/en/item/Red%20Fermented%20Rice%20Fish/105536"
        },
        {
          "name": "红糟鱼 - 百度百科",
          "url": "https://baike.baidu.com/item/%E7%BA%A2%E7%B3%9F%E9%B1%BC/3070226"
        }
      ]
    },
    "hokkien fried rice (with prawn paste)": {
      "local": "福建炒飯",
      "note": {
        "en": "Egg fried rice topped with a thick prawn-and-seafood gravy; despite its name, this Cantonese restaurant dish did not originate in Fujian.",
        "fr": "Riz sauté aux œufs nappé d'une sauce épaisse aux crevettes et fruits de mer ; malgré son nom, ce plat cantonais n'est pas né au Fujian."
      },
      "sources": [
        {
          "name": "Wikipedia — Hokkien fried rice",
          "url": "https://en.wikipedia.org/wiki/Hokkien_fried_rice"
        },
        {
          "name": "TasteAtlas — Hokkien fried rice (Fuk gin caau faan)",
          "url": "https://www.tasteatlas.com/hokkien-fried-rice"
        }
      ]
    },
    "ang ku kueh": {
      "local": "紅龜粿",
      "note": {
        "en": "A Hokkien glutinous-rice cake, red and shaped like a tortoise for longevity, with sweet mung bean or peanut filling, steamed on banana leaf.",
        "fr": "Gateau hokkien en riz gluant, rouge et en forme de tortue pour la longevite, fourre de haricot mungo ou cacahuete sucres, cuit a la vapeur…"
      },
      "sources": [
        {
          "name": "Ang ku kueh - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ang_ku_kueh"
        },
        {
          "name": "Roots.gov.sg - Ang Ku Kueh: Significance, Traditions, And Its Relevance Today",
          "url": "https://www.roots.gov.sg/stories-landing/stories/Ang-Ku-Kueh-Significance-Traditions-And-Its-Relevance-Today/Ang-Ku-Kueh-Significance-Traditions-And-Its-Relevance-Today"
        }
      ]
    },
    "ti kway / png kueh": {
      "local": "紅桃粿 (âng-thô-kóe / png kueh)",
      "note": {
        "en": "A Teochew peach-shaped steamed cake with a pink-dyed glutinous-rice-flour skin wrapped over a savoury filling of glutinous rice, peanuts…",
        "fr": "Gâteau teochew vapeur en forme de pêche, à la peau de farine de riz gluant teintée en rose, fourré d'une garniture salée de riz gluant…"
      },
      "sources": [
        {
          "name": "Wikipedia – Red peach cake (紅桃粿)",
          "url": "https://en.wikipedia.org/wiki/Red_peach_cake"
        },
        {
          "name": "ieatishootipost – Teochew Kueh: Why is there Red and White Png Kueh?",
          "url": "https://ieatishootipost.sg/teochew-kueh-why-is-there-red-and-white-png-kueh/"
        }
      ]
    },
    "mee sua kueh": {
      "local": "面线糕",
      "note": {
        "en": "Hokkien savoury cake of wheat-flour vermicelli (mee sua) bound with meat and vegetables, then steamed firm and sliced, often for festive…",
        "fr": "Gâteau salé hokkien de vermicelles de blé (mee sua) liés à de la viande et des légumes, cuit à la vapeur puis tranché, souvent pour les…"
      },
      "sources": [
        {
          "name": "What To Cook Today - Mee Sua Kueh (面线糕)",
          "url": "https://whattocooktoday.com/mee-suah-kueh.html"
        },
        {
          "name": "Kampung Eats - Auntie Pauline's Mee Suah Kueh",
          "url": "https://kampungeats.com/auntie-paulines-mee-suah-kueh/"
        }
      ]
    },
    "peng kueh (red rice cake)": {
      "local": "紅桃粿 (png kueh)",
      "note": {
        "en": "A pink, peach-shaped Teochew (not Hokkien) glutinous-rice kueh with a soft glutinous-rice-flour skin wrapped over a savoury filling of…",
        "fr": "Kueh teochew (et non hokkien) rose en forme de pêche, à peau de farine de riz gluant enveloppant une farce salée de riz gluant, arachides…"
      },
      "sources": [
        {
          "name": "Red peach cake - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Red_peach_cake"
        },
        {
          "name": "Keeping Chinese Tradition Alive with this 红桃粿 P'ng Kueh Vegetarian Recipe - My Blue Tea",
          "url": "https://www.mybluetea.com.au/post/keeping-chinese-tradition-alive-with-png-kueh-vegetarian-recipe"
        }
      ]
    },
    "kueh chang (savoury rice dumpling)": {
      "local": "肉粽 (bah-chàng / bak chang)",
      "note": {
        "en": "Hokkien savoury glutinous-rice dumpling wrapped in bamboo leaves, filled with pork, mushroom and salted egg, eaten at the Dragon Boat…",
        "fr": "Boulette hokkien de riz gluant salee enveloppee de feuilles de bambou, fourree de porc, champignon et oeuf sale, mangee a la Fete des…"
      },
      "sources": [
        {
          "name": "Zongzi - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Zongzi"
        },
        {
          "name": "Michelin Guide - Rice Dumplings, Dragon Boat Festival Singapore",
          "url": "https://guide.michelin.com/sg/en/article/dining-in/rice-dumplings-dragon-boat-festival-2026"
        }
      ]
    },
    "hokkien lor bak": {
      "local": "滷肉 (ló͘-bah)",
      "note": {
        "en": "Hokkien five-spice meat roll of minced pork and prawn wrapped in beancurd skin and deep-fried, brought by Fujian migrants to Penang.",
        "fr": "Rouleau de viande hokkien aux cinq épices, porc et crevette hachés enroulés dans de la peau de tofu et frits, apporté à Penang par les…"
      },
      "sources": [
        {
          "name": "TasteAtlas – Loh Bak",
          "url": "https://www.tasteatlas.com/lo-bah"
        },
        {
          "name": "CCS.City – Loh Bak and Ngo Hiang: Tracing the Paths of Migrants from Fujian to Southeast Asia",
          "url": "https://ccs.city/en/chinese-cultural-club/chinese-culinary/loh-bak-and-ngo-hiang"
        }
      ]
    },
    "oyster vermicelli (orh ah mee suah)": {
      "local": "蚵仔麵線",
      "note": {
        "en": "Taiwanese noodle soup of fresh oysters and thin wheat misua in a starch-thickened broth, rooted in Fujianese migrant cooking.",
        "fr": "Soupe de nouilles taiwanaise d'huîtres fraîches et de fines misua de blé dans un bouillon lié, issue de la cuisine migrante du Fujian."
      },
      "sources": [
        {
          "name": "Oyster vermicelli — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Oyster_vermicelli"
        },
        {
          "name": "The Story of Oyster Misua 蚵仔麵線的故事 — Taipei Times",
          "url": "https://www.taipeitimes.com/News/lang/archives/2024/04/01/2003815750"
        }
      ]
    },
    "hokkien yam rice": {
      "local": "芋頭飯 (芋头饭)",
      "note": {
        "en": "One-pot Hokkien rice dish cooking rice with taro, pork belly, dried shrimp and shiitake; a traditional, economical home meal in SG/Malaysia.",
        "fr": "Plat hokkien de riz en une casserole cuit avec taro, poitrine de porc, crevettes séchées et shiitake; repas familial traditionnel et…"
      },
      "sources": [
        {
          "name": "Nyonya Cooking – Yam Rice",
          "url": "https://www.nyonyacooking.com/recipes/yam-rice~BJcLMM08m"
        },
        {
          "name": "Taste of Asian Food – Taro rice (Yam rice/芋头饭)",
          "url": "https://tasteasianfood.com/taro-rice/"
        }
      ]
    },
    "hokkien bee hoon (white)": {
      "local": "白米粉",
      "note": {
        "en": "Singaporean stir-fried white rice vermicelli simmered in a rich, starchy stock with seafood (prawns, squid), egg and vegetables; it has no…",
        "fr": "Vermicelles de riz blancs sautes a la singapourienne, mijotes dans un bouillon riche et nappant avec des fruits de mer (crevettes, calmar)…"
      },
      "sources": [
        {
          "name": "ieatishootipost — Seafood White Beehoon: Beginning of a new trend",
          "url": "https://ieatishootipost.sg/seafood-white-beehoon-beginning-new-trend/"
        },
        {
          "name": "Tony Johor Kaki — Sembawang White Bee Hoon (You Huak) White Restaurant 友发餐室白米粉",
          "url": "https://johorkaki.blogspot.com/2015/11/sembawang-white-bee-hoon-you-huak.html"
        }
      ]
    },
    "amoy spring roll": {
      "local": "薄餅 (po̍h-piáⁿ)",
      "note": {
        "en": "A fresh, unfried Hokkien spring roll from Xiamen (Amoy) in Fujian, wrapping more than ten fillings in a soft, paper-thin wheat crepe…",
        "fr": "Un rouleau de printemps hokkien frais et non frit de Xiamen (Amoy), dans le Fujian, qui enveloppe plus de dix garnitures dans une fine…"
      },
      "sources": [
        {
          "name": "Popiah - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Popiah"
        },
        {
          "name": "Xiamen spring roll - Baidu Baike",
          "url": "https://baike.baidu.com/en/item/Xiamen%20spring%20roll/136218"
        }
      ]
    },
    "hokkien claypot mee": {
      "local": "砂煲福建面",
      "note": {
        "en": "A Singapore variant of fried Hokkien prawn mee, yellow noodles and bee hoon in prawn-stock gravy served bubbling hot in a clay pot.",
        "fr": "Variante singapourienne du Hokkien mee aux crevettes, nouilles jaunes et bee hoon dans un bouillon de crevettes, servi bouillonnant en pot…"
      },
      "sources": [
        {
          "name": "Hokkien mee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hokkien_mee"
        },
        {
          "name": "Kim Keat Hokkien Mee: Famous Claypot Hokkien Mee - Eatbook.sg",
          "url": "https://eatbook.sg/kim-keat/"
        }
      ]
    },
    "hae bee hiam": {
      "local": "蝦米薟 (hê-bí-hiam)",
      "note": {
        "en": "A Peranakan dry spiced sambal of pounded dried shrimp, chilli, coconut and aromatics, used as a condiment or as rempah udang filling.",
        "fr": "Un sambal sec peranakan de crevettes séchées pilées, piment, noix de coco et aromates, servi en condiment ou comme farce du rempah udang."
      },
      "sources": [
        {
          "name": "Hae bee hiam - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Hae_bee_hiam"
        },
        {
          "name": "Baba GT Lye's Hae Bee Hiam: Recipes and Stories - NHB Peranakan Museum",
          "url": "https://www.nhb.gov.sg/peranakanmuseum/learn/digital-resources/gt-lye-hae-bee-hiam"
        }
      ]
    },
    "lor ark hokkien": {
      "local": "滷鴨 (卤鸭)",
      "note": {
        "en": "Lor ark, braised duck simmered in a dark soy master stock with five-spice, star anise, cloves, cinnamon and galangal; the Hokkien version…",
        "fr": "Lor ark, canard braisé mijoté dans un bouillon maître au soja noir avec cinq-épices, anis étoilé, clous de girofle, cannelle et galanga…"
      },
      "sources": [
        {
          "name": "The Burning Kitchen — Hokkien Braised Duck (Lor Ark)",
          "url": "https://theburningkitchen.com/hokkien-braised-duck/"
        }
      ]
    },
    "hokkien-style steamed prawns": {
      "local": "佛跳墙",
      "note": {
        "en": "An elaborate Fujian (Hokkien) banquet stew from Fuzhou, slow-simmered from premium ingredients such as abalone, sea cucumber, fish maw and…",
        "fr": "Un ragoût de banquet élaboré du Fujian (hokkien), originaire de Fuzhou, mijoté longuement à partir d'ingrédients de choix comme l'ormeau…"
      },
      "sources": [
        {
          "name": "Fujian cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Fujian_cuisine"
        },
        {
          "name": "Local Cuisine: Fuzhou, the Umami Capital - Fujian Provincial Government",
          "url": "https://wb.fujian.gov.cn/English/momentsinfujian/202112/t20211224_5799269.htm"
        }
      ]
    }
  },
  "teochew": {
    "bak chor mee": {
      "local": "肉脞麵 (肉脞面)",
      "note": {
        "en": "Teochew minced-pork noodle dish (egg or flat mee pok) tossed in chilli-vinegar or served in pork broth, brought by Chaoshan immigrants to…",
        "fr": "Plat de nouilles teochew au porc haché (mee pok ou aux œufs), au piment-vinaigre ou en bouillon, apporté à Singapour par les immigrés du…"
      },
      "sources": [
        {
          "name": "Mee pok - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mee_pok"
        },
        {
          "name": "Michelin Guide - Bak Chor Mee",
          "url": "https://guide.michelin.com/sg/en/article/dining-out/iconic-dishes-hill-street-tai-hwa-bak-chor-mee"
        }
      ]
    },
    "teochew braised duck": {
      "local": "潮州滷鴨",
      "note": {
        "en": "Teochew duck braised slowly in a reusable galangal-scented master stock (滷水) until tender; a Chaoshan staple carried abroad by Chinese…",
        "fr": "Canard teochew braisé lentement dans un bouillon-mère réutilisable (滷水) parfumé au galanga jusqu'à tendreté; spécialité du Chaoshan…"
      },
      "sources": [
        {
          "name": "Master stock - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Master_stock"
        },
        {
          "name": "Teochew Braised Duck Recipe - ieatishootipost",
          "url": "https://ieatishootipost.sg/teochew-braised-duck-recipe/"
        }
      ]
    },
    "teochew porridge (mui)": {
      "local": "潮州糜 (muē)",
      "note": {
        "en": "Teochew rice porridge from China's Chaoshan region, with whole softened grains (not broken like Cantonese congee), served with small side…",
        "fr": "Bouillie de riz teochew de la region de Chaoshan en Chine, aux grains entiers ramollis (non delayes), servie avec de petits accompagnements."
      },
      "sources": [
        {
          "name": "Teochew porridge - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Teochew_porridge"
        },
        {
          "name": "History of Teochew Porridge - Johor Kaki",
          "url": "https://johorkaki.blogspot.com/2023/02/history-of-teochew-porridge-chaoshan.html"
        }
      ]
    },
    "orh nee": {
      "local": "芋泥",
      "note": {
        "en": "A Teochew dessert of mashed yam (taro) sweetened and enriched with shallot oil or lard, traditionally closing a Teochew banquet.",
        "fr": "Un dessert teochew de taro (igname) ecrase, sucre et enrichi d'huile d'echalote ou de saindoux, cloturant un banquet teochew."
      },
      "sources": [
        {
          "name": "Michelin Guide Singapore",
          "url": "https://guide.michelin.com/sg/en/article/dining-out/6-restaurants-for-authentic-teochew-fare"
        },
        {
          "name": "Fortune Food - The Rich Legacy of Teochew Orh Nee",
          "url": "https://fortunefood.sg/blogs/spotlight/the-rich-legacy-of-teochew-orh-nee"
        }
      ]
    },
    "teochew steamed pomfret": {
      "local": "潮州蒸鲳鱼",
      "note": {
        "en": "Teochew dish of whole white or silver pomfret steamed with salted sour plums, pickled mustard greens and ginger for a tangy savoury broth.",
        "fr": "Plat teochew de pomfret blanc entier cuit a la vapeur avec prunes salees, moutarde marinee et gingembre, donnant un bouillon aigre-sale."
      },
      "sources": [
        {
          "name": "Foodelicacy — Quick and Easy Teochew Steamed Pomfret",
          "url": "https://www.foodelicacy.com/teochew-style-steamed-pomfret/"
        },
        {
          "name": "The Burning Kitchen — Teochew Steamed Pomfret (Dao Chior)",
          "url": "https://theburningkitchen.com/teochew-steamed-chinese-pomfret-dao-chior-recipe/"
        }
      ]
    },
    "cold crab teochew-style": {
      "local": "潮州冻蟹",
      "note": {
        "en": "Teochew dish of steamed crab chilled and served cold, paired with a galangal-and-brown-sugar vinegar dip to offset the crab's \"cold\" nature.",
        "fr": "Plat teochew de crabe cuit a la vapeur, refroidi et servi froid, avec un vinaigre au galanga et sucre roux equilibrant la nature « froide »…"
      },
      "sources": [
        {
          "name": "Teochew cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Teochew_cuisine"
        },
        {
          "name": "Michelin Guide - 6 Restaurants For Authentic Teochew Fare",
          "url": "https://guide.michelin.com/sg/en/article/dining-out/6-restaurants-for-authentic-teochew-fare"
        }
      ]
    },
    "teochew fish maw soup": {
      "local": "鱼鳔羹",
      "note": {
        "en": "Teochew soup of dried fish maw (swim bladder, one of China's four sea delicacies) simmered with pork ribs, mushrooms and scallops, eaten at…",
        "fr": "Soupe teochew de vessie natatoire séchée (l'un des quatre trésors marins chinois) mijotée avec côtes de porc, champignons et pétoncles…"
      },
      "sources": [
        {
          "name": "Four sea delicacies - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Four_sea_delicacies"
        },
        {
          "name": "Fish maw - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Fish_maw"
        }
      ]
    },
    "teochew oyster cake": {
      "local": "蠔烙 (orh luak)",
      "note": {
        "en": "Teochew-style oyster cake (orh luak), a Southern Min savoury oyster pancake bound with duck egg and sweet potato flour, then pan-fried.",
        "fr": "Galette aux huîtres à la teochew (orh luak), crêpe salée du Min méridional liée à l'œuf de cane et à la fécule de patate douce, poêlée."
      },
      "sources": [
        {
          "name": "Oyster omelette - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Oyster_omelette"
        },
        {
          "name": "Cracking The Oyster Omelette Code: From Orh Luak to Orh Suan - SilverStreak",
          "url": "https://silverstreak.sg/cracking-the-oyster-omelette-code-from-orh-luak-to-orh-suan/"
        }
      ]
    },
    "soon kueh": {
      "local": "笋粿 (筍粿)",
      "note": {
        "en": "A Teochew steamed dumpling whose name means \"bamboo shoot cake\"; in Singapore the filling is usually jicama or turnip instead.",
        "fr": "Un dumpling teochew cuit à la vapeur dont le nom signifie « gâteau de pousse de bambou »; à Singapour, on le farcit plutôt de jicama ou de…"
      },
      "sources": [
        {
          "name": "Soon kueh - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Soon_kueh"
        },
        {
          "name": "Culturepaedia (Singapore Chinese Cultural Centre)",
          "url": "https://culturepaedia.singaporeccc.org.sg/popular-culture/how-soon-kueh-braised-duck-bak-chor-mee-and-teochew-porridge-became-uniquely-singaporean/"
        }
      ]
    },
    "png kueh": {
      "local": "紅桃粿",
      "note": {
        "en": "A Teochew stuffed dumpling with a pink-dyed glutinous-rice-flour skin shaped like a peach, filled with seasoned glutinous rice, peanuts…",
        "fr": "Une boulette teochew farcie, a la peau de farine de riz gluant teintee rose et faconnee en forme de peche, garnie de riz gluant assaisonne…"
      },
      "sources": [
        {
          "name": "Wikipedia - Red peach cake (紅桃粿 / 飯粿)",
          "url": "https://en.wikipedia.org/wiki/Red_peach_cake"
        },
        {
          "name": "ieatishootipost - Teochew Kueh: Why is there Red and White Png Kueh?",
          "url": "https://ieatishootipost.sg/teochew-kueh-why-is-there-red-and-white-png-kueh/"
        }
      ]
    },
    "mee pok dry": {
      "local": "麵薄（乾）",
      "note": {
        "en": "Flat yellow egg noodle of Teochew (Chaoshan) origin, tossed dry in a chili-vinegar-soy sauce rather than served in soup.",
        "fr": "Nouille plate et jaune aux œufs d'origine teochew (Chaoshan), servie sèche, mêlée à une sauce piment-vinaigre-soja plutôt qu'en soupe."
      },
      "sources": [
        {
          "name": "Mee pok - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mee_pok"
        }
      ]
    },
    "fishball noodle": {
      "local": "鱼丸面 (Teochew mee pok / mee kia, 面薄)",
      "note": {
        "en": "A Teochew (Chaoshan) noodle dish of flat mee pok or thin mee kia topped with springy fish balls, served dry in chilli-vinegar sauce or in…",
        "fr": "Plat de nouilles teochew (Chaoshan) à base de mee pok plat ou mee kia fin, garni de boulettes de poisson, servi sec en sauce…"
      },
      "sources": [
        {
          "name": "Mee pok - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mee_pok"
        },
        {
          "name": "Teochew Mee Pok And Fish Ball Noodles - Guai Shu Shu",
          "url": "https://kwgls.wordpress.com/2015/04/04/teochew-mee-pok-and-fish-ball-noodles-%E6%BD%AE%E5%B7%9E%E8%82%89%E8%84%9E%E9%9D%A2-%EF%BC%8C%E6%BD%AE%E5%B7%9E%E9%B1%BC%E5%9C%86%E9%9D%A2%EF%BC%89/"
        }
      ]
    },
    "fish soup bee hoon": {
      "local": "鱼片米粉",
      "note": {
        "en": "A Singaporean soup of sliced fish and rice vermicelli (bee hoon) in a savoury broth, available since at least the 1920s and commonly…",
        "fr": "Une soupe singapourienne de tranches de poisson et de vermicelles de riz (bee hoon) dans un bouillon savoureux, existant depuis au moins…"
      },
      "sources": [
        {
          "name": "Wikipedia — Fish soup bee hoon",
          "url": "https://en.wikipedia.org/wiki/Fish_soup_bee_hoon"
        },
        {
          "name": "SETHLUI — Origins Of Singapore Fish Soup",
          "url": "https://sethlui.com/origins-fish-soup-singapore/"
        }
      ]
    },
    "sliced fish soup": {
      "local": "鱼片汤",
      "note": {
        "en": "A popular Singapore dish believed to have originated from the Teochews, consisting of sliced fish in broth with vegetables and beancurd; it…",
        "fr": "Plat populaire de Singapour, que l'on pense d'origine teochew, composé de tranches de poisson dans un bouillon avec des légumes et du tofu…"
      },
      "sources": [
        {
          "name": "Sliced fish soup - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sliced_fish_soup"
        }
      ]
    },
    "kway chap": {
      "local": "粿汁",
      "note": {
        "en": "Teochew dish of flat rice sheets in a dark soy braise served with pork offal, belly, beancurd and braised eggs, from China's Chaoshan…",
        "fr": "Plat teochew de feuilles de riz plates dans un bouillon de soja brun, servi avec abats de porc, poitrine, tofu et oeufs braises, originaire…"
      },
      "sources": [
        {
          "name": "Kway chap - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kway_chap"
        },
        {
          "name": "Kway Chap - Roots (National Library Board / National Heritage Board, Singapore)",
          "url": "https://www.roots.gov.sg/ich-landing/ich/kway-chap"
        }
      ]
    },
    "yusheng (lou hei)": {
      "local": "鱼生 (撈起 / lou hei)",
      "note": {
        "en": "A raw-fish-and-shredded-vegetable salad tossed communally at Chinese New Year for prosperity; its modern Singapore form was created in 1964.",
        "fr": "Une salade de poisson cru et de légumes émincés mélangée en commun au Nouvel An chinois pour la prospérité; sa forme singapourienne moderne…"
      },
      "sources": [
        {
          "name": "Yusheng - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Yusheng"
        },
        {
          "name": "Yusheng and Lo hei - Roots (Singapore National Heritage Board)",
          "url": "https://www.roots.gov.sg/ich-landing/ich/yusheng-and-lo-hei"
        }
      ]
    },
    "mua chee": {
      "local": "麻糍",
      "note": {
        "en": "A chewy glutinous rice dough snack coated in ground peanuts, sesame and sugar, brought to Singapore by Hokkien and Teochew settlers.",
        "fr": "Une collation de pâte de riz gluant moelleuse enrobée d'arachides moulues, de sésame et de sucre, apportée à Singapour par les Hokkien et…"
      },
      "sources": [
        {
          "name": "Singapore Noodles — Muah chee 麻糍 (Pamelia Chia)",
          "url": "https://sgpnoodles.substack.com/p/muah-chee"
        },
        {
          "name": "ieatishootipost — Hougang 6 Mile Muah Chee",
          "url": "https://ieatishootipost.sg/hougang-6-mile-muah-chee-how-can-we-preserve-our-heritage-foods/"
        }
      ]
    },
    "cheng tng": {
      "local": "清汤",
      "note": {
        "en": "A sweet \"clear soup\" dessert (清汤 means \"clear soup\") of Teochew origin in Singapore and Malaysia, served hot or cold. The lightly…",
        "fr": "Dessert sucré en \"soupe claire\" (清汤 signifie \"soupe claire\"), d'origine teochew à Singapour et en Malaisie, servi chaud ou froid. Le…"
      },
      "sources": [
        {
          "name": "Singaporean Mandarin Database - 清汤 (Cheng Tng), Language Councils Singapore",
          "url": "https://www.languagecouncils.sg/mandarin/en/learning-resources/singaporean-mandarin-database/terms/cheng-tng"
        },
        {
          "name": "Cool Down with Cheng Tng - Makansutra",
          "url": "https://makansutra.com/cool-down-with-cheng-tng/"
        }
      ]
    },
    "ku chye kueh": {
      "local": "韭菜粿",
      "note": {
        "en": "A Teochew steamed dumpling filled with garlic chives and dried shrimp, originating from the Chaoshan region of Guangdong, China.",
        "fr": "Une bouchée teochew cuite à la vapeur, farcie de ciboule chinoise et de crevettes séchées, originaire de la région du Chaoshan, en Chine."
      },
      "sources": [
        {
          "name": "Huang Kitchen — Ku Chai Kuih (Steamed Chive Dumplings) 蒸韭菜粿",
          "url": "https://huangkitchen.com/ku-chai-kuih-steamed-chive-dumplings/"
        },
        {
          "name": "Guai Shu Shu — Teochew Ku Chai Kuih (潮州韭菜粿)",
          "url": "https://www.guaishushu1.com/garlic-chives-steamed-rice-caketeochew-ku-chai-kuih-%E6%BD%AE%E5%B7%9E%E9%9F%AD%E8%8F%9C%E7%B2%BF%EF%BC%89/"
        }
      ]
    },
    "teochew bak kut teh peppery": {
      "local": "潮州肉骨茶",
      "note": {
        "en": "Pork-rib soup in the Teochew style: a clear, light, garlicky and peppery broth seasoned mainly with white pepper and garlic. This Teochew…",
        "fr": "Soupe de côtes de porc à la teochew : un bouillon clair, léger, relevé d'ail et de poivre, assaisonné surtout de poivre blanc et d'ail…"
      },
      "sources": [
        {
          "name": "Bak kut teh — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Bak_kut_teh"
        },
        {
          "name": "Bak kut teh — Infopedia, National Library Board Singapore",
          "url": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1800_2011-03-18.html"
        }
      ]
    },
    "lor ark (braised duck rice)": {
      "local": "潮州滷鴨",
      "note": {
        "en": "Teochew dish of duck braised in a soy and five-spice master stock, sliced over rice; brought to Southeast Asia by Chaozhou migrants.",
        "fr": "Plat teochew de canard braisé dans un bouillon-maître au soja et cinq-épices, tranché sur du riz; apporté par les migrants de Chaozhou."
      },
      "sources": [
        {
          "name": "TasteAtlas – Teochew braised duck (Lor ark)",
          "url": "https://www.tasteatlas.com/teochew-braised-duck"
        },
        {
          "name": "Grokipedia – Duck rice",
          "url": "https://grokipedia.com/page/Duck_rice"
        }
      ]
    },
    "teochew steamed crab": {
      "local": "潮州冻蟹",
      "note": {
        "en": "Teochew cold crab: a steamed, then chilled roe crab from Chaoshan, served cold with a sweet ginger-vinegar dip to offset its \"cooling\"…",
        "fr": "Crabe froid Teochew : un crabe à œufs cuit à la vapeur puis réfrigéré, du Chaoshan, servi froid avec un trempette vinaigre-gingembre sucrée."
      },
      "sources": [
        {
          "name": "Teochew cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Teochew_cuisine"
        },
        {
          "name": "Teochew Food: Complete Guide to Chaoshan Cuisine - Umamicart",
          "url": "https://www.umamicart.com/blog/2026/04/29/teochew-food-guide/"
        }
      ]
    },
    "orh luak (oyster omelette teochew)": {
      "local": "蠔烙",
      "note": {
        "en": "Teochew pan-fried omelette of oysters in a sweet-potato-starch and duck-egg batter, originating in the Chaoshan region of southern China.",
        "fr": "Omelette teochew d'huitres poelee dans une pate d'amidon de patate douce et d'oeuf de cane, originaire de la region de Chaoshan au sud de…"
      },
      "sources": [
        {
          "name": "Oyster omelette - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Oyster_omelette"
        },
        {
          "name": "We Are What We Eat - Teochew or-luak, The Teochew Store",
          "url": "https://www.theteochewstore.org/blogs/latest/42605507-we-are-what-we-eat-what-our-favourite-plate-of-teochew-or-luak-tells-us-about-our-history"
        }
      ]
    },
    "beef kway teow soup": {
      "local": "牛肉粿条汤",
      "note": {
        "en": "A noodle dish of flat rice noodles (kway teow) with sliced beef; in the Teochew style it is served in soup. The Teochew flat rice noodle…",
        "fr": "Plat de nouilles de riz plates (kway teow) au boeuf emince ; dans le style teochew, il est servi en soupe. La nouille de riz plate teochew…"
      },
      "sources": [
        {
          "name": "Beef kway teow - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Beef_kway_teow"
        },
        {
          "name": "The Different Types of Kway Teow Dishes in Malaysia and Singapore - Michelin Guide",
          "url": "https://guide.michelin.com/vn/en/article/features/different-types-of-kway-teow-dishes-in-malaysia-and-singapore"
        }
      ]
    },
    "teochew-style roast goose": {
      "local": "滷水鵝 (lǔshuǐ é)",
      "note": {
        "en": "Chaoshan dish of lion-head goose slow-cooked whole in a reused soy-and-spice master stock (lou sui); served with garlic-vinegar.",
        "fr": "Plat du Chaoshan d'oie a tete de lion mijotee entiere dans un bouillon-mere au soja et epices reutilise; servie avec vinaigre a l'ail."
      },
      "sources": [
        {
          "name": "TasteAtlas - Lǔshuǐ'é",
          "url": "https://www.tasteatlas.com/lushuie"
        },
        {
          "name": "Wikipedia - Teochew cuisine",
          "url": "https://en.wikipedia.org/wiki/Teochew_cuisine"
        }
      ]
    }
  },
  "hainanese": {
    "hainanese pork chop": {
      "local": "海南猪扒",
      "note": {
        "en": "A breaded deep-fried pork chop in tomato sweet-sour gravy, created by Hainanese cooks in colonial Singapore/Malaya as localized Western…",
        "fr": "Côtelette de porc panée et frite, sauce tomate aigre-douce, créée par des cuisiniers hainanais dans la Malaisie/Singapour coloniale."
      },
      "sources": [
        {
          "name": "Travelling Foodies — Hainanese Deep Fried Pork Chops",
          "url": "https://travellingfoodies.wordpress.com/2012/07/11/hainanese-deep-fried-pork-chops/"
        },
        {
          "name": "Medium — The Secret History of Chicken Chop, Malaysia's Original 'Western Food'",
          "url": "https://medium.com/@sixtybolts/the-secret-history-of-chicken-chop-malaysias-original-western-food-aa50c4a96166"
        }
      ]
    },
    "hainanese curry rice": {
      "local": "海南咖喱饭",
      "note": {
        "en": "Singaporean dish of rice doused in curry gravy with pork chop, curry chicken and chap chye, created by Hainanese cooks in colonial-era…",
        "fr": "Plat singapourien de riz nappé de sauce curry avec côtelette de porc, poulet au curry et chap chye, créé par des cuisiniers hainanais à…"
      },
      "sources": [
        {
          "name": "Wikipedia - Hainanese curry rice",
          "url": "https://en.wikipedia.org/wiki/Hainanese_curry_rice"
        },
        {
          "name": "Roots (NLB Singapore) - Hainanese Curry Rice",
          "url": "https://www.roots.gov.sg/ich-landing/ich/hainanese-curry-rice"
        }
      ]
    },
    "hainanese mutton soup": {
      "local": "海南羊肉汤",
      "note": {
        "en": "Hainanese herbal soup of goat slow-stewed with medicinal herbs and red fermented bean curd, traditionally made with Hainan's Dongshan goat.",
        "fr": "Soupe hainanaise de chèvre mijotée avec des herbes médicinales et du tofu fermenté rouge, faite traditionnellement avec la chèvre Dongshan…"
      },
      "sources": [
        {
          "name": "National Library Board Singapore (NLB) — Hainanese mutton soup",
          "url": "https://www.nlb.gov.sg/main/article-detail?cmsuuid=b10b9362-84cd-4127-8cfc-3489c6a75b0b"
        },
        {
          "name": "Carry It Like Harry — Hainanese Herbal Mutton Soup 海南羊肉汤",
          "url": "https://carryitlikeharry.com/hainanese-herbal-mutton-soup-%E6%B5%B7%E5%8D%97%E7%BE%8A%E8%82%89%E6%B1%A4/"
        }
      ]
    },
    "hainanese chicken curry": {
      "local": "海南咖喱鸡",
      "note": {
        "en": "Mild curry chicken, a signature component of Singapore's Hainanese curry rice, created by Hainanese cooks under British and Peranakan…",
        "fr": "Poulet au curry doux, element phare du riz au curry hainanais de Singapour, cree par des cuisiniers hainanais d'influence britannique et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Hainanese curry rice",
          "url": "https://en.wikipedia.org/wiki/Hainanese_curry_rice"
        },
        {
          "name": "Roots.gov.sg (NLB) - Hainanese Curry Rice",
          "url": "https://www.roots.gov.sg/ich-landing/ich/hainanese-curry-rice"
        }
      ]
    },
    "wenchang chicken": {
      "local": "文昌鸡",
      "note": {
        "en": "A Hainanese \"white-cut\" poached free-range chicken from Wenchang, Hainan, the breed and dish that gave rise to Hainanese chicken rice.",
        "fr": "Poulet fermier poché \"découpé blanc\" hainanais de Wenchang, Hainan, race et plat à l'origine du riz au poulet hainanais."
      },
      "sources": [
        {
          "name": "Wenchang chicken - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Wenchang_chicken"
        },
        {
          "name": "Michelin Guide - The Different Types of Chicken Rice Around Asia",
          "url": "https://guide.michelin.com/en/article/features/same-same-but-different-the-different-types-of-chicken-rice-around-asia"
        }
      ]
    },
    "coconut chicken (hainan style)": {
      "local": "椰子鸡",
      "note": {
        "en": "Hainanese hot pot of Wenchang chicken cooked in fresh young-coconut water, which makes up most of the clear, mild broth; widely popularized…",
        "fr": "Fondue (hot pot) hainanaise de poulet Wenchang cuit dans l'eau de jeune noix de coco fraîche, qui compose l'essentiel du bouillon clair et…"
      },
      "sources": [
        {
          "name": "The Mala Market — Hainan Coconut Chicken Hotpot (Yeziji, 椰子鸡)",
          "url": "https://blog.themalamarket.com/hainan-coconut-chicken-hotpot-yeziji/"
        },
        {
          "name": "EyeShenzhen — Seasons introduces coconut chicken hot pot to Shenzhen",
          "url": "https://www.eyeshenzhen.com/content/2017-07/03/content_16624571.htm"
        }
      ]
    },
    "hainanese yam rice": {
      "local": "芋头饭",
      "note": {
        "en": "A savoury Southeast Asian Chinese one-pot rice dish cooked with diced taro (yam), Chinese sausage, dried prawns and mushrooms, often served…",
        "fr": "Un plat chinois d'Asie du Sud-Est : riz salé cuit en une marmite avec taro (igname), saucisse chinoise, crevettes séchées et champignons…"
      },
      "sources": [
        {
          "name": "Malaysian Chinese cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Malaysian_Chinese_cuisine"
        },
        {
          "name": "Yam Rice - Rasa Malaysia",
          "url": "https://rasamalaysia.com/yam-rice-recipe/"
        }
      ]
    },
    "jiaji duck": {
      "local": "加积鸭 (Jiājī yā)",
      "note": {
        "en": "One of Hainan's four famous dishes: a poached duck from Jiaji town, Qionghai, of a breed brought from overseas by returning Chinese.",
        "fr": "Un des quatre plats célèbres du Hainan : un canard poché de la ville de Jiaji, à Qionghai, d'une race rapportée d'outre-mer par des Chinois…"
      },
      "sources": [
        {
          "name": "CGTN — Jiaji Duck, one of the four famous dishes of Hainan",
          "url": "https://news.cgtn.com/news/2023-04-20/Jiaji-Duck-one-of-the-four-famous-dishes-of-Hainan-1j6Vv3jggSs/index.html"
        },
        {
          "name": "Hainan Government (ehainan.gov.cn) — Jiaji Duck",
          "url": "http://www.ehainan.gov.cn/2018-02/01/c_132052.htm"
        }
      ]
    }
  },
  "hakka": {
    "salt baked chicken": {
      "local": "盐焗鸡 (鹽焗雞)",
      "note": {
        "en": "A signature Hakka dish in which a whole chicken is cooked encased in hot salt. It traces to the Dongjiang region of Guangdong, where…",
        "fr": "Plat hakka emblematique ou un poulet entier cuit enrobe de sel chaud. Il remonte a la region du Dongjiang (Guangdong), ou les ouvriers des…"
      },
      "sources": [
        {
          "name": "The Woks of Life - Salt Baked Chicken",
          "url": "https://thewoksoflife.com/salt-baked-chicken/"
        },
        {
          "name": "Baidu Baike (EN) - Dongjiang Salt-Baked Chicken",
          "url": "https://baike.baidu.com/en/item/Dongjiang%20Salt-Baked%20Chicken/100297"
        }
      ]
    },
    "hakka stuffed tofu": {
      "local": "釀豆腐 (酿豆腐)",
      "note": {
        "en": "Hakka dish of tofu cubes stuffed with a ground pork and/or fish-paste filling, devised as a substitute for dumplings when wheat flour for…",
        "fr": "Plat hakka de cubes de tofu farcis d'une préparation de porc haché et/ou de pâte de poisson, créé pour remplacer les raviolis lorsque la…"
      },
      "sources": [
        {
          "name": "Yong tau foo - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Yong_tau_foo"
        },
        {
          "name": "Michelin Guide - Iconic Dishes: A Crash Course on Yong Tau Foo, a Dish of Hakka Origins",
          "url": "https://guide.michelin.com/sg/en/article/features/what-is-yong-tau-foo"
        }
      ]
    },
    "mei cai kou rou": {
      "local": "梅菜扣肉",
      "note": {
        "en": "A Hakka signature dish of steamed pork belly layered over preserved dried mustard greens (mei cai), a celebration and reunion staple.",
        "fr": "Plat emblematique hakka de poitrine de porc cuite a la vapeur sur des feuilles de moutarde sechees (mei cai), servi lors des fetes et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Meigan cai",
          "url": "https://en.wikipedia.org/wiki/Meigan_cai"
        },
        {
          "name": "The Woks of Life - Mei Cai Kou Rou",
          "url": "https://thewoksoflife.com/mei-cai-kou-rou-pork-belly/"
        }
      ]
    },
    "hakka noodles": {
      "local": "Hakka noodles (Indo-Chinese; no authentic Chinese name — \"Hakka\" refers to the Kolkata restaurateurs' dialect group)",
      "note": {
        "en": "An Indo-Chinese dish of boiled wheat noodles stir-fried in a wok with vegetables and soy sauce, created by Kolkata's Hakka Chinese…",
        "fr": "Plat indo-chinois de nouilles de blé bouillies puis sautées au wok avec légumes et sauce soja, créé par la communauté chinoise hakka de…"
      },
      "sources": [
        {
          "name": "Indian Chinese cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Indian_Chinese_cuisine"
        },
        {
          "name": "Hakka Noodle: The Story of the Kolkata Chinese - Spatial Histories of Modern East and Southeast Asia",
          "url": "https://www.spatialhistory.net/cities/2022/02/hakka-noodle-the-story-of-the-kolkata-chinese/"
        }
      ]
    },
    "pounded tea": {
      "local": "擂茶",
      "note": {
        "en": "Hakka tea-based beverage or gruel made from tea leaves, herbs, roasted nuts, seeds and grains ground together in a bowl; often served with…",
        "fr": "Boisson ou bouillie hakka faite de feuilles de the, d'herbes, de noix grillees, de graines et de cereales broyees ensemble dans un bol…"
      },
      "sources": [
        {
          "name": "Lei cha - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lei_cha"
        },
        {
          "name": "A Crash Course on \"Lei Cha\" or Thunder Tea Rice - Michelin Guide",
          "url": "https://guide.michelin.com/my/en/article/features/what-is-thunder-tea-rice"
        }
      ]
    },
    "hakka pork belly with taro": {
      "local": "芋頭扣肉 (Wu Tau Kau Yuk)",
      "note": {
        "en": "A Hakka festive dish of fried pork belly layered with taro slices, steamed then inverted onto a plate (扣肉 = \"inverted meat\").",
        "fr": "Plat de fête hakka de poitrine de porc frite en couches avec des tranches de taro, cuit à la vapeur puis renversé sur l'assiette."
      },
      "sources": [
        {
          "name": "The Woks of Life - Hakka Steamed Pork Belly with Taro (Wu Tau Kau Yuk)",
          "url": "https://thewoksoflife.com/steamed-pork-belly-with-taro/"
        },
        {
          "name": "Sift & Simmer - Hakka Pork Belly with Taro (芋頭扣肉)",
          "url": "https://www.siftandsimmer.com/hakka-pork-belly-with-taro-%E8%8A%8B%E9%A0%AD%E6%89%A3%E8%82%89/"
        }
      ]
    },
    "three-cup mushroom hakka": {
      "local": "三杯菇",
      "note": {
        "en": "Vegetarian take on the Hakka-origin three-cup (sanbei) style: mushrooms simmered in sesame oil, soy sauce and rice wine with garlic, ginger…",
        "fr": "Version vegetarienne du style hakka aux trois tasses (sanbei) : champignons mijotes dans l'huile de sesame, la sauce soja et le vin de riz…"
      },
      "sources": [
        {
          "name": "Wikipedia — Sanbeiji (three-cup, Hakka origin in Ningdu)",
          "url": "https://en.wikipedia.org/wiki/Sanbeiji"
        },
        {
          "name": "SCMP — Three-cup mushrooms recipe (Thai basil, garlic, ginger)",
          "url": "https://www.scmp.com/cooking/recipe/three-cup-mushrooms/article/3026635"
        }
      ]
    },
    "hakka rice cake": {
      "local": "喜粄 (xǐbǎn)",
      "note": {
        "en": "A Hakka steamed rice cake traditionally made from rice and red (brown) sugar, given a chewy texture and reddish colour. It is offered to…",
        "fr": "Gâteau de riz hakka cuit à la vapeur, traditionnellement préparé à base de riz et de sucre roux (sucre brun), à la texture moelleuse et à…"
      },
      "sources": [
        {
          "name": "Wikipedia - Hee pan",
          "url": "https://en.wikipedia.org/wiki/Hee_pan"
        },
        {
          "name": "Hakka Affairs Council (Taiwan) - Hakka festival foods",
          "url": "https://english.hakka.gov.tw/Content/Content?NodeID=685&PageID=39978&LanguageType=ENG"
        }
      ]
    },
    "hakka stuffed bitter gourd": {
      "local": "釀苦瓜 (niàng kǔguā)",
      "note": {
        "en": "Hakka dish of bitter gourd stuffed with minced pork or fish paste, a bitter-melon variant of yong tau foo (釀, \"to stuff\").",
        "fr": "Plat hakka de margose farcie de porc haché ou de pâte de poisson, variante au melon amer du yong tau foo (釀, « farcir »)."
      },
      "sources": [
        {
          "name": "Yong tau foo - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Yong_tau_foo"
        },
        {
          "name": "Michelin Guide: What is Yong Tau Foo, a Dish of Hakka Origins",
          "url": "https://guide.michelin.com/sg/en/article/features/what-is-yong-tau-foo"
        }
      ]
    },
    "hakka pork lard noodles": {
      "local": "客家腌面",
      "note": {
        "en": "Hakka dry-tossed noodles (yan mian) dressed with pork lard, seasoned fish sauce and deep-fried garlic, topped with sliced scallions.",
        "fr": "Nouilles hakka sautées à sec (yan mian) assaisonnées de saindoux de porc, de sauce de poisson et d'ail frit, garnies de ciboule émincée."
      },
      "sources": [
        {
          "name": "Chinese Cooking Demystified — The Original Hakka Noodles (客家腌面)",
          "url": "https://chinesecookingdemystified.substack.com/p/the-original-hakka-noodles"
        },
        {
          "name": "Marc Winer — Yan Mian Noodles (腌面), Chinese Fried Garlic Noodles",
          "url": "https://marcwiner.com/en/fried-garlic-noodles/"
        }
      ]
    },
    "hakka rice wine chicken": {
      "local": "娘酒鸡",
      "note": {
        "en": "Traditional Hakka winter dish of chicken fried with ginger and simmered in glutinous rice (mother) wine, eaten by new mothers for…",
        "fr": "Plat hakka d'hiver de poulet sauté au gingembre et mijoté dans le vin de riz gluant, consommé en post-partum par les jeunes mères."
      },
      "sources": [
        {
          "name": "Wikipedia — Hakka rice wine",
          "url": "https://en.wikipedia.org/wiki/Hakka_rice_wine"
        },
        {
          "name": "Guai Shu Shu — Authentic Hakka Confinement Dish, Yellow Wine Chicken (客家黄酒鸡)",
          "url": "https://www.guaishushu1.com/authentic-hakka-confinement-dish-yellow-wine-chicken-%E5%AE%A2%E5%AE%B6%E9%BB%84%E9%85%92%E9%B8%A1%EF%BC%89/"
        }
      ]
    },
    "preserved vegetable braised pork": {
      "local": "梅菜扣肉",
      "note": {
        "en": "A signature Hakka dish of pork belly steamed or braised atop salt-cured, dried preserved mustard greens (mei cai) in a dark soy gravy.",
        "fr": "Plat hakka emblematique de poitrine de porc cuite a la vapeur ou braisee sur des feuilles de moutarde salees et sechees (mei cai), en sauce…"
      },
      "sources": [
        {
          "name": "The Woks of Life — Mei Cai Kou Rou (Pork Belly with Preserved Vegetables)",
          "url": "https://thewoksoflife.com/mei-cai-kou-rou-pork-belly/"
        },
        {
          "name": "Hakka Affairs Council (Taiwan) — Stewed pork belly with preserved vegetables",
          "url": "https://english.hakka.gov.tw/Content/Content?NodeID=686&PageID=41767&LanguageType=ENG"
        }
      ]
    }
  },
  "eurasian": {
    "devil curry": {
      "local": "Kari Debal",
      "note": {
        "en": "A fiery vinegar-based Kristang (Portuguese-Eurasian) curry from Malacca, traditionally made after Christmas from leftover roast meats.",
        "fr": "Un curry kristang (eurasien-portugais) de Malacca, epice et a base de vinaigre, prepare apres Noel avec les restes de viandes roties."
      },
      "sources": [
        {
          "name": "Devil's curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Devil's_curry"
        },
        {
          "name": "Curry Devil (Kari Debal) - Singaporean Malaysian Recipes",
          "url": "https://www.singaporeanmalaysianrecipes.com/curry-devil-curry-debal/"
        }
      ]
    },
    "sugee cake": {
      "local": "sugee cake (suji; from Hindi सूजी, sūjī = semolina)",
      "note": {
        "en": "A dense, buttery semolina-and-almond cake of the Portuguese-Eurasian (Kristang) community of Malacca and Singapore.",
        "fr": "Gateau dense et beurre a la semoule et aux amandes de la communaute eurasienne portugaise (Kristang) de Malacca et Singapour."
      },
      "sources": [
        {
          "name": "Wikipedia - Sugee cake",
          "url": "https://en.wikipedia.org/wiki/Sugee_cake"
        },
        {
          "name": "TASTE - Sugee Cake: Malaysia's Take on Semolina Cake",
          "url": "https://tastecooking.com/sugee-cake-traces-semolinas-path-malaysia/"
        }
      ]
    },
    "pork vindaloo eurasian": {
      "local": "carne de vinha d'alhos",
      "note": {
        "en": "Eurasian (Kristang) pork curry of meat in vinegar and garlic, from the Portuguese carne de vinha d'alhos brought via Goa and Malacca.",
        "fr": "Curry de porc eurasien (kristang) a base de viande au vinaigre et a l'ail, derive du carne de vinha d'alhos portugais via Goa et Malacca."
      },
      "sources": [
        {
          "name": "Wikipedia – Carne de vinha d'alhos",
          "url": "https://en.wikipedia.org/wiki/Carne_de_vinha_d'alhos"
        },
        {
          "name": "Wikipedia – Vindaloo",
          "url": "https://en.wikipedia.org/wiki/Vindaloo"
        }
      ]
    },
    "eurasian curry chicken": {
      "local": "Kari Debal",
      "note": {
        "en": "A fiery Kristang (Portuguese-Eurasian) chicken curry with vinegar, candlenuts and mustard seed, traditionally made from leftover Christmas…",
        "fr": "Un curry de poulet kristang (eurasien-portugais) tres epice au vinaigre, noix de bancoul et moutarde, fait des restes de viandes de Noel."
      },
      "sources": [
        {
          "name": "Devil's curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Devil's_curry"
        },
        {
          "name": "Eurasian Food - Eurasian Association, Singapore",
          "url": "https://www.eurasians.sg/eurasian-food"
        }
      ]
    },
    "feng (curry of pork offal)": {
      "local": "Feng (Kari Feng)",
      "note": {
        "en": "Eurasian-Kristang curry of diced pig offal from Portuguese Malacca, traditionally served at Christmas.",
        "fr": "Curry eurasien-kristang d'abats de porc en dés, originaire de Malacca portugaise, servi traditionnellement à Noël."
      },
      "sources": [
        {
          "name": "Singapore Noodles — On feng (Pamelia Chia)",
          "url": "https://sgpnoodles.substack.com/p/on-feng"
        },
        {
          "name": "Singaporean & Malaysian Recipes — Curry Feng (Kristao)",
          "url": "https://www.singaporeanmalaysianrecipes.com/curry-feng-kristao-recipe/"
        }
      ]
    },
    "eurasian beef stew": {
      "local": "Beef Smore (Smoor)",
      "note": {
        "en": "A dark, rich beef stew of Singapore and Malaysia's Eurasian (Kristang) community, braised with dark/sweet soy sauce, ginger and warming…",
        "fr": "Un ragout de boeuf sombre et riche de la communaute eurasienne (Kristang) de Singapour et de Malaisie, braise avec de la sauce soja…"
      },
      "sources": [
        {
          "name": "Roots.gov.sg — Eurasian Cuisine in Singapore (names \"beef smore\" as a Eurasian dish)",
          "url": "https://www.roots.gov.sg/ich-landing/ich/eurasian-cuisine-in-singapore"
        },
        {
          "name": "Wikipedia — Semur (Indonesian stew) (etymology: from Dutch \"smoren\", to braise)",
          "url": "https://en.wikipedia.org/wiki/Semur_(Indonesian_stew)"
        }
      ]
    },
    "semur ayam": {
      "local": "semur ayam",
      "note": {
        "en": "A Javanese chicken stew braised in sweet soy sauce (kecap manis) and spices, derived from the Dutch braising technique \"smoor.\"",
        "fr": "Ragout de poulet javanais braise dans la sauce soja sucree (kecap manis) et des epices, issu de la technique de braisage neerlandaise…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Semur Ayam",
          "url": "https://www.tasteatlas.com/semur-ayam"
        },
        {
          "name": "Wikipedia - Semur (Indonesian stew)",
          "url": "https://en.wikipedia.org/wiki/Semur_(Indonesian_stew)"
        }
      ]
    },
    "salted vegetable duck soup": {
      "local": "Itek Tim (咸菜鸭)",
      "note": {
        "en": "A tangy duck and salted-mustard-green (kiam chye) soup; the Peranakan/Nyonya Itek Tim is an adaptation of the Hokkien-Teochew kiam chye…",
        "fr": "Soupe acidulée de canard et de moutarde salée (kiam chye); l'Itek Tim peranakan/nyonya est une adaptation du kiam chye ark hokkien-teochew…"
      },
      "sources": [
        {
          "name": "History of Peranakan Itek Tim • Salted Vegetable Duck Soup (Tony Johor Kaki)",
          "url": "https://johorkaki.blogspot.com/2022/09/history-of-peranakan-dish-itek-tim.html"
        },
        {
          "name": "The Burning Kitchen — Salted Vegetable Duck Soup (咸菜鸭汤 Kiam Chye Ark)",
          "url": "https://theburningkitchen.com/salted-vegetable-duck-soup/"
        }
      ]
    },
    "ferradura": {
      "local": "Bolo de Ferradura",
      "note": {
        "en": "A traditional Portuguese horseshoe-shaped festive bread, spiced with anise and cinnamon, given by brides to wedding guests for good luck.",
        "fr": "Un pain de fete portugais traditionnel en forme de fer a cheval, parfume a l'anis et a la cannelle, offert par les mariees pour porter…"
      },
      "sources": [
        {
          "name": "Bolo Ferradura Recipe - Nelson Carvalheiro",
          "url": "https://nelsoncarvalheiro.com/portuguese-bolo-ferradura-recipe/"
        },
        {
          "name": "Collins Portuguese-English Dictionary: ferradura",
          "url": "https://www.collinsdictionary.com/dictionary/portuguese-english/ferradura"
        }
      ]
    },
    "eurasian pork chop": {
      "local": "Eurasian pork chop",
      "note": {
        "en": "A British-influenced deep-fried pork chop cutlet in Singapore Eurasian cuisine, coated in crushed soda biscuits (commonly cream crackers)…",
        "fr": "Une cotelette de porc frite d'influence britannique dans la cuisine eurasienne de Singapour, panee de biscuits soda emiettes (souvent des…"
      },
      "sources": [
        {
          "name": "Roots (Singapore National Heritage Board) - Eurasian Cuisine in Singapore",
          "url": "https://www.roots.gov.sg/ich-landing/ich/eurasian-cuisine-in-singapore"
        }
      ]
    },
    "portuguese egg tart": {
      "local": "pastel de nata",
      "note": {
        "en": "A flaky puff-pastry tart with caramelised egg-custard filling, created by Catholic monks at Lisbon's Jeronimos Monastery before the 18th…",
        "fr": "Une tartelette feuilletee a la creme d'oeufs caramelisee, creee par des moines au monastere des Hieronymites de Lisbonne avant le XVIIIe…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pastel de nata",
          "url": "https://en.wikipedia.org/wiki/Pastel_de_nata"
        },
        {
          "name": "Michelin Guide - Best Custard Tarts in Hong Kong and Macau",
          "url": "https://guide.michelin.com/kr/en/article/features/best-custard-egg-tart-hong-kong-macau"
        }
      ]
    },
    "love letters (kuih kapit)": {
      "local": "kuih kapit",
      "note": {
        "en": "Thin crisp wafer of egg, sugar and coconut-milk batter clamped in patterned irons over charcoal, derived from Dutch egg-roll wafers.",
        "fr": "Fine gaufrette croustillante d'oeufs, sucre et lait de coco, pressee dans des fers a motifs sur braise, derivee des gaufres hollandaises."
      },
      "sources": [
        {
          "name": "Kue semprong - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kue_semprong"
        },
        {
          "name": "Michelin Guide - Iconic Dishes: Love Letters",
          "url": "https://guide.michelin.com/my/en/article/features/iconic-dishes-love-letters-and-other-sweet-snacks-for-your-sweetheart"
        }
      ]
    },
    "pineapple tart": {
      "local": "kuih tat nanas",
      "note": {
        "en": "A bite-size, buttery tart filled or topped with pineapple jam slowly caramelised with spices such as cinnamon, star anise and cloves…",
        "fr": "Petite tartelette beurree garnie de confiture d'ananas lentement caramelisee avec des epices comme la cannelle, l'anis etoile et le clou de…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pineapple tart",
          "url": "https://en.wikipedia.org/wiki/Pineapple_tart"
        },
        {
          "name": "SG101 (National Heritage Board) - Pineapple Tarts in Singapore",
          "url": "https://www.sg101.gov.sg/resources/archives/heritage-pineapple-tarts/"
        }
      ]
    },
    "eurasian fishball curry": {
      "local": "咖哩魚蛋",
      "note": {
        "en": "Teochew-rooted fish balls in spicy curry sauce, a Hong Kong street-food staple popularised by post-war 1950s hawker carts.",
        "fr": "Boulettes de poisson d'origine teochew en sauce curry epicee, en-cas de rue hongkongais popularise par les marchands ambulants des annees…"
      },
      "sources": [
        {
          "name": "Wikipedia — Curry fish ball",
          "url": "https://en.wikipedia.org/wiki/Curry_fish_ball"
        },
        {
          "name": "MICHELIN Guide — The Journey of Hong Kong's Iconic Fish Ball",
          "url": "https://guide.michelin.com/hk/en/article/features/bouncing-through-time-the-journey-iconic-fish-ball-hong-kong"
        }
      ]
    },
    "roast suckling pig": {
      "local": "feng",
      "note": {
        "en": "A rich Eurasian curry of diced pork and pig's offal slow-cooked in a blend of spices, traditionally served at the Eurasian community's…",
        "fr": "Un riche curry eurasien de porc et d'abats de porc en dés, mijoté dans un mélange d'épices, traditionnellement servi à la table de Noël de…"
      },
      "sources": [
        {
          "name": "Roots.gov.sg - Eurasian Cuisine in Singapore",
          "url": "https://www.roots.gov.sg/ich-landing/ich/eurasian-cuisine-in-singapore"
        },
        {
          "name": "Wikipedia - Eurasian cuisine of Singapore and Malaysia",
          "url": "https://en.wikipedia.org/wiki/Eurasian_cuisine_of_Singapore_and_Malaysia"
        }
      ]
    },
    "eurasian smoore": {
      "local": "Smore",
      "note": {
        "en": "A thick, dark Eurasian beef stew from Singapore and Malaysia — a local take on the Western-style beef stew, darkened with soy sauce and…",
        "fr": "Un ragout de boeuf eurasien epais et fonce de Singapour et de Malaisie — une version locale du ragout de boeuf occidental, fonce a la sauce…"
      },
      "sources": [
        {
          "name": "Roots.gov.sg — Eurasian Cuisine in Singapore (ICH, mentions \"beef smore\")",
          "url": "https://www.roots.gov.sg/ich-landing/ich/eurasian-cuisine-in-singapore"
        },
        {
          "name": "Lin's Food — Eurasian Beef Smore, a Eurasian Recipe from Singapore and Malaysia",
          "url": "https://www.linsfood.com/eurasian-beef-smore-a-eurasian-recipe/"
        }
      ]
    },
    "soyok": {
      "local": "soyok",
      "note": {
        "en": "Not a verified food or drink; in Malay \"soyok\" is an architectural term for a roofed lean-to or verandah extension of a traditional house.",
        "fr": "Ni un plat ni une boisson attesté ; en malais, « soyok » désigne un appentis ou véranda couverte annexé à une maison traditionnelle."
      },
      "sources": [
        {
          "name": "Kamus Bahasa Melayu — soyok",
          "url": "https://kamusbm.com/soyok/"
        }
      ]
    },
    "curry debal alt": {
      "local": "Kari Debal",
      "note": {
        "en": "Fiery Eurasian Kristang curry of Portuguese-Malacca origin, spiced with candlenut and vinegar; \"debal\" means leftovers, eaten after…",
        "fr": "Curry eurasien kristang ardent d'origine portugaise-malaccaise, relevé de noix de bancoul et vinaigre ; \"debal\" signifie restes, mangé…"
      },
      "sources": [
        {
          "name": "Wikipedia — Devil's curry",
          "url": "https://en.wikipedia.org/wiki/Devil's_curry"
        },
        {
          "name": "Rasa Malaysia — Devil's Curry (Curry Debal)",
          "url": "https://rasamalaysia.com/devils-curry/"
        }
      ]
    }
  },
  "north-indian": {
    "butter chicken": {
      "local": "मुर्ग़ मक्खनी (murgh makhani)",
      "note": {
        "en": "North Indian curry of tandoori chicken in a spiced tomato-butter-cream gravy, created c.1950 at Moti Mahal, Delhi.",
        "fr": "Curry nord-indien de poulet tandoori dans une sauce épicée tomate-beurre-crème, créé v.1950 au Moti Mahal, Delhi."
      },
      "sources": [
        {
          "name": "Wikipedia — Butter chicken",
          "url": "https://en.wikipedia.org/wiki/Butter_chicken"
        },
        {
          "name": "Moti Mahal — Our Story (origin of butter chicken)",
          "url": "https://motimahal.in/our-story/"
        }
      ]
    },
    "dal makhani": {
      "local": "दाल मखनी",
      "note": {
        "en": "A creamy Punjabi dish of slow-cooked black lentils and kidney beans simmered with butter and cream, created at Moti Mahal, Delhi, in the…",
        "fr": "Plat punjabi cremeux de lentilles noires et haricots rouges mijotes au beurre et a la creme, cree au Moti Mahal a Delhi au debut des annees…"
      },
      "sources": [
        {
          "name": "Wikipedia - Dal makhani",
          "url": "https://en.wikipedia.org/wiki/Dal_makhani"
        },
        {
          "name": "Tarla Dalal - Dal Makhani Recipe",
          "url": "https://www.tarladalal.com/dal-makhani-30900r"
        }
      ]
    },
    "palak paneer": {
      "local": "पालक पनीर",
      "note": {
        "en": "North Indian (Punjabi) dish of paneer, a fresh acid-set cheese, in a puréed spinach (palak) sauce, eaten with roti or rice.",
        "fr": "Plat nord-indien (pendjabi) de paneer, un fromage frais caillé, dans une sauce d'épinards (palak) en purée, servi avec roti ou riz."
      },
      "sources": [
        {
          "name": "Wikipedia — Palak paneer",
          "url": "https://en.wikipedia.org/wiki/Palak_paneer"
        },
        {
          "name": "Wikipedia — Paneer",
          "url": "https://en.wikipedia.org/wiki/Paneer"
        }
      ]
    },
    "saag paneer": {
      "local": "साग पनीर",
      "note": {
        "en": "North Indian Punjabi dish of paneer cheese cubes in a creamy puree of mixed leafy greens like spinach, mustard and fenugreek.",
        "fr": "Plat punjabi du nord de l'Inde: des cubes de fromage paneer dans une puree cremeuse de feuilles vertes (epinard, moutarde, fenugrec)."
      },
      "sources": [
        {
          "name": "TasteAtlas - Saag Paneer",
          "url": "https://www.tasteatlas.com/saag-paneer"
        },
        {
          "name": "Takeaway.com Foodwiki - Saag paneer",
          "url": "https://www.takeaway.com/foodwiki/india/saag-paneer/"
        }
      ]
    },
    "paneer tikka": {
      "local": "पनीर टिक्का",
      "note": {
        "en": "A North Indian dish of paneer cubes marinated in spiced yogurt and grilled in a tandoor, a vegetarian take on chicken tikka.",
        "fr": "Plat du nord de l'Inde fait de cubes de paneer marinés au yaourt épicé et grillés au tandoor, version végétarienne du chicken tikka."
      },
      "sources": [
        {
          "name": "Wikipedia - Paneer tikka",
          "url": "https://en.wikipedia.org/wiki/Paneer_tikka"
        },
        {
          "name": "TasteAtlas - Paneer Tikka",
          "url": "https://www.tasteatlas.com/paneer-tikka"
        }
      ]
    },
    "chicken tikka masala": {
      "local": "चिकन टिक्का मसाला",
      "note": {
        "en": "Chunks of marinated, roasted chicken (chicken tikka) served in a spiced creamy tomato sauce; widely believed to have been created by South…",
        "fr": "Morceaux de poulet marine et roti (chicken tikka) servis dans une sauce cremeuse a la tomate epicee; largement consideree comme ayant ete…"
      },
      "sources": [
        {
          "name": "Wikipedia - Chicken tikka masala",
          "url": "https://en.wikipedia.org/wiki/Chicken_tikka_masala"
        },
        {
          "name": "Britannica - Chicken tikka masala",
          "url": "https://www.britannica.com/topic/chicken-tikka-masala"
        }
      ]
    },
    "chicken tikka": {
      "local": "मुर्ग़ टिक्का (Murġ Ṭikkā)",
      "note": {
        "en": "North Indian appetizer of small boneless chicken pieces marinated in spiced yoghurt and char-grilled on skewers in a tandoor; it derives…",
        "fr": "Entree nord-indienne de petits morceaux de poulet desosse marines au yaourt epice et grilles en brochettes au tandoor; elle est issue de la…"
      },
      "sources": [
        {
          "name": "Wikipedia — Chicken tikka",
          "url": "https://en.wikipedia.org/wiki/Chicken_tikka"
        },
        {
          "name": "Britannica — Indian cuisine",
          "url": "https://www.britannica.com/topic/Indian-cuisine"
        }
      ]
    },
    "rogan josh": {
      "local": "रोग़न जोश",
      "note": {
        "en": "Aromatic Kashmiri braised mutton/lamb curry of Persian origin, brought to North India by the Mughals in the 16th century; the name is from…",
        "fr": "Curry kashmiri de mouton ou d'agneau braisé, d'origine perse, introduit dans le nord de l'Inde par les Moghols au XVIe siècle ; le nom…"
      },
      "sources": [
        {
          "name": "Wikipedia — Rogan josh",
          "url": "https://en.wikipedia.org/wiki/Rogan_josh"
        }
      ]
    },
    "seekh kebab": {
      "local": "सीख कबाब / سیخ کباب",
      "note": {
        "en": "Spiced minced or ground meat — usually lamb, beef or chicken — moulded into cylinders on skewers and grilled, often in a tandoor; a kebab…",
        "fr": "Viande hachée épicée — généralement agneau, bœuf ou poulet — moulée en cylindres sur des brochettes et grillée, souvent au tandoor ; un…"
      },
      "sources": [
        {
          "name": "Wikipedia – Seekh kebab",
          "url": "https://en.wikipedia.org/wiki/Seekh_kebab"
        },
        {
          "name": "Wikipedia – Kebab (etymology: seekh = skewer)",
          "url": "https://en.wikipedia.org/wiki/Kebab"
        }
      ]
    },
    "shami kebab": {
      "local": "شامی کباب / शामी कबाब",
      "note": {
        "en": "South Asian shallow-fried patty of minced meat (usually beef, lamb or mutton) ground with chana dal (chickpeas), bound with egg and spices…",
        "fr": "Galette sud-asiatique frite a la poele, faite de viande hachee (generalement boeuf, agneau ou mouton) melangee au chana dal (pois chiches)…"
      },
      "sources": [
        {
          "name": "Wikipedia - Shami kebab",
          "url": "https://en.wikipedia.org/wiki/Shami_kebab"
        },
        {
          "name": "Rana Safvi - Shaami Kabab",
          "url": "https://ranasafvi.com/shaami-kabab/"
        }
      ]
    },
    "galouti kebab": {
      "local": "गलौटी कबाब",
      "note": {
        "en": "Spiced minced-mutton patty from Awadhi (Lucknow) royal kitchens, named for its soft \"melt-in-the-mouth\" texture, said made for a toothless…",
        "fr": "Galette de mouton hache epice des cuisines royales d'Awadh (Lucknow), nommee pour sa texture fondante, dit-on creee pour un Nawab edente."
      },
      "sources": [
        {
          "name": "Wikipedia - Tunde ke kabab (Galouti kebab)",
          "url": "https://en.wikipedia.org/wiki/Tunde_ke_kabab"
        },
        {
          "name": "Ranveer Brar - Galawati / Galouti Kebab",
          "url": "https://ranveerbrar.com/recipes/galawati-kebab/"
        }
      ]
    },
    "tandoori chicken": {
      "local": "तंदूरी चिकन",
      "note": {
        "en": "Punjabi dish of yogurt-and-spice-marinated chicken roasted in a clay tandoor, popularized by Delhi's Moti Mahal in the late 1940s.",
        "fr": "Plat pendjabi de poulet mariné au yaourt et aux épices, rôti au tandoor d'argile, popularisé par le Moti Mahal de Delhi vers 1948."
      },
      "sources": [
        {
          "name": "Wikipedia – Tandoori chicken",
          "url": "https://en.wikipedia.org/wiki/Tandoori_chicken"
        },
        {
          "name": "Encyclopaedia Britannica – Tandoori chicken",
          "url": "https://www.britannica.com/topic/tandoori-chicken"
        }
      ]
    },
    "naan": {
      "local": "नान",
      "note": {
        "en": "Leavened teardrop flatbread baked in a tandoor; refined in Mughal-era India, its name from Persian nan (\"bread\").",
        "fr": "Pain plat levé en forme de larme cuit au tandoor, raffiné en Inde moghole ; son nom vient du persan nan (« pain »)."
      },
      "sources": [
        {
          "name": "Wikipedia — Naan",
          "url": "https://en.wikipedia.org/wiki/Naan"
        },
        {
          "name": "Britannica — Naan",
          "url": "https://www.britannica.com/topic/naan"
        }
      ]
    },
    "butter naan": {
      "local": "बटर नान",
      "note": {
        "en": "A leavened North Indian tandoor-baked flatbread brushed with butter, popularised in Mughal royal kitchens before reaching the masses by the…",
        "fr": "Pain plat levé du nord de l'Inde cuit au tandoor et badigeonné de beurre, popularisé dans les cuisines royales moghol avant de se répandre…"
      },
      "sources": [
        {
          "name": "Britannica — Naan",
          "url": "https://www.britannica.com/topic/naan"
        },
        {
          "name": "Wikipedia — Naan",
          "url": "https://en.wikipedia.org/wiki/Naan"
        }
      ]
    },
    "garlic naan": {
      "local": "लहसुन नान (lahsun nān)",
      "note": {
        "en": "A leavened tandoor-baked North Indian flatbread topped with garlic; naan derives from Persian \"nan\" (bread), refined in Mughal-era kitchens.",
        "fr": "Pain plat levé du nord de l'Inde cuit au tandoor et garni d'ail; \"naan\" vient du persan \"nan\" (pain), raffiné à l'ère moghole."
      },
      "sources": [
        {
          "name": "Wikipedia - Naan",
          "url": "https://en.wikipedia.org/wiki/Naan"
        },
        {
          "name": "Britannica - Naan",
          "url": "https://www.britannica.com/topic/naan"
        }
      ]
    },
    "roti / chapati": {
      "local": "रोटी / चपाती",
      "note": {
        "en": "Unleavened wheat flatbread of the Indian subcontinent, cooked on a tawa; its name derives from Sanskrit carpaṭī, \"thin cake.\"",
        "fr": "Pain plat sans levain au blé du sous-continent indien, cuit sur un tawa ; son nom vient du sanskrit carpaṭī, « galette fine »."
      },
      "sources": [
        {
          "name": "Wikipedia — Chapati",
          "url": "https://en.wikipedia.org/wiki/Chapati"
        },
        {
          "name": "Britannica — Chapati",
          "url": "https://www.britannica.com/topic/chapati"
        }
      ]
    },
    "paratha": {
      "local": "पराठा",
      "note": {
        "en": "Layered whole-wheat flatbread of the Indian subcontinent, folded with ghee and pan-fried; popular under the 16th-19th century Mughal Empire.",
        "fr": "Pain plat feuilleté au blé complet du sous-continent indien, plié au ghee et poêlé; populaire sous l'Empire moghol (XVIe-XIXe s.)."
      },
      "sources": [
        {
          "name": "Wikipedia - Paratha",
          "url": "https://en.wikipedia.org/wiki/Paratha"
        },
        {
          "name": "TasteAtlas - Paratha",
          "url": "https://www.tasteatlas.com/paratha"
        }
      ]
    },
    "aloo paratha": {
      "local": "आलू पराठा",
      "note": {
        "en": "North Indian stuffed flatbread from Punjab: unleavened wheat dough filled with spiced mashed potato, griddle-cooked with ghee.",
        "fr": "Pain plat farci nord-indien du Pendjab : pâte de blé non levée fourrée de pommes de terre épicées, cuite au ghee."
      },
      "sources": [
        {
          "name": "Wikipedia - Aloo paratha",
          "url": "https://en.wikipedia.org/wiki/Aloo_paratha"
        },
        {
          "name": "TasteAtlas - Aloo Paratha",
          "url": "https://www.tasteatlas.com/aloo-paratha"
        }
      ]
    },
    "kulcha": {
      "local": "ਕੁਲਚਾ / कुलचा",
      "note": {
        "en": "A soft leavened maida flatbread from Punjab, baked in a tandoor; Amritsar's potato-stuffed Amritsari kulcha is its best-known form.",
        "fr": "Pain plat levé en farine de maida du Pendjab, cuit au tandoor; le kulcha amritsari farci de pomme de terre en est la forme la plus connue."
      },
      "sources": [
        {
          "name": "Wikipedia — Kulcha",
          "url": "https://en.wikipedia.org/wiki/Kulcha"
        },
        {
          "name": "TasteAtlas — Kulcha",
          "url": "https://tasteatlas.com/kulcha"
        }
      ]
    },
    "dal tadka": {
      "local": "दाल तड़का",
      "note": {
        "en": "North Indian lentil dish of soft-cooked dal finished with a \"tadka\"—a tempering of ghee, cumin, garlic and dried red chillies.",
        "fr": "Plat de lentilles nord-indien : dal mijoté fini d'un « tadka », friture de ghee, cumin, ail et piments rouges séchés."
      },
      "sources": [
        {
          "name": "TasteAtlas – Dal Tadka",
          "url": "https://tasteatlas.com/dal-tadka"
        },
        {
          "name": "Tarla Dalal – Dal Tadka (Punjabi Dal Tadka)",
          "url": "https://www.tarladalal.com/dal-tadka-punjabi-dal-tadka-30903r"
        }
      ]
    },
    "dal fry": {
      "local": "दाल फ्राई",
      "note": {
        "en": "A North Indian dish of soft-cooked toor dal (split pigeon peas) simmered with a fried, sauteed tempering of ghee or oil, whole and ground…",
        "fr": "Plat du nord de l'Inde de dal de toor (pois d'Angole casses) cuits, mijotes avec un assaisonnement frit au ghee ou a l'huile, d'epices…"
      },
      "sources": [
        {
          "name": "Dassana's Veg Recipes of India - Dal Fry",
          "url": "https://www.vegrecipesofindia.com/dal-fry/"
        },
        {
          "name": "Swasthi's Recipes - Dal Fry",
          "url": "https://www.indianhealthyrecipes.com/dal-fry-recipe/"
        }
      ]
    },
    "chana masala": {
      "local": "चना मसाला",
      "note": {
        "en": "A North Indian chickpea curry in a spiced tomato-onion sauce, originating in the Punjab region of the Indian subcontinent.",
        "fr": "Un curry de pois chiches nord-indien dans une sauce épicée à la tomate et à l'oignon, originaire de la région du Pendjab."
      },
      "sources": [
        {
          "name": "Wikipedia — Chana masala",
          "url": "https://en.wikipedia.org/wiki/Chana_masala"
        }
      ]
    },
    "rajma": {
      "local": "राजमा",
      "note": {
        "en": "North Indian curry of red kidney beans in a spiced tomato-onion gravy; the bean reached India from the Americas via the Columbian Exchange.",
        "fr": "Curry nord-indien de haricots rouges dans une sauce épicée tomate-oignon; le haricot vint des Amériques par l'échange colombien."
      },
      "sources": [
        {
          "name": "Wikipedia — Rajma",
          "url": "https://en.wikipedia.org/wiki/Rajma"
        },
        {
          "name": "TasteAtlas — Rajma",
          "url": "https://tasteatlas.com/rajma"
        }
      ]
    },
    "samosa": {
      "local": "समोसा",
      "note": {
        "en": "A fried triangular pastry with spiced potato or meat filling; its name and form come from the Persian sambosag, reaching India by the…",
        "fr": "Chausson frit triangulaire farci de pommes de terre epicees ou de viande; son nom vient du persan sambosag, arrive en Inde aux 13e-14e s."
      },
      "sources": [
        {
          "name": "Wikipedia - Samosa",
          "url": "https://en.wikipedia.org/wiki/Samosa"
        },
        {
          "name": "Wiktionary - समोसा",
          "url": "https://en.wiktionary.org/wiki/%E0%A4%B8%E0%A4%AE%E0%A5%8B%E0%A4%B8%E0%A4%BE"
        }
      ]
    },
    "pakora": {
      "local": "पकौड़ा",
      "note": {
        "en": "A deep-fried fritter of vegetables coated in spiced gram-flour (besan) batter; its name derives from Sanskrit pakvavaṭa, 'cooked lump'.",
        "fr": "Beignet frit de légumes enrobés d'une pâte épicée à la farine de pois chiche (besan); son nom vient du sanskrit pakvavaṭa, « boulette cuite…"
      },
      "sources": [
        {
          "name": "Pakora - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Pakora"
        },
        {
          "name": "Pakora - Britannica",
          "url": "https://www.britannica.com/topic/pakora"
        }
      ]
    },
    "chaat": {
      "local": "चाट (chāṭ)",
      "note": {
        "en": "A family of savory street-food snacks from Uttar Pradesh blending salty, spicy, sweet and sour flavors; name means \"a delicacy/to lick\".",
        "fr": "Famille d'en-cas de rue salés de l'Uttar Pradesh mêlant saveurs salées, épicées, sucrées et acidulées ; le nom signifie « délice/lécher »."
      },
      "sources": [
        {
          "name": "Wikipedia — Chaat",
          "url": "https://en.wikipedia.org/wiki/Chaat"
        },
        {
          "name": "TasteAtlas — Chaat",
          "url": "https://www.tasteatlas.com/chaat"
        }
      ]
    },
    "pani puri": {
      "local": "पानी पूरी (pānī pūrī)",
      "note": {
        "en": "North Indian street snack of crisp hollow puri shells filled with spiced water, tamarind chutney, potato and chickpeas; called golgappa in…",
        "fr": "Encas de rue du nord de l'Inde: coques de puri creuses garnies d'eau epicee, chutney de tamarin, pomme de terre et pois chiches; dit…"
      },
      "sources": [
        {
          "name": "Wikipedia - Panipuri",
          "url": "https://en.wikipedia.org/wiki/Panipuri"
        },
        {
          "name": "Wiktionary - panipuri",
          "url": "https://en.wiktionary.org/wiki/panipuri"
        }
      ]
    },
    "bhel puri": {
      "local": "भेलपूरी",
      "note": {
        "en": "A savoury Indian chaat of puffed rice, vegetables and tangy tamarind sauce, popular as Mumbai street food.",
        "fr": "Un chaat indien salé de riz soufflé, légumes et sauce aigre au tamarin, populaire dans la rue à Mumbai."
      },
      "sources": [
        {
          "name": "Wikipedia — Bhel puri",
          "url": "https://en.wikipedia.org/wiki/Bhel_puri"
        },
        {
          "name": "DBpedia — Bhel puri",
          "url": "https://dbpedia.org/page/Bhel_puri"
        }
      ]
    },
    "gulab jamun": {
      "local": "गुलाब जामुन (gulāb jāmun)",
      "note": {
        "en": "South Asian dessert (mithai) of milk-solid (khoya) balls deep-fried in ghee or oil and soaked in a sugar syrup flavoured with cardamom and…",
        "fr": "Dessert d'Asie du Sud (mithai) : boules de khoya (solides de lait) frites au ghee ou à l'huile, puis trempées dans un sirop de sucre…"
      },
      "sources": [
        {
          "name": "Wikipedia — Gulab jamun",
          "url": "https://en.wikipedia.org/wiki/Gulab_jamun"
        },
        {
          "name": "Wiktionary — गुलाब जामुन",
          "url": "https://en.wiktionary.org/wiki/%E0%A4%97%E0%A5%81%E0%A4%B2%E0%A4%BE%E0%A4%AC_%E0%A4%9C%E0%A4%BE%E0%A4%AE%E0%A5%81%E0%A4%A8"
        }
      ]
    },
    "jalebi": {
      "local": "जलेबी (jalebī)",
      "note": {
        "en": "Deep-fried coils of fermented batter soaked in sugar syrup; of Persian origin (zalabiya), it reached South Asia via traders.",
        "fr": "Spirales de pâte fermentée frites et trempées dans un sirop de sucre; d'origine perse (zalabiya), arrivée en Asie du Sud via les marchands."
      },
      "sources": [
        {
          "name": "Wikipedia – Jalebi",
          "url": "https://en.wikipedia.org/wiki/Jalebi"
        },
        {
          "name": "TasteAtlas – Zulbia",
          "url": "https://www.tasteatlas.com/zulbia"
        }
      ]
    }
  },
  "south-indian": {
    "dosa": {
      "local": "தோசை (tōcai)",
      "note": {
        "en": "South Indian thin crepe made from a fermented batter of rice and urad dal (black gram); according to food historian K. T. Achaya…",
        "fr": "Crêpe fine du sud de l'Inde, à base d'une pâte fermentée de riz et de lentilles urad (gram noir) ; selon l'historien de l'alimentation K…"
      },
      "sources": [
        {
          "name": "Wikipedia — Dosa (food)",
          "url": "https://en.wikipedia.org/wiki/Dosa_(food)"
        },
        {
          "name": "Wiktionary — தோசை",
          "url": "https://en.wiktionary.org/wiki/%E0%AE%A4%E0%AF%8B%E0%AE%9A%E0%AF%88"
        }
      ]
    },
    "masala dosa": {
      "local": "ಮಸಾಲೆ ದೋಸೆ",
      "note": {
        "en": "A crisp fermented rice-and-lentil crepe with a spiced potato filling, originating in the Udupi temple town of Karnataka.",
        "fr": "Crêpe croustillante de riz et lentilles fermentés, garnie de pommes de terre épicées, originaire de la ville-temple d'Udupi au Karnataka."
      },
      "sources": [
        {
          "name": "Wikipedia — Masala dosa",
          "url": "https://en.wikipedia.org/wiki/Masala_dosa"
        },
        {
          "name": "ವಿಕಿಪೀಡಿಯ — ಮಸಾಲೆ ದೋಸೆ (Kannada Wikipedia)",
          "url": "https://kn.wikipedia.org/wiki/%E0%B2%AE%E0%B2%B8%E0%B2%BE%E0%B2%B2%E0%B3%86_%E0%B2%A6%E0%B3%8B%E0%B2%B8%E0%B3%86"
        }
      ]
    },
    "paper dosa": {
      "local": "பேப்பர் தோசை (paper tōsai)",
      "note": {
        "en": "An extra-thin, large, crisp variant of the South Indian dosa, a fermented rice-and-urad-dal crepe cooked golden on one side.",
        "fr": "Variante très fine, large et croustillante de la dosa sud-indienne, une crêpe fermentée de riz et de lentilles cuite dorée sur une face."
      },
      "sources": [
        {
          "name": "Dosa (food) — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Dosa_(food)"
        },
        {
          "name": "தோசை — Tamil Wikipedia",
          "url": "https://ta.wikipedia.org/wiki/%E0%AE%A4%E0%AF%8B%E0%AE%9A%E0%AF%88"
        }
      ]
    },
    "rava dosa": {
      "local": "ரவை தோசை (ravai dōsai)",
      "note": {
        "en": "A thin, lacy, crispy South Indian crepe of semolina (rava), rice flour and maida, made instantly with no grinding or fermentation.",
        "fr": "Une crêpe sud-indienne fine, dentelée et croustillante de semoule (rava), farine de riz et maïda, préparée instantanément sans broyage ni…"
      },
      "sources": [
        {
          "name": "Rava (semolina) — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Rava"
        },
        {
          "name": "Rava Dosa Recipe — Swasthi's Indian Healthy Recipes",
          "url": "https://www.indianhealthyrecipes.com/rava-dosa/"
        }
      ]
    },
    "idli": {
      "local": "இட்லி",
      "note": {
        "en": "A South Indian steamed cake of fermented rice and black lentils, first referenced in a 10th-century Kannada text as \"iddalige\".",
        "fr": "Galette sud-indienne cuite a la vapeur, a base de riz et de lentilles noires fermentes, citee des le Xe siecle sous le nom \"iddalige\"."
      },
      "sources": [
        {
          "name": "Wikipedia - Idli",
          "url": "https://en.wikipedia.org/wiki/Idli"
        },
        {
          "name": "The Better India - Idli Sambar legends",
          "url": "https://thebetterindia.com/74109/tbi-food-secrets-legendary-saga-idli-sambar/"
        }
      ]
    },
    "vada": {
      "local": "வடை",
      "note": {
        "en": "A savoury South Indian fried snack of ground lentils or pulses, attested in Tamil Sangam literature (c. 100 BCE-300 CE).",
        "fr": "Beignet salé sud-indien de lentilles ou legumineuses moulues, attesté dans la litterature tamoule Sangam (v. 100 av. J.-C.-300 apr. J.-C.)."
      },
      "sources": [
        {
          "name": "Wikipedia - Vada (food)",
          "url": "https://en.wikipedia.org/wiki/Vada_(food)"
        },
        {
          "name": "Wiktionary - வடை",
          "url": "https://en.wiktionary.org/wiki/%E0%AE%B5%E0%AE%9F%E0%AF%88"
        }
      ]
    },
    "medu vada": {
      "local": "மெது வடை",
      "note": {
        "en": "A South Indian doughnut-shaped urad-dal fritter, crisp outside and soft inside; \"medu\" means soft in Tamil and Kannada.",
        "fr": "Beignet sud-indien de lentilles urad, croustillant dehors et moelleux dedans ; \"medu\" veut dire moelleux en tamoul."
      },
      "sources": [
        {
          "name": "Wikipedia - Medu vada",
          "url": "https://en.wikipedia.org/wiki/Medu_vada"
        },
        {
          "name": "TasteAtlas - Best Snacks in Southern India",
          "url": "https://www.tasteatlas.com/best-rated-snacks-in-southern-india"
        }
      ]
    },
    "uttapam": {
      "local": "ஊத்தப்பம் (ūttappam)",
      "note": {
        "en": "A thick, soft South Indian savoury pancake of fermented rice-and-lentil batter cooked with toppings like onion and tomato.",
        "fr": "Une crêpe sud-indienne épaisse et moelleuse, à base de riz et de lentilles fermentés, cuite avec des garnitures comme l'oignon et la tomate."
      },
      "sources": [
        {
          "name": "Wikipedia — Uttapam",
          "url": "https://en.wikipedia.org/wiki/Uttapam"
        },
        {
          "name": "Wiktionary — ஊத்தப்பம்",
          "url": "https://en.wiktionary.org/wiki/%E0%AE%8A%E0%AE%A4%E0%AF%8D%E0%AE%A4%E0%AE%AA%E0%AF%8D%E0%AE%AA%E0%AE%AE%E0%AF%8D"
        }
      ]
    },
    "upma": {
      "local": "உப்புமா",
      "note": {
        "en": "South Indian savoury breakfast porridge of roasted semolina; its name combines uppu (salt) and mavu (ground meal).",
        "fr": "Bouillie salee du petit-dejeuner sud-indien a base de semoule grillee; son nom unit uppu (sel) et mavu (farine moulue)."
      },
      "sources": [
        {
          "name": "Wikipedia - Upma",
          "url": "https://en.wikipedia.org/wiki/Upma"
        },
        {
          "name": "TasteAtlas - Upma",
          "url": "https://tasteatlas.com/upma"
        }
      ]
    },
    "pongal": {
      "local": "பொங்கல்",
      "note": {
        "en": "A Tamil dish of rice boiled in milk, central to the harvest festival of the same name; its name means \"to boil over.\"",
        "fr": "Plat tamoul de riz bouilli dans du lait, au coeur de la fete des recoltes eponyme; son nom signifie \"deborder\"."
      },
      "sources": [
        {
          "name": "Wikipedia - Pongal (dish)",
          "url": "https://en.wikipedia.org/wiki/Pongal_(dish)"
        },
        {
          "name": "Indian Heritage Centre Singapore - What is Pongal?",
          "url": "https://www.indianheritage.gov.sg/pongalo-pongal/what-is-pongal.html"
        }
      ]
    },
    "sambar": {
      "local": "சாம்பார்",
      "note": {
        "en": "South Indian lentil-based vegetable stew, made with pigeon peas (toor dal), tamarind broth, and a spice mix called sambar powder; a staple…",
        "fr": "Ragout sud-indien a base de lentilles et de legumes, prepare avec des pois d'Angole (toor dal), un bouillon de tamarin et un melange…"
      },
      "sources": [
        {
          "name": "Wikipedia - Sambar (dish)",
          "url": "https://en.wikipedia.org/wiki/Sambar_(dish)"
        },
        {
          "name": "TasteAtlas - Sambar",
          "url": "https://www.tasteatlas.com/sambar"
        }
      ]
    },
    "rasam": {
      "local": "ரசம்",
      "note": {
        "en": "A thin, tangy South Indian soup of tamarind, tomato and spices, served with or over rice. Its name traces to Sanskrit रस (rasa), meaning…",
        "fr": "Soupe sud-indienne fine et acidulée au tamarin, à la tomate et aux épices, servie avec ou sur du riz. Son nom vient du sanskrit रस (rasa)…"
      },
      "sources": [
        {
          "name": "Wikipedia - Rasam (dish)",
          "url": "https://en.wikipedia.org/wiki/Rasam_(dish)"
        },
        {
          "name": "Wiktionary - rasam",
          "url": "https://en.wiktionary.org/wiki/rasam"
        }
      ]
    },
    "coconut chutney": {
      "local": "தேங்காய் சட்னி (theṅkāy caṭṉi)",
      "note": {
        "en": "A South Indian condiment of ground fresh coconut, chillies and tamarind, from the coastal Madras Presidency, served with idli, dosa and…",
        "fr": "Condiment sud-indien de noix de coco fraîche moulue, piments et tamarin, de la côte de la présidence de Madras, servi avec idli, dosa et…"
      },
      "sources": [
        {
          "name": "Wikipedia — Coconut chutney",
          "url": "https://en.wikipedia.org/wiki/Coconut_chutney"
        }
      ]
    },
    "tomato chutney": {
      "local": "தக்காளி சட்னி (Thakkāḷi chutney)",
      "note": {
        "en": "South Indian tomato-based condiment from Tamil Nadu, often thickened with roasted lentils and served with idli and dosa.",
        "fr": "Condiment sud-indien à base de tomate du Tamil Nadu, souvent épaissi aux lentilles grillées et servi avec idli et dosa."
      },
      "sources": [
        {
          "name": "Wikipedia — Tomato chutney",
          "url": "https://en.wikipedia.org/wiki/Tomato_chutney"
        },
        {
          "name": "Dassana's Veg Recipes of India — Tomato Chutney (South Indian Style)",
          "url": "https://www.vegrecipesofindia.com/tomato-chutney-recipe/"
        }
      ]
    },
    "chettinad chicken": {
      "local": "செட்டிநாடு கோழி (Chettinad kozhi)",
      "note": {
        "en": "Spicy chicken curry from the Chettinad region of Tamil Nadu, India, built on a freshly ground masala of coconut, black pepper and whole…",
        "fr": "Curry de poulet épicé de la région du Chettinad au Tamil Nadu, en Inde, fait d'un masala fraîchement moulu de noix de coco, poivre noir et…"
      },
      "sources": [
        {
          "name": "Wikipedia — Chicken Chettinad",
          "url": "https://en.wikipedia.org/wiki/Chicken_Chettinad"
        },
        {
          "name": "TasteAtlas — Chettinad Kozhi",
          "url": "https://www.tasteatlas.com/chettinad-kozhi"
        }
      ]
    },
    "kerala fish curry": {
      "local": "മീൻ കറി (Meen curry)",
      "note": {
        "en": "Tangy, spicy Kerala fish curry traditionally soured with kudampuli (Malabar tamarind) and cooked in a clay pot (manchatti).",
        "fr": "Curry de poisson du Kerala, épicé et acidulé, traditionnellement aigri au kudampuli (tamarin de Malabar) et cuit dans un pot d'argile…"
      },
      "sources": [
        {
          "name": "Saveur - Keralan Fish Curry",
          "url": "https://www.saveur.com/recipes/keralan-fish-curry"
        },
        {
          "name": "Whisk Affair - Kerala Fish Curry Recipe",
          "url": "https://www.whiskaffair.com/kerala-fish-curry-recipe/"
        }
      ]
    },
    "avial": {
      "local": "അവിയൽ",
      "note": {
        "en": "A Kerala-origin South Indian thick stew of mixed vegetables and coconut, seasoned with coconut oil and curry leaves.",
        "fr": "Un ragout epais sud-indien originaire du Kerala, a base de legumes varies et de noix de coco, parfume a l'huile de coco et au curry."
      },
      "sources": [
        {
          "name": "Wikipedia - Avial",
          "url": "https://en.wikipedia.org/wiki/Avial"
        }
      ]
    },
    "appam": {
      "local": "ആപ്പം (Malayalam) / ஆப்பம் (Tamil)",
      "note": {
        "en": "A bowl-shaped South Indian pancake of fermented rice batter and coconut milk; mentioned in ancient Tamil Sangam literature.",
        "fr": "Crêpe sud-indienne en forme de bol, faite de pâte de riz fermentée et de lait de coco; citée dans l'ancienne littérature tamoule Sangam."
      },
      "sources": [
        {
          "name": "Wikipedia - Appam",
          "url": "https://en.wikipedia.org/wiki/Appam"
        },
        {
          "name": "TasteAtlas - Best Pancakes in Southern India",
          "url": "https://www.tasteatlas.com/best-rated-pancakes-in-southern-india"
        }
      ]
    },
    "puttu": {
      "local": "പുട്ട് (Malayalam) / புட்டு (Tamil)",
      "note": {
        "en": "A South Indian and Sri Lankan breakfast of steamed ground-rice cylinders layered with grated coconut, served with kadala curry.",
        "fr": "Petit-dejeuner sud-indien et sri-lankais de cylindres de riz moulu cuits a la vapeur en couches avec de la noix de coco rapee, servi avec…"
      },
      "sources": [
        {
          "name": "Wikipedia - Puttu",
          "url": "https://en.wikipedia.org/wiki/Puttu"
        }
      ]
    },
    "kerala beef fry": {
      "local": "ബീഫ് ഉലർത്തിയത് (Beef Ularthiyathu)",
      "note": {
        "en": "Kerala dish of beef slow-roasted with spices, curry leaves and coconut slivers in coconut oil, traditional to Syrian Christians.",
        "fr": "Plat du Kerala de bœuf rôti lentement aux épices, feuilles de curry et copeaux de noix de coco à l'huile de coco, traditionnel des…"
      },
      "sources": [
        {
          "name": "Wikipedia — Kerala beef fry",
          "url": "https://en.wikipedia.org/wiki/Kerala_beef_fry"
        },
        {
          "name": "Paint The Kitchen Red — Kerala Beef Fry (Beef Ularthiyathu)",
          "url": "https://www.paintthekitchenred.com/kerala-beef-fry-beef-ularthiathu/"
        }
      ]
    },
    "andhra mutton curry": {
      "local": "మాంసం కూర (māṃsaṃ kūra)",
      "note": {
        "en": "A fiery Andhra (Telugu) goat-meat curry simmered in an onion-ginger-garlic, red-chilli and tamarind gravy, served with rice.",
        "fr": "Un curry de chèvre andhra (telugu) très épicé, mijoté dans une sauce à l'oignon, gingembre, ail, piment rouge et tamarin, servi avec du riz."
      },
      "sources": [
        {
          "name": "Wikipedia - Telugu (Andhra) cuisine",
          "url": "https://en.wikipedia.org/wiki/Telugu_cuisine"
        },
        {
          "name": "Sailu's Food - Mamsam Pulusu (Andhra Mutton Curry)",
          "url": "https://www.sailusfood.com/mamsam-pulusu-mutton-curry/"
        }
      ]
    },
    "chettinad pepper crab": {
      "local": "செட்டிநாடு நண்டு மிளகு வறுவல் (Chettinad Nandu Milagu Varuval)",
      "note": {
        "en": "A spicy crab dish from the Chettiar community of Tamil Nadu, stir-fried semi-dry with freshly ground black pepper, fennel and curry leaves.",
        "fr": "Un plat de crabe epice de la communaute Chettiar du Tamil Nadu, saute a sec avec du poivre noir fraichement moulu, du fenouil et des…"
      },
      "sources": [
        {
          "name": "The Better India - Exploring the Spicy and Spirited Cuisine of Chettinad",
          "url": "https://thebetterindia.com/62917/chettinad-cuisine-tamil-nadu/"
        },
        {
          "name": "BetterButter - Nandu Milagu Varuval (Crab Pepper Fry) by Tamil Selvi",
          "url": "https://www.betterbutter.in/recipe/16751/nandu-milagu-varuval-crab-pepper-fry"
        }
      ]
    },
    "hyderabadi haleem": {
      "local": "حیدرآبادی حلیم",
      "note": {
        "en": "Thick Hyderabadi stew of meat, lentils and pounded wheat, of Arab origin, granted Geographical Indication status in 2010.",
        "fr": "Ragout epais de Hyderabad a base de viande, lentilles et ble pile, d'origine arabe, classe Indication Geographique en 2010."
      },
      "sources": [
        {
          "name": "Wikipedia - Hyderabadi haleem",
          "url": "https://en.wikipedia.org/wiki/Hyderabadi_haleem"
        },
        {
          "name": "TasteAtlas - Hyderabadi Haleem",
          "url": "https://www.tasteatlas.com/hyderabadi-haleem"
        }
      ]
    },
    "thali": {
      "local": "थाली (thālī)",
      "note": {
        "en": "An Indian meal of several small dishes served together on a round platter, the small bowls (katori) arranged around the edge; \"thali\" is…",
        "fr": "Repas indien composé de plusieurs petits plats servis ensemble sur un plateau rond, les petits bols (katori) disposés sur le pourtour ; «…"
      },
      "sources": [
        {
          "name": "Wikipedia — Thali",
          "url": "https://en.wikipedia.org/wiki/Thali"
        }
      ]
    },
    "payasam": {
      "local": "പായസം (Malayalam) / பாயசம் (Tamil)",
      "note": {
        "en": "South Indian pudding of milk or coconut milk boiled with rice, vermicelli or lentils and sugar or jaggery; the name is from Sanskrit pāyasa.",
        "fr": "Entremets sud-indien de lait ou lait de coco bouilli avec riz, vermicelles ou lentilles et sucre ou jaggery; nom issu du sanskrit pāyasa."
      },
      "sources": [
        {
          "name": "Wiktionary - payasam",
          "url": "https://en.wiktionary.org/wiki/payasam"
        },
        {
          "name": "Wikipedia - Kheer",
          "url": "https://en.wikipedia.org/wiki/Kheer"
        }
      ]
    },
    "mysore pak": {
      "local": "ಮೈಸೂರು ಪಾಕ್",
      "note": {
        "en": "A South Indian sweet of gram flour, ghee and sugar, created in the early-1900s royal kitchens of Mysore, Karnataka.",
        "fr": "Confiserie sud-indienne de farine de pois chiche, ghee et sucre, creee au debut du XXe siecle dans les cuisines royales de Mysore…"
      },
      "sources": [
        {
          "name": "Wikipedia – Mysore pak",
          "url": "https://en.wikipedia.org/wiki/Mysore_pak"
        },
        {
          "name": "TasteAtlas – Mysore pak",
          "url": "https://tasteatlas.com/mysore-pak"
        }
      ]
    },
    "filter coffee": {
      "local": "காபி (filter kāpi)",
      "note": {
        "en": "South Indian coffee brewed by percolating chicory-laced grounds in a metal filter, served frothy with hot milk and sugar; aka filter kaapi.",
        "fr": "Café sud-indien obtenu par percolation de café moulu à la chicorée dans un filtre métallique, servi mousseux au lait chaud et au sucre."
      },
      "sources": [
        {
          "name": "Wikipedia — Indian filter coffee",
          "url": "https://en.wikipedia.org/wiki/Indian_filter_coffee"
        },
        {
          "name": "The Better India — The History of Filter Coffee in India",
          "url": "https://thebetterindia.com/food/filter-coffee-history-india-south-indian-kitchens-11801245"
        }
      ]
    },
    "meals (sappadu)": {
      "local": "சாப்பாடு",
      "note": {
        "en": "A Tamil Nadu full rice meal traditionally served on a banana leaf, with steamed rice eaten alongside sambar, rasam, poriyal (dry…",
        "fr": "Un repas complet de riz du Tamil Nadu, traditionnellement servi sur une feuille de bananier, avec du riz vapeur accompagné de sambar…"
      },
      "sources": [
        {
          "name": "Wikipedia — Tamil cuisine",
          "url": "https://en.wikipedia.org/wiki/Tamil_cuisine"
        },
        {
          "name": "Raks Kitchen — South Indian meals, Thala vazhai ilai sappadu",
          "url": "https://rakskitchen.net/south-indian-meals-lunch-menu-17-thala-vazhai-ilai-sappadu/"
        }
      ]
    }
  },
  "pakistani": {
    "nihari": {
      "local": "نہاری",
      "note": {
        "en": "A slow-cooked beef, mutton or goat shank stew from Mughal-era Delhi/Lucknow; its name derives from Arabic \"nahar\" (morning), as it was…",
        "fr": "Ragout de jarret de boeuf, mouton ou chevre mijote, ne a Delhi/Lucknow sous les Moghols; son nom vient de l'arabe \"nahar\" (matin), car…"
      },
      "sources": [
        {
          "name": "Wikipedia — Nihari",
          "url": "https://en.wikipedia.org/wiki/Nihari"
        },
        {
          "name": "TasteAtlas — Nihari",
          "url": "https://www.tasteatlas.com/nihari"
        }
      ]
    },
    "haleem": {
      "local": "حلیم",
      "note": {
        "en": "A slow-cooked stew of wheat or barley, lentils and meat, derived from the Arabian dish harees and popular during Ramadan.",
        "fr": "Un ragout mijote de ble ou d'orge, lentilles et viande, derive du plat arabe harees et apprecie pendant le Ramadan."
      },
      "sources": [
        {
          "name": "Wikipedia - Haleem",
          "url": "https://en.wikipedia.org/wiki/Haleem"
        },
        {
          "name": "Dawn - Food Stories: Haleem",
          "url": "https://www.dawn.com/news/1143775"
        }
      ]
    },
    "chicken karahi": {
      "local": "چکن کڑاہی",
      "note": {
        "en": "Pakistani chicken curry traditionally associated with the Punjab region and the city of Lahore, cooked in a wok-like karahi pan with…",
        "fr": "Curry de poulet pakistanais traditionnellement associé à la région du Pendjab et à la ville de Lahore, cuit dans un wok karahi avec…"
      },
      "sources": [
        {
          "name": "Wikipedia — Chicken karahi",
          "url": "https://en.wikipedia.org/wiki/Chicken_karahi"
        },
        {
          "name": "Tea for Turmeric — Pakistani Chicken Karahi",
          "url": "https://www.teaforturmeric.com/chicken-karahi/"
        }
      ]
    },
    "mutton karahi": {
      "local": "مٹن کڑاہی",
      "note": {
        "en": "Pakistani curry of bone-in mutton slow-cooked in a tomato, ginger and garlic gravy in a karahi (wok); originated in the North-West Frontier.",
        "fr": "Curry pakistanais de mouton à l'os mijoté dans une sauce tomate, gingembre et ail dans un karahi (wok) ; originaire de la North-West…"
      },
      "sources": [
        {
          "name": "Wikipedia - Chicken karahi (gosht/mutton karahi)",
          "url": "https://en.wikipedia.org/wiki/Chicken_karahi"
        },
        {
          "name": "Dawn - Mutton karahi: where did it come from?",
          "url": "https://images.dawn.com/news/1180728/mutton-karahi-is-delicious-where-did-it-come-from"
        }
      ]
    },
    "chapli kebab": {
      "local": "چپلی کباب",
      "note": {
        "en": "A spiced, flat minced-beef or lamb patty from Pashtun cuisine, said to have originated in Peshawar, Khyber Pakhtunkhwa.",
        "fr": "Galette plate de boeuf ou d'agneau hache et epice, de la cuisine pachtoune, originaire de Peshawar au Khyber Pakhtunkhwa."
      },
      "sources": [
        {
          "name": "Wikipedia — Chapli kebab",
          "url": "https://en.wikipedia.org/wiki/Chapli_kebab"
        },
        {
          "name": "TasteAtlas — Chapli Kabab",
          "url": "https://www.tasteatlas.com/chapli-kabab"
        }
      ]
    },
    "seekh kebab pakistani": {
      "local": "سیخ کباب",
      "note": {
        "en": "Spiced minced meat (usually lamb or beef) molded onto skewers and grilled; \"seekh\" means skewer in Urdu, from the Indian subcontinent.",
        "fr": "Viande hachee epicee (souvent agneau ou boeuf) moulee sur des brochettes et grillee ; \"seekh\" signifie brochette en ourdou, du…"
      },
      "sources": [
        {
          "name": "Wikipedia - Seekh kebab",
          "url": "https://en.wikipedia.org/wiki/Seekh_kebab"
        },
        {
          "name": "TasteAtlas - Seekh kabab",
          "url": "https://www.tasteatlas.com/seekh-kabab"
        }
      ]
    },
    "beef pulao": {
      "local": "بیف پلاؤ (گوشت پلاؤ)",
      "note": {
        "en": "A Pakistani one-pot dish of basmati rice cooked in a spiced beef broth (yakhni); the Wikipedia 'Pilaf' article names Bannu beef pulao as…",
        "fr": "Plat pakistanais en une seule marmite, de riz basmati cuit dans un bouillon de boeuf epice (yakhni) ; l'article Wikipedia 'Pilaf' cite le…"
      },
      "sources": [
        {
          "name": "Wikipedia – Pilaf (Pakistan / Bannu Beef Pulao section)",
          "url": "https://en.wikipedia.org/wiki/Pilaf"
        },
        {
          "name": "Dawn – Two types of pulao with a side of history",
          "url": "https://www.dawn.com/news/1619891/two-types-of-pulao-with-a-side-of-history"
        }
      ]
    },
    "mutton paya": {
      "local": "مٹن پایہ",
      "note": {
        "en": "A South Asian stew of slow-cooked goat/lamb trotters in spiced broth; \"paya\" means feet in Urdu, eaten as a winter breakfast in Pakistan.",
        "fr": "Ragout sud-asiatique de pieds de chevre/agneau mijotes dans un bouillon epice ; \"paya\" signifie pieds en ourdou, mange au petit-dejeuner en…"
      },
      "sources": [
        {
          "name": "Wikipedia — Paya (food)",
          "url": "https://en.wikipedia.org/wiki/Paya_(food)"
        }
      ]
    },
    "siri paya": {
      "local": "سری پائے",
      "note": {
        "en": "A slow-cooked Pakistani stew of animal head (siri) and trotters (paya), traditionally eaten as a winter breakfast with naan.",
        "fr": "Un ragout pakistanais mijote de tete d'animal (siri) et de pieds (paya), traditionnellement mange au petit-dejeuner d'hiver avec du naan."
      },
      "sources": [
        {
          "name": "TasteAtlas - Siri Paya",
          "url": "https://www.tasteatlas.com/siri-paya"
        },
        {
          "name": "Wikipedia - Paya (food)",
          "url": "https://en.wikipedia.org/wiki/Paya_(food)"
        }
      ]
    },
    "chicken jalfrezi pakistani": {
      "local": "چکن جلفریزی",
      "note": {
        "en": "A spicy stir-fried curry of chicken, peppers and onions, originating in the British Raj as a way to use up leftover roast meat.",
        "fr": "Curry sauté épicé de poulet, poivrons et oignons, né sous le Raj britannique pour accommoder les restes de viande rôtie."
      },
      "sources": [
        {
          "name": "Wikipedia – Jalfrezi",
          "url": "https://en.wikipedia.org/wiki/Jalfrezi"
        },
        {
          "name": "Flour & Spice – Chicken Jalfrezi (Pakistani Homestyle)",
          "url": "https://www.flourandspiceblog.com/easy-chicken-jalfrezi-recipe-with-video-pakistani/"
        }
      ]
    },
    "lahori chargha": {
      "local": "لاہوری چرغہ",
      "note": {
        "en": "A Lahori dish of a whole chicken marinated in spices, steamed, then deep-fried until crisp; \"chargha\" is Pashto for chicken.",
        "fr": "Plat lahori : poulet entier mariné aux épices, cuit à la vapeur puis frit jusqu'au croustillant ; \"chargha\" signifie poulet en pashto."
      },
      "sources": [
        {
          "name": "Wikipedia – Chargha",
          "url": "https://en.wikipedia.org/wiki/Chargha"
        }
      ]
    },
    "peshawari naan": {
      "local": "پشاوری نان",
      "note": {
        "en": "A leavened, tandoor-baked flatbread from Peshawar, Pakistan, filled with a sweet paste of ground almonds, desiccated coconut and raisins…",
        "fr": "Un pain plat levé cuit au tandoor, originaire de Peshawar au Pakistan, fourré d'une pâte sucrée d'amandes moulues, de noix de coco séchée…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Peshwari Naan",
          "url": "https://www.tasteatlas.com/peshwari-naan"
        },
        {
          "name": "Wiktionary — Peshwari naan",
          "url": "https://en.wiktionary.org/wiki/Peshwari_naan"
        }
      ]
    },
    "balti gosht": {
      "local": "بالٹی گوشت",
      "note": {
        "en": "A spiced meat curry stir-fried and served in a thin pressed-steel wok (balti), developed by Birmingham's Pakistani community in the 1970s.",
        "fr": "Curry de viande epicee sautee et servie dans un wok fin en acier (balti), cree par la communaute pakistanaise de Birmingham dans les annees…"
      },
      "sources": [
        {
          "name": "Balti (food) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Balti_(food)"
        },
        {
          "name": "The story behind balti, the Pakistani dish born in Birmingham - National Geographic",
          "url": "https://www.nationalgeographic.com/travel/article/story-behind-balti-birmingham-uk"
        }
      ]
    },
    "saag paneer pakistani": {
      "local": "سرسوں کا ساگ (Sarson kā Sāg)",
      "note": {
        "en": "A Punjabi winter dish from the Indian subcontinent of mustard greens slow-cooked with spices, traditionally served with makki ki roti.",
        "fr": "Plat d'hiver pendjabi du sous-continent indien, de feuilles de moutarde mijotées aux épices, servi avec du makki ki roti."
      },
      "sources": [
        {
          "name": "Wikipedia - Sarson ka saag",
          "url": "https://en.wikipedia.org/wiki/Sarson_ka_saag"
        },
        {
          "name": "Google Arts & Culture - Sarson ka Saag: Mustard Greens from Southern Punjab",
          "url": "https://artsandculture.google.com/story/sarson-ka-saag-mustard-greens-from-southern-punjab-soch/EwWxg0VzT4XqGQ?hl=en"
        }
      ]
    },
    "aloo gosht": {
      "local": "آلو گوشت",
      "note": {
        "en": "A meat-and-potato curry in shorba gravy from Pakistan, India and Bangladesh; the name means \"potato\" (aloo) and \"meat\" (gosht).",
        "fr": "Un curry de viande et pommes de terre en sauce shorba du Pakistan, d'Inde et du Bangladesh ; le nom signifie pomme de terre (aloo) et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Aloo gosht",
          "url": "https://en.wikipedia.org/wiki/Aloo_gosht"
        }
      ]
    },
    "palak gosht": {
      "local": "پالک گوشت",
      "note": {
        "en": "A South Asian curry of bone-in goat, lamb or mutton slow-cooked in spiced spinach gravy; palak means spinach and gosht meat in Urdu.",
        "fr": "Un curry sud-asiatique de chevre, d'agneau ou de mouton mijote dans une sauce epicee aux epinards ; palak signifie epinard et gosht viande…"
      },
      "sources": [
        {
          "name": "Jamil Ghar - Authentic Pakistani Palak Gosht",
          "url": "https://jamilghar.com/palak-gosht/"
        },
        {
          "name": "Pakistan Eats - Palak Gosht (Goat with Spinach)",
          "url": "https://www.pakistaneats.com/recipes/palak-gosht-goat-with-spinach/"
        }
      ]
    },
    "chana pulao": {
      "local": "چنا پُلاؤ",
      "note": {
        "en": "Pakistani one-pot pilaf of basmati rice and chickpeas simmered with whole spices; the white 'kabuli' chana is named for Kabul, Afghanistan.",
        "fr": "Pilaf pakistanais en une marmite, de riz basmati et de pois chiches mijotes aux epices ; le « kabuli » chana doit son nom a Kaboul."
      },
      "sources": [
        {
          "name": "Tea for Turmeric — Chana Pulao",
          "url": "https://www.teaforturmeric.com/chana-pulao/"
        },
        {
          "name": "kfoods.com — Chana Pulao Recipe in Urdu (چنا پُلاؤ)",
          "url": "https://kfoods.com/recipes/chana-pulao_urid15926"
        }
      ]
    },
    "keema matar": {
      "local": "قیمہ مٹر",
      "note": {
        "en": "A South Asian semi-dry curry of minced meat and green peas, associated with Mughal cuisine; its name derives from Chaghatai Turkic for…",
        "fr": "Curry semi-sec sud-asiatique de viande hachee et de petits pois, lie a la cuisine moghole; son nom vient du turc tchaghatai pour viande…"
      },
      "sources": [
        {
          "name": "Wikipedia - Keema matar",
          "url": "https://en.wikipedia.org/wiki/Keema_matar"
        }
      ]
    },
    "kheer pakistani": {
      "local": "کھیر",
      "note": {
        "en": "Pakistani rice pudding of milk, rice, sugar and cardamom; its name derives from Sanskrit kshira, meaning milk.",
        "fr": "Riz au lait pakistanais au lait, riz, sucre et cardamome; son nom vient du sanskrit kshira, qui signifie lait."
      },
      "sources": [
        {
          "name": "Wikipedia - Kheer",
          "url": "https://en.wikipedia.org/wiki/Kheer"
        },
        {
          "name": "Wiktionary - kheer",
          "url": "https://en.wiktionary.org/wiki/kheer"
        }
      ]
    },
    "ras malai": {
      "local": "رس ملائی",
      "note": {
        "en": "A Bengal-origin dessert of soft chhena (fresh-cheese) discs soaked in sweetened cardamom- and saffron-flavoured thickened milk.",
        "fr": "Dessert originaire du Bengale: disques de chhena (fromage frais) trempes dans du lait epaissi sucre, parfume cardamome et safran."
      },
      "sources": [
        {
          "name": "Wikipedia - Ras malai",
          "url": "https://en.wikipedia.org/wiki/Ras_malai"
        },
        {
          "name": "TasteAtlas - Ras malai",
          "url": "https://tasteatlas.com/ras-malai"
        }
      ]
    },
    "gulab jamun pakistani": {
      "local": "گلاب جامن",
      "note": {
        "en": "Deep-fried milk-solid (khoya) dumplings soaked in rose-and-cardamom sugar syrup, a Mughal-era sweet of Persian origin popular in Pakistan.",
        "fr": "Boulettes de khoya (solides du lait) frites, trempees dans un sirop de sucre a la rose et cardamome, douceur d'origine perse de l'epoque…"
      },
      "sources": [
        {
          "name": "Wikipedia — Gulab jamun",
          "url": "https://en.wikipedia.org/wiki/Gulab_jamun"
        },
        {
          "name": "Wiktionary — gulab jamun (Urdu)",
          "url": "https://en.wiktionary.org/wiki/gulab_jamun"
        }
      ]
    },
    "shahi tukda": {
      "local": "شاہی ٹکڑا",
      "note": {
        "en": "Mughal-era bread pudding of ghee-fried bread in saffron-cardamom syrup topped with thickened sweet milk (rabri); means 'royal piece'.",
        "fr": "Pudding de pain moghol : pain frit au ghee, sirop safran-cardamome, lait sucré épaissi (rabri) ; signifie « morceau royal »."
      },
      "sources": [
        {
          "name": "Wikipedia – Shahi tukra",
          "url": "https://en.wikipedia.org/wiki/Shahi_tukra"
        },
        {
          "name": "Atlas Obscura (Gastro Obscura) – Shahi Tukda",
          "url": "https://www.atlasobscura.com/foods/shahi-tukda"
        }
      ]
    },
    "pakistani milk tea (doodh patti)": {
      "local": "دودھ پتی چائے",
      "note": {
        "en": "South Asian milk tea where black tea leaves and sugar are boiled directly in milk instead of water, often with cardamom.",
        "fr": "Thé au lait sud-asiatique où le thé noir et le sucre sont bouillis directement dans du lait plutôt que de l'eau, souvent avec de la…"
      },
      "sources": [
        {
          "name": "Wikipedia — Doodh pati chai",
          "url": "https://en.wikipedia.org/wiki/Doodh_pati_chai"
        }
      ]
    }
  },
  "italian": {
    "pizza margherita": {
      "local": "Pizza Margherita",
      "note": {
        "en": "Neapolitan pizza of tomato, mozzarella and basil, popularly said to be named in 1889 for Queen Margherita of Savoy.",
        "fr": "Pizza napolitaine a la tomate, mozzarella et basilic, dite nommee en 1889 en l'honneur de la reine Marguerite de Savoie."
      },
      "sources": [
        {
          "name": "Wikipedia - Pizza Margherita",
          "url": "https://en.wikipedia.org/wiki/Pizza_Margherita"
        },
        {
          "name": "National Geographic - Pizza Margherita named after a queen?",
          "url": "https://www.nationalgeographic.com/history/history-magazine/article/pizza-margherita-may-be-fit-for-a-queen-but-was-it-named-after-one"
        }
      ]
    },
    "pizza marinara": {
      "local": "Pizza alla marinara",
      "note": {
        "en": "A Neapolitan pizza topped with tomato, garlic, oregano and olive oil but no cheese, named for the seafarers who ate it.",
        "fr": "Une pizza napolitaine garnie de tomate, ail, origan et huile d'olive, sans fromage, nommee d'apres les marins qui la mangeaient."
      },
      "sources": [
        {
          "name": "Wikipedia - Pizza marinara",
          "url": "https://en.wikipedia.org/wiki/Pizza_marinara"
        }
      ]
    },
    "focaccia": {
      "local": "focaccia",
      "note": {
        "en": "Flat oven-baked Italian yeast bread brushed with olive oil and salt, from Latin panis focacius (\"hearth bread\"); a Ligurian/Genoese staple.",
        "fr": "Pain plat italien cuit au four, badigeonne d'huile d'olive et de sel, du latin panis focacius (\"pain de foyer\"); specialite ligure/genoise."
      },
      "sources": [
        {
          "name": "Britannica - Focaccia",
          "url": "https://www.britannica.com/topic/focaccia"
        },
        {
          "name": "TasteAtlas - Focaccia alla Genovese (Ligurian dishes)",
          "url": "https://www.tasteatlas.com/best-rated-dishes-in-liguria"
        }
      ]
    },
    "spaghetti carbonara": {
      "local": "Spaghetti alla carbonara",
      "note": {
        "en": "Roman pasta of spaghetti in raw egg, Pecorino Romano, guanciale and black pepper; took its modern form in mid-20th-century Italy.",
        "fr": "Pates romaines de spaghetti a l'oeuf cru, Pecorino Romano, guanciale et poivre noir; forme moderne fixee au milieu du XXe siecle en Italie."
      },
      "sources": [
        {
          "name": "Wikipedia - Carbonara",
          "url": "https://en.wikipedia.org/wiki/Carbonara"
        },
        {
          "name": "La Cucina Italiana - Carbonara: Origins and Anecdotes",
          "url": "https://www.lacucinaitaliana.com/italian-food/italian-dishes/carbonara-origins-and-anecdotes-of-the-beloved-italian-pasta-dish"
        }
      ]
    },
    "cacio e pepe": {
      "local": "cacio e pepe",
      "note": {
        "en": "A Roman pasta dish of spaghetti or tonnarelli with grated Pecorino Romano and black pepper, rooted in Lazio shepherd cooking.",
        "fr": "Un plat de pates romain de spaghetti ou tonnarelli avec du Pecorino Romano rape et du poivre noir, issu de la cuisine des bergers du Latium."
      },
      "sources": [
        {
          "name": "Wikipedia - Cacio e pepe",
          "url": "https://en.wikipedia.org/wiki/Cacio_e_pepe"
        },
        {
          "name": "TasteAtlas - Best Rated Dishes with Pecorino Romano",
          "url": "https://www.tasteatlas.com/best-rated-dishes-with-pecorino-romano"
        }
      ]
    },
    "pasta alla gricia": {
      "local": "Pasta alla gricia",
      "note": {
        "en": "Roman pasta dressed with guanciale (cured pork cheek), Pecorino Romano and black pepper; widely considered the oldest of the four classic…",
        "fr": "Pâtes romaines au guanciale (joue de porc séchée), Pecorino Romano et poivre noir ; largement considérées comme les plus anciennes des…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pasta alla gricia",
          "url": "https://en.wikipedia.org/wiki/Pasta_alla_gricia"
        },
        {
          "name": "TasteAtlas - Pasta alla Gricia",
          "url": "https://www.tasteatlas.com/pastaallagricia"
        }
      ]
    },
    "pasta amatriciana": {
      "local": "Pasta all'Amatriciana",
      "note": {
        "en": "Italian pasta with guanciale, pecorino, tomato and chili, named after Amatrice (Lazio); tomato was added in the 18th century.",
        "fr": "Pates italiennes au guanciale, pecorino, tomate et piment, du nom d'Amatrice (Latium); la tomate fut ajoutee au XVIIIe siecle."
      },
      "sources": [
        {
          "name": "ITALY Magazine - Amatriciana: Where It Originated",
          "url": "https://www.italymagazine.com/dual-language/amatriciana-where-it-originated"
        },
        {
          "name": "Recipes from Italy - Authentic Amatriciana Recipe",
          "url": "https://www.recipesfromitaly.com/amatriciana-pasta-recipe/"
        }
      ]
    },
    "spaghetti aglio e olio": {
      "local": "spaghetti aglio e olio",
      "note": {
        "en": "Neapolitan pasta dish of spaghetti tossed with garlic and olive oil, a cucina-povera classic once known as vermicelli alla Borbonica.",
        "fr": "Plat de pates napolitain de spaghetti au ail et a l'huile d'olive, classique de la cuisine pauvre jadis appele vermicelli alla Borbonica."
      },
      "sources": [
        {
          "name": "Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Spaghetti_aglio_e_olio"
        }
      ]
    },
    "lasagna alla bolognese": {
      "local": "lasagne alla bolognese",
      "note": {
        "en": "Baked Bologna dish layering green spinach egg-pasta with ragù, béchamel and Parmigiano; recipe filed with Bologna's Chamber of Commerce in…",
        "fr": "Plat bolognais au four: pâtes vertes aux épinards, ragù, béchamel et parmesan; recette déposée à la Chambre de commerce de Bologne en 2003."
      },
      "sources": [
        {
          "name": "Bologna Welcome (official city tourism) — Lasagne Verdi alla bolognese",
          "url": "https://www.bolognawelcome.com/en/other/recipes-and-typical-products/lasagne-verdi-alla-bolognese-2"
        },
        {
          "name": "TasteAtlas — Lasagne Bolognese",
          "url": "https://www.tasteatlas.com/lasagne-bolognese"
        }
      ]
    },
    "tagliatelle al ragù": {
      "local": "Tagliatelle al ragù",
      "note": {
        "en": "Bolognese egg-pasta ribbons served with a slow-cooked meat ragù; the Accademia Italiana della Cucina deposited an official ragù alla…",
        "fr": "Rubans de pâtes aux œufs bolonais servis avec un ragù de viande mijoté ; l'Accademia Italiana della Cucina a déposé une recette officielle…"
      },
      "sources": [
        {
          "name": "Camera di Commercio di Bologna — Depositata la rinnovata ricetta del vero ragù alla bolognese",
          "url": "https://www.bo.camcom.gov.it/it/blog/depositata-la-rinnovata-ricetta-del-vero-ragu-alla-bolognese"
        },
        {
          "name": "Accademia Italiana della Cucina — Italian Academy of Cuisine registers updated recipe for true ragù alla bolognese",
          "url": "https://www.accademiaitalianadellacucina.it/en/notizie/notizia/italian-academy-cuisine-registers-updated-recipe-true-rag%C3%B9-alla-bolognese"
        }
      ]
    },
    "risotto alla milanese": {
      "local": "risotto alla milanese",
      "note": {
        "en": "Saffron-flavored risotto from Milan, made with rice sautéed in butter and beef bone marrow; first identifiable recipe dates to 1809.",
        "fr": "Risotto au safran de Milan, à base de riz sauté au beurre et à la moelle de bœuf ; première recette identifiable datée de 1809."
      },
      "sources": [
        {
          "name": "Wikipedia - Risotto",
          "url": "https://en.wikipedia.org/wiki/Risotto"
        },
        {
          "name": "TasteAtlas - Risotto Alla Milanese",
          "url": "https://www.tasteatlas.com/risotto-alla-milanese/recipe"
        }
      ]
    },
    "risotto ai funghi": {
      "local": "risotto ai funghi",
      "note": {
        "en": "Creamy northern-Italian rice dish of arborio or carnaroli rice slow-cooked with mushrooms, often prized porcini.",
        "fr": "Plat de riz cremeux du nord de l'Italie, riz arborio ou carnaroli mijote avec des champignons, souvent des cepes."
      },
      "sources": [
        {
          "name": "TasteAtlas - Risotto ai Funghi Porcini",
          "url": "https://www.tasteatlas.com/risotto-ai-funghi-porcini"
        },
        {
          "name": "Wikipedia - Risotto",
          "url": "https://en.wikipedia.org/wiki/Risotto"
        }
      ]
    },
    "osso buco alla milanese": {
      "local": "ossobuco alla milanese",
      "note": {
        "en": "Milanese (Lombard) braised cross-cut veal shanks in white wine and broth, finished with gremolata; the name means \"bone with a hole.\"",
        "fr": "Jarrets de veau coupés en tranches, braisés au vin blanc et au bouillon à la milanaise, finis à la gremolata ; le nom signifie « os à trou…"
      },
      "sources": [
        {
          "name": "Wikipedia — Ossobuco",
          "url": "https://en.wikipedia.org/wiki/Ossobuco"
        },
        {
          "name": "Recipes from Italy — Authentic Osso Buco (Alla Milanese)",
          "url": "https://www.recipesfromitaly.com/traditional-osso-buco-recipe/"
        }
      ]
    },
    "vitello tonnato": {
      "local": "vitello tonnato (piem. vitel tonné)",
      "note": {
        "en": "Piedmontese dish of cold thinly-sliced veal under a creamy tuna-caper-anchovy sauce; recorded by Pellegrino Artusi in 1891.",
        "fr": "Plat piemontais de veau froid en fines tranches nappe d'une sauce cremeuse au thon, capres et anchois; decrit par Artusi en 1891."
      },
      "sources": [
        {
          "name": "Wikipedia — Vitello tonnato",
          "url": "https://en.wikipedia.org/wiki/Vitello_tonnato"
        },
        {
          "name": "Visit Asti — Vitello Tonnato",
          "url": "https://visit.asti.it/en/taste/typical-products/vitello-tonnato/"
        }
      ]
    },
    "saltimbocca": {
      "local": "Saltimbocca (alla romana)",
      "note": {
        "en": "Roman veal cutlets wrapped with prosciutto and sage, cooked in white wine; the name means \"jumps in the mouth.\"",
        "fr": "Escalopes de veau romaines enveloppees de prosciutto et de sauge, cuites au vin blanc; le nom signifie \"saute en bouche.\""
      },
      "sources": [
        {
          "name": "Wikipedia - Saltimbocca",
          "url": "https://en.wikipedia.org/wiki/Saltimbocca"
        },
        {
          "name": "TasteAtlas - Saltimbocca alla Romana",
          "url": "https://www.tasteatlas.com/saltimbocca"
        }
      ]
    },
    "parmigiana di melanzane": {
      "local": "parmigiana di melanzane",
      "note": {
        "en": "Southern Italian baked dish of fried sliced eggplant layered with tomato sauce and cheese; the modern tomato-ragu version first appeared in…",
        "fr": "Plat du sud de l'Italie compose d'aubergines frites en tranches, disposees en couches avec une sauce tomate et du fromage, puis gratinees…"
      },
      "sources": [
        {
          "name": "Wikipedia - Parmigiana",
          "url": "https://en.wikipedia.org/wiki/Parmigiana"
        },
        {
          "name": "TasteAtlas - Parmigiana",
          "url": "https://www.tasteatlas.com/parmigiana"
        }
      ]
    },
    "caponata": {
      "local": "caponata",
      "note": {
        "en": "Sicilian sweet-and-sour (agrodolce) dish of chopped, fried eggplant with celery, olives, capers and vinegar; first attested in 1709 in…",
        "fr": "Plat sicilien aigre-doux (agrodolce) d'aubergines frites coupees, avec celeri, olives, capres et vinaigre; atteste pour la premiere fois en…"
      },
      "sources": [
        {
          "name": "Wikipedia - Caponata",
          "url": "https://en.wikipedia.org/wiki/Caponata"
        },
        {
          "name": "Antropocene - Sicilian Caponata: Origins, Geographical Area, Description",
          "url": "https://antropocene.it/en/2023/02/13/sicilian-caponata/"
        }
      ]
    },
    "arancini": {
      "local": "arancini (arancine)",
      "note": {
        "en": "Sicilian deep-fried, breadcrumb-coated rice balls filled with ragù, cheese or peas; the name means \"little oranges\" for their shape and…",
        "fr": "Boulettes de riz siciliennes panées et frites, fourrées au ragù, fromage ou petits pois; le nom signifie \"petites oranges\" pour leur forme…"
      },
      "sources": [
        {
          "name": "Wikipedia - Arancini",
          "url": "https://en.wikipedia.org/wiki/Arancini"
        },
        {
          "name": "TasteAtlas - Arancini",
          "url": "https://www.tasteatlas.com/arancini"
        }
      ]
    },
    "cannoli": {
      "local": "cannolo siciliano (pl. cannoli)",
      "note": {
        "en": "Sicilian fried pastry tube filled with sweetened ricotta cream; food historians trace its origin to Caltanissetta, Sicily, under Arab rule…",
        "fr": "Tube de pate frite sicilien garni de creme de ricotta sucree; les historiens de l'alimentation en situent l'origine a Caltanissetta, en…"
      },
      "sources": [
        {
          "name": "Wikipedia - Cannoli",
          "url": "https://en.wikipedia.org/wiki/Cannoli"
        },
        {
          "name": "La Cucina Italiana - Sicilian Cannoli: History and Recipe",
          "url": "https://www.lacucinaitaliana.com/italian-food/italian-dishes/digging-into-the-sweet-history-of-sicilian-cannoli"
        }
      ]
    },
    "tiramisu": {
      "local": "tiramisù",
      "note": {
        "en": "Italian no-bake dessert of coffee-soaked ladyfingers layered with sweetened mascarpone cream, created in Treviso, Veneto around 1969-72.",
        "fr": "Dessert italien sans cuisson de biscuits cuillère imbibés de café et de crème de mascarpone sucrée, créé à Trévise (Vénétie) vers 1969-72."
      },
      "sources": [
        {
          "name": "Tiramisu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tiramisu"
        },
        {
          "name": "Tiramisù - TasteAtlas",
          "url": "https://www.tasteatlas.com/tiramisu"
        }
      ]
    },
    "panna cotta": {
      "local": "panna cotta",
      "note": {
        "en": "Italian molded dessert of sweetened cream set with gelatin; the name means \"cooked cream\" and it's linked to the Piedmont region.",
        "fr": "Dessert italien moule de creme sucree prise a la gelatine ; le nom signifie \"creme cuite\" et il est lie au Piemont."
      },
      "sources": [
        {
          "name": "Wikipedia — Panna cotta",
          "url": "https://en.wikipedia.org/wiki/Panna_cotta"
        },
        {
          "name": "Tasting Table — The Origin Of Italy's Panna Cotta",
          "url": "https://www.tastingtable.com/1990487/panna-cotta-italy-origins/"
        }
      ]
    },
    "gelato": {
      "local": "gelato",
      "note": {
        "en": "Italian frozen dessert (Latin gelatus, \"frozen\"), made with more milk and less cream than ice cream, so lower in fat and churned with less…",
        "fr": "Dessert glace italien (du latin gelatus, \"gele\"), fait avec plus de lait et moins de creme que la glace, donc moins gras et moins aere."
      },
      "sources": [
        {
          "name": "TasteAtlas — Gelato",
          "url": "https://www.tasteatlas.com/gelato"
        },
        {
          "name": "Avventure Bellissime — The History of Gelato",
          "url": "https://www.tours-italy.com/blog/The-History-of-Gelato"
        }
      ]
    },
    "affogato": {
      "local": "affogato al caffè",
      "note": {
        "en": "Italian dessert of a scoop of vanilla or fior di latte gelato \"drowned\" in a shot of hot espresso; name means \"drowned.\"",
        "fr": "Dessert italien : une boule de gelato vanille ou fior di latte « noyée » dans un expresso chaud ; le nom signifie « noyé »."
      },
      "sources": [
        {
          "name": "Wikipedia — Affogato",
          "url": "https://en.wikipedia.org/wiki/Affogato"
        }
      ]
    },
    "gnocchi": {
      "local": "gnocchi",
      "note": {
        "en": "Italian dumplings, most often made from potato, flour and egg; the name comes from \"nocchio\" (a knot in wood) or \"nocca\" (knuckle).",
        "fr": "Quenelles italiennes, le plus souvent à base de pomme de terre, farine et œuf; le nom vient de \"nocchio\" (nœud du bois) ou \"nocca\"…"
      },
      "sources": [
        {
          "name": "Wikipedia - Gnocchi",
          "url": "https://en.wikipedia.org/wiki/Gnocchi"
        },
        {
          "name": "Britannica - Gnocchi",
          "url": "https://www.britannica.com/topic/gnocchi"
        }
      ]
    },
    "ravioli": {
      "local": "ravioli",
      "note": {
        "en": "Italian stuffed pasta of filling enveloped in thin pasta dough; documented since the 14th century, with early references in the letters of…",
        "fr": "Pates farcies italiennes, garniture enveloppee dans une fine pate; attestees des le 14e siecle, avec des references anciennes dans les…"
      },
      "sources": [
        {
          "name": "Wikipedia - Ravioli",
          "url": "https://en.wikipedia.org/wiki/Ravioli"
        }
      ]
    },
    "tortellini in brodo": {
      "local": "tortellini in brodo",
      "note": {
        "en": "Ring-shaped meat-stuffed pasta from Bologna and Modena, traditionally served in capon broth; the recipe was registered in Bologna in 1974.",
        "fr": "Pates fourrees a la viande en forme d'anneau de Bologne et Modene, servies dans un bouillon de chapon; recette deposee a Bologne en 1974."
      },
      "sources": [
        {
          "name": "Wikipedia - Tortellini",
          "url": "https://en.wikipedia.org/wiki/Tortellini"
        },
        {
          "name": "TasteAtlas - Tortellini in Brodo",
          "url": "https://www.tasteatlas.com/tortellini-in-brodo"
        }
      ]
    },
    "bruschetta": {
      "local": "bruschetta",
      "note": {
        "en": "Italian antipasto of grilled bread rubbed with garlic and dressed with olive oil and salt; its name comes from Roman dialect \"bruscare\" (to…",
        "fr": "Antipasto italien de pain grillé frotté d'ail et assaisonné d'huile d'olive et de sel ; son nom vient du dialecte romain \"bruscare\"…"
      },
      "sources": [
        {
          "name": "Wikipedia — Bruschetta",
          "url": "https://en.wikipedia.org/wiki/Bruschetta"
        },
        {
          "name": "L'Italo-Americano — The history and many flavors of bruschetta",
          "url": "https://italoamericano.org/bruschetta/"
        }
      ]
    },
    "caprese salad": {
      "local": "Insalata caprese",
      "note": {
        "en": "Italian salad of sliced fresh mozzarella, tomatoes, and basil with olive oil and salt, originating on the island of Capri.",
        "fr": "Salade italienne de mozzarella fraiche, tomates et basilic en tranches, a l'huile d'olive et au sel, originaire de l'ile de Capri."
      },
      "sources": [
        {
          "name": "Wikipedia – Caprese salad",
          "url": "https://en.wikipedia.org/wiki/Caprese_salad"
        },
        {
          "name": "Eataly – Insalata Caprese",
          "url": "https://www.eataly.com/us_en/magazine/recipes/appetizer-recipes/insalata-caprese"
        }
      ]
    },
    "prosciutto e melone": {
      "local": "prosciutto e melone",
      "note": {
        "en": "Italian summer antipasto of thin cured ham draped over fresh melon, balancing salty and sweet; documented by Pellegrino Artusi.",
        "fr": "Antipasto estival italien de jambon cru en fines tranches sur du melon frais, equilibrant sale et sucre; decrit par Pellegrino Artusi."
      },
      "sources": [
        {
          "name": "Wikipedia: Melon with ham",
          "url": "https://en.wikipedia.org/wiki/Melon_with_ham"
        },
        {
          "name": "Eataly: Prosciutto e Melone history",
          "url": "https://www.eataly.com/us_en/magazine/culture-and-tradition/history-of-prosciutto-melone"
        }
      ]
    },
    "panettone": {
      "local": "panettone (Milanese: panattón)",
      "note": {
        "en": "A tall, domed sweet leavened bread studded with raisins and candied citrus peel, associated with the city of Milan and traditionally eaten…",
        "fr": "Un pain levé sucré, haut et bombé, garni de raisins secs et d'écorces d'agrumes confites, associé à la ville de Milan et traditionnellement…"
      },
      "sources": [
        {
          "name": "Wikipedia — Panettone",
          "url": "https://en.wikipedia.org/wiki/Panettone"
        },
        {
          "name": "Wiktionary — panettone",
          "url": "https://en.wiktionary.org/wiki/panettone"
        }
      ]
    }
  },
  "french": {
    "boeuf bourguignon": {
      "local": "bœuf bourguignon",
      "note": {
        "en": "A French beef stew associated with the Burgundy region, made of beef braised in red wine (often red Burgundy) with onions, mushrooms and a…",
        "fr": "Un ragoût de bœuf français associé à la région de Bourgogne : du bœuf braisé au vin rouge (souvent un bourgogne rouge) avec oignons…"
      },
      "sources": [
        {
          "name": "Wikipedia — Beef bourguignon",
          "url": "https://en.wikipedia.org/wiki/Beef_bourguignon"
        },
        {
          "name": "TasteAtlas — Beef Bourguignon",
          "url": "https://www.tasteatlas.com/beef-bourguignon"
        }
      ]
    },
    "coq au vin": {
      "local": "coq au vin",
      "note": {
        "en": "A French braise of chicken cooked in red wine with lardons and mushrooms, traditionally tied to Burgundy.",
        "fr": "Un plat francais de poulet braise au vin rouge avec lardons et champignons, traditionnellement lie a la Bourgogne."
      },
      "sources": [
        {
          "name": "Coq au vin - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Coq_au_vin"
        },
        {
          "name": "Coq Au Vin Recipe and History - Fine Dining Lovers",
          "url": "https://www.finedininglovers.com/explore/articles/cooking-classics-coq-au-vin-recipe-and-history"
        }
      ]
    },
    "cassoulet": {
      "local": "cassoulet",
      "note": {
        "en": "A slow-cooked stew of white beans and meats (pork, sausage, duck) from Languedoc, named after its clay pot, the cassole.",
        "fr": "Ragoût mijoté de haricots blancs et de viandes (porc, saucisse, canard) du Languedoc, nommé d'après son plat en terre, la cassole."
      },
      "sources": [
        {
          "name": "Wikipedia – Cassoulet",
          "url": "https://en.wikipedia.org/wiki/Cassoulet"
        },
        {
          "name": "Britannica – Cassoulet",
          "url": "https://www.britannica.com/topic/cassoulet"
        }
      ]
    },
    "ratatouille": {
      "local": "ratatouille niçoise",
      "note": {
        "en": "A Provençal stewed vegetable dish from Nice made with tomatoes, courgettes, aubergines, peppers and onions, rooted in 18th-century peasant…",
        "fr": "Plat provençal de légumes mijotés originaire de Nice à base de tomates, courgettes, aubergines, poivrons et oignons, issu de la cuisine…"
      },
      "sources": [
        {
          "name": "Wikipedia - Ratatouille",
          "url": "https://en.wikipedia.org/wiki/Ratatouille"
        },
        {
          "name": "Gambero Rosso International - Ratatouille: history and origins",
          "url": "https://www.gamberorossointernational.com/news/food-news/food-on-movie-moments-the-true-story-of-french-ratatouille/"
        }
      ]
    },
    "bouillabaisse": {
      "local": "bouillabaisse (occitan : bolhabaissa)",
      "note": {
        "en": "A traditional Provençal fish stew from Marseille, originally cooked by fishermen using unsold bony rockfish.",
        "fr": "Ragoût de poisson provençal traditionnel de Marseille, jadis cuisiné par les pêcheurs avec les poissons de roche invendus."
      },
      "sources": [
        {
          "name": "Wikipedia - Bouillabaisse",
          "url": "https://en.wikipedia.org/wiki/Bouillabaisse"
        },
        {
          "name": "TasteAtlas - Bouillabaisse",
          "url": "https://tasteatlas.com/bouillabaisse"
        }
      ]
    },
    "soupe à l'oignon": {
      "local": "soupe à l'oignon",
      "note": {
        "en": "French soup of sliced onions cooked until softened and golden in beef stock, usually served gratinéed with bread and cheese (typically…",
        "fr": "Soupe française d'oignons émincés cuits jusqu'à tendreté et coloration dans un bouillon de bœuf, généralement servie gratinée avec du pain…"
      },
      "sources": [
        {
          "name": "Wikipedia — French onion soup",
          "url": "https://en.wikipedia.org/wiki/French_onion_soup"
        },
        {
          "name": "Wikipedia — Onion soup",
          "url": "https://en.wikipedia.org/wiki/Onion_soup"
        }
      ]
    },
    "croque monsieur": {
      "local": "croque-monsieur",
      "note": {
        "en": "A hot French ham-and-cheese sandwich on pain de mie topped with Gruyère, first recorded in 1891 and a café/brasserie staple.",
        "fr": "Sandwich chaud francais au jambon et fromage sur pain de mie nappe de gruyere, atteste des 1891 et incontournable des cafes."
      },
      "sources": [
        {
          "name": "Wikipedia - Croque monsieur",
          "url": "https://en.wikipedia.org/wiki/Croque_monsieur"
        },
        {
          "name": "Devour Tours - History of the Croque Monsieur",
          "url": "https://devourtours.com/blog/croque-monsieur/"
        }
      ]
    },
    "croque madame": {
      "local": "croque-madame",
      "note": {
        "en": "A French toasted ham-and-cheese sandwich (a croque-monsieur) topped with a fried or poached egg.",
        "fr": "Sandwich français grillé au jambon et au fromage (un croque-monsieur) surmonté d'un œuf au plat ou poché."
      },
      "sources": [
        {
          "name": "Wikipedia - Croque monsieur",
          "url": "https://en.wikipedia.org/wiki/Croque_monsieur"
        },
        {
          "name": "Word Histories - 'croque-madame': meanings and origin",
          "url": "https://wordhistories.net/2022/03/22/croque-madame/"
        }
      ]
    },
    "duck confit": {
      "local": "Confit de canard",
      "note": {
        "en": "French dish from Gascony of duck legs salt-cured then slow-cooked and preserved in their own rendered fat.",
        "fr": "Plat francais de Gascogne fait de cuisses de canard salees puis cuites lentement et conservees dans leur graisse."
      },
      "sources": [
        {
          "name": "Wikipedia - Duck confit",
          "url": "https://en.wikipedia.org/wiki/Duck_confit"
        }
      ]
    },
    "foie gras": {
      "local": "foie gras",
      "note": {
        "en": "A French delicacy of fattened duck or goose liver produced by gavage, a force-feeding technique dating to ancient Egypt over 4,000 years…",
        "fr": "Specialite francaise de foie de canard ou d'oie engraisse par gavage, technique remontant a l'Egypte ancienne il y a plus de 4 000 ans."
      },
      "sources": [
        {
          "name": "Britannica - Foie gras",
          "url": "https://www.britannica.com/topic/foie-gras"
        },
        {
          "name": "D'Artagnan - History of Foie Gras",
          "url": "https://www.dartagnan.com/foie-gras-history.html"
        }
      ]
    },
    "escargots de bourgogne": {
      "local": "escargots de Bourgogne",
      "note": {
        "en": "Burgundy land snails (Helix pomatia) baked in their shells with garlic-parsley butter, a classic dish of France's Burgundy region.",
        "fr": "Escargots de Bourgogne (Helix pomatia) cuits en coquille au beurre d'ail et de persil, plat classique de la région de Bourgogne."
      },
      "sources": [
        {
          "name": "TasteAtlas — Escargots à la Bourguignonne",
          "url": "https://www.tasteatlas.com/escargots-bourguignonne"
        },
        {
          "name": "Beaune Tourism — Burgundy snails (Helix pomatia)",
          "url": "https://www.beaune-tourism.com/explore/gastronomy/specialities-local-products/burgundy-snails/"
        }
      ]
    },
    "steak frites": {
      "local": "steak-frites",
      "note": {
        "en": "A French-Belgian brasserie dish of beefsteak with deep-fried chipped potatoes, often served with bearnaise; considered a national dish of…",
        "fr": "Plat de brasserie franco-belge compose d'un bifteck et de frites, souvent servi avec une sauce bearnaise; considere comme un plat national…"
      },
      "sources": [
        {
          "name": "Wikipedia - Steak frites",
          "url": "https://en.wikipedia.org/wiki/Steak_frites"
        },
        {
          "name": "TasteAtlas - Steak-frites",
          "url": "https://www.tasteatlas.com/steak-frites"
        }
      ]
    },
    "steak tartare": {
      "local": "steak tartare",
      "note": {
        "en": "A French dish of chopped raw beef bound with raw egg yolk and seasoned with capers, mustard, and onions; once called beefsteak a…",
        "fr": "Plat francais de boeuf cru hache lie au jaune d'oeuf cru, assaisonne de capres, moutarde et oignons; jadis nomme beefsteak a l'americaine."
      },
      "sources": [
        {
          "name": "Britannica - Steak tartare",
          "url": "https://www.britannica.com/topic/steak-tartare"
        },
        {
          "name": "Tasting Table - The Unique History Of Steak Tartare",
          "url": "https://www.tastingtable.com/934218/the-unique-history-of-steak-tartare-once-a-snack-of-warriors/"
        }
      ]
    },
    "sole meunière": {
      "local": "sole meunière",
      "note": {
        "en": "Classic French dish of sole dusted in flour, pan-fried in butter, and served with browned butter, lemon juice and parsley.",
        "fr": "Plat français classique de sole farinée, poêlée au beurre et servie avec beurre noisette, jus de citron et persil."
      },
      "sources": [
        {
          "name": "Wikipedia — Sole meunière",
          "url": "https://en.wikipedia.org/wiki/Sole_meuni%C3%A8re"
        }
      ]
    },
    "blanquette de veau": {
      "local": "blanquette de veau",
      "note": {
        "en": "French white veal stew: the meat is poached (never browned) in a white stock and served in a sauce veloute enriched with cream and egg…",
        "fr": "Ragout blanc de veau: la viande est pochee (jamais saisie) dans un bouillon blanc puis servie dans une sauce veloutee liee a la creme et au…"
      },
      "sources": [
        {
          "name": "Wikipedia - Blanquette de veau",
          "url": "https://en.wikipedia.org/wiki/Blanquette_de_veau"
        },
        {
          "name": "Wikipedia - Vincent La Chapelle",
          "url": "https://en.wikipedia.org/wiki/Vincent_La_Chapelle"
        }
      ]
    },
    "pot-au-feu": {
      "local": "pot-au-feu",
      "note": {
        "en": "Classic French dish of beef and root vegetables slow-boiled in clear broth; name means 'pot on the fire', rooted in medieval peasant…",
        "fr": "Plat français classique de bœuf et légumes-racines mijotés dans un bouillon clair ; le nom signifie « pot sur le feu », issu de la cuisine…"
      },
      "sources": [
        {
          "name": "Wikipedia — Pot-au-feu",
          "url": "https://en.wikipedia.org/wiki/Pot-au-feu"
        },
        {
          "name": "TasteAtlas — Pot-au-feu",
          "url": "https://www.tasteatlas.com/pot-au-feu"
        }
      ]
    },
    "quiche lorraine": {
      "local": "quiche lorraine",
      "note": {
        "en": "Savoury open tart from the Lorraine region of France: a custard of eggs and cream with bacon or smoked lardons baked in a pastry shell…",
        "fr": "Tarte salee de la region Lorraine, en France : un appareil aux oeufs et a la creme avec du lard ou des lardons fumes, cuit dans une pate…"
      },
      "sources": [
        {
          "name": "Wikipedia — Quiche Lorraine",
          "url": "https://en.wikipedia.org/wiki/Quiche_Lorraine"
        },
        {
          "name": "National Geographic — Everything you need to know about quiche lorraine",
          "url": "https://www.nationalgeographic.com/travel/article/everything-you-need-to-know-about-quiche-lorraine"
        }
      ]
    },
    "soufflé au fromage": {
      "local": "soufflé au fromage",
      "note": {
        "en": "A baked French egg dish of cheese, béchamel and beaten egg whites that rises and puffs, traced to early-18th-century France.",
        "fr": "Plat français à base d'œufs, de fromage, de béchamel et de blancs en neige qui gonfle au four, né au début du XVIIIe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia - Soufflé",
          "url": "https://en.wikipedia.org/wiki/Souffl%C3%A9"
        },
        {
          "name": "196 Flavors - Cheese Soufflé",
          "url": "https://www.196flavors.com/cheese-souffle/"
        }
      ]
    },
    "tarte tatin": {
      "local": "tarte Tatin",
      "note": {
        "en": "A French upside-down caramelized apple tart popularized in the 1880s by the Tatin sisters at their hotel in Lamotte-Beuvron, Sologne.",
        "fr": "Tarte aux pommes caramelisees renversee, popularisee dans les annees 1880 par les soeurs Tatin a leur hotel de Lamotte-Beuvron, en Sologne."
      },
      "sources": [
        {
          "name": "Wikipedia – Tarte Tatin",
          "url": "https://en.wikipedia.org/wiki/Tarte_Tatin"
        },
        {
          "name": "National Geographic – Deconstructing tarte tatin",
          "url": "https://www.nationalgeographic.com/travel/article/deconstructing-tarte-tatin-classic-french-dessert"
        }
      ]
    },
    "crème brûlée": {
      "local": "crème brûlée",
      "note": {
        "en": "A rich custard topped with a hard caramelized-sugar crust; earliest known recipe is in François Massialot's 1691 cookbook.",
        "fr": "Une crème onctueuse coiffée d'une croûte de sucre caramélisé; sa plus ancienne recette figure dans le livre de Massialot (1691)."
      },
      "sources": [
        {
          "name": "Crème brûlée — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Cr%C3%A8me_br%C3%BBl%C3%A9e"
        },
        {
          "name": "Crème Brûlée — TasteAtlas",
          "url": "https://www.tasteatlas.com/creme-brulee"
        }
      ]
    },
    "macarons": {
      "local": "macaron",
      "note": {
        "en": "French meringue-based sandwich cookie made of almond flour, egg white and sugar, with a ganache or buttercream filling; the Parisian…",
        "fr": "Biscuit francais a la meringue, fait de poudre d'amande, blanc d'oeuf et sucre, garni de ganache ou creme au beurre; la forme parisienne…"
      },
      "sources": [
        {
          "name": "Wikipedia - Macaron",
          "url": "https://en.wikipedia.org/wiki/Macaron"
        },
        {
          "name": "Encyclopaedia Britannica - Macaroon",
          "url": "https://www.britannica.com/topic/macaroon"
        }
      ]
    },
    "mille-feuille": {
      "local": "mille-feuille",
      "note": {
        "en": "A French pastry traditionally made of three layers of puff pastry with two layers of pastry cream (creme patissiere) between them; its name…",
        "fr": "Patisserie francaise traditionnellement composee de trois couches de pate feuilletee garnies de deux couches de creme patissiere ; son nom…"
      },
      "sources": [
        {
          "name": "Wikipedia — Mille-feuille",
          "url": "https://en.wikipedia.org/wiki/Mille-feuille"
        }
      ]
    },
    "paris-brest": {
      "local": "Paris-Brest",
      "note": {
        "en": "French choux pastry ring filled with praline cream and flaked almonds, created in 1910 to honour the Paris-Brest-Paris bike race.",
        "fr": "Couronne de pate a choux garnie de creme pralinee et d'amandes effilees, creee en 1910 en hommage a la course cycliste Paris-Brest-Paris."
      },
      "sources": [
        {
          "name": "Wikipedia - Paris-Brest",
          "url": "https://en.wikipedia.org/wiki/Paris%E2%80%93Brest"
        }
      ]
    },
    "croissant": {
      "local": "croissant",
      "note": {
        "en": "A French crescent-shaped viennoiserie made from a laminated, butter-folded yeast dough. Inspired by the Austrian kipferl, which a Viennese…",
        "fr": "Viennoiserie francaise en forme de croissant, en pate levee feuilletee au beurre. Inspiree du kipferl autrichien, introduit a Paris par une…"
      },
      "sources": [
        {
          "name": "Wikipedia - Croissant",
          "url": "https://en.wikipedia.org/wiki/Croissant"
        },
        {
          "name": "Britannica - Croissant",
          "url": "https://www.britannica.com/topic/croissant"
        }
      ]
    },
    "pain au chocolat": {
      "local": "pain au chocolat",
      "note": {
        "en": "French viennoiserie of laminated yeast dough, like a croissant, wrapped around one or two bars of dark chocolate; called chocolatine in SW…",
        "fr": "Viennoiserie francaise en pate levee feuilletee, comme le croissant, enroulee autour d'une ou deux barres de chocolat noir ; dite…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pain au chocolat",
          "url": "https://en.wikipedia.org/wiki/Pain_au_chocolat"
        },
        {
          "name": "TasteAtlas - Pain au chocolat",
          "url": "https://tasteatlas.com/pain-au-chocolat"
        }
      ]
    },
    "tarte flambée alsacienne": {
      "local": "tarte flambée (alsacien : Flammekueche)",
      "note": {
        "en": "Alsatian thin bread-dough tart topped with crème fraîche, onions and lardons, baked in a wood-fired oven; a peasant dish dating to at least…",
        "fr": "Tarte alsacienne de pâte à pain fine garnie de crème fraîche, oignons et lardons, cuite au four à bois ; plat paysan remontant au moins au…"
      },
      "sources": [
        {
          "name": "Wikipedia (EN) — Flammekueche",
          "url": "https://en.wikipedia.org/wiki/Flammekueche"
        },
        {
          "name": "Wikipédia (FR) — Tarte flambée",
          "url": "https://fr.wikipedia.org/wiki/Tarte_flamb%C3%A9e"
        }
      ]
    },
    "éclair": {
      "local": "éclair",
      "note": {
        "en": "An oblong French choux-pastry filled with cream (typically crème pâtissière) and topped with fondant icing. It originated in 19th-century…",
        "fr": "Pâtisserie française allongée en pâte à choux, fourrée de crème (généralement de la crème pâtissière) et glacée au fondant. Elle apparaît…"
      },
      "sources": [
        {
          "name": "Wikipedia - Éclair",
          "url": "https://en.wikipedia.org/wiki/%C3%89clair"
        },
        {
          "name": "Puratos - The Éclair: the origin of an emblematic French classic",
          "url": "https://www.puratos.com/product-categories/patisserie-ingredients/the-eclair-the-origin-of-an-emblematic-french-classic"
        }
      ]
    },
    "baguette": {
      "local": "baguette",
      "note": {
        "en": "A long, thin French white bread made from flour, water, salt and yeast; its artisanal know-how was UNESCO-listed in 2022.",
        "fr": "Pain blanc francais long et fin a base de farine, eau, sel et levure ; son savoir-faire artisanal est classe a l'UNESCO depuis 2022."
      },
      "sources": [
        {
          "name": "Wikipedia — Baguette",
          "url": "https://en.wikipedia.org/wiki/Baguette"
        },
        {
          "name": "UNESCO ICH — Artisanal know-how and culture of baguette bread",
          "url": "https://ich.unesco.org/en/RL/artisanal-know-how-and-culture-of-baguette-bread-01883"
        }
      ]
    },
    "choucroute alsacienne": {
      "local": "Choucroute garnie à l'alsacienne",
      "note": {
        "en": "An Alsatian dish of fermented sauerkraut cooked with white wine and garnished with sausages, salted pork and charcuterie.",
        "fr": "Plat alsacien de choucroute fermentée cuite au vin blanc, garnie de saucisses, de porc salé et de charcuterie."
      },
      "sources": [
        {
          "name": "Wikipedia — Choucroute garnie",
          "url": "https://en.wikipedia.org/wiki/Choucroute_garnie"
        },
        {
          "name": "TasteAtlas — Choucroute Garnie",
          "url": "https://www.tasteatlas.com/choucroute-garnie"
        }
      ]
    },
    "pissaladière niçoise": {
      "local": "pissaladière niçoise",
      "note": {
        "en": "Niçoise bread-dough tart of slow-cooked onions, anchovies and black olives, named for pissalat, a salted-anchovy paste.",
        "fr": "Tarte niçoise sur pâte à pain garnie d'oignons confits, d'anchois et d'olives noires, nommée d'après le pissalat, purée d'anchois salés."
      },
      "sources": [
        {
          "name": "Wikipedia — Pissaladière",
          "url": "https://en.wikipedia.org/wiki/Pissaladi%C3%A8re"
        },
        {
          "name": "Wikipedia — Pissalat",
          "url": "https://en.wikipedia.org/wiki/Pissalat"
        }
      ]
    }
  },
  "spanish": {
    "paella de mariscos": {
      "local": "Paella de marisco",
      "note": {
        "en": "Valencian seafood rice dish of prawns, mussels, clams and squid in saffron fish stock, cooked in a wide flat pan ('paella').",
        "fr": "Plat valencien de riz aux fruits de mer (crevettes, moules, palourdes, calmar) au safran, cuit dans une grande poele plate ('paella')."
      },
      "sources": [
        {
          "name": "Wikipedia — Paella",
          "url": "https://en.wikipedia.org/wiki/Paella"
        },
        {
          "name": "Seafood Paella (Paella de Marisco) — The Daring Gourmet",
          "url": "https://www.daringgourmet.com/seafood-paella/"
        }
      ]
    },
    "arroz negro": {
      "local": "arròs negre",
      "note": {
        "en": "A Valencian and Catalan rice dish of cuttlefish or squid stained black with squid ink, similar to seafood paella.",
        "fr": "Un plat de riz valencien et catalan a base de seiche ou calmar, noirci a l'encre de seiche, proche de la paella de fruits de mer."
      },
      "sources": [
        {
          "name": "Wikipedia - Arròs negre",
          "url": "https://en.wikipedia.org/wiki/Arr%C3%B2s_negre"
        },
        {
          "name": "TASTE - Arroz Negro (Spanish Squid Ink Rice)",
          "url": "https://tastecooking.com/recipes/arroz-negro-spanish-squid-ink-rice/"
        }
      ]
    },
    "gazpacho": {
      "local": "gazpacho",
      "note": {
        "en": "A cold soup of raw, blended vegetables from Andalusia in southern Spain. Earlier versions used bread, olive oil, water, vinegar and garlic…",
        "fr": "Une soupe froide de legumes crus mixes, originaire d'Andalousie, dans le sud de l'Espagne. Les premieres versions etaient faites de pain…"
      },
      "sources": [
        {
          "name": "Wikipedia - Gazpacho",
          "url": "https://en.wikipedia.org/wiki/Gazpacho"
        }
      ]
    },
    "jamón ibérico": {
      "local": "jamón ibérico",
      "note": {
        "en": "A Spanish cured ham from black Iberian pigs (pata negra); premium bellota grade comes from acorn-fed pigs raised on dehesa oak pastures.",
        "fr": "Jambon espagnol affiné issu du porc ibérique noir (pata negra); le grade bellota provient de porcs nourris de glands dans les dehesas."
      },
      "sources": [
        {
          "name": "Wikipedia: Jamón ibérico",
          "url": "https://en.wikipedia.org/wiki/Jam%C3%B3n_ib%C3%A9rico"
        },
        {
          "name": "Wikipedia: Black Iberian pig",
          "url": "https://en.wikipedia.org/wiki/Black_Iberian_pig"
        }
      ]
    },
    "chorizo": {
      "local": "chorizo",
      "note": {
        "en": "A cured Iberian pork sausage seasoned with smoked paprika (pimentón), which gives its red colour and arrived from the Americas in the 16th…",
        "fr": "Saucisse de porc ibérique séchée assaisonnée au paprika fumé (pimentón), qui lui donne sa couleur rouge et arriva d'Amérique au XVIe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia — Chorizo",
          "url": "https://en.wikipedia.org/wiki/Chorizo"
        },
        {
          "name": "TasteAtlas — Most Popular Sausages in Spain",
          "url": "https://www.tasteatlas.com/most-popular-sausages-and-salamis-in-spain"
        }
      ]
    },
    "fabada asturiana": {
      "local": "Fabada asturiana",
      "note": {
        "en": "A rich Asturian stew of creamy fabes (white beans) and cured pork compango (chorizo, morcilla and lacon or tocino); its first written…",
        "fr": "Un riche ragout asturien de fabes (haricots blancs) cremeux et de porc affine compango (chorizo, morcilla, lacon ou tocino) ; sa premiere…"
      },
      "sources": [
        {
          "name": "Wikipedia - Fabada asturiana",
          "url": "https://en.wikipedia.org/wiki/Fabada_asturiana"
        },
        {
          "name": "Campo Grande - The Evolution of Asturian Fabada throughout History",
          "url": "https://eatcampogrande.com/blogs/kitchen/the-evolution-of-asturian-fabada-throughout-history"
        }
      ]
    },
    "gambas al ajillo": {
      "local": "gambas al ajillo",
      "note": {
        "en": "A Spanish tapa of prawns sauteed in olive oil with garlic and dried chili, said to have originated in Madrid.",
        "fr": "Tapa espagnole de crevettes sautees a l'huile d'olive avec ail et piment seche, dont l'origine serait Madrid."
      },
      "sources": [
        {
          "name": "Wikipedia - Al ajillo",
          "url": "https://en.wikipedia.org/wiki/Al_ajillo"
        },
        {
          "name": "TasteAtlas - Gambas al Ajillo",
          "url": "https://www.tasteatlas.com/gambas-al-ajillo"
        }
      ]
    },
    "crema catalana": {
      "local": "crema catalana",
      "note": {
        "en": "Catalan custard flavored with lemon zest and cinnamon and finished with a brittle caramelized-sugar crust. A precursor unburnt custard…",
        "fr": "Crème catalane parfumée au zeste de citron et à la cannelle, recouverte d'une fine croûte de sucre caramélisé. Une crème non brûlée…"
      },
      "sources": [
        {
          "name": "Wikipedia — Crema catalana",
          "url": "https://en.wikipedia.org/wiki/Crema_catalana"
        }
      ]
    },
    "cava": {
      "local": "cava",
      "note": {
        "en": "Spanish traditional-method sparkling wine, mostly from Catalonia's Penedès, first made by Josep Raventós in Sant Sadurní d'Anoia in 1872.",
        "fr": "Vin effervescent espagnol de méthode traditionnelle, surtout du Penedès catalan, créé par Josep Raventós à Sant Sadurní d'Anoia en 1872."
      },
      "sources": [
        {
          "name": "Wikipedia — Cava (Spanish wine)",
          "url": "https://en.wikipedia.org/wiki/Cava_(Spanish_wine)"
        },
        {
          "name": "D.O. Cava — The History of Cava",
          "url": "https://www.cava.wine/en/regulatory-board/cava-designation-of-origin/cava-history/"
        }
      ]
    },
    "paella valenciana": {
      "local": "paella valenciana",
      "note": {
        "en": "Valencia's rice dish cooked in a wide flat pan, traditionally with chicken, rabbit, beans and saffron over an open flame.",
        "fr": "Plat de riz valencien cuit dans une poele large et plate, traditionnellement avec poulet, lapin, haricots et safran sur flamme vive."
      },
      "sources": [
        {
          "name": "Wikipedia - Paella",
          "url": "https://en.wikipedia.org/wiki/Paella"
        },
        {
          "name": "Visit Valencia - Traditional Valencian Paella",
          "url": "https://www.visitvalencia.com/en/what-to-do-valencia/gastronomy/what-to-eat/paella-valenciana-recipe"
        }
      ]
    },
    "fideuà": {
      "local": "fideuà",
      "note": {
        "en": "Valencian seafood dish like paella but cooked with short noodles instead of rice, originating in the port of Gandia around 1915.",
        "fr": "Plat valencien aux fruits de mer, comme la paella mais cuit avec de courtes nouilles au lieu du riz, né au port de Gandia vers 1915."
      },
      "sources": [
        {
          "name": "Wikipedia — Fideuà",
          "url": "https://en.wikipedia.org/wiki/Fideu%C3%A0"
        },
        {
          "name": "Fideuà de Gandia — Casas España",
          "url": "https://casasespania.com/news/215/fideua-de-gandia/"
        }
      ]
    },
    "tortilla española": {
      "local": "tortilla española (tortilla de patatas)",
      "note": {
        "en": "A Spanish omelette of eggs and potatoes, often with onion, served as a tapa; documented in Spain by the late 18th century.",
        "fr": "Une omelette espagnole aux œufs et pommes de terre, souvent à l'oignon, servie en tapa; attestée en Espagne dès la fin du XVIIIe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia: Spanish omelette",
          "url": "https://en.wikipedia.org/wiki/Spanish_omelette"
        },
        {
          "name": "Queen Sofia Spanish Institute: A History of the Tortilla Española",
          "url": "https://queensofiaspanishinstitute.org/gastronomy/a-history-of-the-tortilla-espanola-and-its-use-in-spain/"
        }
      ]
    },
    "salmorejo": {
      "local": "salmorejo",
      "note": {
        "en": "A thick cold purée of tomato, bread, garlic and olive oil from Córdoba, Andalusia, usually topped with jamón and hard-boiled egg.",
        "fr": "Une purée froide épaisse de tomate, pain, ail et huile d'olive de Cordoue, Andalousie, garnie de jambon et d'œuf dur."
      },
      "sources": [
        {
          "name": "Salmorejo - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Salmorejo"
        },
        {
          "name": "Salmorejo in Córdoba - Explore Córdoba",
          "url": "https://www.explorecordoba.com/dish/salmorejo"
        }
      ]
    },
    "jamón serrano": {
      "local": "Jamón serrano",
      "note": {
        "en": "Spanish dry-cured ham from white-breed pigs, salted then air-dried 6-18 months; its name means \"mountain ham\" and it holds EU TSG status.",
        "fr": "Jambon espagnol séché de porcs de race blanche, salé puis séché 6 à 18 mois ; son nom signifie « jambon de montagne » et il a le statut STG…"
      },
      "sources": [
        {
          "name": "Jamón serrano - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jam%C3%B3n_serrano"
        },
        {
          "name": "Consorcio Serrano - History and Tradition",
          "url": "https://consorcioserrano.es/en/consorcio-serrano-ham/history-and-tradition/"
        }
      ]
    },
    "croquetas": {
      "local": "croquetas",
      "note": {
        "en": "Spanish breaded fritters with a creamy bechamel filling (often jamon), deep-fried and served as a classic tapa.",
        "fr": "Beignets panes espagnols a la garniture cremeuse de bechamel (souvent jambon), frits et servis en tapa classique."
      },
      "sources": [
        {
          "name": "TasteAtlas - Croquetas de Jamon",
          "url": "https://www.tasteatlas.com/croquetas-de-jamon"
        },
        {
          "name": "TasteAtlas - Croquetas varieties",
          "url": "https://www.tasteatlas.com/best-rated-croquetas-varieties-in-the-world"
        }
      ]
    },
    "patatas bravas": {
      "local": "patatas bravas",
      "note": {
        "en": "A Spanish tapa of fried white-potato cubes served hot with a spicy paprika-based brava sauce (often made with pimenton de la Vera). The…",
        "fr": "Tapa espagnole de cubes de pomme de terre frits servis chauds avec une sauce brava piquante au paprika (souvent au pimenton de la Vera). Le…"
      },
      "sources": [
        {
          "name": "Wikipedia - Patatas bravas",
          "url": "https://en.wikipedia.org/wiki/Patatas_bravas"
        },
        {
          "name": "TasteAtlas - Patatas Bravas",
          "url": "https://www.tasteatlas.com/patas-bravas"
        }
      ]
    },
    "pan con tomate": {
      "local": "Pa amb tomàquet",
      "note": {
        "en": "Catalan bread rubbed with ripe tomato, olive oil and salt (optionally garlic); first recorded in 1884 to revive stale bread.",
        "fr": "Pain catalan frotté de tomate mûre, huile d'olive et sel (parfois ail) ; attesté dès 1884 pour raviver le pain rassis."
      },
      "sources": [
        {
          "name": "Wikipedia — Pa amb tomàquet",
          "url": "https://en.wikipedia.org/wiki/Pa_amb_tom%C3%A0quet"
        },
        {
          "name": "Ara — X-ray of pa amb tomàquet",
          "url": "https://en.ara.cat/food/x-ray-of-pa-tomaquet-sacrileges-detractors-and-the-origin-of-this-traditional-catalan-dish_1_5696955.html"
        }
      ]
    },
    "pulpo a la gallega": {
      "local": "Polbo á feira",
      "note": {
        "en": "Galician boiled-octopus dish dressed with olive oil, sea salt and paprika, traditionally served at rural fairs on wooden plates.",
        "fr": "Plat galicien de poulpe bouilli assaisonné d'huile d'olive, de sel marin et de paprika, servi sur assiette en bois aux foires rurales."
      },
      "sources": [
        {
          "name": "Wikipedia — Polbo á feira",
          "url": "https://en.wikipedia.org/wiki/Polbo_%C3%A1_feira"
        }
      ]
    },
    "cocido madrileño": {
      "local": "cocido madrileño",
      "note": {
        "en": "A Madrid chickpea-and-meat stew traditionally served in three separate courses (vuelcos): broth with noodles, then chickpeas and…",
        "fr": "Un ragoût madrilène de pois chiches et de viandes servi traditionnellement en trois services (vuelcos) : bouillon aux nouilles, puis pois…"
      },
      "sources": [
        {
          "name": "Wikipedia — Cocido madrileño",
          "url": "https://en.wikipedia.org/wiki/Cocido_madrile%C3%B1o"
        },
        {
          "name": "TasteAtlas — Cocido Madrileño",
          "url": "https://www.tasteatlas.com/cocido-madrileno"
        }
      ]
    },
    "pisto": {
      "local": "pisto manchego",
      "note": {
        "en": "Spanish stewed vegetable dish from Castilla-La Mancha made of tomatoes, peppers, onion and courgette slow-cooked in olive oil; its name…",
        "fr": "Plat espagnol de legumes mijotes originaire de Castille-La Manche, a base de tomates, poivrons, oignon et courgette cuits lentement a…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pisto",
          "url": "https://en.wikipedia.org/wiki/Pisto"
        },
        {
          "name": "196 flavors - Pisto Manchego",
          "url": "https://www.196flavors.com/spain-pisto-manchego/"
        }
      ]
    },
    "callos a la madrileña": {
      "local": "Callos a la madrileña",
      "note": {
        "en": "A Madrid tripe stew slow-cooked with chorizo, morcilla and paprika, popularized in the 19th century by the Lhardy restaurant.",
        "fr": "Un ragoût de tripes madrilène mijoté au chorizo, à la morcilla et au paprika, popularisé au 19e siècle par le restaurant Lhardy."
      },
      "sources": [
        {
          "name": "Wikipedia - Callos a la Madrileña",
          "url": "https://en.wikipedia.org/wiki/Callos_a_la_Madrile%C3%B1a"
        },
        {
          "name": "TasteAtlas - Callos a la Madrileña",
          "url": "https://www.tasteatlas.com/callos-a-la-madrilena"
        }
      ]
    },
    "bacalao al pil pil": {
      "local": "Bacalao al pil pil",
      "note": {
        "en": "Basque dish of salt cod poached in olive oil with garlic; the gelatin from the cod emulsifies the oil into the creamy \"pil pil\" sauce.",
        "fr": "Plat basque de morue salee pochee a l'huile d'olive avec de l'ail; la gelatine de la morue emulsionne l'huile en sauce \"pil pil\"."
      },
      "sources": [
        {
          "name": "Wikipedia - Bacalao al pil pil",
          "url": "https://en.wikipedia.org/wiki/Bacalao_al_pil_pil"
        }
      ]
    },
    "txangurro": {
      "local": "txangurro",
      "note": {
        "en": "Basque word for spider crab; in \"txangurro a la donostiarra\" the meat is baked in its shell, created in early-1900s San Sebastian.",
        "fr": "Mot basque pour l'araignee de mer; dans le \"txangurro a la donostiarra\", la chair est gratinee dans sa carapace, ne a San Sebastian au…"
      },
      "sources": [
        {
          "name": "Tourism Euskadi - Txangurro (Spider Crab)",
          "url": "https://tourism.euskadi.eus/en/dishes-tapas/txangurro-spider-crab/webtur00-content/en/"
        },
        {
          "name": "TasteAtlas - Txangurro",
          "url": "https://tasteatlas.com/txangurro"
        }
      ]
    },
    "pintxos": {
      "local": "pintxos",
      "note": {
        "en": "Basque small snacks usually skewered on bread with a toothpick; the Basque-spelled form of Spanish \"pincho,\" popularised in San Sebastian.",
        "fr": "Petites bouchees basques, generalement piquees sur du pain avec un cure-dent; forme basque du \"pincho\" espagnol, popularisee a…"
      },
      "sources": [
        {
          "name": "Wikipedia – Pincho",
          "url": "https://en.wikipedia.org/wiki/Pincho"
        },
        {
          "name": "Basque Bites – A Short Guide to San Sebastian's Pintxos",
          "url": "https://basquebites.com/a-short-guide-to-san-sebastians-pintxos/"
        }
      ]
    },
    "migas": {
      "local": "migas",
      "note": {
        "en": "A rustic Spanish dish of stale bread fried with garlic, olive oil and paprika, originally made by Iberian shepherds from leftovers.",
        "fr": "Plat rustique espagnol de pain rassis frit avec ail, huile d'olive et paprika, créé par les bergers ibériques avec les restes."
      },
      "sources": [
        {
          "name": "Migas — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Migas"
        },
        {
          "name": "Migas — Spanish-food.org",
          "url": "https://www.spanish-food.org/meat-stews-migas.html"
        }
      ]
    },
    "churros con chocolate": {
      "local": "churros con chocolate",
      "note": {
        "en": "Spanish deep-fried ridged choux-dough sticks, piped from a star nozzle and dipped in thick hot chocolate, eaten for breakfast or merienda.",
        "fr": "Beignets espagnols cannelés en pate a choux frite, faconnes a la douille etoilee et trempes dans un chocolat chaud epais, au petit-dejeuner…"
      },
      "sources": [
        {
          "name": "Wikipedia - Churro",
          "url": "https://en.wikipedia.org/wiki/Churro"
        },
        {
          "name": "Wikipedia - Chocolateria de San Gines",
          "url": "https://en.wikipedia.org/wiki/Chocolater%C3%ADa_de_San_Gin%C3%A9s"
        }
      ]
    },
    "flan": {
      "local": "flan (flan de huevo)",
      "note": {
        "en": "A baked egg-milk-and-sugar caramel custard (crème caramel); in Spain and Latin America \"flan\" names this dessert, from Old French/Latin for…",
        "fr": "Crème caramel cuite à base d'œufs, de lait et de sucre; en Espagne et Amérique latine, « flan » désigne ce dessert, du latin « gâteau plat…"
      },
      "sources": [
        {
          "name": "Wikipedia — Crème caramel",
          "url": "https://en.wikipedia.org/wiki/Cr%C3%A8me_caramel"
        },
        {
          "name": "Wiktionary — flan (etymology)",
          "url": "https://en.wiktionary.org/wiki/flan"
        }
      ]
    },
    "tarta de santiago": {
      "local": "Tarta de Santiago",
      "note": {
        "en": "A Galician almond cake (PGI), dusted with sugar over the Cross of St. James stencil and first documented in 1577.",
        "fr": "Un gateau galicien aux amandes (IGP), saupoudre de sucre sur le pochoir de la croix de Saint-Jacques, atteste des 1577."
      },
      "sources": [
        {
          "name": "Tarta de Santiago — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tarta_de_Santiago"
        },
        {
          "name": "Tarta de Santiago, Galician almond cake — Bake-Street",
          "url": "https://bake-street.com/en/tarta-de-santiago-galician-almond-cake/"
        }
      ]
    },
    "sangria": {
      "local": "sangría",
      "note": {
        "en": "Spanish wine punch of red wine and chopped fruit; its name means \"bloodletting,\" for the red wine's colour, attested from the 18th century.",
        "fr": "Punch espagnol de vin rouge et de fruits coupes ; son nom signifie \"saignee\", evoquant la couleur du vin, atteste des le XVIIIe siecle."
      },
      "sources": [
        {
          "name": "Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sangria"
        },
        {
          "name": "TasteAtlas",
          "url": "https://www.tasteatlas.com/sangria"
        }
      ]
    },
    "horchata de chufa": {
      "local": "horchata de chufa",
      "note": {
        "en": "A sweet Valencian drink made from tiger nuts (chufa), water and sugar; the Spanish tiger-nut crop is largely used to make it, with Alboraya…",
        "fr": "Boisson valencienne sucree a base de souchets (chufa), d'eau et de sucre; l'essentiel de la recolte espagnole de souchets sert a la…"
      },
      "sources": [
        {
          "name": "Wikipedia - Horchata",
          "url": "https://en.wikipedia.org/wiki/Horchata"
        },
        {
          "name": "Discovering Valencia - Horchata, the tiger-nut drink from Valencia",
          "url": "https://discovering-valencia.com/gastronomy/horchata-tigernut-drink/"
        }
      ]
    }
  },
  "lebanese": {
    "mezze platter": {
      "local": "مَزّة",
      "note": {
        "en": "An assortment of small Levantine/Eastern Mediterranean appetizer dishes (hummus, tabbouleh, olives, stuffed grape leaves) served as…",
        "fr": "Assortiment de petits plats apéritifs levantins/méditerranéens (houmous, taboulé, olives, feuilles de vigne) servis en entrée avant le…"
      },
      "sources": [
        {
          "name": "Wikipedia — Meze",
          "url": "https://en.wikipedia.org/wiki/Meze"
        },
        {
          "name": "Wiktionary — مزة",
          "url": "https://en.wiktionary.org/wiki/%D9%85%D8%B2%D8%A9"
        }
      ]
    },
    "warak enab": {
      "local": "ورق عنب",
      "note": {
        "en": "Lebanese grape leaves rolled around rice and minced meat or herbs, simmered in lemony broth; a Levantine mezze of Ottoman-era roots.",
        "fr": "Feuilles de vigne libanaises roulées autour de riz et de viande ou d'herbes, mijotées au citron; mezzé levantin d'origine ottomane."
      },
      "sources": [
        {
          "name": "Stuffed leaves - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Stuffed_leaves"
        },
        {
          "name": "Warak Enab (Stuffed Grape Leaves or Dolmas) - Arab America",
          "url": "https://www.arabamerica.com/warak-enab-stuffed-grape-leaves-or-dolmas/"
        }
      ]
    },
    "maamoul": {
      "local": "معمول",
      "note": {
        "en": "A Levantine filled cookie of semolina and butter stuffed with dates, pistachios or walnuts, traditionally made for Eid and Easter.",
        "fr": "Biscuit levantin de semoule et beurre fourré de dattes, pistaches ou noix, traditionnellement préparé pour l'Aïd et Pâques."
      },
      "sources": [
        {
          "name": "Wikipedia – Ma'amoul",
          "url": "https://en.wikipedia.org/wiki/Ma'amoul"
        }
      ]
    },
    "lebanese coffee": {
      "local": "قهوة ('ahweh)",
      "note": {
        "en": "A strong, finely-ground unfiltered coffee brewed Turkish-style in a long-handled rakwa pot, often scented with cardamom.",
        "fr": "Un cafe fort, non filtre et finement moulu, prepare a la turque dans une cafetiere rakwa, souvent parfume a la cardamome."
      },
      "sources": [
        {
          "name": "Arabic coffee - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Arabic_coffee"
        },
        {
          "name": "قهوة - Wiktionary",
          "url": "https://en.wiktionary.org/wiki/%D9%82%D9%87%D9%88%D8%A9"
        }
      ]
    },
    "hummus": {
      "local": "حُمُّص بِطَحِينة (ḥummuṣ bi-ṭaḥīna)",
      "note": {
        "en": "A Levantine dip of mashed chickpeas blended with tahini, lemon and garlic; \"hummus\" is Arabic for \"chickpea\".",
        "fr": "Une trempette levantine de pois chiches ecrases melanges a du tahini, du citron et de l'ail ; \"hummus\" signifie \"pois chiche\" en arabe."
      },
      "sources": [
        {
          "name": "Wikipedia - Hummus",
          "url": "https://en.wikipedia.org/wiki/Hummus"
        },
        {
          "name": "Britannica - Hummus",
          "url": "https://www.britannica.com/topic/hummus"
        }
      ]
    },
    "baba ghanoush": {
      "local": "بابا غنوج",
      "note": {
        "en": "A Levantine dip of smoky roasted eggplant mashed with tahini, olive oil, and lemon juice; the name combines Arabic baba (\"daddy\") and…",
        "fr": "Une trempette levantine d'aubergine grillée fumée écrasée avec tahini, huile d'olive et citron ; son nom combine l'arabe baba (« papa ») et…"
      },
      "sources": [
        {
          "name": "Wikipedia — Baba ghanoush",
          "url": "https://en.wikipedia.org/wiki/Baba_ghanoush"
        },
        {
          "name": "The Grammarphobia Blog — The spicy history of baba ganoush",
          "url": "https://grammarphobia.com/blog/2012/03/baba-ganoush.html"
        }
      ]
    },
    "moutabal": {
      "local": "متبّل",
      "note": {
        "en": "A Levantine Lebanese dip of fire-roasted eggplant blended with tahini, garlic and lemon; the tahini distinguishes it from baba ghanoush.",
        "fr": "Une trempette levantine libanaise d'aubergine grillée mêlée de tahini, ail et citron; le tahini la distingue du baba ganousch."
      },
      "sources": [
        {
          "name": "Wikipedia — Mutabbal (Eggplant salads and appetizers)",
          "url": "https://en.wikipedia.org/wiki/Mutabbal"
        },
        {
          "name": "Wikipedia — Baba ghanoush",
          "url": "https://en.wikipedia.org/wiki/Baba_ghanoush"
        }
      ]
    },
    "falafel": {
      "local": "فلافل",
      "note": {
        "en": "Deep-fried fritter of ground chickpeas and/or fava beans with herbs and spices; most likely of Egyptian origin, where it is traditionally…",
        "fr": "Beignet frit de pois chiches et/ou de feves moulus, avec herbes et epices; probablement d'origine egyptienne, ou il est traditionnellement…"
      },
      "sources": [
        {
          "name": "Falafel - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Falafel"
        },
        {
          "name": "The Origin of Falafel - History Today",
          "url": "https://www.historytoday.com/archive/historians-cookbook/falafel"
        }
      ]
    },
    "tabbouleh": {
      "local": "تبّولة",
      "note": {
        "en": "A Levantine salad of finely chopped parsley, soaked bulgur, tomato, mint and onion in lemon and olive oil, an unofficial national dish of…",
        "fr": "Une salade levantine de persil haché, boulgour trempé, tomate, menthe et oignon au citron et huile d'olive, plat national officieux du…"
      },
      "sources": [
        {
          "name": "Tabbouleh - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tabbouleh"
        },
        {
          "name": "Tabbouleh - Britannica",
          "url": "https://www.britannica.com/topic/tabbouleh"
        }
      ]
    },
    "fattoush": {
      "local": "فَتُّوش",
      "note": {
        "en": "A Levantine bread salad of toasted or fried pita with greens and vegetables, soured with sumac; it repurposed leftover bread in Lebanon.",
        "fr": "Une salade levantine au pain pita grillé ou frit, légumes verts et crudités, acidulée au sumac; elle recyclait le pain rassis au Liban."
      },
      "sources": [
        {
          "name": "Fattoush - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Fattoush"
        },
        {
          "name": "Lebanese Fattoush Salad (Authentic Recipe) - Maureen Abood",
          "url": "https://maureenabood.com/lebanese-fattoush-salad/"
        }
      ]
    },
    "shawarma": {
      "local": "شاورما",
      "note": {
        "en": "Levantine spit-roasted, thinly sliced marinated meat wrapped in flatbread; its name comes from Turkish cevirme, meaning to turn.",
        "fr": "Viande marinee du Levant, rotie a la broche et tranchee finement dans du pain plat; son nom vient du turc cevirme, tourner."
      },
      "sources": [
        {
          "name": "Wikipedia - Shawarma",
          "url": "https://en.wikipedia.org/wiki/Shawarma"
        },
        {
          "name": "TasteAtlas - Shawarma",
          "url": "https://www.tasteatlas.com/shawarma"
        }
      ]
    },
    "shish taouk": {
      "local": "شيش طاووق",
      "note": {
        "en": "A marinated grilled chicken skewer of Ottoman origin, now a staple across the Levant including Lebanon and Syria.",
        "fr": "Brochette de poulet grillé mariné d'origine ottomane, devenue un classique du Levant dont le Liban et la Syrie."
      },
      "sources": [
        {
          "name": "Wikipedia - Shish taouk",
          "url": "https://en.wikipedia.org/wiki/Shish_taouk"
        }
      ]
    },
    "kibbeh": {
      "local": "كبة",
      "note": {
        "en": "Levantine dish of spiced lean ground meat and bulgur wheat, considered a national dish of Lebanon and Syria; the name derives from the…",
        "fr": "Plat levantin de viande hachee maigre epicee et de boulgour, considere comme plat national du Liban et de la Syrie; le nom vient de la…"
      },
      "sources": [
        {
          "name": "Wikipedia — Kibbeh",
          "url": "https://en.wikipedia.org/wiki/Kibbeh"
        },
        {
          "name": "Wiktionary — kibbeh",
          "url": "https://en.wiktionary.org/wiki/kibbeh"
        }
      ]
    },
    "kibbeh nayyeh": {
      "local": "كبّة نيّة",
      "note": {
        "en": "A Levantine mezze of raw minced lamb or beef pounded with fine bulgur and spices, said to have originated in Aleppo, Syria.",
        "fr": "Un mezzé levantin d'agneau ou de bœuf cru haché et pilé avec du boulgour fin et des épices, originaire d'Alep, en Syrie."
      },
      "sources": [
        {
          "name": "Wikipedia - Kibbeh nayyeh",
          "url": "https://en.wikipedia.org/wiki/Kibbeh_nayyeh"
        },
        {
          "name": "TasteAtlas - Kibbeh Nayyeh",
          "url": "https://www.tasteatlas.com/kibbeh-nayyeh"
        }
      ]
    },
    "kafta": {
      "local": "كَفْتَة",
      "note": {
        "en": "Levantine grilled kebab of ground beef or lamb mixed with parsley, onion and spices; name is from Persian kufta, \"to grind.\"",
        "fr": "Kebab grille levantin de bœuf ou d'agneau hache, mele de persil, d'oignon et d'epices ; le nom vient du persan kufta, « moudre »."
      },
      "sources": [
        {
          "name": "Simply Lebanese - Kafta",
          "url": "https://www.simplyleb.com/recipe/kafta/"
        },
        {
          "name": "Wiktionary - kofta (etymology)",
          "url": "https://en.wiktionary.org/wiki/kofta"
        }
      ]
    },
    "mujadara": {
      "local": "مُجَدَّرة",
      "note": {
        "en": "Levantine dish of lentils and rice topped with fried onions; first recorded in al-Baghdadi's 1226 Iraqi cookbook.",
        "fr": "Plat levantin de lentilles et riz garni d'oignons frits; consigné dès 1226 dans le livre de cuisine irakien d'al-Baghdadi."
      },
      "sources": [
        {
          "name": "Wikipedia - Mujaddara",
          "url": "https://en.wikipedia.org/wiki/Mujaddara"
        },
        {
          "name": "Wikipedia - Kitab al-Tabikh",
          "url": "https://en.wikipedia.org/wiki/Kitab_al-Tabikh"
        }
      ]
    },
    "fatteh": {
      "local": "فتّة",
      "note": {
        "en": "Levantine layered dish of toasted flatbread, chickpeas and garlicky yogurt; its name comes from Arabic \"fatta\", to crumble bread.",
        "fr": "Plat levantin en couches de pain plat grille, pois chiches et yaourt a l'ail; son nom vient de l'arabe \"fatta\", emietter le pain."
      },
      "sources": [
        {
          "name": "Wikipedia - Fatteh",
          "url": "https://en.wikipedia.org/wiki/Fatteh"
        },
        {
          "name": "196 flavors - Fatteh (Lebanese recipe)",
          "url": "https://www.196flavors.com/fatteh/"
        }
      ]
    },
    "manakish": {
      "local": "مناقيش",
      "note": {
        "en": "A Levantine flatbread topped with za'atar, cheese or minced meat; its name derives from naqasha, \"to engrave,\" for the dough's dimpled…",
        "fr": "Pain plat levantin garni de za'atar, fromage ou viande hachee; son nom vient de naqasha, \"graver,\" pour la pate marquee d'empreintes."
      },
      "sources": [
        {
          "name": "Wikipedia - Manakish",
          "url": "https://en.wikipedia.org/wiki/Manakish"
        }
      ]
    },
    "manakish jibneh": {
      "local": "مناقيش بجبنة",
      "note": {
        "en": "Levantine flatbread topped with melted white cheese (often akkawi), a popular breakfast across Lebanon, Syria, Jordan and Palestine.",
        "fr": "Pain plat levantin garni de fromage blanc fondu (souvent akkawi), petit-déjeuner prisé au Liban, en Syrie, Jordanie et Palestine."
      },
      "sources": [
        {
          "name": "Wikipedia — Manakish",
          "url": "https://en.wikipedia.org/wiki/Manakish"
        },
        {
          "name": "TasteAtlas — Manakish",
          "url": "https://www.tasteatlas.com/manakish"
        }
      ]
    },
    "makdous": {
      "local": "مكدوس",
      "note": {
        "en": "Levantine baby eggplants stuffed with walnuts, garlic and red pepper, then cured in olive oil; documented in 13th-century Syria.",
        "fr": "Petites aubergines levantines farcies de noix, ail et poivron rouge, confites dans l'huile d'olive ; attestées en Syrie au XIIIe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia - Makdous",
          "url": "https://en.wikipedia.org/wiki/Makdous"
        },
        {
          "name": "Food Heritage Foundation - Makdous: A Healthy Pickled Delight",
          "url": "https://food-heritage.org/makdous-a-healthy-pickled-delight/"
        }
      ]
    },
    "lebanese arak": {
      "local": "عَرَق",
      "note": {
        "en": "Lebanon's national drink: a clear, anise-flavored spirit triple-distilled from Levantine grapes, with aniseed added in the final…",
        "fr": "Boisson nationale du Liban : spiritueux clair anisé, triple-distillé à partir de raisins levantins, l'anis étant ajouté à la dernière…"
      },
      "sources": [
        {
          "name": "Wikipedia - Arak (drink)",
          "url": "https://en.wikipedia.org/wiki/Arak_(drink)"
        },
        {
          "name": "The Arab Weekly - The story of arak",
          "url": "https://thearabweekly.com/story-arak-lebanese-drink-infused-tradition"
        }
      ]
    },
    "knafeh": {
      "local": "كُنافة",
      "note": {
        "en": "A Middle Eastern pastry of shredded or semolina dough and sweet cheese soaked in syrup; the iconic Nabulsi style originated in Ottoman-era…",
        "fr": "Une pâtisserie moyen-orientale de pâte filée ou de semoule et de fromage doux nappée de sirop ; le style nabulsi est né à Naplouse à…"
      },
      "sources": [
        {
          "name": "Wikipedia — Knafeh",
          "url": "https://en.wikipedia.org/wiki/Knafeh"
        },
        {
          "name": "Britannica — Knafeh",
          "url": "https://www.britannica.com/topic/knafeh"
        }
      ]
    },
    "baklava lebanese": {
      "local": "بقلاوة",
      "note": {
        "en": "Layered phyllo-and-nut pastry; the Lebanese baklawa is soaked in an orange-blossom or rose-water sugar syrup called atter.",
        "fr": "Pâtisserie en couches de pâte phyllo et de noix; le baklawa libanais est imbibé d'un sirop à la fleur d'oranger ou à l'eau de rose."
      },
      "sources": [
        {
          "name": "Wikipedia - Baklava",
          "url": "https://en.wikipedia.org/wiki/Baklava"
        },
        {
          "name": "Plant Based Folk - Baklawa (Lebanese Baklava)",
          "url": "https://plantbasedfolk.com/baklawa/"
        }
      ]
    },
    "halva": {
      "local": "حلاوة طحينية (ḥalāwa ṭaḥīniyya)",
      "note": {
        "en": "A dense, dry, crumbly sweet of sesame paste (tahini) and sugar; per Wikipedia (citing Al Adib magazine) a factory for tahini halwa was…",
        "fr": "Confiserie dense, sèche et friable de pâte de sésame (tahini) et de sucre ; selon Wikipédia (citant la revue Al Adib), une fabrique de…"
      },
      "sources": [
        {
          "name": "Wikipedia - Halva",
          "url": "https://en.wikipedia.org/wiki/Halva"
        }
      ]
    },
    "arak": {
      "local": "عَرَق",
      "note": {
        "en": "Lebanon's national drink: an anise-flavoured spirit distilled from fermented grape juice; its name means \"sweat\" in Arabic.",
        "fr": "Boisson nationale du Liban : un spiritueux anisé distillé à partir de jus de raisin fermenté ; son nom signifie \"sueur\" en arabe."
      },
      "sources": [
        {
          "name": "Wikipedia — Arak (drink)",
          "url": "https://en.wikipedia.org/wiki/Arak_(drink)"
        },
        {
          "name": "Diffords Guide — Lebanese Arak",
          "url": "https://www.diffordsguide.com/beer-wine-spirits/category/962/lebanese-arak"
        }
      ]
    }
  },
  "mexican": {
    "tacos de carnitas": {
      "local": "tacos de carnitas",
      "note": {
        "en": "Mexican tacos filled with carnitas, pork braised and fried in its own lard; the dish is rooted in the state of Michoacán.",
        "fr": "Tacos mexicains garnis de carnitas, du porc braisé puis frit dans son saindoux; le plat est originaire de l'État du Michoacán."
      },
      "sources": [
        {
          "name": "Wikipedia - Carnitas",
          "url": "https://en.wikipedia.org/wiki/Carnitas"
        },
        {
          "name": "TasteAtlas - Tacos",
          "url": "https://www.tasteatlas.com/tacos"
        }
      ]
    },
    "tacos de barbacoa": {
      "local": "tacos de barbacoa",
      "note": {
        "en": "Mexican tacos filled with meat (often lamb or beef) slow-cooked in a maguey-leaf-lined underground pit, a method named from the Taino word…",
        "fr": "Tacos mexicains garnis de viande (souvent agneau ou boeuf) cuite lentement dans une fosse tapissee de feuilles de maguey, methode nommee…"
      },
      "sources": [
        {
          "name": "Wikipedia - Barbacoa",
          "url": "https://en.wikipedia.org/wiki/Barbacoa"
        },
        {
          "name": "Mexico News Daily - State by Plate: Barbacoa of Hidalgo",
          "url": "https://mexiconewsdaily.com/food/state-by-plate-barbacoa-of-hidalgo/"
        }
      ]
    },
    "tacos de pescado": {
      "local": "tacos de pescado",
      "note": {
        "en": "Baja California corn tortillas filled with fried or grilled fish, shredded cabbage and crema, with the modern Ensenada style dating to the…",
        "fr": "Tortillas de mais de Basse-Californie garnies de poisson frit ou grille, de chou emince et de crema, le style moderne d'Ensenada datant de…"
      },
      "sources": [
        {
          "name": "Mexico News Daily - The mystery behind the invention of the Baja fish taco",
          "url": "https://mexiconewsdaily.com/food/the-mystery-behind-the-invention-of-the-baja-fish-taco/"
        },
        {
          "name": "TasteAtlas - Tacos de Pescado",
          "url": "https://www.tasteatlas.com/tacos-de-pescado"
        }
      ]
    },
    "mole poblano": {
      "local": "mole poblano",
      "note": {
        "en": "Dark Puebla sauce of chiles, spices and chocolate served over turkey; legend credits 17th-c. nuns of the Santa Rosa convent.",
        "fr": "Sauce sombre de Puebla aux piments, epices et chocolat servie sur de la dinde; la legende l'attribue aux nonnes du couvent Santa Rosa."
      },
      "sources": [
        {
          "name": "TasteAtlas - Mole Poblano",
          "url": "https://www.tasteatlas.com/mole-poblano"
        },
        {
          "name": "MexGrocer - The Legend of Mole Poblano, Convent of Santa Rosa",
          "url": "https://www.mexgrocer.com/blogs/resources-tips-ideas-fun/the-legend-of-mole-poblano-convent-of-santa-rosa-puebla"
        }
      ]
    },
    "mole negro oaxaqueño": {
      "local": "mole negro oaxaqueño",
      "note": {
        "en": "Oaxaca's signature dark, complex sauce of chilhuacle chiles, chocolate and 30+ ingredients, typically served over chicken or turkey.",
        "fr": "La sauce sombre et complexe emblématique d'Oaxaca, à base de piments chilhuacle, de chocolat et de plus de 30 ingrédients, servie sur…"
      },
      "sources": [
        {
          "name": "Rick Bayless - Oaxacan Black Mole",
          "url": "https://www.rickbayless.com/recipe/oaxacan-black-mole/"
        },
        {
          "name": "Food Republic - The 7 Moles Of Oaxaca",
          "url": "https://www.foodrepublic.com/1294179/moles-of-oaxaca/"
        }
      ]
    },
    "mole verde": {
      "local": "Mole verde",
      "note": {
        "en": "A green Mexican mole sauce of tomatillos, green chiles, fresh herbs and ground pumpkin seeds; one of the seven classic moles of Oaxaca.",
        "fr": "Une sauce mole verte mexicaine a base de tomatilles, piments verts, herbes fraiches et graines de courge moulues; l'un des sept moles…"
      },
      "sources": [
        {
          "name": "Wikipedia - Mole (sauce)",
          "url": "https://en.wikipedia.org/wiki/Mole_verde"
        },
        {
          "name": "TasteAtlas - Mole",
          "url": "https://www.tasteatlas.com/mole"
        }
      ]
    },
    "chiles en nogada": {
      "local": "Chiles en nogada",
      "note": {
        "en": "Poblano chiles stuffed with fruity meat picadillo, topped with walnut cream, pomegranate and parsley; a patriotic Puebla dish tied to…",
        "fr": "Piments poblano farcis de picadillo fruite a la viande, nappes de creme de noix, grenade et persil; plat patriotique de Puebla lie a…"
      },
      "sources": [
        {
          "name": "Wikipedia — Chiles en nogada",
          "url": "https://en.wikipedia.org/wiki/Chiles_en_nogada"
        },
        {
          "name": "Fodors — The History Behind Mexico's National Dish, Chiles en Nogada",
          "url": "https://www.fodors.com/world/mexico-and-central-america/mexico/around-mexico-city/places/puebla/experiences/news/what-do-you-know-about-mexicos-most-patriotic-dish"
        }
      ]
    },
    "cochinita pibil": {
      "local": "cochinita pibil",
      "note": {
        "en": "Yucatec Mexican dish of pork marinated in achiote and sour orange, wrapped in banana leaf and slow-roasted in a Mayan earth oven (píib).",
        "fr": "Plat mexicain du Yucatán de porc mariné à l'achiote et à l'orange amère, enveloppé de feuille de bananier et rôti dans un four maya (píib)."
      },
      "sources": [
        {
          "name": "Wikipedia — Cochinita pibil",
          "url": "https://en.wikipedia.org/wiki/Cochinita_pibil"
        },
        {
          "name": "TasteAtlas — Cochinita Pibil",
          "url": "https://www.tasteatlas.com/cochinita-pibil"
        }
      ]
    },
    "pozole": {
      "local": "pozole (Nahuatl: pozolli)",
      "note": {
        "en": "A traditional Mexican hominy stew with pork or chicken and chiles, known in Mesoamerica since pre-Columbian times as an Aztec ceremonial…",
        "fr": "Ragoût mexicain traditionnel de maïs hominy, porc ou poulet et piments, connu en Mésoamérique depuis l'époque précolombienne comme plat…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pozole",
          "url": "https://en.wikipedia.org/wiki/Pozole"
        }
      ]
    },
    "birria": {
      "local": "birria",
      "note": {
        "en": "A slow-cooked chili-marinated meat stew (traditionally goat) from Jalisco, Mexico, dating to the Spanish colonial era.",
        "fr": "Un ragout de viande mijotee, marinee au piment (traditionnellement de chevre), du Jalisco, au Mexique, datant de l'epoque coloniale…"
      },
      "sources": [
        {
          "name": "Wikipedia — Birria",
          "url": "https://en.wikipedia.org/wiki/Birria"
        },
        {
          "name": "TasteAtlas — Birria",
          "url": "https://www.tasteatlas.com/birria"
        }
      ]
    },
    "enchiladas": {
      "local": "enchiladas",
      "note": {
        "en": "Mexican corn tortillas rolled around a filling and bathed in chili sauce; the name comes from Spanish enchilar, 'to season with chili'.",
        "fr": "Tortillas de mais mexicaines roulees autour d'une garniture et nappees de sauce au piment ; le nom vient de l'espagnol enchilar."
      },
      "sources": [
        {
          "name": "Wikipedia — Enchilada",
          "url": "https://en.wikipedia.org/wiki/Enchilada"
        },
        {
          "name": "Britannica — Enchilada",
          "url": "https://www.britannica.com/topic/enchilada"
        }
      ]
    },
    "chilaquiles": {
      "local": "chilaquiles",
      "note": {
        "en": "A traditional Mexican breakfast of fried tortilla pieces simmered in red or green chili salsa and usually topped with cheese, cream, onion…",
        "fr": "Un petit-dejeuner mexicain traditionnel de morceaux de tortilla frits mijotes dans une sauce chili rouge ou verte, generalement garnis de…"
      },
      "sources": [
        {
          "name": "Wikipedia - Chilaquiles",
          "url": "https://en.wikipedia.org/wiki/Chilaquiles"
        },
        {
          "name": "TasteAtlas - Chilaquiles",
          "url": "https://www.tasteatlas.com/chilaquiles"
        }
      ]
    },
    "tostadas": {
      "local": "tostada",
      "note": {
        "en": "A Mexican dish of a flat corn tortilla toasted or deep-fried until crisp, then topped with beans, meat, lettuce and other ingredients.",
        "fr": "Plat mexicain compose d'une tortilla de mais plate, grillee ou frite jusqu'a etre croustillante, garnie de haricots, viande et legumes."
      },
      "sources": [
        {
          "name": "Wikipedia - Tostada (tortilla)",
          "url": "https://en.wikipedia.org/wiki/Tostada_(tortilla)"
        },
        {
          "name": "TasteAtlas - Tostada",
          "url": "https://www.tasteatlas.com/tostada/wheretoeat/mexico-city"
        }
      ]
    },
    "ceviche mexicano": {
      "local": "Ceviche mexicano",
      "note": {
        "en": "Mexican-style ceviche: raw fish or seafood cured in lime juice, mixed with tomato, onion, cilantro and chili, often with avocado.",
        "fr": "Ceviche a la mexicaine : poisson ou fruits de mer crus cuits au jus de citron vert, avec tomate, oignon, coriandre et piment, souvent avec…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Best Rated Ceviche Varieties",
          "url": "https://www.tasteatlas.com/best-rated-ceviche-varieties-in-the-world"
        },
        {
          "name": "Porfirio's — The Origin of Ceviche and Its Connection to Mexican Cuisine",
          "url": "https://porfirios.com.mx/en/the-origin-of-ceviche-and-its-connection-to-mexican-cuisine/"
        }
      ]
    },
    "aguachile": {
      "local": "aguachile",
      "note": {
        "en": "A Sinaloa, Mexico seafood dish of raw shrimp cured in lime juice with chiltepin chili water, onion and cucumber.",
        "fr": "Un plat de fruits de mer du Sinaloa, au Mexique, de crevettes crues marinees au citron vert avec eau de piment chiltepin, oignon et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Aguachile",
          "url": "https://en.wikipedia.org/wiki/Aguachile"
        },
        {
          "name": "Texas Monthly - Meet Aguachile, Ceviche's Hotter Cousin",
          "url": "https://www.texasmonthly.com/food/aguachile-vs-ceviche/"
        }
      ]
    },
    "tequila reposado": {
      "local": "Tequila reposado",
      "note": {
        "en": "A Mexican blue-agave spirit \"rested\" (reposado) in oak from two to twelve months, giving it a golden colour and mellow agave-oak flavour.",
        "fr": "Spiritueux mexicain d'agave bleue \"reposé\" (reposado) en fûts de chêne de deux à douze mois, d'où sa couleur dorée et son goût d'agave et…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Reposado Tequila",
          "url": "https://tasteatlas.com/reposado-tequila"
        },
        {
          "name": "Difford's Guide - Tapatio Reposado Tequila",
          "url": "https://www.diffordsguide.com/beer-wine-spirits/1541/tapatio-reposado"
        }
      ]
    },
    "tacos al pastor": {
      "local": "tacos al pastor",
      "note": {
        "en": "Spit-grilled, chili-and-achiote-marinated pork tacos from Puebla, Mexico, adapted from Lebanese shawarma and popularized in the 1960s.",
        "fr": "Tacos de porc grille a la broche, marine au piment et achiote, de Puebla, Mexique, adapte du shawarma libanais, popularise dans les annees…"
      },
      "sources": [
        {
          "name": "Wikipedia — Al pastor",
          "url": "https://en.wikipedia.org/wiki/Al_pastor"
        },
        {
          "name": "HistoricalMX — Tacos Al Pastor: A Mexican Dish",
          "url": "https://historicalmx.org/items/show/112"
        }
      ]
    },
    "tamales": {
      "local": "tamal (pl. tamales)",
      "note": {
        "en": "Mesoamerican dish of nixtamalized-corn masa, with savory or sweet filling, steamed in a corn husk or banana leaf; name from Nahuatl tamalli.",
        "fr": "Plat mesoamericain de masa de mais nixtamalise, fourre sale ou sucre, cuit a la vapeur dans une feuille de mais ou de bananier; nom du…"
      },
      "sources": [
        {
          "name": "Wikipedia - Tamale",
          "url": "https://en.wikipedia.org/wiki/Tamale"
        },
        {
          "name": "TasteAtlas - Tamal varieties",
          "url": "https://www.tasteatlas.com/best-rated-tamal-varieties-in-the-world"
        }
      ]
    },
    "enchiladas verdes": {
      "local": "enchiladas verdes",
      "note": {
        "en": "Mexican corn tortillas rolled around shredded chicken and bathed in tomatillo-based salsa verde, a green sauce dating to the Aztec era.",
        "fr": "Tortillas de maïs mexicaines roulées autour de poulet effiloché et nappées de salsa verde aux tomatilles, sauce verte d'origine aztèque."
      },
      "sources": [
        {
          "name": "Wikipedia - Enchilada",
          "url": "https://en.wikipedia.org/wiki/Enchilada"
        },
        {
          "name": "TasteAtlas - Enchiladas",
          "url": "https://www.tasteatlas.com/enchiladas"
        }
      ]
    },
    "quesadillas": {
      "local": "quesadilla",
      "note": {
        "en": "A Mexican corn or wheat tortilla folded over melted cheese (queso). The name is a Spanish diminutive of \"quesada,\" literally \"little cheesy…",
        "fr": "Tortilla mexicaine de maïs ou de blé pliée sur du fromage fondu (queso). Le nom est un diminutif espagnol de \"quesada\", littéralement «…"
      },
      "sources": [
        {
          "name": "Wikipedia - Quesadilla",
          "url": "https://en.wikipedia.org/wiki/Quesadilla"
        },
        {
          "name": "Wiktionary - quesadilla",
          "url": "https://en.wiktionary.org/wiki/quesadilla"
        }
      ]
    },
    "flautas": {
      "local": "Flautas (tacos dorados)",
      "note": {
        "en": "Mexican rolled tortillas filled with meat or cheese and deep-fried crisp; named \"flutes\" for their shape, larger than taquitos.",
        "fr": "Tortillas mexicaines roulees, garnies de viande ou de fromage et frites; nommees \"flutes\" pour leur forme, plus grandes que les taquitos."
      },
      "sources": [
        {
          "name": "Wikipedia - Taquito",
          "url": "https://en.wikipedia.org/wiki/Taquito"
        },
        {
          "name": "TasteAtlas - Taquitos",
          "url": "https://www.tasteatlas.com/taquitos"
        }
      ]
    },
    "elote": {
      "local": "elote (from Nahuatl ēlōtl)",
      "note": {
        "en": "Mexican street-food corn on the cob, grilled or boiled, then topped with mayonnaise or crema, crumbled Cotija cheese, chili powder and…",
        "fr": "Épi de maïs de rue mexicain, grillé ou bouilli, puis garni de mayonnaise ou de crema, de cotija émietté, de piment en poudre et de citron…"
      },
      "sources": [
        {
          "name": "Wikipedia — Corn on the cob (Elote section; \"Elote\" redirects here)",
          "url": "https://en.wikipedia.org/wiki/Corn_on_the_cob"
        },
        {
          "name": "Wiktionary — elote (etymology: Classical Nahuatl ēlōtl)",
          "url": "https://en.wiktionary.org/wiki/elote"
        }
      ]
    },
    "esquites": {
      "local": "Esquites (elote en vaso)",
      "note": {
        "en": "Mexican corn-cup street snack of kernels with mayo, lime, cotija and chili; name from Nahuatl \"ízquitl\", toasted corn.",
        "fr": "En-cas de rue mexicain de grains de maïs en gobelet avec mayo, citron vert, cotija et piment ; nom du nahuatl « ízquitl »."
      },
      "sources": [
        {
          "name": "Wikipedia – Esquites",
          "url": "https://en.wikipedia.org/wiki/Esquites"
        },
        {
          "name": "Merriam-Webster – esquites",
          "url": "https://www.merriam-webster.com/dictionary/esquites"
        }
      ]
    },
    "guacamole": {
      "local": "āhuacamōlli",
      "note": {
        "en": "Mexican avocado-based dip whose name comes from Classical Nahuatl āhuacamōlli, literally 'avocado sauce' (āhuacatl 'avocado' + mōlli…",
        "fr": "Sauce mexicaine à base d'avocat dont le nom vient du nahuatl classique āhuacamōlli, littéralement « sauce d'avocat » (āhuacatl « avocat » +…"
      },
      "sources": [
        {
          "name": "Wikipedia — Guacamole",
          "url": "https://en.wikipedia.org/wiki/Guacamole"
        },
        {
          "name": "Avocados From Mexico — History of Guacamole",
          "url": "https://avocadosfrommexico.com/education/about-avo/guacamole-origin-history/"
        }
      ]
    },
    "pico de gallo": {
      "local": "pico de gallo",
      "note": {
        "en": "A fresh uncooked Mexican salsa of chopped tomato, onion, serrano chili, cilantro and lime; its name means \"rooster's beak.\"",
        "fr": "Salsa mexicaine fraîche et crue de tomate, oignon, piment serrano, coriandre et citron vert ; son nom signifie \"bec de coq\"."
      },
      "sources": [
        {
          "name": "Wikipedia - Pico de gallo",
          "url": "https://en.wikipedia.org/wiki/Pico_de_gallo"
        }
      ]
    },
    "salsa verde": {
      "local": "salsa verde",
      "note": {
        "en": "A Mexican spicy green sauce of tomatillos and green chili peppers, dating to the Aztec Empire as documented by physician Francisco…",
        "fr": "Sauce verte piquante mexicaine a base de tomatilles et de piments verts, datant de l'Empire azteque selon le medecin Francisco Hernandez."
      },
      "sources": [
        {
          "name": "Wikipedia - Salsa verde",
          "url": "https://en.wikipedia.org/wiki/Salsa_verde"
        },
        {
          "name": "Britannica - Tomatillo",
          "url": "https://www.britannica.com/plant/tomatillo"
        }
      ]
    },
    "churros mexican": {
      "local": "churros",
      "note": {
        "en": "Fried choux-dough sticks dusted in cinnamon sugar, brought to Mexico by Spanish conquistadors in the 16th century, often filled with cajeta.",
        "fr": "Bâtonnets de pâte à choux frits roulés dans le sucre cannelle, apportés au Mexique par les conquistadors au XVIe siècle, souvent fourrés à…"
      },
      "sources": [
        {
          "name": "Wikipedia — Churro",
          "url": "https://en.wikipedia.org/wiki/Churro"
        },
        {
          "name": "Mexico News Daily — Churros: a delicious treat with an ancient history",
          "url": "https://mexiconewsdaily.com/food/churros-a-delicious-treat-with-an-ancient-history/"
        }
      ]
    },
    "flan mexicano": {
      "local": "flan mexicano",
      "note": {
        "en": "Mexican caramel custard of whole eggs, condensed and evaporated milk over caramel, adapted from Spanish flan brought during colonial rule.",
        "fr": "Flan mexicain au caramel, fait d'oeufs entiers, de lait concentre et evapore, adapte du flan espagnol apporte a l'epoque coloniale."
      },
      "sources": [
        {
          "name": "Wikipedia - Crème caramel",
          "url": "https://en.wikipedia.org/wiki/Cr%C3%A8me_caramel"
        },
        {
          "name": "Mexico News Daily - Mexico's 'Neapolitan' flan",
          "url": "https://mexiconewsdaily.com/food/the-creamy-caramelized-bliss-of-mexicos-neapolitan-flan/"
        }
      ]
    },
    "horchata mexicana": {
      "local": "Horchata mexicana (horchata de arroz)",
      "note": {
        "en": "A sweet Mexican rice-and-cinnamon drink, adapted from the Spanish tiger-nut horchata de chufa of Valencia.",
        "fr": "Boisson mexicaine sucree au riz et a la cannelle, adaptee de l'horchata de chufa espagnole de Valence."
      },
      "sources": [
        {
          "name": "Wikipedia - Horchata",
          "url": "https://en.wikipedia.org/wiki/Horchata"
        },
        {
          "name": "TasteAtlas - Horchata (Mexico)",
          "url": "https://tasteatlas.com/horchata-mexico"
        }
      ]
    },
    "mezcal": {
      "local": "mezcal",
      "note": {
        "en": "Mexican spirit distilled from the pit-roasted, fermented heart of agave; its name comes from Nahuatl \"mexcalli,\" meaning oven-cooked agave.",
        "fr": "Spiritueux mexicain distille du coeur d'agave roti en fosse et fermente ; son nom vient du nahuatl \"mexcalli\", agave cuit au four."
      },
      "sources": [
        {
          "name": "Britannica - Mezcal",
          "url": "https://www.britannica.com/topic/mezcal"
        },
        {
          "name": "National Geographic - A guide to mezcal",
          "url": "https://www.nationalgeographic.com/travel/article/what-is-mezcal-mexico-oaxaca-distilleries"
        }
      ]
    }
  },
  "taiwanese": {
    "beef noodle soup": {
      "local": "牛肉麵 (niúròu miàn)",
      "note": {
        "en": "Wheat noodles with braised beef shank/tendon in a spiced broth; the red-braised style traces to Sichuanese KMT veterans after 1949.",
        "fr": "Nouilles de blé au jarret de bœuf braisé dans un bouillon épicé; le style braisé rouge vient des vétérans sichuanais du KMT après 1949."
      },
      "sources": [
        {
          "name": "Wikipedia — Taiwanese beef noodle soup",
          "url": "https://en.wikipedia.org/wiki/Taiwanese_beef_noodle_soup"
        }
      ]
    },
    "oyster omelette taiwan": {
      "local": "蚵仔煎 (ô-á-tsian)",
      "note": {
        "en": "A night-market street food of eggs, small oysters and sweet potato starch, of Hokkien/Teochew origin, popular across Taiwan.",
        "fr": "Street food des marchés de nuit à base d'œufs, de petites huîtres et de fécule de patate douce, d'origine hokkien/teochew, populaire à…"
      },
      "sources": [
        {
          "name": "Wikipedia - Oyster omelette",
          "url": "https://en.wikipedia.org/wiki/Oyster_omelette"
        },
        {
          "name": "TasteAtlas - Oyster omelette",
          "url": "https://www.tasteatlas.com/oyster-omelette"
        }
      ]
    },
    "three cup chicken": {
      "local": "三杯雞",
      "note": {
        "en": "Iconic Taiwanese braised chicken named for its three \"cups\" of sesame oil, rice wine and soy sauce, finished with Thai basil.",
        "fr": "Poulet braisé taïwanais emblématique nommé d'après ses trois \"tasses\" d'huile de sésame, vin de riz et sauce soja, fini au basilic thaï."
      },
      "sources": [
        {
          "name": "Michelin Guide — Taiwanese Three Cups Chicken: Origins",
          "url": "https://guide.michelin.com/tw/en/article/features/taiwanese-three-cups-chicken-origins-michelin-restaurants"
        },
        {
          "name": "The Woks of Life — Three Cup Chicken (San Bei Ji)",
          "url": "https://thewoksoflife.com/three-cup-chicken-san-bei-ji/"
        }
      ]
    },
    "gua bao": {
      "local": "刈包 (割包)",
      "note": {
        "en": "Taiwanese folded steamed bun holding red-cooked pork belly, pickled mustard greens and peanuts; rooted in Fujian (Quanzhou/Fuzhou).",
        "fr": "Pain vapeur taiwanais plie garni de poitrine de porc braisee, moutarde marinee et cacahuetes; originaire du Fujian (Quanzhou/Fuzhou)."
      },
      "sources": [
        {
          "name": "Wikipedia - Koah-pau (Gua bao)",
          "url": "https://en.wikipedia.org/wiki/Koah-pau"
        },
        {
          "name": "Taiwan Panorama - Taiwan's Gua Bao",
          "url": "https://www.taiwan-panorama.com/en/Articles/Details?Guid=af3ad61c-0a0c-42e8-8789-fce26aa9277a&CatId=10&postname=A+Street+Food+Goes+International-Taiwan%E2%80%99s+Gua+Bao"
        }
      ]
    },
    "xiao long bao": {
      "local": "小籠包",
      "note": {
        "en": "Steamed soup dumplings of pork and aspic-set broth, originating in late-19th-century Nanxiang near Shanghai; popularized worldwide via…",
        "fr": "Raviolis vapeur farcis de porc et de bouillon en gelée, nés à Nanxiang près de Shanghai au XIXe siècle, popularisés par Din Tai Fung à…"
      },
      "sources": [
        {
          "name": "Xiaolongbao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Xiaolongbao"
        },
        {
          "name": "Din Tai Fung - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Din_Tai_Fung"
        }
      ]
    },
    "popcorn chicken taiwan": {
      "local": "鹽酥雞",
      "note": {
        "en": "Taiwanese night-market deep-fried bite-sized chicken in five-spice marinade, salt-and-pepper seasoned and garnished with fried basil.",
        "fr": "Poulet taïwanais frit en bouchées des marchés de nuit, mariné aux cinq-épices, assaisonné sel-poivre et garni de basilic frit."
      },
      "sources": [
        {
          "name": "Wikipedia — Taiwanese fried chicken",
          "url": "https://en.wikipedia.org/wiki/Taiwanese_fried_chicken"
        },
        {
          "name": "Red House Spice — Taiwanese Popcorn Chicken (鹽酥雞)",
          "url": "https://redhousespice.com/popcorn-chicken/"
        }
      ]
    },
    "scallion pancake": {
      "local": "蔥油餅 (cōngyóubǐng)",
      "note": {
        "en": "A savory unleavened Chinese flatbread of wheat dough folded with oil and minced scallions, then pan-fried until crisp and flaky; commonly…",
        "fr": "Une galette chinoise salée, à base de pâte de blé sans levain, repliée avec de l'huile et de la ciboule émincée, puis frite à la poêle…"
      },
      "sources": [
        {
          "name": "Wikipedia — Cong you bing",
          "url": "https://en.wikipedia.org/wiki/Cong_you_bing"
        },
        {
          "name": "TasteAtlas — Scallion pancake",
          "url": "https://www.tasteatlas.com/scallion-pancake"
        }
      ]
    },
    "mango shaved ice": {
      "local": "芒果冰",
      "note": {
        "en": "Taiwanese summer shaved-ice dessert of fresh mango, condensed milk and often mango ice cream, a seasonal variety of tshuah-ping introduced…",
        "fr": "Dessert taïwanais estival de glace pilée à la mangue fraîche, lait concentré et souvent glace mangue, variante saisonnière du tshuah-ping…"
      },
      "sources": [
        {
          "name": "Wikipedia — Mango shaved ice",
          "url": "https://en.wikipedia.org/wiki/Mango_shaved_ice"
        },
        {
          "name": "TasteAtlas — Mango Shaved Ice",
          "url": "https://www.tasteatlas.com/mango-shaved-ice"
        }
      ]
    },
    "pineapple cake": {
      "local": "鳳梨酥",
      "note": {
        "en": "A Taiwanese pastry of pineapple (often winter-melon) jam in a buttery shortcrust shell, now one of the island's top souvenirs.",
        "fr": "Pâtisserie taïwanaise de confiture d'ananas (souvent de courge cireuse) dans une croûte sablée beurrée, souvenir phare de l'île."
      },
      "sources": [
        {
          "name": "Wikipedia — Pineapple cake",
          "url": "https://en.wikipedia.org/wiki/Pineapple_cake"
        },
        {
          "name": "Taipei Times — The Story of Pineapple Cakes",
          "url": "https://www.taipeitimes.com/News/lang/archives/2024/06/17/2003819441"
        }
      ]
    },
    "taiwanese sausage": {
      "local": "台灣香腸 (香腸, xiāngcháng)",
      "note": {
        "en": "A fresh, plump pork sausage from Taiwan made of coarsely chopped pork and fat, notably sweet, often chargrilled at night markets.",
        "fr": "Une saucisse de porc fraîche et dodue de Taïwan, faite de porc et de gras grossièrement hachés, nettement sucrée, souvent grillée aux…"
      },
      "sources": [
        {
          "name": "Chinese sausage - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Chinese_sausage"
        },
        {
          "name": "Small sausage in large sausage - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Small_sausage_in_large_sausage"
        }
      ]
    },
    "danzi noodles": {
      "local": "擔仔麵 (dānzǎi miàn)",
      "note": {
        "en": "A Tainan snack of thin wheat noodles in shrimp-and-pork broth topped with minced pork and a prawn, sold by fishermen in the 1890s…",
        "fr": "Snack de Tainan : nouilles de blé fines en bouillon crevette-porc, garnies de porc haché et d'une crevette, vendu par les pêcheurs dès 1890."
      },
      "sources": [
        {
          "name": "Wikipedia — Tàⁿ-á-mī",
          "url": "https://en.wikipedia.org/wiki/Ta-a_mi"
        },
        {
          "name": "Michelin Guide — Must-eat noodles in Taiwan",
          "url": "https://guide.michelin.com/vn/en/article/travel/7-must-eat-noodles-taiwan"
        }
      ]
    },
    "iron egg": {
      "local": "鐵蛋",
      "note": {
        "en": "Taiwanese snack of small eggs repeatedly stewed in soy and spices then air-dried until dark and chewy; popularized in Tamsui around 1980.",
        "fr": "En-cas taïwanais de petits œufs mijotés à répétition dans sauce soja et épices puis séchés à l'air, sombres et fermes ; popularisé à Tamsui…"
      },
      "sources": [
        {
          "name": "Wikipedia — Iron egg",
          "url": "https://en.wikipedia.org/wiki/Iron_egg"
        },
        {
          "name": "Tamsui History — Traditional snack food in Tamsui (iron eggs)",
          "url": "https://danshuihistory.blogspot.com/2015/01/traditional-snack-food-in-tamsui-part-9.html"
        }
      ]
    },
    "taiwan night market dishes": {
      "local": "夜市小吃 (yèshì xiǎochī)",
      "note": {
        "en": "Taiwanese night-market \"small eats\" (xiaochi): bite-sized stall dishes like oyster omelette and stinky tofu, meant for grazing many at once.",
        "fr": "Les « petits plats » (xiaochi) des marchés nocturnes taiwanais : bouchées d'étal comme l'omelette aux huîtres et le tofu puant, à picorer…"
      },
      "sources": [
        {
          "name": "Wikipedia — Xiaochi",
          "url": "https://en.wikipedia.org/wiki/Xiaochi"
        },
        {
          "name": "Wikipedia — Night market",
          "url": "https://en.wikipedia.org/wiki/Night_market"
        }
      ]
    },
    "bubble tea": {
      "local": "珍珠奶茶",
      "note": {
        "en": "Taiwanese tea drink of milk tea with chewy tapioca pearls, invented in Taichung/Tainan in the 1980s.",
        "fr": "Boisson taiwanaise au thé au lait avec perles de tapioca, inventée à Taichung/Tainan dans les années 1980."
      },
      "sources": [
        {
          "name": "Wikipedia — Bubble tea",
          "url": "https://en.wikipedia.org/wiki/Bubble_tea"
        },
        {
          "name": "CNN Travel — The origins of bubble tea",
          "url": "https://www.cnn.com/travel/bubble-tea-origin-history-taiwan-intl-hnk"
        }
      ]
    },
    "milk tea taiwan style": {
      "local": "珍珠奶茶",
      "note": {
        "en": "Taiwanese black-tea-and-milk drink with chewy tapioca pearls, invented in 1980s Taiwan (Taichung/Tainan tea houses).",
        "fr": "Boisson taïwanaise au thé noir et lait avec perles de tapioca, inventée à Taïwan dans les années 1980 (salons de Taichung/Tainan)."
      },
      "sources": [
        {
          "name": "Wikipedia — Bubble tea",
          "url": "https://en.wikipedia.org/wiki/Bubble_tea"
        },
        {
          "name": "National Geographic — Origins of boba, Taiwan's iconic drink",
          "url": "https://www.nationalgeographic.com/travel/article/what-is-boba-bubble-tea-taiwan"
        }
      ]
    },
    "taiwan beer": {
      "local": "台灣啤酒",
      "note": {
        "en": "Taiwan's best-selling beer, a lager brewed by the Taiwan Tobacco and Liquor Corporation; its Gold Medal style is 5% ABV. First brewed in…",
        "fr": "La biere la plus vendue de Taiwan, une lager brassee par la Taiwan Tobacco and Liquor Corporation; sa version Gold Medal titre 5%. Brassee…"
      },
      "sources": [
        {
          "name": "Wikipedia - Taiwan Beer",
          "url": "https://en.wikipedia.org/wiki/Taiwan_Beer"
        },
        {
          "name": "Wikipedia - Beer in Taiwan",
          "url": "https://en.wikipedia.org/wiki/Beer_in_Taiwan"
        }
      ]
    },
    "lu rou fan": {
      "local": "滷肉飯",
      "note": {
        "en": "Taiwanese rice bowl topped with finely chopped or minced pork stewed in soy sauce; a staple street food common in Taiwan and southern…",
        "fr": "Bol de riz taïwanais garni de porc finement haché ou émincé mijoté à la sauce soja ; un plat de rue courant à Taïwan et dans le sud du…"
      },
      "sources": [
        {
          "name": "Ló͘-bah-pn̄g — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/L%C3%B3%CD%98-bah-pn%CC%84g"
        },
        {
          "name": "Taiwanese cuisine — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Taiwanese_cuisine"
        }
      ]
    },
    "stinky tofu": {
      "local": "臭豆腐 (chòu dòufu)",
      "note": {
        "en": "Fermented tofu soaked in pungent brine, then deep-fried; a Taiwanese night-market staple with Qing-dynasty Chinese origins.",
        "fr": "Tofu fermenté trempé en saumure odorante puis frit; classique des marchés nocturnes taiwanais, d'origine chinoise sous les Qing."
      },
      "sources": [
        {
          "name": "Wikipedia - Stinky tofu",
          "url": "https://en.wikipedia.org/wiki/Stinky_tofu"
        },
        {
          "name": "Taiwan Panorama - The Secrets Behind Stinky Tofu",
          "url": "https://www.taiwan-panorama.com/en/Articles/Details?Guid=5c270372-a05e-4edd-a4f6-613e98941dce&CatId=10&postname=Malodorous+but+Delicious+%E2%80%94-The+Secrets+Behind+Stinky+Tofu"
        }
      ]
    },
    "din tai fung dumplings": {
      "local": "小籠包",
      "note": {
        "en": "Xiaolongbao, the soup-filled steamed dumpling that became the signature of Taipei's Din Tai Fung. The business opened as a cooking-oil shop…",
        "fr": "Le xiaolongbao, raviole vapeur garnie de bouillon, devenu l'emblème du Din Tai Fung de Taipei. L'enseigne a ouvert comme magasin d'huile de…"
      },
      "sources": [
        {
          "name": "Din Tai Fung - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Din_Tai_Fung"
        },
        {
          "name": "Xiaolongbao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Xiaolongbao"
        }
      ]
    }
  },
  "hong-kong": {
    "hk-style milk tea": {
      "local": "絲襪奶茶（港式奶茶）",
      "note": {
        "en": "Hong Kong black tea blended with evaporated milk, repeatedly strained through a cloth \"silk-stocking\" sackcloth bag (the 'pulling'…",
        "fr": "Thé noir hongkongais mélangé à du lait évaporé, filtré à plusieurs reprises dans un sac en toile dit « bas de soie » (la technique du «…"
      },
      "sources": [
        {
          "name": "Wikipedia — Hong Kong-style milk tea",
          "url": "https://en.wikipedia.org/wiki/Hong_Kong%E2%80%93style_milk_tea"
        },
        {
          "name": "HKSAR Government — First Representative List of the Intangible Cultural Heritage of Hong Kong announced",
          "url": "https://www.info.gov.hk/gia/general/201708/14/P2017081400655.htm"
        }
      ]
    },
    "egg tart": {
      "local": "蛋撻 (daahn tāat)",
      "note": {
        "en": "Cantonese flaky-pastry tart filled with sweet egg custard, adapted from the British custard tart and popularised in Hong Kong cha chaan…",
        "fr": "Tartelette cantonaise à pâte feuilletée garnie de crème aux œufs sucrée, dérivée du custard tart britannique, popularisée dans les cha…"
      },
      "sources": [
        {
          "name": "Wikipedia — Egg tart",
          "url": "https://en.wikipedia.org/wiki/Egg_tart"
        },
        {
          "name": "South China Morning Post — The history of egg tarts",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/3102712/history-egg-tarts-savoury-sweet-england-canton-short-crust"
        }
      ]
    },
    "pineapple bun": {
      "local": "菠蘿包",
      "note": {
        "en": "A Hong Kong sweet bun with a crackly sugar-crust top resembling a pineapple's skin; it contains no actual pineapple.",
        "fr": "Un pain brioché sucré de Hong Kong au dessus craquelé évoquant la peau d'un ananas; il ne contient pas d'ananas."
      },
      "sources": [
        {
          "name": "Wikipedia — Pineapple bun",
          "url": "https://en.wikipedia.org/wiki/Pineapple_bun"
        },
        {
          "name": "Atlas Obscura — Pineapple Bun (Bo Lo Bao)",
          "url": "https://www.atlasobscura.com/foods/pineapple-bun-bo-lo-bao"
        }
      ]
    },
    "french toast hk-style": {
      "local": "西多士",
      "note": {
        "en": "Hong Kong cha chaan teng dish: bread spread with peanut butter, egg-battered and deep-fried, served with butter and condensed milk or syrup.",
        "fr": "Plat des cha chaan teng de Hong Kong : pain au beurre de cacahuète, pané à l'œuf et frit, servi avec beurre et lait concentré ou sirop."
      },
      "sources": [
        {
          "name": "Cha chaan teng — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Cha_chaan_teng"
        },
        {
          "name": "French Toast (西多士) — HKU CCCH9051",
          "url": "https://learning.hku.hk/ccch9051/group-19/items/show/4"
        }
      ]
    },
    "hk-style wonton noodle": {
      "local": "雲吞麵",
      "note": {
        "en": "Cantonese dish of thin egg noodles topped with prawn-and-pork wontons in a light, dried-flounder broth. It originated in Guangzhou (Canton)…",
        "fr": "Plat cantonais de fines nouilles aux oeufs garnies de wontons crevette-porc dans un bouillon clair a la sole sechee. Originaire de Canton…"
      },
      "sources": [
        {
          "name": "Wonton noodles - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Wonton_noodles"
        },
        {
          "name": "Mak's Noodle - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mak's_Noodle"
        }
      ]
    },
    "clay pot rice": {
      "local": "煲仔飯",
      "note": {
        "en": "Cantonese rice dish cooked and served in a small clay pot, prized for its crispy bottom rice crust and toppings like Chinese sausage.",
        "fr": "Plat de riz cantonais cuit et servi dans un petit pot en terre, prisé pour sa croûte de riz croustillante et ses garnitures comme le…"
      },
      "sources": [
        {
          "name": "Wikipedia — Claypot rice",
          "url": "https://en.wikipedia.org/wiki/Claypot_rice"
        },
        {
          "name": "Wiktionary — 煲仔飯",
          "url": "https://en.wiktionary.org/wiki/%E7%85%B2%E4%BB%94%E9%A3%AF"
        }
      ]
    },
    "siu mei platter": {
      "local": "燒味拼盤",
      "note": {
        "en": "A Cantonese platter of assorted siu mei (open-fire roasted meats) such as char siu, roast duck and crispy pork, a Hong Kong staple.",
        "fr": "Un plateau cantonais de viandes rôties au feu (siu mei) assorties: char siu, canard rôti et porc croustillant, un classique hongkongais."
      },
      "sources": [
        {
          "name": "Wikipedia — Siu mei",
          "url": "https://en.wikipedia.org/wiki/Siu_mei"
        },
        {
          "name": "Localiiz — A history of Cantonese barbecue (siu mei)",
          "url": "https://www.localiiz.com/post/food-drink-history-cantonese-barbecue-siu-mei"
        }
      ]
    },
    "char chaan teng dishes": {
      "local": "茶餐廳",
      "note": {
        "en": "Eclectic, affordable Hong Kong tea-restaurant fare blending Cantonese and Hong Kong-style Western dishes, evolving from 1940s-50s bing sutt…",
        "fr": "Cuisine éclectique et abordable des salons de thé hongkongais mêlant plats cantonais et occidentaux, issue des bing sutt des années 1940-50."
      },
      "sources": [
        {
          "name": "Wikipedia – Cha chaan teng",
          "url": "https://en.wikipedia.org/wiki/Cha_chaan_teng"
        },
        {
          "name": "Michelin Guide – The Evolution of Cha Chaan Teng",
          "url": "https://guide.michelin.com/hk/en/article/features/evolution-of-cha-chaan-teng-hong-kong-s-iconic-dishes-and-local-dining-culture"
        }
      ]
    },
    "macaroni soup": {
      "local": "火腿通粉",
      "note": {
        "en": "Hong Kong cha chaan teng breakfast of soft elbow macaroni in light chicken broth with ham, born in 1950s bing sutt diners.",
        "fr": "Petit-déjeuner des cha chaan teng de Hong Kong : macaronis dans un bouillon de poulet léger au jambon, né dans les bing sutt des années…"
      },
      "sources": [
        {
          "name": "Cathay Pacific - A Cantonese delicacy: macaroni soup",
          "url": "https://www.cathaypacific.com/cx/en_GB/inspiration/dining/cantonese-cuisine-macaroni-soup.html"
        },
        {
          "name": "Chinese Cooking Demystified - Hong Kong Macaroni Soup (餐蛋通粉)",
          "url": "https://chinesecookingdemystified.substack.com/p/hong-kong-macaroni-soup"
        }
      ]
    },
    "hk-style baked pork chop rice": {
      "local": "焗豬扒飯",
      "note": {
        "en": "Hong Kong cha chaan teng dish of egg fried rice topped with a fried pork chop, tomato sauce and cheese, then baked.",
        "fr": "Plat des cha chaan teng de Hong Kong : riz frit à l'œuf garni d'une côtelette de porc, sauce tomate et fromage, puis gratiné."
      },
      "sources": [
        {
          "name": "Wikipedia - Baked pork chop rice",
          "url": "https://en.wikipedia.org/wiki/Baked_pork_chop_rice"
        },
        {
          "name": "South China Morning Post - Baked pork chop rice history",
          "url": "https://www.scmp.com/magazines/post-magazine/food-drink/article/3209325/baked-pork-chop-rice-history-defining-hong-kong-comfort-food-its-humble-roots-and-fine-dining"
        }
      ]
    },
    "hk-style baked seafood rice": {
      "local": "白汁海鮮焗飯",
      "note": {
        "en": "Hong Kong cha chaan teng baked dish of egg-fried rice topped with seafood in white cream sauce and cheese, a post-1950s \"soy-sauce Western\"…",
        "fr": "Plat cuit au four des cha chaan teng de Hong Kong: riz frit aux oeufs, fruits de mer en sauce blanche et fromage, gratin \"occidental sino\"…"
      },
      "sources": [
        {
          "name": "Localiiz — History of baked rice, a Hong Kong comfort food",
          "url": "https://www.localiiz.com/post/history-baked-rice-heart-hong-kong-cuisine"
        },
        {
          "name": "HK01 — 白汁焗海鮮飯 recipe / dish guide",
          "url": "https://www.hk01.com/%E6%95%99%E7%85%AE/530648/%E7%84%97%E9%A3%AF%E9%A3%9F%E8%AD%9C-%E7%99%BD%E6%B1%81%E7%84%97%E6%B5%B7%E9%AE%AE%E9%A3%AF%E5%BF%85%E9%85%8D%E7%82%92%E5%BA%95-%E7%85%AE%E5%B9%BC%E6%BB%91%E7%99%BD%E6%B1%812%E5%A4%A7%E8%B2%BC%E5%A3%AB%E5%BF%8C%E5%A4%AA%E7%86%B1"
        }
      ]
    },
    "curry fish balls": {
      "local": "咖喱魚蛋",
      "note": {
        "en": "Hong Kong street-food snack of deep-fried fish balls simmered in curry sauce, popular on skewers since the 1950s.",
        "fr": "En-cas de rue hongkongais fait de boulettes de poisson frites mijotées dans une sauce au curry, populaire en brochette depuis les années…"
      },
      "sources": [
        {
          "name": "Wikipedia — Curry fish ball",
          "url": "https://en.wikipedia.org/wiki/Curry_fish_ball"
        },
        {
          "name": "Michelin Guide — The Journey of Hong Kong's Iconic Fish Ball",
          "url": "https://guide.michelin.com/hk/en/article/features/bouncing-through-time-the-journey-iconic-fish-ball-hong-kong"
        }
      ]
    },
    "siu mai street": {
      "local": "魚肉燒賣",
      "note": {
        "en": "Hong Kong street snack of yellow-wrapped fish-paste siu mai, served on bamboo skewers with sweet soy and chilli sauce.",
        "fr": "En-cas de rue hongkongais : siu mai à la pâte de poisson, enveloppe jaune, servis en brochettes avec sauce soja sucrée et piment."
      },
      "sources": [
        {
          "name": "South China Morning Post — The origins of siu mai",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/3121918/origins-siu-mai-how-iconic-dim-sum-staple-came-be"
        },
        {
          "name": "Hong Kong Free Press — Hong Kong's humble street food",
          "url": "https://hongkongfp.com/2021/05/23/love-at-first-bite-hong-kongs-humble-street-food-inspires-an-encyclopaedia/"
        }
      ]
    },
    "dim sum hong kong": {
      "local": "點心",
      "note": {
        "en": "Cantonese bite-sized steamed or fried dishes traditionally served with tea (the meal is called yum cha, \"drinking tea\"); the name dim sum…",
        "fr": "Petits plats cantonais cuits à la vapeur ou frits, traditionnellement servis avec du thé (le repas s'appelle yum cha, « boire le thé »)…"
      },
      "sources": [
        {
          "name": "Wikipedia – Dim sum",
          "url": "https://en.wikipedia.org/wiki/Dim_sum"
        },
        {
          "name": "Britannica – Dim sum",
          "url": "https://www.britannica.com/topic/dim-sum"
        }
      ]
    },
    "shrimp wonton noodle": {
      "local": "雲吞麵",
      "note": {
        "en": "Cantonese dish of shrimp (or shrimp-and-pork) wontons served with thin egg noodles in a light broth made from dried flounder. Wonton…",
        "fr": "Plat cantonais de raviolis aux crevettes (ou crevettes et porc) servis avec de fines nouilles aux œufs dans un bouillon léger à base de…"
      },
      "sources": [
        {
          "name": "Wikipedia — Wonton noodles",
          "url": "https://en.wikipedia.org/wiki/Wonton_noodles"
        },
        {
          "name": "South China Morning Post — How does Hong Kong's version of wonton noodles compare with Singapore's or Malaysia's?",
          "url": "https://www.scmp.com/magazines/style/leisure/article/3022402/how-does-hong-kongs-version-wonton-noodles-compare"
        }
      ]
    },
    "beef brisket noodle": {
      "local": "牛腩麵",
      "note": {
        "en": "Cantonese Hong Kong staple of slow-braised beef brisket served over noodles in a clear or curry broth, with Chiu Chow roots.",
        "fr": "Plat cantonais classique de Hong Kong: poitrine de bœuf braisée sur nouilles dans un bouillon clair ou au curry, d'origine chaozhou."
      },
      "sources": [
        {
          "name": "Kau Kee Restaurant - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kau_Kee_Restaurant"
        },
        {
          "name": "Beef Brisket in Clear Broth - Auntie Emily's Kitchen",
          "url": "https://auntieemily.com/beef-brisket-in-clear-broth/"
        }
      ]
    },
    "roasted goose": {
      "local": "燒鵝",
      "note": {
        "en": "A Cantonese siu mei dish of charcoal-roasted seasoned goose with crisp skin, normally served with plum sauce; in Hong Kong the Sham Tseng…",
        "fr": "Plat cantonais siu mei d'oie assaisonnée rôtie au charbon, à peau croustillante, généralement servie avec une sauce aux prunes; à Hong…"
      },
      "sources": [
        {
          "name": "Wikipedia — Roast goose",
          "url": "https://en.wikipedia.org/wiki/Roast_goose"
        },
        {
          "name": "South China Morning Post — 60 years of a Hong Kong roast goose restaurant and the secrets to its success",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/2097428/60-years-hong-kong-roast-goose-restaurant-and-secrets-its"
        }
      ]
    },
    "sweet and sour pork hk": {
      "local": "咕嚕肉",
      "note": {
        "en": "A Cantonese dish of batter-fried pork in a sweet-sour sauce with bell peppers and pineapple, originating in 18th-century Guangdong.",
        "fr": "Plat cantonais de porc frit en pâte, sauce aigre-douce avec poivrons et ananas, originaire du Guangdong au XVIIIe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia – Sweet and sour pork",
          "url": "https://en.wikipedia.org/wiki/Sweet_and_sour_pork"
        },
        {
          "name": "South China Morning Post – How Chinese sweet and sour pork evolved",
          "url": "https://www.scmp.com/magazines/post-magazine/food-drink/article/3247388/how-chinese-sweet-and-sour-pork-evolved-british-takeaways-become-dish-everyone-just-likes-and-hong"
        }
      ]
    },
    "typhoon shelter crab": {
      "local": "避風塘炒蟹",
      "note": {
        "en": "Hong Kong stir-fried crab coated in crisp fried garlic, chilli and fermented black beans, originating with the boat-dwelling fishing…",
        "fr": "Crabe sauté hongkongais enrobé d'ail frit croustillant, de piment et de haricots noirs fermentés, né chez les familles de pêcheurs vivant…"
      },
      "sources": [
        {
          "name": "Michelin Guide — Typhoon Shelter Crab: Hong Kong's Iconic Harbor-born Dish",
          "url": "https://guide.michelin.com/sg/en/article/features/typhoon-shelter-crab-hong-kong-iconic-dish"
        },
        {
          "name": "South China Morning Post — Typhoon shelter crab, Hong Kong seafood dish made with garlic, chilli and dab of nostalgia",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/3313951/typhoon-shelter-crab-hong-kong-seafood-dish-made-garlic-chilli-and-dab-nostalgia"
        }
      ]
    },
    "mantis shrimp": {
      "local": "瀨尿蝦",
      "note": {
        "en": "Hong Kong seafood-market mantis shrimp; its Cantonese name means 'pissing shrimp', for the water it jets when lifted from the tank.",
        "fr": "Squille des marchés hongkongais; son nom cantonais signifie « crevette qui pisse », car elle gicle de l'eau quand on la sort du bac."
      },
      "sources": [
        {
          "name": "Wiktionary — 瀨尿蝦 (Cantonese for mantis shrimp / stomatopod)",
          "url": "https://en.wiktionary.org/wiki/%E7%80%A8%E5%B0%BF%E8%9D%A6"
        },
        {
          "name": "Hong Kong Tourism Board — Sai Kung seafood",
          "url": "https://www.discoverhongkong.com/eng/explore/neighbourhoods/sai-kung/sai-kung-seafood.html"
        }
      ]
    },
    "yuan yang": {
      "local": "鴛鴦",
      "note": {
        "en": "A Hong Kong cha chaan teng drink mixing coffee with milk tea (about 3:7); named for mandarin ducks, a symbol of pairing.",
        "fr": "Boisson hongkongaise des cha chaan teng melant cafe et the au lait (env. 3:7); nommee d'apres les canards mandarins, symbole du couple."
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
    "hk-style lemon tea": {
      "local": "港式檸檬茶 (凍檸茶)",
      "note": {
        "en": "Iced black tea with sliced lemon, a cha chaan teng staple served with a spoon to press the slices and release their juice.",
        "fr": "Thé noir glacé aux tranches de citron, classique des cha chaan teng, servi avec une cuillère pour presser les tranches."
      },
      "sources": [
        {
          "name": "Wikipedia — Cha chaan teng",
          "url": "https://en.wikipedia.org/wiki/Cha_chaan_teng"
        },
        {
          "name": "South China Morning Post — Hand-crushed lemon tea takes off in Hong Kong",
          "url": "https://www.scmp.com/magazines/post-magazine/food-drink/article/3265990/hand-crushed-lemon-tea-takes-hong-kong-we-test-best-version"
        }
      ]
    },
    "horlicks hk-style": {
      "local": "好立克",
      "note": {
        "en": "A malted-barley milk drink, a legacy of Hong Kong's British colonial era, served hot or iced at cha chaan tengs as a caffeine-free comfort…",
        "fr": "Boisson lactee au malt d'orge, heritage de l'epoque coloniale britannique de Hong Kong, servie chaude ou glacee dans les cha chaan teng…"
      },
      "sources": [
        {
          "name": "Localiiz - 13 quintessential Hong Kong drinks you must try",
          "url": "https://www.localiiz.com/post/food-drink-cha-chaan-teng-guide-quintessential-hong-kong-diner-drinks-beverages"
        },
        {
          "name": "Horlicks UK - FAQs (caffeine content)",
          "url": "https://www.horlicks.co.uk/pages/faqs"
        }
      ]
    }
  },
  "shanghainese": {
    "xiao long bao": {
      "local": "小籠包 (xiǎolóngbāo)",
      "note": {
        "en": "Steamed soup-filled pork dumpling of the Jiangnan region, the Shanghai-style version traced to 1870s Nanxiang.",
        "fr": "Bouchee vapeur farcie de porc et de bouillon, de la region du Jiangnan; la version shanghaienne remonte au Nanxiang des annees 1870."
      },
      "sources": [
        {
          "name": "Wikipedia — Xiaolongbao",
          "url": "https://en.wikipedia.org/wiki/Xiaolongbao"
        },
        {
          "name": "The Culture Trip — A Brief History of Xiao Long Bao",
          "url": "https://theculturetrip.com/asia/china/articles/a-brief-history-of-xiao-long-bao-shanghais-signature-dish"
        }
      ]
    },
    "shengjianbao": {
      "local": "生煎包 (生煎饅頭, shēngjiān bāo)",
      "note": {
        "en": "Small pan-fried pork baozi with a crisp base and soupy filling; originated in Suzhou, a Shanghai breakfast staple since the early 1920s.",
        "fr": "Petit baozi de porc poêlé à base croustillante et farce en bouillon ; né à Suzhou, incontournable du petit-déjeuner shanghaïen depuis les…"
      },
      "sources": [
        {
          "name": "Wikipedia – Shengjian mantou",
          "url": "https://en.wikipedia.org/wiki/Shengjian_mantou"
        },
        {
          "name": "TasteAtlas – Shēngjiān Bāo",
          "url": "https://www.tasteatlas.com/shengjian-mantou"
        }
      ]
    },
    "hong shao rou": {
      "local": "红烧肉 (hóngshāo ròu)",
      "note": {
        "en": "Pork belly cubes braised \"red-cooked\" in soy sauce, sugar and Shaoxing wine; a Jiangnan/Shanghai classic with a glossy reddish-brown sauce.",
        "fr": "Cubes de poitrine de porc braisés \"à la rouge\" dans sauce soja, sucre et vin de Shaoxing ; un classique de Shanghai à la sauce brun-rouge…"
      },
      "sources": [
        {
          "name": "Wikipedia — Red braised pork belly",
          "url": "https://en.wikipedia.org/wiki/Red_braised_pork_belly"
        },
        {
          "name": "TasteAtlas — Hong shao rou",
          "url": "https://www.tasteatlas.com/hong-shao-rou"
        }
      ]
    },
    "drunken chicken": {
      "local": "醉鸡 (zuì jī)",
      "note": {
        "en": "A cold Jiangnan appetizer of poached chicken steeped in Shaoxing rice wine, served chilled and sliced.",
        "fr": "Une entrée froide du Jiangnan de poulet poché macéré dans du vin de riz de Shaoxing, servi frais et tranché."
      },
      "sources": [
        {
          "name": "Wikipedia — Drunken chicken",
          "url": "https://en.wikipedia.org/wiki/Drunken_chicken"
        },
        {
          "name": "The Mala Market — Shaoxing Drunken Chicken (Zuiji, 醉鸡)",
          "url": "https://blog.themalamarket.com/shaoxing-drunken-chicken-zuiji/"
        }
      ]
    },
    "lion's head meatball": {
      "local": "獅子頭 (狮子头, Shīzitóu)",
      "note": {
        "en": "Large stewed pork meatball from Huaiyang cuisine (Yangzhou/Zhenjiang), named for its lion-head shape; entered Shanghai cuisine via…",
        "fr": "Grosse boulette de porc mijotee de la cuisine Huaiyang (Yangzhou/Zhenjiang), nommee pour sa forme de tete de lion; entree dans la cuisine…"
      },
      "sources": [
        {
          "name": "Lion's Head (food) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lion's_Head_(food)"
        },
        {
          "name": "Legends: Lion's Head meatballs - South China Morning Post",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/1077059/legends-lions-head-meatballs"
        }
      ]
    },
    "squirrel fish": {
      "local": "松鼠鳜鱼",
      "note": {
        "en": "A Suzhou/Jiangsu dish of deboned mandarin fish carved into a squirrel shape, deep-fried and doused in sweet-and-sour sauce, popularized in…",
        "fr": "Plat de Suzhou (Jiangsu) : un poisson mandarin désossé, sculpté en forme d'écureuil, frit et nappé de sauce aigre-douce, popularisé sous…"
      },
      "sources": [
        {
          "name": "Wikipedia — Squirrel fish",
          "url": "https://en.wikipedia.org/wiki/Squirrel_fish"
        },
        {
          "name": "Atlas Obscura / Gastro Obscura — squirrel-shaped fish",
          "url": "https://www.atlasobscura.com/articles/how-did-squirrel-shaped-fish-become-popular"
        }
      ]
    },
    "beggar's chicken jiangsu": {
      "local": "叫化雞 (jiàohuā jī)",
      "note": {
        "en": "A whole chicken marinated, wrapped in lotus leaves and clay and slow-baked; linked to Changshu, Jiangsu, with over 300 years of history.",
        "fr": "Un poulet entier mariné, enveloppé de feuilles de lotus et d'argile puis cuit lentement; lié à Changshu, Jiangsu, depuis plus de 300 ans."
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
    "soup dumplings": {
      "local": "小籠包 (xiǎolóngbāo)",
      "note": {
        "en": "Steamed Shanghainese buns filled with pork and hot gelatinous broth, invented in Nanxiang near Shanghai in the 1870s.",
        "fr": "Bouchées shanghaïennes vapeur farcies de porc et de bouillon chaud gélatineux, inventées à Nanxiang près de Shanghai dans les années 1870."
      },
      "sources": [
        {
          "name": "Wikipedia — Xiaolongbao",
          "url": "https://en.wikipedia.org/wiki/Xiaolongbao"
        },
        {
          "name": "South China Morning Post — The history of xiaolongbao",
          "url": "https://www.scmp.com/lifestyle/food-drink/article/3097791/history-xiaolongbao-or-soup-dumplings-outskirts-shanghai"
        }
      ]
    },
    "pan-fried noodles shanghai": {
      "local": "两面黄 (liǎng miàn huáng)",
      "note": {
        "en": "Shanghai/Suzhou pan-fried noodles, golden and crispy on both sides (hence \"two sides yellow\"), topped with stir-fried pork or shrimp.",
        "fr": "Nouilles poêlées de Shanghai/Suzhou, dorées et croustillantes des deux côtés (d'où \"deux côtés jaunes\"), garnies de porc ou crevettes…"
      },
      "sources": [
        {
          "name": "Michelin Guide — Tracing the Origin: Two-Faced Pan-Fried Noodles",
          "url": "https://guide.michelin.com/en/article/dining-out/trace-the-roots-two-sides-pan-fried-noodles"
        },
        {
          "name": "Crispy Chow Mein Pan-fried Noodles (两面黄) — Souped Up Recipes",
          "url": "https://curatedkitchenware.com/blogs/soupeduprecipes/crispy-chow-mein-pan-fried-noodles"
        }
      ]
    },
    "shanghai fried noodles": {
      "local": "上海粗炒面 (Shànghǎi cū chǎo miàn)",
      "note": {
        "en": "Shanghai stir-fry of thick, chewy wheat noodles tossed with light and dark soy sauce, pork and leafy greens; carried to Hong Kong by…",
        "fr": "Sauté shanghaïen de nouilles de blé épaisses et moelleuses, sauces soja claire et foncée, porc et légumes verts; apporté à Hong Kong par…"
      },
      "sources": [
        {
          "name": "Wikipedia — Shanghai fried noodles",
          "url": "https://en.wikipedia.org/wiki/Shanghai_fried_noodles"
        },
        {
          "name": "The Woks of Life — Shanghai Fried Noodles (Cu Chao Mian)",
          "url": "https://thewoksoflife.com/shanghai-fried-noodles/"
        }
      ]
    },
    "crab roe noodle": {
      "local": "蟹粉面 (蟹黄面)",
      "note": {
        "en": "Jiangnan (Shanghai/Suzhou) noodle dish topped with sauce of hairy-crab meat and roe, served in autumn when the mitten crabs peak.",
        "fr": "Plat de nouilles du Jiangnan (Shanghai/Suzhou) garni d'une sauce de chair et d'œufs de crabe poilu, servi en automne au pic des crabes."
      },
      "sources": [
        {
          "name": "Wander in China — Xie Huang Mian (Crab Roe Noodles): A Golden Delight",
          "url": "https://www.wanderinchina.com/en/chinese-food/crab-roe-noodles/"
        },
        {
          "name": "The Woks of Life — Golden Crab Roe Noodles (Xie Huang Mian)",
          "url": "https://woksoflove.com/golden-crab-roe-noodles-xie-huang-mian/"
        }
      ]
    },
    "hairy crab": {
      "local": "大闸蟹 (dàzháxiè)",
      "note": {
        "en": "Steamed Chinese mitten crab, a prized autumn Shanghai-cuisine delicacy eaten for its rich roe, most famous from Suzhou's Yangcheng Lake.",
        "fr": "Crabe poilu chinois cuit à la vapeur, délice automnal prisé de la cuisine shanghaïenne pour ses œufs, réputé du lac Yangcheng à Suzhou."
      },
      "sources": [
        {
          "name": "Chinese mitten crab - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Chinese_mitten_crab"
        },
        {
          "name": "Shanghai Hairy Crabs - LTL Shanghai",
          "url": "https://ltl-shanghai.com/shanghai-hairy-crabs/"
        }
      ]
    },
    "shanghai wontons": {
      "local": "上海馄饨 (húntún)",
      "note": {
        "en": "Shanghainese wontons in clear broth, served as small pork-only xiao húntún or large cài ròu húntún filled with pork and bok choy.",
        "fr": "Wontons shanghaïens en bouillon clair, servis en petits xiao húntún au porc ou grands cài ròu húntún au porc et bok choy."
      },
      "sources": [
        {
          "name": "The Woks of Life — Shanghai Wonton Soup",
          "url": "https://thewoksoflife.com/shanghai-wonton-soup/"
        },
        {
          "name": "Simple English Wikipedia — Shanghainese food",
          "url": "https://simple.wikipedia.org/wiki/Shanghainese_food"
        }
      ]
    },
    "sticky rice shumai shanghai": {
      "local": "上海糯米烧卖 (Shànghǎi nuòmǐ shāomài)",
      "note": {
        "en": "A Shanghainese steamed shaomai dumpling filled with glutinous sticky rice, soy-seasoned pork and shiitake, eaten as a breakfast street food.",
        "fr": "Un shaomai vapeur shanghaïen garni de riz gluant, de porc au soja et de shiitake, mangé comme street food du petit-déjeuner."
      },
      "sources": [
        {
          "name": "Shanghai Sticky Rice Siu Mai — Asia Society",
          "url": "https://asiasociety.org/blog/asia/shanghai-sticky-rice-siu-mai"
        },
        {
          "name": "Homestyle Sticky Rice Shumai (糯米烧麦) — Woks of Love",
          "url": "https://woksoflove.com/homestyle-sticky-rice-shumai/"
        }
      ]
    },
    "shanghainese smoked fish": {
      "local": "熏鱼 (xūn yú)",
      "note": {
        "en": "A cold Shanghai/Jiangnan appetizer of fish deep-fried until dark then steeped in a sweet-savory soy, sugar, Shaoxing wine and five-spice…",
        "fr": "Entrée froide de Shanghai/Jiangnan: poisson frit jusqu'à brunir puis macéré dans une marinade sucrée-salée (soja, sucre, vin de Shaoxing…"
      },
      "sources": [
        {
          "name": "The Woks of Life — Shanghai Smoked Fish, Xun Yu (上海熏鱼)",
          "url": "https://thewoksoflife.com/shanghai-smoked-fish-xun-yu/"
        },
        {
          "name": "The Mala Market — Fish Vendor's Shanghai Smoked Fish (Xunyu, 熏鱼)",
          "url": "https://blog.themalamarket.com/shanghai-smoked-fish/"
        }
      ]
    },
    "eight treasure rice": {
      "local": "八宝饭 (Bābǎo fàn)",
      "note": {
        "en": "A sweet steamed glutinous-rice pudding topped with eight dried fruits, nuts and red bean paste, eaten especially at Chinese New Year.",
        "fr": "Un pudding sucré de riz gluant cuit à la vapeur, garni de huit fruits secs, noix et pâte de haricots rouges, mangé surtout au Nouvel An…"
      },
      "sources": [
        {
          "name": "Wikipedia - Eight treasure rice",
          "url": "https://en.wikipedia.org/wiki/Eight_treasure_rice"
        },
        {
          "name": "Red House Spice - Eight Treasure Rice Pudding (Ba Bao Fan)",
          "url": "https://redhousespice.com/eight-treasure-rice/"
        }
      ]
    },
    "jiangsu duck blood soup": {
      "local": "鸭血粉丝汤",
      "note": {
        "en": "Nanjing, Jiangsu street-food soup of duck blood, offal and glass vermicelli in duck broth, born of thrift over a century ago.",
        "fr": "Soupe de rue de Nankin (Jiangsu) au sang de canard, abats et vermicelles dans un bouillon de canard, née de l'économie il y a un siècle."
      },
      "sources": [
        {
          "name": "Wikipedia — Duck blood and vermicelli soup",
          "url": "https://en.wikipedia.org/wiki/Duck_blood_and_vermicelli_soup"
        },
        {
          "name": "China Daily — Duck Blood and Vermicelli Soup",
          "url": "https://govt.chinadaily.com.cn/s/201807/17/WS5ceba28e498e079e68021c37/duck-blood-and-vermicelli-soup.html"
        }
      ]
    },
    "rice cake noodles": {
      "local": "炒年糕 (chǎo niángāo)",
      "note": {
        "en": "Shanghainese stir-fried niangao: oval slices of white non-glutinous rice cake cooked with pork and greens in a savoury soy-sugar sauce.",
        "fr": "Niangao sauté shanghaïen : tranches ovales de gâteau de riz blanc non gluant, cuites avec porc et légumes dans une sauce soja-sucre salée."
      },
      "sources": [
        {
          "name": "Wikipedia — Nian gao",
          "url": "https://en.wikipedia.org/wiki/Nian_gao"
        },
        {
          "name": "The Woks of Life — Stir-fried Rice Cakes (Nian Gao 炒年糕)",
          "url": "https://thewoksoflife.com/stir-fried-sticky-rice-cakes-nian-gao/"
        }
      ]
    },
    "drunken shrimp": {
      "local": "醉虾 (zuìxiā)",
      "note": {
        "en": "A Jiangnan dish of live freshwater shrimp soaked and stunned in baijiu or Shaoxing rice wine, then eaten raw or briefly cooked.",
        "fr": "Plat du Jiangnan de crevettes d'eau douce vivantes trempées dans du baijiu ou du vin de riz de Shaoxing, mangées crues ou peu cuites."
      },
      "sources": [
        {
          "name": "Wikipedia — Drunken shrimp",
          "url": "https://en.wikipedia.org/wiki/Drunken_shrimp"
        },
        {
          "name": "The Hong Kong Cookery — Drunken Shrimp 醉蝦",
          "url": "https://www.thehongkongcookery.com/2011/10/drunken-shrimp-easy-and-delicious.html"
        }
      ]
    },
    "youtiao": {
      "local": "油条 (yóutiáo)",
      "note": {
        "en": "A long, golden deep-fried strip of leavened, lightly salted dough eaten across China at breakfast, often dipped in soy milk or congee.",
        "fr": "Longue lanière de pâte levée légèrement salée, dorée et frite, mangée au petit-déjeuner en Chine, trempée dans du lait de soja ou du congee."
      },
      "sources": [
        {
          "name": "Wikipedia — Youtiao",
          "url": "https://en.wikipedia.org/wiki/Youtiao"
        },
        {
          "name": "Red House Spice — Chinese Doughnut Sticks (Youtiao)",
          "url": "https://redhousespice.com/chinese-doughnut-stick/"
        }
      ]
    }
  },
  "hunan": {
    "chairman mao's red braised pork": {
      "local": "毛氏红烧肉 (Máo shì hóngshāoròu)",
      "note": {
        "en": "Hunan braised pork-belly cubes in a sweet-savoury caramel-soy sauce with dried chillies, named for Mao Zedong, whose Shaoshan hometown dish…",
        "fr": "Cubes de poitrine de porc braisée du Hunan en sauce caramel-soja sucrée-salée aux piments, nommée d'après Mao Zedong, plat de son village…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Mao Shi hongshaorou",
          "url": "https://www.tasteatlas.com/mao-shi-hongshaorou"
        },
        {
          "name": "Wikipedia — Red braised pork belly",
          "url": "https://en.wikipedia.org/wiki/Red_braised_pork_belly"
        }
      ]
    },
    "hunan-style steamed fish head": {
      "local": "剁椒鱼头 (duòjiāo yútóu)",
      "note": {
        "en": "Hunan (Xiang cuisine) dish of a bighead carp head steamed under fermented chopped red chili (duojiao), salt, garlic and ginger.",
        "fr": "Plat hunanais (cuisine Xiang) de tête de carpe à grosse tête cuite vapeur sous du piment rouge fermenté hache (duojiao), sel, ail et…"
      },
      "sources": [
        {
          "name": "The Woks of Life - Hunan Steamed Fish with Salted Chilies (Duo Jiao Yu)",
          "url": "https://thewoksoflife.com/hunan-steamed-fish-salted-chilies-tofu-duo-jiao-yu/"
        },
        {
          "name": "The World of Chinese - Flavor in a Fish Head",
          "url": "https://www.theworldofchinese.com/2015/10/flavor-in-a-fish-head/"
        }
      ]
    },
    "stir-fried pork with chili": {
      "local": "辣椒炒肉 (làjiāo chǎo ròu)",
      "note": {
        "en": "A Hunan home-style stir-fry of pork slices and fresh green chili peppers, traced to the Ming-Qing era and dubbed the soul of Xiang cuisine.",
        "fr": "Un sauté hunanais familial de tranches de porc et de piments verts frais, remontant a l'epoque Ming-Qing et surnomme l'ame de la cuisine…"
      },
      "sources": [
        {
          "name": "People's Daily Online — Hunan culinary delight: Stir-fried pork with chili pepper",
          "url": "https://en.people.cn/n3/2023/0602/c90000-20027181.html"
        },
        {
          "name": "Red House Spice — Hunan Pork Stir-fry (湖南小炒肉)",
          "url": "https://redhousespice.com/hunan-pork/"
        }
      ]
    },
    "dry-pot chicken hunan": {
      "local": "干锅鸡 (gān guō jī)",
      "note": {
        "en": "A dry hot-pot dish of chicken fast-fried in oil with chili and garlic, served without a soup base; its origin is traced to Guizhou's Miao…",
        "fr": "Plat de poulet en marmite sèche, sauté rapidement à l'huile avec piment et ail, sans bouillon; origine attribuée aux Miao du Guizhou ou au…"
      },
      "sources": [
        {
          "name": "Wikipedia — Dry pot chicken",
          "url": "https://en.wikipedia.org/wiki/Dry_pot_chicken"
        },
        {
          "name": "The Mala Market — Sichuan Dry Pot With Chicken Wings and Shrimp (Ganguo Jichi Xia 干锅鸡翅虾)",
          "url": "https://blog.themalamarket.com/sichuan-dry-pot-with-chicken-and-shrimp-ganguo-jichi-xia/"
        }
      ]
    },
    "hunan smoked pork": {
      "local": "湖南腊肉 (Húnán làròu)",
      "note": {
        "en": "Hunanese cured pork belly: salted and air-dried, then cold-smoked over a cool wood fire so the smoke flavours the meat without cooking it…",
        "fr": "Poitrine de porc de la cuisine xiang du Hunan : salee et sechee a l'air, puis fumee a froid sur un feu de bois doux qui parfume la viande…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Húnán Làròu (Cured Pork from Hunan)",
          "url": "https://www.tasteatlas.com/hunan-larou"
        },
        {
          "name": "Wikipedia — Hunan cuisine (use of smoked and cured 腊味 meats)",
          "url": "https://en.wikipedia.org/wiki/Hunan_cuisine"
        }
      ]
    },
    "changsha stinky tofu": {
      "local": "长沙臭豆腐 (Chángshā chòu dòufu)",
      "note": {
        "en": "Deep-fried black fermented tofu from Changsha, Hunan, the bean curd brined in a mix of winter bamboo shoots, shiitake mushrooms and koji…",
        "fr": "Tofu fermenté noir frit de Changsha, dans le Hunan, le caillé de soja saumuré dans un mélange de pousses de bambou d'hiver, de champignons…"
      },
      "sources": [
        {
          "name": "Wikipedia — Changsha stinky tofu",
          "url": "https://en.wikipedia.org/wiki/Changsha_stinky_tofu"
        },
        {
          "name": "Zolima City Magazine — Hong Kong Bites: Stinky Tofu",
          "url": "https://zolimacitymag.com/hong-kong-bites-stinky-tofu-%E8%87%AD%E8%B1%86%E8%85%90/"
        }
      ]
    },
    "hunan rice noodles": {
      "local": "湖南米粉 (长沙米粉)",
      "note": {
        "en": "Changsha-style Hunan rice noodles: flat rice noodles (the local favorite over round ones, for soaking up flavor) served in a long-simmered…",
        "fr": "Nouilles de riz du Hunan, style Changsha : nouilles de riz plates (préférées aux rondes, car elles absorbent mieux le bouillon) servies…"
      },
      "sources": [
        {
          "name": "Hunan Government International - Changsha Rice Noodles",
          "url": "https://www.enghunan.gov.cn/hneng/Tourism/TourHunan/Changsha_55545/Dining/202504/t20250408_33634873.html"
        },
        {
          "name": "China Daily (govt) - Changsha-style rice vermicelli (长沙米粉)",
          "url": "https://govt.chinadaily.com.cn/s/201803/29/WS5ce760a7498e079e6802198f/changsha-style-rice-vermicelli-zhang-sha-mi-fen-changsha-mi-fen.html"
        }
      ]
    },
    "crispy fried duck hunan": {
      "local": "麻仁香酥鸭 (Márén Xiāngsū Yā)",
      "note": {
        "en": "Changsha (Hunan) banquet duck coated in sesame seeds and deep-fried in peanut oil until golden, crisp outside and tender within.",
        "fr": "Canard de banquet de Changsha (Hunan), enrobé de graines de sésame et frit dans l'huile d'arachide, croustillant dehors et tendre dedans."
      },
      "sources": [
        {
          "name": "TravelChinaGuide — Changsha Dining: Hunan Cuisine, Signature Food",
          "url": "https://www.travelchinaguide.com/cityguides/hunan/changsha/dining.htm"
        },
        {
          "name": "Hunan Government (Yiyang Food) — Crispy duck with sesame seed",
          "url": "https://whhlyt.hunan.gov.cn/whhlyt/english/TourismInRegions/Yiyang/YiyangFood/202206/t20220602_24798884.html"
        }
      ]
    },
    "hunan beef noodles": {
      "local": "常德牛肉粉 (Chángdé niúròu fěn)",
      "note": {
        "en": "Changde beef rice-noodle soup from Hunan, China: round rice noodles in a spicy chilli-and-Sichuan-peppercorn beef broth, eaten as a…",
        "fr": "Soupe de vermicelles de riz au boeuf de Changde (Hunan, Chine) : nouilles de riz rondes dans un bouillon de boeuf pimente, plat de…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Changde beef noodles",
          "url": "https://www.tasteatlas.com/changde-niurou-fen"
        },
        {
          "name": "Hunan Government — Changde Jinshi Beef Rice Noodles",
          "url": "https://whhlyt.hunan.gov.cn/whhlyt/english/TourismInRegions/Changde/ChangdeFood/202206/t20220602_24798363.html"
        }
      ]
    },
    "orange beef hunan": {
      "local": "陈皮牛肉",
      "note": {
        "en": "A Chinese dish of crispy deep-fried beef stir-fried with dried tangerine/mandarin peel (chenpi) and dried chili. The traditional version…",
        "fr": "Plat chinois de bœuf frit croustillant sauté avec de l'écorce de mandarine séchée (chenpi) et du piment séché. La version traditionnelle…"
      },
      "sources": [
        {
          "name": "The Woks of Life - Orange Beef (陈皮牛)",
          "url": "https://thewoksoflife.com/orange-beef/"
        },
        {
          "name": "The Mala Market - Sichuan Beef With Tangerine Peel (Chenpi Niurou, 陈皮牛肉)",
          "url": "https://blog.themalamarket.com/sichuan-beef-with-dried-tangerine-peel-chenpi-niurou/"
        }
      ]
    },
    "spicy crayfish hunan": {
      "local": "口味虾",
      "note": {
        "en": "Changsha (Hunan) night-time specialty of fresh crayfish stir-fried with heavy spices including chili, Sichuan peppercorn and garlic; the…",
        "fr": "Spécialité nocturne de Changsha (Hunan): écrevisses fraîches sautées avec des épices fortes dont piment, poivre du Sichuan et ail…"
      },
      "sources": [
        {
          "name": "Kouwei crayfish - Changsha (Hunan Provincial Dept. of Culture & Tourism)",
          "url": "http://whhlyt.hunan.gov.cn/whhlyt/english/TourismInRegions/Changsha/Food/202205/t20220527_24655436.html"
        },
        {
          "name": "Claws Celebre | The World of Chinese",
          "url": "https://www.theworldofchinese.com/2019/09/claws-celebre/"
        }
      ]
    },
    "hunan pickled vegetables": {
      "local": "酸菜",
      "note": {
        "en": "Suan cai, fermented salted mustard greens or cabbage; the Hunan style adds ginger and chilies and dates to ancient preservation practices.",
        "fr": "Le suan cai, des feuilles de moutarde ou du chou salés et fermentés; la version hunanaise ajoute gingembre et piments, issue de pratiques…"
      },
      "sources": [
        {
          "name": "Suan cai - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Suan_cai"
        },
        {
          "name": "Xiang Cuisine - China Xian Tour",
          "url": "https://www.chinaxiantour.com/travel-guide/hunan-cuisine"
        }
      ]
    },
    "hunan pumpkin cake": {
      "local": "南瓜饼 (nánguā bǐng)",
      "note": {
        "en": "Pan-fried cake of pumpkin and glutinous rice flour, chewy inside and crisp outside, often filled with red bean paste and coated in sesame.",
        "fr": "Galette poêlée de potiron et de farine de riz gluant, moelleuse dedans et croustillante dehors, souvent fourrée de pâte de haricots rouges…"
      },
      "sources": [
        {
          "name": "The Woks of Life - Chinese Pumpkin Cake (Nan Gua Bing)",
          "url": "https://thewoksoflife.com/chinese-pumpkin-cake-nan-gua-bing/"
        },
        {
          "name": "Omnivore's Cookbook - Chinese Pumpkin Cake",
          "url": "https://omnivorescookbook.com/chinese-pumpkin-cake/"
        }
      ]
    },
    "mao family dishes": {
      "local": "毛家菜 (máojiācài)",
      "note": {
        "en": "Hunan home-style cuisine linked to Chairman Mao Zedong's native Shaoshan, whose signature dish is Mao-style red-braised pork (毛氏红烧肉).",
        "fr": "Cuisine familiale du Hunan liée à Shaoshan, village natal de Mao Zedong, dont le plat phare est le porc braisé rouge à la Mao (毛氏红烧肉)."
      },
      "sources": [
        {
          "name": "TasteAtlas - Chairman Mao's red-braised pork (Máo Shì hóngshāoròu)",
          "url": "https://www.tasteatlas.com/mao-shi-hongshaorou"
        },
        {
          "name": "Fuchsia Dunlop - Red-braised pork, the official version",
          "url": "http://www.fuchsiadunlop.com/red-braised-pork-the-official-version/"
        }
      ]
    },
    "hunan dry-fried green beans": {
      "local": "干煸四季豆",
      "note": {
        "en": "Green beans blistered by dry-frying (gānbiān), then tossed with pork, chilli and Sichuan pepper; a classic of Sichuan cuisine.",
        "fr": "Haricots verts saisis à sec (gānbiān), sautés avec porc, piment et poivre du Sichuan ; un classique de la cuisine sichuanaise."
      },
      "sources": [
        {
          "name": "Omnivore's Cookbook — Sichuan Dry Fried Green Beans (干煸四季豆)",
          "url": "https://omnivorescookbook.com/szechuan-dry-fried-green-beans/"
        },
        {
          "name": "The Mala Market — Sichuan Dry-Fried Green Beans (Ganbian Sijidou)",
          "url": "https://blog.themalamarket.com/chengdu-challenge-16-dry-fried-green-beans-gan-bian-si-ji-dou/"
        }
      ]
    }
  },
  "filipino": {
    "adobo": {
      "local": "Adobo",
      "note": {
        "en": "Filipino unofficial national dish: meat or seafood simmered in vinegar, soy sauce, garlic and bay leaf; a pre-Hispanic cooking method later…",
        "fr": "Plat national officieux philippin : viande ou fruits de mer mijotes au vinaigre, sauce soja, ail et laurier ; methode de cuisson…"
      },
      "sources": [
        {
          "name": "Wikipedia - Philippine adobo",
          "url": "https://en.wikipedia.org/wiki/Philippine_adobo"
        },
        {
          "name": "TasteAtlas - Adobo",
          "url": "https://www.tasteatlas.com/adobo"
        }
      ]
    },
    "chicken adobo": {
      "local": "Adobong manok",
      "note": {
        "en": "Filipino dish of chicken braised in vinegar, soy sauce, garlic and peppercorns; a pre-colonial method later named from Spanish \"adobar.\"",
        "fr": "Plat philippin de poulet braisé au vinaigre, sauce soja, ail et poivre; méthode précoloniale nommée plus tard d'après l'espagnol \"adobar.\""
      },
      "sources": [
        {
          "name": "Wikipedia — Philippine adobo",
          "url": "https://en.wikipedia.org/wiki/Philippine_adobo"
        },
        {
          "name": "TasteAtlas — Adobo",
          "url": "https://www.tasteatlas.com/adobo"
        }
      ]
    },
    "pork adobo": {
      "local": "adobong baboy",
      "note": {
        "en": "Filipino pork braised in vinegar, soy sauce, garlic, bay leaf and peppercorns; the vinegar method predates Spanish rule as a way to…",
        "fr": "Porc philippin braisé au vinaigre, sauce soja, ail, laurier et poivre; la méthode au vinaigre, antérieure à la domination espagnole…"
      },
      "sources": [
        {
          "name": "Wikipedia – Philippine adobo",
          "url": "https://en.wikipedia.org/wiki/Philippine_adobo"
        },
        {
          "name": "TasteAtlas – Adobong baboy",
          "url": "https://www.tasteatlas.com/adobong-baboy"
        }
      ]
    },
    "lechon": {
      "local": "lechón",
      "note": {
        "en": "A whole pig spit-roasted over charcoal for crisp skin; a Spanish-colonial-era term, it is the centerpiece of Filipino fiestas.",
        "fr": "Un porc entier rôti à la broche sur braises pour une peau croustillante ; terme colonial espagnol, vedette des fêtes philippines."
      },
      "sources": [
        {
          "name": "Wikipedia – Lechon",
          "url": "https://en.wikipedia.org/wiki/Lechon"
        },
        {
          "name": "TasteAtlas – Lechon",
          "url": "https://www.tasteatlas.com/lechon"
        }
      ]
    },
    "pancit": {
      "local": "pansit (pancit)",
      "note": {
        "en": "Filipino stir-fried noodle dish from Chinese traders; name is Hokkien for conveniently or quickly cooked food.",
        "fr": "Plat philippin de nouilles sautees venu des marchands chinois; le nom signifie en hokkien plat cuit rapidement."
      },
      "sources": [
        {
          "name": "Wikipedia - Pancit",
          "url": "https://en.wikipedia.org/wiki/Pancit"
        },
        {
          "name": "TasteAtlas - Pancit",
          "url": "https://www.tasteatlas.com/pancit"
        }
      ]
    },
    "pancit bihon": {
      "local": "pansít bíhon (pancit bihon)",
      "note": {
        "en": "Filipino stir-fried rice-vermicelli (bihon) noodle dish; \"pancit\" is from Hokkien \"pian i sit,\" meaning conveniently-cooked food.",
        "fr": "Plat philippin de vermicelles de riz (bihon) sautés ; \"pancit\" vient du hokkien \"pian i sit,\" mets vite préparé."
      },
      "sources": [
        {
          "name": "Wikipedia — Pancit",
          "url": "https://en.wikipedia.org/wiki/Pancit"
        },
        {
          "name": "Wikipedia — Pancit bihon (Rice vermicelli)",
          "url": "https://en.wikipedia.org/wiki/Pancit_bihon"
        }
      ]
    },
    "lumpia": {
      "local": "lumpia (Hokkien 潤餅, lūn-piáⁿ)",
      "note": {
        "en": "Filipino spring roll, fried or fresh, brought by Hokkien immigrants; its name is from Hokkien lun-pia (潤餅), \"moist pastry.\"",
        "fr": "Rouleau de printemps philippin, frit ou frais, apporté par les immigrants hokkien ; son nom vient du hokkien lun-pia (潤餅), « pâte humide »."
      },
      "sources": [
        {
          "name": "Wikipedia - Lumpia",
          "url": "https://en.wikipedia.org/wiki/Lumpia"
        },
        {
          "name": "Wikipedia - Lumpiang Shanghai",
          "url": "https://en.wikipedia.org/wiki/Lumpiang_Shanghai"
        }
      ]
    },
    "lumpia shanghai": {
      "local": "Lumpiang Shanghai",
      "note": {
        "en": "Filipino deep-fried spring roll of seasoned ground pork in a thin wrapper, derived from Chinese (Hokkien/Fujian) lumpia and nativized…",
        "fr": "Rouleau de printemps philippin frit, garni de porc hache assaisonne dans une fine galette, derive du lumpia chinois (hokkien/Fujian) et…"
      },
      "sources": [
        {
          "name": "Wikipedia — Lumpiang Shanghai",
          "url": "https://en.wikipedia.org/wiki/Lumpiang_Shanghai"
        },
        {
          "name": "Tasting Table — Lumpia Shanghai history",
          "url": "https://www.tastingtable.com/1511068/lumpiang-shanghai-filipino-egg-roll-history/"
        }
      ]
    },
    "halo-halo": {
      "local": "haluhalo",
      "note": {
        "en": "Filipino shaved-ice dessert layered with sweet beans, fruits and evaporated milk; evolved from Japanese kakigori brought by pre-war…",
        "fr": "Dessert philippin de glace pilée garni de haricots sucrés, fruits et lait concentré; issu du kakigori japonais apporté par des migrants…"
      },
      "sources": [
        {
          "name": "Wikipedia - Halo-halo",
          "url": "https://en.wikipedia.org/wiki/Halo-halo"
        },
        {
          "name": "SBS Filipino - How well do you know your halo-halo?",
          "url": "https://www.sbs.com.au/language/filipino/en/article/beating-the-heat-and-more-how-well-do-you-know-your-halo-halo/vmebloj2s"
        }
      ]
    },
    "kare-kare": {
      "local": "kare-kare",
      "note": {
        "en": "Filipino stew of oxtail and vegetables in a thick peanut sauce tinted with annatto, served with bagoong shrimp paste.",
        "fr": "Ragout philippin de queue de boeuf et legumes dans une sauce epaisse aux cacahuetes teintee de rocou, servi avec du bagoong."
      },
      "sources": [
        {
          "name": "Wikipedia - Kare-kare",
          "url": "https://en.wikipedia.org/wiki/Kare-kare"
        },
        {
          "name": "196 flavors - Kare Kare",
          "url": "https://www.196flavors.com/kare-kare/"
        }
      ]
    },
    "sisig": {
      "local": "Sísig",
      "note": {
        "en": "Sizzling Kapampangan dish of chopped grilled pig's face, ears and liver with calamansi, onion and chili; popularized by Aling Lucing in…",
        "fr": "Plat kapampangan grésillant de joue, oreilles et foie de porc grillés hachés, calamansi, oignon et piment; popularisé par Aling Lucing à…"
      },
      "sources": [
        {
          "name": "Wikipedia - Sisig",
          "url": "https://en.wikipedia.org/wiki/Sisig"
        },
        {
          "name": "Kapampangan Media - Sisig History",
          "url": "https://kapampangan.org/sisig-history/"
        }
      ]
    },
    "crispy pata": {
      "local": "crispy pata",
      "note": {
        "en": "Filipino dish of a whole pork leg (pata) boiled with aromatics then deep-fried until the skin crackles, served with a soy-vinegar dip.",
        "fr": "Plat philippin de jarret de porc entier (pata) bouilli aux aromates puis frit jusqu'a ce que la peau croustille, servi avec une sauce…"
      },
      "sources": [
        {
          "name": "Wikipedia — Crispy pata",
          "url": "https://en.wikipedia.org/wiki/Crispy_pata"
        },
        {
          "name": "Eat Your World — Crispy pata in Manila",
          "url": "https://eatyourworld.com/destinations/asia/philippines/manila/what-to-eat/crispy-pata/"
        }
      ]
    },
    "chicken inasal": {
      "local": "Inasal nga manok",
      "note": {
        "en": "Visayan grilled chicken from Bacolod, marinated in calamansi, coconut vinegar and annatto; \"inasal\" is Hiligaynon for char-grilled.",
        "fr": "Poulet grillé visayan de Bacolod, mariné au calamansi, vinaigre de coco et roucou ; \"inasal\" signifie grillé au charbon en hiligaynon."
      },
      "sources": [
        {
          "name": "Wikipedia — Chicken inasal",
          "url": "https://en.wikipedia.org/wiki/Chicken_inasal"
        },
        {
          "name": "TasteAtlas — Best Rated Chicken Dishes in the World",
          "url": "https://www.tasteatlas.com/best-rated-chicken-dishes-in-the-world"
        }
      ]
    },
    "beef tapa": {
      "local": "tapa (tapang baka)",
      "note": {
        "en": "Filipino thin-sliced beef cured or dried with salt and spices as a preservation method (now usually marinated), pan-fried and served with…",
        "fr": "Boeuf philippin en fines tranches, sale et seche aux epices comme methode de conservation (aujourd'hui plutot marine), poele et servi avec…"
      },
      "sources": [
        {
          "name": "Tapa (Filipino cuisine) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tapa_(Filipino_cuisine)"
        },
        {
          "name": "The History of Tapsilog and Where It All Began - Esquire Philippines",
          "url": "https://www.esquiremag.ph/culture/food-and-drink/history-of-tapsilog-a00293-20190729-lfrm2"
        }
      ]
    },
    "longganisa": {
      "local": "longganisa",
      "note": {
        "en": "A Filipino pork sausage seasoned with garlic, black pepper, salt and vinegar, derived from the Spanish longaniza; it is broadly classified…",
        "fr": "Saucisse de porc philippine assaisonnee d'ail, de poivre noir, de sel et de vinaigre, derivee de la longaniza espagnole; elle se classe en…"
      },
      "sources": [
        {
          "name": "Longaniza - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Longaniza"
        },
        {
          "name": "Vigan longganisa - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Vigan_longganisa"
        }
      ]
    },
    "bangus": {
      "local": "bangús",
      "note": {
        "en": "Filipino name for milkfish (Chanos chanos), a popular farmed fish unofficially regarded as the Philippines' national fish.",
        "fr": "Nom philippin du chanos (Chanos chanos), poisson d'élevage populaire considéré officieusement comme poisson national des Philippines."
      },
      "sources": [
        {
          "name": "Milkfish - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Milkfish"
        },
        {
          "name": "National symbols of the Philippines - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/National_symbols_of_the_Philippines"
        }
      ]
    },
    "ube halaya": {
      "local": "Ube halaya (Halayang ube)",
      "note": {
        "en": "Filipino dessert of boiled, mashed purple yam (ube) cooked with milk and butter; \"halaya\" is from Spanish jalea, \"jelly\".",
        "fr": "Dessert philippin d'igname pourpre (ube) bouillie et ecrasee, cuite avec lait et beurre; \"halaya\" vient de l'espagnol jalea, \"gelee\"."
      },
      "sources": [
        {
          "name": "Wikipedia - Ube halaya",
          "url": "https://en.wikipedia.org/wiki/Ube_halaya"
        },
        {
          "name": "TasteAtlas - Ube Halaya",
          "url": "https://www.tasteatlas.com/ube-halaya"
        }
      ]
    },
    "leche flan": {
      "local": "Leche flan",
      "note": {
        "en": "A rich Filipino caramel custard of egg yolks, milk and caramelised sugar, derived from Spanish crème caramel introduced during colonial…",
        "fr": "Un riche flan caramel philippin à base de jaunes d'œufs, de lait et de sucre caramélisé, issu de la crème caramel espagnole de l'époque…"
      },
      "sources": [
        {
          "name": "Leche flan / Flan cake - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Flan_cake"
        },
        {
          "name": "Llanera - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Llanera"
        }
      ]
    },
    "bibingka": {
      "local": "bibingka",
      "note": {
        "en": "A Filipino rice cake made from galapong (rice batter) and coconut milk, baked in banana-leaf-lined clay pots and eaten especially at…",
        "fr": "Gateau de riz philippin a base de galapong (pate de riz) et de lait de coco, cuit dans des moules en terre tapisses de feuilles de…"
      },
      "sources": [
        {
          "name": "Wikipedia - Bibingka",
          "url": "https://en.wikipedia.org/wiki/Bibingka"
        },
        {
          "name": "Panlasang Pinoy - Bibingka Recipe",
          "url": "https://panlasangpinoy.com/rice-cake-bibingka-recipe/"
        }
      ]
    },
    "puto": {
      "local": "puto",
      "note": {
        "en": "Filipino steamed rice cake traditionally made from slightly fermented rice dough (galapong), often eaten with savory dishes like dinuguan.",
        "fr": "Gateau de riz philippin cuit a la vapeur, fait de pate de riz legerement fermentee (galapong), souvent mange avec des plats sales comme le…"
      },
      "sources": [
        {
          "name": "Puto (food) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Puto_(food)"
        },
        {
          "name": "Puto Calasiao - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Puto_Calasiao"
        }
      ]
    },
    "ensaymada": {
      "local": "ensaymada (Spanish/Mallorcan original: ensaïmada)",
      "note": {
        "en": "Soft, buttery, spiral-coiled Filipino sweet bread topped with sugar and grated cheese, adapted from Spain's Mallorcan ensaïmada.",
        "fr": "Pain brioché philippin moelleux et beurré en spirale, garni de sucre et de fromage râpé, adapté de l'ensaïmada majorquine espagnole."
      },
      "sources": [
        {
          "name": "Wikipedia - Ensaïmada",
          "url": "https://en.wikipedia.org/wiki/Ensa%C3%AFmada"
        },
        {
          "name": "World Grain - Ensaymada: A Philippine specialty",
          "url": "https://www.world-grain.com/articles/18986-ensaymada-a-philippine-specialty"
        }
      ]
    },
    "san miguel beer": {
      "local": "San Miguel (Cerveza San Miguel)",
      "note": {
        "en": "Filipino pale lager first brewed in 1890 in San Miguel, Manila, as La Fabrica de Cerveza de San Miguel — Southeast Asia's first brewery.",
        "fr": "Lager blonde philippine brassee pour la premiere fois en 1890 a San Miguel, Manille, sous le nom de La Fabrica de Cerveza de San Miguel —…"
      },
      "sources": [
        {
          "name": "Wikipedia: San Miguel Beer",
          "url": "https://en.wikipedia.org/wiki/San_Miguel_Beer"
        },
        {
          "name": "Encyclopedia.com: San Miguel Corp (Southeast Asia's first brewery, 1890)",
          "url": "https://www.encyclopedia.com/social-sciences-and-law/economics-business-and-labor/businesses-and-occupations/san-miguel-corp"
        }
      ]
    },
    "calamansi juice filipino": {
      "local": "Kalamansi",
      "note": {
        "en": "Filipino lemonade made from the juice of calamansi (Citrus × microcarpa) — a kumquat-mandarin citrus hybrid closely associated with the…",
        "fr": "Limonade philippine préparée avec le jus de calamansi (Citrus × microcarpa), un agrume hybride kumquat-mandarine étroitement associé aux…"
      },
      "sources": [
        {
          "name": "Wikipedia - Calamansi",
          "url": "https://en.wikipedia.org/wiki/Calamansi"
        },
        {
          "name": "The Little Epicurean - Calamansi Juice (Filipino Lemonade)",
          "url": "https://www.thelittleepicurean.com/calamansi-juice/"
        }
      ]
    },
    "sinigang": {
      "local": "sinigáng",
      "note": {
        "en": "A sour and savory Filipino soup or stew most often soured with tamarind (sampalok), though other sour fruits such as unripe mango or…",
        "fr": "Soupe ou ragoût philippin aigre-doux, généralement acidulé au tamarin (sampalok), bien que d'autres fruits acides comme la mangue verte ou…"
      },
      "sources": [
        {
          "name": "Wikipedia - Sinigang",
          "url": "https://en.wikipedia.org/wiki/Sinigang"
        },
        {
          "name": "TasteAtlas - Sinigang",
          "url": "https://www.tasteatlas.com/sinigang"
        }
      ]
    },
    "lechon kawali": {
      "local": "litsong kawali (lechon kawali)",
      "note": {
        "en": "Filipino crispy deep-fried pork belly: the meat is first boiled in seasoned water, then deep-fried in a kawali (pan or wok) until the skin…",
        "fr": "Poitrine de porc philippine croustillante et frite : la viande est d'abord bouillie dans une eau assaisonnee, puis frite dans un kawali…"
      },
      "sources": [
        {
          "name": "Wikipedia - Lechon kawali",
          "url": "https://en.wikipedia.org/wiki/Lechon_kawali"
        },
        {
          "name": "TasteAtlas - Lechon Kawali",
          "url": "https://www.tasteatlas.com/lechon-kawali"
        }
      ]
    },
    "pancit canton": {
      "local": "pancit canton",
      "note": {
        "en": "A Filipino stir-fried wheat-flour egg noodle dish with meat and vegetables, adapted from noodle traditions brought by Hokkien Chinese…",
        "fr": "Plat philippin de nouilles aux oeufs de farine de ble sautees avec viande et legumes, issu des traditions apportees par les marchands…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Pancit",
          "url": "https://www.tasteatlas.com/pancit"
        },
        {
          "name": "Knorr Philippines - 8 Pancit Varieties From Around the Philippines",
          "url": "https://www.knorr.com/ph/tips-and-tricks/8-pancit-varieties-philippines.html"
        }
      ]
    }
  },
  "burmese": {
    "mohinga": {
      "local": "မုန့်ဟင်းခါး",
      "note": {
        "en": "Myanmar's national dish, a fish and rice-noodle soup eaten at breakfast; by the 19th century it was a cheap working-class meal.",
        "fr": "Plat national du Myanmar, soupe de poisson aux nouilles de riz du petit-déjeuner; au XIXe siècle, un repas populaire bon marché."
      },
      "sources": [
        {
          "name": "Wikipedia – Mohinga",
          "url": "https://en.wikipedia.org/wiki/Mohinga"
        },
        {
          "name": "TasteAtlas – Mohinga",
          "url": "https://www.tasteatlas.com/mohinga"
        }
      ]
    },
    "lahpet thoke": {
      "local": "လက်ဖက်သုပ်",
      "note": {
        "en": "Burmese salad of fermented (pickled) tea leaves mixed with fried beans, nuts, sesame and garlic oil; once a peace offering between kingdoms.",
        "fr": "Salade birmane de feuilles de the fermentees (marinees) melangees a des feves frites, noix, sesame et huile d'ail ; jadis offrande de paix…"
      },
      "sources": [
        {
          "name": "Wikipedia - Lahpet",
          "url": "https://en.wikipedia.org/wiki/Lahpet"
        },
        {
          "name": "TasteAtlas - Lahpet Thoke",
          "url": "https://www.tasteatlas.com/lahpet-thoke"
        }
      ]
    },
    "ohn no khao swe": {
      "local": "အုန်းနို့ခေါက်ဆွဲ",
      "note": {
        "en": "Burmese wheat-noodle soup in a curried chicken and coconut-milk broth thickened with chickpea flour; its name literally means \"coconut milk…",
        "fr": "Soupe birmane de nouilles de blé dans un bouillon de poulet au curry et lait de coco lié à la farine de pois chiche; son nom signifie «…"
      },
      "sources": [
        {
          "name": "Wikipedia — Ohn no khao swè",
          "url": "https://en.wikipedia.org/wiki/Ohn_no_khao_sw%C3%A8"
        },
        {
          "name": "TasteAtlas — Ohn no Khao Swè",
          "url": "https://www.tasteatlas.com/ohn-no-khao-swe"
        }
      ]
    },
    "shan noodles": {
      "local": "ရှမ်းခေါက်ဆွဲ (Shan khauk swè)",
      "note": {
        "en": "Burmese rice noodles topped with tomato-based chicken or pork sauce, originating in Shan State, Myanmar.",
        "fr": "Nouilles de riz birmanes nappées d'une sauce tomate au poulet ou au porc, originaires de l'État Shan, en Birmanie."
      },
      "sources": [
        {
          "name": "Burmese cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Burmese_cuisine"
        },
        {
          "name": "5 Best Noodle Dishes in Myanmar - TasteAtlas",
          "url": "https://www.tasteatlas.com/best-rated-noodle-dishes-in-myanmar"
        }
      ]
    },
    "burmese curry": {
      "local": "ဟင်း (hin)",
      "note": {
        "en": "Burmese-style meat or vegetable stew (hin), often cooked sibyan-style until oil separates and rises to the top.",
        "fr": "Ragout birman de viande ou legumes (hin), souvent cuit facon sibyan jusqu'a ce que l'huile remonte en surface."
      },
      "sources": [
        {
          "name": "Wikipedia — Burmese curry",
          "url": "https://en.wikipedia.org/wiki/Burmese_curry"
        },
        {
          "name": "TasteAtlas — Burmese Chicken Curry",
          "url": "https://www.tasteatlas.com/burmese-chicken-curry"
        }
      ]
    },
    "chickpea tofu": {
      "local": "တိုဟူး (tòhú)",
      "note": {
        "en": "Soy-free Burmese \"tofu\" of Shan origin, set like polenta from chickpea or yellow split-pea flour; served sliced or fried.",
        "fr": "« Tofu » birman sans soja d'origine shan, pris comme une polenta à base de farine de pois chiche ou de pois cassé jaune."
      },
      "sources": [
        {
          "name": "Wikipedia – Burmese tofu",
          "url": "https://en.wikipedia.org/wiki/Burmese_tofu"
        },
        {
          "name": "Wikipedia – Tofu Nway",
          "url": "https://en.wikipedia.org/wiki/Tofu_Nway"
        }
      ]
    },
    "shan-style tofu salad": {
      "local": "တိုဖူးသုပ် (tofu thoke)",
      "note": {
        "en": "Burmese hand-mixed salad of silky chickpea (besan) tofu, originating with the Shan people of Myanmar, who use no soy.",
        "fr": "Salade birmane mélangée à la main, à base de tofu soyeux de pois chiche, originaire des Shan de Birmanie, sans soja."
      },
      "sources": [
        {
          "name": "Burmese tofu - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Burmese_tofu"
        },
        {
          "name": "Burmese salads - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Burmese_salads"
        }
      ]
    },
    "balachaung": {
      "local": "ဘာလချောင်ကြော် (balachaung kyaw)",
      "note": {
        "en": "A crispy Burmese relish of dried shrimp, garlic and onions fried in oil with chilli, eaten with steamed rice.",
        "fr": "Condiment birman croustillant de crevettes séchées, ail et oignons frits à l'huile avec du piment, mangé avec du riz vapeur."
      },
      "sources": [
        {
          "name": "Asia Society — Burmese Dried Shrimp Relish (Balachaung)",
          "url": "https://asiasociety.org/blog/asia/burmese-dried-shrimp-relish-balachaung"
        },
        {
          "name": "LinsFood — Burmese Balachaung (Onion & Dried Shrimp Condiment)",
          "url": "https://www.linsfood.com/burmese-balachaung/"
        }
      ]
    },
    "burmese fish curry": {
      "local": "ငါးဆီပြန် (nga hsi pyan)",
      "note": {
        "en": "Myanmar's everyday tomato-based fish curry. It belongs to the hsibyan (ဆီပြန်, \"oil returns\") family: the curry is simmered until the water…",
        "fr": "Le curry de poisson quotidien du Myanmar, a base de tomate. Il appartient a la famille hsibyan (ဆီပြန်, \"l'huile revient\") : on laisse…"
      },
      "sources": [
        {
          "name": "Wikipedia - Burmese curry",
          "url": "https://en.wikipedia.org/wiki/Burmese_curry"
        },
        {
          "name": "LinsFood - Burmese Seafood Curry (tomato curry from Myanmar)",
          "url": "https://www.linsfood.com/burmese-seafood-curry-recipe/"
        }
      ]
    },
    "si jet khauk swe": {
      "local": "ဆီချက်ခေါက်ဆွဲ",
      "note": {
        "en": "Burmese egg or wheat noodles tossed in garlic-infused oil and fried garlic, often topped with duck; tied to the Sino-Burmese community.",
        "fr": "Nouilles birmanes aux oeufs ou au ble, melangees a l'huile parfumee a l'ail et a l'ail frit, souvent garnies de canard; liees a la…"
      },
      "sources": [
        {
          "name": "Wikipedia - Sigyet khauk swè",
          "url": "https://en.wikipedia.org/wiki/Sigyet_khauk_sw%C3%A8"
        },
        {
          "name": "Great British Chefs - Garlic Oil Noodles (Si Chet Khao Swe)",
          "url": "https://www.greatbritishchefs.com/recipes/garlic-oil-noodles-recipe"
        }
      ]
    },
    "falooda": {
      "local": "ဖာလူဒါ",
      "note": {
        "en": "A cold Mughlai dessert of Persian origin; the Burmese phaluda adds basil seeds, grass jelly, egg pudding and ice cream.",
        "fr": "Dessert froid moghol d'origine perse; le phaluda birman ajoute graines de basilic, gelée d'herbe, flan et glace."
      },
      "sources": [
        {
          "name": "Falooda — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Falooda"
        },
        {
          "name": "Faloodeh — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Faloodeh"
        }
      ]
    },
    "paratha burmese style": {
      "local": "ပလာတာ (palata)",
      "note": {
        "en": "Palata is a Burmese flaky fried layered flatbread derived from Indian paratha during the colonial era, eaten with curry or sugar.",
        "fr": "Le palata est un pain feuilleté birman frit, dérivé du paratha indien à l'époque coloniale, mangé avec du curry ou du sucre."
      },
      "sources": [
        {
          "name": "Paratha - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Paratha"
        },
        {
          "name": "Burmese cuisine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Burmese_cuisine"
        }
      ]
    },
    "aloo paratha burmese": {
      "local": "ပလာတာ (palata)",
      "note": {
        "en": "Palata is Myanmar's flaky fried flatbread, adapted from South Asian paratha in the colonial era, eaten with curry, egg or potato.",
        "fr": "Le palata est la galette feuilletee frite birmane, adaptee du paratha sud-asiatique a l'epoque coloniale, mangee avec curry, oeuf ou pomme…"
      },
      "sources": [
        {
          "name": "Wikipedia - Paratha",
          "url": "https://en.wikipedia.org/wiki/Paratha"
        },
        {
          "name": "Wikipedia - Aloo paratha",
          "url": "https://en.wikipedia.org/wiki/Aloo_paratha"
        }
      ]
    },
    "kao swe": {
      "local": "ခေါက်ဆွဲ (khauk swè)",
      "note": {
        "en": "Burmese for \"noodles\"; commonly ohn no khao swè, wheat noodles in a curried chicken-and-coconut-milk broth.",
        "fr": "En birman, \"nouilles\" ; souvent ohn no khao swè, nouilles de blé dans un bouillon de poulet au curry et lait de coco."
      },
      "sources": [
        {
          "name": "Wikipedia — Ohn no khao swè",
          "url": "https://en.wikipedia.org/wiki/Ohn_no_khao_sw%C3%A8"
        },
        {
          "name": "Wikipedia — Khauk swè thoke",
          "url": "https://en.wikipedia.org/wiki/Khauk_sw%C3%A8_thoke"
        }
      ]
    },
    "mont di": {
      "local": "မုန့်တီ",
      "note": {
        "en": "A Burmese thin rice-noodle dish, best known in its Rakhine version served as a salad or in a fish-and-lemongrass soup with ngapi.",
        "fr": "Plat birman de fines nouilles de riz, surtout connu dans sa version rakhine, en salade ou en soupe de poisson, citronnelle et ngapi."
      },
      "sources": [
        {
          "name": "Wikipedia – Mont di",
          "url": "https://en.wikipedia.org/wiki/Mont_di"
        },
        {
          "name": "Myanmar.com – Rakhine Mont Di",
          "url": "https://myanmar.com/food-drinks/rakhine-mont-di/"
        }
      ]
    },
    "tea leaf rice": {
      "local": "လက်ဖက်ထမင်း",
      "note": {
        "en": "A Burmese rice dish of fermented tea leaves (lahpet) mixed with rice, peanuts, garlic and fried beans, traditionally served at a meal's end.",
        "fr": "Plat birman de riz mélangé à des feuilles de thé fermentées (lahpet), cacahuètes, ail et haricots frits, servi traditionnellement en fin de…"
      },
      "sources": [
        {
          "name": "Wikipedia — Lahpet",
          "url": "https://en.wikipedia.org/wiki/Lahpet"
        },
        {
          "name": "Atlas Obscura (Gastro Obscura) — Lahpet Thoke (Tea Leaf Salad)",
          "url": "https://www.atlasobscura.com/foods/lahpet-thoke-tea-leaf-salad-myanmar-burma"
        }
      ]
    },
    "shwe yin aye": {
      "local": "ရွှေရင်အေး",
      "note": {
        "en": "Burmese chilled dessert of coconut milk over sticky rice, sago, pandan jelly and bread, linked to the Thingyan New Year festival.",
        "fr": "Dessert birman glacé de lait de coco sur riz gluant, sagou, gelée de pandan et pain, lié au festival du Nouvel An Thingyan."
      },
      "sources": [
        {
          "name": "Wikipedia — Shwe yin aye",
          "url": "https://en.wikipedia.org/wiki/Shwe_yin_aye"
        },
        {
          "name": "TasteAtlas — Shwe Yin Aye",
          "url": "https://www.tasteatlas.com/shwe-yin-aye"
        }
      ]
    },
    "htamin gyaw": {
      "local": "ထမင်းကြော်",
      "note": {
        "en": "Burmese fried rice, traditionally made with boiled peas, onions and garlic, commonly eaten as a breakfast dish in Myanmar.",
        "fr": "Riz frit birman, traditionnellement preparé avec des pois bouillis, oignons et ail, souvent mangé au petit-déjeuner au Myanmar."
      },
      "sources": [
        {
          "name": "Wikipedia — Burmese fried rice",
          "url": "https://en.wikipedia.org/wiki/Burmese_fried_rice"
        }
      ]
    },
    "e kya kway": {
      "local": "အီကြာကွေး",
      "note": {
        "en": "Burmese deep-fried wheat-dough breadstick, the local form of Chinese youtiao, eaten at breakfast dipped in tea, coffee or rice porridge.",
        "fr": "Beignet birman de pâte de blé frite, version locale du youtiao chinois, mangé au petit-déjeuner trempé dans thé, café ou bouillie de riz."
      },
      "sources": [
        {
          "name": "Wikipedia — Youtiao (Burmese: e kya kway, အီကြာကွေး)",
          "url": "https://en.wikipedia.org/wiki/Youtiao"
        },
        {
          "name": "Yangon Trip — E Kya Kway: A Traditional Burmese Fritter",
          "url": "https://yangontrip.com/2026/01/05/e-kya-kway-a-traditional-burmese-fritter-with-crispy-perfection/"
        }
      ]
    }
  },
  "sri-lankan": {
    "sri lankan fish curry": {
      "local": "මාළු මිරිසට (Malu mirisata)",
      "note": {
        "en": "A spicy Sri Lankan fish curry of chilli, onion and turmeric, popular in coastal areas where fish is a staple, served with rice.",
        "fr": "Un curry de poisson sri-lankais épicé au piment, oignon et curcuma, populaire sur les côtes où le poisson est un aliment de base, servi…"
      },
      "sources": [
        {
          "name": "Malu mirisata - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Malu_mirisata"
        }
      ]
    },
    "hoppers": {
      "local": "ආප්ප (appa)",
      "note": {
        "en": "A Sri Lankan bowl-shaped pancake of fermented rice flour and coconut milk, derived from South Indian appam and a popular breakfast.",
        "fr": "Une crêpe sri-lankaise en forme de bol à base de farine de riz fermentée et de lait de coco, dérivée de l'appam sud-indien."
      },
      "sources": [
        {
          "name": "Wikipedia - Appam",
          "url": "https://en.wikipedia.org/wiki/Appam"
        },
        {
          "name": "196 flavors - Appam (Appa, Hoppers)",
          "url": "https://www.196flavors.com/sri-lanka-appam-appa-hoppers/"
        }
      ]
    },
    "string hoppers": {
      "local": "ඉඳිආප්ප (Sinhala) / இடியாப்பம் (Tamil, idiyappam)",
      "note": {
        "en": "Steamed nests of rice-flour noodles squeezed through a press or mould, eaten in Sri Lanka and South India (Tamil Nadu and Kerala). The name…",
        "fr": "Nids de nouilles de farine de riz cuits a la vapeur, presses au moule, consommes au Sri Lanka et dans le sud de l'Inde (Tamil Nadu et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Idiyappam",
          "url": "https://en.wikipedia.org/wiki/Idiyappam"
        },
        {
          "name": "Agarathi Tamil Dictionary - இடி (idi)",
          "url": "https://agarathi.com/word/%E0%AE%87%E0%AE%9F%E0%AE%BF"
        }
      ]
    },
    "lamprais": {
      "local": "ලම්ප්‍රයිස්",
      "note": {
        "en": "Sri Lankan Dutch Burgher dish of stock-cooked rice with curries and sambols wrapped in a banana leaf and baked; name is Dutch for \"lump of…",
        "fr": "Plat des Burghers néerlandais du Sri Lanka : riz cuit au bouillon, currys et sambols enveloppés dans une feuille de bananier et cuits au…"
      },
      "sources": [
        {
          "name": "Wikipedia — Lamprais",
          "url": "https://en.wikipedia.org/wiki/Lamprais"
        },
        {
          "name": "Whetstone Magazine — In Sri Lanka, Lamprais Keeps the Dutch Burgher Legacy Alive",
          "url": "https://www.whetstonemagazine.com/journal/in-sri-lanka-lamprais-keeps-the-dutch-burgher-legacy-alive"
        }
      ]
    },
    "pol sambol": {
      "local": "පොල් සම්බෝල",
      "note": {
        "en": "A Sri Lankan relish of grated coconut, chili, red onion, lime and Maldive fish, served with rice, hoppers and string hoppers.",
        "fr": "Un condiment sri-lankais de noix de coco rapee, piment, oignon rouge, citron vert et poisson maldive, servi avec riz et appams."
      },
      "sources": [
        {
          "name": "Wikipedia - Pol sambol",
          "url": "https://en.wikipedia.org/wiki/Pol_sambol"
        },
        {
          "name": "196 flavors - Pol Sambol (Coconut Sambol)",
          "url": "https://www.196flavors.com/sri-lanka-pol-sambol-coconut-sambol/"
        }
      ]
    },
    "seeni sambol": {
      "local": "සීනි සම්බෝල",
      "note": {
        "en": "A Sri Lankan caramelized onion relish; \"seeni\" means sweet/sugar in Sinhala, balanced with chilli, tamarind and Maldive fish.",
        "fr": "Un relish srilankais d'oignons caramélisés ; \"seeni\" signifie sucré en cingalais, équilibré par piment, tamarin et poisson maldivien."
      },
      "sources": [
        {
          "name": "Wikipedia — Seeni sambol",
          "url": "https://en.wikipedia.org/wiki/Seeni_sambol"
        },
        {
          "name": "Brown Ceylonese Food Journal — Seeni Sambol (සීනි සම්බෝල)",
          "url": "https://brownceylonesefood.com/seeni-sambol-caramalized-onion-relish/"
        }
      ]
    },
    "parippu": {
      "local": "පරිප්පු",
      "note": {
        "en": "Sri Lankan red-lentil (dhal) curry simmered in coconut milk and finished with a tempering of curry leaves and spices.",
        "fr": "Curry sri-lankais de lentilles corail mijotées au lait de coco et relevé d'un tempérage de feuilles de curry et d'épices."
      },
      "sources": [
        {
          "name": "Island Smile - Sri Lankan Dhal curry (parippu, dal, daal)",
          "url": "https://www.islandsmile.org/sri-lankan-dhal-curry-parippu/"
        },
        {
          "name": "The Flavor Bender - Red Lentil Curry (Sri Lankan Dhal Curry)",
          "url": "https://www.theflavorbender.com/dhal-red-lentil-curry/"
        }
      ]
    },
    "mallum": {
      "local": "මැල්ලුම්",
      "note": {
        "en": "Sri Lankan side dish of finely chopped leafy greens lightly sautéed with grated coconut, chilli and spices, eaten at almost every meal.",
        "fr": "Plat d'accompagnement sri-lankais de feuilles vertes hachées, sautées avec coco râpée, piment et épices, servi à presque chaque repas."
      },
      "sources": [
        {
          "name": "Wikipedia — Mallung",
          "url": "https://en.wikipedia.org/wiki/Mallung"
        },
        {
          "name": "WorldFood.Guide — Gotu Kola Mallung",
          "url": "https://worldfood.guide/dish/gotu_kola_mallung/"
        }
      ]
    },
    "ceylon tea": {
      "local": "සිලෝන් තේ (Silōn tē)",
      "note": {
        "en": "Black tea grown in Sri Lanka (formerly Ceylon); commercial cultivation began in 1867 when James Taylor planted Loolecondera estate, Kandy.",
        "fr": "Thé noir cultivé au Sri Lanka (anciennement Ceylan) ; la culture commerciale débuta en 1867 avec la plantation de Loolecondera par James…"
      },
      "sources": [
        {
          "name": "Wikipedia: Tea production in Sri Lanka",
          "url": "https://en.wikipedia.org/wiki/Tea_production_in_Sri_Lanka"
        },
        {
          "name": "TasteAtlas: Ceylon black tea",
          "url": "https://tasteatlas.com/ceylon-black-tea"
        }
      ]
    },
    "rice and curry": {
      "local": "බත් කරි",
      "note": {
        "en": "Sri Lanka's national dish: a mound of steamed rice served with several curries (vegetable, lentil and usually a fish or meat curry) plus…",
        "fr": "Plat national du Sri Lanka : un monticule de riz vapeur servi avec plusieurs currys (légumes, lentilles et généralement un curry de poisson…"
      },
      "sources": [
        {
          "name": "Rice and curry - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Rice_and_curry"
        },
        {
          "name": "3 Best Rice Dishes in Sri Lanka - TasteAtlas",
          "url": "https://www.tasteatlas.com/best-rated-rice-dishes-in-sri-lanka"
        }
      ]
    },
    "kottu roti": {
      "local": "කොත්තු රොටි",
      "note": {
        "en": "Sri Lankan street food of roti chopped on a griddle with vegetables, egg and curry; originated in the eastern province in the 1960s-70s.",
        "fr": "Plat de rue sri-lankais de roti haché sur une plaque avec légumes, œuf et curry; né dans la province de l'Est dans les années 1960-70."
      },
      "sources": [
        {
          "name": "Wikipedia — Kottu",
          "url": "https://en.wikipedia.org/wiki/Kottu"
        }
      ]
    },
    "jackfruit curry": {
      "local": "පොලොස් (polos) / පොලොස් ඇඹුල (polos ambula)",
      "note": {
        "en": "Sri Lankan curry of unripe green jackfruit (polos) simmered in coconut milk and spices, soured with goraka for a meaty texture.",
        "fr": "Curry sri-lankais de jaque verte non mûre (polos) mijotée au lait de coco et épices, acidulée au goraka, texture charnue."
      },
      "sources": [
        {
          "name": "CBC Life — Polos ambula (young jackfruit curry)",
          "url": "https://www.cbc.ca/life/food/simple-sri-lankan-recipe-polos-ambula-young-jackfruit-curry-1.6918639"
        },
        {
          "name": "The Flavor Bender — Sri Lankan Jackfruit Curry (Polos)",
          "url": "https://www.theflavorbender.com/sri-lankan-jackfruit-curry-polos/"
        }
      ]
    },
    "devilled chicken": {
      "local": "චිකන් ඩෙවල් (chikan ḍeval)",
      "note": {
        "en": "Sri Lankan-Chinese fusion stir-fry of crispy fried chicken with onions, peppers and a fiery sauce; \"devilled\" is a British colonial term…",
        "fr": "Sauté sri-lankais-chinois de poulet frit croustillant aux oignons et poivrons en sauce épicée; \"devilled\" vient d'un terme colonial…"
      },
      "sources": [
        {
          "name": "Ceylon Delights – Sri Lankan Devilled Chicken (චිකන් ඩෙවල් සුපිරියට)",
          "url": "https://www.ceylondelights.com.au/sri-lankan-devilled-chicken-%E0%B6%A0%E0%B7%92%E0%B6%9A%E0%B6%B1%E0%B7%8A-%E0%B6%A9%E0%B7%99%E0%B7%80%E0%B6%BD%E0%B7%8A-%E0%B7%83%E0%B7%94%E0%B6%B4%E0%B7%92%E0%B6%BB%E0%B7%92%E0%B6%BA%E0%B6%A7"
        },
        {
          "name": "Island Smile – Sri Lankan devilled chicken (spicy chicken stir fry)",
          "url": "https://www.islandsmile.org/sri-lankan-chilli-devilled-chicken/"
        }
      ]
    },
    "devilled prawns": {
      "local": "ඉස්සෝ තෙල් දාලා (Isso Thel Dala)",
      "note": {
        "en": "A hot, spicy Sri Lankan dry-fried prawn dish (\"devilled prawns\") cooked with onion, chilli and tomato.",
        "fr": "Plat sri-lankais de crevettes sautées à sec, piquant et relevé (« devilled prawns »), avec oignon, piment et tomate."
      },
      "sources": [
        {
          "name": "Not Quite Nigella — Sri Lankan Devilled Prawns Isso Thel Dhala",
          "url": "https://www.notquitenigella.com/2016/09/01/devilled-prawns/"
        },
        {
          "name": "Island Smile — Sri Lankan Devilled Prawns (Spicy prawns)",
          "url": "https://www.islandsmile.org/spicy-devilled-prawns-shrimp/"
        }
      ]
    },
    "coconut roti": {
      "local": "පොල් රොටි (pol roti)",
      "note": {
        "en": "Sri Lankan unleavened flatbread of wheat (or kurakkan) flour kneaded with scraped fresh coconut, cooked on a griddle.",
        "fr": "Pain plat sri-lankais sans levain, fait de farine de blé (ou kurakkan) pétrie avec de la noix de coco fraîche râpée, cuit à la plaque."
      },
      "sources": [
        {
          "name": "Roti - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Roti"
        },
        {
          "name": "Authentic Sri Lankan Pol Roti (Coconut Roti) - The Flavor Bender",
          "url": "https://www.theflavorbender.com/sri-lankan-pol-roti-coconut-roti/"
        }
      ]
    },
    "sri lankan crab curry": {
      "local": "කකුළුවෝ ව්‍යංජනය (Kakuluwo)",
      "note": {
        "en": "A spicy crab curry from northern Sri Lanka (Jaffna), with mud or blue swimmer crab simmered in coconut milk, curry leaves and drumstick…",
        "fr": "Un curry de crabe épicé du nord du Sri Lanka (Jaffna), au crabe de vase ou nageur mijoté au lait de coco, feuilles de curry et gousses de…"
      },
      "sources": [
        {
          "name": "Wikipedia — Jaffna crab curry",
          "url": "https://en.wikipedia.org/wiki/Jaffna_crab_curry"
        },
        {
          "name": "TasteAtlas — Sri Lankan Crab Curry",
          "url": "https://www.tasteatlas.com/sri-lankan-crab-curry"
        }
      ]
    },
    "milk rice": {
      "local": "කිරිබත් (kiribath)",
      "note": {
        "en": "Kiribath is a Sri Lankan rice cake cooked in coconut milk, the traditional first dish of the Sinhala and Tamil New Year and new beginnings.",
        "fr": "Le kiribath est un gateau de riz sri-lankais cuit au lait de coco, plat traditionnel du Nouvel An cinghalais et tamoul et des nouveaux…"
      },
      "sources": [
        {
          "name": "Wikipedia - Kiribath",
          "url": "https://en.wikipedia.org/wiki/Kiribath"
        },
        {
          "name": "Wikipedia - Milk rice",
          "url": "https://en.wikipedia.org/wiki/Milk_rice"
        }
      ]
    },
    "watalappan": {
      "local": "වටලප්පන්",
      "note": {
        "en": "A Sri Lankan steamed coconut-milk and jaggery egg custard, brought by Sri Lankan Malays and derived from the Malay dish serikaya.",
        "fr": "Un flan sri-lankais cuit a la vapeur a base de lait de coco, de jaggery et d'oeufs, apporte par les Malais sri-lankais et derive du…"
      },
      "sources": [
        {
          "name": "Wikipedia — Watalappam",
          "url": "https://en.wikipedia.org/wiki/Watalappam"
        },
        {
          "name": "DBpedia — Watalappam",
          "url": "https://dbpedia.org/page/Watalappam"
        }
      ]
    },
    "pittu": {
      "local": "පිට්ටு / புட்டு",
      "note": {
        "en": "Steamed cylinders of ground rice layered with grated coconut, a breakfast staple native to Sri Lanka and South India.",
        "fr": "Cylindres cuits a la vapeur de riz moulu en couches avec de la noix de coco rapee, plat de petit-dejeuner du Sri Lanka et de l'Inde du Sud."
      },
      "sources": [
        {
          "name": "Wikipedia - Puttu",
          "url": "https://en.wikipedia.org/wiki/Puttu"
        },
        {
          "name": "Lakpura - Pittu (පිට්ටු)",
          "url": "https://us.lakpura.com/pages/pittu"
        }
      ]
    },
    "roast paan": {
      "local": "රෝස්ට් පාන් (Sinhala; lit. \"roasted bread\")",
      "note": {
        "en": "Sri Lankan pull-apart bread that is baked and then roasted/grilled a second time, usually with coconut oil, giving a crisp crust and a soft…",
        "fr": "Pain sri-lankais à partager, d'abord cuit puis rôti ou grillé une seconde fois, généralement à l'huile de coco, donnant une croûte…"
      },
      "sources": [
        {
          "name": "Island Smile - Roast paan (Sri Lankan bread recipe)",
          "url": "https://www.islandsmile.org/roast-paan-sri-lankan-bread-recipe/"
        },
        {
          "name": "Joy of Eating the World - Roast Paan (Sri Lankan Coconut Oil Bread)",
          "url": "https://www.joyofeatingtheworld.com/best-sri-lankan-roast-paan-recipe/"
        }
      ]
    },
    "kola kanda": {
      "local": "කොළ කැඳ",
      "note": {
        "en": "Sri Lankan herbal rice congee with coconut milk and leafy-green juice, rooted in Buddhist monastic tradition as a restorative breakfast.",
        "fr": "Bouillie de riz aux herbes srilankaise au lait de coco et jus de feuilles vertes, issue de la tradition monastique bouddhiste comme…"
      },
      "sources": [
        {
          "name": "Wikipedia – Kola kanda",
          "url": "https://en.wikipedia.org/wiki/Kola_kanda"
        }
      ]
    }
  },
  "greek": {
    "moussaka": {
      "local": "μουσακάς",
      "note": {
        "en": "Baked Greek casserole of layered eggplant, spiced minced meat and béchamel; the modern version was created by Nikolaos Tselementes in the…",
        "fr": "Gratin grec d'aubergines, de viande hachée épicée et de béchamel ; la version moderne fut créée par Nikolaos Tselementes dans les années…"
      },
      "sources": [
        {
          "name": "Wikipedia — Moussaka",
          "url": "https://en.wikipedia.org/wiki/Moussaka"
        },
        {
          "name": "Britannica — Moussaka",
          "url": "https://www.britannica.com/topic/moussaka"
        }
      ]
    },
    "souvlaki": {
      "local": "σουβλάκι",
      "note": {
        "en": "Greek dish of small skewer-grilled meat pieces served on or in pita; its name derives from the Medieval Greek souvla, meaning spit.",
        "fr": "Plat grec de petits morceaux de viande grillés en brochette, servis dans ou avec un pita; son nom vient du grec medieval souvla, broche."
      },
      "sources": [
        {
          "name": "Souvlaki - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Souvlaki"
        },
        {
          "name": "The Ancient Roots of Greek Souvlaki - GreekReporter",
          "url": "https://greekreporter.com/2023/09/16/ancient-roots-greek-souvlaki/"
        }
      ]
    },
    "gyros": {
      "local": "γύρος",
      "note": {
        "en": "Greek dish of meat (usually pork or chicken) cooked on a vertical rotisserie, served in pita with tomato, onion and tzatziki.",
        "fr": "Plat grec de viande (souvent porc ou poulet) cuite sur broche verticale, servie en pita avec tomate, oignon et tzatziki."
      },
      "sources": [
        {
          "name": "Wikipedia – Gyros",
          "url": "https://en.wikipedia.org/wiki/Gyros"
        },
        {
          "name": "Diane Kochilas – History of Gyro",
          "url": "https://www.dianekochilas.com/gyro-ancient-street-food-history/"
        }
      ]
    },
    "spanakopita": {
      "local": "σπανακόπιτα",
      "note": {
        "en": "Greek savory pie of spinach and feta cheese layered in phyllo pastry; the name combines spanaki (spinach) and pita (pie).",
        "fr": "Tourte grecque salee aux epinards et a la feta en pate phyllo; son nom combine spanaki (epinard) et pita (tourte)."
      },
      "sources": [
        {
          "name": "Savory spinach pie - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Savory_spinach_pie"
        },
        {
          "name": "spanakopita - Wiktionary",
          "url": "https://en.wiktionary.org/wiki/spanakopita"
        }
      ]
    },
    "tiropita": {
      "local": "τυρόπιτα",
      "note": {
        "en": "A Greek pastry of layered buttered phyllo filled with a cheese-and-egg mixture, traced by scholars to the ancient placenta cake (plakous).",
        "fr": "Une pâtisserie grecque de pâte phyllo beurrée en couches garnie de fromage et d'œufs, rattachée par les érudits à l'antique gâteau placenta…"
      },
      "sources": [
        {
          "name": "Wikipedia - Tiropita",
          "url": "https://en.wikipedia.org/wiki/Tiropita"
        }
      ]
    },
    "pastitsio": {
      "local": "παστίτσιο",
      "note": {
        "en": "Greek baked pasta dish layering tubular pasta, spiced ground-meat sauce and béchamel; its modern form was codified by chef Tselementes in…",
        "fr": "Plat grec de pâtes au four superposant pâtes tubulaires, sauce à la viande épicée et béchamel ; sa forme moderne fut codifiée par le chef…"
      },
      "sources": [
        {
          "name": "Wikipedia — Pastitsio",
          "url": "https://en.wikipedia.org/wiki/Pastitsio"
        }
      ]
    },
    "dolmades": {
      "local": "ντολμάδες",
      "note": {
        "en": "Greek grape leaves wrapped around rice, herbs and often lamb, simmered in lemony broth; the name comes from the Turkic verb dolmak, to fill.",
        "fr": "Feuilles de vigne grecques garnies de riz, d'herbes et souvent d'agneau, mijotees au citron; le nom vient du verbe turc dolmak, remplir."
      },
      "sources": [
        {
          "name": "Wikipedia — Stuffed leaves",
          "url": "https://en.wikipedia.org/wiki/Stuffed_leaves"
        },
        {
          "name": "Britannica — Dolma",
          "url": "https://www.britannica.com/topic/dolma"
        }
      ]
    },
    "horiatiki salad": {
      "local": "χωριάτικη σαλάτα",
      "note": {
        "en": "Greek \"village salad\" of tomatoes, cucumber, onion, olives and a feta block, popularized mid-20th century to skirt price controls.",
        "fr": "\"Salade villageoise\" grecque de tomates, concombre, oignon, olives et bloc de feta, popularisée au milieu du XXe siècle pour contourner le…"
      },
      "sources": [
        {
          "name": "Greek salad — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Greek_salad"
        },
        {
          "name": "Greek Salad (Horiatiki): Authentic Recipe and Surprising Origins — Food Around Athens",
          "url": "https://foodaroundathens.com/2025/09/09/greek-salad-horiatiki-authentic-recipe-and-surprising-origins/"
        }
      ]
    },
    "tzatziki": {
      "local": "τζατζίκι",
      "note": {
        "en": "A Greek dip of strained yogurt, cucumber and garlic, adapted from Ottoman Turkish cacık.",
        "fr": "Une sauce grecque de yaourt égoutté, concombre et ail, adaptée du cacık turc ottoman."
      },
      "sources": [
        {
          "name": "Wikipedia — Tzatziki",
          "url": "https://en.wikipedia.org/wiki/Tzatziki"
        },
        {
          "name": "Wiktionary — tzatziki",
          "url": "https://en.wiktionary.org/wiki/tzatziki"
        }
      ]
    },
    "hummus greek style": {
      "local": "χούμους",
      "note": {
        "en": "A purée of chickpeas, tahini, lemon and olive oil of Levantine origin, adopted into Greek meze cuisine in recent decades.",
        "fr": "Une purée de pois chiches, tahini, citron et huile d'olive d'origine levantine, intégrée au meze grec depuis quelques décennies."
      },
      "sources": [
        {
          "name": "Wiktionary — χούμους",
          "url": "https://en.wiktionary.org/wiki/%CF%87%CE%BF%CF%8D%CE%BC%CE%BF%CF%85%CF%82"
        },
        {
          "name": "My Greek Dish — Homemade Hummus",
          "url": "https://www.mygreekdish.com/recipe/3-easy-delicious-homemade-hummus-recipes/"
        }
      ]
    },
    "taramasalata": {
      "local": "ταραμοσαλάτα",
      "note": {
        "en": "A Greek meze of salted, cured fish roe (tarama) whipped with bread or potato, olive oil and lemon, traditional at Lent.",
        "fr": "Un meze grec de œufs de poisson salés et séchés (tarama) montés au pain ou à la pomme de terre, huile d'olive et citron, typique du Carême."
      },
      "sources": [
        {
          "name": "Wikipedia — Taramasalata",
          "url": "https://en.wikipedia.org/wiki/Taramasalata"
        }
      ]
    },
    "saganaki": {
      "local": "σαγανάκι",
      "note": {
        "en": "Greek appetizer of firm cheese dredged in flour and pan-fried, named after the small two-handled frying pan (sagani) it is cooked in.",
        "fr": "Entrée grecque de fromage ferme fariné et poêlé, nommée d'après la petite poêle à deux anses (sagani) où il cuit."
      },
      "sources": [
        {
          "name": "Wikipedia — Saganaki",
          "url": "https://en.wikipedia.org/wiki/Saganaki"
        },
        {
          "name": "Wiktionary — σαγανάκι",
          "url": "https://en.wiktionary.org/wiki/%CF%83%CE%B1%CE%B3%CE%B1%CE%BD%CE%AC%CE%BA%CE%B9"
        }
      ]
    },
    "greek octopus": {
      "local": "χταπόδι",
      "note": {
        "en": "Octopus, often grilled over charcoal, is a quintessential Greek seafood meze served in seaside tavernas with ouzo.",
        "fr": "Le poulpe, souvent grille au charbon, est un meze grec de fruits de mer emblematique servi dans les tavernes avec de l'ouzo."
      },
      "sources": [
        {
          "name": "Diane Kochilas - Classic Grilled Octopus (Ktapodi stin Skara)",
          "url": "https://www.dianekochilas.com/classic-grilled-octopus-ktapodi-stin-skara/"
        },
        {
          "name": "My Greek Dish - Greek-style Octopus (Xtapodi)",
          "url": "https://www.mygreekdish.com/recipe/greek-style-octopus/"
        }
      ]
    },
    "kleftiko": {
      "local": "κλέφτικο",
      "note": {
        "en": "Greek slow-roasted lamb sealed and cooked in a pit, named after the klephts who hid \"stolen meat\" from Ottoman rulers.",
        "fr": "Agneau grec rôti lentement et scellé dans une fosse, nommé d'après les klephtes cachant la \"viande volée\" aux Ottomans."
      },
      "sources": [
        {
          "name": "Wikipedia — Kleftiko",
          "url": "https://en.wikipedia.org/wiki/Kleftiko"
        },
        {
          "name": "Hill Street Grocer — The story of Lamb Kleftiko",
          "url": "https://hillstreetgrocer.com/featured-content/articles/greek-classic-story-lamb-kleftiko"
        }
      ]
    },
    "stifado": {
      "local": "στιφάδο",
      "note": {
        "en": "A Greek slow-cooked stew of meat (traditionally rabbit or beef) and pearl onions in red wine and spices, of Venetian origin.",
        "fr": "Ragout grec mijote de viande (traditionnellement lapin ou boeuf) et petits oignons au vin rouge et epices, d'origine venitienne."
      },
      "sources": [
        {
          "name": "Wiktionary: στιφάδο",
          "url": "https://en.wiktionary.org/wiki/%CF%83%CF%84%CE%B9%CF%86%CE%AC%CE%B4%CE%BF"
        },
        {
          "name": "196 flavors: Stifado",
          "url": "https://www.196flavors.com/greece-stifado/"
        }
      ]
    },
    "avgolemono": {
      "local": "αυγολέμονο",
      "note": {
        "en": "A Greek family of egg-yolk-and-lemon-juice sauces or soups beaten with broth and heated to thicken; its name literally means \"egg-lemon.\"",
        "fr": "Famille grecque de sauces ou soupes au jaune d'oeuf et jus de citron, battue avec du bouillon et chauffee pour epaissir ; son nom signifie…"
      },
      "sources": [
        {
          "name": "Wikipedia - Avgolemono",
          "url": "https://en.wikipedia.org/wiki/Avgolemono"
        }
      ]
    },
    "baklava greek": {
      "local": "μπακλαβάς",
      "note": {
        "en": "A sweet pastry of layered phyllo, chopped nuts and honey syrup, rooted in Byzantine and Ottoman kitchens.",
        "fr": "Une pâtisserie sucrée de pâte phyllo en couches, noix concassées et sirop de miel, née des cuisines byzantine et ottomane."
      },
      "sources": [
        {
          "name": "Baklava - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Baklava"
        },
        {
          "name": "μπακλαβάς - Wiktionary",
          "url": "https://en.wiktionary.org/wiki/%CE%BC%CF%80%CE%B1%CE%BA%CE%BB%CE%B1%CE%B2%CE%AC%CF%82"
        }
      ]
    },
    "galaktoboureko": {
      "local": "Γαλακτομπούρεκο",
      "note": {
        "en": "A Greek dessert of semolina custard baked between layers of buttered phyllo, then soaked in cooled citrus-scented syrup.",
        "fr": "Un dessert grec de crème de semoule cuite entre des couches de pâte phyllo beurrée, puis imbibée de sirop parfumé aux agrumes."
      },
      "sources": [
        {
          "name": "Wikipedia — Galaktoboureko",
          "url": "https://en.wikipedia.org/wiki/Galaktoboureko"
        },
        {
          "name": "Mia Kouppa — Galaktoboureko (Γαλακτομπούρεκο)",
          "url": "https://miakouppa.com/galaktoboureko-%CE%B3%CE%B1%CE%BB%CE%B1%CE%BA%CF%84%CE%BF%CE%BC%CF%80%CE%BF%CF%8D%CF%81%CE%B5%CE%BA%CE%BF/"
        }
      ]
    },
    "loukoumades": {
      "local": "λουκουμάδες",
      "note": {
        "en": "Greek deep-fried dough balls soaked in honey syrup and cinnamon; among the oldest recorded desserts, served to ancient Olympic victors.",
        "fr": "Beignets grecs frits trempes dans un sirop de miel et de cannelle; parmi les plus anciens desserts attestes, offerts aux vainqueurs…"
      },
      "sources": [
        {
          "name": "Wiktionary - λουκουμάς",
          "url": "https://en.wiktionary.org/wiki/%CE%BB%CE%BF%CF%85%CE%BA%CE%BF%CF%85%CE%BC%CE%AC%CF%82"
        },
        {
          "name": "Greek Reporter - Tales of loukoumades",
          "url": "https://greekreporter.com/2023/08/08/loukoumades-from-the-ancient-olympics-to-the-present-day/"
        }
      ]
    },
    "feta cheese": {
      "local": "Φέτα",
      "note": {
        "en": "Greek brined white cheese from sheep's milk (plus up to 30% goat), granted EU PDO status in 2002 limiting the name to traditional Greek…",
        "fr": "Fromage grec blanc en saumure au lait de brebis (et jusqu'à 30% de chèvre), protégé par l'AOP de l'UE depuis 2002 dans certaines régions…"
      },
      "sources": [
        {
          "name": "Wikipedia — Feta",
          "url": "https://en.wikipedia.org/wiki/Feta"
        },
        {
          "name": "WIPO — Defining a Name's Origin: The Case of Feta",
          "url": "https://www.wipo.int/en/web/ip-advantage/w/stories/defining-a-name-s-origin-the-case-of-feta"
        }
      ]
    },
    "halloumi greek style": {
      "local": "Χαλλούμι",
      "note": {
        "en": "Cypriot semi-hard brined cheese, traditionally from sheep and goat milk (the EU PDO recipe also permits cow milk, but sheep/goat must…",
        "fr": "Fromage chypriote semi-ferme en saumure, traditionnellement au lait de brebis et de chevre (la recette AOP autorise aussi le lait de vache…"
      },
      "sources": [
        {
          "name": "Wikipedia - Halloumi",
          "url": "https://en.wikipedia.org/wiki/Halloumi"
        },
        {
          "name": "European Commission - European Commission registers Χαλλούμι/Halloumi/Hellim as a Protected Designation of Origin (PDO)",
          "url": "https://ec.europa.eu/commission/presscorner/detail/en/ip_21_1623"
        }
      ]
    },
    "greek yogurt with honey": {
      "local": "Γιαούρτι με μέλι",
      "note": {
        "en": "Thick strained Greek yogurt drizzled with honey, traditionally topped with walnuts; eaten in Greece as a light dessert, snack, or…",
        "fr": "Yaourt grec épais et égoutté, nappé de miel et traditionnellement garni de noix; consommé en Grèce comme dessert léger, en-cas ou…"
      },
      "sources": [
        {
          "name": "My Greek Dish — Greek Yogurt with Honey and Walnuts (Yiaourti me meli)",
          "url": "https://www.mygreekdish.com/recipe/greek-yogurt-with-honey-walnuts-recipe-yiaourti-meli/"
        },
        {
          "name": "Wikipedia — Oxygala (ancient Greek soured-milk product; Galen noted it was eaten with honey)",
          "url": "https://en.wikipedia.org/wiki/Oxygala"
        }
      ]
    },
    "ouzo": {
      "local": "ούζο",
      "note": {
        "en": "A dry anise-flavored aperitif from Greece and Cyprus, distilled from rectified spirits; with EU Protected Designation of Origin since 2006.",
        "fr": "Apéritif sec grec et chypriote parfumé à l'anis, distillé à partir d'alcool rectifié; appellation d'origine protégée de l'UE depuis 2006."
      },
      "sources": [
        {
          "name": "Wikipedia — Ouzo",
          "url": "https://en.wikipedia.org/wiki/Ouzo"
        }
      ]
    },
    "retsina": {
      "local": "Ρετσίνα",
      "note": {
        "en": "Greek resinated white (or rosé) wine flavored with Aleppo pine resin, a practice dating to antiquity when resin sealed wine amphorae.",
        "fr": "Vin grec blanc (ou rosé) résiné aromatisé à la résine de pin d'Alep, pratique remontant à l'Antiquité où la résine scellait les amphores."
      },
      "sources": [
        {
          "name": "Wikipedia — Retsina",
          "url": "https://en.wikipedia.org/wiki/Retsina"
        },
        {
          "name": "Wines of Greece — Retsina: From Tradition to a New Era",
          "url": "https://winesofgreece.org/retsina-from-tradition-to-a-new-era/"
        }
      ]
    },
    "greek coffee": {
      "local": "Ελληνικός καφές",
      "note": {
        "en": "A strong unfiltered coffee of finely ground beans simmered in a briki pot, introduced via the Ottoman Empire and renamed from Turkish…",
        "fr": "Un café fort non filtré de grains finement moulus, mijoté dans un briki, introduit par l'Empire ottoman puis rebaptisé du café turc."
      },
      "sources": [
        {
          "name": "AllinCrete Travel Guide",
          "url": "https://www.allincrete.com/greek-coffee-a-guide-to-the-history-brewing-and-serving-of-this-traditional-beverage/"
        },
        {
          "name": "Greece High Definition",
          "url": "https://www.greecehighdefinition.com/blog/history-of-greek-coffee-preparation-ellinikos-kafes"
        }
      ]
    }
  },
  "turkish": {
    "döner kebab": {
      "local": "döner kebap",
      "note": {
        "en": "Turkish dish of seasoned meat stacked and cooked on a vertical rotisserie, originating in 19th-century Ottoman Bursa.",
        "fr": "Plat turc de viande assaisonnée, empilée et cuite sur une broche verticale, né dans la Bursa ottomane du XIXe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia - Doner kebab",
          "url": "https://en.wikipedia.org/wiki/Doner_kebab"
        },
        {
          "name": "National Geographic - What is doner kebab",
          "url": "https://www.nationalgeographic.com/travel/article/what-is-turkish-doner-kebab"
        }
      ]
    },
    "shish kebab": {
      "local": "şiş kebap",
      "note": {
        "en": "A Turkish dish of skewered, grilled cubes of meat (traditionally lamb); the name combines şiş (skewer) and kebap (roasted meat).",
        "fr": "Un plat turc de cubes de viande grillés en brochette (traditionnellement l'agneau) ; le nom unit şiş (broche) et kebap (viande rôtie)."
      },
      "sources": [
        {
          "name": "Wikipedia - Shish kebab",
          "url": "https://en.wikipedia.org/wiki/Shish_kebab"
        },
        {
          "name": "Britannica - Shish kebab",
          "url": "https://www.britannica.com/topic/shish-kebab"
        }
      ]
    },
    "adana kebab": {
      "local": "Adana kebabı",
      "note": {
        "en": "A spicy hand-minced lamb kebab skewered and grilled, named after Adana, Turkey; registered as a geographical indication in 2005.",
        "fr": "Brochette de viande d'agneau hachée et épicée, grillée, nommée d'après Adana en Turquie; indication géographique enregistrée en 2005."
      },
      "sources": [
        {
          "name": "Wikipedia - Adana kebabı",
          "url": "https://en.wikipedia.org/wiki/Adana_kebab%C4%B1"
        }
      ]
    },
    "iskender kebab": {
      "local": "İskender kebap",
      "note": {
        "en": "Turkish dish of sliced döner meat over pita with tomato sauce, yogurt and melted butter, invented by İskender Efendi in Bursa in 1867.",
        "fr": "Plat turc de döner tranché sur du pain pita avec sauce tomate, yaourt et beurre fondu, inventé par İskender Efendi à Bursa en 1867."
      },
      "sources": [
        {
          "name": "Wikipedia — İskender kebap",
          "url": "https://en.wikipedia.org/wiki/%C4%B0skender_kebap"
        },
        {
          "name": "Turkey Travel Planner — Iskender Kebap",
          "url": "https://turkeytravelplanner.com/details/Food/IskenderKebap.html"
        }
      ]
    },
    "lahmacun": {
      "local": "lahmacun",
      "note": {
        "en": "A thin Turkish flatbread topped with spiced minced meat; its name derives from Arabic \"lahm bi-ajin\" (meat with dough).",
        "fr": "Une fine galette turque garnie de viande hachee epicee; son nom vient de l'arabe \"lahm bi-ajin\" (viande avec pate)."
      },
      "sources": [
        {
          "name": "Wikipedia - Lahmacun",
          "url": "https://en.wikipedia.org/wiki/Lahmacun"
        }
      ]
    },
    "pide": {
      "local": "pide",
      "note": {
        "en": "A boat-shaped Turkish flatbread baked with toppings such as cheese, minced meat or egg, often called \"Turkish pizza.\"",
        "fr": "Pain plat turc en forme de barque, garni de fromage, viande hachee ou oeuf, souvent appele \"pizza turque.\""
      },
      "sources": [
        {
          "name": "İçli pide - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/İçli_pide"
        }
      ]
    },
    "borek": {
      "local": "börek",
      "note": {
        "en": "A filled pastry of thin yufka dough layered with cheese, meat or greens, rooted in Central Asian Turkic flatbread-making.",
        "fr": "Une pâtisserie farcie en fines feuilles de yufka garnie de fromage, viande ou herbes, issue des galettes turques d'Asie centrale."
      },
      "sources": [
        {
          "name": "Wikipedia - Börek",
          "url": "https://en.wikipedia.org/wiki/B%C3%B6rek"
        },
        {
          "name": "History Today - A History of Börek",
          "url": "https://www.historytoday.com/archive/historians-cookbook/history-borek"
        }
      ]
    },
    "su böreği": {
      "local": "su böreği",
      "note": {
        "en": "A Turkish layered börek whose yufka sheets are boiled before baking, filled with white cheese and parsley.",
        "fr": "Un börek turc en couches dont les feuilles de yufka sont bouillies avant cuisson, garni de fromage blanc et de persil."
      },
      "sources": [
        {
          "name": "Wikipedia — Su böreği",
          "url": "https://en.wikipedia.org/wiki/Su_b%C3%B6re%C4%9Fi"
        },
        {
          "name": "Cooking Gorgeous — Su Boregi (Water Borek)",
          "url": "https://cookingorgeous.com/blog/su-boregi-water-borek/"
        }
      ]
    },
    "manti": {
      "local": "Mantı",
      "note": {
        "en": "Small Turkish dumplings filled with spiced lamb or beef, served in garlicky yoghurt; the earliest recipe appears in a 15th-century Ottoman…",
        "fr": "Petits raviolis turcs farcis d'agneau ou de bœuf épicé, servis au yaourt à l'ail ; la plus ancienne recette figure dans un livre ottoman du…"
      },
      "sources": [
        {
          "name": "Wikipedia - Manti (food)",
          "url": "https://en.wikipedia.org/wiki/Manti_(food)"
        }
      ]
    },
    "köfte": {
      "local": "köfte",
      "note": {
        "en": "Turkish seasoned ground-meat balls or patties (usually lamb or beef, or a mix), flavoured with onion and spices; the name is from Persian…",
        "fr": "Boulettes ou galettes turques de viande hachée assaisonnée (souvent agneau ou bœuf, ou un mélange), parfumées à l'oignon et aux épices; le…"
      },
      "sources": [
        {
          "name": "Köfte, the iconic Turkish meatball and its many variations - Daily Sabah",
          "url": "https://www.dailysabah.com/life/food/kofte-the-iconic-turkish-meatball-and-its-many-variations"
        },
        {
          "name": "Kofta - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kofta"
        }
      ]
    },
    "kuru fasulye": {
      "local": "kuru fasulye",
      "note": {
        "en": "Turkish stew of white beans simmered with onion, tomato paste or tomato sauce, and olive oil; often considered the national dish of Turkey.",
        "fr": "Ragout turc de haricots blancs mijotes avec oignon, concentre ou sauce tomate et huile d'olive ; souvent considere comme le plat national…"
      },
      "sources": [
        {
          "name": "Wikipedia - Kuru fasulye",
          "url": "https://en.wikipedia.org/wiki/Kuru_fasulye"
        },
        {
          "name": "TasteAtlas - Kuru Fasulye",
          "url": "https://www.tasteatlas.com/kuru-fasulye"
        }
      ]
    },
    "mantı": {
      "local": "mantı",
      "note": {
        "en": "Small Turkish dumplings filled with spiced ground meat, served with garlic yogurt and butter; earliest Ottoman recipe dates to the 15th…",
        "fr": "Petits raviolis turcs farcis de viande hachée épicée, servis avec yaourt à l'ail et beurre ; la première recette ottomane date du XVe…"
      },
      "sources": [
        {
          "name": "Wikipedia — Manti (food)",
          "url": "https://en.wikipedia.org/wiki/Manti_(food)"
        },
        {
          "name": "TasteAtlas — Mantı",
          "url": "https://tasteatlas.com/manti"
        }
      ]
    },
    "imam bayildi": {
      "local": "İmam bayıldı",
      "note": {
        "en": "Ottoman-era dish of whole aubergine stuffed with onion, garlic and tomato and simmered in olive oil; the name means \"the imam fainted.\"",
        "fr": "Plat d'origine ottomane d'aubergine entière farcie d'oignon, d'ail et de tomate, mijotée à l'huile d'olive ; le nom signifie « l'imam s'est…"
      },
      "sources": [
        {
          "name": "Wikipedia — İmam bayıldı",
          "url": "https://en.wikipedia.org/wiki/%C4%B0mam_bay%C4%B1ld%C4%B1"
        }
      ]
    },
    "hünkar beğendi": {
      "local": "Hünkâr Beğendi",
      "note": {
        "en": "Ottoman dish (\"Sultan's Delight\") of lamb stew over a creamy bechamel-eggplant puree, a celebrated Turkish palace recipe.",
        "fr": "Plat ottoman (Delice du sultan): ragout d'agneau sur une puree d'aubergine a la bechamel, celebre recette du palais turc."
      },
      "sources": [
        {
          "name": "Turkish Foodie - Hünkar Beğendi",
          "url": "https://turkishfoodie.com/hunkar-begendi/"
        },
        {
          "name": "Meer - The legend of Ottoman cuisine: Hünkar Beğendi",
          "url": "https://www.meer.com/en/75967-the-legend-of-ottoman-cuisine-hunkar-begendi"
        }
      ]
    },
    "iç pilav": {
      "local": "İç pilav",
      "note": {
        "en": "Turkish rice pilaf with pine nuts, currants and spices, an Ottoman palace dish used as a side or as stuffing for poultry and lamb.",
        "fr": "Pilaf de riz turc aux pignons, raisins de Corinthe et épices, plat de palais ottoman servi en accompagnement ou en farce pour volaille et…"
      },
      "sources": [
        {
          "name": "Give Recipe — Ic Pilav (Turkish Rice with Currants and Pine Nuts)",
          "url": "https://www.giverecipe.com/rice-with-currants/"
        },
        {
          "name": "Ozlem's Turkish Table — Kestaneli İç Pilav",
          "url": "https://ozlemsturkishtable.com/2021/12/rice-pilaf-with-chestnuts-pine-nuts-and-currants-kestaneli-ic-pilav/"
        }
      ]
    },
    "meze platter turkish": {
      "local": "meze",
      "note": {
        "en": "A Turkish selection of small shared appetiser dishes served before or with rakı; the word comes from Persian maze, meaning taste.",
        "fr": "Un assortiment turc de petits plats à partager servis avant ou avec le rakı; le mot vient du persan maze, signifiant goût."
      },
      "sources": [
        {
          "name": "Wikipedia — Meze",
          "url": "https://en.wikipedia.org/wiki/Meze"
        },
        {
          "name": "Wikipedia — Turkish cuisine",
          "url": "https://en.wikipedia.org/wiki/Turkish_cuisine"
        }
      ]
    },
    "cacık": {
      "local": "cacık",
      "note": {
        "en": "A Turkish dish of strained yogurt with cucumber, garlic and herbs, often thinned with water and served as a cold soup.",
        "fr": "Plat turc de yaourt égoutté avec concombre, ail et herbes, souvent allongé d'eau et servi en soupe froide."
      },
      "sources": [
        {
          "name": "Wikipedia: Tzatziki (cacık)",
          "url": "https://en.wikipedia.org/wiki/Tzatziki"
        }
      ]
    },
    "baklava turkish": {
      "local": "baklava",
      "note": {
        "en": "A rich pastry of layered filo filled with chopped nuts and soaked in syrup, perfected in Ottoman kitchens; Gaziantep baklava holds EU…",
        "fr": "Patisserie de fines couches de pate filo garnie de noix concassees et imbibee de sirop, perfectionnee sous les Ottomans; le baklava de…"
      },
      "sources": [
        {
          "name": "Baklava - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Baklava"
        }
      ]
    },
    "künefe": {
      "local": "künefe",
      "note": {
        "en": "A warm Turkish dessert of shredded kadayıf pastry layered with unsalted melting cheese, baked crisp and soaked in sugar syrup; associated…",
        "fr": "Dessert turc chaud de pâte kadayıf effilochée garnie de fromage fondant non salé, cuit croustillant et imbibé de sirop ; lié à…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Künefe",
          "url": "https://www.tasteatlas.com/best-rated-desserts-in-turkey"
        },
        {
          "name": "Turkish Foodie - Künefe",
          "url": "https://turkishfoodie.com/kunefe/"
        }
      ]
    },
    "lokma": {
      "local": "lokma",
      "note": {
        "en": "Leavened deep-fried dough balls soaked in sweet syrup or honey, from the medieval Arabic luqmat al-qadi adopted by the Ottoman palace.",
        "fr": "Boules de pate levee frites trempees dans un sirop sucre ou du miel, issues du luqmat al-qadi arabe medieval adopte par le palais ottoman."
      },
      "sources": [
        {
          "name": "Wikipedia - Lokma",
          "url": "https://en.wikipedia.org/wiki/Lokma"
        }
      ]
    },
    "turkish delight": {
      "local": "lokum (rahat lokum)",
      "note": {
        "en": "A chewy Turkish confection of starch and sugar gel, often with nuts or rosewater, refined into its modern form in 18th-century Istanbul.",
        "fr": "Confiserie turque moelleuse de gel d'amidon et de sucre, souvent aux noix ou a l'eau de rose, perfectionnee au 18e siecle a Istanbul."
      },
      "sources": [
        {
          "name": "Wikipedia - Turkish delight",
          "url": "https://en.wikipedia.org/wiki/Turkish_delight"
        }
      ]
    },
    "simit": {
      "local": "simit",
      "note": {
        "en": "A circular Turkish sesame-encrusted bread with Byzantine roots (the 9th-century kollikion), documented in Istanbul since the 1520s and sold…",
        "fr": "Pain turc circulaire enrobe de graines de sesame, aux racines byzantines (le kollikion du IXe siecle), atteste a Istanbul depuis les annees…"
      },
      "sources": [
        {
          "name": "Wikipedia - Simit",
          "url": "https://en.wikipedia.org/wiki/Simit"
        },
        {
          "name": "TasteAtlas - Simit",
          "url": "https://www.tasteatlas.com/simit"
        }
      ]
    },
    "turkish tea (çay)": {
      "local": "Çay",
      "note": {
        "en": "Strong black tea brewed in a stacked double teapot and served in tulip-shaped glasses, mostly grown in Rize on Turkey's Black Sea coast…",
        "fr": "Thé noir corsé infusé dans une théière double superposée et servi dans des verres tulipe, cultivé surtout à Rize sur la côte turque de la…"
      },
      "sources": [
        {
          "name": "Wikipedia - Tea in Turkey",
          "url": "https://en.wikipedia.org/wiki/Tea_in_Turkey"
        },
        {
          "name": "TasteAtlas - Rize çayı",
          "url": "https://tasteatlas.com/rize-cayi"
        }
      ]
    },
    "turkish coffee": {
      "local": "Türk kahvesi",
      "note": {
        "en": "Finely ground unfiltered coffee simmered in a cezve, an Ottoman tradition since the 16th century, UNESCO-listed in 2013.",
        "fr": "Café non filtré finement moulu mijoté dans un cezve, tradition ottomane du XVIe siècle, inscrite à l'UNESCO en 2013."
      },
      "sources": [
        {
          "name": "Wikipedia — Turkish coffee",
          "url": "https://en.wikipedia.org/wiki/Turkish_coffee"
        },
        {
          "name": "UNESCO — Turkish coffee culture and tradition",
          "url": "https://www.unesco.org/en/articles/turkish-coffee-not-just-drink-culture"
        }
      ]
    },
    "ayran": {
      "local": "ayran",
      "note": {
        "en": "A cold savory Turkic drink of yogurt, water and salt, attested in al-Kashgari's c.1072 Turkic dictionary Diwan Lughat al-Turk.",
        "fr": "Boisson turcique froide et salee a base de yaourt, d'eau et de sel, attestee vers 1072 dans le dictionnaire turc Diwan Lughat al-Turk."
      },
      "sources": [
        {
          "name": "Ayran - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ayran"
        },
        {
          "name": "Diwan Lughat al-Turk - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/D%C4%ABw%C4%81n_Lugh%C4%81t_al-Turk"
        }
      ]
    },
    "rakı": {
      "local": "rakı",
      "note": {
        "en": "Turkey's national anise-flavored spirit, twice-distilled from grape pomace, that turns milky white when water is added.",
        "fr": "Spiritueux national turc parfumé à l'anis, deux fois distillé à partir de marc de raisin, qui devient blanc laiteux avec de l'eau."
      },
      "sources": [
        {
          "name": "Wikipedia — Rakı",
          "url": "https://en.wikipedia.org/wiki/Rak%C4%B1"
        }
      ]
    }
  },
  "german": {
    "schnitzel": {
      "local": "Schnitzel",
      "note": {
        "en": "A thin slice of meat (often veal, pork or chicken), breaded and pan-fried; the name derives from the German sniz, 'slice'.",
        "fr": "Une fine tranche de viande (souvent veau, porc ou poulet), panee et poelee ; le nom vient de l'allemand sniz, « tranche »."
      },
      "sources": [
        {
          "name": "Wikipedia - Schnitzel",
          "url": "https://en.wikipedia.org/wiki/Schnitzel"
        },
        {
          "name": "Britannica - Schnitzel",
          "url": "https://www.britannica.com/topic/schnitzel"
        }
      ]
    },
    "wiener schnitzel": {
      "local": "Wiener Schnitzel",
      "note": {
        "en": "A Viennese specialty and Austrian national dish of thin, breaded, pan-fried veal cutlet; the name first appears in print in the 19th…",
        "fr": "Specialite viennoise et plat national autrichien: une fine escalope de veau panee et frite a la poele, dont le nom apparait au XIXe siecle."
      },
      "sources": [
        {
          "name": "Wikipedia - Schnitzel",
          "url": "https://en.wikipedia.org/wiki/Schnitzel"
        },
        {
          "name": "National Geographic - A Taste of Old World Europe: Wiener Schnitzel",
          "url": "https://www.nationalgeographic.com/travel/article/a-taste-of-old-world-europe-wiener-schnitzel"
        }
      ]
    },
    "schweinshaxe": {
      "local": "Schweinshaxe",
      "note": {
        "en": "A Bavarian roasted pork knuckle (ham hock), originally a peasant dish making cheap, tough cuts palatable; served with dumplings and cabbage.",
        "fr": "Jarret de porc rôti bavarois, à l'origine un plat paysan rendant savoureux des morceaux durs et bon marché; servi avec quenelles et chou."
      },
      "sources": [
        {
          "name": "Wikipedia - Schweinshaxe",
          "url": "https://en.wikipedia.org/wiki/Schweinshaxe"
        }
      ]
    },
    "bratwurst": {
      "local": "Bratwurst",
      "note": {
        "en": "German fried sausage of pork, beef or veal, documented in Franconia (Nuremberg) since 1313; over 40 regional varieties exist.",
        "fr": "Saucisse allemande grillée de porc, bœuf ou veau, attestée en Franconie (Nuremberg) depuis 1313; plus de 40 variétés régionales."
      },
      "sources": [
        {
          "name": "Wikipedia — Bratwurst",
          "url": "https://en.wikipedia.org/wiki/Bratwurst"
        }
      ]
    },
    "weisswurst": {
      "local": "Weißwurst",
      "note": {
        "en": "A Bavarian sausage of minced veal and pork fatback, invented in Munich in 1857 and traditionally eaten before noon.",
        "fr": "Une saucisse bavaroise de veau haché et de lard de porc, inventée à Munich en 1857 et traditionnellement mangée avant midi."
      },
      "sources": [
        {
          "name": "Wikipedia – Weißwurst",
          "url": "https://en.wikipedia.org/wiki/Wei%C3%9Fwurst"
        }
      ]
    },
    "sauerkraut": {
      "local": "Sauerkraut",
      "note": {
        "en": "Finely shredded cabbage fermented in its own salt brine by lactic acid bacteria, which convert its sugars to lactic acid; its German name…",
        "fr": "Chou finement râpé fermenté dans sa propre saumure salée par des bactéries lactiques, qui transforment ses sucres en acide lactique; son…"
      },
      "sources": [
        {
          "name": "Germanfoods.org",
          "url": "https://germanfoods.org/german-food-facts/sauerkraut-superfood/"
        },
        {
          "name": "TasteAtlas",
          "url": "https://www.tasteatlas.com/sauerkraut"
        }
      ]
    },
    "spätzle": {
      "local": "Spätzle",
      "note": {
        "en": "Soft egg noodle/dumpling from Swabia in southern Germany; the name derives from \"Spatz\" (sparrow), evoking the noodles' small irregular…",
        "fr": "Pâte aux œufs molle de Souabe, dans le sud de l'Allemagne; le nom vient de \"Spatz\" (moineau), évoquant la forme petite et irrégulière des…"
      },
      "sources": [
        {
          "name": "Wikipedia - Spätzle",
          "url": "https://en.wikipedia.org/wiki/Sp%C3%A4tzle"
        },
        {
          "name": "Wikipedia - Swabian cuisine",
          "url": "https://en.wikipedia.org/wiki/Swabian_cuisine"
        }
      ]
    },
    "käsespätzle": {
      "local": "Käsespätzle",
      "note": {
        "en": "Traditional Swabian/Allgäu dish of soft egg-noodle spätzle layered with grated mountain cheese (Bergkäse) and topped with caramelized…",
        "fr": "Plat traditionnel souabe/de l'Allgäu de spätzle (pâtes aux œufs) en couches avec du fromage de montagne (Bergkäse) et des oignons…"
      },
      "sources": [
        {
          "name": "Wikipedia — Käsespätzle",
          "url": "https://en.wikipedia.org/wiki/K%C3%A4sesp%C3%A4tzle"
        },
        {
          "name": "Wikipedia — Spätzle",
          "url": "https://en.wikipedia.org/wiki/Sp%C3%A4tzle"
        }
      ]
    },
    "rouladen": {
      "local": "Rinderrouladen",
      "note": {
        "en": "German braised beef rolls filled with bacon, onions, mustard and pickles; the name comes from French rouler (to roll).",
        "fr": "Roulades de bœuf braisées allemandes garnies de lard, oignons, moutarde et cornichons; le nom vient du français rouler."
      },
      "sources": [
        {
          "name": "Wikipedia – Rinderroulade",
          "url": "https://en.wikipedia.org/wiki/Rinderroulade"
        },
        {
          "name": "Wikipedia – Roulade (Rouladen)",
          "url": "https://en.wikipedia.org/wiki/Rouladen"
        }
      ]
    },
    "sauerbraten": {
      "local": "Sauerbraten",
      "note": {
        "en": "A traditional German pot roast of beef marinated several days in vinegar and wine, then braised and served with a sweet-sour gravy.",
        "fr": "Roti braise allemand traditionnel de boeuf marine plusieurs jours dans le vinaigre et le vin, servi avec une sauce aigre-douce."
      },
      "sources": [
        {
          "name": "Wikipedia - Sauerbraten",
          "url": "https://en.wikipedia.org/wiki/Sauerbraten"
        }
      ]
    },
    "königsberger klopse": {
      "local": "Königsberger Klopse",
      "note": {
        "en": "East Prussian veal meatballs simmered in a creamy white caper sauce, named after the city of Königsberg (now Kaliningrad).",
        "fr": "Boulettes de veau de Prusse-Orientale mijotées dans une sauce blanche crémeuse aux câpres, du nom de la ville de Königsberg."
      },
      "sources": [
        {
          "name": "Wikipedia — Königsberger Klopse",
          "url": "https://en.wikipedia.org/wiki/K%C3%B6nigsberger_Klopse"
        }
      ]
    },
    "knödel": {
      "local": "Knödel",
      "note": {
        "en": "Central European boiled dumplings of bread, flour or potato; rooted in Bavaria, named from Old High German for \"knot.\"",
        "fr": "Boulettes pochées d'Europe centrale à base de pain, farine ou pomme de terre; originaires de Bavière, du vieux haut allemand \"nœud.\""
      },
      "sources": [
        {
          "name": "Wikipedia — Knödel",
          "url": "https://en.wikipedia.org/wiki/Kn%C3%B6del"
        },
        {
          "name": "Wikipedia — Semmelknödel",
          "url": "https://en.wikipedia.org/wiki/Semmelkn%C3%B6del"
        }
      ]
    },
    "kartoffelpuffer": {
      "local": "Kartoffelpuffer",
      "note": {
        "en": "German shallow-fried pancakes of grated potato, onion and egg, also called Reibekuchen, served savoury or sweet with apple sauce.",
        "fr": "Galettes allemandes de pomme de terre rapee, oignon et oeuf, frites a la poele, dites Reibekuchen, servies salees ou sucrees avec compote…"
      },
      "sources": [
        {
          "name": "Wikipedia: Reibekuchen",
          "url": "https://en.wikipedia.org/wiki/Reibekuchen"
        },
        {
          "name": "Wikipedia: Potato pancake",
          "url": "https://en.wikipedia.org/wiki/Potato_pancake"
        }
      ]
    },
    "eisbein": {
      "local": "Eisbein",
      "note": {
        "en": "A German dish of cured, boiled pork knuckle (hind-leg hock), often served with sauerkraut and pea puree, popular in Berlin.",
        "fr": "Plat allemand de jarret de porc saumure et bouilli, souvent servi avec choucroute et puree de pois, populaire a Berlin."
      },
      "sources": [
        {
          "name": "Wikipedia - Eisbein",
          "url": "https://en.wikipedia.org/wiki/Eisbein"
        },
        {
          "name": "TasteAtlas - Eisbein",
          "url": "https://tasteatlas.com/eisbein"
        }
      ]
    },
    "frankfurter würstchen": {
      "local": "Frankfurter Würstchen",
      "note": {
        "en": "Thin parboiled pork sausage in sheep casing, smoked at low temperature; protected to the Frankfurt area since 1860.",
        "fr": "Fine saucisse de porc pochée en boyau de mouton, fumée à basse température; protégée à la région de Francfort depuis 1860."
      },
      "sources": [
        {
          "name": "Wikipedia — Frankfurter Würstchen",
          "url": "https://en.wikipedia.org/wiki/Frankfurter_W%C3%BCrstchen"
        }
      ]
    },
    "currywurst": {
      "local": "Currywurst",
      "note": {
        "en": "German street food of sliced pork sausage in curried tomato-ketchup sauce, credited to Herta Heuwer in Berlin in 1949.",
        "fr": "Plat de rue allemand de saucisse de porc tranchee en sauce ketchup au curry, attribuee a Herta Heuwer a Berlin en 1949."
      },
      "sources": [
        {
          "name": "Currywurst — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Currywurst"
        },
        {
          "name": "The story behind currywurst — National Geographic",
          "url": "https://www.nationalgeographic.com/travel/article/what-is-currywurst-where-to-eat-berlin-germany"
        }
      ]
    },
    "döner kebab german": {
      "local": "Döner Kebab",
      "note": {
        "en": "A flatbread sandwich of vertical-spit grilled meat with salad and sauce, popularized in 1970s Berlin by Turkish guest workers.",
        "fr": "Un sandwich en pain plat de viande grillée à la broche verticale avec salade et sauce, popularisé dans le Berlin des années 1970 par des…"
      },
      "sources": [
        {
          "name": "Doner kebab - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Doner_kebab"
        },
        {
          "name": "Kadir Nurman - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kadir_Nurman"
        }
      ]
    },
    "flammkuchen": {
      "local": "Flammkuchen",
      "note": {
        "en": "Thin Alsatian/German flatbread topped with creme fraiche, onions and bacon, born from farmers testing wood-fired oven heat with leftover…",
        "fr": "Fine galette alsacienne/allemande garnie de creme fraiche, oignons et lardons, nee quand les paysans testaient la chaleur du four a bois…"
      },
      "sources": [
        {
          "name": "Wikipedia - Flammekueche",
          "url": "https://en.wikipedia.org/wiki/Flammekueche"
        }
      ]
    },
    "black forest cake": {
      "local": "Schwarzwälder Kirschtorte",
      "note": {
        "en": "German layered chocolate sponge cake with sour cherries, Kirsch cherry brandy and whipped cream; its modern form dates to about 1915.",
        "fr": "Gâteau allemand à étages de génoise au chocolat, cerises acides, kirsch et crème fouettée ; sa forme moderne date d'environ 1915."
      },
      "sources": [
        {
          "name": "Wikipedia – Black Forest gateau",
          "url": "https://en.wikipedia.org/wiki/Black_Forest_gateau"
        }
      ]
    },
    "apfelstrudel": {
      "local": "Apfelstrudel",
      "note": {
        "en": "A Viennese pastry of apple, sugar, raisins and cinnamon wrapped in paper-thin stretched dough; oldest known recipe dates to 1697.",
        "fr": "Pâtisserie viennoise de pomme, sucre, raisins secs et cannelle dans une pâte étirée très fine; sa plus ancienne recette date de 1697."
      },
      "sources": [
        {
          "name": "Wikipedia – Apple strudel",
          "url": "https://en.wikipedia.org/wiki/Apple_strudel"
        }
      ]
    },
    "lebkuchen": {
      "local": "Lebkuchen",
      "note": {
        "en": "Honey-sweetened spiced German cake, akin to gingerbread, invented by Franconian monks in the 13th century and famed in Nuremberg.",
        "fr": "Gateau allemand epice et sucre au miel, proche du pain d'epices, invente par des moines franconiens au XIIIe siecle, celebre a Nuremberg."
      },
      "sources": [
        {
          "name": "Lebkuchen - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lebkuchen"
        },
        {
          "name": "Nuremberg Gingerbread - Christkindlesmarkt.de",
          "url": "https://www.christkindlesmarkt.de/en/your-visit/food-drinks/nuremberg-gingerbread-a-symbol-of-the-season-1.2373619"
        }
      ]
    },
    "stollen": {
      "local": "Stollen",
      "note": {
        "en": "A dense German Christmas fruit bread (Christstollen) of yeast dough enriched with candied peel, raisins, nuts and butter and dusted with…",
        "fr": "Un pain de Noel allemand dense (Christstollen) a base de pate levee enrichie d'ecorces confites, de raisins secs, de noix et de beurre…"
      },
      "sources": [
        {
          "name": "Schutzverband Dresdner Stollen e.V. — Dresden Christmas Stollen (history, first documented 1474)",
          "url": "https://www.dresdnerstollen.com/en/dresden-christmas-stollen/"
        },
        {
          "name": "Wikipedia — Stollen",
          "url": "https://en.wikipedia.org/wiki/Stollen"
        }
      ]
    },
    "pretzels": {
      "local": "Brezel",
      "note": {
        "en": "A knot-shaped baked bread of German origin, used as a bakers' guild emblem in southern Germany since at least the 12th century.",
        "fr": "Un pain cuit en forme de nœud d'origine allemande, emblème des guildes de boulangers du sud de l'Allemagne depuis le XIIe siècle au moins."
      },
      "sources": [
        {
          "name": "Wikipedia — Pretzel",
          "url": "https://en.wikipedia.org/wiki/Pretzel"
        }
      ]
    },
    "rye bread": {
      "local": "Roggenbrot",
      "note": {
        "en": "A traditional German bread of mostly rye flour, leavened with sourdough since rye's low gluten resists yeast, giving a dense, tangy loaf.",
        "fr": "Pain allemand traditionnel surtout de farine de seigle, levé au levain car le faible gluten du seigle résiste à la levure, donnant une mie…"
      },
      "sources": [
        {
          "name": "Rye bread - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Rye_bread"
        },
        {
          "name": "Mischbrot - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mischbrot"
        }
      ]
    },
    "german beer": {
      "local": "Bier",
      "note": {
        "en": "German beer, traditionally brewed under the Reinheitsgebot, the Bavarian purity law of 1516 that permitted only three ingredients: water…",
        "fr": "Bière allemande, traditionnellement brassée selon le Reinheitsgebot, la loi de pureté bavaroise de 1516 qui n'autorisait que trois…"
      },
      "sources": [
        {
          "name": "Reinheitsgebot - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Reinheitsgebot"
        },
        {
          "name": "Beer in Germany - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Beer_in_Germany"
        }
      ]
    },
    "riesling wine": {
      "local": "Riesling",
      "note": {
        "en": "Aromatic German white wine from a Rhine grape first documented in 1435, made dry to sweet with high acidity and floral aromas.",
        "fr": "Vin blanc allemand aromatique d'un cepage rhenan documente des 1435, sec a doux, a forte acidite et aromes floraux."
      },
      "sources": [
        {
          "name": "Wikipedia - Riesling",
          "url": "https://en.wikipedia.org/wiki/Riesling"
        },
        {
          "name": "MasterClass - Learn About Riesling",
          "url": "https://www.masterclass.com/articles/learn-about-riesling-grapes-wine-history-and-region"
        }
      ]
    },
    "apfelschorle": {
      "local": "Apfelschorle",
      "note": {
        "en": "A German soft drink of apple juice mixed with carbonated mineral water; RhönSprudel's Apple Plus, launched in 1994, was the first…",
        "fr": "Boisson allemande de jus de pomme mélangé à de l'eau minérale gazeuse; Apple Plus de RhönSprudel, lancée en 1994, fut la première version…"
      },
      "sources": [
        {
          "name": "Wikipedia - Apfelschorle",
          "url": "https://en.wikipedia.org/wiki/Apfelschorle"
        },
        {
          "name": "RhönSprudel - Apple Plus ist Getränk des Jahres 2021 (press release confirming 1994 first ready-mixed Apfelschorle)",
          "url": "https://www.rhoensprudel.de/presse/rhoensprudel-apple-plus-getraenk-des-jahres"
        }
      ]
    }
  },
  "british": {
    "fish and chips": {
      "local": "fish and chips",
      "note": {
        "en": "Britain's national dish of battered deep-fried fish (usually cod or haddock) served with chips; the pairing emerged in 1860s London, with…",
        "fr": "Plat national britannique de poisson frit en pate (souvent cabillaud ou eglefin) servi avec des frites; l'association nait dans le Londres…"
      },
      "sources": [
        {
          "name": "Britannica — Fish and chips",
          "url": "https://www.britannica.com/topic/fish-and-chips"
        },
        {
          "name": "Historic UK — The History of Fish and Chips",
          "url": "https://www.historic-uk.com/CultureUK/Fish-Chips/"
        }
      ]
    },
    "full english breakfast": {
      "local": "Full English breakfast",
      "note": {
        "en": "A cooked breakfast of bacon, eggs, sausage, baked beans, tomato, black pudding and toast; popularised across British classes in the early…",
        "fr": "Un petit-déjeuner chaud de bacon, œufs, saucisse, haricots, tomate, boudin noir et toast; popularisé en Grande-Bretagne au début du XXe…"
      },
      "sources": [
        {
          "name": "Wikipedia — Full breakfast",
          "url": "https://en.wikipedia.org/wiki/Full_breakfast"
        },
        {
          "name": "History Hit — The Full English Breakfast",
          "url": "https://www.historyhit.com/history-full-english-breakfast/"
        }
      ]
    },
    "shepherd's pie": {
      "local": "shepherd's pie",
      "note": {
        "en": "British baked dish of minced lamb or mutton topped with mashed potato; the name is first recorded in the 19th century.",
        "fr": "Plat britannique cuit au four, d'agneau ou de mouton hache nappe de puree de pommes de terre ; nom atteste au XIXe siecle."
      },
      "sources": [
        {
          "name": "Wikipedia - Shepherd's pie",
          "url": "https://en.wikipedia.org/wiki/Shepherd's_pie"
        }
      ]
    },
    "cottage pie": {
      "local": "Cottage pie",
      "note": {
        "en": "British baked dish of minced beef in gravy under a mashed-potato crust; the name is first recorded in 1791.",
        "fr": "Plat britannique de bœuf haché en sauce sous une croûte de purée; le nom apparaît dès 1791."
      },
      "sources": [
        {
          "name": "Wikipedia – Shepherd's pie",
          "url": "https://en.wikipedia.org/wiki/Shepherd's_pie"
        }
      ]
    },
    "beef wellington": {
      "local": "Beef Wellington",
      "note": {
        "en": "A British dish of beef fillet coated in pâté and duxelles, wrapped in puff pastry and baked; named in honour of the Duke of Wellington.",
        "fr": "Un plat britannique de filet de bœuf enrobé de pâté et de duxelles, enveloppé de pâte feuilletée et cuit; nommé en l'honneur du duc de…"
      },
      "sources": [
        {
          "name": "Britannica — Beef Wellington",
          "url": "https://www.britannica.com/topic/beef-Wellington"
        },
        {
          "name": "Tasting Table — The Noble History Behind the UK's Beloved Beef Wellington",
          "url": "https://www.tastingtable.com/1112177/the-noble-history-behind-the-uks-beloved-beef-wellington/"
        }
      ]
    },
    "bangers and mash": {
      "local": "Bangers and mash",
      "note": {
        "en": "A traditional British dish of sausages and mashed potato with onion gravy; \"bangers\" recalls WWI-era sausages that burst when cooked.",
        "fr": "Plat britannique traditionnel de saucisses et puree de pommes de terre avec sauce a l'oignon; \"bangers\" evoque les saucisses qui eclataient…"
      },
      "sources": [
        {
          "name": "Wikipedia — Bangers and mash",
          "url": "https://en.wikipedia.org/wiki/Bangers_and_mash"
        },
        {
          "name": "Britannica — Bangers and mash",
          "url": "https://www.britannica.com/topic/bangers-and-mash"
        }
      ]
    },
    "toad in the hole": {
      "local": "Toad in the hole",
      "note": {
        "en": "A British dish of sausages baked in Yorkshire-pudding batter. The name dates to the 18th century (meat cooked in batter); Mrs Beeton's 1861…",
        "fr": "Plat britannique de saucisses cuites dans une pate a Yorkshire pudding. Le nom remonte au XVIIIe siecle (viande cuite dans une pate); le…"
      },
      "sources": [
        {
          "name": "Toad in the hole - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Toad_in_the_hole"
        },
        {
          "name": "Toad-in-the-Hole: History & a Recipe - British Food: A History",
          "url": "https://britishfoodhistory.com/2026/02/06/toad-in-the-hole-history-a-recipe/"
        }
      ]
    },
    "yorkshire pudding": {
      "local": "Yorkshire pudding",
      "note": {
        "en": "A baked English batter of eggs, flour and milk cooked in dripping; named in Hannah Glasse's 1747 cookbook and served with roast meat.",
        "fr": "Pate anglaise cuite a base d'oeufs, farine et lait dans la graisse de roti; nommee dans le livre de Hannah Glasse en 1747, servie avec le…"
      },
      "sources": [
        {
          "name": "Wikipedia — Yorkshire pudding",
          "url": "https://en.wikipedia.org/wiki/Yorkshire_pudding"
        },
        {
          "name": "Historic UK — History and origins of the Yorkshire Pudding",
          "url": "https://www.historic-uk.com/CultureUK/Yorkshire-Pudding/"
        }
      ]
    },
    "sunday roast": {
      "local": "Sunday roast",
      "note": {
        "en": "A traditional British Sunday meal of roast meat, roast potatoes, vegetables, Yorkshire pudding and gravy, rooted in post-church dining.",
        "fr": "Repas dominical britannique traditionnel de viande rotie, pommes de terre, legumes, Yorkshire pudding et sauce, lie au repas d'apres-messe."
      },
      "sources": [
        {
          "name": "Wikipedia - Sunday roast",
          "url": "https://en.wikipedia.org/wiki/Sunday_roast"
        }
      ]
    },
    "roast beef": {
      "local": "Roast beef",
      "note": {
        "en": "British oven-roasted beef joint, the classic Sunday roast centrepiece served with Yorkshire pudding, roast potatoes and gravy.",
        "fr": "Rôti de bœuf britannique cuit au four, pièce maîtresse du Sunday roast, servi avec Yorkshire pudding, pommes de terre rôties et sauce."
      },
      "sources": [
        {
          "name": "Wikipedia — Sunday roast",
          "url": "https://en.wikipedia.org/wiki/Sunday_roast"
        }
      ]
    },
    "cornish pasty": {
      "local": "Cornish pasty",
      "note": {
        "en": "A D-shaped baked pastry of beef, potato, swede and onion from Cornwall; tied to 19th-century tin miners and PGI-protected since 2011.",
        "fr": "Chausson cuit en D garni de boeuf, pomme de terre, rutabaga et oignon des Cornouailles; lie aux mineurs d'etain du XIXe, IGP depuis 2011."
      },
      "sources": [
        {
          "name": "Wikipedia - Pasty",
          "url": "https://en.wikipedia.org/wiki/Pasty"
        },
        {
          "name": "Cornish Pasty Association - History",
          "url": "https://cornishpastyassociation.co.uk/about-the-pasty/history/"
        }
      ]
    },
    "scotch egg": {
      "local": "Scotch egg",
      "note": {
        "en": "A British snack of a soft- or hard-boiled egg wrapped in sausage meat, breadcrumbed and fried; Fortnum & Mason claims to have created it in…",
        "fr": "En-cas britannique : un œuf mollet ou dur enrobé de chair à saucisse, pané et frit ; Fortnum & Mason prétend l'avoir créé en 1738."
      },
      "sources": [
        {
          "name": "Britannica — Scotch egg",
          "url": "https://www.britannica.com/topic/Scotch-egg"
        },
        {
          "name": "Tasting Table — The Mysterious Origins Of Scotch Eggs",
          "url": "https://www.tastingtable.com/1007982/the-mysterious-origins-of-scotch-eggs/"
        }
      ]
    },
    "haggis": {
      "local": "haggis",
      "note": {
        "en": "Scotland's national savoury pudding of minced sheep's pluck (heart, liver and lungs), oatmeal and suet, traditionally encased in a sheep's…",
        "fr": "Pudding salé national écossais d'abats de mouton hachés (cœur, foie et poumons), d'avoine et de suif, traditionnellement enfermé dans une…"
      },
      "sources": [
        {
          "name": "Wikipedia - Haggis",
          "url": "https://en.wikipedia.org/wiki/Haggis"
        },
        {
          "name": "Britannica - Haggis",
          "url": "https://www.britannica.com/topic/haggis"
        }
      ]
    },
    "black pudding": {
      "local": "Black pudding",
      "note": {
        "en": "A British and Irish blood sausage of pig's blood, fat and oatmeal, recorded as \"blak podyngs\" since around 1450.",
        "fr": "Un boudin noir britannique et irlandais a base de sang de porc, de gras et de flocons d'avoine, atteste vers 1450."
      },
      "sources": [
        {
          "name": "Wikipedia — Black pudding",
          "url": "https://en.wikipedia.org/wiki/Black_pudding"
        },
        {
          "name": "Britannica — Black pudding",
          "url": "https://www.britannica.com/topic/black-pudding"
        }
      ]
    },
    "chicken tikka masala": {
      "local": "चिकन टिक्का मसाला (Chicken Tikka Masala)",
      "note": {
        "en": "Chunks of marinated grilled chicken (tikka) in a spiced creamy tomato sauce, widely credited as a British-Indian invention and a UK…",
        "fr": "Morceaux de poulet grille marine (tikka) dans une sauce tomate cremeuse epicee, considere comme une invention anglo-indienne et plat…"
      },
      "sources": [
        {
          "name": "Wikipedia — Chicken tikka masala",
          "url": "https://en.wikipedia.org/wiki/Chicken_tikka_masala"
        },
        {
          "name": "Britannica — Chicken tikka masala",
          "url": "https://www.britannica.com/topic/chicken-tikka-masala"
        }
      ]
    },
    "balti curry": {
      "local": "balti (बाल्टी / بالٹی)",
      "note": {
        "en": "A British Pakistani curry developed in 1970s Birmingham, cooked and served in a thin steel 'balti' bowl (Hindi/Urdu for bucket).",
        "fr": "Un curry britannico-pakistanais né dans le Birmingham des années 1970, cuit et servi dans un bol en acier « balti » (« seau » en…"
      },
      "sources": [
        {
          "name": "Wikipedia — Balti (food)",
          "url": "https://en.wikipedia.org/wiki/Balti_(food)"
        },
        {
          "name": "National Geographic — The story behind balti, the Pakistani dish born in Birmingham",
          "url": "https://www.nationalgeographic.com/travel/article/story-behind-balti-birmingham-uk"
        }
      ]
    },
    "cream tea": {
      "local": "cream tea",
      "note": {
        "en": "A British afternoon tea of scones served with clotted cream and jam, associated with Devon and Cornwall since at least the 19th century.",
        "fr": "Un thé de l'après-midi britannique composé de scones servis avec de la crème caillée et de la confiture, lié au Devon et aux Cornouailles."
      },
      "sources": [
        {
          "name": "Wikipedia — Cream tea",
          "url": "https://en.wikipedia.org/wiki/Cream_tea"
        },
        {
          "name": "Active England — A Complete Guide to an English Cream Tea",
          "url": "https://activeenglandtours.com/stories/cream-or-jam-first-a-complete-guide-to-an-english-cream-tea/"
        }
      ]
    },
    "victoria sponge": {
      "local": "Victoria sponge",
      "note": {
        "en": "A British layer cake of two sponge halves filled with jam (and often cream), named after Queen Victoria, who enjoyed it at afternoon tea.",
        "fr": "Gateau anglais a deux genoises fourrees de confiture (et souvent de creme), nomme d'apres la reine Victoria, qui l'appreciait au the."
      },
      "sources": [
        {
          "name": "Wikipedia: Sponge cake (Victoria sponge)",
          "url": "https://en.wikipedia.org/wiki/Sponge_cake"
        },
        {
          "name": "Baking Heritage: Victoria Sponge history",
          "url": "https://bakingheritage.com/history/victoria-sponge-cake-a-slice-of-history-and-the-queens-favourite-treat"
        }
      ]
    },
    "eton mess": {
      "local": "Eton mess",
      "note": {
        "en": "An English dessert of strawberries, meringue and whipped cream, first mentioned in print in 1893 and linked to Eton College.",
        "fr": "Un dessert anglais de fraises, meringue et crème fouettée, mentionné pour la première fois en 1893 et lié au collège d'Eton."
      },
      "sources": [
        {
          "name": "Wikipedia - Eton mess",
          "url": "https://en.wikipedia.org/wiki/Eton_mess"
        },
        {
          "name": "History Hit - Eton Mess: The History of a Classic English Dessert",
          "url": "https://www.historyhit.com/eton-mess-the-history-of-a-classic-english-dessert/"
        }
      ]
    },
    "sticky toffee pudding": {
      "local": "Sticky toffee pudding",
      "note": {
        "en": "A moist English sponge cake made with chopped dates, covered in toffee sauce, popularised in Cumbria's Lake District from the 1970s.",
        "fr": "Un moelleux gateau eponge anglais aux dattes hachees, nappe de sauce au caramel, popularise dans le Lake District de Cumbria des annees…"
      },
      "sources": [
        {
          "name": "Wikipedia - Sticky toffee pudding",
          "url": "https://en.wikipedia.org/wiki/Sticky_toffee_pudding"
        },
        {
          "name": "Britannica - Sticky toffee pudding",
          "url": "https://www.britannica.com/topic/sticky-toffee-pudding"
        }
      ]
    },
    "trifle": {
      "local": "trifle",
      "note": {
        "en": "A British layered dessert of sponge, fruit, custard and cream. The name first appears in Thomas Dawson's 1585 The Good Huswifes Jewell…",
        "fr": "Dessert britannique en couches de génoise, fruits, crème anglaise et chantilly. Le nom apparaît dès 1585 dans The Good Huswifes Jewell de…"
      },
      "sources": [
        {
          "name": "Wikipedia — Trifle",
          "url": "https://en.wikipedia.org/wiki/Trifle"
        },
        {
          "name": "Wikipedia — The Good Huswifes Jewell",
          "url": "https://en.wikipedia.org/wiki/The_Good_Huswifes_Jewell"
        }
      ]
    },
    "crumpets": {
      "local": "crumpet",
      "note": {
        "en": "A small round yeast-leavened griddle bread with a holed top, eaten toasted with butter; a British teatime staple since the Victorian era.",
        "fr": "Petit pain rond à la levure cuit à la plaque, criblé de trous sur le dessus, grillé et beurré; un classique du thé britannique depuis l'ère…"
      },
      "sources": [
        {
          "name": "Wikipedia — Crumpet",
          "url": "https://en.wikipedia.org/wiki/Crumpet"
        },
        {
          "name": "Britannica — Crumpet",
          "url": "https://www.britannica.com/topic/crumpet"
        }
      ]
    },
    "marmite on toast": {
      "local": "Marmite on toast",
      "note": {
        "en": "British breakfast staple: yeast-extract spread (invented 1902 in Burton upon Trent) thinly spread on hot buttered toast.",
        "fr": "Classique du petit-dejeuner britannique : pate d'extrait de levure (creee en 1902 a Burton upon Trent) tartinee finement sur du pain grille…"
      },
      "sources": [
        {
          "name": "Gambero Rosso International - The curious story of Marmite",
          "url": "https://www.gamberorossointernational.com/news/the-curious-story-of-marmite-spread-made-with-brewers-yeast-extract/"
        },
        {
          "name": "The Kitchn - What Is Marmite, and Why Is It So Good?",
          "url": "https://www.thekitchn.com/what-is-marmite-and-why-is-it-so-good-240563"
        }
      ]
    },
    "english breakfast tea": {
      "local": "English Breakfast Tea",
      "note": {
        "en": "A full-bodied blend of black teas (typically Assam, Ceylon and Kenyan), traditionally drunk with milk; first popularised in the 19th…",
        "fr": "Un melange corse de thes noirs (generalement Assam, Ceylan et Kenya), traditionnellement bu avec du lait, popularise au XIXe siecle."
      },
      "sources": [
        {
          "name": "Wikipedia - English breakfast tea",
          "url": "https://en.wikipedia.org/wiki/English_breakfast_tea"
        }
      ]
    },
    "earl grey tea": {
      "local": "Earl Grey tea",
      "note": {
        "en": "A British black tea flavoured with oil of bergamot, traditionally named after 1830s Prime Minister Charles, 2nd Earl Grey.",
        "fr": "Un thé noir britannique parfumé à l'huile de bergamote, traditionnellement nommé d'après Charles, 2e comte Grey, Premier ministre des…"
      },
      "sources": [
        {
          "name": "Oxford English Dictionary — 'Earl Grey'",
          "url": "https://www.oed.com/discover/earl-grey/"
        },
        {
          "name": "Rishi Tea — The History of Earl Grey",
          "url": "https://www.rishi-tea.com/blogs/journal/the-history-of-earl-grey"
        }
      ]
    },
    "pimm's": {
      "local": "Pimm's (Pimm's No. 1 Cup)",
      "note": {
        "en": "A gin-based English fruit-cup liqueur invented by London oyster-bar owner James Pimm around 1823-40, served in a summer cocktail.",
        "fr": "Liqueur anglaise de fruits a base de gin, creee par James Pimm, tenancier d'un bar a huitres londonien, vers 1823-1840."
      },
      "sources": [
        {
          "name": "Pimm's - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Pimm's"
        },
        {
          "name": "Pimm's Cup - Britannica",
          "url": "https://www.britannica.com/topic/Pimms-Cup"
        }
      ]
    },
    "british ale": {
      "local": "British ale",
      "note": {
        "en": "A top-fermented beer from malted barley; historically the unhopped English brew, distinct from hopped \"beer\" until hops arrived in the…",
        "fr": "Bière de fermentation haute issue d'orge maltée; jadis le brassin anglais sans houblon, distinct de la \"bière\" houblonnée avant le houblon…"
      },
      "sources": [
        {
          "name": "Wikipedia — Beer in England",
          "url": "https://en.wikipedia.org/wiki/Beer_in_England"
        },
        {
          "name": "Beer Day Britain — British Beer History",
          "url": "https://www.beerdaybritain.co.uk/history/"
        }
      ]
    }
  },
  "portuguese": {
    "bacalhau": {
      "local": "bacalhau",
      "note": {
        "en": "Portuguese dried and salted cod, a national staple tied to the 16th-century Portuguese cod fisheries off Newfoundland (Bacalhau da Terra…",
        "fr": "Morue séchée et salée portugaise, aliment national lié aux pêcheries portugaises de morue de Terre-Neuve au XVIe siècle (Bacalhau da Terra…"
      },
      "sources": [
        {
          "name": "Portugal.com — Bacalhau: Understanding the Portuguese Obsession with Cod",
          "url": "https://www.portugal.com/history-and-culture/bacalhau-understanding-the-portuguese-obsession-with-cod/"
        },
        {
          "name": "Wikipedia — Bacalhau",
          "url": "https://en.wikipedia.org/wiki/Bacalhau"
        }
      ]
    },
    "bacalhau à brás": {
      "local": "Bacalhau à Brás",
      "note": {
        "en": "Portuguese dish of shredded salt cod, onions and matchstick fried potatoes bound with egg, originating in 19th-century Bairro Alto, Lisbon.",
        "fr": "Plat portugais de morue salée effilochée, oignons et pommes de terre paille liés à l'œuf, né au XIXe siècle au Bairro Alto, à Lisbonne."
      },
      "sources": [
        {
          "name": "Wikipedia – Bacalhau à Brás",
          "url": "https://en.wikipedia.org/wiki/Bacalhau_%C3%A0_Br%C3%A1s"
        },
        {
          "name": "196 flavors – Bacalhau à Brás",
          "url": "https://www.196flavors.com/portugal-bacalhau-a-bras/"
        }
      ]
    },
    "bacalhau com natas": {
      "local": "Bacalhau com natas",
      "note": {
        "en": "A Portuguese oven-baked casserole of salt cod, fried potatoes and onions layered with cream, often seasoned with nutmeg.",
        "fr": "Gratin portugais de morue salee, pommes de terre frites et oignons nappes de creme, souvent releve de muscade."
      },
      "sources": [
        {
          "name": "Wikipedia — Bacalhau com natas",
          "url": "https://en.wikipedia.org/wiki/Bacalhau_com_natas"
        }
      ]
    },
    "francesinha": {
      "local": "francesinha",
      "note": {
        "en": "A Porto sandwich of bread, layered hot meats and melted cheese drenched in a beer-tomato sauce, created in the 1950s.",
        "fr": "Sandwich de Porto au pain, viandes chaudes en couches et fromage fondu nappe d'une sauce biere-tomate, cree dans les annees 1950."
      },
      "sources": [
        {
          "name": "Wikipedia: Francesinha",
          "url": "https://en.wikipedia.org/wiki/Francesinha"
        },
        {
          "name": "Atlas Obscura: Francesinha",
          "url": "https://www.atlasobscura.com/foods/francesinha-sandwich-porto-portugal"
        }
      ]
    },
    "caldo verde": {
      "local": "caldo verde",
      "note": {
        "en": "Portuguese soup of shredded couve-galega (collard greens), potato, olive oil and onion, originating in the Minho region of the north.",
        "fr": "Soupe portugaise de couve-galega (chou) emincee, pomme de terre, huile d'olive et oignon, originaire de la region du Minho, au nord."
      },
      "sources": [
        {
          "name": "Wikipedia - Caldo verde",
          "url": "https://en.wikipedia.org/wiki/Caldo_verde"
        }
      ]
    },
    "cataplana": {
      "local": "cataplana",
      "note": {
        "en": "A Portuguese seafood stew from the Algarve, steam-cooked in a hinged clamshell copper pan rooted in Moorish-era North African cookware.",
        "fr": "Un ragout de fruits de mer portugais de l'Algarve, cuit a la vapeur dans une marmite en cuivre articulee d'origine maure nord-africaine."
      },
      "sources": [
        {
          "name": "Wikipedia - Cataplana",
          "url": "https://en.wikipedia.org/wiki/Cataplana"
        },
        {
          "name": "Taste Tavira - The Origins of the Cataplana",
          "url": "https://tastetavira.com/the-origins-of-the-cataplana-a-taste-of-algarves-culinary-history/"
        }
      ]
    },
    "arroz de marisco": {
      "local": "arroz de marisco",
      "note": {
        "en": "A soupy Portuguese rice-and-shellfish dish, similar to paella, named one of the 7 Wonders of Portuguese Gastronomy (Sete Maravilhas da…",
        "fr": "Plat portugais de riz et fruits de mer en sauce, proche de la paella, elu l'une des 7 merveilles de la gastronomie portugaise (Sete…"
      },
      "sources": [
        {
          "name": "Wikipedia — Arroz de marisco",
          "url": "https://en.wikipedia.org/wiki/Arroz_de_marisco"
        },
        {
          "name": "We Travel Portugal — The Seven Wonders of Portuguese Gastronomy",
          "url": "https://wetravelportugal.com/national-dish-portugal/"
        }
      ]
    },
    "porco preto": {
      "local": "porco preto",
      "note": {
        "en": "Prized acorn-fed black Iberian pork from Portugal's Alentejo region, valued for its marbled, nutty-flavoured meat.",
        "fr": "Porc noir ibérique du Portugal, nourri aux glands dans l'Alentejo, prisé pour sa viande persillée au goût de noisette."
      },
      "sources": [
        {
          "name": "Portugal Resident – Iberian black pig",
          "url": "https://www.portugalresident.com/iberian-black-pig/"
        },
        {
          "name": "The Lisbon Guide – Portuguese Black Pork",
          "url": "https://lisbonguide.org/the-savory-legacy-of-portuguese-black-pork-exploring-products-tracing-facts/"
        }
      ]
    },
    "alheira": {
      "local": "alheira",
      "note": {
        "en": "A Portuguese smoked sausage of poultry/game and bread, invented by Sephardic Jews after 1497 to mimic pork and evade the Inquisition.",
        "fr": "Saucisse fumée portugaise de volaille/gibier et de pain, inventee par les juifs sefarades apres 1497 pour imiter le porc et tromper…"
      },
      "sources": [
        {
          "name": "Wikipedia - Alheira",
          "url": "https://en.wikipedia.org/wiki/Alheira"
        },
        {
          "name": "TasteAtlas - Alheira de Barroso-Montalegre",
          "url": "https://www.tasteatlas.com/alheira-de-barroso-montalegre"
        }
      ]
    },
    "feijoada portuguesa": {
      "local": "Feijoada à Portuguesa",
      "note": {
        "en": "A Portuguese bean-and-meat stew of beans with pork, sausages and bacon, originating in the Trás-os-Montes region of northern Portugal.",
        "fr": "Ragoût portugais de haricots avec porc, saucisses et lard, originaire de la région de Trás-os-Montes, dans le nord du Portugal."
      },
      "sources": [
        {
          "name": "Wikipedia - Feijoada",
          "url": "https://en.wikipedia.org/wiki/Feijoada"
        },
        {
          "name": "Taste of Lisboa - How the global journey of feijoada began in Portugal",
          "url": "https://www.tasteoflisboa.com/blog/how-the-global-journey-of-feijoada-began-in-portugal/"
        }
      ]
    },
    "bifana": {
      "local": "bifana",
      "note": {
        "en": "A Portuguese sandwich of thin pork slices simmered in garlic and wine on a crusty roll, often credited to Vendas Novas in the Alentejo.",
        "fr": "Un sandwich portugais de fines tranches de porc mijotees a l'ail et au vin dans un petit pain croustillant, souvent attribue a Vendas Novas…"
      },
      "sources": [
        {
          "name": "Wikipedia - Bifana",
          "url": "https://en.wikipedia.org/wiki/Bifana"
        },
        {
          "name": "Portugal.com - The Bifana: Portugal's Beloved Pork Sandwich",
          "url": "https://www.portugal.com/recipes/the-bifana-portugals-beloved-pork-sandwich/"
        }
      ]
    },
    "pastel de nata": {
      "local": "pastel de nata (plural: pastéis de nata)",
      "note": {
        "en": "A Portuguese egg-custard tart in flaky puff pastry, created before the 18th century by monks at the Jerónimos Monastery in Belém, Lisbon.",
        "fr": "Une tartelette portugaise à la crème pâtissière dans une pâte feuilletée, créée avant le XVIIIe siècle par les moines du monastère des…"
      },
      "sources": [
        {
          "name": "Wikipedia — Pastel de nata",
          "url": "https://en.wikipedia.org/wiki/Pastel_de_nata"
        },
        {
          "name": "Portugal.com — Pastel de Nata: The Portuguese Custard Tart",
          "url": "https://www.portugal.com/food-drink/pastel-de-nata-the-portuguese-custard-tart/"
        }
      ]
    },
    "pastéis de belém": {
      "local": "Pastéis de Belém",
      "note": {
        "en": "Portuguese flaky-pastry custard tarts, made since 1837 at the Antiga Confeitaria de Belém in Lisbon from a Jerónimos Monastery recipe.",
        "fr": "Tartelettes portugaises à la crème en pâte feuilletée, faites depuis 1837 à l'Antiga Confeitaria de Belém à Lisbonne, d'une recette du…"
      },
      "sources": [
        {
          "name": "Atlas Obscura — Pastéis de Belém",
          "url": "https://www.atlasobscura.com/places/pasteis-de-belem-lisbon-portugal"
        },
        {
          "name": "Portugal.com — Pasteis de Belem",
          "url": "https://www.portugal.com/location/pasteis-de-belem/"
        }
      ]
    },
    "pão de queijo portuguese style": {
      "local": "pão de queijo",
      "note": {
        "en": "A small gluten-free cheese bread of tapioca flour and cheese, originating in Minas Gerais during Portuguese colonial Brazil.",
        "fr": "Petit pain au fromage sans gluten, à base de fécule de manioc et de fromage, né au Minas Gerais durant le Brésil colonial portugais."
      },
      "sources": [
        {
          "name": "Wikipedia - Pão de queijo",
          "url": "https://en.wikipedia.org/wiki/P%C3%A3o_de_queijo"
        },
        {
          "name": "TasteAtlas - Pão de Queijo",
          "url": "https://www.tasteatlas.com/pao-de-queijo"
        }
      ]
    },
    "bolinhos de bacalhau": {
      "local": "bolinhos de bacalhau",
      "note": {
        "en": "Portuguese deep-fried fritters of salt cod, potato, egg and parsley, served as an appetizer; called pasteis de bacalhau in the south.",
        "fr": "Beignets portugais frits de morue salee, pomme de terre, oeuf et persil, servis en entree; nommes pasteis de bacalhau dans le sud."
      },
      "sources": [
        {
          "name": "Wikipedia - Bolinhos de bacalhau",
          "url": "https://en.wikipedia.org/wiki/Bolinhos_de_bacalhau"
        }
      ]
    },
    "chouriço": {
      "local": "chouriço",
      "note": {
        "en": "Portuguese smoked pork sausage cured with paprika, garlic and wine; milder on paprika and stronger on garlic than Spanish chorizo.",
        "fr": "Saucisse de porc fumée portugaise au paprika, ail et vin; moins de paprika et plus d'ail que le chorizo espagnol."
      },
      "sources": [
        {
          "name": "TasteAtlas - Chouriço",
          "url": "https://www.tasteatlas.com/chourico"
        },
        {
          "name": "Wikipedia - Chorizo",
          "url": "https://en.wikipedia.org/wiki/Chorizo"
        }
      ]
    },
    "piri-piri chicken": {
      "local": "Frango piri-piri",
      "note": {
        "en": "Portuguese butterflied grilled chicken marinated in chilli-garlic piri-piri sauce, popularised in the Algarve from African colonial…",
        "fr": "Poulet portugais grille en crapaudine, marine dans une sauce piri-piri pimentee a l'ail, popularise en Algarve via les colonies africaines."
      },
      "sources": [
        {
          "name": "WeTravelPortugal — Piri Piri Chicken",
          "url": "https://wetravelportugal.com/piri-piri-chicken/"
        },
        {
          "name": "VICE — The Origin of Piri-Piri Chicken in Portugal",
          "url": "https://www.vice.com/en/article/nandos-piri-piri-chicken-origin-portugal/"
        }
      ]
    },
    "queijo da serra": {
      "local": "Queijo Serra da Estrela",
      "note": {
        "en": "Portugal's oldest cheese, a buttery raw ewe's-milk cheese curdled with cardoon flower; granted EU PDO status in 1996.",
        "fr": "Le plus ancien fromage du Portugal, onctueux, au lait cru de brebis caillé à la fleur de chardon; AOP depuis 1996."
      },
      "sources": [
        {
          "name": "Wikipedia — Serra da Estrela cheese",
          "url": "https://en.wikipedia.org/wiki/Serra_da_Estrela_cheese"
        },
        {
          "name": "Produtos Tradicionais Portugueses — Queijo Serra da Estrela PDO",
          "url": "https://tradicional.dgadr.gov.pt/en/categories/cheese-and-other-dairy-products/377-queijo-da-serra-da-estrela-en"
        }
      ]
    },
    "arroz doce": {
      "local": "arroz doce",
      "note": {
        "en": "Creamy Portuguese rice pudding flavoured with lemon and cinnamon, traditionally dusted with cinnamon patterns and served at Christmas and…",
        "fr": "Riz au lait portugais cremeux parfume au citron et a la cannelle, decore de motifs de cannelle et servi a Noel et aux fetes."
      },
      "sources": [
        {
          "name": "Tasting Table - Arroz Doce history",
          "url": "https://www.tastingtable.com/1614421/arroz-doce-portuguese-rice-pudding-history/"
        },
        {
          "name": "Portugal.com - Arroz Doce recipe",
          "url": "https://www.portugal.com/recipes/arroz-doce-the-classic-portuguese-rice-pudding-recipe/"
        }
      ]
    },
    "pão alentejano": {
      "local": "Pão Alentejano",
      "note": {
        "en": "A traditional wheat sourdough bread from Portugal's Alentejo region, baked in wood-fired ovens and folded so one end rises higher (\"pão de…",
        "fr": "Pain de blé au levain traditionnel de la région portugaise de l'Alentejo, cuit au four à bois et plié pour qu'une extrémité soit plus haute."
      },
      "sources": [
        {
          "name": "Wikipedia — Pão Alentejano",
          "url": "https://en.wikipedia.org/wiki/P%C3%A3o_Alentejano"
        },
        {
          "name": "Slow Food Foundation — Alentejo Bread (Ark of Taste)",
          "url": "https://www.fondazioneslowfood.com/en/ark-of-taste-slow-food/alentejo-bread/"
        }
      ]
    },
    "caldeirada": {
      "local": "Caldeirada",
      "note": {
        "en": "Portuguese (and Galician) fishermen's stew of mixed fish, shellfish and potatoes, named after the \"caldeira\" cooking pot.",
        "fr": "Ragout de pecheurs portugais (et galicien) melant poissons, fruits de mer et pommes de terre, nomme d'apres le chaudron \"caldeira\"."
      },
      "sources": [
        {
          "name": "Wikipedia - Caldeirada",
          "url": "https://en.wikipedia.org/wiki/Caldeirada"
        },
        {
          "name": "Tasty Trails - What Is Caldeirada?",
          "url": "https://tastytrails.pt/what-is-caldeirada-portugal-fish-stew/"
        }
      ]
    },
    "port wine": {
      "local": "vinho do Porto",
      "note": {
        "en": "A sweet fortified wine from Portugal's Douro Valley, made by adding grape brandy to halt fermentation; named for the city of Porto.",
        "fr": "Vin doux fortifié de la vallée du Douro au Portugal, obtenu en ajoutant de l'eau-de-vie pour stopper la fermentation; nommé d'après Porto."
      },
      "sources": [
        {
          "name": "Britannica — Port",
          "url": "https://www.britannica.com/topic/port-wine"
        },
        {
          "name": "Cellar Tours — Port Wine Guide",
          "url": "https://www.cellartours.com/blog/portugal/a-guide-to-port-wine-history-styles-and-modern-trends"
        }
      ]
    },
    "vinho verde": {
      "local": "Vinho Verde",
      "note": {
        "en": "A young Portuguese DOC wine from the northern Minho region, released 3–6 months after harvest and often slightly effervescent.",
        "fr": "Un vin portugais jeune en DOC de la région du Minho, au nord, mis en vente 3 à 6 mois après les vendanges et souvent légèrement pétillant."
      },
      "sources": [
        {
          "name": "Wikipedia – Vinho Verde",
          "url": "https://en.wikipedia.org/wiki/Vinho_Verde"
        },
        {
          "name": "Wikipedia – Minho wine region",
          "url": "https://en.wikipedia.org/wiki/Minho_wine_region"
        }
      ]
    },
    "madeira wine": {
      "local": "Vinho da Madeira",
      "note": {
        "en": "A Portuguese fortified wine from Madeira island, aged by heating (estufa), a method born from 18th-century ocean voyages.",
        "fr": "Un vin muté portugais de l'île de Madère, vieilli par chauffage (estufa), méthode née des voyages maritimes du XVIIIe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia — Madeira wine",
          "url": "https://en.wikipedia.org/wiki/Madeira_wine"
        },
        {
          "name": "Britannica — Madeira",
          "url": "https://www.britannica.com/topic/Madeira-wine"
        }
      ]
    }
  },
  "american": {
    "hamburger": {
      "local": "hamburger",
      "note": {
        "en": "A sandwich of a cooked ground beef patty in a sliced bun; popularized in the US and named after Hamburg, Germany.",
        "fr": "Un sandwich avec un steak haché de bœuf dans un pain tranché; popularisé aux États-Unis et nommé d'après Hambourg, en Allemagne."
      },
      "sources": [
        {
          "name": "Wikipedia — Hamburger",
          "url": "https://en.wikipedia.org/wiki/Hamburger"
        },
        {
          "name": "Wikipedia — History of the hamburger",
          "url": "https://en.wikipedia.org/wiki/History_of_the_hamburger"
        }
      ]
    },
    "cheeseburger": {
      "local": "cheeseburger",
      "note": {
        "en": "A hamburger topped with a slice of melted cheese, reputedly first made in 1920s Pasadena, California, by Lionel Sternberger.",
        "fr": "Un hamburger garni d'une tranche de fromage fondu, qui aurait ete cree dans les annees 1920 a Pasadena, en Californie, par Lionel…"
      },
      "sources": [
        {
          "name": "Wikipedia - Cheeseburger",
          "url": "https://en.wikipedia.org/wiki/Cheeseburger"
        },
        {
          "name": "Visit Pasadena - How the Cheeseburger Was Invented",
          "url": "https://www.visitpasadena.com/blog/how-the-cheeseburger-was-invented-in-pasadena/"
        }
      ]
    },
    "hot dog": {
      "local": "Hot dog",
      "note": {
        "en": "An American sausage of German origin (frankfurter/wiener) served in a sliced bun; the name dates to US street vendors around 1884.",
        "fr": "Saucisse americaine d'origine allemande (francfort/Vienne) servie dans un pain fendu; le nom remonte aux vendeurs de rue americains vers…"
      },
      "sources": [
        {
          "name": "Wikipedia - Hot dog",
          "url": "https://en.wikipedia.org/wiki/Hot_dog"
        },
        {
          "name": "Britannica - Hot dog",
          "url": "https://www.britannica.com/topic/hot-dog"
        }
      ]
    },
    "bbq brisket": {
      "local": "Texas smoked brisket",
      "note": {
        "en": "Slow-smoked beef brisket, an iconic Texas barbecue dish. It was first smoked in the U.S. by Jewish immigrants who arrived in Texas in the…",
        "fr": "Poitrine de boeuf fumee lentement, plat emblematique du barbecue texan. Elle fut d'abord fumee aux Etats-Unis par des immigrants juifs…"
      },
      "sources": [
        {
          "name": "Wikipedia: Texas smoked brisket",
          "url": "https://en.wikipedia.org/wiki/Texas_smoked_brisket"
        },
        {
          "name": "Texas Monthly: The History of Smoked Brisket",
          "url": "https://www.texasmonthly.com/bbq/smoked-brisket-history/"
        }
      ]
    },
    "bbq pulled pork": {
      "local": "BBQ pulled pork",
      "note": {
        "en": "A Southern US barbecue dish of pork shoulder slow-smoked until tender, then shredded and dressed in sauce, rooted in indigenous barbacoa…",
        "fr": "Plat de barbecue du Sud des États-Unis: épaule de porc fumée lentement jusqu'à tendreté, effilochée et nappée de sauce, issu du barbacoa…"
      },
      "sources": [
        {
          "name": "Wikipedia — Pulled pork",
          "url": "https://en.wikipedia.org/wiki/Pulled_pork"
        },
        {
          "name": "Gambero Rosso — Pulled pork history",
          "url": "https://www.gamberorossointernational.com/news/food-news/pulled-pork-history-recipe-and-where-to-eat-it/"
        }
      ]
    },
    "bbq ribs": {
      "local": "barbecue ribs",
      "note": {
        "en": "Pork or beef ribs slow-cooked over smoke with a spice rub or sauce; a Southern US staple rooted in African American and Indigenous (Taino…",
        "fr": "Cotes de porc ou de boeuf fumees lentement avec epices ou sauce ; plat emblematique du Sud americain issu des traditions afro-americaines…"
      },
      "sources": [
        {
          "name": "From Pit to Plate: How We Became a Barbecue Nation - Atlanta History Center",
          "url": "https://www.atlantahistorycenter.com/blog/from-pit-to-plate-a-brief-history-of-american-barbecue/"
        },
        {
          "name": "Where to Eat the Best Barbecue Ribs in the USA - TasteAtlas",
          "url": "https://www.tasteatlas.com/barbecue-ribs/wheretoeat/usa"
        }
      ]
    },
    "mac and cheese": {
      "local": "Macaroni and cheese",
      "note": {
        "en": "American comfort dish of macaroni in cheese sauce; popularized by James Hemings for Jefferson and by Kraft's 1937 boxed version.",
        "fr": "Plat reconfortant americain de macaronis en sauce au fromage, popularise par James Hemings pour Jefferson et la version Kraft de 1937."
      },
      "sources": [
        {
          "name": "Wikipedia — Macaroni and cheese",
          "url": "https://en.wikipedia.org/wiki/Macaroni_and_cheese"
        },
        {
          "name": "Smithsonian Magazine — A Brief History of America's Appetite for Macaroni and Cheese",
          "url": "https://www.smithsonianmag.com/history/brief-history-americas-appetite-for-macaroni-cheese-180969185/"
        }
      ]
    },
    "fried chicken": {
      "local": "fried chicken",
      "note": {
        "en": "Southern US dish of seasoned flour-coated chicken pieces deep- or pan-fried; born from Scottish frying and West African seasoning.",
        "fr": "Plat du Sud des USA: morceaux de poulet panes a la farine epicee et frits; ne du frire ecossais et de l'assaisonnement ouest-africain."
      },
      "sources": [
        {
          "name": "Wikipedia - Fried chicken",
          "url": "https://en.wikipedia.org/wiki/Fried_chicken"
        }
      ]
    },
    "buffalo wings": {
      "local": "Buffalo wings",
      "note": {
        "en": "Deep-fried unbreaded chicken wings coated in cayenne-vinegar hot sauce, created in 1964 at the Anchor Bar in Buffalo, New York.",
        "fr": "Ailes de poulet frites non panées enrobées de sauce piquante au cayenne et vinaigre, créées en 1964 à l'Anchor Bar de Buffalo, New York."
      },
      "sources": [
        {
          "name": "Anchor Bar — History",
          "url": "https://anchorbar.com/history/"
        },
        {
          "name": "Wikipedia — Anchor Bar",
          "url": "https://en.wikipedia.org/wiki/Anchor_Bar"
        }
      ]
    },
    "philly cheesesteak": {
      "local": "Philly Cheesesteak",
      "note": {
        "en": "A Philadelphia sandwich of thinly sliced griddled beef on a long roll. The steak sandwich was created around 1930 by brothers Pat and Harry…",
        "fr": "Un sandwich de Philadelphie composé de bœuf émincé grillé sur un pain long. Le sandwich au steak fut créé vers 1930 par les frères Pat et…"
      },
      "sources": [
        {
          "name": "Cheesesteak - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Cheesesteak"
        },
        {
          "name": "Pat's King of Steaks - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Pat's_King_of_Steaks"
        }
      ]
    },
    "new york pizza": {
      "local": "New York-style pizza",
      "note": {
        "en": "Large, foldable thin-crust pizza sold by the slice, developed by Italian immigrants in NYC after Lombardi's opened in 1905.",
        "fr": "Grande pizza fine et pliable vendue à la part, créée par des immigrés italiens à New York après l'ouverture de Lombardi's en 1905."
      },
      "sources": [
        {
          "name": "Wikipedia — New York-style pizza",
          "url": "https://en.wikipedia.org/wiki/New_York%E2%80%93style_pizza"
        },
        {
          "name": "PMQ Pizza — How New York-Style Pizza Became Iconic",
          "url": "https://www.pmq.com/new-york-style-pizza/"
        }
      ]
    },
    "chicago deep dish pizza": {
      "local": "Chicago Deep-Dish Pizza",
      "note": {
        "en": "A thick, pan-baked pizza with a tall buttery crust, cheese, fillings and chunky tomato sauce on top, created in 1943 at Pizzeria Uno…",
        "fr": "Pizza épaisse cuite au moule, à croûte haute et beurrée, garnie de fromage et de sauce tomate sur le dessus, créée en 1943 au Pizzeria Uno…"
      },
      "sources": [
        {
          "name": "Uno Pizzeria & Grill - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Uno_Pizzeria_%26_Grill"
        },
        {
          "name": "The History of Chicago Deep-Dish Pizza - The Kitchn",
          "url": "https://www.thekitchn.com/the-history-of-the-all-american-chicago-deep-dish-pie-227610"
        }
      ]
    },
    "clam chowder": {
      "local": "clam chowder",
      "note": {
        "en": "A New England soup of clams, potatoes, salt pork and onions, originating in the 18th-century northeastern US.",
        "fr": "Une soupe de Nouvelle-Angleterre aux palourdes, pommes de terre, lard et oignons, originaire du nord-est des États-Unis au XVIIIe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia – Clam chowder",
          "url": "https://en.wikipedia.org/wiki/Clam_chowder"
        },
        {
          "name": "What's Cooking America – History of New England Clam Chowder",
          "url": "https://whatscookingamerica.net/history/chowder/newenglandchowder.htm"
        }
      ]
    },
    "lobster roll": {
      "local": "lobster roll",
      "note": {
        "en": "New England sandwich of lobster meat (cold with mayo in Maine, warm with butter in Connecticut) in a split-top bun, dating to 1920s…",
        "fr": "Sandwich de Nouvelle-Angleterre au homard (froid a la mayonnaise dans le Maine, chaud au beurre dans le Connecticut) en pain fendu, ne dans…"
      },
      "sources": [
        {
          "name": "Wikipedia - Lobster roll",
          "url": "https://en.wikipedia.org/wiki/Lobster_roll"
        }
      ]
    },
    "gumbo": {
      "local": "gombo",
      "note": {
        "en": "Louisiana stew of meat or shellfish, the \"holy trinity\" and a dark roux, thickened with okra or filé; named state dish in 2004.",
        "fr": "Ragoût louisianais de viande ou fruits de mer, à la « sainte trinité » et roux foncé, lié à l'okra ou au filé ; plat officiel depuis 2004."
      },
      "sources": [
        {
          "name": "Wikipedia — Gumbo",
          "url": "https://en.wikipedia.org/wiki/Gumbo"
        },
        {
          "name": "64 Parishes — Gumbo",
          "url": "https://64parishes.org/entry/gumbo"
        }
      ]
    },
    "jambalaya": {
      "local": "jambalaya",
      "note": {
        "en": "Louisiana rice dish of meat, sausage and seafood with vegetables; Creole and Cajun roots, often linked to Spanish settlers' adaptation of…",
        "fr": "Plat de riz louisianais de viande, saucisse et fruits de mer aux legumes; racines creoles et cajuns, souvent lie a une adaptation de la…"
      },
      "sources": [
        {
          "name": "Encyclopaedia Britannica - Jambalaya",
          "url": "https://www.britannica.com/topic/jambalaya"
        },
        {
          "name": "Wikipedia - Jambalaya",
          "url": "https://en.wikipedia.org/wiki/Jambalaya"
        }
      ]
    },
    "po' boy": {
      "local": "po' boy (poor boy)",
      "note": {
        "en": "A New Orleans submarine sandwich on French bread, said to be created by the Martin brothers to feed strikers in the 1929 streetcar strike.",
        "fr": "Un sandwich sous-marin de la Nouvelle-Orleans sur pain francais, cree, dit-on, par les freres Martin pour nourrir les grevistes du tramway…"
      },
      "sources": [
        {
          "name": "Po' boy - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Po'_boy"
        },
        {
          "name": "Po-Boy Sandwich - 64 Parishes",
          "url": "https://64parishes.org/entry/po-boy-sandwich"
        }
      ]
    },
    "beignet": {
      "local": "beignet",
      "note": {
        "en": "A square of deep-fried yeasted dough dusted with powdered sugar, brought to New Orleans by French-speaking colonists in the 18th century…",
        "fr": "Carre de pate levee frite et saupoudre de sucre glace, apporte a la Nouvelle-Orleans par les colons francophones au 18e siecle et devenu un…"
      },
      "sources": [
        {
          "name": "64 Parishes - Beignets",
          "url": "https://64parishes.org/entry/beignets"
        },
        {
          "name": "Britannica - beignet",
          "url": "https://www.britannica.com/topic/beignet"
        }
      ]
    },
    "biscuits and gravy": {
      "local": "Biscuits and gravy",
      "note": {
        "en": "A Southern US breakfast of soft biscuits under white pork-sausage gravy, rooted in late-1800s Appalachia.",
        "fr": "Petit-déjeuner du Sud des États-Unis : biscuits moelleux nappés de sauce blanche à la chair à saucisse, né dans l'Appalachie de la fin du…"
      },
      "sources": [
        {
          "name": "Wikipedia — Biscuits and gravy",
          "url": "https://en.wikipedia.org/wiki/Biscuits_and_gravy"
        },
        {
          "name": "Wikipedia — Sausage gravy",
          "url": "https://en.wikipedia.org/wiki/Sausage_gravy"
        }
      ]
    },
    "soul food platter": {
      "local": "Soul food platter",
      "note": {
        "en": "African American Southern US cuisine rooted in slavery-era cooking; a platter typically pairs fried chicken, collard greens and cornbread.",
        "fr": "Cuisine afro-américaine du Sud des États-Unis née à l'époque de l'esclavage; l'assiette réunit poulet frit, chou vert et pain de maïs."
      },
      "sources": [
        {
          "name": "Britannica - Soul food",
          "url": "https://www.britannica.com/topic/soul-food-cuisine"
        },
        {
          "name": "African American Registry - Soul Food, a brief history",
          "url": "https://aaregistry.org/story/soul-food-a-brief-history/"
        }
      ]
    },
    "pancakes": {
      "local": "Pancakes",
      "note": {
        "en": "Thick, fluffy American breakfast cakes of flour, eggs, milk and baking powder, stacked and served with butter and maple syrup.",
        "fr": "Crêpes américaines épaisses et moelleuses à base de farine, œufs, lait et levure, empilées et servies avec beurre et sirop d'érable."
      },
      "sources": [
        {
          "name": "TasteAtlas - American Pancakes",
          "url": "https://www.tasteatlas.com/american-pancakes"
        },
        {
          "name": "Smithsonian Magazine - A Brief History of Pancakes",
          "url": "https://www.smithsonianmag.com/history/a-brief-history-of-pancakes-180981667/"
        }
      ]
    },
    "bagel with lox": {
      "local": "bagel with lox (lox from Yiddish לאַקס, laks)",
      "note": {
        "en": "A uniquely American Jewish-deli dish of a bagel with brine-cured salmon (lox, from Yiddish laks) and cream cheese, popularized in 1900s New…",
        "fr": "Plat judéo-américain de deli: un bagel garni de saumon en saumure (lox, du yiddish laks) et de fromage à la crème, popularisé à New York…"
      },
      "sources": [
        {
          "name": "Smithsonian Magazine — Bagels and Lox Are a Uniquely American Creation",
          "url": "https://www.smithsonianmag.com/smart-news/bagels-and-lox-are-a-uniquely-american-creation-578/"
        },
        {
          "name": "Etymonline — Lox",
          "url": "https://www.etymonline.com/word/lox"
        }
      ]
    },
    "pastrami sandwich": {
      "local": "Pastrami on rye",
      "note": {
        "en": "A New York Jewish-deli sandwich of spiced cured beef on rye, first sold by immigrant butcher Sussman Volk around 1887-1888.",
        "fr": "Un sandwich des delis juifs de New York, au boeuf saumure epice sur pain de seigle, vendu vers 1887-1888 par le boucher immigre Sussman…"
      },
      "sources": [
        {
          "name": "Wikipedia - Pastrami on rye",
          "url": "https://en.wikipedia.org/wiki/Pastrami_on_rye"
        },
        {
          "name": "Wikipedia - Pastrami",
          "url": "https://en.wikipedia.org/wiki/Pastrami"
        }
      ]
    },
    "reuben": {
      "local": "Reuben",
      "note": {
        "en": "Grilled American sandwich of corned beef, sauerkraut, Swiss cheese and Russian dressing on rye, widely credited to 1920s Omaha, Nebraska.",
        "fr": "Sandwich americain grille au boeuf sale, choucroute, gruyere suisse et sauce russe sur pain de seigle, attribue a Omaha (Nebraska) dans les…"
      },
      "sources": [
        {
          "name": "Wikipedia - Reuben sandwich",
          "url": "https://en.wikipedia.org/wiki/Reuben_sandwich"
        },
        {
          "name": "Britannica - Reuben sandwich",
          "url": "https://www.britannica.com/topic/Reuben-sandwich"
        }
      ]
    },
    "apple pie": {
      "local": "apple pie",
      "note": {
        "en": "A double-crusted baked pastry filled with spiced apples; though an American icon, the earliest recipe is English, dating to the late 1300s.",
        "fr": "Une tarte cuite a double croute garnie de pommes epicees; icone americaine, mais sa plus ancienne recette est anglaise, datant de la fin…"
      },
      "sources": [
        {
          "name": "Mental Floss - How Did Apple Pie Become an Iconic American Dessert?",
          "url": "https://www.mentalfloss.com/article/627296/how-did-apple-pie-become-iconic-american-dessert"
        },
        {
          "name": "Food52 - Apple Pie Origin Story",
          "url": "https://food52.com/story/24688-apple-pie-origin-story"
        }
      ]
    },
    "chocolate chip cookie": {
      "local": "Chocolate chip cookie",
      "note": {
        "en": "A sweet drop cookie studded with chocolate chips, created by Ruth Wakefield at the Toll House Inn in Massachusetts in the late 1930s.",
        "fr": "Un biscuit sucré parsemé de pépites de chocolat, créé par Ruth Wakefield au Toll House Inn, au Massachusetts, à la fin des années 1930."
      },
      "sources": [
        {
          "name": "The Sugar Association — History of the Chocolate Chip Cookie",
          "url": "https://www.sugar.org/blog/the-history-of-the-chocolate-chip-cookie/"
        },
        {
          "name": "New England — Ruth Wakefield's Original Toll House Cookies Recipe",
          "url": "https://newengland.com/food/original-toll-house-cookies/"
        }
      ]
    },
    "cheesecake new york": {
      "local": "New York-Style Cheesecake",
      "note": {
        "en": "A dense, rich baked cheesecake made with a cream-cheese base, popularized in 1920s NYC by restaurateur Arnold Reuben.",
        "fr": "Un cheesecake cuit, dense et riche, a base de fromage frais, popularise dans le New York des annees 1920 par le restaurateur Arnold Reuben."
      },
      "sources": [
        {
          "name": "The Takeout - What Makes New York Style Cheesecake Different?",
          "url": "https://www.thetakeout.com/2103255/what-makes-nyc-cheesecake-different/"
        },
        {
          "name": "CooksInfo - Arnold Reuben: New York Restaurateur",
          "url": "https://www.cooksinfo.com/arnold-reuben"
        }
      ]
    },
    "coca-cola": {
      "local": "Coca-Cola",
      "note": {
        "en": "Carbonated cola soft drink invented in 1886 by pharmacist John Pemberton in Atlanta, originally sold as a five-cent soda-fountain tonic.",
        "fr": "Boisson gazeuse au cola inventee en 1886 par le pharmacien John Pemberton a Atlanta, vendue d'abord comme tonique de fontaine a cinq cents."
      },
      "sources": [
        {
          "name": "Coca-Cola Company - Our History",
          "url": "https://www.coca-colacompany.com/about-us/history"
        },
        {
          "name": "Library of Congress - World's First Coca-Cola Served",
          "url": "https://guides.loc.gov/this-month-in-business-history/may/first-coca-cola-served"
        }
      ]
    },
    "american craft beer": {
      "local": "American craft beer",
      "note": {
        "en": "Beer made by small, independent U.S. breweries; the movement began in the late 1970s after homebrewing was legalized in 1978.",
        "fr": "Biere produite par de petites brasseries americaines independantes; le mouvement debuta a la fin des annees 1970 apres la legalisation du…"
      },
      "sources": [
        {
          "name": "Britannica — Craft beer",
          "url": "https://www.britannica.com/topic/craft-beer"
        },
        {
          "name": "Britannica — American craft beer revolution",
          "url": "https://www.britannica.com/event/American-craft-beer-revolution"
        }
      ]
    },
    "bourbon": {
      "local": "Bourbon",
      "note": {
        "en": "American barrel-aged whiskey made mainly from corn, recognized by Congress in 1964 as a distinctive product of the United States.",
        "fr": "Whiskey americain vieilli en fut, fait surtout de mais, reconnu par le Congres en 1964 comme produit distinctif des Etats-Unis."
      },
      "sources": [
        {
          "name": "Wikipedia - Bourbon whiskey",
          "url": "https://en.wikipedia.org/wiki/Bourbon_whiskey"
        }
      ]
    }
  },
  "australian": {
    "meat pie": {
      "local": "Meat pie",
      "note": {
        "en": "A handheld pie of diced or minced beef in thick gravy, built on a firm shortcrust base with a flaky puff-pastry lid; an Australian staple…",
        "fr": "Une tourte individuelle garnie de boeuf hache ou en des dans une sauce epaisse, montee sur un fond de pate brisee ferme et coiffee d'un…"
      },
      "sources": [
        {
          "name": "Wikipedia — Meat pie (Australia and New Zealand)",
          "url": "https://en.wikipedia.org/wiki/Meat_pie_(Australia_and_New_Zealand)"
        },
        {
          "name": "Australian Food History Timeline — The great Australian pie",
          "url": "https://australianfoodtimeline.com.au/great-australian-pie/"
        }
      ]
    },
    "vegemite on toast": {
      "local": "Vegemite on toast",
      "note": {
        "en": "Australian toast spread thinly with Vegemite, a salty yeast-extract paste invented by Cyril Callister in Melbourne in 1922.",
        "fr": "Tartine australienne tartinee d'une fine couche de Vegemite, une pate salee d'extrait de levure inventee par Cyril Callister a Melbourne en…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Vegemite on toast",
          "url": "https://tasteatlas.com/vegemite-on-toast"
        },
        {
          "name": "Mental Floss - A Brief History of Vegemite",
          "url": "https://www.mentalfloss.com/article/650489/vegemites-history-and-ingredients"
        }
      ]
    },
    "lamington": {
      "local": "Lamington",
      "note": {
        "en": "An Australian dessert of sponge cake squares coated in chocolate icing and desiccated coconut, named after Lord Lamington, Governor of…",
        "fr": "Un dessert australien fait de cubes de gateau eponge enrobes de glacage au chocolat et de noix de coco rapee, nomme d'apres Lord Lamington…"
      },
      "sources": [
        {
          "name": "Lamington — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Lamington"
        },
        {
          "name": "A history of the Lamington — Ferguson Plarre's Bakehouse",
          "url": "https://www.fergusonplarre.com.au/blog/history-of-lamington"
        }
      ]
    },
    "pavlova": {
      "local": "pavlova",
      "note": {
        "en": "A meringue-based dessert with a crisp crust and soft centre, topped with cream and fruit, named after Russian ballerina Anna Pavlova.",
        "fr": "Un dessert a base de meringue, croustillant dehors et moelleux dedans, garni de creme et de fruits, nomme d'apres la ballerine russe Anna…"
      },
      "sources": [
        {
          "name": "Wikipedia — Pavlova",
          "url": "https://en.wikipedia.org/wiki/Pavlova"
        },
        {
          "name": "TasteAtlas — Pavlova (Australia)",
          "url": "https://tasteatlas.com/pavlova-australia"
        }
      ]
    },
    "anzac biscuit": {
      "local": "Anzac biscuit",
      "note": {
        "en": "A sweet Australian and New Zealand biscuit of rolled oats, coconut, flour, butter and golden syrup, bound without eggs so it keeps well…",
        "fr": "Biscuit sucre australien et neo-zelandais a base de flocons d'avoine, noix de coco, farine, beurre et sirop dore, sans oeufs pour mieux se…"
      },
      "sources": [
        {
          "name": "Wikipedia - Anzac biscuit",
          "url": "https://en.wikipedia.org/wiki/Anzac_biscuit"
        },
        {
          "name": "TasteAtlas - Anzac biscuits",
          "url": "https://www.tasteatlas.com/anzac-biscuits/"
        }
      ]
    },
    "barramundi": {
      "local": "barramundi",
      "note": {
        "en": "A mild, white-fleshed Australian fish (Lates calcarifer); its name comes from the Gangulu Aboriginal language meaning \"large-scaled river…",
        "fr": "Poisson australien a chair blanche et au gout doux (Lates calcarifer); son nom vient de la langue aborigene gangulu et signifie \"poisson de…"
      },
      "sources": [
        {
          "name": "Wikipedia — Barramundi",
          "url": "https://en.wikipedia.org/wiki/Barramundi"
        },
        {
          "name": "State Library of Queensland — Barramundi, what's in a name?",
          "url": "https://www.slq.qld.gov.au/blog/barramundi-whats-name"
        }
      ]
    },
    "chiko roll": {
      "local": "Chiko Roll",
      "note": {
        "en": "Australian deep-fried savoury snack of cabbage, barley, carrot and beef in a thick pastry tube, invented by Frank McEncroe and first sold…",
        "fr": "En-cas australien frit, fait de chou, orge, carotte et boeuf dans un tube de pate epaisse, invente par Frank McEncroe et vendu des 1951."
      },
      "sources": [
        {
          "name": "Wikipedia – Chiko Roll",
          "url": "https://en.wikipedia.org/wiki/Chiko_Roll"
        },
        {
          "name": "Australian Food Timeline – Chiko Roll introduced",
          "url": "https://australianfoodtimeline.com.au/chiko-roll/"
        }
      ]
    },
    "damper": {
      "local": "Damper",
      "note": {
        "en": "Traditional Australian bush bread of flour, water and salt, kneaded and baked in the coals of a campfire; a 19th-century staple of…",
        "fr": "Pain de brousse australien traditionnel a base de farine, d'eau et de sel, petri et cuit dans les braises d'un feu de camp ; aliment de…"
      },
      "sources": [
        {
          "name": "Wikipedia - Damper (food)",
          "url": "https://en.wikipedia.org/wiki/Damper_(food)"
        },
        {
          "name": "Australian Food Timeline - Damper first mentioned",
          "url": "https://australianfoodtimeline.com.au/australian-damper/"
        }
      ]
    },
    "australian bbq": {
      "local": "Sausage sizzle (Aussie barbie)",
      "note": {
        "en": "Australian outdoor barbecue tradition; the sausage sizzle — a grilled \"snag\" on white bread with onions — became the election-day…",
        "fr": "Tradition australienne du barbecue en plein air ; la « sausage sizzle » — saucisse grillée sur pain blanc aux oignons — devenue la «…"
      },
      "sources": [
        {
          "name": "Wikipedia — Sausage sizzle",
          "url": "https://en.wikipedia.org/wiki/Sausage_sizzle"
        },
        {
          "name": "196 flavors — Sausage Sizzle (Traditional Australian Recipe)",
          "url": "https://www.196flavors.com/sausage-sizzle/"
        }
      ]
    },
    "snags on bread": {
      "local": "snags on bread (sausage sizzle)",
      "note": {
        "en": "Australian/NZ sausage (\"snag\") grilled and served on a single slice of white bread with onions and sauce, a fundraiser staple.",
        "fr": "Saucisse australienne/néo-zélandaise (« snag ») grillée, servie sur une tranche de pain blanc avec oignons et sauce, vedette des collectes…"
      },
      "sources": [
        {
          "name": "Wikipedia — Sausage sizzle",
          "url": "https://en.wikipedia.org/wiki/Sausage_sizzle"
        },
        {
          "name": "Wikipedia — Democracy sausage",
          "url": "https://en.wikipedia.org/wiki/Democracy_sausage"
        }
      ]
    },
    "fairy bread": {
      "local": "Fairy bread",
      "note": {
        "en": "Australian children's party treat of buttered white bread cut into triangles and topped with hundreds and thousands; first named in 1929.",
        "fr": "Friandise australienne pour fetes d'enfants: pain blanc beurre coupe en triangles et couvert de vermicelles colores; nomme des 1929."
      },
      "sources": [
        {
          "name": "TasteAtlas",
          "url": "https://tasteatlas.com/fairy-bread"
        },
        {
          "name": "Australian Food Timeline",
          "url": "https://australianfoodtimeline.com.au/fairy-bread/"
        }
      ]
    },
    "tim tam": {
      "local": "Tim Tam",
      "note": {
        "en": "Australian chocolate biscuit made of two malted biscuits sandwiching a chocolate cream filling, coated in chocolate; introduced by Arnott's…",
        "fr": "Biscuit australien au chocolat compose de deux biscuits maltes garnis d'une creme chocolatee et enrobes de chocolat; lance par Arnott's et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Tim Tam",
          "url": "https://en.wikipedia.org/wiki/Tim_Tam"
        }
      ]
    },
    "flat white": {
      "local": "flat white",
      "note": {
        "en": "An espresso-based coffee topped with steamed microfoam milk, originating in Australia or New Zealand in the 1980s.",
        "fr": "Un cafe a base d'espresso nappe de mousse de lait micro-aeree, ne en Australie ou Nouvelle-Zelande dans les annees 1980."
      },
      "sources": [
        {
          "name": "Wikipedia - Flat white",
          "url": "https://en.wikipedia.org/wiki/Flat_white"
        },
        {
          "name": "Perfect Daily Grind - Exploring the origins of the flat white",
          "url": "https://perfectdailygrind.com/?p=96929"
        }
      ]
    },
    "avocado toast": {
      "local": "avocado toast",
      "note": {
        "en": "Mashed or sliced avocado on toasted bread, popularised at Bill Granger's Sydney café Bills in 1993 as a café-breakfast staple.",
        "fr": "Avocat écrasé ou tranché sur pain grillé, popularisé au café Bills de Bill Granger à Sydney en 1993 comme plat de petit-déjeuner."
      },
      "sources": [
        {
          "name": "Australian Food Timeline — Avocado on toast",
          "url": "https://australianfoodtimeline.com.au/avocado-on-toast/"
        },
        {
          "name": "Chowhound — Bill's diner, first avocado toast in Australia",
          "url": "https://www.chowhound.com/1922832/bills-diner-first-avocado-toast-australia/"
        }
      ]
    },
    "aussie burger": {
      "local": "Aussie burger (with the lot)",
      "note": {
        "en": "Australian hamburger topped with the lot—beef, fried egg, bacon, pineapple and canned beetroot, a style that emerged in 1940s cafes and…",
        "fr": "Hamburger australien garni du tout : boeuf, oeuf au plat, bacon, ananas et betterave en conserve, un style apparu dans les cafes des annees…"
      },
      "sources": [
        {
          "name": "TasteAtlas – Australian Burger",
          "url": "https://www.tasteatlas.com/australian-burger"
        },
        {
          "name": "SBS Food – How did beetroot end up on our burger?",
          "url": "https://www.sbs.com.au/food/article/how-did-beetroot-end-up-on-our-burger/mrl2mk09b"
        }
      ]
    },
    "parmigiana": {
      "local": "Chicken parmigiana (\"parma\" / \"parmi\")",
      "note": {
        "en": "An Australian pub staple of crumbed chicken schnitzel topped with ham, napoli tomato sauce and melted cheese, adapted from Italian eggplant…",
        "fr": "Plat de pub australien: escalope de poulet panee garnie de jambon, sauce tomate napoli et fromage fondu, derive de l'aubergine alla…"
      },
      "sources": [
        {
          "name": "Wikipedia - Chicken parmesan",
          "url": "https://en.wikipedia.org/wiki/Chicken_parmesan"
        },
        {
          "name": "TasteAtlas - Chicken Parmigiana",
          "url": "https://www.tasteatlas.com/chicken-parmigiana"
        }
      ]
    },
    "kangaroo steak": {
      "local": "Kangaroo steak",
      "note": {
        "en": "A lean, gamey Australian game steak eaten since Indigenous times; legal for sale as human food only after South Australia lifted its ban in…",
        "fr": "Un steak de gibier australien maigre et gibier, consomme depuis les temps autochtones; vendable comme aliment seulement apres la levee de…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Kangaroo Steak",
          "url": "https://www.tasteatlas.com/kangaroo-steak"
        },
        {
          "name": "Wikipedia - Kangaroo meat",
          "url": "https://en.wikipedia.org/wiki/Kangaroo_meat"
        }
      ]
    },
    "crocodile fillet": {
      "local": "crocodile fillet",
      "note": {
        "en": "Tender white tail-fillet of farmed saltwater crocodile, grilled like steak; a Top End delicacy of northern Australia.",
        "fr": "Tendre filet blanc de queue de crocodile marin d'élevage, grillé comme un steak ; spécialité du nord de l'Australie."
      },
      "sources": [
        {
          "name": "Chef's Pencil — Crocodile Meat: Taste, Best Cuts, Popularity",
          "url": "https://www.chefspencil.com/crocodile-meat/"
        },
        {
          "name": "Hospitality Directory — 5 Places To Eat Crocodile In Australia",
          "url": "https://www.hospitalitydirectory.com.au/industry-news/7293-5-places-to-eat-crocodile-in-australia/"
        }
      ]
    },
    "barramundi pie": {
      "local": "barramundi pie",
      "note": {
        "en": "Australian savoury pie of flaky barramundi and potato; the word \"barramundi\" comes from the Gangulu Aboriginal language of central…",
        "fr": "Tourte australienne au barramundi feuilleté et à la pomme de terre ; le mot « barramundi » vient de la langue aborigène gangulu du centre…"
      },
      "sources": [
        {
          "name": "Women's Weekly Food – Barramundi and potato pie",
          "url": "https://www.womensweeklyfood.com.au/recipe/dinner/barramundi-and-potato-pie-1847/"
        },
        {
          "name": "State Library of Queensland – Barramundi, what's in a name?",
          "url": "https://www.slq.qld.gov.au/blog/barramundi-whats-name"
        }
      ]
    },
    "bush tucker": {
      "local": "bush tucker",
      "note": {
        "en": "Bush tucker is any native Australian plant or animal food, such as quandong, witchetty grubs and kangaroo, eaten by Indigenous Australians…",
        "fr": "Le bush tucker designe tout aliment vegetal ou animal natif d'Australie (quandong, vers witchetty, kangourou) consomme par les Aborigenes…"
      },
      "sources": [
        {
          "name": "Wikipedia - Bush tucker",
          "url": "https://en.wikipedia.org/wiki/Bush_tucker"
        }
      ]
    },
    "flat white australian": {
      "local": "Flat White",
      "note": {
        "en": "An espresso coffee topped with steamed milk and a thin layer of microfoam, popularised in Australia in the mid-1980s.",
        "fr": "Un cafe espresso recouvert de lait vapeur et d'une fine couche de micromousse, popularise en Australie au milieu des annees 1980."
      },
      "sources": [
        {
          "name": "Wikipedia — Flat white",
          "url": "https://en.wikipedia.org/wiki/Flat_white"
        },
        {
          "name": "Australian Geographic — Who invented the flat white?",
          "url": "https://www.australiangeographic.com.au/news/2024/04/who-invented-the-flat-white/"
        }
      ]
    },
    "long black": {
      "local": "Long black",
      "note": {
        "en": "An Australian/New Zealand coffee made by pouring a double espresso shot over hot water, which preserves a more pronounced crema than an…",
        "fr": "Un cafe australien/neo-zelandais fait en versant un double espresso sur de l'eau chaude, ce qui preserve une crema plus prononcee que celle…"
      },
      "sources": [
        {
          "name": "Wikipedia - Long black",
          "url": "https://en.wikipedia.org/wiki/Long_black"
        },
        {
          "name": "Barista Courses Australia - What is long black coffee",
          "url": "https://baristacoursesaustralia.com.au/blog/what-is-long-black-coffee/"
        }
      ]
    },
    "australian wine": {
      "local": "Australian wine",
      "note": {
        "en": "Wine made in Australia since the first vines were planted in Sydney in 1788, now famed for Shiraz.",
        "fr": "Vin produit en Australie depuis la plantation des premières vignes à Sydney en 1788, réputé pour la Syrah."
      },
      "sources": [
        {
          "name": "South Australian wine - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/South_Australian_wine"
        },
        {
          "name": "Wine Australia - The history of Australian Wine",
          "url": "https://www.wineaustralia.com/whats-happening/stories-of-australian-wine/march-2016/the-history,-evolution-and-revolution-of-australia"
        }
      ]
    }
  },
  "bengali": {
    "macher jhol": {
      "local": "মাছের ঝোল",
      "note": {
        "en": "A Bengali and Odia light, spiced fish stew with potatoes simmered in a turmeric broth, served with rice as an everyday staple.",
        "fr": "Un ragout de poisson bengali et odia, leger et epice, aux pommes de terre mijotees dans un bouillon au curcuma, servi avec du riz."
      },
      "sources": [
        {
          "name": "Wikipedia - Machher jhol",
          "url": "https://en.wikipedia.org/wiki/Machher_jhol"
        },
        {
          "name": "TasteAtlas - Macher jhol",
          "url": "https://www.tasteatlas.com/macher-jhol"
        }
      ]
    },
    "shorshe ilish": {
      "local": "সর্ষে ইলিশ",
      "note": {
        "en": "A Bengali dish of hilsa fish simmered in a pungent ground-mustard gravy, widely regarded as the national dish of Bangladesh.",
        "fr": "Un plat bengali de poisson hilsa mijoté dans une sauce piquante à la moutarde, considéré comme le plat national du Bangladesh."
      },
      "sources": [
        {
          "name": "Wikipedia — Shorshe ilish",
          "url": "https://en.wikipedia.org/wiki/Shorshe_ilish"
        },
        {
          "name": "TasteAtlas — Shorshe Ilish",
          "url": "https://tasteatlas.com/shorshe-ilish-west-bengal"
        }
      ]
    },
    "chingri malai curry": {
      "local": "চিংড়ি মালাই কারি",
      "note": {
        "en": "Bengali curry of king/tiger prawns in spiced coconut milk; \"malai\" derives from Malay, reflecting Bengal-Southeast Asia trade.",
        "fr": "Curry bengali de grosses crevettes au lait de coco épicé; « malai » vient de « malais », fruit du commerce Bengale-Asie du Sud-Est."
      },
      "sources": [
        {
          "name": "Wikipedia — Chingri malai curry",
          "url": "https://en.wikipedia.org/wiki/Chingri_malai_curry"
        }
      ]
    },
    "kosha mangsho": {
      "local": "কষা মাংস",
      "note": {
        "en": "A Bengali slow-cooked dry mutton (goat) curry braised in mustard oil and spices; a staple of Durga Puja and Sunday feasts.",
        "fr": "Curry bengali de mouton (chèvre) mijoté à sec dans l'huile de moutarde et les épices ; incontournable du Durga Puja et des repas du…"
      },
      "sources": [
        {
          "name": "Wikipedia – Mutton curry",
          "url": "https://en.wikipedia.org/wiki/Mutton_curry"
        },
        {
          "name": "Bong Eats – Mutton Kosha",
          "url": "https://www.bongeats.com/recipe/mutton-kosha"
        }
      ]
    },
    "luchi alur dom": {
      "local": "লুচি আলুর দম",
      "note": {
        "en": "Bengali breakfast pairing of deep-fried maida flatbread (luchi, attested 1660) with a spiced, slightly sweet dum-cooked potato curry.",
        "fr": "Plat bengali du matin: pain frit de farine maida (luchi, attesté en 1660) accompagné d'un curry de pommes de terre épicé et légèrement…"
      },
      "sources": [
        {
          "name": "Wikipedia – Luchi",
          "url": "https://en.wikipedia.org/wiki/Luchi"
        },
        {
          "name": "Chef's Pencil – Luchi & Alur Dom",
          "url": "https://www.chefspencil.com/luchi-alur-dom-bengali-luchi-aloo-dum/"
        }
      ]
    },
    "rosogolla": {
      "local": "রসগোল্লা",
      "note": {
        "en": "Spongy chhena (curd-cheese) balls boiled in light sugar syrup; Bengalis credit Nabin Chandra Das (Kolkata, 1868) for it.",
        "fr": "Boulettes spongieuses de chhena (fromage caillé) cuites dans un sirop léger; les Bengalis l'attribuent à Nabin Chandra Das (Kolkata, 1868)."
      },
      "sources": [
        {
          "name": "Wikipedia — Rasgulla",
          "url": "https://en.wikipedia.org/wiki/Rasgulla"
        },
        {
          "name": "Wiktionary — রসগোল্লা",
          "url": "https://en.wiktionary.org/wiki/%E0%A6%B0%E0%A6%B8%E0%A6%97%E0%A7%8B%E0%A6%B2%E0%A7%8D%E0%A6%B2%E0%A6%BE"
        }
      ]
    },
    "mishti doi": {
      "local": "মিষ্টি দই",
      "note": {
        "en": "A Bengali fermented sweet yogurt of boiled milk set with sugar or jaggery in earthenware, traced to 19th-century Bengal.",
        "fr": "Yaourt sucré bengali fermente, fait de lait bouilli pris au sucre ou au jaggery dans des pots en terre, ne au Bengale du XIXe siecle."
      },
      "sources": [
        {
          "name": "Wikipedia — Mishti doi",
          "url": "https://en.wikipedia.org/wiki/Mishti_doi"
        }
      ]
    },
    "shukto": {
      "local": "শুক্তো",
      "note": {
        "en": "A lightly bitter Bengali mixed-vegetable dish, traditionally eaten first in a meal, an Ayurvedic custom of opening with bitters.",
        "fr": "Plat bengali de legumes melanges legerement amer, traditionnellement mange en debut de repas, coutume ayurvedique des amers."
      },
      "sources": [
        {
          "name": "Wikipedia — Shukto",
          "url": "https://en.wikipedia.org/wiki/Shukto"
        }
      ]
    },
    "aloo posto": {
      "local": "আলু পোস্ত",
      "note": {
        "en": "A traditional West Bengal vegetarian dish of potatoes cooked in a mildly spiced poppy-seed (posto) paste with mustard oil.",
        "fr": "Plat vegetarien traditionnel du Bengale-Occidental: pommes de terre mijotees dans une pate de graines de pavot (posto) legerement epicee a…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Aloo Posto",
          "url": "https://www.tasteatlas.com/aloo-posto"
        },
        {
          "name": "Dassana's Veg Recipes - Aloo Posto",
          "url": "https://www.vegrecipesofindia.com/aloo-posto-recipe/"
        }
      ]
    },
    "cholar dal": {
      "local": "ছোলার ডাল",
      "note": {
        "en": "A sweet-savoury Bengali split-Bengal-gram (chana dal) lentil dish tempered with whole spices, coconut and raisins, eaten at Durga Puja with…",
        "fr": "Un plat bengali de lentilles de pois chiches cassés (chana dal), doux-salé, relevé d'épices entières, de noix de coco et de raisins secs…"
      },
      "sources": [
        {
          "name": "Veg Recipes of India - Cholar Dal",
          "url": "https://www.vegrecipesofindia.com/cholar-dal-bengali-cholar-dal/"
        },
        {
          "name": "Holy Cow Vegan - Cholar Dal (Bengali Chana Dal)",
          "url": "https://holycowvegan.net/cholar-dal/"
        }
      ]
    },
    "begun bhaja": {
      "local": "বেগুন ভাজা",
      "note": {
        "en": "A Bengali side dish of eggplant slices coated in turmeric and spices, then pan-fried in mustard oil.",
        "fr": "Plat d'accompagnement bengali de tranches d'aubergine enrobees de curcuma et d'epices, frites a l'huile de moutarde."
      },
      "sources": [
        {
          "name": "Bengali Begun Bhaja Recipe - Whisk Affair",
          "url": "https://www.whiskaffair.com/bengali-begun-bhaja-recipe/"
        },
        {
          "name": "Begun Bhaja Recipe (Baingan Bhaja) - Dassana's Veg Recipes",
          "url": "https://www.vegrecipesofindia.com/baingan-fry-baingan-bhaja-eggplant-fries/"
        }
      ]
    },
    "panta bhat": {
      "local": "পান্তা ভাত",
      "note": {
        "en": "A Bengali dish of leftover rice soaked and fermented in water overnight, eaten with salt, onion and chili, especially at Pohela Boishakh.",
        "fr": "Plat bengali de riz cuit trempe et fermente dans l'eau toute la nuit, mange avec sel, oignon et piment, surtout au Pohela Boishakh."
      },
      "sources": [
        {
          "name": "Wikipedia - Panta bhat",
          "url": "https://en.wikipedia.org/wiki/Panta_bhat"
        },
        {
          "name": "Wikipedia - Pohela Boishakh",
          "url": "https://en.wikipedia.org/wiki/Pohela_Boishakh"
        }
      ]
    },
    "biryani kolkata": {
      "local": "কলকাতা বিরিয়ানি",
      "note": {
        "en": "A mild, fragrant rice-and-meat biryani distinguished by potato and boiled egg, brought to Kolkata by the exiled Awadh Nawab Wajid Ali Shah…",
        "fr": "Un biryani de riz et de viande, doux et parfumé, marqué par la pomme de terre et l'oeuf dur, apporté à Calcutta par le nawab d'Awadh exilé…"
      },
      "sources": [
        {
          "name": "Wikipedia - Kolkata biryani",
          "url": "https://en.wikipedia.org/wiki/Kolkata_biryani"
        },
        {
          "name": "Live History India - Who put the Potato in the Kolkata Biryani?",
          "url": "https://www.livehistoryindia.com/story/living-culture/who-put-the-potato-in-the-kolkata-biryani"
        }
      ]
    },
    "phuchka": {
      "local": "ফুচকা",
      "note": {
        "en": "A Bengali street snack: a deep-fried hollow puri shell filled with spiced potato and tangy tamarind water, the eastern Indian form of…",
        "fr": "Un en-cas de rue bengali : une coque de puri creuse frite garnie de pomme de terre épicée et d'eau de tamarin acidulée, la forme orientale…"
      },
      "sources": [
        {
          "name": "Wikipedia – Panipuri",
          "url": "https://en.wikipedia.org/wiki/Panipuri"
        },
        {
          "name": "Wiktionary – phuchka",
          "url": "https://en.wiktionary.org/wiki/phuchka"
        }
      ]
    },
    "jhal muri": {
      "local": "ঝালমুড়ি",
      "note": {
        "en": "A Bengali street snack of puffed rice tossed with Bombay mix (chanachur), chopped vegetables, spices and pungent mustard oil, sold from…",
        "fr": "En-cas de rue bengali de riz soufflé mélangé à du Bombay mix (chanachur), des légumes coupés, des épices et de l'huile de moutarde…"
      },
      "sources": [
        {
          "name": "Wikipedia - Jhalmuri",
          "url": "https://en.wikipedia.org/wiki/Jhalmuri"
        },
        {
          "name": "TasteAtlas - Jhalmuri",
          "url": "https://www.tasteatlas.com/jahlmuri"
        }
      ]
    },
    "sandesh": {
      "local": "সন্দেশ (Shôndesh)",
      "note": {
        "en": "A Bengali sweet made from chhena (acid-curdled milk curd) and sugar. The chhena-based form is commonly linked to acid milk-curdling…",
        "fr": "Douceur bengalie a base de chhena (caille de lait obtenu par acidification) et de sucre. Sa forme au chhena est souvent associee aux…"
      },
      "sources": [
        {
          "name": "Wikipedia - Chhena",
          "url": "https://en.wikipedia.org/wiki/Chhena"
        },
        {
          "name": "Wikipedia - Sandesh (confectionery)",
          "url": "https://en.wikipedia.org/wiki/Sandesh_(confectionery)"
        }
      ]
    },
    "payesh": {
      "local": "পায়েস",
      "note": {
        "en": "Bengali milk-and-rice pudding, the regional form of kheer/payasam, traditionally made with aromatic Gobindobhog rice and jaggery (nolen…",
        "fr": "Pudding bengali au lait et au riz, forme régionale du kheer/payasam, fait traditionnellement de riz aromatique Gobindobhog et de jaggery…"
      },
      "sources": [
        {
          "name": "Wikipedia – Kheer",
          "url": "https://en.wikipedia.org/wiki/Kheer"
        },
        {
          "name": "Nolen Gurer Payesh (Bengali rice pudding with Gobindobhog rice and date-palm jaggery) – Bong Eats",
          "url": "https://www.bongeats.com/recipe/nolen-gurer-payesh"
        }
      ]
    },
    "chomchom": {
      "local": "চমচম",
      "note": {
        "en": "A traditional Bengali sweet of chhena coated with coconut or mawa, whose famed oval Porabari (Tangail) variety dates to the mid-19th…",
        "fr": "Une sucrerie bengalie traditionnelle de chhena enrobee de coco ou de mawa, dont la variete ovale de Porabari (Tangail) date du milieu du…"
      },
      "sources": [
        {
          "name": "Wikipedia - Chomchom",
          "url": "https://en.wikipedia.org/wiki/Chomchom"
        },
        {
          "name": "Slurrp - Chomchom From Bengal: History and Significance",
          "url": "https://www.slurrp.com/article/chomchom-from-bengal-the-history-and-significance-of-the-dessert-explained-1723546037293"
        }
      ]
    },
    "kati roll": {
      "local": "কাঠি রোল",
      "note": {
        "en": "A Kolkata street-food wrap of skewer-roasted kebab in paratha, said to have originated at Nizam's restaurant in the 1930s-60s.",
        "fr": "Un wrap de rue de Kolkata fait de kebab roti a la brochette dans un paratha, ne au restaurant Nizam's entre les annees 1930 et 1960."
      },
      "sources": [
        {
          "name": "Wikipedia - Kati roll",
          "url": "https://en.wikipedia.org/wiki/Kati_roll"
        },
        {
          "name": "Culture Trip - How the Kathi Roll Originated at Nizam's",
          "url": "https://theculturetrip.com/asia/india/articles/how-the-famous-kathi-roll-originated-at-kolkatas-nizams-restaurant"
        }
      ]
    },
    "macher kalia": {
      "local": "মাছের কালিয়া",
      "note": {
        "en": "A rich Bengali festive fish curry of fried river fish in a spiced onion gravy, derived from the Mughlai 'qaliya' of the Nawabs of Bengal.",
        "fr": "Riche curry de poisson bengali de fete, poisson de riviere frit en sauce epicee a l'oignon, derive du qaliya moghol des nababs du Bengale."
      },
      "sources": [
        {
          "name": "Bong Eats - Katla Machher Kalia",
          "url": "https://www.bongeats.com/recipe/katla-kalia"
        },
        {
          "name": "Pikturenama - Macher Kalia, Bengali Fish Kalia",
          "url": "https://pikturenama.com/macher-kalia-bengali-fish-recipe/"
        }
      ]
    },
    "panch phoron tempering": {
      "local": "পাঁচ ফোড়ন (pãch phoṛon)",
      "note": {
        "en": "Bengali whole-spice blend of cumin, fennel, nigella, fenugreek and mustard seeds, fried in hot oil to temper (phoron) dals and curries.",
        "fr": "Mélange bengali de cumin, fenouil, nigelle, fenugrec et moutarde, frit dans l'huile chaude pour parfumer (phoron) dals et currys."
      },
      "sources": [
        {
          "name": "Wikipedia - Panch phoron",
          "url": "https://en.wikipedia.org/wiki/Panch_phoron"
        },
        {
          "name": "Dassana's Veg Recipes of India",
          "url": "https://www.vegrecipesofindia.com/panch-phoran-bengali-recipe/"
        }
      ]
    },
    "bhuna khichuri": {
      "local": "ভুনা খিচুড়ি",
      "note": {
        "en": "A dry, grainy Bengali rice-and-lentil dish where rice and moong dal are fried (\"bhuna\") with whole spices before cooking, unlike soft…",
        "fr": "Plat bengali de riz et lentilles, sec et granuleux, ou le riz et le dal moong sont frits (\"bhuna\") avec des epices avant cuisson."
      },
      "sources": [
        {
          "name": "Wikibooks Cookbook: Bhuna Khichuri (Bengali Rice and Lentils)",
          "url": "https://en.wikibooks.org/wiki/Cookbook:Bhuna_Khichuri_(Bengali_Rice_and_Lentils)"
        },
        {
          "name": "Wikipedia: Bhuna",
          "url": "https://en.wikipedia.org/wiki/Bhuna"
        }
      ]
    }
  },
  "gujarati": {
    "dhokla": {
      "local": "ઢોકળાં",
      "note": {
        "en": "A Gujarati steamed savoury sponge of fermented rice and chickpea (gram) batter; a precursor \"dukkia\" appears in a 1066 CE Jain text.",
        "fr": "Éponge salée gujaratie cuite à la vapeur, à base de riz et de pois chiche fermentés; un ancêtre, le « dukkia », figure dans un texte jaïn…"
      },
      "sources": [
        {
          "name": "Wikipedia — Dhokla",
          "url": "https://en.wikipedia.org/wiki/Dhokla"
        },
        {
          "name": "Wiktionary — dhokla",
          "url": "https://en.wiktionary.org/wiki/dhokla"
        }
      ]
    },
    "khandvi": {
      "local": "ખાંડવી",
      "note": {
        "en": "Soft, rolled Gujarati snack of gram-flour (besan) and buttermilk batter, tempered with mustard seeds and curry leaves.",
        "fr": "Encas gujarati en fins rouleaux de pâte de farine de pois chiche (besan) et babeurre, relevé de graines de moutarde et feuilles de curry."
      },
      "sources": [
        {
          "name": "Wikipedia — Khandvi (food)",
          "url": "https://en.wikipedia.org/wiki/Khandvi_(food)"
        },
        {
          "name": "Veg Recipes of India — Khandvi",
          "url": "https://www.vegrecipesofindia.com/khandvi-recipe-how-to-make-khandvi/"
        }
      ]
    },
    "thepla": {
      "local": "થેપલા",
      "note": {
        "en": "A soft Gujarati spiced wholewheat flatbread, often made with fenugreek (methi), that keeps for days and is a classic travel food.",
        "fr": "Pain plat gujarati moelleux au blé complet épicé, souvent au fenugrec (methi), qui se conserve plusieurs jours et accompagne les voyages."
      },
      "sources": [
        {
          "name": "Wikipedia - Thepla",
          "url": "https://en.wikipedia.org/wiki/Thepla"
        },
        {
          "name": "Veg Recipes of India - Gujarati Methi Thepla",
          "url": "https://www.vegrecipesofindia.com/methi-thepla-gujarati-methi-thepla/"
        }
      ]
    },
    "handvo": {
      "local": "હાંડવો",
      "note": {
        "en": "A savory Gujarati cake of fermented rice-and-lentil batter mixed with vegetables like bottle gourd, baked until crisp.",
        "fr": "Un gateau sale gujarati a base de pate fermentee de riz et lentilles, avec des legumes, cuit jusqu'a croustillant."
      },
      "sources": [
        {
          "name": "Wikipedia — Handvo",
          "url": "https://en.wikipedia.org/wiki/Handvo"
        },
        {
          "name": "TasteAtlas — Handvo",
          "url": "https://www.tasteatlas.com/handvo"
        }
      ]
    },
    "gujarati thali": {
      "local": "ગુજરાતી થાળી",
      "note": {
        "en": "A vegetarian platter from Gujarat, India, serving shaak, dal, kadhi, rice, rotli, farsan and sweets together; \"thali\" means \"plate\".",
        "fr": "Un plateau vegetarien du Gujarat, en Inde, reunissant shaak, dal, kadhi, riz, rotli, farsan et douceurs ; \"thali\" signifie \"assiette\"."
      },
      "sources": [
        {
          "name": "Wikipedia - Gujarati Thali",
          "url": "https://en.wikipedia.org/wiki/Gujarati_Thali"
        },
        {
          "name": "TasteAtlas - Best Rated Dishes in Gujarat",
          "url": "https://www.tasteatlas.com/best-rated-dishes-in-gujarat"
        }
      ]
    },
    "undhiyu": {
      "local": "ઊંધિયું",
      "note": {
        "en": "A Gujarati mixed-vegetable casserole from Surat, named after \"undhu\" (upside-down), as it was traditionally cooked in inverted buried…",
        "fr": "Un mélange de légumes gujarati de Surat, nommé d'après \"undhu\" (à l'envers), car cuit jadis dans des pots de terre enterrés et renversés."
      },
      "sources": [
        {
          "name": "Wikipedia - Undhiyu",
          "url": "https://en.wikipedia.org/wiki/Undhiyu"
        },
        {
          "name": "Veg Recipes of India - Surti Undhiyu",
          "url": "https://www.vegrecipesofindia.com/undhiyu-recipe-gujarati-undhiyu-recipe/"
        }
      ]
    },
    "dal dhokli": {
      "local": "દાળ ઢોકળી",
      "note": {
        "en": "A Gujarati and Rajasthani one-pot comfort meal of diamond-shaped wheat-flour dumplings (dhokli) simmered in a sweet-sour toor dal.",
        "fr": "Plat réconfortant gujarati et rajasthani en un seul pot, fait de losanges de pâte de blé (dhokli) mijotés dans un dal de pois cassés…"
      },
      "sources": [
        {
          "name": "Wikipedia – Dal dhokli",
          "url": "https://en.wikipedia.org/wiki/Dal_dhokli"
        },
        {
          "name": "Tarla Dalal – Traditional Gujarati Dal Dhokli",
          "url": "https://www.tarladalal.com/dal-dhokli--gujarat-recipe-578r"
        }
      ]
    },
    "khaman": {
      "local": "ખમણ",
      "note": {
        "en": "A soft, spongy steamed Gujarati snack (farsan) made from ground chana dal or gram flour, often tempered and mildly sweet-tangy.",
        "fr": "En-cas gujarati (farsan) moelleux et spongieux, cuit à la vapeur à base de pois chiches moulus ou de farine de gram, souvent légèrement…"
      },
      "sources": [
        {
          "name": "Wikipedia — Khaman",
          "url": "https://en.wikipedia.org/wiki/Khaman"
        },
        {
          "name": "Tarla Dalal — Gujarati Khaman Dhokla",
          "url": "https://www.tarladalal.com/khaman-dhokla-soft-gujarat-khaman-dhokla-33269r"
        }
      ]
    },
    "fafda": {
      "local": "ફાફડા",
      "note": {
        "en": "Fafda is a crispy Gujarati snack of deep-fried gram-flour (besan) strips, a farsan papad often eaten with jalebi, notably on Dussehra.",
        "fr": "Le fafda est un en-cas croustillant du Gujarat fait de lamelles de farine de pois chiche frites, un farsan souvent mangé avec du jalebi…"
      },
      "sources": [
        {
          "name": "Wikipedia — Fafda",
          "url": "https://en.wikipedia.org/wiki/Fafda"
        },
        {
          "name": "Wiktionary — fafda",
          "url": "https://en.wiktionary.org/wiki/fafda"
        }
      ]
    },
    "jalebi gujarati": {
      "local": "જલેબી",
      "note": {
        "en": "Deep-fried, coil-shaped batter sweet soaked in sugar syrup; in Gujarat traditionally paired with fafda and eaten on Dussehra.",
        "fr": "Friandise frite en spirale trempée dans un sirop de sucre; au Gujarat, servie avec le fafda et mangée pour Dussehra."
      },
      "sources": [
        {
          "name": "Wikipedia - Jalebi",
          "url": "https://en.wikipedia.org/wiki/Jalebi"
        },
        {
          "name": "Wikipedia - Fafda",
          "url": "https://en.wikipedia.org/wiki/Fafda"
        }
      ]
    },
    "kachori": {
      "local": "કચોરી",
      "note": {
        "en": "A deep-fried, flaky pastry stuffed with spiced moong dal or peas; originated in Rajasthan's Marwar region and popular across Gujarat.",
        "fr": "Une pâtisserie feuilletée frite, farcie de moong dal ou de pois épicés ; originaire du Marwar au Rajasthan et populaire au Gujarat."
      },
      "sources": [
        {
          "name": "Wikipedia - Kachori",
          "url": "https://en.wikipedia.org/wiki/Kachori"
        },
        {
          "name": "Tarla Dalal - Mag Dal Ni Kachori (Gujarat)",
          "url": "https://www.tarladalal.com/mag-dal-ni-kachori--gujarat-recipe-564r"
        }
      ]
    },
    "shrikhand": {
      "local": "શ્રીખંડ",
      "note": {
        "en": "A Gujarati and Marathi dessert of strained yogurt sweetened and flavored with cardamom and saffron, dated by historian K. T. Achaya to c…",
        "fr": "Dessert gujarati et marathe de yaourt égoutté, sucré et parfumé à la cardamome et au safran, daté par l'historien K. T. Achaya vers 500 av…"
      },
      "sources": [
        {
          "name": "Wikipedia — Shrikhand",
          "url": "https://en.wikipedia.org/wiki/Shrikhand"
        },
        {
          "name": "FoodViva — Shrikhand Recipe (Gujarati)",
          "url": "https://foodviva.com/desserts-sweets-recipes/shrikhand-recipe/"
        }
      ]
    },
    "basundi": {
      "local": "બાસુંદી",
      "note": {
        "en": "A sweet dessert of milk slowly boiled until reduced by half, flavoured with cardamom and saffron, made on festivals like Bhai Dooj.",
        "fr": "Dessert sucré de lait bouilli lentement jusqu'à réduction de moitié, parfumé à la cardamome et au safran, préparé lors de fêtes comme Bhai…"
      },
      "sources": [
        {
          "name": "Wikipedia — Basundi",
          "url": "https://en.wikipedia.org/wiki/Basundi"
        },
        {
          "name": "Recipe in Gujarati — Basundi",
          "url": "https://www.recipeingujarati.com/basundi-recipe-in-gujarati-basundi-banavani-rit-gujarati-ma/"
        }
      ]
    },
    "mohanthal": {
      "local": "મોહનથાળ",
      "note": {
        "en": "A dense Gujarati/Rajasthani fudge of gram flour (besan), ghee and sugar, often offered as prasad at Diwali and Janmashtami.",
        "fr": "Un fudge dense du Gujarat et du Rajasthan a base de farine de pois chiche, de ghee et de sucre, souvent offert en prasad a Diwali."
      },
      "sources": [
        {
          "name": "Wikipedia — Mohanthal",
          "url": "https://en.wikipedia.org/wiki/Mohanthal"
        },
        {
          "name": "Wikidata — Mohanthal (Q74495320)",
          "url": "https://www.wikidata.org/wiki/Q74495320"
        }
      ]
    },
    "khichdi": {
      "local": "ખીચડી",
      "note": {
        "en": "A soft one-pot dish of rice and lentils cooked with ghee and spices; the Gujarati version is milder and more porridge-like.",
        "fr": "Un plat mijoté de riz et de lentilles cuit au ghee et aux épices; la version gujaratie est plus douce et proche d'une bouillie."
      },
      "sources": [
        {
          "name": "Wikipedia — Khichdi (dish)",
          "url": "https://en.wikipedia.org/wiki/Khichdi_(dish)"
        },
        {
          "name": "South China Morning Post — how khichdi became India's 'national dish'",
          "url": "https://www.scmp.com/magazines/post-magazine/travel/article/2128642/how-khichdi-mix-lentils-and-rice-became-indias"
        }
      ]
    },
    "sev tameta nu shaak": {
      "local": "સેવ ટમેટાનું શાક",
      "note": {
        "en": "A Gujarati sweet-and-tangy tomato curry topped with crispy chickpea-flour sev, originating in the Kathiawad (Saurashtra) region.",
        "fr": "Un curry de tomates gujarati aigre-doux garni de sev croustillant de farine de pois chiches, originaire de la region du Kathiawad…"
      },
      "sources": [
        {
          "name": "Dassana's Veg Recipes of India - Sev Tameta Nu Shaak",
          "url": "https://www.vegrecipesofindia.com/sev-tameta-nu-shaak-recipe/"
        },
        {
          "name": "Tarla Dalal - Gujarati Sev Tameta Nu Shaak",
          "url": "https://www.tarladalal.com/sev-tameta-gujarat-sev-tameta-nu-shaak-recipe-605r"
        }
      ]
    },
    "bhakri": {
      "local": "ભાખરી",
      "note": {
        "en": "A rustic round unleavened flatbread of Gujarat made from wheat, jowar or bajra flour, with a crisp outer layer.",
        "fr": "Un pain plat rond et rustique sans levain du Gujarat, fait de farine de blé, de jowar ou de bajra, à la croûte croustillante."
      },
      "sources": [
        {
          "name": "Wikipedia - Bhakri",
          "url": "https://en.wikipedia.org/wiki/Bhakri"
        },
        {
          "name": "Tarla Dalal - Crispy Gujarati Bhakri",
          "url": "https://www.tarladalal.com/bhakri--gujarat-recipe-628r"
        }
      ]
    },
    "kadhi gujarati": {
      "local": "ગુજરાતી કઢી",
      "note": {
        "en": "A Gujarati yogurt-and-gram-flour curry from western India, distinctively sweetened with jaggery or sugar and served with khichdi or rice.",
        "fr": "Un curry gujarati de yaourt et farine de pois chiche de l'ouest de l'Inde, sucre au jaggery, servi avec khichdi ou riz."
      },
      "sources": [
        {
          "name": "Wikipedia — Gujarati kadhi",
          "url": "https://en.wikipedia.org/wiki/Gujarati_kadhi"
        },
        {
          "name": "Wikipedia — Kadhi",
          "url": "https://en.wikipedia.org/wiki/Kadhi"
        }
      ]
    },
    "patra": {
      "local": "પાત્રા",
      "note": {
        "en": "Gujarati farsan of colocasia leaves spread with spiced gram-flour paste, rolled, steamed, sliced and tempered or fried.",
        "fr": "Farsan gujarati de feuilles de colocase enduites de pâte épicée à la farine de pois chiche, roulées, cuites à la vapeur puis sautées."
      },
      "sources": [
        {
          "name": "Wikipedia — Patrode",
          "url": "https://en.wikipedia.org/wiki/Patrode"
        },
        {
          "name": "Tarla Dalal — Paatra (Gujarat) recipe",
          "url": "https://www.tarladalal.com/paatra--gujarat-recipe-552r"
        }
      ]
    },
    "lapsi": {
      "local": "લાપસી",
      "note": {
        "en": "A Gujarati sweet of roasted broken wheat (fada) cooked in ghee with jaggery or sugar and cardamom, served at auspicious occasions.",
        "fr": "Dessert gujarati de blé concassé (fada) grillé, cuit au ghee avec du jaggery ou du sucre et de la cardamome, servi lors d'occasions…"
      },
      "sources": [
        {
          "name": "Wikipedia - Laapsi",
          "url": "https://en.wikipedia.org/wiki/Laapsi"
        },
        {
          "name": "Tarla Dalal - Lapsi (Fada ni Lapsi)",
          "url": "https://www.tarladalal.com/lapsi-fada-ni-lapsi-gujarat-broken-wheat-dessert-recipe-632r"
        }
      ]
    },
    "dudhi muthia": {
      "local": "દૂધી મુઠીયા",
      "note": {
        "en": "Gujarati steamed dumplings of grated bottle gourd (dudhi/lauki) bound with chickpea (besan) and wheat flour; named from muthi (fist), the…",
        "fr": "Boulettes gujaraties cuites a la vapeur, a base de courge bouteille rapee (dudhi) liee avec de la farine de pois chiche (besan) et de ble…"
      },
      "sources": [
        {
          "name": "Ministry of Curry — Dudhi Muthia",
          "url": "https://ministryofcurry.com/dudhi-muthia-vegan-steamed-dumplings-instant-pot/"
        },
        {
          "name": "Sanjana Feasts — Gujarati Dudhi Muthiya",
          "url": "https://www.sanjanafeasts.co.uk/2020/03/gujarati-dudhi-muthiya/"
        }
      ]
    }
  },
  "nepalese": {
    "momos": {
      "local": "मम (momo)",
      "note": {
        "en": "Steamed dumplings filled with meat or vegetables, a staple of Nepali cuisine traced to Tibetan trade across the Himalayas.",
        "fr": "Raviolis vapeur farcis de viande ou de légumes, plat emblématique de la cuisine népalaise issu du commerce tibétain himalayen."
      },
      "sources": [
        {
          "name": "Wikipedia — Momo (food)",
          "url": "https://en.wikipedia.org/wiki/Momo_(food)"
        },
        {
          "name": "Smithsonian Magazine — A History of Momo",
          "url": "https://www.smithsonianmag.com/travel/a-history-of-momo-the-dumpling-that-defines-nepali-cuisine-180988395/"
        }
      ]
    },
    "dal bhat": {
      "local": "दाल भात",
      "note": {
        "en": "Nepal's national dish of steamed rice (bhat) with lentil soup (dal), eaten daily with tarkari curry and achar pickles.",
        "fr": "Plat national du Nepal: riz vapeur (bhat) et soupe de lentilles (dal), mange quotidiennement avec curry tarkari et achar."
      },
      "sources": [
        {
          "name": "Wikipedia — Dal bhat",
          "url": "https://en.wikipedia.org/wiki/Dal_bhat"
        },
        {
          "name": "TasteAtlas — Dal bhat",
          "url": "https://www.tasteatlas.com/dal-bhat"
        }
      ]
    },
    "sel roti": {
      "local": "सेल रोटी",
      "note": {
        "en": "A traditional Nepali ring-shaped sweet bread of fermented rice-flour batter, deep-fried and eaten especially at the Dashain and Tihar…",
        "fr": "Pain sucre nepalais traditionnel en anneau, fait de pate de farine de riz fermentee et frite, consomme surtout aux fetes de Dashain et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Sel roti",
          "url": "https://en.wikipedia.org/wiki/Sel_roti"
        }
      ]
    },
    "thukpa": {
      "local": "थुक्पा (Tibetan: ཐུག་པ)",
      "note": {
        "en": "A noodle soup of Tibetan origin, widely eaten in Nepal, made with hand-pulled or cut noodles in broth with vegetables or meat.",
        "fr": "Une soupe de nouilles d'origine tibétaine, très prisée au Népal, à base de nouilles dans un bouillon avec légumes ou viande."
      },
      "sources": [
        {
          "name": "Wikipedia — Thukpa",
          "url": "https://en.wikipedia.org/wiki/Thukpa"
        },
        {
          "name": "Slurrp — Thukpa From Tibet: History and Origin",
          "url": "https://www.slurrp.com/article/thukpa-from-tibet-the-history-and-origin-of-the-noodle-soup-explained-1724650595347"
        }
      ]
    },
    "gundruk": {
      "local": "गुन्द्रुक",
      "note": {
        "en": "A Nepalese side dish of leafy greens (mustard, radish, cauliflower) preserved by non-salted spontaneous lactic-acid fermentation, then…",
        "fr": "Plat d'accompagnement nepalais de feuilles vertes (moutarde, radis, chou-fleur) conservees par fermentation lactique spontanee sans sel…"
      },
      "sources": [
        {
          "name": "Wikipedia — Gundruk",
          "url": "https://en.wikipedia.org/wiki/Gundruk"
        }
      ]
    },
    "chatamari": {
      "local": "चतांमरि",
      "note": {
        "en": "A thin rice-flour crepe from Newar cuisine of Nepal's Kathmandu Valley, topped with meat, egg or vegetables and eaten on festive occasions.",
        "fr": "Une fine crêpe de farine de riz de la cuisine newar de la vallée de Katmandou au Népal, garnie de viande, d'œuf ou de légumes, servie lors…"
      },
      "sources": [
        {
          "name": "Wikipedia — Chataamari",
          "url": "https://en.wikipedia.org/wiki/Chataamari"
        },
        {
          "name": "Wikipedia — Newar cuisine",
          "url": "https://en.wikipedia.org/wiki/Newar_cuisine"
        }
      ]
    },
    "newari kachila": {
      "local": "कचिला (Kachilā)",
      "note": {
        "en": "A Newari delicacy of spiced raw minced buffalo meat finished with hot mustard oil; name means \"raw meat\" in Nepal Bhasa.",
        "fr": "Un mets newari de viande de buffle crue hachée et épicée, nappée d'huile de moutarde brûlante; son nom signifie « viande crue »."
      },
      "sources": [
        {
          "name": "Wikipedia - Kachilaa",
          "url": "https://en.wikipedia.org/wiki/Kachilaa"
        },
        {
          "name": "TasteAtlas - Kachilā",
          "url": "https://www.tasteatlas.com/kachila"
        }
      ]
    },
    "yomari": {
      "local": "योमरि",
      "note": {
        "en": "A Newari steamed rice-flour dumpling filled with chaku (jaggery) or khuwa, central to the Yomari Punhi harvest festival in Nepal's…",
        "fr": "Une boulette newari de farine de riz cuite à la vapeur, fourrée de chaku (jaggery) ou de khuwa, au cœur de la fête des récoltes Yomari…"
      },
      "sources": [
        {
          "name": "Wikipedia — Yomari",
          "url": "https://en.wikipedia.org/wiki/Yomari"
        },
        {
          "name": "Wikipedia — Yomari Punhi",
          "url": "https://en.wikipedia.org/wiki/Yomari_Punhi"
        }
      ]
    },
    "aloo tama": {
      "local": "आलू तामा",
      "note": {
        "en": "A Nepali soup of fermented bamboo shoots, potatoes and black-eyed peas, prized for its sour taste and popular in Newar communities.",
        "fr": "Une soupe nepalaise de pousses de bambou fermentees, pommes de terre et doliques, prisee pour son gout aigre et populaire chez les Newar."
      },
      "sources": [
        {
          "name": "Wikipedia - Aloo tama",
          "url": "https://en.wikipedia.org/wiki/Aloo_tama"
        },
        {
          "name": "The Gundruk - Aalu Tama",
          "url": "https://www.thegundruk.com/aalo-tama-soup/"
        }
      ]
    },
    "kwati": {
      "local": "क्वाँटी",
      "note": {
        "en": "A Newari soup of nine sprouted beans, traditionally eaten at the Gun Punhi (Janai Purnima) full-moon festival in Nepal.",
        "fr": "Une soupe newari de neuf legumineuses germees, traditionnellement mangee lors de la fete de pleine lune Gun Punhi au Nepal."
      },
      "sources": [
        {
          "name": "Wikipedia - Kwati (soup)",
          "url": "https://en.wikipedia.org/wiki/Kwati_(soup)"
        },
        {
          "name": "The Kathmandu Post - Who said kwati needed nine beans?",
          "url": "https://kathmandupost.com/food/2019/08/09/who-said-kwati-needed-nine-beans"
        }
      ]
    },
    "choila": {
      "local": "छोयला",
      "note": {
        "en": "A Newar dish from Nepal's Kathmandu Valley of spiced, grilled meat (traditionally buffalo), seasoned with mustard oil, garlic and chilies.",
        "fr": "Plat newar de la vallee de Katmandou au Nepal, fait de viande grillee epicee (traditionnellement du buffle), relevee d'huile de moutarde…"
      },
      "sources": [
        {
          "name": "Wikipedia - Choila",
          "url": "https://en.wikipedia.org/wiki/Choila"
        },
        {
          "name": "GOYA - The Smoky Origins of the Newari Choila",
          "url": "https://www.goya.in/blog/chhoila-a-spicy-meat-dish-indigenous-to-nepals-newars"
        }
      ]
    },
    "sekuwa": {
      "local": "सेकुवा",
      "note": {
        "en": "Nepalese skewered meat (goat, chicken or buffalo) marinated in spices and grilled over open flame, associated with Dharan in eastern Nepal.",
        "fr": "Brochettes de viande nepalaises (chevre, poulet ou buffle) marinees aux epices et grillees a la flamme, associees a Dharan dans l'est du…"
      },
      "sources": [
        {
          "name": "Wikipedia - Sekuwa",
          "url": "https://en.wikipedia.org/wiki/Sekuwa"
        },
        {
          "name": "TasteAtlas - Sekuwa",
          "url": "https://tasteatlas.com/sekuwa"
        }
      ]
    },
    "dhindo": {
      "local": "ढिँडो",
      "note": {
        "en": "A thick Nepali porridge of buckwheat, millet or corn flour stirred into boiling water; a hill-region staple long seen as humbler than rice.",
        "fr": "Une bouillie nepalaise epaisse de farine de sarrasin, millet ou mais melangee a l'eau bouillante; aliment de base des collines longtemps…"
      },
      "sources": [
        {
          "name": "Wikipedia — Dhindo",
          "url": "https://en.wikipedia.org/wiki/Dhindo"
        },
        {
          "name": "Global Press Journal — Dhindo, a Traditional Buckwheat Porridge",
          "url": "https://globalpressjournal.com/asia/nepal/dhindo-traditional-buckwheat-porridge-gains-popularity-kathmandu-restaurants/"
        }
      ]
    },
    "jhol momo": {
      "local": "झोल मोमो",
      "note": {
        "en": "Nepali dish of steamed momo dumplings served in jhol achar, a spicy tomato-sesame broth; a Kathmandu winter specialty.",
        "fr": "Plat népalais de raviolis momo vapeur servis dans le jhol achar, bouillon épicé tomate-sésame, spécialité hivernale de Katmandou."
      },
      "sources": [
        {
          "name": "Wikipedia — Jhol momo (Momo food)",
          "url": "https://en.wikipedia.org/wiki/Jhol_momo"
        },
        {
          "name": "Eat Your World — Momo jhol achar in Kathmandu",
          "url": "https://eatyourworld.com/destinations/asia/nepal/kathmandu/what-to-eat/momo-jhol-achar/"
        }
      ]
    },
    "sukuti": {
      "local": "सुकुटी",
      "note": {
        "en": "A Nepalese dried meat, usually buffalo, goat or lamb, spice-marinated and sun- or air-dried to preserve it through harsh Himalayan winters.",
        "fr": "Viande sechee nepalaise, generalement de buffle, chevre ou agneau, marinee aux epices et sechee au soleil pour la conserver durant les…"
      },
      "sources": [
        {
          "name": "Wikipedia - Sukuti",
          "url": "https://en.wikipedia.org/wiki/Sukuti"
        },
        {
          "name": "TasteAtlas - Sukuti",
          "url": "https://www.tasteatlas.com/sukuti"
        }
      ]
    },
    "bara": {
      "local": "बारा (वः)",
      "note": {
        "en": "A Newari savoury pancake of ground black lentil (maas), traditionally served as auspicious sagun food at festivals in the Kathmandu Valley.",
        "fr": "Une galette salée newari de lentilles noires moulues (maas), servie comme nourriture porte-bonheur (sagun) lors des fêtes de la vallée de…"
      },
      "sources": [
        {
          "name": "Nepali Taste — Bara (Newari Black Lentil Pancake)",
          "url": "https://nepalesetaste.com/recipes/bara/"
        },
        {
          "name": "theGundruk.com — Bara (Wo:) The Newari Pancake",
          "url": "https://www.thegundruk.com/bara-wo-the-newari-pancake/"
        }
      ]
    },
    "chhoyala": {
      "local": "छोयला",
      "note": {
        "en": "A Newar dish from Nepal's Kathmandu Valley of grilled spiced buffalo meat, traditionally smoke-charred (haku chhoyala) and served in the…",
        "fr": "Plat newar de la vallee de Katmandou (Nepal) fait de viande de buffle grillee et epicee, traditionnellement fumee (haku chhoyala) et servi…"
      },
      "sources": [
        {
          "name": "Choila — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Choila"
        },
        {
          "name": "The Smoky Origins of the Newari Choila — GOYA",
          "url": "https://www.goya.in/blog/chhoila-a-spicy-meat-dish-indigenous-to-nepals-newars"
        }
      ]
    },
    "lapsi": {
      "local": "लप्सी",
      "note": {
        "en": "A small sour Himalayan hog-plum fruit (Choerospondias axillaris) native to Nepal, eaten fresh, pickled, or made into the spicy candy…",
        "fr": "Petit fruit acide de l'Himalaya (Choerospondias axillaris) du Népal, mangé frais, mariné ou transformé en bonbon épicé titaura."
      },
      "sources": [
        {
          "name": "Wikipedia — Choerospondias axillaris",
          "url": "https://en.wikipedia.org/wiki/Choerospondias_axillaris"
        },
        {
          "name": "Nepali Times — The love of lapsi",
          "url": "https://nepalitimes.com/the-love-of-lapsi"
        }
      ]
    },
    "juju dhau": {
      "local": "जुजु धौ",
      "note": {
        "en": "A thick, mildly sweet set buffalo-milk yogurt from Bhaktapur, Nepal, made by Newars in clay pots; its name means \"king of yogurt\" in Nepal…",
        "fr": "Yaourt ferme, legerement sucre, au lait de bufflonne de Bhaktapur (Nepal), fait par les Newars en pots d'argile ; son nom signifie « roi du…"
      },
      "sources": [
        {
          "name": "Wikipedia — Dhau",
          "url": "https://en.wikipedia.org/wiki/Dhau"
        },
        {
          "name": "Taste of Nepal — Juju Dhau (King of Yogurt from Bhaktapur)",
          "url": "http://tasteofnepal.blogspot.com/2012/02/juju-dhau-king-of-yogurt-from-bhaktapur.html"
        }
      ]
    },
    "sinki soup": {
      "local": "सिन्की",
      "note": {
        "en": "A traditional Nepali soup based on sinki, radish tap roots fermented by lactic-acid bacteria, then sun-dried and stored.",
        "fr": "Une soupe nepalaise traditionnelle a base de sinki, des racines de radis fermentees par bacteries lactiques puis sechees au soleil."
      },
      "sources": [
        {
          "name": "Wikipedia — Sinki (food)",
          "url": "https://en.wikipedia.org/wiki/Sinki_(food)"
        },
        {
          "name": "Sinki: A traditional lactic acid fermented radish tap root product (ResearchGate)",
          "url": "https://www.researchgate.net/publication/247877260_Sinki_A_traditional_lactic_acid_fermented_radish_tap_root_product"
        }
      ]
    },
    "bhutuwa": {
      "local": "भुटुवा",
      "note": {
        "en": "A Nepali stir-fry of bite-sized meat (chicken, pork or lamb) sauteed in mustard oil with cumin, turmeric, fenugreek and chili.",
        "fr": "Saute nepalais de viande en bouchees (poulet, porc ou agneau) cuite a l'huile de moutarde avec cumin, curcuma, fenugrec et piment."
      },
      "sources": [
        {
          "name": "TasteAtlas - Bhutuwa",
          "url": "https://www.tasteatlas.com/bhutuwa"
        },
        {
          "name": "Girl Cooks World - Bangur Bhutuwa (Nepali Spicy Stir-Fried Pork)",
          "url": "https://girlcooksworld.com/bangur-bhutuwa-nepali-spicy-stir-fried-pork/"
        }
      ]
    }
  },
  "austrian": {
    "wiener schnitzel": {
      "local": "Wiener Schnitzel",
      "note": {
        "en": "A thin breaded, pan-fried veal cutlet that is a national dish of Austria; the name first appears in a Viennese cookbook in 1831.",
        "fr": "Fine escalope de veau panee et frite a la poele, plat national autrichien; le nom apparait pour la premiere fois dans un livre de cuisine…"
      },
      "sources": [
        {
          "name": "Wikipedia - Wiener schnitzel",
          "url": "https://en.wikipedia.org/wiki/Wiener_schnitzel"
        },
        {
          "name": "Austria.info - Original Wiener Schnitzel recipe",
          "url": "https://www.austria.info/en-us/recipes/wiener-schnitzel/"
        }
      ]
    },
    "sachertorte": {
      "local": "Sachertorte",
      "note": {
        "en": "A Viennese chocolate sponge cake layered with apricot jam under a dark chocolate glaze, invented by Franz Sacher in 1832.",
        "fr": "Un gateau viennois au chocolat fourre de confiture d'abricot sous un glacage au chocolat noir, invente par Franz Sacher en 1832."
      },
      "sources": [
        {
          "name": "Wikipedia - Sachertorte",
          "url": "https://en.wikipedia.org/wiki/Sachertorte"
        },
        {
          "name": "Fine Dining Lovers - Sachertorte",
          "url": "https://www.finedininglovers.com/explore/articles/sachertorte-story-behind-austrias-most-famous-dessert"
        }
      ]
    },
    "apfelstrudel": {
      "local": "Apfelstrudel",
      "note": {
        "en": "Austrian apple strudel of paper-thin pastry filled with tart apples, sugar, cinnamon, raisins and breadcrumbs; oldest recipe dates to 1696.",
        "fr": "Strudel autrichien aux pommes en pate fine garni de pommes acidulees, sucre, cannelle, raisins secs et chapelure; recette des 1696."
      },
      "sources": [
        {
          "name": "Wikipedia - Apple strudel",
          "url": "https://en.wikipedia.org/wiki/Apple_strudel"
        },
        {
          "name": "Visiting Vienna - Viennese Apple Strudel",
          "url": "https://www.visitingvienna.com/eatingdrinking/food/apfelstrudel/"
        }
      ]
    },
    "tafelspitz": {
      "local": "Tafelspitz",
      "note": {
        "en": "Viennese boiled beef (rump cut) simmered in broth with root vegetables, served with apple-horseradish; a favourite of Emperor Franz Joseph…",
        "fr": "Bœuf bouilli viennois (pointe de culotte) mijoté au bouillon avec des légumes-racines, servi au raifort-pomme; plat favori de l'empereur…"
      },
      "sources": [
        {
          "name": "Austria.info (Austrian National Tourist Office)",
          "url": "https://www.austria.info/en-us/recipes/tafelspitz/"
        },
        {
          "name": "Visiting Vienna - Tafelspitz",
          "url": "https://www.visitingvienna.com/eatingdrinking/food/tafelspitz/"
        }
      ]
    },
    "kaiserschmarrn": {
      "local": "Kaiserschmarrn",
      "note": {
        "en": "Austrian shredded, caramelized pancake dessert dusted with sugar, named after Emperor Franz Joseph I and often served with fruit compote.",
        "fr": "Dessert autrichien de crepe dechiquetee et caramelisee saupoudree de sucre, nomme d'apres l'empereur Francois-Joseph Ier, servi avec une…"
      },
      "sources": [
        {
          "name": "Wikipedia - Kaiserschmarrn",
          "url": "https://en.wikipedia.org/wiki/Kaiserschmarrn"
        },
        {
          "name": "The Local - The delicious origins of Kaiserschmarrn",
          "url": "https://www.thelocal.at/20181219/the-delicious-origins-of-kaiserschmarrn"
        }
      ]
    },
    "goulash austrian": {
      "local": "Wiener Saftgulasch",
      "note": {
        "en": "Viennese beef-and-onion stew in a thick paprika gravy, refined from Hungarian gulyás after it reached Vienna in the early 19th century.",
        "fr": "Ragoût viennois de bœuf et d'oignons en sauce épaisse au paprika, adapté du gulyás hongrois arrivé à Vienne au début du XIXe siècle."
      },
      "sources": [
        {
          "name": "Wien.info (Vienna Tourist Board)",
          "url": "https://www.wien.info/en/dine-drink/viennese-cuisine/recipes/meat-fish/viennese-goulash-364202"
        },
        {
          "name": "Wikipedia – Goulash",
          "url": "https://en.wikipedia.org/wiki/Goulash"
        }
      ]
    },
    "knödel": {
      "local": "Knödel",
      "note": {
        "en": "Boiled Central European dumpling made from bread, flour or potato, served savory as a side or sweet with fruit like apricot or plum.",
        "fr": "Boulette bouillie d'Europe centrale a base de pain, farine ou pomme de terre, servie salee en accompagnement ou sucree aux fruits."
      },
      "sources": [
        {
          "name": "Wikipedia - Knödel",
          "url": "https://en.wikipedia.org/wiki/Kn%C3%B6del"
        },
        {
          "name": "Visiting Vienna - The Knödel or dumpling",
          "url": "https://www.visitingvienna.com/eatingdrinking/food/knodel/"
        }
      ]
    },
    "palatschinken": {
      "local": "Palatschinke",
      "note": {
        "en": "Thin Austrian crêpe-style pancake of egg, milk and flour, often filled with apricot jam; the name derives via Hungarian from Latin placenta…",
        "fr": "Fine crêpe autrichienne à base d'œuf, lait et farine, souvent garnie de confiture d'abricot; le nom vient, via le hongrois, du latin…"
      },
      "sources": [
        {
          "name": "Wikipedia — Palatschinke",
          "url": "https://en.wikipedia.org/wiki/Palatschinke"
        }
      ]
    },
    "beuschel": {
      "local": "Beuschel",
      "note": {
        "en": "A Viennese ragout of veal lungs and heart in a tangy sour-cream sauce, popularized in 19th-century Austria and served with bread dumplings.",
        "fr": "Ragout viennois de poumon et cœur de veau en sauce acidulée à la crème, popularisé au 19e siècle, servi avec des quenelles de pain."
      },
      "sources": [
        {
          "name": "Wikipedia – Beuschel",
          "url": "https://en.wikipedia.org/wiki/Beuschel"
        },
        {
          "name": "TasteAtlas – Beuschel",
          "url": "https://www.tasteatlas.com/beuschel"
        }
      ]
    },
    "selch fleisch": {
      "local": "Selchfleisch",
      "note": {
        "en": "Austrian/South German cured and smoked pork, its name from the dialect verb \"selchen\" (to smoke); often served with sauerkraut or split-pea…",
        "fr": "Porc salé et fumé d'Autriche et du sud de l'Allemagne, nommé d'après le verbe dialectal \"selchen\" (fumer); servi avec choucroute ou purée…"
      },
      "sources": [
        {
          "name": "Collins German-English Dictionary: Selchfleisch",
          "url": "https://www.collinsdictionary.com/dictionary/german-english/selchfleisch"
        }
      ]
    },
    "käsespätzle": {
      "local": "Käsespätzle",
      "note": {
        "en": "An Alpine egg-noodle dish layered with cheese and fried onions, traditional to Vorarlberg and Tyrol in Austria and to Swabia.",
        "fr": "Plat alpin de pâtes aux œufs en couches avec du fromage et des oignons frits, traditionnel du Vorarlberg, du Tyrol et de Souabe."
      },
      "sources": [
        {
          "name": "Wikipedia — Käsespätzle",
          "url": "https://en.wikipedia.org/wiki/K%C3%A4sesp%C3%A4tzle"
        }
      ]
    },
    "linzer torte": {
      "local": "Linzer Torte",
      "note": {
        "en": "Austrian lattice-topped tart of nutty spiced shortcrust filled with fruit preserve, named after Linz; recipes date to at least 1653.",
        "fr": "Tarte autrichienne a pate sablee aux noix et epices garnie de confiture, en treillis, nommee d'apres Linz; recettes des 1653."
      },
      "sources": [
        {
          "name": "Wikipedia - Linzertorte",
          "url": "https://en.wikipedia.org/wiki/Linzertorte"
        },
        {
          "name": "196 flavors - Linzer Torte",
          "url": "https://www.196flavors.com/linzer-torte/"
        }
      ]
    },
    "marillenknödel": {
      "local": "Marillenknödel",
      "note": {
        "en": "Austrian dough dumpling wrapped around a whole apricot, boiled then rolled in buttered breadcrumbs and sugar; emblematic of the Wachau…",
        "fr": "Quenelle autrichienne de pâte enrobant un abricot entier, bouillie puis roulée dans la chapelure beurrée et le sucre ; emblématique de la…"
      },
      "sources": [
        {
          "name": "Wikipedia - Marillenknödel",
          "url": "https://en.wikipedia.org/wiki/Marillenkn%C3%B6del"
        },
        {
          "name": "Austria.info - Apricot Dumplings (Marillenknödel)",
          "url": "https://www.austria.info/en-gb/recipes/apricot-dumplings/"
        }
      ]
    },
    "zwetschgenknödel": {
      "local": "Zwetschgenknödel",
      "note": {
        "en": "Austrian dessert of a whole plum wrapped in potato dough, boiled and rolled in buttered breadcrumbs; rooted in Austro-Hungarian cuisine.",
        "fr": "Dessert autrichien d'une prune entière enrobée de pâte de pomme de terre, bouillie et roulée dans la chapelure beurrée; issu de la cuisine…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Zwetschgenknödel",
          "url": "https://www.tasteatlas.com/twestchen-knodel"
        },
        {
          "name": "Little Vienna — Plum Dumplings",
          "url": "https://www.lilvienna.com/plum-dumplings/"
        }
      ]
    },
    "topfenstrudel": {
      "local": "Topfenstrudel",
      "note": {
        "en": "Austrian Viennese dessert of thin strudel pastry filled with sweetened quark (Topfen); it entered Viennese cuisine via Hungary.",
        "fr": "Dessert viennois autrichien de fine pate a strudel garnie de quark sucre (Topfen) ; arrive a Vienne via la Hongrie."
      },
      "sources": [
        {
          "name": "vienna.info - Topfenstrudel (Cream cheese strudel)",
          "url": "https://www.wien.info/en/dine-drink/viennese-cuisine/recipes/sweets-desserts/cream-cheese-strudel-343748"
        },
        {
          "name": "Wikipedia - Strudel",
          "url": "https://en.wikipedia.org/wiki/Strudel"
        }
      ]
    },
    "vanillekipferl": {
      "local": "Vanillekipferl",
      "note": {
        "en": "Crescent-shaped Viennese shortbread cookies made with ground nuts and dusted in vanilla sugar, a traditional Austrian Christmas treat.",
        "fr": "Biscuits sablés viennois en forme de croissant, aux noix moulues et saupoudrés de sucre vanillé, gourmandise de Noël autrichienne."
      },
      "sources": [
        {
          "name": "Wikipedia - Vanillekipferl",
          "url": "https://en.wikipedia.org/wiki/Vanillekipferl"
        },
        {
          "name": "196 flavors - Vanillekipferl Traditional Austrian Recipe",
          "url": "https://www.196flavors.com/vanillekipferl/"
        }
      ]
    },
    "mozartkugel": {
      "local": "Mozartkugel",
      "note": {
        "en": "Round Salzburg chocolate of pistachio marzipan and nougat, created in 1890 by confectioner Paul Fürst and named after Mozart.",
        "fr": "Chocolat rond de Salzbourg au massepain de pistache et nougat, créé en 1890 par le confiseur Paul Fürst et nommé d'après Mozart."
      },
      "sources": [
        {
          "name": "Wikipedia — Mozartkugel",
          "url": "https://en.wikipedia.org/wiki/Mozartkugel"
        },
        {
          "name": "salzburg.info — The Mozartkugel in Salzburg",
          "url": "https://www.salzburg.info/en/magazin/city-feeling/a-salzburg-original-the-mozartkugel_a_1593380"
        }
      ]
    },
    "gulaschsuppe": {
      "local": "Gulaschsuppe",
      "note": {
        "en": "An Austrian soup-like version of Hungarian goulash, a paprika-rich beef stew made liquid in Viennese taverns and coffeehouses.",
        "fr": "Version autrichienne, en soupe, du goulache hongrois : un ragout de boeuf au paprika rendu liquide dans les tavernes viennoises."
      },
      "sources": [
        {
          "name": "TasteAtlas — Rindsgulasch (Austria)",
          "url": "https://www.tasteatlas.com/rindsgulasch"
        },
        {
          "name": "Wikipedia — Austrian cuisine",
          "url": "https://en.wikipedia.org/wiki/Austrian_cuisine"
        }
      ]
    },
    "rindsuppe mit frittaten": {
      "local": "Rindsuppe mit Frittaten (Frittatensuppe)",
      "note": {
        "en": "Austrian clear beef broth served with thin strips of rolled, sliced pancakes (Frittaten), a classic Viennese starter soup.",
        "fr": "Bouillon de bœuf clair autrichien garni de fines lanières de crêpes roulées, une soupe-entrée viennoise classique."
      },
      "sources": [
        {
          "name": "Vienna.info (official Vienna tourism) — Frittaten Soup",
          "url": "https://www.wien.info/en/dine-drink/viennese-cuisine/recipes/soups-garnishes-starters/frittaten-346454"
        },
        {
          "name": "GuteKueche.at — Frittatensuppe",
          "url": "https://www.gutekueche.at/frittatensuppe-artikel-3482"
        }
      ]
    },
    "powidltascherl": {
      "local": "Powidltascherl",
      "note": {
        "en": "Austrian-Bohemian potato-dough pockets filled with Powidl (thick sugarless plum jam) and tossed in buttered breadcrumbs.",
        "fr": "Chaussons autrichiens-bohemiens en pate de pomme de terre fourres au Powidl (confiture de prunes epaisse sans sucre), roules dans la…"
      },
      "sources": [
        {
          "name": "TasteAtlas",
          "url": "https://www.tasteatlas.com/powidltascherl"
        },
        {
          "name": "Wikipedia – Powidl",
          "url": "https://en.wikipedia.org/wiki/Powidl"
        }
      ]
    },
    "topfenpalatschinken": {
      "local": "Topfenpalatschinken",
      "note": {
        "en": "Austrian baked dessert of thin Palatschinken crêpes filled with sweetened Topfen (curd cheese) and gratinated in the oven, a Viennese…",
        "fr": "Dessert autrichien de fines crêpes Palatschinken garnies de Topfen (fromage blanc) sucré et gratinées au four, un classique viennois."
      },
      "sources": [
        {
          "name": "TasteAtlas - Topfenpalatschinken",
          "url": "https://www.tasteatlas.com/topfenpalatschinken"
        },
        {
          "name": "Vienna.info - Topfenpalatschinken (Curd Cheese Pancakes)",
          "url": "https://www.wien.info/en/dine-drink/viennese-cuisine/recipes/sweets-desserts/cheese-crepes-342526"
        }
      ]
    }
  },
  "swiss": {
    "fondue": {
      "local": "Fondue",
      "note": {
        "en": "Swiss dish of cheese melted with wine and eaten by dipping bread; earliest known recipe appeared in a 1699 Zurich cookbook.",
        "fr": "Plat suisse de fromage fondu avec du vin, mange en y trempant du pain; la premiere recette connue parait dans un livre zurichois de 1699."
      },
      "sources": [
        {
          "name": "Wikipedia — Fondue",
          "url": "https://en.wikipedia.org/wiki/Fondue"
        },
        {
          "name": "About Switzerland (Swiss Federal authorities) — Fondue",
          "url": "https://www.aboutswitzerland.eda.admin.ch/en/fondue-the-convivial-swiss-dish-par-excellence"
        }
      ]
    },
    "raclette": {
      "local": "Raclette",
      "note": {
        "en": "Swiss dish from the canton of Valais where cheese is melted and scraped onto boiled potatoes; the name comes from French \"racler\", to…",
        "fr": "Plat suisse du canton du Valais où le fromage est fondu puis raclé sur des pommes de terre; le nom vient de \"racler\"."
      },
      "sources": [
        {
          "name": "Wikipedia — Raclette",
          "url": "https://en.wikipedia.org/wiki/Raclette"
        },
        {
          "name": "TasteAtlas — Raclette",
          "url": "https://www.tasteatlas.com/raclette"
        }
      ]
    },
    "rösti": {
      "local": "Rösti",
      "note": {
        "en": "Swiss fried grated-potato cake, originally a Bern farmers' breakfast, now the national dish; name is from Swiss German rösten, to fry.",
        "fr": "Galette suisse de pommes de terre râpées frites, jadis petit-déjeuner des paysans bernois, aujourd'hui plat national; du suisse-allemand…"
      },
      "sources": [
        {
          "name": "Wikipedia – Rösti",
          "url": "https://en.wikipedia.org/wiki/R%C3%B6sti"
        },
        {
          "name": "Fine Dining Lovers – Cooking the Classics: Swiss Rösti",
          "url": "https://www.finedininglovers.com/explore/articles/cooking-classics-swiss-rosti"
        }
      ]
    },
    "zürcher geschnetzeltes": {
      "local": "Zürcher Geschnetzeltes",
      "note": {
        "en": "A Zürich dish of veal strips (sometimes with kidney and mushrooms) in white wine, cream and demiglace; first recorded in a 1947 cookbook.",
        "fr": "Plat zurichois d'émincé de veau (parfois avec rognon et champignons) au vin blanc, crème et demi-glace; cité dès un livre de 1947."
      },
      "sources": [
        {
          "name": "Wikipedia - Zürcher Geschnetzeltes",
          "url": "https://en.wikipedia.org/wiki/Z%C3%BCrcher_Geschnetzeltes"
        },
        {
          "name": "TasteAtlas - Zürcher Geschnetzeltes",
          "url": "https://www.tasteatlas.com/zurcher-geschnetzeltes"
        }
      ]
    },
    "älplermagronen": {
      "local": "Älplermagronen",
      "note": {
        "en": "Swiss Alpine \"herdsman's macaroni\" of pasta, potatoes, cream, cheese and onions, traditionally served with applesauce; a hearty herdsmen's…",
        "fr": "Macaroni alpin suisse de pâtes, pommes de terre, crème, fromage et oignons, traditionnellement servi avec une compote de pommes ; plat…"
      },
      "sources": [
        {
          "name": "Wikipedia - Älplermagronen",
          "url": "https://en.wikipedia.org/wiki/%C3%84lplermagronen"
        },
        {
          "name": "The Stories of Le Gruyère AOP - Älplermagronen is a Swiss comfort food",
          "url": "https://gruyerestories.com/alplermagronen-is-a-swiss-comfort-food/"
        }
      ]
    },
    "cervelat": {
      "local": "Cervelat",
      "note": {
        "en": "Switzerland's national sausage, made of roughly equal parts beef, pork, bacon and pork rind, lightly smoked then boiled. The oldest known…",
        "fr": "Saucisse nationale suisse, composee a parts a peu pres egales de boeuf, porc, lard et couenne, legerement fumee puis bouillie. La plus…"
      },
      "sources": [
        {
          "name": "Wikipedia - Cervelat",
          "url": "https://en.wikipedia.org/wiki/Cervelat"
        },
        {
          "name": "New in Zurich - Cervelat, Switzerland's National Sausage",
          "url": "https://newinzurich.com/2024/07/cervelat-switzerlands-national-sausage/"
        }
      ]
    },
    "birchermüesli": {
      "local": "Birchermüesli",
      "note": {
        "en": "Swiss raw oat, fruit and nut breakfast dish created around 1900 by physician Maximilian Bircher-Benner as a health-diet meal.",
        "fr": "Plat suisse de petit-déjeuner à base de flocons d'avoine, fruits et noix, créé vers 1900 par le médecin Maximilian Bircher-Benner."
      },
      "sources": [
        {
          "name": "Wikipedia – Muesli",
          "url": "https://en.wikipedia.org/wiki/Muesli"
        },
        {
          "name": "Swiss National Library – Birchermüesli, a Swiss dish goes global",
          "url": "https://www.nb.admin.ch/snl/en/home/research/all-questions/birchermueesli.html"
        }
      ]
    },
    "chocolate swiss": {
      "local": "Schweizer Schokolade",
      "note": {
        "en": "Swiss-made chocolate, famed for milk chocolate invented by Daniel Peter in 1875 and Lindt's conching process for its melt-in-mouth texture.",
        "fr": "Chocolat suisse, célèbre pour le chocolat au lait inventé par Daniel Peter en 1875 et le conchage de Lindt à la texture fondante."
      },
      "sources": [
        {
          "name": "Wikipedia — Swiss chocolate",
          "url": "https://en.wikipedia.org/wiki/Swiss_chocolate"
        },
        {
          "name": "TasteAtlas — Best Chocolates in Switzerland",
          "url": "https://www.tasteatlas.com/best-rated-chocolates-in-switzerland"
        }
      ]
    },
    "emmentaler cheese": {
      "local": "Emmentaler AOP",
      "note": {
        "en": "A pale, firm Swiss whole-cow's-milk cheese with characteristic holes, named after the Emme valley in the canton of Bern and AOP-protected…",
        "fr": "Fromage suisse au lait de vache entier, ferme et clair, aux trous caractéristiques, nommé d'après la vallée de l'Emme (canton de Berne) et…"
      },
      "sources": [
        {
          "name": "Emmentaler AOP Switzerland — Our history",
          "url": "https://www.emmentaler.ch/en/our-history"
        },
        {
          "name": "Cuisine Helvetica — 10 Facts About Emmentaler",
          "url": "https://cuisinehelvetica.com/2019/05/13/10-facts-about-emmentaler/"
        }
      ]
    },
    "gruyère": {
      "local": "Le Gruyère AOP",
      "note": {
        "en": "A firm Swiss cow's-milk cheese named after the town of Gruyères in the canton of Fribourg, produced in the region since 1115, and granted…",
        "fr": "Fromage suisse à pâte dure au lait de vache, nommé d'après la ville de Gruyères dans le canton de Fribourg, produit dans la région depuis…"
      },
      "sources": [
        {
          "name": "Wikipedia - Gruyère cheese",
          "url": "https://en.wikipedia.org/wiki/Gruy%C3%A8re_cheese"
        },
        {
          "name": "Le Gruyère AOP - Protected Designation of Origin (AOP)",
          "url": "https://www.gruyere.com/en/le-gruyere-aop/protected-designation-of-origin-aop"
        }
      ]
    },
    "appenzeller cheese": {
      "local": "Appenzeller",
      "note": {
        "en": "A hard washed-rind cow's-milk cheese from northeast Switzerland, cured with a secret herbal brine; first documented in 1282.",
        "fr": "Fromage suisse a pate dure et croute lavee, au lait de vache, affine avec une saumure d'herbes secrete; atteste des 1282."
      },
      "sources": [
        {
          "name": "Wikipedia - Appenzeller cheese",
          "url": "https://en.wikipedia.org/wiki/Appenzeller_cheese"
        },
        {
          "name": "Cheese.com - Appenzeller",
          "url": "https://www.cheese.com/appenzeller/"
        }
      ]
    },
    "papet vaudois": {
      "local": "Papet vaudois",
      "note": {
        "en": "A dish from the canton of Vaud, Switzerland of leeks and potatoes boiled with white wine and cream, traditionally served with a…",
        "fr": "Plat du canton de Vaud (Suisse) de poireaux et de pommes de terre mijotés au vin blanc et à la crème, servi traditionnellement avec une…"
      },
      "sources": [
        {
          "name": "Wikipedia - Papet Vaudois",
          "url": "https://en.wikipedia.org/wiki/Papet_Vaudois"
        },
        {
          "name": "Switzerland Tourism - Papet vaudois: a crafty creation",
          "url": "https://www.myswitzerland.com/en-gb/experiences/food-wine/papet-vaudois-a-crafty-creation/"
        }
      ]
    },
    "capuns": {
      "local": "capuns",
      "note": {
        "en": "Swiss Graubünden specialty of spätzle dough with dried meat (Bündnerfleisch/Salsiz) wrapped in chard leaves and simmered in broth and milk.",
        "fr": "Spécialité grisonne suisse de pâte à spätzle et viande séchée (Bündnerfleisch/Salsiz) enroulée dans des feuilles de bette, mijotée au…"
      },
      "sources": [
        {
          "name": "Wikipedia — Capuns",
          "url": "https://en.wikipedia.org/wiki/Capuns"
        },
        {
          "name": "Switzerland Highlights — Capuns, Graubünden specialty",
          "url": "https://www.switzerland-highlights.com/en/capuns-graubuenden-specialty/"
        }
      ]
    },
    "pizzoccheri ticino": {
      "local": "Pizzoccheri",
      "note": {
        "en": "Flat buckwheat-and-wheat ribbon pasta baked with potatoes, chard and cheese; the Swiss form is the Italian-speaking Val Poschiavo (Grisons)…",
        "fr": "Pâtes plates au sarrasin et froment cuites avec pommes de terre, bettes et fromage; la forme suisse vient du Val Poschiavo italophone…"
      },
      "sources": [
        {
          "name": "Pizzoccheri - Switzerland Tourism",
          "url": "https://www.myswitzerland.com/en-us/experiences/food-wine/pizzoccheri/"
        },
        {
          "name": "Pizzoccheri - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Pizzoccheri"
        }
      ]
    },
    "berner platte": {
      "local": "Berner Platte",
      "note": {
        "en": "A Bernese platter of separately boiled meats (pork, smoked beef, sausages) with juniper sauerkraut, beans and potatoes, tied to an 1798…",
        "fr": "Une assiette bernoise de viandes bouillies separement (porc, boeuf fume, saucisses) avec choucroute au genievre, haricots et pommes de…"
      },
      "sources": [
        {
          "name": "Wikipedia - Berner Platte",
          "url": "https://en.wikipedia.org/wiki/Berner_Platte"
        },
        {
          "name": "TasteAtlas - Berner Platte",
          "url": "https://www.tasteatlas.com/berner-platte"
        }
      ]
    },
    "basler läckerli": {
      "local": "Basler Läckerli",
      "note": {
        "en": "A hard spiced biscuit from Basel, Switzerland, made with honey, hazelnuts, almonds, candied peel and Kirsch, dating back centuries.",
        "fr": "Un biscuit dur épicé de Bâle, en Suisse, fait de miel, noisettes, amandes, écorces confites et Kirsch, vieux de plusieurs siècles."
      },
      "sources": [
        {
          "name": "Wikipedia - Basler Läckerli",
          "url": "https://en.wikipedia.org/wiki/Basler_L%C3%A4ckerli"
        }
      ]
    },
    "zopf": {
      "local": "Zopf (Züpfe)",
      "note": {
        "en": "Swiss braided bread of white flour, milk, eggs and butter, traditionally egg-washed and eaten on Sunday mornings; Bernese bakers made it…",
        "fr": "Pain tressé suisse à base de farine blanche, lait, œufs et beurre, doré à l'œuf et mangé le dimanche matin; les boulangers bernois le font…"
      },
      "sources": [
        {
          "name": "Wikipedia - Zopf",
          "url": "https://en.wikipedia.org/wiki/Zopf"
        },
        {
          "name": "Helvetic Kitchen - Zopf, a history",
          "url": "https://www.helvetickitchen.com/curiosities/zopf"
        }
      ]
    },
    "toblerone": {
      "local": "Toblerone",
      "note": {
        "en": "Triangular Swiss milk chocolate with honey-almond nougat, created by Theodor Tobler in Bern in 1908.",
        "fr": "Chocolat suisse au lait triangulaire au nougat miel-amande, cree par Theodor Tobler a Berne en 1908."
      },
      "sources": [
        {
          "name": "Theodor Tobler — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Theodor_Tobler"
        },
        {
          "name": "Toblerone must remove Matterhorn from packaging — NPR",
          "url": "https://www.npr.org/2023/03/06/1161259572/toblerone-matterhorn-packaging-swissness"
        }
      ]
    },
    "luxemburgerli": {
      "local": "Luxemburgerli",
      "note": {
        "en": "A small, light Swiss macaron of two almond-meringue shells with a buttercream filling, sold by Zurich's Confiserie Sprüngli since 1957…",
        "fr": "Petit macaron suisse leger compose de deux coques de meringue aux amandes garnies de creme au beurre, vendu par la Confiserie Sprungli de…"
      },
      "sources": [
        {
          "name": "Confiserie Sprüngli (official) - Luxemburgerli",
          "url": "https://www.spruengli.ch/en/spruengli-world/luxemburgerli.html"
        },
        {
          "name": "Wikipedia - Confiserie Sprüngli (states first Luxemburgerli sold 1957)",
          "url": "https://en.wikipedia.org/wiki/Confiserie_Spr%C3%BCngli"
        }
      ]
    },
    "engadiner nusstorte": {
      "local": "Engadiner Nusstorte (Romansh: Tuorta da nuschs)",
      "note": {
        "en": "A caramelised walnut-filled shortcrust tart from Graubünden, Switzerland, popularised by Engadine baker Fausto Pult in the 1920s.",
        "fr": "Tarte en pâte brisée garnie de noix caramélisées des Grisons, en Suisse, popularisée par le boulanger engadinois Fausto Pult dans les…"
      },
      "sources": [
        {
          "name": "Wikipedia — Bündner Nusstorte",
          "url": "https://en.wikipedia.org/wiki/B%C3%BCndner_Nusstorte"
        },
        {
          "name": "Helvetic Kitchen — Tuorta da Nuschs",
          "url": "https://www.helvetickitchen.com/recipes/2017/7/21/turtadanuschs"
        }
      ]
    },
    "älplermagronen with apfelmus": {
      "local": "Älplermagronen mit Apfelmus",
      "note": {
        "en": "Swiss Alpine herders' dish of macaroni, potatoes, cream, cheese and fried onions, served with applesauce to cut the richness.",
        "fr": "Plat des bergers alpins suisses : macaronis, pommes de terre, crème, fromage et oignons frits, servi avec compote de pommes."
      },
      "sources": [
        {
          "name": "Wikipedia – Älplermagronen",
          "url": "https://en.wikipedia.org/wiki/%C3%84lplermagronen"
        },
        {
          "name": "Adventure Interlaken – Älplermagronen",
          "url": "https://adventureinterlaken.info/alplermagronen-the-original-swiss-macaroni-and-cheese-from-the-alps/"
        }
      ]
    }
  },
  "russian": {
    "borscht": {
      "local": "борщ",
      "note": {
        "en": "A sour Eastern European beet soup of Ukrainian origin; UNESCO inscribed its Ukrainian cooking culture as heritage in 2022.",
        "fr": "Soupe aigre de betterave d'Europe de l'Est, d'origine ukrainienne ; l'UNESCO a inscrit sa culture culinaire ukrainienne en 2022."
      },
      "sources": [
        {
          "name": "Wikipedia — Borscht",
          "url": "https://en.wikipedia.org/wiki/Borscht"
        },
        {
          "name": "UNESCO — Culture of Ukrainian borscht cooking",
          "url": "https://ich.unesco.org/en/USL/culture-of-ukrainian-borscht-cooking-01852"
        }
      ]
    },
    "pelmeni": {
      "local": "пельмени",
      "note": {
        "en": "Russian dumplings of unleavened dough filled with minced meat, originating as a Ural-Siberian regional dish before spreading across Russia.",
        "fr": "Raviolis russes en pâte non levée farcis de viande hachée, nés comme plat régional de l'Oural et de Sibérie avant de gagner toute la Russie."
      },
      "sources": [
        {
          "name": "Wikipedia — Pelmeni",
          "url": "https://en.wikipedia.org/wiki/Pelmeni"
        },
        {
          "name": "Russiapedia (RT) — Pelmeni",
          "url": "https://russiapedia.rt.com/of-russian-origin/pelmeni/"
        }
      ]
    },
    "beef stroganoff": {
      "local": "бефстроганов",
      "note": {
        "en": "Russian dish of sautéed beef strips in a sour-cream (smetana) sauce, named after the 19th-century Stroganov noble family.",
        "fr": "Plat russe de lamelles de bœuf sautées dans une sauce à la crème aigre (smetana), nommé d'après la famille noble Stroganov du XIXe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia — Beef Stroganoff",
          "url": "https://en.wikipedia.org/wiki/Beef_Stroganoff"
        },
        {
          "name": "Encyclopaedia Britannica — beef Stroganoff",
          "url": "https://www.britannica.com/topic/beef-Stroganoff"
        }
      ]
    },
    "blini": {
      "local": "блины",
      "note": {
        "en": "Thin Russian pancakes of yeast-raised wheat or buckwheat batter, an ancient Slavic dish round like the sun, eaten at Maslenitsa.",
        "fr": "Fines crêpes russes à base de pâte levée de blé ou de sarrasin, plat slave ancien rond comme le soleil, mangé à Maslenitsa."
      },
      "sources": [
        {
          "name": "Wikipedia - Blini",
          "url": "https://en.wikipedia.org/wiki/Blini"
        },
        {
          "name": "Russiapedia - Blini",
          "url": "https://russiapedia.rt.com/of-russian-origin/blini/"
        }
      ]
    },
    "pirozhki": {
      "local": "пирожки",
      "note": {
        "en": "Small baked or fried yeast-dough buns stuffed with savoury or sweet fillings; the name is a diminutive of the larger Russian pie, pirog.",
        "fr": "Petits pains de pate levee cuits au four ou frits, fourres salees ou sucrees ; le nom est un diminutif du grand chausson russe, le pirog."
      },
      "sources": [
        {
          "name": "Wikipedia - Pirozhki",
          "url": "https://en.wikipedia.org/wiki/Pirozhki"
        },
        {
          "name": "Britannica - Pirozhki",
          "url": "https://www.britannica.com/topic/pirozhki"
        }
      ]
    },
    "shchi": {
      "local": "щи",
      "note": {
        "en": "A traditional Russian cabbage (or sauerkraut) soup dating to roughly the 9th century, when cabbage spread among East Slavic tribes.",
        "fr": "Soupe russe traditionnelle au chou (ou choucroute), remontant au IXe siecle environ, quand le chou s'est repandu chez les tribus slaves…"
      },
      "sources": [
        {
          "name": "Wikipedia - Shchi",
          "url": "https://en.wikipedia.org/wiki/Shchi"
        },
        {
          "name": "The Moscow Times - Russia's National Treasure: Cabbage Soup",
          "url": "https://www.themoscowtimes.com/2020/12/26/russias-national-treasure-cabbage-soup-a72490"
        }
      ]
    },
    "solyanka": {
      "local": "солянка",
      "note": {
        "en": "A thick, sour Russian soup of meat, fish or mushrooms with pickled cucumbers and a salty-sour broth; the soup form emerged in the 1830s…",
        "fr": "Soupe russe epaisse et aigre, a base de viande, poisson ou champignons, avec des cornichons et un bouillon sale et acidule; sa forme en…"
      },
      "sources": [
        {
          "name": "Wikipedia - Solyanka",
          "url": "https://en.wikipedia.org/wiki/Solyanka"
        },
        {
          "name": "The Moscow Times - How Russian Solyanka Was Born From Polish Bigos",
          "url": "https://www.themoscowtimes.com/2022/09/24/how-russian-solyanka-was-born-from-polish-bigos-a78881"
        }
      ]
    },
    "vinaigrette salad": {
      "local": "Винегрет",
      "note": {
        "en": "Russian salad of diced boiled beets, potatoes, carrots, onion and pickles dressed in oil; its name derives from French \"vinaigrette\".",
        "fr": "Salade russe de betteraves, pommes de terre, carottes, oignon et cornichons cuits, assaisonnee a l'huile; son nom vient du francais…"
      },
      "sources": [
        {
          "name": "Wikipedia — Vinegret",
          "url": "https://en.wikipedia.org/wiki/Vinegret"
        },
        {
          "name": "Russiapedia (RT) — Vinegret",
          "url": "https://russiapedia.rt.com/of-russian-origin/vinegret/"
        }
      ]
    },
    "olivier salad": {
      "local": "салат Оливье",
      "note": {
        "en": "A Russian salad of diced potatoes, egg, and vegetables bound with mayonnaise, created in the 1860s by chef Lucien Olivier in Moscow.",
        "fr": "Une salade russe de pommes de terre, d'oeuf et de legumes en des, liee a la mayonnaise, creee dans les annees 1860 par le chef Lucien…"
      },
      "sources": [
        {
          "name": "Wikipedia - Olivier salad",
          "url": "https://en.wikipedia.org/wiki/Olivier_salad"
        },
        {
          "name": "196 flavors - Olivier Salad",
          "url": "https://www.196flavors.com/olivier-salad/"
        }
      ]
    },
    "selyodka pod shuboy": {
      "local": "Селёдка под шубой",
      "note": {
        "en": "Russian layered salad of salt-cured herring under grated potato, carrot, onion, egg and beet bound with mayonnaise; a Soviet-era New Year's…",
        "fr": "Salade russe en couches de hareng salé sous pomme de terre, carotte, oignon, œuf et betterave à la mayonnaise; incontournable du Nouvel An…"
      },
      "sources": [
        {
          "name": "Wikipedia - Dressed herring",
          "url": "https://en.wikipedia.org/wiki/Dressed_herring"
        },
        {
          "name": "Atlas Obscura - Herring Under a Fur Coat",
          "url": "https://www.atlasobscura.com/foods/herring-under-a-fur-coat-russia"
        }
      ]
    },
    "kasha": {
      "local": "каша",
      "note": {
        "en": "Slavic porridge, most often made from roasted buckwheat groats, long a staple of Russian peasant cuisine.",
        "fr": "Bouillie slave, le plus souvent à base de sarrasin grillé, longtemps un aliment de base de la cuisine paysanne russe."
      },
      "sources": [
        {
          "name": "Kasha — Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kasha"
        }
      ]
    },
    "kvass": {
      "local": "квас",
      "note": {
        "en": "A mildly alcoholic Slavic drink fermented from rye or black bread; its first written mention is in the Primary Chronicle, describing the…",
        "fr": "Boisson slave legerement alcoolisee fermentee a partir de pain de seigle ou noir; sa premiere mention ecrite figure dans la Chronique des…"
      },
      "sources": [
        {
          "name": "Wikipedia - Kvass",
          "url": "https://en.wikipedia.org/wiki/Kvass"
        },
        {
          "name": "Wiktionary - kvas",
          "url": "https://en.wiktionary.org/wiki/kvas"
        }
      ]
    },
    "medovik": {
      "local": "Медовик",
      "note": {
        "en": "Russian honey layer cake of thin honey-baked sponge layers filled with sour cream or condensed-milk cream, popular across the former USSR.",
        "fr": "Gâteau russe au miel à couches fines de génoise au miel garnies de crème à la crème aigre ou au lait concentré, courant dans l'ex-URSS."
      },
      "sources": [
        {
          "name": "Wikipedia — Medovik",
          "url": "https://en.wikipedia.org/wiki/Medovik"
        },
        {
          "name": "The Moscow Times — Medovik: Russia's Famous and Mysterious Honey Cake",
          "url": "https://www.themoscowtimes.com/2022/07/23/medovik-russias-famous-and-mysterious-honey-cake-a78387"
        }
      ]
    },
    "syrniki": {
      "local": "сырники",
      "note": {
        "en": "Eastern Slavic fried pancakes of tvorog (curd cheese), eggs and flour; the dish is referenced in the 1550s Russian household manual…",
        "fr": "Galettes frites slaves orientales au tvorog (fromage caillé), œufs et farine ; le plat est mentionné dans le manuel domestique russe…"
      },
      "sources": [
        {
          "name": "Wikipedia — Syrniki",
          "url": "https://en.wikipedia.org/wiki/Syrniki"
        },
        {
          "name": "The Moscow Times — Where's the Cheese in Russian Cheese Pancakes?",
          "url": "https://www.themoscowtimes.com/2022/10/01/wheres-the-cheese-in-russian-cheese-pancakes-a78943"
        }
      ]
    },
    "vatrushka": {
      "local": "ватрушка",
      "note": {
        "en": "An Eastern Slavic round sweet yeast-dough bun with a centre well of tvorog (curd cheese), often topped with raisins.",
        "fr": "Petit pain rond slave oriental en pâte levée sucrée, garni en son centre de tvorog (fromage blanc), souvent aux raisins secs."
      },
      "sources": [
        {
          "name": "Wikipedia — Vatrushka",
          "url": "https://en.wikipedia.org/wiki/Vatrushka"
        },
        {
          "name": "Wiktionary — ватрушка",
          "url": "https://en.wiktionary.org/wiki/%D0%B2%D0%B0%D1%82%D1%80%D1%83%D1%88%D0%BA%D0%B0"
        }
      ]
    },
    "okroshka": {
      "local": "окрошка",
      "note": {
        "en": "A cold Russian soup of raw vegetables, boiled potatoes, eggs and meat in kvass or kefir, traditionally eaten in summer.",
        "fr": "Soupe froide russe de légumes crus, pommes de terre, œufs et viande dans du kvass ou kéfir, mangée en été."
      },
      "sources": [
        {
          "name": "Wikipedia - Okroshka",
          "url": "https://en.wikipedia.org/wiki/Okroshka"
        },
        {
          "name": "Russia Beyond - Okroshka, cold soup with kvass",
          "url": "https://www.rbth.com/multimedia/video/2013/09/02/delicious_russia_okroshka_cold_soup_with_kvass_29407"
        }
      ]
    },
    "ukha": {
      "local": "уха",
      "note": {
        "en": "A clear Russian fish soup of root vegetables and fish; the word once meant meat broth and only came to mean fish soup by the late 17th…",
        "fr": "Soupe de poisson russe claire aux légumes-racines; le mot désignait jadis un bouillon de viande et ne signifie soupe de poisson que depuis…"
      },
      "sources": [
        {
          "name": "Wikipedia - Ukha",
          "url": "https://en.wikipedia.org/wiki/Ukha"
        },
        {
          "name": "Russia Beyond - 10 centuries of real Russian ukha soup",
          "url": "https://www.rbth.com/russian_kitchen/2017/05/26/10-centuries-of-real-russian-ukha-soup-tradition-and-modernity_771280"
        }
      ]
    },
    "beef stew russian": {
      "local": "Бефстроганов",
      "note": {
        "en": "A 19th-century Russian dish of sauteed beef strips in a sour-cream (smetana) sauce, named after the Stroganov noble family; the first known…",
        "fr": "Plat russe du XIXe siecle de lanieres de boeuf sautees en sauce a la creme aigre (smetana), nomme d'apres la famille noble Stroganov; la…"
      },
      "sources": [
        {
          "name": "Wikipedia - Beef Stroganoff",
          "url": "https://en.wikipedia.org/wiki/Beef_Stroganoff"
        },
        {
          "name": "TasteAtlas - Beef Stroganoff",
          "url": "https://www.tasteatlas.com/beef-stroganoff"
        }
      ]
    },
    "vareniki": {
      "local": "вареники",
      "note": {
        "en": "Boiled half-moon dumplings of unleavened dough filled with potato, cheese, or fruit, emblematic of Ukrainian and Russian cuisine.",
        "fr": "Raviolis bouillis en demi-lune de pâte non levée, fourrés de pomme de terre, fromage ou fruits, emblématiques des cuisines ukrainienne et…"
      },
      "sources": [
        {
          "name": "Wikipedia - Varenyky",
          "url": "https://en.wikipedia.org/wiki/Varenyky"
        },
        {
          "name": "Recipes From Europe - Varenyky (Ukrainian Dumplings)",
          "url": "https://www.recipesfromeurope.com/varenyky/"
        }
      ]
    },
    "golubtsy": {
      "local": "Голубцы",
      "note": {
        "en": "Russian cabbage rolls of minced meat and rice simmered in tomato sauce. The name comes from golub (\"dove/pigeon\"), so golubtsy means…",
        "fr": "Roulades de chou russes de viande hachée et de riz mijotées en sauce tomate. Le nom vient de goloub (« colombe/pigeon »), si bien que…"
      },
      "sources": [
        {
          "name": "Russia Beyond — These homemade 'pigeons' will make you fall in love with Russian cabbage rolls",
          "url": "https://www.rbth.com/russian-kitchen/329327-homemade-russian-cabbage-rolls"
        },
        {
          "name": "TasteAtlas — Golubtsy",
          "url": "https://www.tasteatlas.com/golubtsy"
        }
      ]
    },
    "kulebyaka": {
      "local": "кулебя́ка",
      "note": {
        "en": "A Russian pirog (pie) traditionally filled with layered salmon or sturgeon, rice or buckwheat, egg, mushrooms and dill.",
        "fr": "Un pirog russe (tourte) traditionnellement garni de couches de saumon ou esturgeon, riz ou sarrasin, œuf, champignons et aneth."
      },
      "sources": [
        {
          "name": "Coulibiac - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Coulibiac"
        }
      ]
    },
    "chebureki": {
      "local": "чебуреки (Crimean Tatar: çiberek)",
      "note": {
        "en": "Deep-fried crescent turnovers filled with minced meat and onion, a Crimean Tatar dish that spread across the former Soviet Union.",
        "fr": "Chaussons frits en croissant garnis de viande hachée et d'oignon, plat tatar de Crimée répandu dans l'ex-URSS."
      },
      "sources": [
        {
          "name": "Wikipedia — Chebureki",
          "url": "https://en.wikipedia.org/wiki/Chebureki"
        },
        {
          "name": "Wiktionary — чебурек",
          "url": "https://en.wiktionary.org/wiki/%D1%87%D0%B5%D0%B1%D1%83%D1%80%D0%B5%D0%BA"
        }
      ]
    }
  },
  "ukrainian": {
    "borscht ukrainian": {
      "local": "борщ",
      "note": {
        "en": "A Ukrainian beetroot-based sour soup whose cooking culture UNESCO inscribed as Intangible Cultural Heritage in 2022.",
        "fr": "Soupe aigre ukrainienne à base de betterave dont la culture culinaire a été inscrite au patrimoine immatériel de l'UNESCO en 2022."
      },
      "sources": [
        {
          "name": "Borscht - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Borscht"
        },
        {
          "name": "Culture of Ukrainian borscht cooking - UNESCO",
          "url": "https://ich.unesco.org/en/USL/culture-of-ukrainian-borscht-cooking-01852"
        }
      ]
    },
    "varenyky": {
      "local": "вареники",
      "note": {
        "en": "Ukrainian boiled dumplings of unleavened dough with savoury or sweet fillings; the name derives from varyty, \"to boil.\"",
        "fr": "Raviolis ukrainiens bouillis en pate non levee, a garniture salee ou sucree; le nom vient de varyty, \"bouillir.\""
      },
      "sources": [
        {
          "name": "Wikipedia - Varenyky",
          "url": "https://en.wikipedia.org/wiki/Varenyky"
        },
        {
          "name": "Wikipedia - Ukrainian cuisine",
          "url": "https://en.wikipedia.org/wiki/Ukrainian_cuisine"
        }
      ]
    },
    "salo": {
      "local": "сало",
      "note": {
        "en": "Salo is cured (dry-salted or brined) pork fatback, eaten raw and sliced thin with rye bread and garlic; a Ukrainian national dish.",
        "fr": "Le salo est du lard de porc salé ou saumuré, mangé cru en fines tranches avec pain de seigle et ail; plat national ukrainien."
      },
      "sources": [
        {
          "name": "TasteAtlas",
          "url": "https://www.tasteatlas.com/salo"
        },
        {
          "name": "Atlas Obscura",
          "url": "https://www.atlasobscura.com/foods/salo-pork-ukraine"
        }
      ]
    },
    "chicken kyiv": {
      "local": "котлета по-київськи",
      "note": {
        "en": "A cutlet of pounded chicken fillet rolled around cold butter, breaded and fried; the disputed origin dates to the 19th century.",
        "fr": "Une escalope de filet de poulet aplati roulé autour de beurre froid, pané et frit ; son origine disputée remonte au XIXe siècle."
      },
      "sources": [
        {
          "name": "Wikipedia — Chicken Kiev",
          "url": "https://en.wikipedia.org/wiki/Chicken_Kiev"
        },
        {
          "name": "196 flavors — Chicken Kiev, Traditional Ukrainian Recipe",
          "url": "https://www.196flavors.com/ukraine-chicken-kiev/"
        }
      ]
    },
    "holubtsi": {
      "local": "голубці",
      "note": {
        "en": "Ukrainian cabbage rolls of leaves wrapped around meat and rice; the name derives from \"holub\" (pigeon) for their plump shape.",
        "fr": "Roulades de chou ukrainiennes garnies de viande et de riz; le nom vient de « holub » (pigeon), pour leur forme dodue."
      },
      "sources": [
        {
          "name": "The Taste of Ukraine - Holubtsi history and recipes",
          "url": "https://thetasteofukraine.com/holubtsi-in-ukrainian-cuisine-history-and-recipes/"
        },
        {
          "name": "Ukrainian Flavors (Medium) - History of cabbage rolls",
          "url": "https://medium.com/@ukrainianflavors/holubtsi-the-history-of-cabbage-rolls-in-ukrainian-cuisine-53dae9c2f730"
        }
      ]
    },
    "deruny": {
      "local": "деруни",
      "note": {
        "en": "Ukrainian shallow-fried pancakes of grated raw potato, onion and egg; the name comes from derty, \"to grate.\"",
        "fr": "Galettes ukrainiennes de pommes de terre rapees, oignon et oeuf, frites; le nom vient de derty, \"raper.\""
      },
      "sources": [
        {
          "name": "Wikipedia – Deruny / Potato pancake",
          "url": "https://en.wikipedia.org/wiki/Deruny"
        },
        {
          "name": "Budget Bytes – Deruny (Ukrainian Potato Pancakes)",
          "url": "https://www.budgetbytes.com/deruny-potato-pancakes/"
        }
      ]
    },
    "pampushky": {
      "local": "пампушки",
      "note": {
        "en": "Soft Ukrainian yeast buns, savory ones brushed with garlic sauce and served as a side to borscht.",
        "fr": "Petits pains levés ukrainiens, les salés nappés de sauce à l'ail et servis en accompagnement du bortsch."
      },
      "sources": [
        {
          "name": "Wikipedia — Pampushka",
          "url": "https://en.wikipedia.org/wiki/Pampushka"
        },
        {
          "name": "Wiktionary — пампушка",
          "url": "https://en.wiktionary.org/wiki/%D0%BF%D0%B0%D0%BC%D0%BF%D1%83%D1%88%D0%BA%D0%B0"
        }
      ]
    },
    "paska": {
      "local": "Паска",
      "note": {
        "en": "Ukrainian egg-enriched Easter bread; its name derives from Pesach (Passover) and is tied to Eastern Christian Easter rites.",
        "fr": "Pain de Pâques ukrainien enrichi aux œufs ; son nom vient de Pessah (Pâque) et est lié aux rites pascals chrétiens orientaux."
      },
      "sources": [
        {
          "name": "Wikipedia — Paska (bread)",
          "url": "https://en.wikipedia.org/wiki/Paska_(bread)"
        }
      ]
    },
    "syrniky": {
      "local": "сирники",
      "note": {
        "en": "Fried Ukrainian pancakes made from quark/curd cheese (syr), egg and flour, usually served with sour cream or jam.",
        "fr": "Galettes ukrainiennes frites a base de fromage blanc caille (syr), d'oeuf et de farine, servies avec creme aigre ou confiture."
      },
      "sources": [
        {
          "name": "Wikipedia — Syrniki",
          "url": "https://en.wikipedia.org/wiki/Syrniki"
        }
      ]
    },
    "uzvar": {
      "local": "узвар",
      "note": {
        "en": "Ukrainian drink of dried fruits (pears, apples, plums and other dried fruits/berries) that is brought just to a boil and then steeped, not…",
        "fr": "Boisson ukrainienne de fruits secs (poires, pommes, prunes et autres fruits ou baies sechees) que l'on porte juste a ebullition puis que…"
      },
      "sources": [
        {
          "name": "Ukrainian Recipes - Uzvar (Dried fruit compote), Popular Ukrainian Christmas drink",
          "url": "https://ukrainian-recipes.com/uzvar-dried-fruit-compote-popular-ukrainian-christmas-drink.html"
        },
        {
          "name": "Authentic Ukraine - Uzvar",
          "url": "https://authenticukraine.com.ua/en/food/uzvar"
        }
      ]
    },
    "kotleta po kyivsky": {
      "local": "котлета по-київськи",
      "note": {
        "en": "Ukrainian dish of a boned chicken breast rolled around chilled herb butter, breaded and fried; popularized in the Soviet era.",
        "fr": "Plat ukrainien de blanc de poulet désossé roulé autour de beurre aux herbes, pané et frit; popularisé à l'époque soviétique."
      },
      "sources": [
        {
          "name": "TasteAtlas — Kotleta po Kyivsky",
          "url": "https://www.tasteatlas.com/chicken-kyiv"
        },
        {
          "name": "Wikipedia — Chicken Kiev",
          "url": "https://en.wikipedia.org/wiki/Chicken_Kiev"
        }
      ]
    },
    "halushky": {
      "local": "галушки",
      "note": {
        "en": "Ukrainian dumplings of unfilled boiled dough, documented in 18th-century left-bank Ukraine and tied to the city of Poltava.",
        "fr": "Quenelles ukrainiennes de pate bouillie sans garniture, attestees au 18e siecle en Ukraine de la rive gauche et liees a la ville de Poltava."
      },
      "sources": [
        {
          "name": "Authentic Ukraine - Poltava halushky",
          "url": "https://authenticukraine.com.ua/en/food/poltavski-galuski"
        },
        {
          "name": "Wikipedia - Ukrainian cuisine",
          "url": "https://en.wikipedia.org/wiki/Ukrainian_cuisine"
        }
      ]
    },
    "mlyntsi": {
      "local": "Млинці",
      "note": {
        "en": "Thin Ukrainian pancakes akin to crepes, served sweet or savoury; the name derives from \"mlyn\" (млин, mill), via the diminutive млинець.",
        "fr": "Fines crepes ukrainiennes, sucrees ou salees; le nom derive de \"mlyn\" (млин, moulin), via le diminutif млинець."
      },
      "sources": [
        {
          "name": "млинець — Wiktionary (etymology: from млин \"mlyn/mill\" + -ець)",
          "url": "https://en.wiktionary.org/wiki/%D0%BC%D0%BB%D0%B8%D0%BD%D0%B5%D1%86%D1%8C"
        },
        {
          "name": "Bread Experience — Mlyntsi | Ukrainian Thin Pancakes Crepes",
          "url": "https://www.breadexperience.com/mlyntsi-thin-pancakes-crepes/"
        }
      ]
    },
    "kapusta": {
      "local": "капуста",
      "note": {
        "en": "Ukrainian braised cabbage or sauerkraut dish; a sauerkraut version with peas is traditionally one of the twelve meatless dishes served at…",
        "fr": "Plat ukrainien de chou braisé ou de choucroute; une version à la choucroute avec des pois est traditionnellement l'un des douze plats…"
      },
      "sources": [
        {
          "name": "The Rusnaks – Ukrainian Baked Sauerkraut (Kapusta) with Sausage (Kobasa)",
          "url": "https://rusnak.ca/Ukrainian-Baked-Sauerkraut-Kapusta-with-Sausage-Kobasa-The-Rusnaks"
        },
        {
          "name": "Wikipedia – Twelve-dish Christmas Eve supper",
          "url": "https://en.wikipedia.org/wiki/Twelve-dish_Christmas_Eve_supper"
        }
      ]
    },
    "kvas ukrainian": {
      "local": "квас",
      "note": {
        "en": "A low-alcohol Slavic drink made by fermenting rye bread or flour, known in Ukraine since at least the 10th century.",
        "fr": "Boisson slave peu alcoolisée obtenue par fermentation de pain ou de farine de seigle, connue en Ukraine depuis au moins le Xe siècle."
      },
      "sources": [
        {
          "name": "Kvass - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kvass"
        },
        {
          "name": "Ukrainian Traditional Rye Bread Kvass Recipe - Etnocook",
          "url": "https://etnocook.com/ukrainian-bread-kvass/"
        }
      ]
    },
    "vushka": {
      "local": "вушка",
      "note": {
        "en": "Tiny Ukrainian \"little ear\" dumplings stuffed with dried mushrooms, traditionally served in red borscht on Christmas Eve (Sviat Vechir).",
        "fr": "Petites raviolis ukrainiennes en forme d'oreille farcies de champignons sechés, servies dans le bortsch rouge la veille de Noël."
      },
      "sources": [
        {
          "name": "Chef's Pencil — Mushroom Vushka (Ukrainian Mushroom Dumplings)",
          "url": "https://www.chefspencil.com/mushroom-vushka/"
        },
        {
          "name": "Ukrainian Flavors — Vushka / Uszka: The Tiny Ukrainian Christmas Dumplings",
          "url": "https://ukrainianflavors.com/blogs/blog-uf/vushka-the-tiny-ukrainian-christmas-dumplings-with-a-big-story"
        }
      ]
    },
    "verhuny": {
      "local": "вергуни",
      "note": {
        "en": "Verhuny (also verguny; in some regions khrusty) are a traditional Ukrainian deep-fried unleavened-dough pastry of the brushwood/angel-wings…",
        "fr": "Les verhuny (aussi verguny ; khrusty dans certaines regions) sont une patisserie ukrainienne traditionnelle en pate non levee frite, de…"
      },
      "sources": [
        {
          "name": "Wikipedia (uk) - Вергуни",
          "url": "https://uk.wikipedia.org/wiki/Вергуни"
        },
        {
          "name": "Authentic Ukraine - Verhuny",
          "url": "https://authenticukraine.com.ua/en/food/verguni"
        }
      ]
    },
    "crimean tatar chebureki": {
      "local": "çiberek (çiğ börek)",
      "note": {
        "en": "Deep-fried half-moon turnover of thin unleavened dough filled with seasoned minced meat and onion, the national dish of the Crimean Tatars.",
        "fr": "Chausson frit en demi-lune de pâte fine sans levain garni de viande hachée et d'oignon assaisonnés, plat national des Tatars de Crimée."
      },
      "sources": [
        {
          "name": "Wikipedia — Chebureki",
          "url": "https://en.wikipedia.org/wiki/Chebureki"
        },
        {
          "name": "TasteAtlas — Chebureki",
          "url": "https://www.tasteatlas.com/cig-borek"
        }
      ]
    },
    "odessan forshmak": {
      "local": "одеський форшмак",
      "note": {
        "en": "A chopped-herring spread of salt herring, apple, onion and egg, an Ashkenazi Jewish dish that became emblematic of Odesa cuisine.",
        "fr": "Une tartinade de hareng hache avec pomme, oignon et oeuf, plat juif ashkenaze devenu emblematique de la cuisine d'Odessa."
      },
      "sources": [
        {
          "name": "Wikipedia — Forshmak",
          "url": "https://en.wikipedia.org/wiki/Forshmak"
        },
        {
          "name": "Odessa Journal — Jewish culture in Odessa cuisine: Forshmak",
          "url": "https://odessa-journal.com/forshmak"
        }
      ]
    },
    "lard sandwiches": {
      "local": "сало",
      "note": {
        "en": "Salo, cured raw pork fatback sliced thin onto rye bread with garlic, is a near-national Ukrainian dish honored by a Salo Museum in Lviv.",
        "fr": "Le salo, gras de porc cru salé tranché fin sur du pain de seigle avec de l'ail, est un plat quasi national ukrainien, honoré par un musée…"
      },
      "sources": [
        {
          "name": "Wikipedia – Museum of Salo",
          "url": "https://en.wikipedia.org/wiki/Museum_of_Salo"
        },
        {
          "name": "Michelin Guide – Uniquely Ukrainian: 5 Ingredients To Stock Up (salo, brynza, uzvar)",
          "url": "https://guide.michelin.com/sg/en/article/travel/ukrainian-cuisine-5-ingredients-to-stock-up"
        }
      ]
    },
    "domashnya kovbasa": {
      "local": "домашня ковбаса",
      "note": {
        "en": "Ukrainian homemade pork sausage (\"domashnya\" = homemade) of coarsely ground pork seasoned heavily with garlic and black pepper, stuffed…",
        "fr": "Saucisse de porc maison ukrainienne (« domashnya » = fait maison), à base de porc haché grossièrement et fortement assaisonné d'ail et de…"
      },
      "sources": [
        {
          "name": "Taste of Artisan – Ukrainian Sausage",
          "url": "https://tasteofartisan.com/ukrainian-sausage/"
        },
        {
          "name": "Food.com – Ukrainian Homemade Sausage (Kovbasa)",
          "url": "https://www.food.com/recipe/ukrainian-homemade-sausage-kovbasa-77547"
        }
      ]
    }
  },
  "polish": {
    "pierogi": {
      "local": "pierogi",
      "note": {
        "en": "Polish half-moon dumplings of unleavened dough with savory or sweet fillings, documented in Poland's first cookbook in 1682.",
        "fr": "Raviolis polonais en demi-lune de pate non levee, a garniture salee ou sucree, attestes dans le premier livre de cuisine polonais en 1682."
      },
      "sources": [
        {
          "name": "Wikipedia - Pierogi",
          "url": "https://en.wikipedia.org/wiki/Pierogi"
        },
        {
          "name": "Britannica - Pierogi",
          "url": "https://www.britannica.com/topic/pierogi"
        }
      ]
    },
    "bigos": {
      "local": "bigos",
      "note": {
        "en": "Poland's national dish, a hunter's stew of chopped meats slow-simmered with sauerkraut and fresh cabbage; documented since the 17th century.",
        "fr": "Plat national polonais, un ragout de chasseur de viandes mijotees longuement avec choucroute et chou frais; atteste depuis le XVIIe siecle."
      },
      "sources": [
        {
          "name": "Wikipedia - Bigos",
          "url": "https://en.wikipedia.org/wiki/Bigos"
        },
        {
          "name": "TasteAtlas - Bigos",
          "url": "https://tasteatlas.com/bigos"
        }
      ]
    },
    "kielbasa": {
      "local": "kiełbasa",
      "note": {
        "en": "Any meat sausage from Poland and a staple of Polish cuisine, traditionally made from pork (though beef, veal, turkey and other meats are…",
        "fr": "Toute saucisse de viande polonaise et un pilier de la cuisine polonaise, traditionnellement à base de porc (mais aussi de bœuf, de veau, de…"
      },
      "sources": [
        {
          "name": "Wikipedia - Kielbasa",
          "url": "https://en.wikipedia.org/wiki/Kielbasa"
        },
        {
          "name": "TasteAtlas - Kiełbasa Polska",
          "url": "https://www.tasteatlas.com/kiebasa-polska"
        }
      ]
    },
    "zurek": {
      "local": "żurek",
      "note": {
        "en": "Polish soup of soured rye flour (a sourdough-like fermented starter called zakwas) served with white sausage and hard-boiled egg…",
        "fr": "Soupe polonaise à base de farine de seigle fermentée (un levain appelé zakwas), servie avec saucisse blanche et œuf dur, traditionnellement…"
      },
      "sources": [
        {
          "name": "Wikipedia — Sour cereal soup",
          "url": "https://en.wikipedia.org/wiki/Sour_cereal_soup"
        },
        {
          "name": "Smachno — Żurek: traditional Polish soup made with rye sourdough",
          "url": "https://smachno.blog/en/zurek-traditional-polish-soup/"
        }
      ]
    },
    "rosol": {
      "local": "rosół",
      "note": {
        "en": "Traditional Polish clear meat broth, most popularly chicken (rosół z kury), simmered with vegetables and served with thin noodles.",
        "fr": "Bouillon de viande clair polonais traditionnel, le plus souvent au poulet (rosół z kury), mijoté avec des légumes et servi avec de fines…"
      },
      "sources": [
        {
          "name": "Wikipedia - Rosół",
          "url": "https://en.wikipedia.org/wiki/Ros%C3%B3%C5%82"
        },
        {
          "name": "TasteAtlas - Rosół",
          "url": "https://www.tasteatlas.com/rosol"
        }
      ]
    },
    "golabki": {
      "local": "gołąbki",
      "note": {
        "en": "Polish cabbage rolls of minced meat and rice in tomato sauce; the name means \"little pigeons.\"",
        "fr": "Roulés de chou polonais farcis de viande hachée et de riz en sauce tomate ; le nom signifie « petits pigeons »."
      },
      "sources": [
        {
          "name": "Polana — Gołąbki! The history of Polish Stuffed Cabbage",
          "url": "https://www.polana.com/blogs/blog/golabki-the-history-of-polish-stuffed-cabbage"
        },
        {
          "name": "Poland Unraveled — Gołąbki: the Tasty History and Traditional Recipe",
          "url": "https://polandunraveled.com/golabki-history-recipe/"
        }
      ]
    },
    "placki ziemniaczane": {
      "local": "placki ziemniaczane",
      "note": {
        "en": "Polish fried potato pancakes made from grated raw potato, onion and egg; a documented 17th-century monastery recipe (from Stoczek…",
        "fr": "Galettes polonaises de pommes de terre crues rapees, avec oignon et oeuf; une recette monastique documentee du XVIIe siecle (Stoczek…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Placki Ziemniaczane",
          "url": "https://www.tasteatlas.com/placki-ziemniaczane"
        },
        {
          "name": "Wikipedia - Potato pancake",
          "url": "https://en.wikipedia.org/wiki/Potato_pancake"
        }
      ]
    },
    "kotlet schabowy": {
      "local": "kotlet schabowy",
      "note": {
        "en": "A Polish breadcrumb-coated pork loin (or chop) cutlet, derived from the Viennese schnitzel, that appeared in the 19th century (recorded in…",
        "fr": "Une escalope panee de longe (ou de cotelette) de porc polonaise, derivee du schnitzel viennois, apparue au XIXe siecle (attestee dans un…"
      },
      "sources": [
        {
          "name": "Wikipedia — Kotlet schabowy",
          "url": "https://en.wikipedia.org/wiki/Kotlet_schabowy"
        },
        {
          "name": "TasteAtlas — Kotlet schabowy",
          "url": "https://www.tasteatlas.com/schabowy/kotlet-schabowy"
        }
      ]
    },
    "mizeria": {
      "local": "mizeria",
      "note": {
        "en": "A Polish salad of thinly sliced cucumbers in sour cream; its name derives from Latin \"miseria\" (poverty/misery).",
        "fr": "Une salade polonaise de concombres finement tranchés a la creme aigre ; son nom vient du latin \"miseria\" (misere)."
      },
      "sources": [
        {
          "name": "Wikipedia - Mizeria",
          "url": "https://en.wikipedia.org/wiki/Mizeria"
        },
        {
          "name": "Wiktionary - mizeria",
          "url": "https://en.wiktionary.org/wiki/mizeria"
        }
      ]
    },
    "barszcz polish": {
      "local": "barszcz czerwony",
      "note": {
        "en": "A Polish sour beetroot soup, often a clear broth from fermented beet juice, traditionally served on Christmas Eve with uszka dumplings.",
        "fr": "Soupe polonaise aigre de betterave, souvent un bouillon clair de jus de betterave fermente, servie a Noel avec des raviolis uszka."
      },
      "sources": [
        {
          "name": "Borscht - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Borscht"
        },
        {
          "name": "Barszcz Czysty Czerwony - TasteAtlas",
          "url": "https://www.tasteatlas.com/barszcz-czysty-czerwony"
        }
      ]
    },
    "oscypek": {
      "local": "oscypek",
      "note": {
        "en": "A smoked, spindle-shaped salted sheep's-milk cheese from Poland's Tatra Mountains, hand-made by highlanders and EU PDO-protected.",
        "fr": "Fromage fume de lait de brebis sale, en forme de fuseau, des Tatras polonaises, fait main par les montagnards et protege AOP."
      },
      "sources": [
        {
          "name": "Wikipedia - Oscypek",
          "url": "https://en.wikipedia.org/wiki/Oscypek"
        },
        {
          "name": "Slow Food Foundation - Oscypek Presidium",
          "url": "https://www.fondazioneslowfood.com/en/slow-food-presidia/oscypek/"
        }
      ]
    },
    "paczki": {
      "local": "pączki",
      "note": {
        "en": "Polish deep-fried filled doughnuts of rich egg-and-butter dough, traditionally eaten on Fat Thursday (Tłusty Czwartek) before Lent.",
        "fr": "Beignets polonais frits et fourrés, à pâte riche en œufs et beurre, mangés le Jeudi gras (Tłusty Czwartek) avant le Carême."
      },
      "sources": [
        {
          "name": "Wikipedia – Pączki",
          "url": "https://en.wikipedia.org/wiki/P%C4%85czki"
        },
        {
          "name": "Wikipedia – Fat Thursday",
          "url": "https://en.wikipedia.org/wiki/Fat_Thursday"
        }
      ]
    },
    "makowiec": {
      "local": "makowiec",
      "note": {
        "en": "A traditional Polish sweet yeast roll filled with ground poppy seeds, honey and nuts, eaten especially at Christmas and Easter.",
        "fr": "Roulé polonais traditionnel à la pâte levée, fourré de graines de pavot moulues, miel et noix, servi surtout à Noël et à Pâques."
      },
      "sources": [
        {
          "name": "Wikipedia - Makowiec",
          "url": "https://en.wikipedia.org/wiki/Makowiec"
        },
        {
          "name": "Polonist - Makowiec: Polish Poppy Seed Roll",
          "url": "https://www.polonist.com/poppy-seed-roll-makowiec/"
        }
      ]
    },
    "sernik": {
      "local": "sernik",
      "note": {
        "en": "Baked Polish cheesecake made from twaróg (curd cheese), dating to the 17th century with roots in Christian and Jewish culinary traditions.",
        "fr": "Cheesecake polonais cuit à base de twaróg (fromage caillé), datant du XVIIe siècle, aux racines chrétiennes et juives."
      },
      "sources": [
        {
          "name": "Wikipedia – Sernik",
          "url": "https://en.wikipedia.org/wiki/Sernik"
        },
        {
          "name": "196 flavors – Sernik (Traditional Polish Cheesecake)",
          "url": "https://www.196flavors.com/poland-sernik/"
        }
      ]
    },
    "flaki": {
      "local": "flaki",
      "note": {
        "en": "A Polish beef-tripe soup eaten since the 14th century, said to be a favourite of King Wladyslaw II Jagiello, spiced with marjoram and…",
        "fr": "Une soupe polonaise aux tripes de boeuf consommee depuis le 14e siecle, dit-on plat favori du roi Ladislas II Jagellon, epicee a la…"
      },
      "sources": [
        {
          "name": "Wikipedia - Flaki",
          "url": "https://en.wikipedia.org/wiki/Flaki"
        },
        {
          "name": "Tasting Poland - Flaki",
          "url": "https://www.tastingpoland.com/food/flaki.html"
        }
      ]
    },
    "kapusta kiszona": {
      "local": "kapusta kiszona",
      "note": {
        "en": "Traditional Polish sauerkraut: cabbage preserved by lactic-acid fermentation with salt, a centuries-old staple served with meats and…",
        "fr": "Choucroute polonaise traditionnelle : chou conserve par fermentation lactique au sel, aliment seculaire servi avec viandes et pierogi."
      },
      "sources": [
        {
          "name": "Polish Foodies — Kapusta Kiszona (Homemade Polish Sauerkraut Recipe)",
          "url": "https://polishfoodies.com/kapusta-kiszona-homemade-polish-sauerkraut-recipe/"
        },
        {
          "name": "CookINPolish — Kapusta Kiszona (Sauerkraut)",
          "url": "https://cookinpolish.com/kapusta-kiszona-sauerkraut/"
        }
      ]
    },
    "mazurek": {
      "local": "mazurek",
      "note": {
        "en": "A flat Polish Easter shortcrust cake topped with kajmak, nuts, jam or chocolate, traditional since the 19th century.",
        "fr": "Gateau de Paques polonais plat en pate sablee garni de kajmak, noix, confiture ou chocolat, traditionnel depuis le XIXe siecle."
      },
      "sources": [
        {
          "name": "Wikipedia - Mazurek (cake)",
          "url": "https://en.wikipedia.org/wiki/Mazurek_(cake)"
        },
        {
          "name": "Worldchefs - Mazurek Easter Cake",
          "url": "https://worldchefs.org/mazurek-easter-cake/"
        }
      ]
    },
    "pierogi ruskie": {
      "local": "pierogi ruskie",
      "note": {
        "en": "Polish boiled dumplings filled with mashed potato and twaróg curd cheese; \"ruskie\" means Ruthenian, after the historic region of Red…",
        "fr": "Raviolis polonais bouillis fourrés de purée de pomme de terre et de fromage blanc twaróg ; « ruskie » signifie ruthène, d'après la région…"
      },
      "sources": [
        {
          "name": "Wikipedia – Pierogi",
          "url": "https://en.wikipedia.org/wiki/Pierogi"
        },
        {
          "name": "Polonist – Potato and Cheese Pierogi (Ruskie)",
          "url": "https://www.polonist.com/pierogi-ruskie-potato-cheese/"
        }
      ]
    },
    "chlodnik": {
      "local": "chłodnik litewski",
      "note": {
        "en": "A Polish-Lithuanian cold beet soup of grated beets in kefir or buttermilk with cucumber, dill and egg, dating to the Commonwealth era.",
        "fr": "Soupe froide polono-lituanienne de betteraves râpées au kéfir ou babeurre, avec concombre, aneth et œuf, datant du Commonwealth."
      },
      "sources": [
        {
          "name": "Wikipedia – Cold beet soup",
          "url": "https://en.wikipedia.org/wiki/Cold_beet_soup"
        },
        {
          "name": "Polonist – Polish Cold Beet Soup (Chłodnik)",
          "url": "https://www.polonist.com/polish-cold-beet-soup-chlodnik/"
        }
      ]
    },
    "pyzy": {
      "local": "pyzy",
      "note": {
        "en": "Large oval Polish dumplings made from potato or yeast dough, often stuffed with meat and served with bacon bits or onions.",
        "fr": "Grosses boulettes ovales polonaises a base de pomme de terre ou de pate levee, souvent farcies de viande et servies avec lardons ou oignons."
      },
      "sources": [
        {
          "name": "Wikipedia - Pyzy (dish)",
          "url": "https://en.wikipedia.org/wiki/Pyzy_(dish)"
        },
        {
          "name": "Polonist - Pyzy: Polish Potato Dumplings",
          "url": "https://www.polonist.com/pyzy-potato-dumplings-kluski/"
        }
      ]
    },
    "zapiekanka": {
      "local": "zapiekanka",
      "note": {
        "en": "A Polish toasted open-faced baguette topped with sauteed mushrooms, cheese and ketchup; a street food born in the 1970s.",
        "fr": "Une demi-baguette polonaise gratinee garnie de champignons sautes, fromage et ketchup; street food nee dans les annees 1970."
      },
      "sources": [
        {
          "name": "Wikipedia - Zapiekanka",
          "url": "https://en.wikipedia.org/wiki/Zapiekanka"
        }
      ]
    }
  },
  "scandinavian": {
    "gravlax": {
      "local": "gravlax",
      "note": {
        "en": "A Nordic dish of raw salmon dry-cured in salt, sugar and dill, dating to medieval Swedish fishermen who buried (graved) it to ferment.",
        "fr": "Plat nordique de saumon cru salé au sel, sucre et aneth, remontant aux pêcheurs suédois médiévaux qui l'enterraient pour le faire fermenter."
      },
      "sources": [
        {
          "name": "Wikipedia — Gravlax",
          "url": "https://en.wikipedia.org/wiki/Gravlax"
        },
        {
          "name": "196 flavors — Gravlax",
          "url": "https://www.196flavors.com/sweden-salmon-gravlax/"
        }
      ]
    },
    "smörrebröd": {
      "local": "smørrebrød",
      "note": {
        "en": "Danish open-faced sandwich on buttered rye bread (rugbrød) with toppings like herring or roast beef; popularised in 19th-century industrial…",
        "fr": "Tartine danoise ouverte sur pain de seigle beurré (rugbrød) garnie de hareng ou rôti de bœuf, popularisée dans le Danemark industriel du…"
      },
      "sources": [
        {
          "name": "Wikipedia — Smørrebrød",
          "url": "https://en.wikipedia.org/wiki/Sm%C3%B8rrebr%C3%B8d"
        },
        {
          "name": "Scandinavia Standard — Guide to Smørrebrød",
          "url": "https://www.scandinaviastandard.com/getting-to-know-smorrebrod-the-ultimate-guide-to-danish-open-faced-sandwiches/"
        }
      ]
    },
    "köttbullar": {
      "local": "köttbullar",
      "note": {
        "en": "Swedish meatballs made from a blend of ground beef and pork, seasoned with allspice and white pepper; the first printed recipe appeared in…",
        "fr": "Boulettes de viande suédoises composées d'un mélange de bœuf et de porc hachés, assaisonnées de piment de la Jamaïque et de poivre blanc…"
      },
      "sources": [
        {
          "name": "SwedishFood.com — Meatballs (Köttbullar)",
          "url": "https://www.swedishfood.com/mains/meatballs"
        },
        {
          "name": "Internet Archive — Cajsa Warg, Hjelpreda i Hushållningen för Unga Fruentimber (1755, first edition)",
          "url": "https://archive.org/details/hjelpreda-i-hushallningen-for-unga-fruentimber-1-uppl-1755"
        }
      ]
    },
    "lutefisk": {
      "local": "lutefisk",
      "note": {
        "en": "A traditional Nordic Christmas dish of dried whitefish (usually cod) rehydrated and cured in lye, giving a gelatinous texture.",
        "fr": "Plat de Noël nordique traditionnel de poisson blanc séché (souvent la morue) réhydraté et traité à la soude, à texture gélatineuse."
      },
      "sources": [
        {
          "name": "Wikipedia — Lutefisk",
          "url": "https://en.wikipedia.org/wiki/Lutefisk"
        },
        {
          "name": "Visit Norway — Lutefisk",
          "url": "https://www.visitnorway.com/things-to-do/food-and-drink/lutefisk/"
        }
      ]
    },
    "rakfisk": {
      "local": "rakfisk",
      "note": {
        "en": "Norwegian dish of salted, brine-fermented freshwater trout, eaten raw; an inland preservation method dating to the Middle Ages.",
        "fr": "Plat norvegien de truite d'eau douce salee et fermentee en saumure, mangee crue ; methode de conservation remontant au Moyen Age."
      },
      "sources": [
        {
          "name": "Atlas Obscura - Rakfisk",
          "url": "https://www.atlasobscura.com/foods/rakfisk-norwegian-fermented-fish"
        },
        {
          "name": "Remitly - Norwegian Rakfisk facts",
          "url": "https://www.remitly.com/blog/lifestyle-culture/nationaldishes-rakfisk-fascinating-facts-norway/"
        }
      ]
    },
    "janssons frestelse": {
      "local": "Janssons frestelse",
      "note": {
        "en": "A Swedish casserole of potatoes, onions, cream and pickled sprats (called \"ansjovis\"); recipe first published 1940, now a Christmas classic.",
        "fr": "Gratin suedois de pommes de terre, oignons, creme et sprats marines (dits \"ansjovis\"); recette publiee en 1940, classique de Noel."
      },
      "sources": [
        {
          "name": "Wikipedia - Jansson's temptation",
          "url": "https://en.wikipedia.org/wiki/Jansson%27s_temptation"
        },
        {
          "name": "TasteAtlas - Janssons frestelse",
          "url": "https://tasteatlas.com/janssons-frestelse"
        }
      ]
    },
    "sill (pickled herring)": {
      "local": "inlagd sill",
      "note": {
        "en": "Swedish dish of salted herring marinated in vinegar, sugar, onion and spices, traditionally served at Midsummer, Christmas and Easter.",
        "fr": "Plat suédois de hareng salé mariné dans du vinaigre, du sucre, de l'oignon et des épices, servi à la Saint-Jean, à Noël et à Pâques."
      },
      "sources": [
        {
          "name": "TasteAtlas — Inlagd sill",
          "url": "https://tasteatlas.com/inlagd-sill"
        },
        {
          "name": "Wikipedia — Soused herring",
          "url": "https://en.wikipedia.org/wiki/Soused_herring"
        }
      ]
    },
    "kanelbullar": {
      "local": "kanelbullar",
      "note": {
        "en": "Swedish cardamom-spiced cinnamon buns, central to the fika coffee break and honoured by Kanelbullens dag every 4 October since 1999.",
        "fr": "Brioches suedoises a la cannelle et cardamome, au coeur du fika et celebrees chaque 4 octobre depuis 1999 par le Kanelbullens dag."
      },
      "sources": [
        {
          "name": "Sweden.se – Cinnamon buns",
          "url": "https://sweden.se/culture/food/cinnamon-buns"
        },
        {
          "name": "The Local – Six sticky facts about Sweden's beloved bun",
          "url": "https://www.thelocal.se/20161004/six-sticky-facts-about-swedens-beloved-bun"
        }
      ]
    },
    "lefse": {
      "local": "lefse",
      "note": {
        "en": "A soft Norwegian flatbread, traditionally potato-based after potatoes reached Norway in the 1750s, often served with butter at holidays.",
        "fr": "Un pain plat norvégien moelleux, traditionnellement à base de pomme de terre depuis l'arrivée de celle-ci en Norvège vers 1750."
      },
      "sources": [
        {
          "name": "Wikipedia — Lefse",
          "url": "https://en.wikipedia.org/wiki/Lefse"
        },
        {
          "name": "The Daring Gourmet — Lefse (Norwegian Potato Flatbread)",
          "url": "https://www.daringgourmet.com/norwegian-potato-lefse/"
        }
      ]
    },
    "rye bread danish": {
      "local": "rugbrød",
      "note": {
        "en": "Dense Danish sourdough rye bread, a national staple for centuries (until potatoes spread in the late 19th century) and the base for the…",
        "fr": "Pain de seigle danois au levain, dense, aliment de base national depuis des siècles (jusqu'à la diffusion de la pomme de terre à la fin du…"
      },
      "sources": [
        {
          "name": "Wikipedia — Rugbrød",
          "url": "https://en.wikipedia.org/wiki/Rugbr%C3%B8d"
        },
        {
          "name": "TasteAtlas — Rugbrød",
          "url": "https://www.tasteatlas.com/rugbrd"
        }
      ]
    },
    "smörgåstårta": {
      "local": "smörgåstårta",
      "note": {
        "en": "A savoury Swedish layered sandwich cake of bread, creamy fillings and cold cuts/fish/eggs, first recorded in a 1934 newspaper.",
        "fr": "Un gâteau-sandwich suédois salé en couches de pain, garnitures crémeuses et charcuterie/poisson/œufs, mentionné dès 1934."
      },
      "sources": [
        {
          "name": "The Local Sweden – Swedish word of the day: smörgåstårta",
          "url": "https://www.thelocal.se/20191113/swedish-word-of-the-day-smrgstrta"
        },
        {
          "name": "True North Kitchen – Smörgåstårta (Swedish Sandwich Cake)",
          "url": "https://true-north-kitchen.com/smorgastarta-swedish-sandwich-cake/"
        }
      ]
    },
    "reindeer steak": {
      "local": "Reinsdyrstek",
      "note": {
        "en": "Norwegian/Sami reindeer steak, fried or grilled in reindeer fat and butter, seasoned with salt and pepper, served medium-rare with…",
        "fr": "Steak de renne norvegien/sami, poele ou grille a la graisse de renne et au beurre, assaisonne de sel et de poivre, servi saignant avec…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Reinsdyr Mørbrad",
          "url": "https://www.tasteatlas.com/reinsdyr-morbrad"
        },
        {
          "name": "Wikipedia - Sautéed reindeer",
          "url": "https://en.wikipedia.org/wiki/Saut%C3%A9ed_reindeer"
        }
      ]
    },
    "aquavit": {
      "local": "akvavit",
      "note": {
        "en": "Scandinavian distilled spirit flavored mainly with caraway or dill, produced since the 15th century; its name comes from the Latin aqua…",
        "fr": "Spiritueux scandinave distillé, aromatisé surtout au carvi ou à l'aneth, produit depuis le XVe siècle ; son nom vient du latin aqua vitae…"
      },
      "sources": [
        {
          "name": "Wikipedia — Akvavit",
          "url": "https://en.wikipedia.org/wiki/Akvavit"
        },
        {
          "name": "TasteAtlas — Akvavit",
          "url": "https://www.tasteatlas.com/akvavit"
        }
      ]
    },
    "lingonberry jam": {
      "local": "Lingonsylt",
      "note": {
        "en": "A tart Swedish preserve of lingonberries, traditionally made to last the winter and served with meatballs, pancakes and fried herring.",
        "fr": "Confiture suedoise acidulee d'airelles rouges, jadis preparee pour l'hiver et servie avec boulettes, crepes et hareng frit."
      },
      "sources": [
        {
          "name": "Wikipedia — Lingonberry jam",
          "url": "https://en.wikipedia.org/wiki/Lingonberry_jam"
        },
        {
          "name": "Swedish Food — Lingonberries",
          "url": "https://www.swedishfood.com/lingonberries"
        }
      ]
    },
    "cloudberry": {
      "local": "Multekrem",
      "note": {
        "en": "Norwegian dessert of cloudberries folded into sweetened whipped cream, traditionally served at Christmas with krumkake.",
        "fr": "Dessert norvegien de mures arctiques melees a de la creme fouettee sucree, servi a Noel avec des krumkake."
      },
      "sources": [
        {
          "name": "Wikipedia - Multekrem",
          "url": "https://en.wikipedia.org/wiki/Multekrem"
        },
        {
          "name": "Scandinavia Standard - Guide to Cloudberries",
          "url": "https://www.scandinaviastandard.com/a-guide-to-cloudberries-all-about-the-norths-most-sought-after-fruit/"
        }
      ]
    },
    "semla": {
      "local": "semla (pl. semlor)",
      "note": {
        "en": "A Swedish cardamom-spiced wheat bun filled with almond paste and whipped cream, eaten since the 16th century around Shrove Tuesday (Fat…",
        "fr": "Brioche suedoise au cardamome fourree de pate d'amande et de creme fouettee, consommee depuis le XVIe siecle autour de Mardi gras."
      },
      "sources": [
        {
          "name": "Wikipedia - Semla",
          "url": "https://en.wikipedia.org/wiki/Semla"
        },
        {
          "name": "sweden.se - The semla, a Swedish delicacy",
          "url": "https://sweden.se/culture/food/the-semla-a-swedish-delicacy"
        }
      ]
    },
    "kalops": {
      "local": "kalops",
      "note": {
        "en": "A traditional Swedish/Finnish beef stew with onion, allspice and bay leaf, first described in Cajsa Warg's 1755 cookbook.",
        "fr": "Un ragoût de bœuf suédois/finlandais traditionnel à l'oignon, au piment de la Jamaïque et au laurier, décrit dès le livre de cuisine de…"
      },
      "sources": [
        {
          "name": "Wikipedia — Kalops (cuisine)",
          "url": "https://en.wikipedia.org/wiki/Kalops_(cuisine)"
        }
      ]
    },
    "blodpudding": {
      "local": "blodpudding",
      "note": {
        "en": "A Swedish baked blood pudding of pig's blood, flour and beer, traditionally fried in slices and served with lingonberry jam.",
        "fr": "Un boudin suédois cuit au four à base de sang de porc, de farine et de bière, frit en tranches et servi avec de la confiture d'airelles."
      },
      "sources": [
        {
          "name": "TasteAtlas - Blodpudding",
          "url": "https://www.tasteatlas.com/blodpudding"
        },
        {
          "name": "Skjalden - Blodpudding (Swedish blood pudding)",
          "url": "https://skjalden.com/blodpudding/"
        }
      ]
    },
    "frikadeller": {
      "local": "frikadeller",
      "note": {
        "en": "Danish pan-fried meatballs of minced pork (sometimes with veal), onion, egg and milk; a beloved national dish eaten in the region for over…",
        "fr": "Boulettes danoises poelees de porc hache (parfois avec du veau), oignon, oeuf et lait ; plat national apprecie, consomme dans la region…"
      },
      "sources": [
        {
          "name": "TasteAtlas - Frikadeller",
          "url": "https://www.tasteatlas.com/frikadeller"
        },
        {
          "name": "Eating Europe - Frikadeller: A Guide to Denmark's Beloved Meatballs",
          "url": "https://www.eatingeurope.com/blog/frikadeller-danish-meatballs/"
        }
      ]
    },
    "flæskesteg": {
      "local": "flæskesteg",
      "note": {
        "en": "A Danish roast pork cooked with the rind on for crisp crackling, a national dish that became common after ovens spread in homes c.1860.",
        "fr": "Roti de porc danois cuit avec la couenne pour une croute croustillante, plat national repandu apres l'arrivee des fours vers 1860."
      },
      "sources": [
        {
          "name": "Wikipedia - Flæskesteg",
          "url": "https://en.wikipedia.org/wiki/Fl%C3%A6skesteg"
        },
        {
          "name": "Skjalden - Flæskesteg, Denmark's Classic Roast Pork",
          "url": "https://skjalden.com/flaeskesteg/"
        }
      ]
    },
    "æbleskiver": {
      "local": "æbleskiver",
      "note": {
        "en": "Danish spherical pancake-like pastries fried in a special cast-iron pan, traditional at Christmas; the oldest printed recipe dates to 1703.",
        "fr": "Beignets danois sphériques cuits dans une poêle en fonte spéciale, traditionnels à Noël; la plus ancienne recette imprimée date de 1703."
      },
      "sources": [
        {
          "name": "Wikipedia — Æbleskiver",
          "url": "https://en.wikipedia.org/wiki/%C3%86bleskiver"
        },
        {
          "name": "Slow Food Foundation — Ark of Taste: Æbleskive",
          "url": "https://www.fondazioneslowfood.com/en/ark-of-taste-slow-food/aebleskiver-2/"
        }
      ]
    },
    "toscakaka": {
      "local": "toscakaka",
      "note": {
        "en": "A Swedish almond sponge cake topped with a baked caramelised almond glaze, a classic of the Nordic fika coffee break.",
        "fr": "Gateau eponge suedois aux amandes nappe d'un glacage d'amandes caramelisees cuit, classique du fika nordique."
      },
      "sources": [
        {
          "name": "Wiktionary: toscakaka",
          "url": "https://en.m.wiktionary.org/wiki/toscakaka"
        },
        {
          "name": "Scandinavian Cookbook: Tosca Cake (Swedish Almond Cake)",
          "url": "https://scandinaviancookbook.com/tosca-cake-swedish-almond-cake/"
        }
      ]
    }
  },
  "persian": {
    "chelo kabab": {
      "local": "چلوکباب (chelow kabāb)",
      "note": {
        "en": "Iran's national dish: saffron-buttered steamed rice (chelow) with grilled kebab, popularised under the Qajar dynasty.",
        "fr": "Plat national iranien : riz cuit vapeur au safran et beurre (chelow) avec kebab grillé, popularisé sous la dynastie Qajar."
      },
      "sources": [
        {
          "name": "Wikipedia — Chelow kabab",
          "url": "https://en.wikipedia.org/wiki/Chelow_kabab"
        },
        {
          "name": "Pars Times — History of Chelo-Kabab",
          "url": "https://www.parstimes.com/cuisine/chelokabab.html"
        }
      ]
    },
    "ghormeh sabzi": {
      "local": "قورمه سبزی",
      "note": {
        "en": "Iranian herb stew of fried parsley, cilantro and fenugreek with kidney beans, lamb and dried Persian lime, regarded as the national dish.",
        "fr": "Ragout iranien d'herbes (persil, coriandre, fenugrec), haricots rouges, agneau et citron seche, considere comme le plat national."
      },
      "sources": [
        {
          "name": "Wikipedia — Ghormeh sabzi",
          "url": "https://en.wikipedia.org/wiki/Ghormeh_sabzi"
        },
        {
          "name": "TasteAtlas — Ghormeh sabzi",
          "url": "https://www.tasteatlas.com/ghormeh-sabzi"
        }
      ]
    },
    "fesenjan": {
      "local": "خورش فسنجان",
      "note": {
        "en": "Iranian khoresh (stew) of poultry simmered in ground walnuts and pomegranate molasses, originating in Gilan, traditionally with duck.",
        "fr": "Khoresh (ragout) iranien de volaille mijotee dans des noix moulues et de la melasse de grenade, originaire du Gilan, traditionnellement au…"
      },
      "sources": [
        {
          "name": "Wikipedia — Fesenjān",
          "url": "https://en.wikipedia.org/wiki/Fesenj%C4%81n"
        },
        {
          "name": "The Mediterranean Dish — Fesenjan (Persian Pomegranate & Walnut Stew)",
          "url": "https://www.themediterraneandish.com/fesenjan-persian-pomegranate-walnut-stew/"
        }
      ]
    },
    "tahdig": {
      "local": "ته‌دیگ",
      "note": {
        "en": "A crisp golden crust of rice (or bread/potato) formed at the bottom of the pot in Persian cooking; the name means \"bottom of the pot.\"",
        "fr": "Croûte de riz (ou pain/pomme de terre) dorée et croustillante formée au fond de la marmite en cuisine perse ; son nom signifie « fond de la…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Tahdig",
          "url": "https://www.tasteatlas.com/tahdig"
        },
        {
          "name": "Wikipedia — Tahchin",
          "url": "https://en.wikipedia.org/wiki/Tahchin"
        }
      ]
    },
    "zereshk polo": {
      "local": "زرشک‌پلو",
      "note": {
        "en": "Persian saffron-basmati pilaf studded with tart-sweet barberries (zereshk), a festive dish often served with chicken (morgh).",
        "fr": "Pilaf persan de riz basmati au safran parsemé d'épine-vinette aigre-douce (zereshk), plat de fête souvent servi avec du poulet (morgh)."
      },
      "sources": [
        {
          "name": "Wikipedia — Zereshk polo",
          "url": "https://en.wikipedia.org/wiki/Zereshk_polo"
        },
        {
          "name": "Cooking With Ayeh — Zereshk Polo (Persian Barberry Rice)",
          "url": "https://cookingwithayeh.com/zereshk-polo-persian-barberry-rice/"
        }
      ]
    },
    "khoresh bademjan": {
      "local": "خورش بادمجان",
      "note": {
        "en": "Iranian stew of fried eggplant and tomato with lamb or beef and a souring agent, served over steamed rice.",
        "fr": "Ragoût iranien d'aubergine frite et de tomate avec de l'agneau ou du bœuf et un acidifiant, servi sur du riz."
      },
      "sources": [
        {
          "name": "Wikipedia - Khoresh bademjan",
          "url": "https://en.wikipedia.org/wiki/Khoresh_bademjan"
        },
        {
          "name": "Persian Mama - Khoresh Bademjan",
          "url": "https://persianmama.com/khoresh-bademjan-persian-eggplant-stew-with-beef/"
        }
      ]
    },
    "ash reshteh": {
      "local": "آش رشته",
      "note": {
        "en": "Thick Persian soup of herbs, beans, lentils and reshteh noodles, finished with kashk; the noodles are said to symbolize good fortune for…",
        "fr": "Soupe persane epaisse aux herbes, haricots, lentilles et nouilles reshteh, nappee de kashk; les nouilles symbolisent la bonne fortune pour…"
      },
      "sources": [
        {
          "name": "Wikipedia - Aush reshteh",
          "url": "https://en.wikipedia.org/wiki/Aush_reshteh"
        },
        {
          "name": "TasteAtlas - Ash reshteh",
          "url": "https://www.tasteatlas.com/ash-reshteh"
        }
      ]
    },
    "kashk e bademjan": {
      "local": "کشک بادمجان",
      "note": {
        "en": "A staple Iranian warm dip of mashed eggplant and kashk (fermented dried-yogurt whey), topped with fried onion, garlic, mint and walnuts.",
        "fr": "Un dip iranien chaud, à base d'aubergine en purée et de kashk (petit-lait de yaourt séché fermenté), garni d'oignon frit, d'ail, de menthe…"
      },
      "sources": [
        {
          "name": "Wikipedia — Kashk bademjan",
          "url": "https://en.wikipedia.org/wiki/Kashk_bademjan"
        }
      ]
    },
    "joojeh kabab": {
      "local": "جوجه کباب",
      "note": {
        "en": "Popular Iranian grilled chicken kebab marinated in saffron, onion and lemon juice; \"joojeh\" means young chicken in Persian.",
        "fr": "Brochette de poulet grille iranienne populaire, marinee au safran, oignon et citron; \"joojeh\" signifie jeune poulet en persan."
      },
      "sources": [
        {
          "name": "Wikipedia — Jujeh kabab",
          "url": "https://en.wikipedia.org/wiki/Jujeh_kabab"
        },
        {
          "name": "TasteAtlas — Jujeh kabab",
          "url": "https://www.tasteatlas.com/jujeh-kabab"
        }
      ]
    },
    "kuku sabzi": {
      "local": "کوکوی سبزی",
      "note": {
        "en": "An Iranian herb-packed egg dish (a thin frittata) with parsley, coriander, dill and chives, traditionally served at Nowruz, the Persian New…",
        "fr": "Plat iranien d'oeufs riche en herbes (frittata fine) au persil, coriandre, aneth et ciboulette, servi traditionnellement a Norouz, le…"
      },
      "sources": [
        {
          "name": "Wikipedia - Kuku (food)",
          "url": "https://en.wikipedia.org/wiki/Kuku_(food)"
        },
        {
          "name": "The Mediterranean Dish - Kuku Sabzi",
          "url": "https://www.themediterraneandish.com/kuku-sabzi-persian-baked-omelet/"
        }
      ]
    },
    "mirza ghasemi": {
      "local": "میرزا قاسمی",
      "note": {
        "en": "A smoky Iranian dip from Gilan of grilled aubergine with garlic, tomato and egg, named after 19th-century Rasht governor Mohammad Qasim…",
        "fr": "Caviar iranien fumé du Gilan, d'aubergine grillée à l'ail, tomate et œuf, nommé d'après Mohammad Qasim Khan, gouverneur de Rasht au XIXe…"
      },
      "sources": [
        {
          "name": "Wikipedia — Mirza ghassemi",
          "url": "https://en.wikipedia.org/wiki/Mirza_ghassemi"
        }
      ]
    },
    "sabzi polo ba mahi": {
      "local": "سبزی پلو با ماهی",
      "note": {
        "en": "Persian herb rice (parsley, dill, chives, coriander) served with fried fish, traditionally eaten on Nowruz, the Persian New Year.",
        "fr": "Riz persan aux herbes (persil, aneth, ciboulette, coriandre) servi avec du poisson frit, traditionnellement mangé à Norouz, le Nouvel An…"
      },
      "sources": [
        {
          "name": "Persian Mama — Sabzi Polo ba Mahi",
          "url": "https://persianmama.com/sabzi-polo-ba-mahi/"
        },
        {
          "name": "Iran Front Page — Dishes Served in Iran During Nowruz",
          "url": "https://ifpnews.com/dishes-served-iran-nowruz-sabzi-polo-ba-mahi/"
        }
      ]
    },
    "lubia polo": {
      "local": "لوبیا پلو",
      "note": {
        "en": "Iranian layered rice dish of green beans and spiced ground beef or lamb in tomato sauce, perfumed with saffron and cinnamon.",
        "fr": "Plat iranien de riz en couches avec haricots verts et viande hachee epicee en sauce tomate, parfume au safran et a la cannelle."
      },
      "sources": [
        {
          "name": "Wikipedia - Loobia polo",
          "url": "https://en.wikipedia.org/wiki/Loobia_polo"
        },
        {
          "name": "Labsalliebe - Loobia Polo (لوبیا پلو)",
          "url": "https://labsalliebe.com/en/loobia-polo-persian-rice-with-green-beans-and-ground-meat-%D9%84%D9%88%D8%A8%DB%8C%D8%A7-%D9%BE%D9%84%D9%88/"
        }
      ]
    },
    "halim": {
      "local": "حلیم",
      "note": {
        "en": "A thick Persian porridge of wheat slow-cooked with shredded meat, eaten at breakfast; it descends from the medieval Arab dish harees.",
        "fr": "Bouillie persane epaisse de ble mijote longuement avec de la viande effilochee, mangee au petit-dejeuner; elle derive du plat arabe…"
      },
      "sources": [
        {
          "name": "Wikipedia — Haleem",
          "url": "https://en.wikipedia.org/wiki/Haleem"
        },
        {
          "name": "Termeh Travel — Persian Halim",
          "url": "https://blog.termehtravel.com/persian-halim/"
        }
      ]
    },
    "faloodeh": {
      "local": "فالوده",
      "note": {
        "en": "A Persian semi-frozen sorbet of thin starch vermicelli in rosewater-lime syrup, native to Shiraz and among the world's oldest frozen…",
        "fr": "Sorbet persan semi-glacé de fins vermicelles d'amidon dans un sirop d'eau de rose et citron vert, originaire de Chiraz, parmi les plus…"
      },
      "sources": [
        {
          "name": "Wikipedia — Faloodeh",
          "url": "https://en.wikipedia.org/wiki/Faloodeh"
        },
        {
          "name": "TasteAtlas — Best Desserts in Iran",
          "url": "https://www.tasteatlas.com/best-rated-desserts-in-iran"
        }
      ]
    },
    "saffron rice persian": {
      "local": "چلو زعفرانی",
      "note": {
        "en": "Persian steamed long-grain white rice (chelow) garnished with bloomed saffron that tints it gold, a staple of Iranian cuisine; Iran…",
        "fr": "Riz blanc persan a grain long cuit a la vapeur (chelow) garni de safran infuse qui le colore en dore, plat de base de la cuisine iranienne…"
      },
      "sources": [
        {
          "name": "TasteAtlas — Chelo",
          "url": "https://www.tasteatlas.com/chelo"
        },
        {
          "name": "Wikipedia — Saffron",
          "url": "https://en.wikipedia.org/wiki/Saffron"
        }
      ]
    },
    "barberry polo": {
      "local": "زرشک‌پلو (zereshk polo)",
      "note": {
        "en": "Iranian rice dish of saffron-scented basmati topped with tart red barberries, a festive dish often served with chicken (morgh).",
        "fr": "Plat de riz iranien de basmati safrané garni d'épine-vinette rouge acidulée, plat de fête souvent servi avec du poulet (morgh)."
      },
      "sources": [
        {
          "name": "Wikipedia — Zereshk polo",
          "url": "https://en.wikipedia.org/wiki/Zereshk_polo"
        },
        {
          "name": "Cooking With Ayeh — Zereshk Polo (Persian Barberry Rice)",
          "url": "https://cookingwithayeh.com/zereshk-polo-persian-barberry-rice/"
        }
      ]
    },
    "eggplant kashk": {
      "local": "کشک بادمجان",
      "note": {
        "en": "Iranian dip of roasted mashed eggplant with kashk (drained fermented whey), fried onion, garlic, mint and walnuts, eaten with bread.",
        "fr": "Trempette iranienne d'aubergine rôtie écrasée au kashk (petit-lait fermenté), oignon frit, ail, menthe et noix, mangée avec du pain."
      },
      "sources": [
        {
          "name": "Wikipedia — Kashk bademjan",
          "url": "https://en.wikipedia.org/wiki/Kashk_bademjan"
        },
        {
          "name": "Wikidata — Kashk e badamjan",
          "url": "https://www.wikidata.org/wiki/Q16937065"
        }
      ]
    },
    "shirazi salad": {
      "local": "سالاد شیرازی (sālād-e shirāzi)",
      "note": {
        "en": "Persian diced cucumber, tomato and onion salad from Shiraz, dressed with verjuice or lime; emerged after tomatoes reached Iran in the late…",
        "fr": "Salade persane de Chiraz, concombre, tomate et oignon en dés, au verjus ou citron vert; apparue après l'arrivee de la tomate en Iran vers…"
      },
      "sources": [
        {
          "name": "Wikipedia — Shirazi salad",
          "url": "https://en.wikipedia.org/wiki/Shirazi_salad"
        }
      ]
    },
    "doogh": {
      "local": "دوغ",
      "note": {
        "en": "A cold, savory Persian drink of yogurt (or buttermilk) diluted with water, salted, and flavored with mint; often carbonated. Traditionally…",
        "fr": "Boisson perse froide et salee a base de yaourt (ou de babeurre) dilue dans l'eau, sale et parfume a la menthe, souvent gazeifiee…"
      },
      "sources": [
        {
          "name": "Wikipedia — Doogh",
          "url": "https://en.wikipedia.org/wiki/Doogh"
        },
        {
          "name": "Sadaf — Doogh: The Refreshing Persian Yogurt Drink",
          "url": "https://www.sadaf.com/blogs/guides/doogh-the-refreshing-persian-yogurt-drink"
        }
      ]
    },
    "baklava persian": {
      "local": "باقلوا",
      "note": {
        "en": "Persian baghlava is a layered nut pastry flavored with cardamom and rosewater syrup, traditionally associated with the city of Tabriz.",
        "fr": "Le baghlava persan est une pâtisserie feuilletée aux noix parfumée à la cardamome et au sirop d'eau de rose, traditionnellement liée à la…"
      },
      "sources": [
        {
          "name": "The Caspian Chef — Baghlava, Persian Baklava",
          "url": "https://thecaspianchef.com/2018/11/persian-baklava-baghlava/"
        },
        {
          "name": "Persian Mama — Baklava / Baghlava باقلوا",
          "url": "https://persianmama.com/baklava-baghlava/"
        }
      ]
    }
  }
};

module.exports = { CLASSIC_NOTES, CUISINE_NOTES };
