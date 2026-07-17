// src/renderer/features/warn/thresholds.ts
var WARN_THRESHOLDS = {
  conflict: { ageMin: 55, equityRatioMax: 0.4 },
  deviation: { totalExpenseRatioMax: 1, bucketRatioTolerance: 0.1 }
};

// src/renderer/features/warn/conflict.ts
var EQUITY_BUCKET_KEYS = ["equity", "stock", "index", "satellite", "grow"];
var EQUITY_LABEL_RE = /权益|股票|指数|进取|生钱/;
function getEquityRatio(profile, rule) {
  if (rule.id === "100-age") {
    const age = profile.age ?? 0;
    return Math.max(0, Math.min(1, (100 - age) / 100));
  }
  const total = rule.allocations.reduce((s, a) => s + (a.pct || 0), 0);
  if (total <= 0) return 0;
  const equity = rule.allocations.filter((a) => EQUITY_BUCKET_KEYS.includes(a.bucketKey) || EQUITY_LABEL_RE.test(a.label)).reduce((s, a) => s + (a.pct || 0), 0);
  return Math.round(equity / total * 100) / 100;
}
function detectConflict(profile, rule, thresholds = WARN_THRESHOLDS) {
  const age = profile.age ?? 0;
  if (age < thresholds.conflict.ageMin) return null;
  const ratio = getEquityRatio(profile, rule);
  if (ratio <= thresholds.conflict.equityRatioMax) return null;
  return {
    id: `conflict-${rule.id}`,
    severity: "danger",
    title: "\u6743\u76CA\u914D\u7F6E\u4E0E\u5E74\u9F84\u4E0D\u5339\u914D",
    message: `\u60A8\u5F53\u524D ${age} \u5C81\uFF0C\u6CD5\u5219\u300C${rule.name}\u300D\u7684\u6743\u76CA\u7C7B\u5360\u6BD4\u7EA6 ${Math.round(ratio * 100)}%\uFF0C\u9AD8\u4E8E ${Math.round(
      thresholds.conflict.equityRatioMax * 100
    )}% \u7684\u5EFA\u8BAE\u4E0A\u9650\u3002\u4E34\u8FD1\u9000\u4F11\u9636\u6BB5\u5EFA\u8BAE\u964D\u4F4E\u6CE2\u52A8\u98CE\u9669\u3002`,
    ruleId: rule.id
  };
}

// src/renderer/@core/domain/user.ts
function totalMonthlyDebt(p) {
  return p.debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);
}
function totalMonthlyIncome(p) {
  return p.monthlyIncome + p.incomeAnnualBonus / 12 + p.incomeOther;
}
function monthlyDisposable(p) {
  return totalMonthlyIncome(p) - p.fixedExpenses - p.variableExpenses - totalMonthlyDebt(p);
}
function createEmptyProfile(id) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id,
    age: 0,
    monthlyIncome: 0,
    incomeAnnualBonus: 0,
    incomeOther: 0,
    currentSavings: 0,
    debts: [],
    fixedExpenses: 0,
    variableExpenses: 0,
    goals: [],
    riskProfile: "balanced",
    insurance: { hasBasic: false, hasCriticalIllness: false, hasAccident: false },
    investHorizonMonths: 120,
    createdAt: now,
    updatedAt: now
  };
}

// src/renderer/features/warn/deviation.ts
var ALLOC_CONCENTRATION_CAP = 70;
function detectOverspend(profile, thresholds = WARN_THRESHOLDS) {
  const income = totalMonthlyIncome(profile);
  if (income <= 0) return null;
  const expenseRatio = (profile.fixedExpenses + profile.variableExpenses) / income;
  if (expenseRatio <= thresholds.deviation.totalExpenseRatioMax) return null;
  return {
    id: "deviation-overspend",
    severity: "warning",
    title: "\u652F\u51FA\u8D85\u8FC7\u6536\u5165",
    message: `\u56FA\u5B9A+\u53D8\u52A8\u652F\u51FA\u7EA6\u5360\u6708\u6536\u5165\u7684 ${Math.round(expenseRatio * 100)}%\uFF0C\u5DF2\u8D85\u8FC7 100%\u3002\u5EFA\u8BAE\u538B\u7F29\u975E\u5FC5\u8981\u652F\u51FA\u6216\u589E\u52A0\u6536\u5165\u3002`,
    ruleId: ""
  };
}
function detectDeviation(profile, rule, thresholds = WARN_THRESHOLDS) {
  const out = [];
  const over = detectOverspend(profile, thresholds);
  if (over) out.push({ ...over, ruleId: rule.id });
  for (const a of rule.allocations) {
    if (a.pct > ALLOC_CONCENTRATION_CAP) {
      out.push({
        id: `deviation-concentration-${a.bucketKey}`,
        severity: "warning",
        title: "\u5355\u6876\u5360\u6BD4\u504F\u9AD8",
        message: `\u300C${a.label}\u300D\u5360\u6708\u6536\u5165 ${a.pct}%\uFF0C\u6BD4\u4F8B\u504F\u9AD8\uFF0C\u5EFA\u8BAE\u7ED3\u5408\u5176\u4ED6\u6CD5\u5219\u5206\u6563\u914D\u7F6E\u3002`,
        bucketKey: a.bucketKey,
        ruleId: rule.id
      });
    }
  }
  return out;
}

// src/renderer/features/budget/engine.ts
function applyRule(profile, rule) {
  const base = totalMonthlyIncome(profile);
  return rule.allocations.map((a) => ({
    id: `${rule.id}-${a.bucketKey}`,
    ruleId: rule.id,
    name: a.label,
    color: a.color,
    monthlyAmount: Math.round(base * a.pct / 100),
    note: `${a.pct}% \xB7 ${rule.name}`
  }));
}
function compoundSeries(monthlyInvest, annualRate, months) {
  const r = annualRate / 12;
  const pts = [];
  let value = 0;
  for (let m = 0; m <= months; m++) {
    if (m > 0) value = value * (1 + r) + monthlyInvest;
    pts.push({ month: m, value: Math.round(value) });
  }
  return pts;
}

// src/renderer/features/plan/metrics.ts
function annualRateFor(risk) {
  if (risk === "aggressive") return 0.07;
  if (risk === "conservative") return 0.03;
  return 0.05;
}
function buildPlanView(profile, rule) {
  const buckets = applyRule(profile, rule);
  const totalMonthly = buckets.reduce((s, b) => s + b.monthlyAmount, 0);
  const monthlySave = Math.max(0, monthlyDisposable(profile));
  const months = Math.max(1, profile.investHorizonMonths || 120);
  const series = compoundSeries(monthlySave, annualRateFor(profile.riskProfile), months);
  const futureValue = series.length ? series[series.length - 1].value : 0;
  const reachMonths = computeEmergencyFundReachMonths(profile, monthlyDisposable(profile));
  const equityRatio = getEquityRatio(profile, rule);
  return { buckets, totalMonthly, futureValue, reachMonths, equityRatio };
}
function computeEmergencyFundReachMonths(profile, monthlySave) {
  const target = 3 * (profile.fixedExpenses || 0);
  const remaining = Math.max(0, target - (profile.currentSavings || 0));
  if (remaining <= 0) return 0;
  if (monthlySave <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(remaining / monthlySave);
}

// src/renderer/features/review/reviewRules.ts
var REVIEW_RULES = [
  {
    id: "emergency-fund",
    tag: "\u5E94\u6025\u91D1\u4E0D\u8DB3",
    test: (ctx) => ctx.health.emergencyMultiple < 3 ? { tag: "\u5E94\u6025\u91D1\u4E0D\u8DB3", text: `\u5E94\u6025\u91D1\u4EC5 ${ctx.health.emergencyMultiple} \u500D\u6708\u56FA\u5B9A\u652F\u51FA\uFF0C\u5EFA\u8BAE\u5148\u8865\u8DB3\u81F3 3 \u500D\u518D\u52A0\u5927\u6295\u8D44\u3002` } : null
  },
  {
    id: "overspend",
    tag: "\u652F\u51FA\u8D85\u6536\u5165",
    test: (ctx) => {
      const income = ctx.profile.monthlyIncome + ctx.profile.incomeAnnualBonus / 12 + ctx.profile.incomeOther;
      const expense = ctx.profile.fixedExpenses + ctx.profile.variableExpenses;
      if (income > 0 && expense / income > 1) {
        return { tag: "\u652F\u51FA\u8D85\u6536\u5165", text: "\u56FA\u5B9A+\u53D8\u52A8\u652F\u51FA\u5DF2\u8D85\u8FC7\u6708\u6536\u5165\uFF0C\u6301\u7EED\u900F\u652F\u4F1A\u4FB5\u8680\u590D\u5229\u672C\u91D1\uFF0C\u5EFA\u8BAE\u5148\u63A7\u652F\u51FA\u3002" };
      }
      return null;
    }
  },
  {
    id: "equity-high",
    tag: "\u6743\u76CA\u5360\u6BD4\u504F\u9AD8",
    test: (ctx) => ctx.plan.equityRatio > 0.4 && ctx.profile.riskProfile === "conservative" ? { tag: "\u6743\u76CA\u5360\u6BD4\u504F\u9AD8", text: `\u6743\u76CA\u7C7B\u5360\u6BD4\u7EA6 ${Math.round(ctx.plan.equityRatio * 100)}%\uFF0C\u4E0E\u4FDD\u5B88\u504F\u597D\u4E0D\u5339\u914D\uFF0C\u53EF\u8003\u8651\u4E0B\u8C03\u3002` } : null
  },
  {
    id: "health-low",
    tag: "\u6863\u6848\u5F85\u5B8C\u5584",
    test: (ctx) => ctx.health.score < 60 ? { tag: "\u6863\u6848\u5F85\u5B8C\u5584", text: `\u8D22\u52A1\u5065\u5EB7\u5206 ${ctx.health.score}\uFF0C\u8D44\u6599\u8D8A\u5B8C\u6574\uFF0C\u65B9\u6848\u8D8A\u8D34\u5408\uFF0C\u5EFA\u8BAE\u8865\u5168\u8BBE\u7F6E\u3002` } : null
  },
  {
    id: "no-goal",
    tag: "\u5EFA\u8BAE\u8BBE\u76EE\u6807",
    test: (ctx) => (ctx.profile.goals?.length ?? 0) === 0 ? { tag: "\u5EFA\u8BAE\u8BBE\u76EE\u6807", text: "\u5C1A\u672A\u8BBE\u5B9A\u4EFB\u4F55\u8D22\u52A1\u76EE\u6807\uFF0C\u7ED9\u65B9\u6848\u4E00\u4E2A\u660E\u786E\u7EC8\u70B9\u4F1A\u66F4\u597D\u575A\u6301\u3002" } : null
  },
  {
    id: "surplus-good",
    tag: "\u73B0\u91D1\u6D41\u5065\u5EB7",
    test: (ctx) => ctx.plan.totalMonthly > 0 && ctx.health.emergencyMultiple >= 3 ? { tag: "\u73B0\u91D1\u6D41\u5065\u5EB7", text: "\u6BCF\u6708\u6709\u6B63\u5411\u7ED3\u4F59\u4E14\u5E94\u6025\u91D1\u8FBE\u6807\uFF0C\u53EF\u7A33\u6B65\u6267\u884C\u8BE5\u65B9\u6848\u3002" } : null
  }
];
function buildReviews(ctx) {
  const hits = [];
  for (const rule of REVIEW_RULES) {
    const hit = rule.test(ctx);
    if (hit) hits.push(hit);
    if (hits.length >= 5) break;
  }
  return hits;
}

// src/renderer/@core/domain/rule.ts
var RULES = [
  {
    id: "4321",
    name: "4321 \u6CD5\u5219",
    description: "40% \u751F\u6D3B / 30% \u50A8\u84C4 / 20% \u6295\u8D44 / 10% \u4FDD\u9669",
    tags: ["\u5747\u8861", "\u5165\u95E8"],
    allocations: [
      { label: "\u751F\u6D3B\u5F00\u9500", pct: 40, bucketKey: "living", color: "#D4A857" },
      { label: "\u50A8\u84C4", pct: 30, bucketKey: "saving", color: "#5BA3A8" },
      { label: "\u6295\u8D44", pct: 20, bucketKey: "invest", color: "#C97B63" },
      { label: "\u4FDD\u9669", pct: 10, bucketKey: "insurance", color: "#8E7CC3" }
    ],
    applicability: (p) => p.riskProfile === "balanced" ? 90 : 70
  },
  {
    id: "sp-quadrant",
    name: "\u6807\u666E\u5BB6\u5EAD\u8D44\u4EA7\u8C61\u9650",
    description: "\u8981\u82B1\u7684\u94B1 / \u4FDD\u547D\u7684\u94B1 / \u751F\u94B1\u7684\u94B1 / \u4FDD\u672C\u7684\u94B1",
    tags: ["\u56DB\u8C61\u9650", "\u7A33\u5065"],
    allocations: [
      { label: "\u8981\u82B1\u7684\u94B1", pct: 10, bucketKey: "cash", color: "#D4A857" },
      { label: "\u4FDD\u547D\u7684\u94B1", pct: 20, bucketKey: "protect", color: "#8E7CC3" },
      { label: "\u751F\u94B1\u7684\u94B1", pct: 30, bucketKey: "grow", color: "#C97B63" },
      { label: "\u4FDD\u672C\u7684\u94B1", pct: 40, bucketKey: "safe", color: "#5BA3A8" }
    ],
    applicability: (p) => p.riskProfile === "conservative" ? 92 : 68
  },
  {
    id: "100-age",
    name: "100 \u2212 \u5E74\u9F84 \u6CD5\u5219",
    description: "\u6743\u76CA\u7C7B\u5360\u6BD4 \u2248 (100 \u2212 \u5E74\u9F84)%",
    tags: ["\u5E74\u9F84", "\u6743\u76CA"],
    allocations: [
      { label: "\u6743\u76CA\u7C7B", pct: 60, bucketKey: "equity", color: "#C97B63" },
      { label: "\u56FA\u6536\u7C7B", pct: 40, bucketKey: "bond", color: "#5BA3A8" }
    ],
    applicability: (p) => p.riskProfile === "aggressive" ? 88 : 60
  },
  {
    id: "50-30-20",
    name: "50/30/20 \u9884\u7B97\u6CD5",
    description: "50% \u5FC5\u9700 / 30% \u60F3\u8981 / 20% \u50A8\u84C4\u6295\u8D44",
    tags: ["\u9884\u7B97", "\u5165\u95E8"],
    allocations: [
      { label: "\u5FC5\u9700\u652F\u51FA", pct: 50, bucketKey: "need", color: "#D4A857" },
      { label: "\u60F3\u8981\u652F\u51FA", pct: 30, bucketKey: "want", color: "#C97B63" },
      { label: "\u50A8\u84C4\u6295\u8D44", pct: 20, bucketKey: "save", color: "#5BA3A8" }
    ],
    applicability: (p) => p.currentSavings < 5e4 ? 85 : 65
  },
  {
    id: "core-satellite",
    name: "\u6838\u5FC3-\u536B\u661F\u7B56\u7565",
    description: "\u6838\u5FC3 80% \u7A33\u5065 + \u536B\u661F 20% \u8FDB\u53D6",
    tags: ["\u7EC4\u5408", "\u8FDB\u9636"],
    allocations: [
      { label: "\u6838\u5FC3\u8D44\u4EA7", pct: 80, bucketKey: "core", color: "#5BA3A8" },
      { label: "\u536B\u661F\u8D44\u4EA7", pct: 20, bucketKey: "satellite", color: "#C97B63" }
    ],
    applicability: (p) => p.riskProfile === "aggressive" ? 90 : 62
  },
  {
    id: "all-weather",
    name: "\u5168\u5929\u5019\u7B56\u7565",
    description: "\u8DE8\u8D44\u4EA7\u98CE\u9669\u5E73\u4EF7\uFF0C\u7A7F\u8D8A\u5468\u671F",
    tags: ["\u914D\u7F6E", "\u8FDB\u9636"],
    allocations: [
      { label: "\u80A1\u7968", pct: 30, bucketKey: "stock", color: "#C97B63" },
      { label: "\u957F\u671F\u56FD\u503A", pct: 40, bucketKey: "ltbond", color: "#5BA3A8" },
      { label: "\u4E2D\u671F\u56FD\u503A", pct: 15, bucketKey: "mtbond", color: "#8E7CC3" },
      { label: "\u5546\u54C1", pct: 15, bucketKey: "commodity", color: "#D4A857" }
    ],
    applicability: (p) => p.investHorizonMonths > 120 ? 86 : 58
  },
  {
    id: "six-jars",
    name: "\u516D\u7F50\u5B50\u7406\u8D22\u6CD5",
    description: "\u516D\u8D26\u6237\u5206\u914D\uFF1A\u5FC5\u9700/\u6295\u8D44/\u50A8\u84C4/\u6559\u80B2/\u73A9\u4E50/\u6350\u8D60",
    tags: ["\u8D26\u6237", "\u8DA3\u5473"],
    allocations: [
      { label: "\u5FC5\u9700", pct: 55, bucketKey: "need", color: "#D4A857" },
      { label: "\u6295\u8D44", pct: 10, bucketKey: "invest", color: "#C97B63" },
      { label: "\u50A8\u84C4", pct: 10, bucketKey: "save", color: "#5BA3A8" },
      { label: "\u6559\u80B2", pct: 10, bucketKey: "edu", color: "#8E7CC3" },
      { label: "\u73A9\u4E50", pct: 10, bucketKey: "play", color: "#E0A96D" },
      { label: "\u6350\u8D60", pct: 5, bucketKey: "give", color: "#A3B86B" }
    ],
    applicability: () => 72
  },
  {
    id: "kakeibo",
    name: "Kakeibo \u8BB0\u8D26\u6CD5",
    description: "\u65E5\u5F0F\u8BB0\u8D26\u56DB\u95EE\uFF1A\u60F3\u8981/\u9700\u8981/\u7A81\u53D1/\u6587\u5316",
    tags: ["\u8BB0\u8D26", "\u4E60\u60EF"],
    allocations: [
      { label: "\u9700\u8981", pct: 50, bucketKey: "need", color: "#D4A857" },
      { label: "\u60F3\u8981", pct: 30, bucketKey: "want", color: "#C97B63" },
      { label: "\u7A81\u53D1", pct: 15, bucketKey: "surprise", color: "#8E7CC3" },
      { label: "\u6587\u5316", pct: 5, bucketKey: "culture", color: "#5BA3A8" }
    ],
    applicability: () => 70
  },
  {
    id: "four-percent",
    name: "4% \u63D0\u53D6\u6CD5\u5219",
    description: "\u9000\u4F11\u540E\u5E74\u63D0\u53D6\u4E0D\u8D85\u8FC7\u672C\u91D1 4%",
    tags: ["\u9000\u4F11", "\u63D0\u9886"],
    allocations: [
      { label: "\u751F\u6D3B\u63D0\u53D6", pct: 4, bucketKey: "withdraw", color: "#D4A857" },
      { label: "\u672C\u91D1\u7559\u5B58", pct: 96, bucketKey: "principal", color: "#5BA3A8" }
    ],
    applicability: (p) => p.investHorizonMonths > 240 ? 84 : 50
  },
  {
    id: "coast-fire",
    name: "Coast FIRE",
    description: "\u524D\u671F\u51B2\u523A\u50A8\u84C4\uFF0C\u540E\u671F\u8EBA\u5E73",
    tags: ["FIRE", "\u81EA\u7531"],
    allocations: [
      { label: "\u51B2\u523A\u50A8\u84C4", pct: 50, bucketKey: "sprint", color: "#5BA3A8" },
      { label: "\u65E5\u5E38", pct: 50, bucketKey: "living", color: "#D4A857" }
    ],
    applicability: (p) => p.currentSavings < 1e5 ? 83 : 60
  },
  {
    id: "buffett-90-10",
    name: "\u5DF4\u83F2\u7279 90/10",
    description: "90% \u4F4E\u6210\u672C\u6307\u6570 + 10% \u77ED\u671F\u56FD\u503A",
    tags: ["\u6307\u6570", "\u7ECF\u5178"],
    allocations: [
      { label: "\u6307\u6570\u57FA\u91D1", pct: 90, bucketKey: "index", color: "#C97B63" },
      { label: "\u77ED\u671F\u56FD\u503A", pct: 10, bucketKey: "tbill", color: "#5BA3A8" }
    ],
    applicability: (p) => p.riskProfile !== "conservative" ? 80 : 55
  },
  {
    id: "60-40",
    name: "60/40 \u7ECF\u5178\u7EC4\u5408",
    description: "60% \u80A1\u7968 + 40% \u503A\u5238",
    tags: ["\u7EC4\u5408", "\u7ECF\u5178"],
    allocations: [
      { label: "\u80A1\u7968", pct: 60, bucketKey: "stock", color: "#C97B63" },
      { label: "\u503A\u5238", pct: 40, bucketKey: "bond", color: "#5BA3A8" }
    ],
    applicability: (p) => p.riskProfile === "balanced" ? 82 : 64
  }
];
function getRule(id) {
  return RULES.find((r) => r.id === id);
}

// src/renderer/features/rules/recommend.ts
function recommend(profile) {
  return RULES.map((rule) => ({ rule, score: Math.round(rule.applicability(profile)) })).sort(
    (a, b) => b.score - a.score
  );
}

// src/renderer/features/preset/presets.ts
var PRESETS = [
  {
    id: "student",
    label: "\u5B66\u751F",
    desc: "\u6536\u5165\u6709\u9650\u3001\u65E0\u8D1F\u503A\u538B\u529B\uFF0C\u91CD\u5728\u517B\u6210\u50A8\u84C4\u4E0E\u8BB0\u8D26\u4E60\u60EF",
    icon: "\u{1F393}",
    recommendRules: ["50-30-20", "six-jars", "kakeibo"],
    weights: { "50-30-20": 16, "six-jars": 12, kakeibo: 12 }
  },
  {
    id: "newgrad",
    label: "\u804C\u573A\u65B0\u4EBA",
    desc: "\u521A\u5DE5\u4F5C\u3001\u6536\u5165\u8D77\u6B65\uFF0C\u5EFA\u7ACB\u5E94\u6025\u91D1\u4E0E\u57FA\u7840\u6295\u8D44",
    icon: "\u{1F331}",
    recommendRules: ["4321", "50-30-20", "core-satellite"],
    weights: { "4321": 16, "50-30-20": 12, "core-satellite": 10 }
  },
  {
    id: "single",
    label: "\u5355\u8EAB\u767D\u9886",
    desc: "\u6536\u5165\u7A33\u5B9A\u3001\u8D23\u4EFB\u8F83\u8F7B\uFF0C\u53EF\u9002\u5EA6\u8FDB\u53D6\u589E\u503C",
    icon: "\u{1F4BC}",
    recommendRules: ["4321", "50-30-20", "buffett-90-10"],
    weights: { "4321": 14, "50-30-20": 12, "buffett-90-10": 12 }
  },
  {
    id: "dualincome",
    label: "\u5DF2\u5A5A\u53CC\u804C\u5DE5",
    desc: "\u53CC\u6536\u5165\u3001\u73B0\u91D1\u6D41\u5145\u88D5\uFF0C\u91CD\u89C6\u7A33\u5065\u4E0E\u957F\u671F\u914D\u7F6E",
    icon: "\u{1F46B}",
    recommendRules: ["50-30-20", "60-40", "buffett-90-10"],
    weights: { "50-30-20": 14, "60-40": 12, "buffett-90-10": 12 }
  },
  {
    id: "family",
    label: "\u4E09\u53E3\u4E4B\u5BB6",
    desc: "\u6709\u80B2\u513F\u4E0E\u4FDD\u969C\u9700\u6C42\uFF0C\u5F3A\u8C03\u5B89\u5168\u57AB\u4E0E\u5206\u6563",
    icon: "\u{1F3E0}",
    recommendRules: ["50-30-20", "sp-quadrant", "all-weather"],
    weights: { "50-30-20": 14, "sp-quadrant": 12, "all-weather": 10 }
  },
  {
    id: "preretire",
    label: "\u4E34\u9000\u4F11",
    desc: "\u4E34\u8FD1\u9000\u4F11\uFF0C\u964D\u4F4E\u6CE2\u52A8\u3001\u4FDD\u672C\u91D1\u4E0E\u73B0\u91D1\u6D41",
    icon: "\u{1F305}",
    recommendRules: ["four-percent", "coast-fire", "100-age"],
    weights: { "four-percent": 16, "coast-fire": 14, "100-age": 12 }
  }
];
function getPreset(id) {
  if (!id) return void 0;
  return PRESETS.find((p) => p.id === id);
}
function recommendWithPreset(profile, presetId) {
  const base = recommend(profile);
  const preset = getPreset(presetId);
  if (!preset) return base;
  const boosted = base.map((rs) => {
    const w = preset.weights[rs.rule.id] ?? 0;
    return { rule: rs.rule, score: Math.min(100, Math.round(rs.score + w)) };
  });
  boosted.sort((a, b) => b.score - a.score);
  return boosted;
}

// src/renderer/features/education/terms.ts
var FINANCIAL_TERMS = {
  monthlyIncome: {
    id: "monthlyIncome",
    label: "\u6708\u6536\u5165",
    short: "\u6307\u6BCF\u6708\u5230\u624B\u7684\u7A33\u5B9A\u73B0\u91D1\u6D41\u5165\uFF0C\u542B\u5DE5\u8D44\u3001\u5E74\u7EC8\u5956\u644A\u8584\uFF08\u5E74\u5956\xF712\uFF09\u4E0E\u5176\u4ED6\u7ECF\u5E38\u6027\u6536\u5165\u3002\u5B83\u662F\u5206\u6876\u65B9\u6848\u4E0E\u5E94\u6025\u91D1\u500D\u6570\u7684\u5206\u6BCD\uFF0C\u6570\u503C\u8D8A\u771F\u5B9E\uFF0C\u65B9\u6848\u8D8A\u8D34\u5408\u3002"
  },
  fixedExpenses: {
    id: "fixedExpenses",
    label: "\u56FA\u5B9A\u652F\u51FA",
    short: "\u6BCF\u6708\u521A\u6027\u3001\u91D1\u989D\u8F83\u7A33\u5B9A\u7684\u652F\u51FA\uFF0C\u5982\u623F\u79DF/\u623F\u8D37\u3001\u6C34\u7535\u71C3\u6C14\u3001\u4FDD\u9669\u4FDD\u8D39\u3001\u8BA2\u9605\u670D\u52A1\u3001\u5B50\u5973\u56FA\u5B9A\u5B66\u8D39\u7B49\u3002\u5B83\u662F\u300C\u5E94\u6025\u5907\u7528\u91D1\u300D\u7684\u8BA1\u91CF\u57FA\u51C6\u3002"
  },
  variableExpenses: {
    id: "variableExpenses",
    label: "\u53D8\u52A8\u652F\u51FA",
    short: "\u6BCF\u6708\u6CE2\u52A8\u8F83\u5927\u7684\u652F\u51FA\uFF0C\u5982\u9910\u996E\u3001\u8D2D\u7269\u3001\u5A31\u4E50\u3001\u51FA\u884C\u3001\u4EBA\u60C5\u5F80\u6765\u7B49\u3002\u63A7\u5236\u53D8\u52A8\u652F\u51FA\u662F\u63D0\u5347\u6BCF\u6708\u53EF\u652F\u914D\u6295\u8D44\u989D\u7684\u6760\u6746\u70B9\u3002"
  },
  currentSavings: {
    id: "currentSavings",
    label: "\u5F53\u524D\u50A8\u84C4",
    short: "\u5DF2\u79EF\u7D2F\u7684\u73B0\u91D1\u4E0E\u9AD8\u6D41\u52A8\u6027\u8D44\u4EA7\uFF08\u8D27\u57FA\u3001\u6D3B\u671F\u3001\u77ED\u503A\u7B49\uFF09\u3002\u7528\u4E8E\u8BA1\u7B97\u5E94\u6025\u91D1\u500D\u6570\uFF0C\u4E5F\u662F\u590D\u5229\u63A8\u6F14\u7684\u8D77\u59CB\u672C\u91D1\u3002"
  },
  emergencyMultiple: {
    id: "emergencyMultiple",
    label: "\u5E94\u6025\u91D1\u500D\u6570",
    short: "\u5F53\u524D\u50A8\u84C4 \xF7 \u6708\u56FA\u5B9A\u652F\u51FA\u3002\u901A\u7528\u5EFA\u8BAE\u4E3A 3\u20136 \u500D\uFF1A3 \u500D\u8986\u76D6\u57FA\u7840\u751F\u5B58\uFF0C6 \u500D\u53EF\u5E94\u5BF9\u5931\u4E1A\u6216\u75BE\u75C5\u7B49\u4E2D\u65AD\u3002\u4F4E\u4E8E 3 \u500D\u89C6\u4E3A\u5B89\u5168\u57AB\u504F\u8584\u3002"
  },
  equityRatio: {
    id: "equityRatio",
    label: "\u6743\u76CA\u7C7B\u5360\u6BD4",
    short: "\u65B9\u6848\u4E2D\u5C06\u8D44\u91D1\u6295\u5165\u80A1\u7968\u3001\u6307\u6570\u3001\u8FDB\u53D6\u578B\u8D44\u4EA7\u7684\u6BD4\u4F8B\uFF080-100%\uFF09\u3002\u5E74\u8F7B\u53EF\u504F\u9AD8\u4EE5\u535A\u53D6\u589E\u957F\uFF0C\u4E34\u8FD1\u9000\u4F11\u5E94\u4E0B\u8C03\u4EE5\u63A7\u6CE2\u52A8\u3002"
  },
  riskProfile: {
    id: "riskProfile",
    label: "\u98CE\u9669\u504F\u597D",
    short: "\u4F60\u5BF9\u672C\u91D1\u6CE2\u52A8\u7684\u627F\u53D7\u5EA6\uFF1A\u4FDD\u5B88/\u7A33\u5065/\u79EF\u6781\u3002\u5B83\u5F71\u54CD\u590D\u5229\u63A8\u6F14\u7684\u5047\u8BBE\u5E74\u5316\u4E0E\u6CD5\u5219\u63A8\u8350\u6743\u91CD\uFF0C\u5E76\u975E\u8D8A\u9AD8\u8D8A\u597D\u3002"
  },
  debtPayment: {
    id: "debtPayment",
    label: "\u8D1F\u503A\u6708\u4F9B",
    short: "\u6BCF\u6708\u9700\u507F\u8FD8\u7684\u503A\u52A1\u672C\u606F\uFF08\u4FE1\u7528\u5361\u5206\u671F\u3001\u6D88\u8D39\u8D37\u3001\u623F\u8D37\u7B49\uFF09\u3002\u9AD8\u606F\u8D1F\u503A\u5E94\u4F18\u5148\u6E05\u507F\uFF0C\u56E0\u5176\u5229\u7387\u5E38\u9AD8\u4E8E\u6295\u8D44\u56DE\u62A5\u3002"
  },
  investHorizon: {
    id: "investHorizon",
    label: "\u6295\u8D44\u671F\u9650",
    short: "\u8BA1\u5212\u6301\u6709\u5E76\u590D\u6295\u7684\u6708\u6570\u3002\u671F\u9650\u8D8A\u957F\uFF0C\u590D\u5229\u6548\u5E94\u8D8A\u663E\u8457\uFF0C\u4E5F\u66F4\u53EF\u627F\u53D7\u77ED\u671F\u6CE2\u52A8\u3002\u9ED8\u8BA4 120 \u4E2A\u6708\uFF0810 \u5E74\uFF09\u3002"
  }
};
var RULE_TERMS = {
  "4321": {
    id: "4321",
    label: "4321 \u6CD5\u5219",
    short: "40% \u751F\u6D3B / 30% \u50A8\u84C4 / 20% \u6295\u8D44 / 10% \u4FDD\u9669\uFF0C\u5747\u8861\u5165\u95E8\u578B\u5206\u914D\u3002",
    origin: "4321 \u662F\u574A\u95F4\u6D41\u4F20\u7684\u300C\u6536\u652F\u56DB\u8C61\u9650\u300D\u7B80\u5316\u7248\uFF0C\u6E90\u81EA\u5BB6\u5EAD\u7406\u8D22\u987E\u95EE\u5BF9\u5DE5\u85AA\u65CF\u6536\u652F\u7ED3\u6784\u7684\u7ECF\u9A8C\u5F52\u7EB3\u3002\u5B83\u628A\u6708\u6536\u5165\u5207\u6210\u56DB\u5757\uFF0C\u5148\u4FDD\u8BC1\u751F\u6D3B\uFF0C\u518D\u5F3A\u5236\u50A8\u84C4\u4E0E\u6295\u8D44\uFF0C\u6700\u540E\u7528\u4E00\u5C0F\u90E8\u5206\u4E70\u4FDD\u9669\u515C\u5E95\u3002\u56E0\u6BD4\u4F8B\u597D\u8BB0\u3001\u95E8\u69DB\u4F4E\uFF0C\u5E38\u4F5C\u4E3A\u7406\u8D22\u65B0\u4EBA\u7684\u7B2C\u4E00\u4EFD\u300C\u9ED8\u8BA4\u914D\u65B9\u300D\uFF0C\u4F46\u5E76\u975E\u7CBE\u786E\u6A21\u578B\u2014\u2014\u5B9E\u9645\u5E94\u6309\u57CE\u5E02\u4E0E\u4EBA\u751F\u9636\u6BB5\u5FAE\u8C03\u3002"
  },
  "sp-quadrant": {
    id: "sp-quadrant",
    label: "\u6807\u666E\u5BB6\u5EAD\u8D44\u4EA7\u8C61\u9650",
    short: "\u8981\u82B1\u7684\u94B1 / \u4FDD\u547D\u7684\u94B1 / \u751F\u94B1\u7684\u94B1 / \u4FDD\u672C\u7684\u94B1\uFF0C\u56DB\u8D26\u6237\u7BA1\u7406\u3002",
    origin: "\u8BE5\u8C61\u9650\u56FE\u7531\u6807\u51C6\u666E\u5C14\uFF08S&P\uFF09\u5728\u8C03\u7814\u5168\u7403\u5341\u4E07\u4E2A\u8D44\u4EA7\u7A33\u5065\u589E\u957F\u5BB6\u5EAD\u540E\u6574\u7406\u53D1\u5E03\uFF0C\u6545\u53C8\u79F0\u300C\u6807\u666E\u5BB6\u5EAD\u8D44\u4EA7\u8C61\u9650\u56FE\u300D\u3002\u5B83\u5C06\u8D44\u4EA7\u6309\u300C\u6D41\u52A8\u6027\u2014\u6536\u76CA\u6027\u2014\u5B89\u5168\u6027\u300D\u5206\u4E3A\u56DB\u7B14\u94B1\uFF1A\u77ED\u671F\u8981\u7528\u7684\u6D3B\u671F\u3001\u5E94\u5BF9\u98CE\u9669\u7684\u4FDD\u969C\u3001\u8FFD\u6C42\u589E\u503C\u7684\u6295\u8D44\u3001\u4EE5\u53CA\u957F\u671F\u7A33\u5065\u7684\u672C\u91D1\u3002\u5176\u6838\u5FC3\u601D\u60F3\u4E0D\u662F\u7CBE\u786E\u6BD4\u4F8B\uFF0C\u800C\u662F\u300C\u5206\u8D26\u6237\u3001\u5206\u76EE\u6807\u300D\u7684\u8D44\u4EA7\u914D\u7F6E\u7EAA\u5F8B\u3002"
  },
  "100-age": {
    id: "100-age",
    label: "100 \u2212 \u5E74\u9F84 \u6CD5\u5219",
    short: "\u6743\u76CA\u7C7B\u5360\u6BD4 \u2248 (100 \u2212 \u5E74\u9F84)%\uFF0C\u968F\u5E74\u9F84\u589E\u957F\u81EA\u52A8\u964D\u98CE\u9669\u3002",
    origin: "\u300C100 \u51CF\u5E74\u9F84\u300D\u662F\u8BC1\u5238\u6295\u8D44\u57FA\u91D1\u754C\u6700\u53E4\u8001\u7684\u80A1\u7968\u914D\u7F6E\u7ECF\u9A8C\u516C\u5F0F\u4E4B\u4E00\uFF0C\u6700\u65E9\u89C1\u4E8E 20 \u4E16\u7EAA\u4E2D\u671F\u7684\u8D44\u4EA7\u914D\u7F6E\u6559\u6750\u3002\u903B\u8F91\u6734\u7D20\uFF1A\u5E74\u9F84\u8D8A\u5927\u3001\u53EF\u6295\u8D44\u5E74\u9650\u8D8A\u77ED\uFF0C\u8D8A\u5E94\u51CF\u5C11\u9AD8\u6CE2\u52A8\u6743\u76CA\u3001\u589E\u52A0\u56FA\u6536\u3002\u73B0\u4EE3\u53D8\u4F53\u6709\u7528\u300C110\u2212\u5E74\u9F84\u300D\u6216\u300C120\u2212\u5E74\u9F84\u300D\u4EE5\u53CD\u6620\u5BFF\u547D\u5EF6\u957F\uFF0C\u4F46\u6839\u57FA\u540C\u6E90\u3002"
  },
  "50-30-20": {
    id: "50-30-20",
    label: "50/30/20 \u9884\u7B97\u6CD5",
    short: "50% \u5FC5\u9700 / 30% \u60F3\u8981 / 20% \u50A8\u84C4\u6295\u8D44\uFF0C\u7075\u6D3B\u9884\u7B97\u6846\u67B6\u3002",
    origin: "\u7531\u7F8E\u56FD\u7406\u8D22\u5E08 Elizabeth Warren \u4E0E\u5973\u513F Amelia Warren Tyagi \u5728 2005 \u5E74\u300AAll Your Worth\u300B\u4E00\u4E66\u4E2D\u7CFB\u7EDF\u63D0\u51FA\u3002\u5B83\u628A\u7A0E\u540E\u6536\u5165\u5206\u4E3A\u300C\u9700\u6C42\u3001\u60F3\u8981\u3001\u50A8\u84C4\u300D\u4E09\u5757\uFF0C\u5F3A\u8C03\u5148\u4ED8\u7ED9\u81EA\u5DF1 20%\u3002\u56E0\u4E0D\u4F9D\u8D56\u5177\u4F53\u8D26\u6237\u3001\u9002\u914D\u5927\u591A\u6570\u6536\u5165\u7ED3\u6784\uFF0C\u88AB\u5927\u91CF\u9884\u7B97\u7C7B App \u91C7\u7528\u4E3A\u9ED8\u8BA4\u6A21\u677F\u3002"
  },
  "core-satellite": {
    id: "core-satellite",
    label: "\u6838\u5FC3-\u536B\u661F\u7B56\u7565",
    short: "\u6838\u5FC3 80% \u7A33\u5065 + \u536B\u661F 20% \u8FDB\u53D6\uFF0C\u653B\u5B88\u7ED3\u5408\u3002",
    origin: "\u6838\u5FC3-\u536B\u661F\uFF08Core-Satellite\uFF09\u7531\u6295\u8D44\u7EC4\u5408\u7BA1\u7406\u4EBA\u5728 20 \u4E16\u7EAA 90 \u5E74\u4EE3\u63A8\u5E7F\uFF0C\u501F\u9274\u822A\u5929\u4E2D\u300C\u7A33\u5B9A\u6838\u5FC3+\u7075\u6D3B\u536B\u661F\u300D\u7684\u7ED3\u6784\u9690\u55BB\u3002\u6838\u5FC3\u4ED3\u6301\u6709\u4F4E\u6210\u672C\u5BBD\u57FA\u6307\u6570\u4EE5\u6C42\u5E02\u573A\u5E73\u5747\u56DE\u62A5\uFF0C\u536B\u661F\u4ED3\u7528\u5C0F\u6BD4\u4F8B\u535A\u53D6\u8D85\u989D\u6536\u76CA\u6216\u4E3B\u9898\u673A\u4F1A\u3002\u4F18\u70B9\u662F\u63A7\u5236\u8DDF\u8E2A\u8BEF\u5DEE\u3001\u964D\u4F4E\u6574\u4F53\u6CE2\u52A8\u3002"
  },
  "all-weather": {
    id: "all-weather",
    label: "\u5168\u5929\u5019\u7B56\u7565",
    short: "\u8DE8\u8D44\u4EA7\u98CE\u9669\u5E73\u4EF7\uFF0C\u7A7F\u8D8A\u725B\u718A\u5468\u671F\u3002",
    origin: "\u5168\u5929\u5019\uFF08All Weather\uFF09\u7531\u6865\u6C34\uFF08Bridgewater\uFF09\u521B\u59CB\u4EBA Ray Dalio \u56E2\u961F\u4E8E 1990 \u5E74\u4EE3\u63D0\u51FA\uFF0C\u521D\u8877\u662F\u6784\u5EFA\u300C\u5728\u4EFB\u4F55\u5929\u6C14\uFF08\u7ECF\u6D4E\u73AF\u5883\uFF09\u4E0B\u90FD\u5E73\u7A33\u300D\u7684\u7EC4\u5408\u3002\u5B83\u6309\u589E\u957F/\u901A\u80C0\u7684\u56DB\u8C61\u9650\u5206\u914D\u80A1\u7968\u3001\u957F\u671F\u56FD\u503A\u3001\u4E2D\u671F\u56FD\u503A\u4E0E\u5546\u54C1\uFF0C\u8FFD\u6C42\u98CE\u9669\u5E73\u4EF7\u800C\u975E\u6536\u76CA\u6700\u5927\u5316\uFF0C\u9002\u5408\u957F\u671F\u3001\u4F4E\u5E72\u9884\u7684\u6301\u6709\u8005\u3002"
  },
  "six-jars": {
    id: "six-jars",
    label: "\u516D\u7F50\u5B50\u7406\u8D22\u6CD5",
    short: "\u516D\u8D26\u6237\u5206\u914D\uFF1A\u5FC5\u9700/\u6295\u8D44/\u50A8\u84C4/\u6559\u80B2/\u73A9\u4E50/\u6350\u8D60\u3002",
    origin: "\u516D\u7F50\u5B50\uFF086 Jars / 6 \u8D26\u6237\uFF09\u7531\u7406\u8D22\u4F5C\u5BB6 T. Harv Eker \u7684\u300C\u91D1\u94B1\u84DD\u56FE\u300D\u7406\u5FF5\u884D\u751F\uFF0C\u540E\u7ECF\u591A\u4F4D\u7406\u8D22\u535A\u4E3B\u672C\u571F\u5316\u3002\u5B83\u628A\u6536\u5165\u5012\u8FDB\u516D\u4E2A\u7269\u7406\u300C\u7F50\u5B50\u300D\uFF1A\u751F\u6D3B\u5FC5\u9700\u3001\u957F\u671F\u50A8\u84C4\u3001\u6559\u80B2\u6210\u957F\u3001\u73A9\u4E50\u3001\u8D22\u52A1\u81EA\u7531\uFF08\u6295\u8D44\uFF09\u3001\u4EE5\u53CA\u7ED9\u4E88\u3002\u7528\u7269\u7406\u9694\u79BB\u5BF9\u6297\u51B2\u52A8\u6D88\u8D39\uFF0C\u5F3A\u8C03\u300C\u5148\u5206\u914D\u518D\u82B1\u8D39\u300D\u3002"
  },
  kakeibo: {
    id: "kakeibo",
    label: "Kakeibo \u8BB0\u8D26\u6CD5",
    short: "\u65E5\u5F0F\u8BB0\u8D26\u56DB\u95EE\uFF1A\u60F3\u8981/\u9700\u8981/\u7A81\u53D1/\u6587\u5316\u3002",
    origin: "Kakeibo\uFF08\u5BB6\u8A08\u7C3F\uFF09\u8D77\u6E90\u4E8E 1904 \u5E74\u7684\u65E5\u672C\uFF0C\u7531\u5F53\u65F6\u300A\u5987\u5973\u4E4B\u53CB\u300B\u6742\u5FD7\u4E3A\u5E2E\u52A9\u5BB6\u5EAD\u4E3B\u5987\u7BA1\u7406\u5BB6\u7528\u800C\u521B\u8BBE\uFF0C\u662F\u65E5\u672C\u5BB6\u7528\u8D26\u672C\u7684\u901A\u79F0\u3002\u73B0\u4EE3\u300C\u56DB\u95EE\u6CD5\u300D\u5728\u6BCF\u6708\u8BB0\u8D26\u524D\u81EA\u95EE\uFF1A\u6211\u60F3\u600E\u4E48\u82B1\u3001\u9700\u8981\u600E\u4E48\u82B1\u3001\u610F\u5916\u4F1A\u82B1\u4EC0\u4E48\u3001\u4E3A\u6587\u5316\u4E0E\u6210\u957F\u82B1\u4EC0\u4E48\u3002\u5B83\u91CD\u5728\u300C\u624B\u5199\u6162\u601D\u8003\u300D\uFF0C\u7528\u89C9\u5BDF\u964D\u4F4E\u65E0\u8C13\u5F00\u9500\u3002"
  },
  "four-percent": {
    id: "four-percent",
    label: "4% \u63D0\u53D6\u6CD5\u5219",
    short: "\u9000\u4F11\u540E\u5E74\u63D0\u53D6\u4E0D\u8D85\u8FC7\u672C\u91D1 4%\uFF0C\u6E90\u81EA Trinity \u7814\u7A76\u3002",
    origin: "4% \u6CD5\u5219\u6765\u81EA 1998 \u5E74\u4E09\u4F4D Trinity \u5927\u5B66\u5B66\u8005\u53D1\u8868\u7684\u300C\u9000\u4F11\u7EC4\u5408\u63D0\u9886\u7387\u300D\u7814\u7A76\uFF08\u6545\u79F0 Trinity Study\uFF09\u3002\u7ED3\u8BBA\u662F\uFF1A\u4E00\u4E2A\u80A1\u503A\u5E73\u8861\u7684\u7EC4\u5408\uFF0C\u6BCF\u5E74\u63D0\u53D6\u521D\u59CB\u672C\u91D1\u7684 4% \u5E76\u968F\u901A\u80C0\u4E0A\u8C03\uFF0C\u5927\u6982\u7387\u652F\u6491 30 \u5E74\u9000\u4F11\u3002\u5B83\u662F FIRE \u8FD0\u52A8\u7684\u57FA\u77F3\uFF0C\u4F46\u4F4E\u5229\u7387\u65F6\u4EE3\u5176\u5B89\u5168\u6027\u5B58\u5728\u4E89\u8BAE\u3002"
  },
  "coast-fire": {
    id: "coast-fire",
    label: "Coast FIRE",
    short: "\u524D\u671F\u51B2\u523A\u50A8\u84C4\uFF0C\u540E\u671F\u300C\u8EBA\u5E73\u300D\u9760\u590D\u5229\u5230\u76EE\u6807\u3002",
    origin: "Coast FIRE \u662F FIRE\uFF08\u8D22\u52A1\u72EC\u7ACB\u3001\u63D0\u65E9\u9000\u4F11\uFF09\u5BB6\u65CF\u7684\u4E00\u5458\u3002\u4E0E\u5FC5\u987B\u6301\u7EED\u50A8\u84C4\u7684\u666E\u901A FIRE \u4E0D\u540C\uFF0CCoast \u5F3A\u8C03\uFF1A\u5728\u58EE\u5E74\u628A\u6295\u8D44\u8D26\u6237\u6512\u5230\u300C\u4EC5\u9760\u65E2\u6709\u672C\u91D1\u590D\u5229\u5C31\u53EF\u5728\u9000\u4F11\u5E74\u9F84\u8FBE\u76EE\u6807\u300D\u7684\u89C4\u6A21\uFF0C\u4E4B\u540E\u5373\u4FBF\u4E0D\u518D\u8FFD\u52A0\uFF0C\u4E5F\u80FD\u300C\u6ED1\u884C\u300D\u5230\u81EA\u7531\u3002\u5B83\u964D\u4F4E\u4E86\u524D\u671F\u50A8\u84C4\u538B\u529B\u3002"
  },
  "buffett-90-10": {
    id: "buffett-90-10",
    label: "\u5DF4\u83F2\u7279 90/10",
    short: "90% \u4F4E\u6210\u672C\u6307\u6570 + 10% \u77ED\u671F\u56FD\u503A\uFF0C\u6781\u7B80\u957F\u671F\u3002",
    origin: "\u8BE5\u601D\u8DEF\u51FA\u81EA\u6C83\u4F26\xB7\u5DF4\u83F2\u7279 2013 \u5E74\u81F4\u80A1\u4E1C\u4FE1\u4E2D\u7684\u5EFA\u8BAE\uFF1A\u5BF9\u5176\u9057\u4EA7\u4FE1\u6258\uFF0C\u957F\u671F\u5E94\u914D\u7F6E 90% \u6807\u666E 500 \u6307\u6570\u57FA\u91D1\u300110% \u77ED\u671F\u56FD\u503A\u3002\u4ED6\u610F\u5728\u8BF4\u660E\uFF0C\u5BF9\u7EDD\u5927\u591A\u6570\u975E\u4E13\u4E1A\u6295\u8D44\u8005\uFF0C\u4F4E\u6210\u672C\u5BBD\u57FA\u6307\u6570 + \u5C11\u91CF\u73B0\u91D1\u662F\u6700\u4F18\u89E3\uFF0C\u80DC\u8FC7\u9891\u7E41\u62E9\u65F6\u4E0E\u9AD8\u8D39\u4E3B\u52A8\u7BA1\u7406\u3002"
  },
  "60-40": {
    id: "60-40",
    label: "60/40 \u7ECF\u5178\u7EC4\u5408",
    short: "60% \u80A1\u7968 + 40% \u503A\u5238\uFF0C\u6700\u7ECF\u5178\u7684\u5E73\u8861\u7EC4\u5408\u3002",
    origin: "60/40 \u662F\u673A\u6784\u6295\u8D44\u4E2D\u6700\u60A0\u4E45\u7684\u80A1\u503A\u5E73\u8861\u6A21\u677F\uFF0C\u81F3\u5C11\u5728 20 \u4E16\u7EAA\u4E0B\u534A\u53F6\u5DF2\u6210\u4E3A\u517B\u8001\u57FA\u91D1\u4E0E\u6350\u8D60\u57FA\u91D1\u7684\u9ED8\u8BA4\u57FA\u51C6\u3002\u5B83\u7528\u80A1\u7968\u7684\u6210\u957F\u5BF9\u51B2\u503A\u5238\u7684\u7A33\u5B9A\uFF0C\u5386\u53F2\u4E0A\u5728\u591A\u6570\u5E74\u4EFD\u63D0\u4F9B\u4E0D\u9519\u7684\u98CE\u9669\u6536\u76CA\u3002\u8FD1\u5E74\u56E0\u80A1\u503A\u76F8\u5173\u6027\u4E0A\u5347\u800C\u53D7\u8D28\u7591\uFF0C\u4F46\u4ECD\u662F\u300C\u5E73\u8861\u300D\u7684\u4EE3\u540D\u8BCD\u3002"
  }
};

// tests/v1_1_smoke.test.ts
var passed = 0;
var failed = 0;
var failures = [];
function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log("  \u2713 PASS", name);
  } else {
    failed++;
    failures.push(name + (detail ? " :: " + detail : ""));
    console.log("  \u2717 FAIL", name, detail ? ":: " + detail : "");
  }
}
function eq(name, actual, expected) {
  check(name, actual === expected, `expected ${String(expected)}, got ${String(actual)}`);
}
function approx(name, actual, expected) {
  check(name, Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
}
function makeProfile(over) {
  return { ...createEmptyProfile("test"), ...over };
}
console.log("\n[1] WARN_THRESHOLDS \u5E38\u91CF\uFF08\u8BBE\u8BA1\u6587\u6863 \xA73.2\uFF09");
eq("conflict.ageMin === 55", WARN_THRESHOLDS.conflict.ageMin, 55);
approx("conflict.equityRatioMax === 0.4", WARN_THRESHOLDS.conflict.equityRatioMax, 0.4);
approx("deviation.totalExpenseRatioMax === 1.0", WARN_THRESHOLDS.deviation.totalExpenseRatioMax, 1);
approx("deviation.bucketRatioTolerance === 0.1", WARN_THRESHOLDS.deviation.bucketRatioTolerance, 0.1);
console.log("\n[2] computeEmergencyFundReachMonths\uFF08\u8BBE\u8BA1\u6587\u6863 \xA73.7\uFF09");
{
  const p = makeProfile({ fixedExpenses: 3e3, currentSavings: 0 });
  eq("\u7F3A\u53E3\u5B58\u5728\u65F6\u6708\u6570=10", computeEmergencyFundReachMonths(p, 900), 10);
  check("\u6708\u6570 > 0 \u4E14\u5408\u7406", computeEmergencyFundReachMonths(p, 900) > 0);
  const p2 = makeProfile({ fixedExpenses: 3e3, currentSavings: 1e4 });
  eq("\u5DF2\u8FBE\u6807\u6708\u6570=0", computeEmergencyFundReachMonths(p2, 900), 0);
  const p3 = makeProfile({ fixedExpenses: 3e3, currentSavings: 0 });
  check("\u65E0\u6708\u50A8\u84C4\u4E14\u7F3A\u53E3>0 \u2192 Infinity", computeEmergencyFundReachMonths(p3, 0) === Number.POSITIVE_INFINITY);
  const p4 = makeProfile({ fixedExpenses: 0, currentSavings: 0 });
  eq("\u56FA\u5B9A\u652F\u51FA0 \u2192 0 \u4E2A\u6708", computeEmergencyFundReachMonths(p4, 500), 0);
}
console.log("\n[3] getEquityRatio\uFF08\u8BBE\u8BA1\u6587\u6863 \xA73.7\uFF09");
{
  const r100_30 = getRule("100-age");
  approx("100-age, age=30 \u2192 0.7", getEquityRatio(makeProfile({ age: 30 }), r100_30), 0.7);
  approx("100-age, age=70 \u2192 0.3", getEquityRatio(makeProfile({ age: 70 }), r100_30), 0.3);
  const r4321 = getRule("4321");
  approx("4321 \u65E0\u6743\u76CA\u6876 \u2192 0", getEquityRatio(makeProfile({ age: 30 }), r4321), 0);
  const rAll = getRule("all-weather");
  approx("all-weather stock 30 \u2192 0.3", getEquityRatio(makeProfile({ age: 30 }), rAll), 0.3);
  const rSp = getRule("sp-quadrant");
  approx("sp-quadrant grow 30 \u2192 0.3", getEquityRatio(makeProfile({ age: 30 }), rSp), 0.3);
  const rBuffett = getRule("buffett-90-10");
  approx("buffett index 90 \u2192 0.9", getEquityRatio(makeProfile({ age: 30 }), rBuffett), 0.9);
  const rules = [r100_30, r4321, rAll, rSp, rBuffett];
  const ages = [20, 40, 60, 80];
  let allInRange = true;
  for (const r of rules) {
    for (const a of ages) {
      const v = getEquityRatio(makeProfile({ age: a }), r);
      if (v < 0 || v > 1) allInRange = false;
    }
  }
  check("\u6240\u6709 getEquityRatio \u7ED3\u679C \u2208 [0,1]", allInRange);
  const oldProfile = makeProfile({ age: 65 });
  const conflict = detectConflict(oldProfile, rBuffett);
  check("65 \u5C81 + \u9AD8\u6743\u76CA \u2192 \u51B2\u7A81\u9884\u8B66", !!conflict && conflict.severity === "danger");
  const young = detectConflict(makeProfile({ age: 30 }), rBuffett);
  check("30 \u5C81 \u2192 \u4E0D\u51B2\u7A81\uFF08\u5E74\u9F84\u672A\u5230\uFF09", young === null);
}
console.log("\n[4] detectDeviation / detectOverspend\uFF08\u8BBE\u8BA1\u6587\u6863 \xA73.7\uFF09");
{
  const overProfile = makeProfile({
    monthlyIncome: 1e4,
    incomeAnnualBonus: 0,
    incomeOther: 0,
    fixedExpenses: 6e3,
    variableExpenses: 5e3
  });
  const over = detectOverspend(overProfile);
  check("\u8D85\u652F\u65F6\u8FD4\u56DE deviation-overspend", !!over && over.id === "deviation-overspend");
  const okProfile = makeProfile({
    monthlyIncome: 1e4,
    fixedExpenses: 3e3,
    variableExpenses: 2e3
  });
  check("\u672A\u8D85\u652F\u8FD4\u56DE null", detectOverspend(okProfile) === null);
  const dev = detectDeviation(overProfile, getRule("buffett-90-10"));
  eq("detectDeviation \u547D\u4E2D\u6570 = 2", dev.length, 2);
  check(
    "\u542B\u8D85\u652F + \u5355\u6876\u96C6\u4E2D\u9884\u8B66",
    dev.some((d) => d.id === "deviation-overspend") && dev.some((d) => d.id === "deviation-concentration-index")
  );
  const dev2 = detectDeviation(okProfile, getRule("buffett-90-10"));
  eq("\u4EC5 concentration \u2192 1 \u6761", dev2.length, 1);
  check("\u4EC5\u5355\u6876\u96C6\u4E2D\u9884\u8B66", dev2[0]?.id === "deviation-concentration-index");
  const dev3 = detectDeviation(okProfile, getRule("4321"));
  eq("\u65E0\u504F\u79BB \u2192 0 \u6761", dev3.length, 0);
}
console.log("\n[5] buildReviews\uFF08\u8BBE\u8BA1\u6587\u6863 \xA73.4\uFF0C\u7EAF\u51FD\u6570\uFF09");
{
  const profile = makeProfile({
    monthlyIncome: 8e3,
    fixedExpenses: 3e3,
    variableExpenses: 3e3,
    currentSavings: 0,
    riskProfile: "conservative",
    goals: [],
    age: 30,
    investHorizonMonths: 120
  });
  const plan = {
    buckets: [],
    totalMonthly: 2e3,
    futureValue: 1e5,
    reachMonths: 10,
    equityRatio: 0.5
    // >0.4 且 conservative → 权益偏高命中
  };
  const ctx = {
    profile,
    plan,
    health: { score: 50, badges: [], emergencyMultiple: 0 },
    rule: getRule("4321")
  };
  const hits = buildReviews(ctx);
  check("\u4EA7\u51FA 3-5 \u6761 ReviewHit", hits.length >= 3 && hits.length <= 5, `got ${hits.length}`);
  check(
    "\u6BCF\u6761\u542B\u975E\u7A7A tag + text",
    hits.every((h) => typeof h.tag === "string" && h.tag.length > 0 && typeof h.text === "string" && h.text.length > 0)
  );
  const tags = hits.map((h) => h.tag);
  check("\u542B\u300C\u5E94\u6025\u91D1\u4E0D\u8DB3\u300D", tags.includes("\u5E94\u6025\u91D1\u4E0D\u8DB3"));
  check("\u542B\u300C\u6743\u76CA\u5360\u6BD4\u504F\u9AD8\u300D", tags.includes("\u6743\u76CA\u5360\u6BD4\u504F\u9AD8"));
  check("\u542B\u300C\u6863\u6848\u5F85\u5B8C\u5584\u300D", tags.includes("\u6863\u6848\u5F85\u5B8C\u5584"));
  check("\u542B\u300C\u5EFA\u8BAE\u8BBE\u76EE\u6807\u300D", tags.includes("\u5EFA\u8BAE\u8BBE\u76EE\u6807"));
  const hitsAgain = buildReviews(ctx);
  check("\u540C\u8F93\u5165\u540C\u8F93\u51FA\uFF08\u7EAF\u51FD\u6570\uFF09", JSON.stringify(hits) === JSON.stringify(hitsAgain));
  const ctxSnapshot = JSON.stringify(ctx);
  buildReviews(ctx);
  check("\u4E0D\u4FEE\u6539\u5165\u53C2 ctx", JSON.stringify(ctx) === ctxSnapshot);
  const allHitCtx = {
    profile: makeProfile({
      monthlyIncome: 5e3,
      fixedExpenses: 6e3,
      variableExpenses: 0,
      currentSavings: 0,
      riskProfile: "conservative",
      goals: [],
      age: 30
    }),
    plan: { buckets: [], totalMonthly: 5e3, futureValue: 0, reachMonths: 0, equityRatio: 0.9 },
    health: { score: 10, badges: [], emergencyMultiple: 0 },
    rule: getRule("100-age")
  };
  const allHits = buildReviews(allHitCtx);
  check("\u6781\u7AEF\u5168\u547D\u4E2D\u4ECD \u22645 \u6761\uFF08\u4E0A\u9650\uFF09", allHits.length <= 5, `got ${allHits.length}`);
}
console.log("\n[6] getPreset / recommendWithPreset\uFF08\u8BBE\u8BA1\u6587\u6863 \xA73.5\uFF09");
{
  const family = getPreset("family");
  check("getPreset(family) \u5B9A\u4E49\u5B58\u5728", !!family);
  eq("family label", family.label, "\u4E09\u53E3\u4E4B\u5BB6");
  check(
    "family.recommendRules \u542B 50-30-20/sp-quadrant/all-weather",
    ["50-30-20", "sp-quadrant", "all-weather"].every((id) => family.recommendRules.includes(id))
  );
  check("getPreset(null) \u2192 undefined", getPreset(null) === void 0);
  check("getPreset(undefined) \u2192 undefined", getPreset(void 0) === void 0);
  const allIds = ["student", "newgrad", "single", "dualincome", "family", "preretire"];
  check("6 \u7C7B\u9884\u8BBE\u5747\u5B58\u5728", allIds.every((id) => !!getPreset(id)));
  eq("PRESETS \u957F\u5EA6 = 6", PRESETS.length, 6);
  const profile = makeProfile({
    monthlyIncome: 8e3,
    fixedExpenses: 3e3,
    variableExpenses: 2e3,
    currentSavings: 0,
    riskProfile: "conservative",
    age: 30,
    investHorizonMonths: 120
  });
  const ranked = recommendWithPreset(profile, "family");
  eq("\u8FD4\u56DE 12 \u6761\uFF08\u5168\u90E8\u6CD5\u5219\uFF09", ranked.length, 12);
  check("top1 \u5C5E\u4E8E family.recommendRules", family.recommendRules.includes(ranked[0].rule.id));
  const sp = ranked.find((r) => r.rule.id === "sp-quadrant");
  eq("sp-quadrant \u52A0\u6743\u540E=100\uFF08capped\uFF09", sp.score, 100);
  const baseline = recommendWithPreset(profile, null);
  eq("\u65E0\u9884\u8BBE\u8FD4\u56DE 12 \u6761", baseline.length, 12);
  check("\u6392\u5E8F\u964D\u5E8F", ranked.every((r, i) => i === 0 || ranked[i - 1].score >= r.score));
}
console.log("\n[7] FINANCIAL_TERMS / RULE_TERMS\uFF08\u8BBE\u8BA1\u6587\u6863 \xA73.3\uFF09");
{
  const finKeys = Object.keys(FINANCIAL_TERMS);
  check("FINANCIAL_TERMS \u22656 \u4E2A\u5B57\u6BB5", finKeys.length >= 6, `got ${finKeys.length}`);
  check(
    "FINANCIAL_TERMS \u6BCF\u6761\u542B id/label/short",
    finKeys.every((k) => {
      const t = FINANCIAL_TERMS[k];
      return !!t.id && !!t.label && !!t.short;
    })
  );
  const ruleKeys = Object.keys(RULE_TERMS);
  eq("RULE_TERMS \u8986\u76D6\u5168\u90E8 12 \u4E2A\u5185\u7F6E\u6CD5\u5219", ruleKeys.length, 12);
  const allCovered = RULES.every((r) => {
    const t = RULE_TERMS[r.id];
    return !!t && typeof t.origin === "string" && t.origin.length > 0;
  });
  check("RULE_TERMS \u8986\u76D6 RULES \u5168\u90E8\u4E14 origin \u975E\u7A7A", allCovered);
  check(
    "RULE_TERMS \u6BCF\u6761\u542B id/label/short/origin",
    ruleKeys.every((k) => {
      const t = RULE_TERMS[k];
      return !!t.id && !!t.label && !!t.short && !!t.origin;
    })
  );
}
console.log("\n[8] buildPlanView \u6D3E\u751F\uFF08\u8BBE\u8BA1\u6587\u6863 \xA73.7\uFF0C\u5192\u70DF\uFF09");
{
  const profile = makeProfile({
    monthlyIncome: 1e4,
    fixedExpenses: 3e3,
    variableExpenses: 2e3,
    currentSavings: 9e3,
    riskProfile: "balanced",
    age: 30,
    investHorizonMonths: 120
  });
  const view = buildPlanView(profile, getRule("4321"));
  check("buckets \u975E\u7A7A", view.buckets.length > 0);
  check("totalMonthly > 0", view.totalMonthly > 0);
  check("futureValue > 0", view.futureValue > 0);
  check("reachMonths \u4E3A\u6709\u9650\u6570", Number.isFinite(view.reachMonths));
  check("equityRatio \u2208 [0,1]", view.equityRatio >= 0 && view.equityRatio <= 1);
}
console.log(`
=== RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log("Failures:\n" + failures.map((f) => "  - " + f).join("\n"));
  globalThis.process && globalThis.process.exit(1);
} else {
  console.log("ALL PASS \u2705");
}
