import assert from "node:assert/strict";
import { approveSpend } from "./spend_cap_service.js";

assert.equal(approveSpend(90, 10, 100), true);
assert.equal(approveSpend(90, 10.01, 100), false);
console.log("spend cap decision checks passed");
