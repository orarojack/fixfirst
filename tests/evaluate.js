// FixFirst model check. Run from the project folder:  node tests/evaluate.js
// No packages needed. Exits with code 1 if any check fails.
const path = require("path");
const D = require(path.join(__dirname, "..", "js", "data.js"));
const AI = require(path.join(__dirname, "..", "js", "classifier.js"));

let failures = 0;
function check(ok, label) {
  console.log((ok ? "  PASS  " : "  FAIL  ") + label);
  if (!ok) failures++;
}
const example = (label) => D.EXAMPLES.find((e) => e.label === label);

// 1. Leave-one-out accuracy of the Naive Bayes classifier
const ev = AI.evaluate(D.TRAINING);
console.log(`\nProblem-type classifier (Naive Bayes, leave-one-out on ${ev.n} sentences): ${(ev.accuracy * 100).toFixed(1)}%`);
for (const c of D.CATEGORIES) {
  const p = ev.per[c.id];
  console.log(`  ${c.name.padEnd(24)} ${String(p.ok).padStart(2)}/${p.n}  ${((p.ok / p.n) * 100).toFixed(0)}%`);
}
check(ev.accuracy >= 0.8, "accuracy is at least 80%");

// 2. Demo reports and examples land in the right category
const model = new AI.NaiveBayes(1).train(D.TRAINING);
const typeOf = (e) => model.predict(e.text, AI.placeWords(e.location)).top.label;
console.log("\nProblem types");
for (const d of D.DEMO_REPORTS) check(typeOf(d) === d.category, `${d.category.padEnd(8)} ${d.text.slice(0, 60)}...`);
check(typeOf(example("Broken water point")) === "water", "broken water point -> Water & sewage");
check(typeOf(example("Pothole at the market")) === "roads", "pothole -> Roads & transport");
check(typeOf(example("Flooded road")) === "drainage", "flooded road -> Drainage & flooding");

// 3. Urgency scoring
console.log("\nUrgency");
const wires = example("Sparking wires");
const u = AI.scoreUrgency(wires.text, "power", D);
check(u.level === "critical", `sparking wires near a school is Critical (score ${u.score}: ${u.reasons.join(", ")})`);
const water = AI.scoreUrgency(example("Broken water point").text, "water", D);
check(water.level === "moderate", `broken water point is Moderate (score ${water.score}: ${water.reasons.join(", ")})`);
const tree = D.DEMO_REPORTS[10];
check(AI.scoreUrgency(tree.text, tree.category, D).level === "low", "a fallen branch on a footpath is Low");

// 4. Duplicate detection, with map pins and with place names only
console.log("\nDuplicate detection");
const center = D.COMMUNITY.center;
const now = Date.now();
const reports = D.DEMO_REPORTS.map((d, i) => ({
  id: i + 1, text: d.text, location: d.location, category: d.category, status: d.status,
  confirmations: d.confirmations, createdAt: new Date(now - d.daysAgo * 864e5).toISOString(),
  urgency: AI.scoreUrgency(d.text, d.category, D), point: AI.offsetPoint(center, d.at)
}));
function dupes(e, usePin) {
  const opts = { category: typeOf(e) };
  if (usePin) { opts.point = AI.offsetPoint(center, e.at); opts.pointOf = (r) => r.point; }
  return AI.findSimilar(e.text, e.location, reports, opts);
}
const pothole = dupes(example("Pothole at the market"), true);
check(pothole.length > 0 && pothole[0].report.id === 1,
  `new pothole report matches the Main Street pothole (${pothole[0] ? Math.round(pothole[0].distance) + " m away, " + Math.round(pothole[0].similarity * 100) + "% match" : "no match"})`);
check(dupes(example("Pothole at the market"), false)[0]?.report.id === 1, "...and still matches using place names when there is no pin");
check(dupes(example("Broken water point"), true).length === 0, "broken water point is new (no duplicate)");
check(dupes(wires, true).length === 0, "sparking wires report is new (no duplicate)");
check(dupes(example("Flooded road"), true).length === 0, "a different problem 40 m away is not a duplicate");
check(Math.abs(AI.distanceMeters([0, 0], [0, 0.001]) - 111.2) < 1, "distance maths: 0.001 degrees of longitude at the equator is about 111 m");

// 5. Ranking: critical issues go first
const fresh = { createdAt: new Date(now).toISOString(), confirmations: 1, urgency: u };
const p = AI.priority(fresh, now);
check(p.critical === true && p.total > 0, `new critical report gets score ${p.total}/100 and is pinned to the top`);

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
