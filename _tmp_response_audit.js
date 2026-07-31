global.window = {};
require('./response-data.js');
const items = window.responseTrainingBank || [];

const contractionPairs = [
  ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"],
  ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"],
  ["haven't", "have not"], ["hasn't", "has not"], ["hadn't", "had not"],
  ["won't", "will not"], ["can't", "cannot"], ["can't", "can not"],
  ["couldn't", "could not"], ["shouldn't", "should not"], ["wouldn't", "would not"],
  ["mustn't", "must not"], ["needn't", "need not"]
];

function has(set, v){ return set.has(String(v).toLowerCase()); }

const findings = [];

for (const it of items){
  const ans = Array.isArray(it.answer) ? it.answer.map(a => String(a).trim()) : [];
  const ansSet = new Set(ans.map(a => a.toLowerCase()));
  const q = String(it.question || '');
  const first = ans[0] || '';
  const second = ans[1] || '';

  for (const [a,b] of contractionPairs){
    const hasA = has(ansSet, a);
    const hasB = has(ansSet, b);
    if (hasA && !hasB) findings.push({id: it.id, current: ans.join(' / '), alt: b, reason: `短縮形 ${a} の展開形`});
    if (hasB && !hasA) findings.push({id: it.id, current: ans.join(' / '), alt: a, reason: `展開形 ${b} の短縮形`});
  }

  const subjLike = /subject|class|club|team|color|kind|type|sport|movie|book|teacher|student/i.test(q);
  const whBlank = q.includes('(      )') && ans.length >= 2 && /^[A-Z][a-z]+$/.test(first);
  if (subjLike && whBlank && (first === 'What' || first === 'Which')) {
    const alt = first === 'What' ? `Which ${second}` : `What ${second}`;
    findings.push({id: it.id, current: `${first} ${second}`, alt, reason: 'What/Which は文脈により学校英語で許容されることがある'});
  }

  if (/^Must\s/i.test(q)) {
    if (ansSet.has('must') && !ansSet.has('have to')) {
      findings.push({id: it.id, current: ans.join(' / '), alt: 'have to', reason: '義務の肯定応答で must と have to は実質同義で許容されることがある'});
    }
  }

  if (/^Can\s/i.test(q) && ansSet.has('can') && !ansSet.has('am able to') && !ansSet.has('be able to')) {
    findings.push({id: it.id, current: ans.join(' / '), alt: 'am able to / be able to', reason: '能力表現で can の言い換えが成立する場合がある'});
  }
}

const uniq = [];
const seen = new Set();
for (const f of findings){
  const k = `${f.id}|${f.current}|${f.alt}|${f.reason}`;
  if (seen.has(k)) continue;
  seen.add(k);
  uniq.push(f);
}

uniq.sort((a,b)=>a.id.localeCompare(b.id));
console.log(JSON.stringify({count: uniq.length, findings: uniq}, null, 2));
