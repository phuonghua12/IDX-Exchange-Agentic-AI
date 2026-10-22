// Week 4 terminal chat (stand-in for WhatsApp):  npm run chat
import readline from "node:readline";
import { handleMessage } from "../src/conversation.ts";
import { closePool } from "../src/db.ts";

const rl = readline.createInterface({ input: process.stdin });
console.log('IDX agent ready. Try: "Find homes in Irvine".  Type "exit" to quit.\n');
const userId = "terminal-user";
process.stdout.write("you > ");
for await (const line of rl) {
  if (/^\s*(exit|quit)\s*$/i.test(line)) break;
  console.log(`\nagent > ${await handleMessage(userId, line)}\n`);
  process.stdout.write("you > ");
}
rl.close(); await closePool();
