# IDX Agent — Weeks 0–3

```bash
npm install
cp .env.example .env     # fill in real values
npm test                 # parser + SQL-builder tests (no DB needed)
npm run verify           # Week 0 checker (needs MySQL + .env)
npm run demo -- "3-bedroom condos in Irvine under $1.5M with a pool"
```

## Week 0 checklist (things only you can do on your machine)
- [ ] `git clone https://github.com/openclaw/openclaw.git && cd openclaw && npm install && openclaw onboard`
- [ ] `python3 -m venv venv && source venv/bin/activate && pip install pandas openai mysql-connector-python sqlalchemy scikit-learn numpy`
- [ ] `mysql -u root -p -e "CREATE DATABASE idx_exchange CHARACTER SET utf8mb4;"`
- [ ] Import `rets_property.sql`, then `california_sold.sql` (FULLTEXT build is slow — wait)
- [ ] Create a least-privilege user:
      `CREATE USER 'idx_user'@'localhost' IDENTIFIED BY '...'; GRANT SELECT ON idx_exchange.* TO 'idx_user'@'localhost';`
- [ ] Fill `.env`, run `npm run verify`
- [ ] `openclaw channels login --channel whatsapp`, scan QR (WhatsApp → Linked Devices), send a test message
- [ ] Gmail: use an **App Password** (needs 2-Step Verification), not your real password

## Deliverables map
| Week | Deliverable | File |
|---|---|---|
| 0 | Env verified | `npm run verify` output + WhatsApp screenshot |
| 1 | Architecture doc + diagram | `docs/ARCHITECTURE.md` |
| 2 | Parser skill, ≥10 test queries | `src/parser.ts`, `tests/parser.test.ts` (14) |
| 3 | DB skill returning property cards | `src/search.ts`, `src/format.ts`, `src/skill.ts` |
