const getPath = (obj, path) =>
  path
    .split(".")
    .reduce(
      (current, key) => (current == null ? undefined : current[key]),
      obj,
    );

const asArray = (v) =>
  v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];

const norm = (v) => (typeof v === "string" ? v.toLowerCase() : v);

const isNum = (v) => typeof v === "number" && !Number.isNaN(v);

const OPERATORS = {
  equals: (a, b) => norm(a) === norm(b),

  notEquals: (a, b) => norm(a) !== norm(b),

  in: (a, b) => asArray(b).map(norm).includes(norm(a)),

  notIn: (a, b) => !asArray(b).map(norm).includes(norm(a)),

  exists: (a) => a !== undefined && a !== null && a !== "",

  notEmpty: (a) =>
    Array.isArray(a) ? a.length > 0 : a !== undefined && a !== null && a !== "",

  gt: (a, b) => isNum(a) && isNum(b) && a > b,

  gte: (a, b) => isNum(a) && isNum(b) && a >= b,

  lt: (a, b) => isNum(a) && isNum(b) && a < b,

  lte: (a, b) => isNum(a) && isNum(b) && a <= b,

  intersects: (a, b) => {
    const right = asArray(b).map(norm);
    return asArray(a).some((x) => right.includes(norm(x)));
  },

  contains: (a, b) => asArray(a).map(norm).includes(norm(b)),

  textMatchesAny: (a, b) => {
    const terms = asArray(b)
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean);

    return asArray(a).some((text) =>
      terms.some((term) => String(text).toLowerCase().includes(term)),
    );
  },
};

const isRef = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  typeof v.ref === "string";

const evaluateCondition = (condition, facts) => {
  const test = OPERATORS[condition.op];

  if (!test) {
    throw new Error(`Unknown rule operator: ${condition.op}`);
  }

  const left = getPath(facts, condition.field);

  const right = isRef(condition.value)
    ? getPath(facts, condition.value.ref)
    : condition.value;

  return test(left, right);
};

const conditionsHold = (conditions = [], facts) =>
  conditions.every((condition) => evaluateCondition(condition, facts));

export const runRules = (rules, foods, baseFacts) => {
  const ordered = rules
    .filter((r) => r.active !== false)
    .sort((a, b) => a.priority - b.priority);

  const applied = ordered.filter((r) => conditionsHold(r.when, baseFacts));

  const notTriggered = ordered.filter((r) => !applied.includes(r));

  const filterRules = applied.filter((r) => r.type === "filter");

  const scoreRules = applied.filter((r) => r.type === "score");

  const kept = [];
  const excluded = [];

  for (const food of foods) {
    const facts = {
      ...baseFacts,
      food,
    };

    const blockedBy = filterRules.find((rule) =>
      conditionsHold(rule.match, facts),
    );

    if (blockedBy) {
      excluded.push({
        food,
        rule: blockedBy,
      });
      continue;
    }

    let score = 0;
    const fired = [];

    for (const rule of scoreRules) {
      if (conditionsHold(rule.match, facts)) {
        score += rule.weight;

        fired.push({
          key: rule.key,
          name: rule.name,
          points: rule.weight,
          reason: rule.reason,
        });
      }
    }

    kept.push({
      food,
      score,
      fired,
    });
  }

  return {
    kept,
    excluded,
    applied,
    notTriggered,
  };
};
