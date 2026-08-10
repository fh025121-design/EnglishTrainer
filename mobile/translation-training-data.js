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
          fixedPhrases: ["彼女は"],
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
          fixedPhrases: ["終えた"],
          selectionGroups: [
            {
              key: "after-subject",
              correctIndex: 0,
              options: [
                "あとで・私は",
                "まえに・私は",
                "あいだに・私は"
              ]
            },
            {
              key: "object",
              prompt: "目的語",
              correctIndex: 0,
              options: [
                "宿題を",
                "テレビを",
                "買い物を"
              ]
            }
          ]
        },
        {
          text: "I watched TV",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "subject",
              prompt: "主語",
              correctIndex: 0,
              options: [
                "私は",
                "彼は",
                "私たちは"
              ]
            },
            {
              key: "verb",
              prompt: "動詞",
              correctIndex: 1,
              options: [
                "見ます",
                "見ました",
                "見ることができます"
              ]
            },
            {
              key: "object",
              prompt: "目的語",
              correctIndex: 0,
              options: [
                "テレビを",
                "映画を",
                "本を"
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
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "when-subject",
              prompt: "接続",
              correctIndex: 0,
              options: [
                "とき・私は",
                "まえに・私は",
                "あいだに・私は"
              ]
            },
            {
              key: "verb",
              prompt: "動詞",
              correctIndex: 0,
              options: [
                "帰った",
                "帰る",
                "帰れる"
              ]
            },
            {
              key: "place",
              prompt: "場所",
              correctIndex: 0,
              options: [
                "家に",
                "学校に",
                "公園に"
              ]
            }
          ]
        },
        {
          text: "my mother was cooking dinner",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "subject",
              prompt: "主語",
              correctIndex: 0,
              options: [
                "母は",
                "父は",
                "私は"
              ]
            },
            {
              key: "action",
              prompt: "動作",
              correctIndex: 0,
              options: [
                "作っていました",
                "作りました",
                "作ります"
              ]
            },
            {
              key: "object",
              prompt: "目的語",
              correctIndex: 0,
              options: [
                "夕食を",
                "朝食を",
                "お弁当を"
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
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "connector-subject",
              prompt: "接続",
              correctIndex: 0,
              options: [
                "しかし・私は",
                "だから・私は",
                "そして・私は"
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
            },
            {
              key: "object",
              prompt: "目的語",
              correctIndex: 0,
              options: [
                "それに",
                "これに",
                "そのことに"
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
      sequence.push({ type: "column", group: selectionGroups[0], groupIndex: 0 });
      return sequence;
    }
    selectionGroups.forEach((group, index) => {
      sequence.push({ type: "column", group, groupIndex: index });
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
