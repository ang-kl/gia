# Chinese Food-Term Review Notes

Status: `draft-review-notes`

These notes are for future Chinese localisation of the Soleat User Manual. They are not translated manual content yet.

## Core principle

Translate food-search intent, not only English words.

Chinese localisation should preserve:

- cuisine context;
- local Singapore food usage;
- native-script recognition;
- dish identity;
- search usefulness;
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

Do not flatten all dumpling examples into one Chinese term.

The English manual uses dumpling to show why food terms need context. Chinese localisation should preserve the difference between:

| Search intent | Review note |
|---|---|
| Chinese dumplings | Use an appropriate Chinese food term depending on the intended dish family. |
| Singapore dumpling soup | Preserve Singapore/local soup context; do not treat it as generic dumplings only. |
| Japanese gyoza | Preserve Japanese cuisine context; consider using the recognised Chinese/Japanese-script form. |
| Korean mandu | Preserve Korean cuisine context; do not convert into a Chinese dumpling by default. |

### Gyoza

Gyoza should remain recognisable as Japanese food.

A Chinese translation may include a Chinese description, but the search example should not lose the Japanese context.

### Mandu

Mandu should remain recognisable as Korean food.

A Chinese translation may include a Chinese description, but the search example should not collapse it into a generic dumpling term.

### Singapore dumpling soup

This needs special review.

The translation should preserve that the user may mean a Singapore/local dish or hawker-style soup context, not simply dumplings in soup.

## Singapore-specific food and place terms

### Hawker centre

Do not translate only as a generic food court if that loses the Singapore meaning.

Acceptable strategy:

```text
Use a Chinese term for hawker centre, with Singapore context retained.
```

The manual phrase **Singapore Hawker Centres & Food Centres** should remain clearly Singapore-specific.

### Peranakan

Preserve Peranakan as a cultural/cuisine identity.

A Chinese explanation may be added if needed, but do not replace it with a broad Chinese, Malay, or Southeast Asian category.

### Banana leaf rice

Translate carefully as a dish/meal style, not as separate banana + leaf + rice words.

### Laksa, satay, claypot rice

These are food terms requiring recognition review.

Where common Chinese forms exist, use recognised food names and preserve cuisine context.

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

If a direct translation sounds unnatural, use a phrase meaning multi-stop food plan or food route.

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

### Chinese localisation goal

The translated examples should still show four different food intents.

Do not produce four examples that all look like the same generic dumpling search.

## Before Chinese translation begins

Review and decide:

- preferred Chinese term for Soleat Menu;
- preferred Chinese term for Cuisine Search;
- preferred Chinese term for Eatery Card;
- preferred Chinese term for Sketchbook / Clipboard;
- preferred Chinese treatment for hawker centre;
- native-script treatment for Japanese and Korean dish examples;
- how to keep search examples compact enough for the manual and TMA help.
