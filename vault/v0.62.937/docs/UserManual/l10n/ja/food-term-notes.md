# Japanese Food-Term Review Notes

Status: `draft-review-notes`

These notes are for future Japanese localisation of the Soleat User Manual. They are not translated manual content yet.

## Core principle

Translate food-search intent, not only English words.

Japanese localisation should preserve:

- dish identity;
- cuisine context;
- native-script recognition;
- Singapore/local food meaning;
- concise UI wording;
- caution around availability and live data.

## Terms that must not be translated

Keep these unchanged unless the product later approves a localised UI name:

```text
Soleat
/help IDs such as help.soleat.cuisine.overview
Telegram commands such as /cuisine, /s, /hawker, /privacy, /forgetme
```

Commands and help IDs should remain exactly as written.

## High-risk food terms

### Dumpling

Do not flatten all dumpling examples into one Japanese term.

The English manual uses dumpling to show why food terms need context. Japanese localisation should preserve the difference between:

| Search intent | Review note |
|---|---|
| Chinese dumplings | Preserve Chinese cuisine context. |
| Singapore dumpling soup | Preserve Singapore/local soup context. |
| Japanese gyoza | Use the recognised Japanese term and preserve Japanese context. |
| Korean mandu | Preserve Korean cuisine context; do not convert into Japanese gyoza. |

### Gyoza

Gyoza is a Japanese-recognised dish term.

In Japanese localisation, use the natural Japanese form, but still keep the example useful as a search query.

### Mandu

Mandu should remain recognisable as Korean food.

A Japanese explanation may be added if needed, but it should not be treated as the same as gyoza.

### Singapore dumpling soup

This needs special review.

The translation should preserve that the user may mean a Singapore/local soup context, not a generic dumpling dish.

## Singapore-specific food and place terms

### Hawker centre

Do not translate only as a generic food court if that loses the Singapore meaning.

Acceptable strategy:

```text
Use a Japanese explanation for Singapore hawker centre, while preserving Singapore context.
```

The manual phrase **Singapore Hawker Centres & Food Centres** should remain clearly Singapore-specific.

### Peranakan

Preserve Peranakan as a cultural/cuisine identity.

A Japanese explanation may be added if needed, but do not replace it with a broad Southeast Asian category.

### Banana leaf rice

Translate carefully as a dish/meal style.

Do not translate it only as separate words for banana, leaf, and rice if that loses the recognised food meaning.

### Laksa, satay, claypot rice

These are food terms requiring recognition review.

Where common Japanese transliterations or explanations exist, use the form that best preserves user recognition and search intent.

## Practical meal terms

### Set meal

Translate by menu usage, not literally.

Do not imply that every result has a confirmed set meal.

Keep the same caution used in the English master:

```text
Soleat can help with this kind of practical search where available.
```

### Quick lunch, solo dinner, late supper

Translate these by eating situation, not merely word-for-word.

The search intent is practical planning.

### Food trail

If a direct translation sounds unnatural, use a phrase meaning multi-stop food plan, food route, or eating itinerary.

## Caution phrases

Keep the intent of these phrases clear:

| English phrase | Translation intent |
|---|---|
| where available | Depends on region, data, or supported feature. |
| may show | Possible, not guaranteed. |
| decision aid | Helps decide; not a guarantee. |
| verify before going | User should confirm critical details before acting. |
| request removal | Do not overpromise immediate or absolute data erasure. |

## Example handling

### Original English example

```text
Chinese dumplings near Chinatown
Japanese gyoza near Orchard
Singapore dumpling soup near Bugis
Korean mandu near Tanjong Pagar
```

### Japanese localisation goal

The translated examples should still show four different food intents.

Do not produce four examples that all look like the same generic dumpling or gyoza search.

## Before Japanese translation begins

Review and decide:

- preferred Japanese term for Soleat Menu;
- preferred Japanese term for Cuisine Search;
- preferred Japanese term for Eatery Card;
- preferred Japanese term for Sketchbook / Clipboard;
- preferred Japanese treatment for hawker centre;
- how to represent non-Japanese Asian dish names;
- how to keep search examples compact enough for the manual and TMA help.
