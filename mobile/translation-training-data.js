(function () {
  const questions = [
    {
      id: 1,
      english: "I went to the library / because I needed a book.",
      japanese: "本が必要だったので、私は図書館へ行きました。",
      parts: [
        {
          text: "I went to the library",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "verb",
              prompt: "動詞",
              correctIndex: 0,
              options: [
                "行った",
                "行く",
                "行くことができる"
              ]
            },
            {
              key: "destination",
              prompt: "目的地",
              correctIndex: 0,
              options: [
                "図書館に",
                "博物館に"
              ]
            }
          ]
        },
        {
          text: "because I needed a book",
          fixedPhrases: ["本が", "必要だったので"],
          selectionGroups: [
            {
              key: "reason",
              prompt: "理由",
              correctIndex: 0,
              options: [
                "必要だったので",
                "必要なので",
                "欲しかったので"
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
          fixedPhrases: ["彼女は"],
          selectionGroups: [
            {
              key: "state",
              prompt: "状態",
              correctIndex: 0,
              options: [
                "家にいた",
                "家にいる",
                "家に帰った"
              ]
            }
          ]
        },
        {
          text: "because she was tired",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "reason",
              prompt: "理由",
              correctIndex: 0,
              options: [
                "疲れていたので",
                "疲れているので",
                "疲れるだろうから"
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
          fixedPhrases: ["私は", "宿題を"],
          selectionGroups: [
            {
              key: "connector",
              correctIndex: 0,
              options: [
                "終えたあとで",
                "終える前に",
                "終えている間"
              ]
            }
          ]
        },
        {
          text: "I watched TV",
          fixedPhrases: ["私は", "テレビを"],
          selectionGroups: [
            {
              key: "verb",
              prompt: "動詞",
              correctIndex: 1,
              options: [
                "見ます",
                "見ました",
                "見ることができます"
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
          fixedPhrases: ["私は", "家に"],
          selectionGroups: [
            {
              key: "time",
              prompt: "時制",
              correctIndex: 0,
              options: [
                "帰ったとき",
                "帰るとき",
                "帰る前に"
              ]
            }
          ]
        },
        {
          text: "my mother was cooking dinner",
          fixedPhrases: ["母は", "夕食を"],
          selectionGroups: [
            {
              key: "action",
              prompt: "動作",
              correctIndex: 0,
              options: [
                "作っていました",
                "作りました",
                "作ります"
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
          fixedPhrases: ["この問題は"],
          selectionGroups: [
            {
              key: "adjective",
              prompt: "形容詞",
              correctIndex: 0,
              options: [
                "難しかったです",
                "難しいです",
                "難しくなるでしょう"
              ]
            }
          ]
        },
        {
          text: "but I answered it",
          fixedPhrases: ["私は", "それに"],
          selectionGroups: [
            {
              key: "connector",
              prompt: "接続",
              correctIndex: 0,
              options: [
                "しかし",
                "だから",
                "そして"
              ]
            },
            {
              key: "verb",
              prompt: "動詞",
              correctIndex: 0,
              options: [
                "答えました",
                "答えます",
                "答えませんでした"
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

  function createTranslationTrainingState(questions = []) {
    return {
      questions: Array.isArray(questions) ? questions : [],
      questionIndex: 0,
      currentPartIndex: 0,
      completedParts: [],
      currentSelectionIndex: 0,
      completedSelections: [],
      builtJapanese: "",
      answeredGroupKeys: [],
      partSelections: {}
    };
  }

  function resetTranslationTrainingQuestionState(training = {}) {
    if (!training || typeof training !== "object") return training;
    return {
      ...training,
      currentPartIndex: 0,
      completedParts: [],
      currentSelectionIndex: 0,
      completedSelections: [],
      builtJapanese: "",
      answeredGroupKeys: [],
      partSelections: {}
    };
  }

  function getTranslationTrainingDisplayFixedPhrases(part) {
    const safePart = part && typeof part === "object" ? part : null;
    if (!safePart) return [];
    const fixedPhrases = Array.isArray(safePart.fixedPhrases) ? safePart.fixedPhrases.filter(Boolean) : [];
    const selectableTexts = (safePart.selectionGroups || []).flatMap((group) => Array.isArray(group?.options) ? group.options.filter(Boolean) : []);
    const excludedSet = new Set(selectableTexts.map((text) => String(text).trim()));
    return fixedPhrases.filter((phrase) => !excludedSet.has(String(phrase).trim()));
  }

  function buildTranslationTrainingLayoutSequence(part, fixedPhrases = []) {
    const safePart = part && typeof part === "object" ? part : null;
    const selectionGroups = Array.isArray(safePart?.selectionGroups) ? safePart.selectionGroups : [];
    const displayFixedPhrases = Array.isArray(fixedPhrases) ? fixedPhrases.filter(Boolean) : [];
    const sequence = [];
    if (!selectionGroups.length) return sequence;
    if (selectionGroups.length <= 1) {
      if (displayFixedPhrases.length) {
        sequence.push({ type: "fixed", phrases: displayFixedPhrases });
      }
      sequence.push({ type: "column", group: selectionGroups[0] });
      return sequence;
    }
    selectionGroups.forEach((group, index) => {
      sequence.push({ type: "column", group });
      if (index < selectionGroups.length - 1 && displayFixedPhrases.length) {
        sequence.push({ type: "fixed", phrases: displayFixedPhrases });
      }
    });
    return sequence;
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
        state,
        marker: isCurrent ? "▶" : ""
      };
    });
  }

  function getTranslationTrainingCardDisplayState({ isCorrect = false } = {}) {
    return {
      marker: isCorrect ? "○" : "×",
      state: isCorrect ? "correct" : "incorrect"
    };
  }

  const exported = {
    getTranslationTrainingQuestions,
    getTranslationTrainingQuestion,
    createTranslationTrainingState,
    resetTranslationTrainingQuestionState,
    getTranslationTrainingDisplayFixedPhrases,
    buildTranslationTrainingLayoutSequence,
    buildTranslationTrainingEnglishDisplaySegments,
    getTranslationTrainingCardDisplayState
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (typeof window !== "undefined") {
    window.translationTrainingData = exported;
  }
})();
