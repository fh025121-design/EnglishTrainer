(function () {
  const questions = [
    {
      id: 1,
      english: "I went to the library / because I needed a book.",
      japanese: "本が必要だったので、私は図書館へ行きました。",
      parts: [
        {
          text: "I went to the library",
          correctIndex: 0,
          options: [
            "私は図書館へ行きました",
            "私は図書館から帰りました",
            "私は本を読みました"
          ]
        },
        {
          text: "because I needed a book",
          correctIndex: 1,
          options: [
            "本を読んだあと",
            "本が必要だったので",
            "本を借りるために"
          ]
        }
      ]
    },
    {
      id: 2,
      english: "She stayed at home / because she was tired.",
      japanese: "疲れていたので、彼女は家にいました。",
      parts: [
        {
          text: "She stayed at home",
          correctIndex: 2,
          options: [
            "彼女は学校へ行きました",
            "彼女は家を出ました",
            "彼女は家にいました"
          ]
        },
        {
          text: "because she was tired",
          correctIndex: 1,
          options: [
            "元気だったので",
            "疲れていたので",
            "勉強したあと"
          ]
        }
      ]
    },
    {
      id: 3,
      english: "After I finished my homework, / I watched TV.",
      japanese: "宿題を終えたあと、私はテレビを見ました。",
      parts: [
        {
          text: "After I finished my homework",
          correctIndex: 2,
          options: [
            "宿題を始める前に",
            "宿題をしている間",
            "宿題を終えたあと"
          ]
        },
        {
          text: "I watched TV",
          correctIndex: 1,
          options: [
            "私はテレビを消しました",
            "私はテレビを見ました",
            "私は勉強しました"
          ]
        }
      ]
    },
    {
      id: 4,
      english: "When I got home, / my mother was cooking dinner.",
      japanese: "私が家に帰ったとき、母は夕食を作っていました。",
      parts: [
        {
          text: "When I got home",
          correctIndex: 2,
          options: [
            "私が家を出る前に",
            "私が学校にいる間",
            "私が家に帰ったとき"
          ]
        },
        {
          text: "my mother was cooking dinner",
          correctIndex: 2,
          options: [
            "母は夕食を食べました",
            "母は買い物に行きました",
            "母は夕食を作っていました"
          ]
        }
      ]
    },
    {
      id: 5,
      english: "This question was difficult, / but I answered it.",
      japanese: "この問題は難しかったですが、私はそれに答えました。",
      parts: [
        {
          text: "This question was difficult",
          correctIndex: 2,
          options: [
            "この問題は簡単でした",
            "この問題を忘れました",
            "この問題は難しかったです"
          ]
        },
        {
          text: "but I answered it",
          correctIndex: 2,
          options: [
            "だから私は答えませんでした",
            "そして私は質問しました",
            "しかし私はそれに答えました"
          ]
        }
      ]
    }
  ];

  function getTranslationTrainingQuestions() {
    return questions.map((question) => ({
      ...question,
      parts: question.parts.map((part) => ({ ...part, options: [...part.options], correctIndex: Number.isInteger(part.correctIndex) ? part.correctIndex : 0 }))
    }));
  }

  function getTranslationTrainingQuestion(index) {
    const questionsData = getTranslationTrainingQuestions();
    const normalizedIndex = Math.max(1, Math.floor(Number(index) || 1)) - 1;
    return questionsData[Math.max(0, Math.min(normalizedIndex, questionsData.length - 1))] || null;
  }

  const exported = {
    getTranslationTrainingQuestions,
    getTranslationTrainingQuestion
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (typeof window !== "undefined") {
    window.translationTrainingData = exported;
  }
})();
