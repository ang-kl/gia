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
  }
};

module.exports = { CLASSIC_NOTES, CUISINE_NOTES };
