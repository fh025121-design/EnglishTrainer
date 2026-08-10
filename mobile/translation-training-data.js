(function () {
  const questions = [
    {
      id: 1,
      english: "I went to the library / because I needed a book.",
      japanese: "本が必要だったので、私は図書館へ行きました。",
      parts: [
        {
          text: "I went to the library",
          selections: [
            {
              key: "subject",
              prompt: "主語",
              correctIndex: 0,
              options: [
                "私は",
                "彼は",
                "彼女は"
              ]
            },
            {
              key: "verb",
              prompt: "動詞",
              correctIndex: 0,
              options: [
                "行きました",
                "帰りました",
                "読みました"
              ]
            }
          ]
        },
        {
          text: "because I needed a book",
          selections: [
            {
              key: "reason",
              prompt: "理由",
              correctIndex: 1,
              options: [
                "本が必要だったので",
                "本を読んだあと",
                "本を借りるために"
              ]
            }
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
          selections: [
            {
              key: "subject",
              prompt: "主語",
              correctIndex: 2,
              options: [
                "彼女は",
                "彼は",
                "私は"
              ]
            },
            {
              key: "state",
              prompt: "状態",
              correctIndex: 0,
              options: [
                "家にいました",
                "学校へ行きました",
                "家を出ました"
              ]
            }
          ]
        },
        {
          text: "because she was tired",
          selections: [
            {
              key: "reason",
              prompt: "理由",
              correctIndex: 1,
              options: [
                "元気だったので",
                "疲れていたので",
                "勉強したあと"
              ]
            }
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
          selections: [
            {
              key: "noun",
              prompt: "名詞句",
              correctIndex: 0,
              options: [
                "私の宿題",
                "私の仕事",
                "私の家族"
              ]
            },
            {
              key: "connector",
              prompt: "接続表現",
              correctIndex: 0,
              options: [
                "終えたあとで",
                "終えた前に",
                "始めたあとで"
              ]
            }
          ]
        },
        {
          text: "I watched TV",
          selections: [
            {
              key: "verb",
              prompt: "動詞",
              correctIndex: 1,
              options: [
                "見ます",
                "見ました",
                "見たいです"
              ]
            }
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
          selections: [
            {
              key: "time",
              prompt: "時制",
              correctIndex: 2,
              options: [
                "家を出る前に",
                "学校にいる間",
                "家に帰ったとき"
              ]
            }
          ]
        },
        {
          text: "my mother was cooking dinner",
          selections: [
            {
              key: "action",
              prompt: "動作",
              correctIndex: 2,
              options: [
                "夕食を食べました",
                "買い物に行きました",
                "夕食を作っていました"
              ]
            }
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
          selections: [
            {
              key: "adjective",
              prompt: "形容詞",
              correctIndex: 2,
              options: [
                "簡単でした",
                "忘れました",
                "難しかったです"
              ]
            }
          ]
        },
        {
          text: "but I answered it",
          selections: [
            {
              key: "connector",
              prompt: "接続",
              correctIndex: 2,
              options: [
                "だから私は答えませんでした",
                "そして私は質問しました",
                "しかし私はそれに答えました"
              ]
            }
          ]
        }
      ]
    }
  ];

  function getTranslationTrainingQuestions() {
    return questions.map((question) => ({
      ...question,
      parts: question.parts.map((part) => ({
        ...part,
        selections: Array.isArray(part.selections)
          ? part.selections.map((selection) => ({
            ...selection,
            prompt: selection.prompt || "",
            correctIndex: Number.isInteger(selection.correctIndex) ? selection.correctIndex : 0,
            options: Array.isArray(selection.options) ? [...selection.options] : []
          }))
          : []
      }))
    }));
  }

  function getTranslationTrainingQuestion(index) {
    const questionsData = getTranslationTrainingQuestions();
    const normalizedIndex = Math.max(1, Math.floor(Number(index) || 1)) - 1;
    return questionsData[Math.max(0, Math.min(normalizedIndex, questionsData.length - 1))] || null;
  }

  function buildTranslationTrainingEnglishDisplaySegments(question, currentPartIndex = 0) {
    const safeQuestion = question && typeof question === "object" ? question : null;
    if (!safeQuestion) return [];
    const englishText = String(safeQuestion.english || "");
    const parts = Array.isArray(safeQuestion.parts) ? safeQuestion.parts : [];
    const slashParts = englishText.split("/").map((part) => part.trim());

    if (!slashParts.length) return [];

    return slashParts.map((segment, index) => {
      const isCurrent = index === currentPartIndex;
      const isCompleted = index < currentPartIndex;
      let state = "pending";
      if (isCurrent) {
        state = "current";
      } else if (isCompleted) {
        state = "completed";
      }
      return {
        text: segment,
        state
      };
    });
  }

  const exported = {
    getTranslationTrainingQuestions,
    getTranslationTrainingQuestion,
    buildTranslationTrainingEnglishDisplaySegments
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (typeof window !== "undefined") {
    window.translationTrainingData = exported;
  }
})();
