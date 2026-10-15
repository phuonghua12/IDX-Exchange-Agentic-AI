// Week 0 checker:  npm run verify
import "dotenv/config";
import { query, closePool } from "../src/db.ts";

const ok = (m: string) => console.log(`✅ ${m}`);
const bad = (m: string) => { console.log(`❌ ${m}`); process.exitCode = 1; };

const required = ["OPENAI_API_KEY", "MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "EMAIL_USER", "EMAIL_PASSWORD"];
for (const k of required) (process.env[k] && !/^(sk-\.\.\.|your_)/.test(process.env[k]!)) ? ok(`env ${k} set`) : bad(`env ${k} missing or still a placeholder`);

try {
  const [c] = await query<{ a: number; s: number }>("SELECT (SELECT COUNT(*) FROM rets_property) AS a, (SELECT COUNT(*) FROM california_sold) AS s");
  ok(`MySQL connected: rets_property=${c.a.toLocaleString()} rows, california_sold=${c.s.toLocaleString()} rows (handbook says ~667k total)`);
  const idx = await query<{ Index_type: string; Key_name: string }>("SHOW INDEX FROM rets_property WHERE Column_name = 'L_Remarks'");
  idx.some((i) => i.Index_type === "FULLTEXT") ? ok("FULLTEXT index on L_Remarks present") : bad("FULLTEXT index on L_Remarks missing");
  const t = await query<{ L_Type_: string; n: number }>("SELECT L_Type_, COUNT(*) AS n FROM rets_property WHERE L_Status='Active' GROUP BY L_Type_ ORDER BY n DESC LIMIT 15");
  console.log("\nActual L_Type_ values (make sure parser TYPE_MAP matches these):"); t.forEach((r) => console.log(`   ${r.L_Type_}  (${r.n})`));
  const d = await query<{ lo: string; hi: string }>("SELECT MIN(CloseDate) AS lo, MAX(CloseDate) AS hi FROM california_sold WHERE CloseDate <> ''");
  console.log(`\ncalifornia_sold CloseDate range: ${d[0].lo} → ${d[0].hi}`);
} catch (e: any) { bad(`MySQL: ${e.message}`); }

if (process.env.OPENAI_API_KEY) {
  const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });
  r.ok ? ok("OpenAI key works") : bad(`OpenAI key rejected (HTTP ${r.status})`);
}
await closePool();
console.log("\nStill manual: `openclaw channels login --channel whatsapp`, then send yourself a test message.");
