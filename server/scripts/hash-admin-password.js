import { hashPassword } from "../lib/auth.js";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error("Usage: npm run hash-admin-password -- <password-with-at-least-8-characters>");
  process.exit(1);
}

console.log(await hashPassword(password));
