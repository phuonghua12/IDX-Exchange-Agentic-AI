---
name: mls-property-search
description: Search active MLS listings (rets_property) and recent sold comps (california_sold) from a natural-language message such as "3-bedroom condos in Irvine under $1.5M with a pool" or "sold homes in Pasadena".
---

# MLS Property Search

Use when the user asks to find, browse, or compare California properties, or asks for recently sold comps.

Implementation lives in this repo:
- `src/parser.ts`  — `parsePropertyQuery(message)` → structured filters (Week 2)
- `src/search.ts`  — parameterized MySQL queries + pagination (Week 3)
- `src/skill.ts`   — `handlePropertySearch(message, { page })` → WhatsApp-ready text cards

Rules: never build SQL by string concatenation; if no filter is detected, ask the user what they want
instead of dumping the table; the user saying "more" means call again with `page + 1`.
