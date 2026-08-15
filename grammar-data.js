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
      unitId: 1,
      id: 1,
      title: "be動詞",
      intro: "be動詞の基本を確認して、短い文で使い方を定着させます。",
      pointSummary: [
        "POINT",
        "・be動詞は am / is / are",
        "・I → am",
        "・you → are",
        "・三人称単数 → is",
        "・複数 → are",
        "・否定文は be動詞の後ろに not",
        "・疑問文は be動詞を主語の前へ"
      ].join("\n"),
      pointQuestions: [
        {
          id: "p1",
          type: "fill",
          prompt: "I am a student.\n私は生徒［　　　］。\nひらがなで入力",
          japanese: "私は生徒です。",
          answers: ["です", "だ"],
          inputHint: "ひらがな",
          point: "be動詞は am / is / are を使います。"
        },
        {
          id: "p2",
          type: "fill",
          prompt: "She is in the kitchen.\n彼女は台所［　　　］。\nひらがなで入力",
          japanese: "彼女は台所にいます。",
          answers: ["にいます", "にいる"],
          inputHint: "ひらがな",
          point: "三人称単数は is を使います。"
        },
        {
          id: "p3",
          type: "fill",
          prompt: "My book is on the desk.\n私の本は机の上［　　　］。\nひらがなで入力",
          japanese: "私の本は机の上にあります。",
          answers: ["にあります", "にある"],
          inputHint: "ひらがな",
          point: "be動詞は「～にいる」「～にある」などの状態や位置を表します。"
        }
      ],
      practiceQuestions: [
        {
          id: "r1",
          type: "fill",
          english: "I am tired.",
          japanese: "私は疲れています。",
          prompt: "I ___ tired.\n空欄に入る語を入力",
          answers: ["am"],
          inputHint: "be動詞",
          point: "I → am"
        },
        {
          id: "r2",
          type: "fill",
          english: "You are late.",
          japanese: "あなたは遅いです。",
          prompt: "You ___ late.\n空欄に入る語を入力",
          answers: ["are"],
          inputHint: "be動詞",
          point: "you → are"
        },
        {
          id: "r3",
          type: "fill",
          english: "The dogs are outside.",
          japanese: "その犬たちは外にいます。",
          prompt: "The dogs ___ outside.\n空欄に入る語を入力",
          answers: ["are"],
          inputHint: "be動詞",
          point: "複数 → are"
        }
      ],
      wordOrderQuestions: [
        {
          id: "w1",
          type: "reorder",
          english: "I am a student.",
          japanese: "私は生徒です。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["I", "am", "a", "student."],
          answers: ["I am a student."],
          point: "be動詞の基本形を使う"
        },
        {
          id: "w2",
          type: "reorder",
          english: "She is at home.",
          japanese: "彼女は家にいます。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["She", "is", "at", "home."],
          answers: ["She is at home."],
          point: "三人称単数は is"
        }
      ],
      sentenceQuestions: [
        {
          id: "s1",
          type: "sentence",
          japanese: "私は先生です。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["I am a teacher."],
          inputHint: "英語で全文入力",
          point: "I → am"
        },
        {
          id: "s2",
          type: "sentence",
          japanese: "彼は忙しいです。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["He is busy."],
          inputHint: "英語で全文入力",
          point: "He → is"
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
    const lesson = lessonsByUnitId[id];
    if (!lesson) return null;

    const clonedLesson = { ...lesson };
    if (Array.isArray(lesson.pointGroups)) {
      clonedLesson.pointGroups = lesson.pointGroups.map((group) => ({
        ...group,
        questions: Array.isArray(group.questions) ? group.questions.map((question) => ({ ...question })) : []
      }));
    }
    if (Array.isArray(lesson.pointQuestions)) {
      clonedLesson.pointQuestions = lesson.pointQuestions.map((question) => ({ ...question }));
    }
    if (Array.isArray(lesson.practiceQuestions)) {
      clonedLesson.practiceQuestions = lesson.practiceQuestions.map((question) => ({ ...question }));
    }
    if (Array.isArray(lesson.wordOrderQuestions)) {
      clonedLesson.wordOrderQuestions = lesson.wordOrderQuestions.map((question) => ({ ...question }));
    }
    if (Array.isArray(lesson.sentenceQuestions)) {
      clonedLesson.sentenceQuestions = lesson.sentenceQuestions.map((question) => ({ ...question }));
    }

    return clonedLesson;
  }

  return {
    getGrammarUnitCatalog,
    getGrammarUnitById,
    getGrammarLessonByUnitId
  };
});
