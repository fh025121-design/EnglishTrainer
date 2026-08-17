(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.EnglishTrainerGrammarData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const unitCatalog = [
    { id: 1, label: "Unit 1", title: "be動詞", icon: "🟦", description: "am / is / are の基本", enabled: true },
    { id: 2, label: "Unit 2", title: "一般動詞（1・2人称）", icon: "🎯", description: "一般動詞の基本", enabled: true },
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
      pointSummaryContent: {
        mainPoint: "be動詞は am / is / are を使います。",
        table: [
          { key: "I", value: "am" },
          { key: "you", value: "are" },
          { key: "he / she / it", value: "is" },
          { key: "複数", value: "are" }
        ],
        examples: [
          {
            label: "肯定文",
            english: "I am a student.",
            japanese: "私は生徒です。"
          },
          {
            label: "否定文",
            english: "I am not a student.",
            japanese: "be動詞の後ろに not",
            highlight: "not"
          },
          {
            label: "疑問文",
            english: "Are you a student?",
            japanese: "be動詞を主語の前へ",
            highlight: "Are"
          }
        ],
        noteHighlight: "be動詞"
      },
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
          inputHint: "入力する",
          point: "I → am"
        },
        {
          id: "r2",
          type: "fill",
          english: "You are late.",
          japanese: "あなたは遅いです。",
          prompt: "You ___ late.\n空欄に入る語を入力",
          answers: ["are"],
          inputHint: "入力する",
          point: "you → are"
        },
        {
          id: "r3",
          type: "fill",
          english: "The dogs are outside.",
          japanese: "その犬たちは外にいます。",
          prompt: "The dogs ___ outside.\n空欄に入る語を入力",
          answers: ["are"],
          inputHint: "入力する",
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
    },
    2: {
      unitId: 2,
      id: 2,
      title: "一般動詞（1・2人称）",
      intro: "一般動詞の意味と基本形を確認して、肯定・否定・疑問の使い分けを覚えます。",
      pointSummary: [
        "POINT",
        "・一般動詞は「動作」や「状態」を表す。",
        "・I / You ＋ 一般動詞",
        "・I play tennis. You like music.",
        "・否定文は do not / don't ＋ 動詞の原形",
        "・疑問文は Do ＋ I / you ＋ 動詞の原形 ～?",
        "・Do ～? で聞かれたら do / don't で答える",
        "・What ＋ 名詞 ＋ do you ＋ 動詞 ～?"
      ].join("\n"),
      pointSummaryContent: {
        mainPoint: "一般動詞は「動作」や「状態」を表す。",
        table: [
          { key: "I / You", value: "一般動詞" },
          { key: "否定", value: "do not / don't" },
          { key: "疑問", value: "Do" },
          { key: "答え方", value: "do / don't" }
        ],
        examples: [
          {
            label: "肯定文",
            english: "I play tennis.",
            japanese: "私はテニスをします。"
          },
          {
            label: "否定文",
            english: "I do not like music.",
            japanese: "音楽が好きではありません。",
            highlight: "not"
          },
          {
            label: "疑問文",
            english: "Do you like music?",
            japanese: "音楽が好きですか。",
            highlight: "Do"
          }
        ],
        noteHighlight: "一般動詞"
      },
      pointQuestions: [
        {
          id: "p1",
          type: "fill",
          prompt: "I play tennis.\n私はテニスを［　　　］。\nひらがなで入力",
          japanese: "私はテニスをします。",
          answers: ["します", "する"],
          inputHint: "ひらがな",
          point: "一般動詞は動作や状態を表す。"
        },
        {
          id: "p2",
          type: "fill",
          prompt: "私は音楽が好きです。\nI [　　　] music.\n英語で入力",
          japanese: "私は音楽が好きです。",
          answers: ["like"],
          inputHint: "英語",
          point: "I / you ＋ 一般動詞"
        },
        {
          id: "p3",
          type: "fill",
          prompt: "I have a dog.\n私は犬を［　　　　　］。\nひらがなで入力",
          japanese: "私は犬をかっています。",
          answers: ["かっています", "かっている"],
          inputHint: "ひらがな",
          point: "have：「持っている」「飼っている」など"
        },
        {
          id: "p4",
          type: "fill",
          prompt: "私はサッカーをします。\nI [　　　] soccer.\n英語で入力",
          japanese: "私はサッカーをします。",
          answers: ["play"],
          inputHint: "英語",
          point: "play ＋ スポーツ名：～をする"
        },
        {
          id: "p5",
          type: "fill",
          prompt: "私はピアノを弾きます。\nI [　　　] the piano.\n英語で入力",
          japanese: "私はピアノを弾きます。",
          answers: ["play"],
          inputHint: "英語",
          point: "play ＋ the ＋ 楽器名：～を演奏する"
        }
      ],
      practiceQuestions: [
        {
          id: "r1",
          type: "fill",
          english: "I play tennis.",
          japanese: "私はテニスをします。",
          prompt: "私はギターを弾きます。\nI [　　　] the guitar.\n英語で入力",
          answers: ["play"],
          inputHint: "英語",
          point: "一般動詞の基本"
        },
        {
          id: "r2",
          type: "fill",
          english: "You have a nice pen.",
          japanese: "あなたはすてきなペンを持っています。",
          prompt: "あなたはすてきなペンを持っています。\nYou [　　　] a nice pen.\n英語で入力",
          answers: ["have"],
          inputHint: "英語",
          point: "have は持っている"
        },
        {
          id: "r3",
          type: "fill",
          english: "I like baseball.",
          japanese: "私は野球が好きです。",
          prompt: "私は野球が好きです。\nI [　　　] baseball.\n英語で入力",
          answers: ["like"],
          inputHint: "英語",
          point: "like は好む"
        },
        {
          id: "r4",
          type: "fill",
          english: "You play the flute.",
          japanese: "あなたはフルートを演奏します。",
          prompt: "あなたはフルートを演奏します。\nYou [　　　] the flute.\n英語で入力",
          answers: ["play"],
          inputHint: "英語",
          point: "play ＋ the ＋ 楽器名"
        },
        {
          id: "r5",
          type: "fill",
          english: "I like math.",
          japanese: "私は数学が好きです。",
          prompt: "私は数学が好きです。\nI [　　　] math.\n英語で入力",
          answers: ["like"],
          inputHint: "英語",
          point: "like は好む"
        },
        {
          id: "r6",
          type: "fill",
          english: "I have a pet.",
          japanese: "私はペットを飼っています。",
          prompt: "私はペットを飼っています。\nI [　　　] a pet.\n英語で入力",
          answers: ["have"],
          inputHint: "英語",
          point: "have は飼っている"
        },
        {
          id: "r7",
          type: "fill",
          english: "I study English every day.",
          japanese: "私は毎日英語を勉強します。",
          prompt: "私は毎日英語を勉強します。\nI [　　　] English every day.\n英語で入力",
          answers: ["study"],
          inputHint: "英語",
          point: "study は勉強する"
        },
        {
          id: "r8",
          type: "fill",
          english: "I use a computer.",
          japanese: "私はコンピューターを使います。",
          prompt: "私はコンピューターを使います。\nI [　　　] a computer.\n英語で入力",
          answers: ["use"],
          inputHint: "英語",
          point: "use は使う"
        },
        {
          id: "r9",
          type: "fill",
          english: "We do not play video games.",
          japanese: "私たちはテレビゲームをしません。",
          prompt: "私たちはテレビゲームをしません。\nWe [　　　] [　　　] play video games.\n英語で入力",
          answers: ["do", "not"],
          inputHint: "英語",
          point: "否定文は do not / don't"
        },
        {
          id: "r10",
          type: "fill",
          english: "I don't have a dictionary.",
          japanese: "私は辞書を持っていません。",
          prompt: "私は辞書を持っていません。\nI [　　　　　] have a dictionary.\n英語で入力",
          answers: ["don't"],
          inputHint: "英語",
          point: "don't は do not の短縮形"
        },
        {
          id: "r11",
          type: "fill",
          english: "Do you like tennis?",
          japanese: "あなたはテニスが好きですか。",
          prompt: "あなたはテニスが好きですか。\n[　　　] you like tennis?\n英語で入力",
          answers: ["Do"],
          inputHint: "英語",
          point: "疑問文の先頭は Do"
        },
        {
          id: "r12",
          type: "fill",
          english: "Do you have a pet?",
          japanese: "あなたはペットを飼っていますか。",
          prompt: "あなたはペットを飼っていますか。\n[　　　] you have a pet?\n英語で入力",
          answers: ["Do"],
          inputHint: "英語",
          point: "Do you ＋ 動詞の原形"
        },
        {
          id: "r13",
          type: "fill",
          english: "You don't like music.",
          japanese: "あなたは音楽が好きではありません。",
          prompt: "You like music.\n否定文にしよう。\n英語で入力",
          answers: ["You don't like music."],
          inputHint: "英語",
          point: "You ＋ don't ＋ 動詞の原形"
        },
        {
          id: "r14",
          type: "fill",
          english: "Do you like music?",
          japanese: "あなたは音楽が好きですか。",
          prompt: "You like music.\n疑問文にしよう。\n英語で入力",
          answers: ["Do you like music?"],
          inputHint: "英語",
          point: "Do ＋ you ＋ 動詞の原形"
        },
        {
          id: "r15",
          type: "fill",
          english: "You don't play tennis.",
          japanese: "あなたはテニスをしません。",
          prompt: "You play tennis.\n否定文にしよう。\n英語で入力",
          answers: ["You don't play tennis."],
          inputHint: "英語",
          point: "否定文は don't ＋ 動詞の原形"
        },
        {
          id: "r16",
          type: "fill",
          english: "Do you play tennis?",
          japanese: "あなたはテニスをしますか。",
          prompt: "You play tennis.\n疑問文にしよう。\n英語で入力",
          answers: ["Do you play tennis?"],
          inputHint: "英語",
          point: "Do を前に置く"
        },
        {
          id: "r17",
          type: "fill",
          english: "You don't have a dog.",
          japanese: "あなたは犬を飼っていません。",
          prompt: "You have a dog.\n否定文にしよう。\n英語で入力",
          answers: ["You don't have a dog."],
          inputHint: "英語",
          point: "have も don't で否定"
        },
        {
          id: "r18",
          type: "fill",
          english: "Do you have a dog?",
          japanese: "あなたは犬を飼っていますか。",
          prompt: "You have a dog.\n疑問文にしよう。\n英語で入力",
          answers: ["Do you have a dog?"],
          inputHint: "英語",
          point: "Do you have a dog?"
        }
      ],
      wordOrderQuestions: [
        {
          id: "w1",
          type: "reorder",
          english: "I study English every day.",
          japanese: "私は毎日英語を勉強します。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["English", "every", "day", "I", "study"],
          answers: ["I study English every day."],
          point: "I + study + English + every day"
        },
        {
          id: "w2",
          type: "reorder",
          english: "I play tennis.",
          japanese: "私はテニスをします。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["tennis", "play", "I"],
          answers: ["I play tennis."],
          point: "I + play + tennis"
        },
        {
          id: "w3",
          type: "reorder",
          english: "Do you like math?",
          japanese: "あなたは数学が好きですか。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["you", "math", "do", "like"],
          answers: ["Do you like math?"],
          point: "Do + you + like + math?"
        },
        {
          id: "w4",
          type: "reorder",
          english: "I don't have a computer.",
          japanese: "私はコンピューターを持っていません。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["a", "computer", "don't", "I", "have"],
          answers: ["I don't have a computer."],
          point: "I + don't + have + a computer"
        },
        {
          id: "w5",
          type: "reorder",
          english: "What sport do you like?",
          japanese: "あなたは何のスポーツが好きですか。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["sport", "you", "what", "do", "like"],
          answers: ["What sport do you like?"],
          point: "What + sport + do you like?"
        },
        {
          id: "w6",
          type: "reorder",
          english: "What instrument do you play?",
          japanese: "あなたは何の楽器を演奏しますか。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["instrument", "play", "what", "you", "do"],
          answers: ["What instrument do you play?"],
          point: "What + instrument + do you play?"
        },
        {
          id: "w7",
          type: "reorder",
          english: "What do you want for your birthday?",
          japanese: "あなたは誕生日に何が欲しいですか。",
          prompt: "語順を整えて英語を完成させましょう。",
          words: ["for", "your", "birthday", "what", "do", "you", "want"],
          answers: ["What do you want for your birthday?"],
          point: "What + do you want + for your birthday?"
        }
      ],
      sentenceQuestions: [
        {
          id: "s1",
          type: "sentence",
          japanese: "私は音楽が好きです。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["I like music."],
          inputHint: "英語で全文入力",
          point: "I like music."
        },
        {
          id: "s2",
          type: "sentence",
          japanese: "私は本を持っています。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["I have a book."],
          inputHint: "英語で全文入力",
          point: "I have a book."
        },
        {
          id: "s3",
          type: "sentence",
          japanese: "私はサッカーをします。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["I play soccer."],
          inputHint: "英語で全文入力",
          point: "I play soccer."
        },
        {
          id: "s4",
          type: "sentence",
          japanese: "私はスポーツが好きではありません。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["I don't like sports."],
          inputHint: "英語で全文入力",
          point: "I don't like sports."
        },
        {
          id: "s5",
          type: "sentence",
          japanese: "私たちはテレビゲームをしません。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["We don't play video games."],
          inputHint: "英語で全文入力",
          point: "We don't play video games."
        },
        {
          id: "s6",
          type: "sentence",
          japanese: "あなたはテニスが好きですか。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["Do you like tennis?"],
          inputHint: "英語で全文入力",
          point: "Do you like tennis?"
        },
        {
          id: "s7",
          type: "sentence",
          japanese: "あなたは英語を話しますか。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["Do you speak English?"],
          inputHint: "英語で全文入力",
          point: "Do you speak English?"
        },
        {
          id: "s8",
          type: "sentence",
          japanese: "あなたは何のスポーツが好きですか。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["What sport do you like?"],
          inputHint: "英語で全文入力",
          point: "What sport do you like?"
        },
        {
          id: "s9",
          type: "sentence",
          japanese: "あなたは何の教科が好きですか。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["What subject do you like?"],
          inputHint: "英語で全文入力",
          point: "What subject do you like?"
        },
        {
          id: "s10",
          type: "sentence",
          japanese: "あなたは何の楽器を演奏しますか。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["What instrument do you play?"],
          inputHint: "英語で全文入力",
          point: "What instrument do you play?"
        },
        {
          id: "s11",
          type: "sentence",
          japanese: "あなたは音楽が好きではありません。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["You don't like music."],
          inputHint: "英語で全文入力",
          point: "You don't like music."
        },
        {
          id: "s12",
          type: "sentence",
          japanese: "あなたは犬を飼っていますか。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["Do you have a dog?"],
          inputHint: "英語で全文入力",
          point: "Do you have a dog?"
        },
        {
          id: "s13",
          type: "sentence",
          japanese: "あなたは誕生日に何が欲しいですか。",
          prompt: "日本語を英語に書きましょう。",
          answers: ["What do you want for your birthday?"],
          inputHint: "英語で全文入力",
          point: "What do you want for your birthday?"
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
