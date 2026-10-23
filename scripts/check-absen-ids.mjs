// self-check: api/absen.js ids == src/lib/utils.ts ids
import { sessionIdFrom, recordIdFrom } from "../api/absen.js";
import assert from "node:assert";
import { execSync } from "node:child_process";
const ts = execSync(`npx -y tsx -e 'import {sessionIdFrom,recordIdFrom} from "./src/lib/utils.ts"; console.log(JSON.stringify([sessionIdFrom(1786337899986,"2026-09-23"), recordIdFrom(123456789,42)]))'`).toString().trim();
const [a,b]=JSON.parse(ts.split("\n").pop());
assert.equal(sessionIdFrom(1786337899986,"2026-09-23"), a);
assert.equal(recordIdFrom(123456789,42), b);
console.log("ids match", a, b);
