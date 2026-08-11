const LEVEL_QUESTION_WEIGHTS = {
  1: 50,
  2: 30,
  3: 15,
  4: 5
};

function getLevelWeight(item) {
  return LEVEL_QUESTION_WEIGHTS[item.level] || 1;
}

function weightedSampleWithoutReplacement(pool, count) {
  const available = pool.slice();
  const picked = [];
  const targetCount = Math.max(0, Math.min(count, available.length));

  while (picked.length < targetCount && available.length) {
    const totalWeight = available.reduce((sum, item) => sum + getLevelWeight(item), 0);
    let cursor = Math.random() * totalWeight;
    let selectedIndex = available.length - 1;

    for (let index = 0; index < available.length; index += 1) {
      cursor -= getLevelWeight(available[index]);
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }

    picked.push(available.splice(selectedIndex, 1)[0]);
  }

  return picked;
}

function runAnswerStream(items, totalAnswers) {
  const unique = new Set();
  const levelHits = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const sessions = Math.ceil(totalAnswers / 10);

  for (let s = 0; s < sessions; s += 1) {
    const batch = weightedSampleWithoutReplacement(items, 10);
    for (const q of batch) {
      if (unique.size >= totalAnswers) break;
      unique.add(q.id);
      levelHits[q.level] += 1;
    }
  }

  return {
    uniqueCount: unique.size,
    levelHits
  };
}

function buildItemsByDistribution(dist) {
  const items = [];
  let cursor = 1;
  for (const [levelStr, count] of Object.entries(dist)) {
    const level = Number(levelStr);
    for (let i = 0; i < count; i += 1) {
      items.push({ id: `q${cursor}`, level });
      cursor += 1;
    }
  }
  return items;
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function simulateScenario(name, dist, answerPoints, trials = 2000) {
  const items = buildItemsByDistribution(dist);
  const out = {
    scenario: name,
    poolSize: items.length,
    dist,
    points: {}
  };

  for (const answers of answerPoints) {
    const uniques = [];
    const hitSamples = [];

    for (let t = 0; t < trials; t += 1) {
      const result = runAnswerStream(items, answers);
      uniques.push(result.uniqueCount);
      hitSamples.push(result.levelHits);
    }

    const avgHits = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const hs of hitSamples) {
      avgHits[1] += hs[1];
      avgHits[2] += hs[2];
      avgHits[3] += hs[3];
      avgHits[4] += hs[4];
    }
    avgHits[1] /= trials;
    avgHits[2] /= trials;
    avgHits[3] /= trials;
    avgHits[4] /= trials;

    out.points[answers] = {
      avgUnique: avg(uniques),
      minUnique: Math.min(...uniques),
      maxUnique: Math.max(...uniques),
      avgLevelHits: avgHits,
      avgLevelHitRatio: {
        1: avgHits[1] / answers,
        2: avgHits[2] / answers,
        3: avgHits[3] / answers,
        4: avgHits[4] / answers
      }
    };
  }

  return out;
}

const answerPoints = [100, 150, 500, 1000, 3000];

const scenarios = [
  {
    name: 'A_all_same_level1',
    dist: { 1: 1000, 2: 0, 3: 0, 4: 0 }
  },
  {
    name: 'A_all_same_level2',
    dist: { 1: 0, 2: 1000, 3: 0, 4: 0 }
  },
  {
    name: 'A_all_same_level3',
    dist: { 1: 0, 2: 0, 3: 1000, 4: 0 }
  },
  {
    name: 'A_all_same_level4',
    dist: { 1: 0, 2: 0, 3: 0, 4: 1000 }
  },
  {
    name: 'B_like_current_review_only_assumption',
    // 画面値から未学習552を除いた review.records 想定（合計448）
    dist: { 1: 174, 2: 166, 3: 95, 4: 13 }
  }
];

const results = scenarios.map((s) => simulateScenario(s.name, s.dist, answerPoints, 2000));
console.log(JSON.stringify(results, null, 2));
