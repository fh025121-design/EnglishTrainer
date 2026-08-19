(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.irregularVerbs = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const defaultIrregularVerbTrainingBank = [
    { id: 'be', base: 'be', past: ['was', 'were'], pastParticiple: 'been', japanese: '～である、いる' },
    { id: 'become', base: 'become', past: 'became', pastParticiple: 'become', japanese: '～になる' },
    { id: 'begin', base: 'begin', past: 'began', pastParticiple: 'begun', japanese: '始める' },
    { id: 'break', base: 'break', past: 'broke', pastParticiple: 'broken', japanese: '壊す' },
    { id: 'bring', base: 'bring', past: 'brought', pastParticiple: 'brought', japanese: '持ってくる' },
    { id: 'build', base: 'build', past: 'built', pastParticiple: 'built', japanese: '建てる' },
    { id: 'buy', base: 'buy', past: 'bought', pastParticiple: 'bought', japanese: '買う' },
    { id: 'catch', base: 'catch', past: 'caught', pastParticiple: 'caught', japanese: '捕まえる' },
    { id: 'choose', base: 'choose', past: 'chose', pastParticiple: 'chosen', japanese: '選ぶ' },
    { id: 'come', base: 'come', past: 'came', pastParticiple: 'come', japanese: '来る' },
    { id: 'cut', base: 'cut', past: 'cut', pastParticiple: 'cut', japanese: '切る' },
    { id: 'do', base: 'do', past: 'did', pastParticiple: 'done', japanese: 'する' },
    { id: 'draw', base: 'draw', past: 'drew', pastParticiple: 'drawn', japanese: '描く' },
    { id: 'drink', base: 'drink', past: 'drank', pastParticiple: 'drunk', japanese: '飲む' },
    { id: 'drive', base: 'drive', past: 'drove', pastParticiple: 'driven', japanese: '運転する' },
    { id: 'eat', base: 'eat', past: 'ate', pastParticiple: 'eaten', japanese: '食べる' },
    { id: 'fall', base: 'fall', past: 'fell', pastParticiple: 'fallen', japanese: '落ちる' },
    { id: 'feel', base: 'feel', past: 'felt', pastParticiple: 'felt', japanese: '感じる' },
    { id: 'find', base: 'find', past: 'found', pastParticiple: 'found', japanese: '見つける' },
    { id: 'fly', base: 'fly', past: 'flew', pastParticiple: 'flown', japanese: '飛ぶ' },
    { id: 'forget', base: 'forget', past: 'forgot', pastParticiple: 'forgotten', japanese: '忘れる' },
    { id: 'get', base: 'get', past: 'got', pastParticiple: ['got', 'gotten'], japanese: '得る' },
    { id: 'give', base: 'give', past: 'gave', pastParticiple: 'given', japanese: '与える' },
    { id: 'go', base: 'go', past: 'went', pastParticiple: 'gone', japanese: '行く' },
    { id: 'grow', base: 'grow', past: 'grew', pastParticiple: 'grown', japanese: '育つ' },
    { id: 'have', base: 'have', past: 'had', pastParticiple: 'had', japanese: '持っている' },
    { id: 'hear', base: 'hear', past: 'heard', pastParticiple: 'heard', japanese: '聞く' },
    { id: 'hold', base: 'hold', past: 'held', pastParticiple: 'held', japanese: '持つ' },
    { id: 'keep', base: 'keep', past: 'kept', pastParticiple: 'kept', japanese: '保つ' },
    { id: 'know', base: 'know', past: 'knew', pastParticiple: 'known', japanese: '知っている' },
    { id: 'leave', base: 'leave', past: 'left', pastParticiple: 'left', japanese: '去る' },
    { id: 'lose', base: 'lose', past: 'lost', pastParticiple: 'lost', japanese: '失う' },
    { id: 'make', base: 'make', past: 'made', pastParticiple: 'made', japanese: '作る' },
    { id: 'meet', base: 'meet', past: 'met', pastParticiple: 'met', japanese: '会う' },
    { id: 'pay', base: 'pay', past: 'paid', pastParticiple: 'paid', japanese: '支払う' },
    { id: 'put', base: 'put', past: 'put', pastParticiple: 'put', japanese: '置く' },
    { id: 'read', base: 'read', past: 'read', pastParticiple: 'read', japanese: '読む' },
    { id: 'ride', base: 'ride', past: 'rode', pastParticiple: 'ridden', japanese: '乗る' },
    { id: 'run', base: 'run', past: 'ran', pastParticiple: 'run', japanese: '走る' },
    { id: 'say', base: 'say', past: 'said', pastParticiple: 'said', japanese: '言う' },
    { id: 'see', base: 'see', past: 'saw', pastParticiple: 'seen', japanese: '見る' },
    { id: 'sell', base: 'sell', past: 'sold', pastParticiple: 'sold', japanese: '売る' },
    { id: 'send', base: 'send', past: 'sent', pastParticiple: 'sent', japanese: '送る' },
    { id: 'sing', base: 'sing', past: 'sang', pastParticiple: 'sung', japanese: '歌う' },
    { id: 'sit', base: 'sit', past: 'sat', pastParticiple: 'sat', japanese: '座る' },
    { id: 'sleep', base: 'sleep', past: 'slept', pastParticiple: 'slept', japanese: '眠る' },
    { id: 'speak', base: 'speak', past: 'spoke', pastParticiple: 'spoken', japanese: '話す' },
    { id: 'spend', base: 'spend', past: 'spent', pastParticiple: 'spent', japanese: '費やす' },
    { id: 'stand', base: 'stand', past: 'stood', pastParticiple: 'stood', japanese: '立つ' },
    { id: 'swim', base: 'swim', past: 'swam', pastParticiple: 'swum', japanese: '泳ぐ' },
    { id: 'take', base: 'take', past: 'took', pastParticiple: 'taken', japanese: '取る' },
    { id: 'teach', base: 'teach', past: 'taught', pastParticiple: 'taught', japanese: '教える' },
    { id: 'tell', base: 'tell', past: 'told', pastParticiple: 'told', japanese: '伝える' },
    { id: 'think', base: 'think', past: 'thought', pastParticiple: 'thought', japanese: '思う' },
    { id: 'understand', base: 'understand', past: 'understood', pastParticiple: 'understood', japanese: '理解する' },
    { id: 'wear', base: 'wear', past: 'wore', pastParticiple: 'worn', japanese: '着ている' },
    { id: 'win', base: 'win', past: 'won', pastParticiple: 'won', japanese: '勝つ' },
    { id: 'write', base: 'write', past: 'wrote', pastParticiple: 'written', japanese: '書く' },
    { id: 'hit', base: 'hit', past: 'hit', pastParticiple: 'hit', japanese: '打つ' },
    { id: 'let', base: 'let', past: 'let', pastParticiple: 'let', japanese: '～させる' },
    { id: 'show', base: 'show', past: 'showed', pastParticiple: 'shown', japanese: '見せる' },
    { id: 'wake', base: 'wake', past: 'woke', pastParticiple: 'woken', japanese: '目を覚ます' },
    { id: 'steal', base: 'steal', past: 'stole', pastParticiple: 'stolen', japanese: '盗む' },
    { id: 'throw', base: 'throw', past: 'threw', pastParticiple: 'thrown', japanese: '投げる' },
    { id: 'mean', base: 'mean', past: 'meant', pastParticiple: 'meant', japanese: '意味する' }
  ];

  function sanitizeVerb(value) {
    if (!value || typeof value !== 'object') return null;
    const normalizeArrayOrString = (entry) => {
      if (Array.isArray(entry)) {
        return entry.map((item) => String(item || '').trim()).filter(Boolean);
      }
      return String(entry || '').trim();
    };
    return {
      id: String(value.id || value.base || '').trim(),
      base: String(value.base || '').trim(),
      past: normalizeArrayOrString(value.past),
      pastParticiple: normalizeArrayOrString(value.pastParticiple),
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

  function normalizeAnswerSlot(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value
        .map((entry) => normalizeAnswerText(entry))
        .filter(Boolean);
    }
    return [normalizeAnswerText(value)].filter(Boolean);
  }

  function buildAnswerCandidates(question, form) {
    const normalizedForm = String(form || '').trim().toLowerCase();
    const base = normalizeAnswerText(question?.base || '');
    const past = normalizeAnswerSlot(question?.past || '');
    const participle = normalizeAnswerSlot(question?.pastParticiple || '');
    const variants = [];
    if (normalizedForm === 'base') {
      variants.push(base);
      if (base) variants.push(base.replace(/\s+/g, ''));
    } else if (normalizedForm === 'past') {
      past.forEach((item) => variants.push(item));
    } else if (normalizedForm === 'pastparticiple' || normalizedForm === 'past participle' || normalizedForm === 'pp') {
      participle.forEach((item) => variants.push(item));
    } else if (normalizedForm === 'combined') {
      const pastVariants = past.length ? past : [normalizeAnswerText(question?.past || '')].filter(Boolean);
      const participleVariants = participle.length ? participle : [normalizeAnswerText(question?.pastParticiple || '')].filter(Boolean);
      pastVariants.forEach((pastVariant) => {
        participleVariants.forEach((participleVariant) => {
          variants.push(`${pastVariant} ${participleVariant}`);
        });
      });
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
    if (String(form || '').trim().toLowerCase() === 'combined') {
      const parts = answerText.split(/\s+/).filter(Boolean);
      if (parts.length !== 2) return false;
      const [pastAnswer, participleAnswer] = parts;
      const pastVariants = normalizeAnswerSlot(normalizedQuestion.past || '');
      const participleVariants = normalizeAnswerSlot(normalizedQuestion.pastParticiple || '');
      if (!pastVariants.length || !participleVariants.length) return false;
      return pastVariants.includes(pastAnswer) && participleVariants.includes(participleAnswer);
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
