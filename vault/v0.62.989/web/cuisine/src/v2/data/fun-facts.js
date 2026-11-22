// web/cuisine/src/v2/data/fun-facts.js — v0.61.290
//
// 40 NLB-sourced SG food-history facts. Was fun-facts.json in
// v0.61.285; converted to .js with export default in v0.61.290
// because vitest's Node 20 ESM loader rejects bare JSON imports
// (needs `with { type: 'json' }` attribute, which is awkward to
// support across Vite + Node + vitest uniformly). A .js module
// with export default works everywhere identically.
//
// Schema: array of { id, tags[], en, fr, source, sourceUrl }.
// Curation methodology + source breakdown: see v0.61.285 journal.

export default [
  {
    "id": "hainanese-chicken-rice-wenchang",
    "tags": ["hainanese-chicken-rice", "chicken-rice", "chinese", "hainanese", "SG"],
    "en": "Hainanese chicken rice traces back to boiled Wenchang chicken from Wenchang county, Hainan. Hainanese migrants brought the technique to Singapore.",
    "fr": "Le riz au poulet hainanais remonte au poulet de Wenchang bouilli, originaire du comté de Wenchang à Hainan. Des immigrants hainanais ont apporté la technique à Singapour.",
    "source": "NLB Infopedia",
    "sourceUrl": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_910_2005-01-11.html"
  },
  {
    "id": "laksa-etymology",
    "tags": ["laksa", "peranakan", "chinese", "malay", "SG"],
    "en": "\"Laksa\" may come from Hindi lakshah (\"hundred thousand\", for its many ingredients) or Persian lāksha (vermicelli). Likely a Peranakan creation — rice noodles plus Malay spice paste.",
    "fr": "« Laksa » viendrait peut-être du hindi lakshah (« cent mille », pour ses nombreux ingrédients) ou du persan lāksha (vermicelle). Probablement une création peranakan — nouilles de riz et pâte d'épices malaise.",
    "source": "NLB Infopedia",
    "sourceUrl": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2023-01-16_164606.html"
  },
  {
    "id": "nasi-lemak-winstedt-1909",
    "tags": ["nasi-lemak", "malay", "SG", "MY"],
    "en": "Nasi lemak's earliest written reference is by Richard Olaf Winstedt in 1909 — coconut-milk rice with anchovies, cucumber, ikan selar, and sweet chilli.",
    "fr": "La première mention écrite du nasi lemak est de Richard Olaf Winstedt en 1909 — riz cuit dans du lait de coco, avec anchois, concombre, ikan selar et sauce chili sucrée.",
    "source": "NLB Infopedia",
    "sourceUrl": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1739_2010-12-13.html"
  },
  {
    "id": "satay-arab-origins",
    "tags": ["satay", "malay", "SG"],
    "en": "Satay's origins trace to Arab traders; the peanut sauce dip was a Southeast Asian adaptation. Travelling satay men with portable charcoal grills were a Singapore staple into the late 1970s.",
    "fr": "Les origines du satay remontent aux marchands arabes ; la sauce aux cacahuètes est une adaptation d'Asie du Sud-Est. Les vendeurs ambulants de satay avec leurs grills portables ont marqué Singapour jusqu'à la fin des années 1970.",
    "source": "NLB Infopedia",
    "sourceUrl": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_888_2005-01-10.html"
  },
  {
    "id": "roti-prata-madras-parota",
    "tags": ["roti-prata", "indian", "SG"],
    "en": "Roti prata comes from parota in Madras (Chennai). Indian migrants brought it to Singapore; by the 1920s it was established across the Malayan peninsula.",
    "fr": "Le roti prata vient du parota de Madras (Chennai). Des immigrants indiens l'ont apporté à Singapour ; dans les années 1920, il était établi dans toute la péninsule malaise.",
    "source": "NLB Infopedia",
    "sourceUrl": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_869_2005-01-11.html"
  },
  {
    "id": "teh-tarik-pulled-tea",
    "tags": ["teh-tarik", "mamak", "indian", "SG", "MY"],
    "en": "\"Teh tarik\" means \"pulled tea\" in Malay — the milk-tea brew is poured between two cups to froth it. Often called a mamak drink for its Indian-Muslim roots.",
    "fr": "« Teh tarik » signifie « thé tiré » en malais — le thé au lait est versé entre deux tasses pour le mousser. Souvent appelé une boisson mamak en raison de ses racines indo-musulmanes.",
    "source": "NLB Infopedia",
    "sourceUrl": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2013-07-19_103055.html"
  },
  {
    "id": "kaya-hainanese-coconut-jam",
    "tags": ["kaya", "kopitiam", "hainanese", "chinese", "SG"],
    "en": "Kaya was a Hainanese adaptation — Hainanese cooks in British and Peranakan homes swapped Western fruit jam for coconut milk, creating the pandan-coconut spread.",
    "fr": "Le kaya est une adaptation hainanaise — les cuisiniers hainanais dans les foyers britanniques et peranakan ont remplacé la confiture de fruits occidentale par du lait de coco, créant la pâte au coco-pandan.",
    "source": "NLB BiblioAsia",
    "sourceUrl": "https://biblioasia.nlb.gov.sg/vol-18/issue-1/apr-to-jun-2022/evolution-chinese-food-singapore/"
  },
  {
    "id": "hainanese-curry-rice-1945",
    "tags": ["hainanese-curry-rice", "kopitiam", "hainanese", "chinese", "SG"],
    "en": "Hainanese curry rice is post-1945 kopitiam fusion — Western pork chops paired with Peranakan dishes like babi pongteh and chap chye, all doused in curry gravy.",
    "fr": "Le riz au curry hainanais est une fusion kopitiam d'après 1945 — côtelettes de porc occidentales accompagnées de plats peranakan comme le babi pongteh et le chap chye, le tout arrosé de sauce curry.",
    "source": "NLB BiblioAsia",
    "sourceUrl": "https://biblioasia.nlb.gov.sg/vol-18/issue-1/apr-to-jun-2022/evolution-chinese-food-singapore/"
  },
  {
    "id": "yong-tau-foo-hakka",
    "tags": ["yong-tau-foo", "hakka", "chinese", "SG"],
    "en": "Yong tau foo was a Hakka improvisation — unable to find wheat flour for dumplings in their new home, Hakka migrants stuffed tofu instead.",
    "fr": "Le yong tau foo est une improvisation hakka — ne trouvant pas de farine de blé pour leurs dumplings dans leur nouvelle terre, les migrants hakka ont farci du tofu à la place.",
    "source": "NLB BiblioAsia",
    "sourceUrl": "https://biblioasia.nlb.gov.sg/vol-18/issue-1/apr-to-jun-2022/evolution-chinese-food-singapore/"
  },
  {
    "id": "popiah-bangkuang-substitute",
    "tags": ["popiah", "chinese", "fujian", "SG"],
    "en": "Singapore popiah swaps bamboo shoots (unavailable locally) for bangkuang (Mexican turnip) — a Fujian and Chaoshan migrant adaptation.",
    "fr": "Le popiah singapourien remplace les pousses de bambou (introuvables localement) par du bangkuang (jicama) — une adaptation des migrants du Fujian et de Chaoshan.",
    "source": "NLB BiblioAsia",
    "sourceUrl": "https://biblioasia.nlb.gov.sg/vol-18/issue-1/apr-to-jun-2022/evolution-chinese-food-singapore/"
  },
  {
    "id": "hawkers-multiracial-19c",
    "tags": ["hawker", "history", "SG"],
    "en": "By the mid-19th century, multiracial street hawkers were already everywhere in Singapore — Hokkien, Teochew, Cantonese, Malay, Javanese, and Indian.",
    "fr": "Dès le milieu du XIXᵉ siècle, des hawkers de rue multiraciaux étaient déjà partout à Singapour — Hokkien, Teochew, Cantonais, Malais, Javanais et Indiens.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "hawker-licensing-1903",
    "tags": ["hawker", "history", "policy", "SG"],
    "en": "In 1903, the colonial government decided hawkers needed registration and licensing — public-health concerns (cholera, typhoid) drove the policy.",
    "fr": "En 1903, le gouvernement colonial a décidé que les hawkers devaient être enregistrés et licenciés — les enjeux de santé publique (choléra, typhoïde) ont motivé la décision.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "hawker-licensing-1907-1919",
    "tags": ["hawker", "history", "policy", "SG"],
    "en": "Licensing laws were first enforced in 1907 for night hawkers; in 1919 they were extended to cover day and itinerant hawkers too.",
    "fr": "Les lois de licence ont été appliquées pour la première fois en 1907 aux hawkers de nuit ; en 1919, elles ont été étendues aux hawkers de jour et ambulants.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "first-hawker-shelters-1921-1923",
    "tags": ["hawker", "history", "SG"],
    "en": "The Telok Ayer / Finlayson Green hawker shelter (1921) and the People's Park hawker shelter (1923) were Singapore's first government efforts to house street vendors.",
    "fr": "L'abri de hawkers de Telok Ayer / Finlayson Green (1921) et celui de People's Park (1923) furent les premières initiatives gouvernementales pour loger les vendeurs de rue à Singapour.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "peoples-park-300-stalls",
    "tags": ["hawker", "history", "SG"],
    "en": "By 1940, People's Park Market housed over 300 stalls — Singapore's largest at the time. A 1966 fire destroyed 186 stalls there.",
    "fr": "En 1940, le marché de People's Park abritait plus de 300 stands — le plus grand de Singapour à l'époque. Un incendie en 1966 y a détruit 186 stands.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "hawkers-inquiry-1950",
    "tags": ["hawker", "history", "policy", "SG"],
    "en": "The Hawkers Inquiry Commission, set up by Governor F. Gimson in April 1950, had 10 members tackling hawker public-health and licensing issues.",
    "fr": "La Hawkers Inquiry Commission, créée par le gouverneur F. Gimson en avril 1950, comptait 10 membres chargés des questions de santé publique et de licence des hawkers.",
    "source": "NLB Infopedia",
    "sourceUrl": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1637_2010-01-31.html"
  },
  {
    "id": "illegal-hawkers-1959",
    "tags": ["hawker", "history", "policy", "SG"],
    "en": "By 1959, illegal hawkers numbered over 30,000 in Singapore — and only 16 inspectors were available to monitor compliance.",
    "fr": "En 1959, le nombre de hawkers illégaux dépassait 30 000 à Singapour — et seulement 16 inspecteurs étaient disponibles pour faire respecter les règles.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "yong-nyuk-lin-code-1965",
    "tags": ["hawker", "history", "policy", "SG"],
    "en": "Minister Yong Nyuk Lin announced a national hawker licensing scheme and the Hawkers' Code in December 1965, implemented by early 1966.",
    "fr": "Le ministre Yong Nyuk Lin a annoncé un programme national de licence des hawkers et le Hawkers' Code en décembre 1965, mis en œuvre début 1966.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-after-independence/"
  },
  {
    "id": "hawker-centres-1971-committee",
    "tags": ["hawker", "history", "policy", "SG"],
    "en": "The Hawker Centres Development Committee, formed in 1971, drove the first wave of purpose-built centres. Collyer Quay (110 stalls) and Boat Quay (80 stalls) opened earliest.",
    "fr": "Le Hawker Centres Development Committee, formé en 1971, a impulsé la première vague de centres dédiés. Collyer Quay (110 stands) et Boat Quay (80 stands) ouvrirent les premiers.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-after-independence/"
  },
  {
    "id": "street-hawker-resettlement-1986",
    "tags": ["hawker", "history", "policy", "SG"],
    "en": "Street-hawker resettlement completed in early 1986 — the last 80 vendors at China Square and Haw Par Villa moved into hawker centres. About 113 centres existed by then.",
    "fr": "La réinstallation des hawkers de rue s'est achevée début 1986 — les 80 derniers vendeurs de China Square et Haw Par Villa ont rejoint les hawker centres. Environ 113 centres existaient alors.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-after-independence/"
  },
  {
    "id": "stall-grading-1998-safe-2023",
    "tags": ["hawker", "history", "policy", "SG"],
    "en": "The A–D stall grading system (cleanliness and hygiene) was introduced in 1998; it was replaced by the SAFE framework in 2023.",
    "fr": "Le système de notation des stands de A à D (propreté et hygiène) a été introduit en 1998 ; il a été remplacé par le cadre SAFE en 2023.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-after-independence/"
  },
  {
    "id": "unesco-2020-114-centres",
    "tags": ["hawker", "history", "SG"],
    "en": "Singapore's hawker culture entered UNESCO's intangible heritage list in 2020. The NEA managed 114 markets and hawker centres as of November 2020.",
    "fr": "La culture des hawkers de Singapour a rejoint le patrimoine immatériel de l'UNESCO en 2020. La NEA gérait 114 marchés et hawker centres en novembre 2020.",
    "source": "NLB Infopedia",
    "sourceUrl": "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1637_2010-01-31.html"
  },
  {
    "id": "hokkien-largest-hawker-group",
    "tags": ["hokkien", "chinese", "history", "SG"],
    "en": "Hokkiens were the largest Chinese hawker group in colonial Singapore — they dominated coffee and cooked-food stalls across Chinatown.",
    "fr": "Les Hokkiens formaient le plus grand groupe de hawkers chinois dans le Singapour colonial — ils dominaient les stands de café et de nourriture cuisinée dans tout Chinatown.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "teochew-fruit-veg-trade",
    "tags": ["teochew", "chinese", "history", "SG"],
    "en": "Teochews made up about 25% of Chinese hawkers in Singapore — they controlled the fruit-and-vegetable trade between China and Singapore.",
    "fr": "Les Teochews représentaient environ 25 % des hawkers chinois à Singapour — ils contrôlaient le commerce de fruits et légumes entre la Chine et Singapour.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "cantonese-balestier-farms",
    "tags": ["cantonese", "chinese", "history", "SG"],
    "en": "Cantonese hawkers worked People's Park, Kreta Ayer, and Jalan Besar — they controlled the vegetable supply from the Balestier farms.",
    "fr": "Les hawkers cantonais travaillaient à People's Park, Kreta Ayer et Jalan Besar — ils contrôlaient l'approvisionnement en légumes depuis les fermes de Balestier.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "hockchia-coffee-guild",
    "tags": ["hockchia", "chinese", "history", "SG"],
    "en": "Hockchia and Hockchew hawkers ran night stalls along Queen Street and Johore Road, organised through the Hockchia Coffee Stall Keepers Guild.",
    "fr": "Les hawkers Hockchia et Hockchew tenaient des stands de nuit sur Queen Street et Johore Road, organisés via la Hockchia Coffee Stall Keepers Guild.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "malay-javanese-middle-road",
    "tags": ["malay", "javanese", "history", "SG"],
    "en": "Malay and Javanese hawkers clustered around Middle Road, selling satay, kueh, curios, and cloth.",
    "fr": "Les hawkers malais et javanais se regroupaient autour de Middle Road, vendant satay, kueh, curiosités et tissus.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "indian-hawker-rojak-vadai",
    "tags": ["indian", "history", "SG"],
    "en": "Indian hawkers in Singapore sold rojak, mee goreng, vadai, muruku, kachang puteh, goat's milk, and yoghurt — often near schools and playing fields.",
    "fr": "Les hawkers indiens à Singapour vendaient du rojak, du mee goreng, du vadai, du muruku, du kachang puteh, du lait de chèvre et du yaourt — souvent près des écoles et des terrains de jeu.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "north-indian-muslim-tin-cans",
    "tags": ["indian", "history", "SG"],
    "en": "North Indian Muslim hawkers in old Singapore carried tea, ginger water, and buns in tall tin cans through the streets.",
    "fr": "Les hawkers indo-musulmans du nord, dans le vieux Singapour, portaient thé, eau gingembrée et brioches dans de grandes boîtes en fer-blanc à travers les rues.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "hainanese-kopitiam-1945",
    "tags": ["hainanese", "kopitiam", "chinese", "SG"],
    "en": "After the Japanese occupation ended in 1945, jobless Hainanese opened kopitiams — they served Western-style breakfasts with local twists like soy-drizzled half-boiled eggs.",
    "fr": "À la fin de l'occupation japonaise en 1945, des Hainanais sans emploi ont ouvert des kopitiams — ils y servaient des petits-déjeuners à l'occidentale avec une touche locale comme l'œuf à la coque arrosé de sauce soja.",
    "source": "NLB BiblioAsia",
    "sourceUrl": "https://biblioasia.nlb.gov.sg/vol-18/issue-1/apr-to-jun-2022/evolution-chinese-food-singapore/"
  },
  {
    "id": "hokkien-mee-fusion",
    "tags": ["hokkien-mee", "hokkien", "cantonese", "chinese", "SG"],
    "en": "Singapore Hokkien mee fuses Hokkien noodles with Cantonese cooking technique — round yellow noodles fired in high-heat wok hei.",
    "fr": "Le Hokkien mee singapourien associe les nouilles hokkien à la technique de cuisson cantonaise — nouilles jaunes rondes saisies à feu vif au wok hei.",
    "source": "NLB BiblioAsia",
    "sourceUrl": "https://biblioasia.nlb.gov.sg/vol-18/issue-1/apr-to-jun-2022/evolution-chinese-food-singapore/"
  },
  {
    "id": "nyonya-dumplings-peranakan",
    "tags": ["peranakan", "nyonya", "chinese", "malay", "SG"],
    "en": "Peranakan Chinese created nyonya dumplings blending Chinese and Malay traditions — candied wintermelon, coriander powder, and aniseed in the filling.",
    "fr": "Les Chinois peranakan ont créé les nyonya dumplings en mêlant traditions chinoises et malaises — pastèque d'hiver confite, poudre de coriandre et anis dans la garniture.",
    "source": "NLB BiblioAsia",
    "sourceUrl": "https://biblioasia.nlb.gov.sg/vol-18/issue-1/apr-to-jun-2022/evolution-chinese-food-singapore/"
  },
  {
    "id": "satay-club-esplanade-1971-1994",
    "tags": ["satay", "esplanade", "hawker", "SG"],
    "en": "The Satay Club moved into the Esplanade hawker shelter in 1971 and stayed until the site was demolished in 1994 for the Esplanade Theatres.",
    "fr": "Le Satay Club s'est installé dans l'abri de hawkers d'Esplanade en 1971 et y est resté jusqu'à la démolition du site en 1994 pour la construction de l'Esplanade Theatres.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "seng-poh-1951-day-night",
    "tags": ["hawker", "history", "SG"],
    "en": "Seng Poh Road Market (1951) had an experimental design — an open shelter for day produce that was repurposed for cooked-food stalls at night.",
    "fr": "Le marché de Seng Poh Road (1951) avait un design expérimental — un abri ouvert pour les produits frais le jour, réaffecté aux stands de plats cuisinés le soir.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "macpherson-1955-dowsett",
    "tags": ["hawker", "history", "SG"],
    "en": "MacPherson Road Market opened in 1955 — designed by Gordon Dowsett, two floors, around 200 stalls. It became Jackson Centre, a 24-hour coffeeshop, in 1991.",
    "fr": "Le marché de MacPherson Road a ouvert en 1955 — conçu par Gordon Dowsett, deux étages, environ 200 stands. Il est devenu Jackson Centre, un coffeeshop ouvert 24h/24, en 1991.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "lim-tua-tow-pentagon",
    "tags": ["hawker", "chai-tow-kway", "hokkien-mee", "SG"],
    "en": "Lim Tua Tow Road market (1950s) had a pentagon exterior with circular portholes — locally famous for its fried carrot cake (chai tow kway) and Hokkien mee.",
    "fr": "Le marché de Lim Tua Tow Road (années 1950) avait un extérieur pentagonal avec des hublots circulaires — réputé localement pour son chai tow kway (gâteau de radis sauté) et son Hokkien mee.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-during-colonial-period/"
  },
  {
    "id": "gluttons-square-orchard",
    "tags": ["hawker", "history", "SG"],
    "en": "Glutton's Square — the Orchard Road open-air car park — was a famous 1970s hawker relocation site before Orchard's redevelopment.",
    "fr": "Glutton's Square — le parking à ciel ouvert d'Orchard Road — fut un célèbre site de réinstallation des hawkers dans les années 1970, avant le réaménagement d'Orchard.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-after-independence/"
  },
  {
    "id": "bedok-minangkabau-roof",
    "tags": ["hawker", "malay", "SG"],
    "en": "Bedok Food Centre's roof reflects Malay kampong heritage — its peaked architecture is inspired by Minangkabau design.",
    "fr": "Le toit du Bedok Food Centre reflète l'héritage kampong malais — son architecture à pignons s'inspire du style Minangkabau.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-after-independence/"
  },
  {
    "id": "bukit-canberra-2021",
    "tags": ["hawker", "history", "SG"],
    "en": "Bukit Canberra Hawker Centre opened in 2021 with green features and a direct link to a sports complex — part of NEA's 2015 plan for 10+ new centres.",
    "fr": "Le Bukit Canberra Hawker Centre a ouvert en 2021 avec des aménagements écologiques et un accès direct à un complexe sportif — issu du plan 2015 de la NEA pour plus de 10 nouveaux centres.",
    "source": "NLB curiocity",
    "sourceUrl": "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-after-independence/"
  },
  {
    "id": "labyrinth-michelin-chicken-rice",
    "tags": ["hainanese-chicken-rice", "chicken-rice", "michelin", "SG"],
    "en": "Restaurant Labyrinth's modern Hainanese chicken rice held a Michelin star from 2017 to 2020 — chef Han Li Guang led the kitchen.",
    "fr": "Le riz au poulet hainanais moderne du Restaurant Labyrinth a détenu une étoile Michelin de 2017 à 2020 — sous la direction du chef Han Li Guang.",
    "source": "NLB BiblioAsia",
    "sourceUrl": "https://biblioasia.nlb.gov.sg/vol-18/issue-1/apr-to-jun-2022/evolution-chinese-food-singapore/"
  },
  // v0.61.295 — Phase 2A: 12 MY/regional facts. Sourced from Wikipedia
  // (verifiable, well-cited regional culinary articles) rather than
  // NLB — NLB's coverage skews Singapore. Tagged with MY + the city
  // (penang / kl / klang / JB) so the selector preferentially
  // surfaces them for users searching from those regions.
  {
    "id": "penang-char-kway-teow",
    "tags": ["char-kway-teow", "penang", "MY", "chinese"],
    "en": "Penang char kway teow is wok-charred with Chinese chives, cockles, and prawns. The dish keeps sauce light so the wok hei dominates — distinct from KL's sweeter dark-soy style.",
    "fr": "Le char kway teow de Penang est saisi au wok avec ciboulette chinoise, coques et crevettes. La sauce reste légère pour laisser dominer le wok hei — distinct du style plus sucré de KL.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Char_kway_teow"
  },
  {
    "id": "kl-char-kway-teow",
    "tags": ["char-kway-teow", "kl", "MY", "chinese"],
    "en": "Kuala Lumpur char kway teow tilts darker and sweeter than Penang's — more dark soy sauce, slightly less prawn-stock body. Locals call it \"kway teow KL-style\" to distinguish.",
    "fr": "Le char kway teow de Kuala Lumpur penche vers le foncé et le sucré, par rapport à celui de Penang — plus de sauce soja noire, un peu moins de bouillon de crevettes. Les locaux l'appellent « kway teow style KL ».",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Char_kway_teow"
  },
  {
    "id": "klang-bak-kut-teh-origin",
    "tags": ["bak-kut-teh", "klang", "MY", "chinese", "hokkien"],
    "en": "Klang in Selangor is widely cited as the origin city of Malaysian-style bak kut teh. The dark, herbal Hokkien broth was a labourer's morning meal in the 19th-century Klang port.",
    "fr": "Klang, dans le Selangor, est largement citée comme la ville d'origine du bak kut teh malaisien. Ce bouillon Hokkien sombre et herbacé était le petit-déjeuner des ouvriers du port de Klang au XIXᵉ siècle.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Bak_kut_teh"
  },
  {
    "id": "asam-laksa-penang",
    "tags": ["laksa", "asam-laksa", "penang", "MY"],
    "en": "Penang asam laksa is a tamarind + mackerel soup, distinct from the SG/JB coconut-curry laksa. CNN once ranked it #7 in the world's 50 best foods (2011).",
    "fr": "Le laksa asam de Penang est une soupe au tamarin et au maquereau, distincte du laksa au lait de coco de SG/JB. CNN l'a classé 7ᵉ des 50 meilleurs plats du monde (2011).",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Asam_laksa"
  },
  {
    "id": "nasi-kandar-tamil-muslim",
    "tags": ["nasi-kandar", "penang", "MY", "indian"],
    "en": "Nasi kandar originated with Tamil-Muslim hawkers in 19th-century Penang. The \"kandar\" pole was used to carry the rice + curries on the shoulders; the name preserves the technique.",
    "fr": "Le nasi kandar trouve ses origines chez les marchands tamouls musulmans dans le Penang du XIXᵉ siècle. Le « kandar » était la perche utilisée pour porter le riz et les currys sur les épaules ; le nom conserve la technique.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Nasi_kandar"
  },
  {
    "id": "my-durian-seasons",
    "tags": ["durian", "MY", "JB"],
    "en": "Peninsular Malaysia's main durian seasons are June–August and November–January. Pahang's Musang King harvest peaks in late June; smaller crops continue year-round.",
    "fr": "Les principales saisons du durian en Malaisie péninsulaire sont juin–août et novembre–janvier. La récolte du Musang King à Pahang culmine fin juin ; des récoltes plus modestes continuent toute l'année.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Durian"
  },
  {
    "id": "jb-mamak-24-7",
    "tags": ["mamak", "JB", "MY", "indian"],
    "en": "Johor Bahru's mamak stalls run 24/7 because of the cross-border trade rhythm with Singapore. Many serve teh tarik and roti canai to truck drivers on the AH2 highway.",
    "fr": "Les stands mamak de Johor Bahru fonctionnent 24h/24 grâce au rythme du commerce transfrontalier avec Singapour. Beaucoup servent du teh tarik et du roti canai aux camionneurs de l'autoroute AH2.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Mamak_stall"
  },
  {
    "id": "kl-hokkien-mee",
    "tags": ["hokkien-mee", "kl", "MY", "chinese", "hokkien"],
    "en": "Kuala Lumpur hokkien mee is a thick, dark stir-fry — yellow noodles, crispy pork lard, and dark soy. Distinct from Singapore's lighter prawn-stock version of the same name.",
    "fr": "Le hokkien mee de Kuala Lumpur est un sauté épais et sombre — nouilles jaunes, lardons croustillants et sauce soja noire. Distinct de la version singapourienne plus légère, au bouillon de crevettes.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Hokkien_mee"
  },
  {
    "id": "murtabak-yemeni-arab",
    "tags": ["murtabak", "indian", "MY", "SG"],
    "en": "Murtabak's roots are Yemeni / Arab — the word means \"folded\" in Arabic. Tamil-Muslim hawkers in Penang and Singapore adapted the stuffed flatbread by the early 1900s.",
    "fr": "Les origines du murtabak sont yéménites / arabes — le mot signifie « plié » en arabe. Des marchands tamouls musulmans à Penang et Singapour ont adapté la galette farcie au début des années 1900.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Mutabbaq"
  },
  {
    "id": "pasar-malam-tradition",
    "tags": ["pasar-malam", "hawker", "MY", "SG"],
    "en": "Pasar malam (\"night markets\") are a weekly tradition across MY and SG. They began as ad-hoc food + goods sellers in 19th-century kampungs; many cities now run formal weekly rotations.",
    "fr": "Le pasar malam (« marché de nuit ») est une tradition hebdomadaire en MY et à SG. Il a commencé par des vendeurs informels de nourriture et de biens dans les kampungs du XIXᵉ siècle ; de nombreuses villes organisent désormais des rotations hebdomadaires.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Pasar_malam"
  },
  {
    "id": "mee-goreng-mamak",
    "tags": ["mee-goreng", "mamak", "indian", "MY"],
    "en": "Mee goreng mamak is a Malaysian-Indian invention — Indian-Muslim hawkers stir-fried Chinese yellow noodles with curry powder, tomatoes, and sambal. A 20th-century cross-cultural fusion.",
    "fr": "Le mee goreng mamak est une invention indo-malaisienne — des marchands indo-musulmans ont sauté des nouilles jaunes chinoises avec de la poudre de curry, des tomates et du sambal. Une fusion interculturelle du XXᵉ siècle.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Mee_goreng_mamak"
  },
  {
    "id": "kueh-kapit-love-letters",
    "tags": ["kueh-kapit", "peranakan", "chinese", "hokkien", "MY", "SG", "dessert"],
    "en": "Kueh kapit (\"love letters\") are crispy egg wafers folded into quarters. Hokkien + Peranakan in origin; a Chinese New Year specialty across both Malaysia and Singapore.",
    "fr": "Les kueh kapit (« lettres d'amour ») sont des gaufrettes d'œuf croustillantes pliées en quarts. D'origine Hokkien et Peranakan, c'est une spécialité du Nouvel An chinois en Malaisie comme à Singapour.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Kuih_kapit"
  },
  // v0.61.297 — anti-repeat variety pass. Adds a second fact for 12
  // popular cuisines that previously had only one Phase-1 / Phase-2A
  // entry (laksa / nasi-lemak / satay / roti-prata / teh-tarik /
  // kaya / durian / yong-tau-foo / popiah / nasi-kandar / murtabak /
  // mee-goreng). With anti-repeat capped at 10 IDs, a single-fact
  // cuisine cycled back to the same fact every search. Each new
  // entry covers a distinct angle (technique / regional variant /
  // etymology / cultural marker) so the modal feels fresh on repeat
  // searches of the same cuisine.
  {
    "id": "laksa-katong-cut",
    "tags": ["laksa", "katong", "peranakan", "SG"],
    "en": "Katong laksa (Singapore) is famously eaten with just a spoon — the noodles are pre-cut into spoon-friendly lengths. Chunky cockles, dried shrimp, and a thick coconut-curry broth distinguish it from soup-laksa variants.",
    "fr": "Le laksa de Katong (Singapour) se mange célèbrement à la cuillère seule — les nouilles sont pré-coupées en morceaux adaptés à la cuillère. Coques charnues, crevettes séchées et bouillon coco-curry épais le distinguent des laksas-soupe.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Laksa"
  },
  {
    "id": "nasi-lemak-pandan-knots",
    "tags": ["nasi-lemak", "malay", "SG", "MY"],
    "en": "Nasi lemak's signature aroma comes from pandan leaves cooked with the rice. The leaves are tied into knots so the cook can lift them out cleanly before serving.",
    "fr": "L'arôme caractéristique du nasi lemak vient des feuilles de pandan cuites avec le riz. Les feuilles sont nouées pour que le cuisinier puisse les retirer proprement avant de servir.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Nasi_lemak"
  },
  {
    "id": "satay-madura-origin",
    "tags": ["satay", "malay", "indonesian", "SG", "MY"],
    "en": "Satay's earliest written records are 19th-century Javanese — the dish is traced specifically to the Madurese of eastern Java. Skewered grilled meat spread to Malaya through Indonesian traders by the 1800s.",
    "fr": "Les premières traces écrites du satay sont javanaises du XIXᵉ siècle — la recette est rattachée précisément aux Madurais de l'est de Java. La viande grillée en brochette a gagné la Malaisie via les commerçants indonésiens au XIXᵉ siècle.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Satay"
  },
  {
    "id": "roti-prata-tisu",
    "tags": ["roti-prata", "indian", "SG", "MY", "dessert"],
    "en": "Roti tisu (\"tissue roti\") is a Singaporean variant — the dough is stretched paper-thin into a tall ~50 cm cone and served with kaya, condensed milk, or chocolate sauce for dipping.",
    "fr": "Le roti tisu (« roti tissu ») est une variante singapourienne — la pâte est étirée si finement qu'on la dresse en cône d'environ 50 cm de haut, servi avec kaya, lait concentré ou sauce chocolat à tremper.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Roti_canai"
  },
  {
    "id": "teh-tarik-pulling-distance",
    "tags": ["teh-tarik", "mamak", "indian", "SG", "MY"],
    "en": "The tarik pull is performed at up to a metre between two cups. The aeration produces teh tarik's signature thick foam — a barista trick that predates espresso milk foam by decades.",
    "fr": "Le « tarik » s'effectue avec jusqu'à un mètre de distance entre deux tasses. L'aération crée la mousse épaisse caractéristique du teh tarik — une astuce de barista qui précède la mousse de lait à l'espresso de plusieurs décennies.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Teh_tarik"
  },
  {
    "id": "kaya-pandan-vs-hainanese",
    "tags": ["kaya", "kopitiam", "hainanese", "peranakan", "chinese", "SG", "MY"],
    "en": "Two kaya styles coexist: Hainanese (caramel-brown, slow-cooked with coconut + eggs + sugar) and Nonya (bright green from pandan juice). The brown version is older; the green spread via Peranakan households.",
    "fr": "Deux styles de kaya coexistent : hainanais (brun caramel, cuit lentement avec coco + œufs + sucre) et nyonya (vert vif grâce au jus de pandan). La version brune est la plus ancienne ; la verte s'est diffusée par les foyers peranakan.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Kaya_(jam)"
  },
  {
    "id": "durian-musang-king-civet",
    "tags": ["durian", "MY", "fruit"],
    "en": "Musang King (Mao Shan Wang) is the most prized Malaysian durian — golden flesh, bittersweet, with a deeper aroma than the more common D24. The name comes from the Musang (Asian palm civet) of the orchards.",
    "fr": "Le Musang King (Mao Shan Wang) est le durian malaisien le plus prisé — chair dorée, doux-amer, à l'arôme plus profond que le D24, plus courant. Le nom vient du Musang (civette palmiste) des vergers.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Musang_King"
  },
  {
    "id": "yong-tau-foo-pick-your-own",
    "tags": ["yong-tau-foo", "hakka", "chinese", "SG"],
    "en": "Singapore's yong tau foo evolved into a self-service hawker format — customers pick items from a tray and the stall assembles. The Hakka original was a more limited set of stuffed-tofu pieces.",
    "fr": "Le yong tau foo singapourien a évolué vers un format de hawker en libre-service — les clients choisissent les pièces sur un plateau, le stand assemble. La version hakka originale était un assortiment plus restreint de morceaux de tofu farcis.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Yong_tau_foo"
  },
  {
    "id": "popiah-cantonese-vs-hokkien",
    "tags": ["popiah", "chinese", "fujian", "cantonese", "hokkien", "SG"],
    "en": "Cantonese popiah is fried (crispy spring-roll style); Hokkien-Peranakan popiah is soft-wrapped fresh. Both descended from Fujian's bo bing tradition, diverging by community in 19th-century Southeast Asia.",
    "fr": "Le popiah cantonais est frit (style rouleau de printemps croustillant) ; le popiah hokkien-peranakan est enroulé tendre et frais. Les deux descendent de la tradition du bo bing fujianais, divergeant par communauté en Asie du Sud-Est au XIXᵉ siècle.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Popiah"
  },
  {
    "id": "nasi-kandar-banjir",
    "tags": ["nasi-kandar", "penang", "MY", "indian"],
    "en": "Nasi kandar's signature is \"banjir\" (\"flooded\") — multiple curries poured over the rice so they mix on the plate. Each customer dictates the curry combo at the counter.",
    "fr": "La marque de fabrique du nasi kandar est le « banjir » (« inondé ») — plusieurs currys versés sur le riz pour qu'ils se mélangent dans l'assiette. Chaque client choisit la combinaison de currys au comptoir.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Nasi_kandar"
  },
  {
    "id": "murtabak-fold-technique",
    "tags": ["murtabak", "indian", "MY", "SG"],
    "en": "Murtabak's distinctive cook: dough is stretched on a hot plate, filling (egg + minced meat + onion) added, then folded into a square pocket and griddled on both sides until crisp.",
    "fr": "La cuisson typique du murtabak : la pâte est étirée sur une plaque chauffante, la farce (œuf + viande hachée + oignon) ajoutée, puis pliée en pochette carrée et grillée des deux côtés jusqu'à devenir croustillante.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Mutabbaq"
  },
  {
    "id": "mee-goreng-mamak-tomato-base",
    "tags": ["mee-goreng", "mamak", "indian", "MY", "SG"],
    "en": "Mee goreng mamak's tomato-and-chilli base is the giveaway — a Malaysian-Indian invention NOT found in either ancestor cuisine. The dish dates to early 20th-century Malayan port cities.",
    "fr": "La base tomate-et-piment du mee goreng mamak est révélatrice — une invention indo-malaisienne absente des cuisines ancestrales. Le plat remonte aux villes portuaires malaises du début du XXᵉ siècle.",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Mee_goreng_mamak"
  },
  // ── v0.61.383 — GLOBAL food facts (operator Task 1: a Tokyo/Seoul/Bangkok
  // user should get relevant facts, not Singapore trivia). Tagged "global" +
  // "other" (the non-SG region fallback) + a country code where specific.
  // Localised into en/fr/zh/ms/ta/ja/ko/th. The facts are well-known truths;
  // the zh/ms/ta/ja/ko/th PHRASING is machine-authored and PROVISIONAL —
  // flagged for a native-speaker review pass (see the v0.61.383 journal).
  {
    "id": "g-ramen-china-origin",
    "tags": ["global", "other", "jp", "japanese", "ramen", "noodles"],
    "en": "Ramen came to Japan from China and only became a beloved national dish in the 20th century.",
    "fr": "Le ramen est arrivé au Japon depuis la Chine et n'est devenu un plat national adoré qu'au XXᵉ siècle.",
    "zh": "拉面从中国传入日本，直到20世纪才成为广受喜爱的国民美食。",
    "ms": "Ramen dibawa ke Jepun dari China dan hanya menjadi hidangan kebangsaan yang digemari pada abad ke-20.",
    "ta": "ரமன் சீனாவிலிருந்து ஜப்பானுக்கு வந்தது; 20ஆம் நூற்றாண்டில்தான் அது விரும்பப்படும் தேசிய உணவாக மாறியது.",
    "ja": "ラーメンは中国から日本に伝わり、国民的な人気料理になったのは20世紀になってからです。",
    "ko": "라면은 중국에서 일본으로 전해졌고, 20세기에 이르러서야 사랑받는 국민 음식이 되었습니다.",
    "th": "ราเมงเข้ามาในญี่ปุ่นจากจีน และเพิ่งกลายเป็นอาหารยอดนิยมประจำชาติในศตวรรษที่ 20",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Ramen"
  },
  {
    "id": "g-sushi-fermented-rice",
    "tags": ["global", "other", "jp", "japanese", "sushi"],
    "en": "Sushi began as a way to preserve fish in fermented rice — at first, the rice was thrown away.",
    "fr": "Le sushi est né comme une méthode pour conserver le poisson dans du riz fermenté — au début, on jetait le riz.",
    "zh": "寿司最初是用发酵米饭保存鱼的方法——起初米饭是被丢弃的。",
    "ms": "Sushi bermula sebagai cara mengawet ikan dalam nasi yang ditapai — pada mulanya, nasi itu dibuang.",
    "ta": "சூஷி, புளித்த அரிசியில் மீனைப் பாதுகாக்கும் வழியாகத் தொடங்கியது — முதலில் அந்த அரிசி தூக்கி எறியப்பட்டது.",
    "ja": "寿司はもともと発酵させた米で魚を保存する方法で、最初は米は捨てられていました。",
    "ko": "초밥은 본래 발효시킨 밥에 생선을 보존하는 방법이었고, 처음에는 밥을 버렸습니다.",
    "th": "ซูชิเริ่มต้นจากวิธีถนอมปลาในข้าวหมัก โดยตอนแรกจะทิ้งข้าวไป",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Sushi"
  },
  {
    "id": "g-kimchi-winter-jars",
    "tags": ["global", "other", "kr", "korean", "kimchi"],
    "en": "Koreans once buried jars of kimchi underground to keep them fermenting slowly through the winter.",
    "fr": "Autrefois, les Coréens enterraient des jarres de kimchi pour les laisser fermenter lentement tout l'hiver.",
    "zh": "韩国人过去会把泡菜坛子埋在地下，让它们在整个冬天缓慢发酵。",
    "ms": "Dahulu, orang Korea membenamkan tempayan kimchi ke dalam tanah supaya ia ditapai perlahan-lahan sepanjang musim sejuk.",
    "ta": "முன்பு கொரியர்கள், கிம்சி ஜாடிகளை நிலத்தடியில் புதைத்து, குளிர்காலம் முழுவதும் மெதுவாகப் புளிக்க வைத்தனர்.",
    "ja": "韓国ではかつて、キムチの甕を地中に埋め、冬の間ゆっくりと発酵させていました。",
    "ko": "예전에 한국인들은 김치 항아리를 땅에 묻어 겨우내 천천히 발효시켰습니다.",
    "th": "ชาวเกาหลีเคยฝังไหกิมจิไว้ใต้ดิน เพื่อให้หมักช้า ๆ ตลอดฤดูหนาว",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Kimchi"
  },
  {
    "id": "g-chilli-thai-portuguese",
    "tags": ["global", "other", "th", "thai"],
    "en": "Chillies are not native to Thailand — Portuguese traders brought them from the Americas about 500 years ago.",
    "fr": "Le piment n'est pas originaire de Thaïlande — des marchands portugais l'ont apporté des Amériques il y a environ 500 ans.",
    "zh": "辣椒并非原产于泰国——大约500年前由葡萄牙商人从美洲带来。",
    "ms": "Cili bukan tumbuhan asli Thailand — pedagang Portugis membawanya dari benua Amerika kira-kira 500 tahun lalu.",
    "ta": "மிளகாய் தாய்லாந்தின் சொந்த பயிர் அல்ல — சுமார் 500 ஆண்டுகளுக்கு முன் போர்த்துகீசிய வணிகர்கள் அமெரிக்காவிலிருந்து கொண்டுவந்தனர்.",
    "ja": "唐辛子はタイ原産ではなく、約500年前にポルトガルの商人が南北アメリカから持ち込みました。",
    "ko": "고추는 태국이 원산지가 아니라, 약 500년 전 포르투갈 상인들이 아메리카에서 들여왔습니다.",
    "th": "พริกไม่ใช่พืชพื้นเมืองของไทย — พ่อค้าชาวโปรตุเกสนำเข้ามาจากทวีปอเมริกาเมื่อราว 500 ปีก่อน",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Bird%27s_eye_chili"
  },
  {
    "id": "g-tea-china-ancient",
    "tags": ["global", "other", "cn", "chinese", "tea"],
    "en": "Tea was first drunk in China more than 2,000 years ago, long before it reached the rest of the world.",
    "fr": "Le thé a été bu pour la première fois en Chine il y a plus de 2 000 ans, bien avant d'atteindre le reste du monde.",
    "zh": "茶最早在2000多年前的中国被饮用，远早于它传到世界其他地方。",
    "ms": "Teh mula-mula diminum di China lebih 2,000 tahun lalu, jauh sebelum ia sampai ke seluruh dunia.",
    "ta": "தேநீர் முதன்முதலில் 2,000 ஆண்டுகளுக்கு முன் சீனாவில் அருந்தப்பட்டது; உலகின் பிற பகுதிகளை அது அடைவதற்கு வெகு காலம் முன்பே.",
    "ja": "お茶は2,000年以上前に中国で初めて飲まれ、世界の他の地域に伝わるよりずっと前のことでした。",
    "ko": "차는 2,000여 년 전 중국에서 처음 마셨으며, 세계 다른 지역에 전해지기 훨씬 전이었습니다.",
    "th": "ชาถูกดื่มครั้งแรกในจีนเมื่อกว่า 2,000 ปีก่อน นานก่อนที่จะแพร่ไปยังส่วนอื่นของโลก",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/History_of_tea"
  },
  {
    "id": "g-noodles-oldest-china",
    "tags": ["global", "other", "cn", "chinese", "noodles"],
    "en": "The oldest known bowl of noodles is about 4,000 years old, found in north-west China.",
    "fr": "Le plus ancien bol de nouilles connu a environ 4 000 ans ; il a été découvert dans le nord-ouest de la Chine.",
    "zh": "已知最古老的一碗面条约有4000年历史，发现于中国西北部。",
    "ms": "Mangkuk mi tertua yang diketahui berusia kira-kira 4,000 tahun, ditemui di barat laut China.",
    "ta": "அறியப்பட்ட மிகப் பழமையான நூடுல்ஸ் கிண்ணம் சுமார் 4,000 ஆண்டுகள் பழமையானது; வடமேற்கு சீனாவில் கண்டுபிடிக்கப்பட்டது.",
    "ja": "知られている最古の麺は約4,000年前のもので、中国北西部で見つかりました。",
    "ko": "알려진 가장 오래된 국수 한 그릇은 약 4,000년 전의 것으로, 중국 북서부에서 발견되었습니다.",
    "th": "ชามก๋วยเตี๋ยวที่เก่าแก่ที่สุดเท่าที่ทราบมีอายุราว 4,000 ปี พบทางตะวันตกเฉียงเหนือของจีน",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Noodle"
  },
  {
    "id": "g-coffee-ethiopia-yemen",
    "tags": ["global", "other", "coffee"],
    "en": "Coffee was first brewed in Ethiopia and Yemen, centuries before it ever reached Europe.",
    "fr": "Le café a d'abord été préparé en Éthiopie et au Yémen, des siècles avant d'arriver en Europe.",
    "zh": "咖啡最早在埃塞俄比亚和也门被冲泡，比它传入欧洲早了几个世纪。",
    "ms": "Kopi mula-mula diseduh di Ethiopia dan Yaman, beberapa abad sebelum ia sampai ke Eropah.",
    "ta": "காபி முதலில் எத்தியோப்பியா மற்றும் யேமனில் தயாரிக்கப்பட்டது; அது ஐரோப்பாவை அடைவதற்கு பல நூற்றாண்டுகள் முன்பே.",
    "ja": "コーヒーは最初にエチオピアとイエメンで淹れられ、ヨーロッパに伝わる何世紀も前のことでした。",
    "ko": "커피는 에티오피아와 예멘에서 처음 끓여졌으며, 유럽에 전해지기 수 세기 전이었습니다.",
    "th": "กาแฟถูกชงครั้งแรกในเอธิโอเปียและเยเมน หลายศตวรรษก่อนจะไปถึงยุโรป",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/History_of_coffee"
  },
  {
    "id": "g-umami-1908-kombu",
    "tags": ["global", "other", "jp", "japanese"],
    "en": "Umami, the savoury 'fifth taste', was identified in Japan in 1908 from kombu seaweed broth.",
    "fr": "L'umami, la « cinquième saveur », a été identifié au Japon en 1908 à partir d'un bouillon d'algue kombu.",
    "zh": "鲜味——“第五种味道”——于1908年在日本从昆布高汤中被发现。",
    "ms": "Umami, 'rasa kelima yang gurih', dikenal pasti di Jepun pada tahun 1908 daripada kaldu rumpai laut kombu.",
    "ta": "உமாமி எனப்படும் 'ஐந்தாவது சுவை', 1908ல் ஜப்பானில் கொம்பு கடற்பாசி குழம்பிலிருந்து கண்டறியப்பட்டது.",
    "ja": "うま味（第五の味）は、1908年に日本で昆布のだしから発見されました。",
    "ko": "감칠맛, 즉 '다섯 번째 맛'은 1908년 일본에서 다시마 국물로부터 밝혀졌습니다.",
    "th": "อูมามิ หรือ 'รสที่ห้า' ถูกค้นพบในญี่ปุ่นเมื่อปี 1908 จากน้ำสต๊อกสาหร่ายคอมบุ",
    "source": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Umami"
  }
];
