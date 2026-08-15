(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.EnglishTrainerGrammarData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const unitCatalog = [
    { id: 1, label: "Unit 1", title: "be動詞", icon: "🟦", description: "am / is / are の基本", enabled: true },
    { id: 2, label: "Unit 2", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 3, label: "Unit 3", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 4, label: "Unit 4", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 5, label: "Unit 5", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 6, label: "Unit 6", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 7, label: "Unit 7", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 8, label: "Unit 8", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 9, label: "Unit 9", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 10, label: "Unit 10", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 11, label: "Unit 11", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 12, label: "Unit 12", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 13, label: "Unit 13", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 14, label: "Unit 14", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 15, label: "Unit 15", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 16, label: "Unit 16", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 17, label: "Unit 17", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 18, label: "Unit 18", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 19, label: "Unit 19", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 20, label: "Unit 20", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false },
    { id: 21, label: "Unit 21", title: "準備中", icon: "🛠️", description: "今後追加予定", enabled: false }
  ];

  const lessonsByUnitId = {
    1: {
      id: 1,
      title: "be動詞",
      pointText: "be動詞は am / is / are を使います。\n\n主語によって形が変わるので、\n主語と一緒に覚えましょう。",
      pointQuestions: [
        {
          prompt: "I am a student.\n私は生徒［　　　］。\nひらがなで入力",
          answer: "です／だ",
          pointText: "be動詞は am / is / are を使います。\n\n主語によって形が変わるので、\n主語と一緒に覚えましょう。",
          explanation: "I am ... は「私は～です」などと訳す。"
        },
        {
          prompt: "She is in the kitchen.\n彼女は台所［　　　］。\nひらがなで入力",
          answer: "にいます／にいる",
          pointText: "be動詞は am / is / are を使います。\n\n主語によって形が変わるので、\n主語と一緒に覚えましょう。",
          explanation: "be動詞 + in the kitchen は「～にいる」と訳す。"
        },
        {
          prompt: "My book is on the desk.\n私の本は机の上［　　　］。\nひらがなで入力",
          answer: "にあります／にある",
          pointText: "be動詞は am / is / are を使います。\n\n主語によって形が変わるので、\n主語と一緒に覚えましょう。",
          explanation: "be動詞 + on the desk は「～の上にある」と訳す。"
        }
      ],
      basicQuestions: [
        {
          prompt: "I ___ a student.",
          choices: ["am", "is", "are"],
          answer: "am",
          explanation: "I には am を使います。"
        },
        {
          prompt: "She ___ kind.",
          choices: ["am", "is", "are"],
          answer: "is",
          explanation: "She には is を使います。"
        },
        {
          prompt: "We ___ happy.",
          choices: ["am", "is", "are"],
          answer: "are",
          explanation: "We には are を使います。"
        }
      ],
      wordOrderQuestions: [
        {
          prompt: "語順を整えて、英文を完成させましょう。",
          words: ["I", "am", "a", "student"],
          answer: "I am a student."
        },
        {
          prompt: "語順を整えて、英文を完成させましょう。",
          words: ["They", "are", "in", "the", "classroom"],
          answer: "They are in the classroom."
        }
      ],
      sentenceQuestions: [
        {
          prompt: "私は日本人です。",
          answer: "I am Japanese.",
          explanation: "日本語の意味に合わせて be動詞を使います。"
        },
        {
          prompt: "彼は先生です。",
          answer: "He is a teacher.",
          explanation: "He には is を使います。"
        }
      ]
    }
  };

  function getGrammarUnitCatalog() {
    return unitCatalog.map((unit) => ({ ...unit }));
  }

  function getGrammarUnitById(unitId) {
    const id = Number(unitId);
    return getGrammarUnitCatalog().find((unit) => Number(unit.id) === id) || null;
  }

  function getGrammarLessonByUnitId(unitId) {
    const id = Number(unitId);
    return lessonsByUnitId[id] ? {
      ...lessonsByUnitId[id],
      pointQuestions: [...(lessonsByUnitId[id].pointQuestions || [])],
      basicQuestions: [...(lessonsByUnitId[id].basicQuestions || [])],
      wordOrderQuestions: [...(lessonsByUnitId[id].wordOrderQuestions || [])],
      sentenceQuestions: [...(lessonsByUnitId[id].sentenceQuestions || [])]
    } : null;
  }

  return {
    getGrammarUnitCatalog,
    getGrammarUnitById,
    getGrammarLessonByUnitId
  };
});
