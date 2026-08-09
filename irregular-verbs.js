(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.irregularVerbs = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const defaultIrregularVerbTrainingBank = [
    { id: 'go', base: 'go', past: 'went', pastParticiple: 'gone', japanese: '行く' },
    { id: 'eat', base: 'eat', past: 'ate', pastParticiple: 'eaten', japanese: '食べる' },
    { id: 'see', base: 'see', past: 'saw', pastParticiple: 'seen', japanese: '見る' },
    { id: 'come', base: 'come', past: 'came', pastParticiple: 'come', japanese: '来る' },
    { id: 'take', base: 'take', past: 'took', pastParticiple: 'taken', japanese: '取る' },
    { id: 'make', base: 'make', past: 'made', pastParticiple: 'made', japanese: '作る' },
    { id: 'know', base: 'know', past: 'knew', pastParticiple: 'known', japanese: '知る' },
    { id: 'give', base: 'give', past: 'gave', pastParticiple: 'given', japanese: '与える' },
    { id: 'find', base: 'find', past: 'found', pastParticiple: 'found', japanese: '見つける' },
    { id: 'write', base: 'write', past: 'wrote', pastParticiple: 'written', japanese: '書く' },
    { id: 'speak', base: 'speak', past: 'spoke', pastParticiple: 'spoken', japanese: '話す' },
    { id: 'break', base: 'break', past: 'broke', pastParticiple: 'broken', japanese: '壊す' }
  ];

  function sanitizeVerb(value) {
    if (!value || typeof value !== 'object') return null;
    return {
      id: String(value.id || value.base || '').trim(),
      base: String(value.base || '').trim(),
      past: String(value.past || '').trim(),
      pastParticiple: String(value.pastParticiple || '').trim(),
      japanese: String(value.japanese || value.meaning || '').trim()
    };
  }

  function normalizeAnswerText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, ' ')
      .replace(/[^a-z0-9\s/]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildAnswerCandidates(question, form) {
    const normalizedForm = String(form || '').trim().toLowerCase();
    const base = normalizeAnswerText(question?.base || '');
    const past = normalizeAnswerText(question?.past || '');
    const participle = normalizeAnswerText(question?.pastParticiple || '');
    const variants = [];
    if (normalizedForm === 'base') {
      variants.push(base);
      if (base) variants.push(base.replace(/\s+/g, ''));
    } else if (normalizedForm === 'past') {
      variants.push(past);
      if (past) variants.push(past.replace(/\s+/g, ''));
    } else if (normalizedForm === 'pastparticiple' || normalizedForm === 'past participle' || normalizedForm === 'pp') {
      variants.push(participle);
      if (participle) variants.push(participle.replace(/\s+/g, ''));
    }
    return Array.from(new Set(variants.filter(Boolean)));
  }

  function evaluateIrregularVerbAnswer(question, form, rawAnswer) {
    const normalizedQuestion = sanitizeVerb(question);
    if (!normalizedQuestion) return false;
    const candidates = buildAnswerCandidates(normalizedQuestion, form);
    if (!candidates.length) return false;
    const answerText = normalizeAnswerText(rawAnswer);
    if (!answerText) return false;
    if (answerText.includes('/')) {
      return answerText.split('/').map((part) => normalizeAnswerText(part)).some((part) => candidates.includes(part));
    }
    return candidates.includes(answerText);
  }

  function buildIrregularVerbQuestionSet(verbs, count, options = {}) {
    const source = Array.isArray(verbs) ? verbs.map(sanitizeVerb).filter(Boolean) : [];
    const stats = options.stats && typeof options.stats === 'object' ? options.stats : {};
    const preferredQuestionIds = Array.isArray(options.preferredQuestionIds)
      ? options.preferredQuestionIds.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const targetCount = Math.max(1, Math.min(count || source.length, source.length));
    const scored = source.map((verb) => {
      const stat = stats[String(verb.id)] || null;
      const attempts = Math.max(0, Number(stat?.attempts) || 0);
      const correct = Math.max(0, Number(stat?.correct) || 0);
      const accuracy = attempts > 0 ? correct / attempts : 0;
      const score = attempts === 0 ? 1000 : (accuracy < 0.7 ? 1000 : 100) - attempts;
      return { verb, score };
    });
    scored.sort((left, right) => {
      const leftPreferred = preferredQuestionIds.includes(String(left.verb.id));
      const rightPreferred = preferredQuestionIds.includes(String(right.verb.id));
      if (leftPreferred !== rightPreferred) return leftPreferred ? -1 : 1;
      if (left.score !== right.score) return right.score - left.score;
      return left.verb.id.localeCompare(right.verb.id);
    });
    return scored.slice(0, targetCount).map((entry) => entry.verb);
  }

  function getIrregularVerbPromptLabel(question, form) {
    const normalizedQuestion = sanitizeVerb(question);
    if (!normalizedQuestion) return '';
    const baseLabel = normalizedQuestion.base || normalizedQuestion.id || '';
    const normalizedForm = String(form || '').trim().toLowerCase();
    if (normalizedForm === 'pastparticiple' || normalizedForm === 'past participle' || normalizedForm === 'pp') {
      return `${baseLabel} → 過去分詞`;
    }
    if (normalizedForm === 'past') {
      return `${baseLabel} → 過去形`;
    }
    return `${baseLabel} → 基本形`;
  }

  function getIrregularVerbSessionPlan(mode, form) {
    const normalizedMode = String(mode || '').trim().toLowerCase();
    const normalizedForm = String(form || '').trim().toLowerCase();
    if (normalizedMode === 'test') {
      return {
        mode: 'test',
        form: normalizedForm || 'past',
        questionCount: 20,
        label: 'テスト'
      };
    }
    return {
      mode: 'training',
      form: normalizedForm || 'past',
      questionCount: 10,
      label: '特訓'
    };
  }

  const api = {
    sanitizeVerb,
    buildAnswerCandidates,
    evaluateIrregularVerbAnswer,
    buildIrregularVerbQuestionSet,
    getIrregularVerbPromptLabel,
    getIrregularVerbSessionPlan
  };

  const runtimeRoot = typeof globalThis !== 'undefined' ? globalThis : this;
  runtimeRoot.irregularVerbTrainingBank = Array.isArray(runtimeRoot.irregularVerbTrainingBank) && runtimeRoot.irregularVerbTrainingBank.length
    ? runtimeRoot.irregularVerbTrainingBank
    : defaultIrregularVerbTrainingBank;

  return api;
}));
