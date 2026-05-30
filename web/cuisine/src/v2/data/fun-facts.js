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
  }
];
