/*
 * FixFirst · classifier.js
 * All the "AI" in FixFirst, written from scratch with no libraries:
 *   - tokenize():      cleans text into word stems + word pairs
 *   - NaiveBayes:      multinomial Naive Bayes text classifier (category)
 *   - scoreUrgency():  explainable 0-10 risk score from urgency signals
 *   - findSimilar():   duplicate detection: TF-IDF + cosine similarity + map distance
 *   - priority():      the 0-100 FixFirst score used to rank the board
 *   - evaluate():      leave-one-out accuracy of the classifier
 * Runs in the browser and in Node (see tests/evaluate.js).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FixFirstAI = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STOPWORDS = new Set((
    "a an the and or but if then so of to in on at by for with from into onto over under near " +
    "is are was were be been being am it its it's this that these those there here our we us you your " +
    "they them their he she his her i me my has have had do does did not no very too also just as up " +
    "down out about after before every each all any some more most such than can could would should " +
    "will may might must again still please been get gets got one two three like really now"
  ).split(" "));

  // Words that mean the same thing for our purposes.
  const SYNONYMS = {
    rubbish: "garbage", trash: "garbage", streetlamp: "streetlight", lamp: "light",
    kid: "child", children: "child", pupil: "child", pothol: "pothole", latrine: "toilet",
    blackout: "outage", tyre: "tire", footpath: "sidewalk", pavement: "sidewalk", walkway: "sidewalk"
  };

  // Tiny suffix-stripping stemmer: leaking / leaked / leaks -> leak
  function stem(word) {
    let w = word;
    if (w.length <= 3) return w;
    if (w.length === 4) return /[^su]s$/.test(w) && !/is$/.test(w) ? w.slice(0, -1) : w; // kids -> kid
    if (w.endsWith("ies") && w.length > 5) w = w.slice(0, -3) + "y";
    else if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
    else if (w.endsWith("ed") && w.length > 4 && !w.endsWith("eed")) w = w.slice(0, -2); // but keep speed, need
    else if (w.endsWith("oes")) w = w.slice(0, -2);
    else if (/(ch|sh|x|ss|z)es$/.test(w)) w = w.slice(0, -2);
    else if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
    if (/([^aeiouls])\1$/.test(w)) w = w.slice(0, -1); // dripp -> drip, stopp -> stop
    return w;
  }

  function words(text) {
    const clean = String(text || "").toLowerCase()
      .replace(/street\s+lights?/g, "streetlight")
      .replace(/street\s+lamps?/g, "streetlight")
      .replace(/[^a-z0-9\s]/g, " ");
    return clean.split(/\s+/)
      .filter(function (w) { return w && !STOPWORDS.has(w) && !/^\d+$/.test(w); })
      .map(function (w) { const s = stem(w); return SYNONYMS[s] || SYNONYMS[w] || s; })
      .filter(function (w) { return w.length > 1; });
  }

  // Word stems plus neighbouring word pairs ("main_street", "water_pipe").
  // `exclude` (optional) is a Set of stems to leave out, e.g. the words of a place name.
  function tokenize(text, exclude) {
    const w = exclude ? words(text).filter(function (t) { return !exclude.has(t); }) : words(text);
    const out = w.slice();
    for (let i = 0; i < w.length - 1; i++) out.push(w[i] + "_" + w[i + 1]);
    return out;
  }

  /* ---------------- Multinomial Naive Bayes ---------------- */
  function NaiveBayes(alpha) {
    this.alpha = alpha == null ? 1 : alpha;
    this.reset();
  }
  NaiveBayes.prototype.reset = function () {
    this.n = 0;               // number of training examples
    this.classCounts = {};    // examples per class
    this.tokenCounts = {};    // class -> token -> count
    this.totalTokens = {};    // class -> total tokens
    this.vocab = {};          // token -> total count across classes
    this.V = 0;               // vocabulary size
    return this;
  };
  NaiveBayes.prototype.train = function (examples) {
    this.reset();
    for (const ex of examples) this.add(ex.text, ex.label);
    return this;
  };
  NaiveBayes.prototype.add = function (text, label, sign) {
    const s = sign || 1;
    const toks = tokenize(text);
    this.n += s;
    this.classCounts[label] = (this.classCounts[label] || 0) + s;
    const tc = this.tokenCounts[label] || (this.tokenCounts[label] = {});
    for (const t of toks) {
      tc[t] = (tc[t] || 0) + s;
      const before = this.vocab[t] || 0;
      const after = before + s;
      if (before <= 0 && after > 0) this.V++;
      if (before > 0 && after <= 0) this.V--;
      this.vocab[t] = after;
    }
    this.totalTokens[label] = (this.totalTokens[label] || 0) + s * toks.length;
  };
  NaiveBayes.prototype.remove = function (text, label) { this.add(text, label, -1); };

  // Returns every class ranked by probability, plus how many words the model recognised.
  // `exclude` (optional): stems to ignore, e.g. place-name words, so "Hospital Road" doesn't
  // pull a streetlight report into the roads category.
  NaiveBayes.prototype.predict = function (text, exclude) {
    const self = this;
    const toks = tokenize(text, exclude).filter(function (t) { return self.vocab[t] > 0; });
    const labels = Object.keys(this.classCounts).filter(function (c) { return self.classCounts[c] > 0; });
    const scores = labels.map(function (c) {
      let score = Math.log(self.classCounts[c] / self.n);
      const tc = self.tokenCounts[c];
      const denom = self.totalTokens[c] + self.alpha * self.V;
      for (const t of toks) score += Math.log(((tc[t] || 0) + self.alpha) / denom);
      return score;
    });
    // Naive Bayes is famously over-confident; a gentle temperature keeps the displayed
    // probabilities honest without changing which class wins.
    const T = 1 + 0.12 * toks.length;
    const max = Math.max.apply(null, scores);
    const exps = scores.map(function (s) { return Math.exp((s - max) / T); });
    const sum = exps.reduce(function (a, b) { return a + b; }, 0);
    const ranked = labels
      .map(function (c, i) { return { label: c, prob: exps[i] / sum }; })
      .sort(function (a, b) { return b.prob - a.prob; });
    return { ranked: ranked, top: ranked[0], known: toks.length };
  };

  // The single words that most strongly point to a class (log-odds vs. all other classes).
  NaiveBayes.prototype.topTerms = function (label, k) {
    const a = this.alpha, V = this.V;
    const tc = this.tokenCounts[label] || {};
    const inTotal = this.totalTokens[label] || 0;
    const out = {};
    let outTotal = 0;
    for (const c in this.tokenCounts) {
      if (c === label) continue;
      outTotal += this.totalTokens[c];
      for (const t in this.tokenCounts[c]) out[t] = (out[t] || 0) + this.tokenCounts[c][t];
    }
    return Object.keys(tc)
      .filter(function (t) { return tc[t] >= 2 && t.indexOf("_") === -1; })
      .map(function (t) {
        return { term: t, score: Math.log((tc[t] + a) / (inTotal + a * V)) - Math.log(((out[t] || 0) + a) / (outTotal + a * V)) };
      })
      .sort(function (x, y) { return y.score - x.score; })
      .slice(0, k || 6)
      .map(function (x) { return x.term; });
  };

  // Leave-one-out evaluation: hide each example, retrain without it, test on it.
  function evaluate(examples, alpha) {
    const nb = new NaiveBayes(alpha).train(examples);
    const per = {};
    let correct = 0;
    for (const ex of examples) {
      nb.remove(ex.text, ex.label);
      const guess = nb.predict(ex.text).top.label;
      nb.add(ex.text, ex.label);
      per[ex.label] = per[ex.label] || { n: 0, ok: 0 };
      per[ex.label].n++;
      if (guess === ex.label) { correct++; per[ex.label].ok++; }
    }
    return { accuracy: examples.length ? correct / examples.length : 0, n: examples.length, per: per };
  }

  /* ---------------- Urgency ---------------- */
  function scoreUrgency(text, categoryId, data) {
    const cat = data.CATEGORIES.find(function (c) { return c.id === categoryId; });
    let score = cat ? cat.base : 1;
    const reasons = [];
    const t = String(text || "");
    for (const sig of data.URGENCY_SIGNALS) {
      if (sig.re.test(t)) { score += sig.w; reasons.push(sig.why); }
    }
    score = Math.min(10, Math.round(score * 10) / 10);
    const level = data.LEVELS.find(function (l) { return score >= l.min; }) || data.LEVELS[data.LEVELS.length - 1];
    return { score: score, level: level.id, label: level.name, reasons: reasons };
  }

  /* ---------------- Duplicate detection (TF-IDF + cosine) ---------------- */
  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const t in a) { na += a[t] * a[t]; if (b[t]) dot += a[t] * b[t]; }
    for (const t in b) nb += b[t] * b[t];
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }
  function placeWords(location) { return new Set(words(location)); }
  function jaccard(a, b) {
    let inter = 0;
    a.forEach(function (x) { if (b.has(x)) inter++; });
    const union = a.size + b.size - inter;
    return union ? inter / union : 0;
  }

  // Great-circle distance between two [lat, lng] points in metres (haversine formula).
  function distanceMeters(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
    const h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.pow(Math.sin(dLng / 2), 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  // Moves a [lat, lng] point by [metres east, metres north].
  function offsetPoint(center, at) {
    return [center[0] + at[1] / 111320, center[1] + at[0] / (111320 * Math.cos(center[0] * Math.PI / 180))];
  }

  // Compares a new report with every open report. Same place counts for a lot:
  // the same words at a different place are probably a different problem.
  function findSimilar(text, location, reports, opts) {
    const o = opts || {};
    const threshold = o.threshold == null ? 0.3 : o.threshold;
    const open = reports.filter(function (r) { return r.status !== "resolved"; });
    // Place names are compared separately, so they are removed from the text first:
    // text similarity should measure WHAT the problem is, place similarity WHERE it is.
    const qPlace = placeWords(location);
    const q = tokenize(text, qPlace);
    if (!open.length || q.length < 3) return [];
    // (If the new report has no location, compare full texts instead.)
    const docs = open.map(function (r) { return tokenize(r.text, qPlace.size ? placeWords(r.location) : null); });
    const all = docs.concat([q]);
    const df = {};
    for (const d of all) new Set(d).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
    const N = all.length;
    function vec(toks) {
      const v = {};
      for (const t of toks) v[t] = (v[t] || 0) + 1;
      for (const t in v) v[t] *= Math.log((N + 1) / (df[t] + 1)) + 1;
      return v;
    }
    const qv = vec(q);
    return open.map(function (r, i) {
      const textSim = cosine(qv, vec(docs[i]));
      // WHERE: map pins when both reports have one (within ~30 m = same spot), otherwise place names.
      const rPoint = o.point && o.pointOf ? o.pointOf(r) : null;
      let placeSim = null;
      let distance = null;
      if (o.point && rPoint) {
        distance = distanceMeters(o.point, rPoint);
        placeSim = distance <= 30 ? 1 : distance >= 250 ? 0 : 1 - (distance - 30) / 220;
      } else {
        const rPlace = placeWords(r.location);
        placeSim = qPlace.size && rPlace.size ? jaccard(qPlace, rPlace) : null;
      }
      const sameCategory = !!o.category && r.category === o.category;
      let sim;
      if (placeSim === null) {
        sim = textSim + (sameCategory ? 0.05 : 0);
      } else {
        // similar words matter less at a different place; the same place + same kind of problem is a strong hint
        sim = textSim * (0.5 + 0.5 * placeSim) + 0.25 * placeSim * (sameCategory ? 1 : 0.3);
      }
      return { report: r, similarity: Math.min(1, sim), textSim: textSim, placeSim: placeSim, distance: distance };
    })
      .filter(function (x) { return x.similarity >= threshold; })
      .sort(function (a, b) { return b.similarity - a.similarity; })
      .slice(0, o.limit || 3);
  }

  /* ---------------- FixFirst priority score (0-100) ---------------- */
  // urgency up to 70 + community support up to 20 + time waiting up to 10
  function priority(report, now) {
    const days = Math.max(0, ((now || Date.now()) - Date.parse(report.createdAt)) / 86400000);
    const urgency = report.urgency.score * 7;
    const support = Math.min(20, 6 * Math.log2(1 + report.confirmations));
    const waiting = Math.min(10, days * 0.5);
    return {
      total: Math.round(urgency + support + waiting),
      urgency: urgency, support: support, waiting: waiting, days: days,
      critical: report.urgency.level === "critical"
    };
  }

  return {
    tokenize: tokenize, words: words, stem: stem, placeWords: placeWords,
    distanceMeters: distanceMeters, offsetPoint: offsetPoint,
    NaiveBayes: NaiveBayes, evaluate: evaluate,
    scoreUrgency: scoreUrgency, findSimilar: findSimilar, priority: priority
  };
});
