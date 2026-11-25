#!/usr/bin/env node
/**
 * Turn a password into the scrypt digest that ADMIN_PASS_n expects.
 *
 *   node scripts/hash-password.mjs
 *
 * The password is read from a hidden prompt, so it never reaches your shell
 * history, the process list, or a log. Paste only the printed digest into .env.
 */

import crypto from "node:crypto";
import readline from "node:readline";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const MAX_MEM = 64 * 1024 * 1024;

function hash(password) {
  const salt = crypto.randomBytes(16);
  const digest = crypto.scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEM,
  });
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), digest.toString("base64url")].join(":");
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      // Repaint the prompt without the typed characters.
      if (["\n", "\r", "\u0004"].includes(String(char))) return;
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(question);
    };
    process.stdin.on("data", onData);
    rl.question(question, (answer) => {
      process.stdin.removeListener("data", onData);
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await askHidden("New admin password: ");
if (password.trim().length < 12) {
  console.error("\nRefusing: use at least 12 characters. This is the only thing between the internet and your admin panel.");
  process.exit(1);
}
const confirm = await askHidden("Confirm password: ");
if (password !== confirm) {
  console.error("\nPasswords did not match.");
  process.exit(1);
}

console.log("\nPut this in .env as the ADMIN_PASS_n value:\n");
console.log(hash(password));
console.log("\nThen rebuild is NOT needed — restart is enough:  sudo systemctl restart zenox");
