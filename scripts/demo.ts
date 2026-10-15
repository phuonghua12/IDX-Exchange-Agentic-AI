// Week 3 demo:  npm run demo -- "3-bedroom condos in Irvine under $1.5M with a pool"
import { handlePropertySearch } from "../src/skill.ts";
import { closePool } from "../src/db.ts";
const q = process.argv.slice(2).join(" ") || "3-bedroom condos in Irvine under $1.5M with a pool";
const r = await handlePropertySearch(q);
console.log("Filters:", r.filters, "\n\n" + r.text);
await closePool();
