(function () {
  const questions = [
    {
      id: 1,
      level: "A",
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
      level: "A",
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
      level: "A",
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
          fixedPhrases: ["私は"],
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
      level: "A",
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
          fixedPhrases: ["母は"],
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
      level: "A",
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
    },
    {
      id: 6,
      level: "A",
      english: "I heard that / Ken visited his grandmother yesterday.",
      japanese: "私は、ケンが昨日祖母を訪ねたと聞きました。",
      parts: [
        {
          text: "I heard that",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "heard",
              prompt: "動詞",
              correctIndex: 0,
              options: ["聞いた", "思った", "尋ねた"]
            },
            {
              key: "that",
              prompt: "接続",
              correctIndex: 0,
              options: ["～ということを", "～ので", "～のあと"]
            }
          ]
        },
        {
          text: "Ken visited his grandmother yesterday.",
          fixedPhrases: ["ケンが"],
          selectionGroups: [
            {
              key: "visited",
              prompt: "動詞",
              correctIndex: 0,
              options: ["訪ねた", "訪ねる", "訪ねる予定だ"]
            },
            {
              key: "grandmother",
              prompt: "目的語",
              correctIndex: 0,
              options: ["昨日祖母を", "祖母に昨日", "祖母と昨日"]
            }
          ]
        }
      ]
    },
    {
      id: 7,
      level: "A",
      english: "When I got home, / my mother was cooking dinner.",
      japanese: "私が家に帰ったとき、母は夕食を作っていました。",
      parts: [
        {
          text: "When I got home",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "when-i",
              prompt: "接続",
              correctIndex: 0,
              options: ["～したとき私は", "～する前に私は", "～している間私は"]
            },
            {
              key: "got-home",
              prompt: "動詞",
              correctIndex: 0,
              options: ["帰った", "帰る", "帰る予定だった"]
            },
            {
              key: "home",
              prompt: "場所",
              correctIndex: 0,
              options: ["家に", "学校に", "図書館に"]
            }
          ]
        },
        {
          text: "my mother was cooking dinner.",
          fixedPhrases: ["母は"],
          selectionGroups: [
            {
              key: "cooking",
              prompt: "動詞",
              correctIndex: 0,
              options: ["作っていた", "作った", "作るつもりだった"]
            },
            {
              key: "dinner",
              prompt: "目的語",
              correctIndex: 0,
              options: ["夕食を", "朝食を", "昼食を"]
            }
          ]
        }
      ]
    },
    {
      id: 8,
      level: "A",
      english: "I stayed home / because it was raining.",
      japanese: "雨が降っていたので、私は家にいました。",
      parts: [
        {
          text: "I stayed home",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "stayed",
              prompt: "動詞",
              correctIndex: 0,
              options: ["いた", "行った", "帰った"]
            },
            {
              key: "home",
              prompt: "場所",
              correctIndex: 0,
              options: ["家に", "学校に", "駅に"]
            }
          ]
        },
        {
          text: "because it was raining.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "because",
              prompt: "接続",
              correctIndex: 0,
              options: ["なぜなら", "だから", "それでも"]
            },
            {
              key: "rain-subject",
              prompt: "主語",
              correctIndex: 0,
              options: ["雨が", "雪が", "風が"]
            },
            {
              key: "raining",
              prompt: "動詞",
              correctIndex: 0,
              options: ["降っていたから", "降るだろうから", "降っていなかったから"]
            }
          ]
        }
      ]
    },
    {
      id: 9,
      level: "B",
      english: "Mai went to a bookstore / to buy a book about animals, / but she couldn't find one.",
      japanese: "マイは動物についての本を買うために本屋へ行きましたが、見つけることができませんでした。",
      parts: [
        {
          text: "Mai went to a bookstore",
          fixedPhrases: ["マイは"],
          selectionGroups: [
            {
              key: "went",
              prompt: "動詞",
              correctIndex: 0,
              options: ["行った", "行く", "行っている"]
            },
            {
              key: "bookstore",
              prompt: "場所",
              correctIndex: 0,
              options: ["本屋へ", "図書館へ", "公園へ"]
            }
          ]
        },
        {
          text: "to buy a book about animals,",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "purpose",
              prompt: "目的",
              correctIndex: 0,
              options: ["買うために", "読むために", "借りるために"]
            },
            {
              key: "book",
              prompt: "目的語",
              correctIndex: 0,
              options: ["本を", "雑誌を", "ノートを"]
            },
            {
              key: "about-animals",
              prompt: "修飾",
              correctIndex: 0,
              options: ["動物についての", "旅行についての", "音楽についての"]
            }
          ]
        },
        {
          text: "but she couldn't find one.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "but-she",
              prompt: "接続",
              correctIndex: 0,
              options: ["しかし彼女は", "だから彼女は", "そして彼女は"]
            },
            {
              key: "couldnt-find",
              prompt: "動詞",
              correctIndex: 0,
              options: ["見つけられなかった", "見つけられる", "見つけようとした"]
            },
            {
              key: "one",
              prompt: "代名詞",
              correctIndex: 0,
              options: ["それを", "それで", "そこを"]
            }
          ]
        }
      ]
    },
    {
      id: 10,
      level: "B",
      english: "I haven't seen my cousin / since he moved to Osaka, / so I want to visit him this summer.",
      japanese: "いとこが大阪へ引っ越して以来会っていないので、私はこの夏彼を訪ねたいです。",
      parts: [
        {
          text: "I haven't seen my cousin",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "havent-seen",
              prompt: "動詞",
              correctIndex: 0,
              options: ["会っていない", "会わなかった", "会うつもりはない"]
            },
            {
              key: "cousin",
              prompt: "目的語",
              correctIndex: 0,
              options: ["いとこに", "友達に", "先生に"]
            }
          ]
        },
        {
          text: "since he moved to Osaka,",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "since",
              prompt: "接続",
              correctIndex: 0,
              options: ["～して以来", "～する前に", "～したので"]
            },
            {
              key: "moved",
              prompt: "動詞",
              correctIndex: 0,
              options: ["彼が引っ越した", "彼が引っ越している", "彼が引っ越すだろう"]
            },
            {
              key: "osaka",
              prompt: "場所",
              correctIndex: 0,
              options: ["大阪へ", "京都へ", "神戸へ"]
            }
          ]
        },
        {
          text: "so I want to visit him this summer.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "so-i",
              prompt: "接続",
              correctIndex: 0,
              options: ["だから私は", "しかし私は", "それでも私は"]
            },
            {
              key: "want-visit",
              prompt: "動詞",
              correctIndex: 0,
              options: ["訪ねたい", "訪ねた", "訪ねている"]
            },
            {
              key: "him-summer",
              prompt: "目的語",
              correctIndex: 0,
              options: ["彼をこの夏に", "彼にこの夏", "彼とこの夏"]
            }
          ]
        }
      ]
    },
    {
      id: 11,
      level: "B",
      english: "When Yuki comes back from Canada, / she will show me / the pictures she took there.",
      japanese: "ユキがカナダから帰ってきたら、そこで撮った写真を私に見せてくれるでしょう。",
      parts: [
        {
          text: "When Yuki comes back from Canada",
          fixedPhrases: ["ユキが"],
          selectionGroups: [
            {
              key: "when",
              prompt: "接続",
              correctIndex: 0,
              options: ["～したとき", "～する前に", "～している間"]
            },
            {
              key: "comes-back",
              prompt: "動詞",
              correctIndex: 0,
              options: ["帰ってくる", "帰ってきた", "帰ってこない"]
            },
            {
              key: "from-canada",
              prompt: "場所",
              correctIndex: 0,
              options: ["カナダから", "アメリカから", "イギリスから"]
            }
          ]
        },
        {
          text: "she will show me",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "she",
              prompt: "主語",
              correctIndex: 0,
              options: ["彼女は", "彼は", "私は"]
            },
            {
              key: "will-show",
              prompt: "動詞",
              correctIndex: 0,
              options: ["見せるだろう", "見せた", "見せている"]
            },
            {
              key: "me",
              prompt: "目的語",
              correctIndex: 0,
              options: ["私に", "私を", "私と"]
            }
          ]
        },
        {
          text: "the pictures she took there.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "pictures",
              prompt: "目的語",
              correctIndex: 0,
              options: ["写真を", "手紙を", "本を"]
            },
            {
              key: "she-took",
              prompt: "節",
              correctIndex: 0,
              options: ["彼女が撮った", "彼女が撮る", "彼女が見た"]
            },
            {
              key: "there",
              prompt: "副詞",
              correctIndex: 0,
              options: ["そこで", "ここで", "あとで"]
            }
          ]
        }
      ]
    },
    {
      id: 12,
      level: "C",
      english: "Taku went to a sports shop / because he wanted to buy new soccer shoes. / He found a pair he liked, / but they were too expensive. / So he decided to save his money / and come back next month.",
      japanese: "タクは新しいサッカーシューズを買いたくてスポーツ店へ行きました。気に入ったものを見つけましたが、高すぎました。そこで、お金を貯めて来月また来ることにしました。",
      parts: [
        {
          text: "Taku went to a sports shop",
          fixedPhrases: ["タクは"],
          selectionGroups: [
            { key: "went", prompt: "動詞", correctIndex: 0, options: ["行った", "行く", "行っている"] },
            { key: "shop", prompt: "場所", correctIndex: 0, options: ["スポーツ店へ", "図書館へ", "学校へ"] }
          ]
        },
        {
          text: "because he wanted to buy new soccer shoes.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because-he", prompt: "接続", correctIndex: 0, options: ["なぜなら彼は", "しかし彼は", "だから彼は"] },
            { key: "wanted", prompt: "動詞", correctIndex: 0, options: ["買いたかった", "買っている", "買わなかった"] },
            { key: "shoes", prompt: "目的語", correctIndex: 0, options: ["新しいサッカーシューズを", "新しい帽子を", "新しい本を"] }
          ]
        },
        {
          text: "He found a pair he liked",
          fixedPhrases: [],
          selectionGroups: [
            { key: "he", prompt: "主語", correctIndex: 0, options: ["彼は", "彼女は", "私は"] },
            { key: "found", prompt: "動詞", correctIndex: 0, options: ["見つけた", "見つける", "見つけたい"] },
            { key: "pair", prompt: "目的語", correctIndex: 0, options: ["気に入った一足を", "高い一足を", "古い一足を"] }
          ]
        },
        {
          text: "but they were too expensive.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but-they", prompt: "接続", correctIndex: 0, options: ["しかしそれは", "だからそれは", "そしてそれは"] },
            { key: "expensive", prompt: "形容詞", correctIndex: 0, options: ["高すぎた", "安すぎた", "ちょうどよかった"] }
          ]
        },
        {
          text: "So he decided to save his money",
          fixedPhrases: [],
          selectionGroups: [
            { key: "so-he", prompt: "接続", correctIndex: 0, options: ["だから彼は", "しかし彼は", "それでも彼は"] },
            { key: "decided", prompt: "動詞", correctIndex: 0, options: ["～することに決めた", "～している", "～する必要がある"] },
            { key: "save-money", prompt: "目的", correctIndex: 0, options: ["お金を貯める", "お金を使う", "お金を借りる"] }
          ]
        },
        {
          text: "and come back next month.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "and", prompt: "接続", correctIndex: 0, options: ["そして", "しかし", "だから"] },
            { key: "come-back", prompt: "動詞", correctIndex: 0, options: ["また来る", "また行く", "また見る"] },
            { key: "next-month", prompt: "時", correctIndex: 0, options: ["来月", "昨日", "先週"] }
          ]
        }
      ]
    },
    {
      id: 13,
      level: "C",
      english: "Aya went to the library / to study for her English test. / When she was looking for a dictionary, / she met her old teacher. / Aya was very happy to see her / because they hadn't met for two years.",
      japanese: "アヤは英語のテスト勉強をするために図書館へ行きました。辞書を探していると昔の先生に会いました。二人は2年間会っていなかったので、アヤは先生に会えてとてもうれしかったです。",
      parts: [
        {
          text: "Aya went to the library",
          fixedPhrases: ["アヤは"],
          selectionGroups: [
            { key: "went", prompt: "動詞", correctIndex: 0, options: ["行った", "行く", "行っている"] },
            { key: "library", prompt: "場所", correctIndex: 0, options: ["図書館へ", "本屋へ", "公園へ"] }
          ]
        },
        {
          text: "to study for her English test.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "to-study", prompt: "目的", correctIndex: 0, options: ["勉強するために", "遊ぶために", "休むために"] },
            { key: "for-test", prompt: "前置詞", correctIndex: 0, options: ["英語のテストに向けて", "英語の先生のために", "英語の本について"] }
          ]
        },
        {
          text: "When she was looking for a dictionary,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "when-she", prompt: "接続", correctIndex: 0, options: ["～していたとき彼女が", "～する前に彼女が", "～してから彼女が"] },
            { key: "looking", prompt: "動詞", correctIndex: 0, options: ["探していた", "探した", "探すつもりだ"] },
            { key: "dictionary", prompt: "目的語", correctIndex: 0, options: ["辞書を", "ノートを", "時計を"] }
          ]
        },
        {
          text: "she met her old teacher.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "she", prompt: "主語", correctIndex: 0, options: ["彼女は", "彼は", "私は"] },
            { key: "met", prompt: "動詞", correctIndex: 0, options: ["会った", "会う", "会いたい"] },
            { key: "teacher", prompt: "目的語", correctIndex: 0, options: ["昔の先生に", "友達に", "母に"] }
          ]
        },
        {
          text: "Aya was very happy to see her",
          fixedPhrases: ["アヤは"],
          selectionGroups: [
            { key: "happy", prompt: "形容詞", correctIndex: 0, options: ["とてもうれしかった", "とても悲しかった", "とても疲れていた"] },
            { key: "to-see", prompt: "不定詞", correctIndex: 0, options: ["彼女に会えて", "彼女に会うために", "彼女に会わずに"] }
          ]
        },
        {
          text: "because they hadn't met for two years.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because-they", prompt: "接続", correctIndex: 0, options: ["なぜなら二人は", "しかし二人は", "だから二人は"] },
            { key: "hadnt-met", prompt: "動詞", correctIndex: 0, options: ["会っていなかった", "会っていた", "会うだろう"] },
            { key: "two-years", prompt: "期間", correctIndex: 0, options: ["2年間", "2日間", "2週間"] }
          ]
        }
      ]
    },
    {
      id: 14,
      level: "C",
      english: "Riku planned to play baseball / with his friends on Sunday. / But when he woke up, / it was raining heavily. / So they went to a sports center / and played basketball instead. / They had a great time there.",
      japanese: "リクは日曜日に友達と野球をする予定でした。しかし、起きると雨が激しく降っていました。そこでスポーツセンターへ行き、代わりにバスケットボールをしました。そこでとても楽しく過ごしました。",
      parts: [
        {
          text: "Riku planned to play baseball",
          fixedPhrases: ["リクは"],
          selectionGroups: [
            { key: "planned", prompt: "動詞", correctIndex: 0, options: ["～する予定だった", "～している", "～したくなかった"] },
            { key: "play-baseball", prompt: "目的", correctIndex: 0, options: ["野球をする", "サッカーをする", "勉強をする"] }
          ]
        },
        {
          text: "with his friends on Sunday.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "with-friends", prompt: "前置詞", correctIndex: 0, options: ["友達と", "先生と", "家族と"] },
            { key: "on-sunday", prompt: "時", correctIndex: 0, options: ["日曜日に", "土曜日に", "月曜日に"] }
          ]
        },
        {
          text: "But when he woke up,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but-when", prompt: "接続", correctIndex: 0, options: ["しかし～したとき", "だから～したとき", "そして～したとき"] },
            { key: "he-woke", prompt: "動詞", correctIndex: 0, options: ["彼が起きた", "彼が起きる", "彼が寝た"] }
          ]
        },
        {
          text: "it was raining heavily.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "rain-sub", prompt: "主語", correctIndex: 0, options: ["雨が", "雪が", "風が"] },
            { key: "heavily", prompt: "副詞", correctIndex: 0, options: ["激しく", "静かに", "ゆっくり"] },
            { key: "raining", prompt: "動詞", correctIndex: 0, options: ["降っていた", "降るだろう", "降っていない"] }
          ]
        },
        {
          text: "So they went to a sports center",
          fixedPhrases: [],
          selectionGroups: [
            { key: "so-they", prompt: "接続", correctIndex: 0, options: ["だから彼らは", "しかし彼らは", "そして彼らは"] },
            { key: "went2", prompt: "動詞", correctIndex: 0, options: ["行った", "行く", "戻った"] },
            { key: "center", prompt: "場所", correctIndex: 0, options: ["スポーツセンターへ", "図書館へ", "学校へ"] }
          ]
        },
        {
          text: "and played basketball instead.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "and", prompt: "接続", correctIndex: 0, options: ["そして", "しかし", "だから"] },
            { key: "played", prompt: "動詞", correctIndex: 0, options: ["バスケットボールをした", "バスケットボールを見る", "バスケットボールを習う"] },
            { key: "instead", prompt: "副詞", correctIndex: 0, options: ["代わりに", "すぐに", "いつも"] }
          ]
        },
        {
          text: "They had a great time there.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "they", prompt: "主語", correctIndex: 0, options: ["彼らは", "彼女は", "私は"] },
            { key: "great-time", prompt: "動詞", correctIndex: 0, options: ["とても楽しく過ごした", "とても疲れていた", "とても急いでいた"] },
            { key: "there", prompt: "副詞", correctIndex: 0, options: ["そこで", "ここで", "家で"] }
          ]
        }
      ]
    },
    {
      id: 15,
      level: "A",
      english: "I will give the present to my sister / tomorrow.",
      japanese: "私は明日、妹にプレゼントをあげるつもりです。",
      parts: [
        {
          text: "I will give the present to my sister",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "will-give",
              prompt: "動詞",
              correctIndex: 0,
              options: ["あげるつもりだ", "あげた", "あげている"]
            },
            {
              key: "present-to-sister",
              prompt: "目的語",
              correctIndex: 0,
              options: ["プレゼントを妹に", "プレゼントを友達に", "プレゼントを先生に"]
            }
          ]
        },
        {
          text: "tomorrow.",
          fixedPhrases: ["明日"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 16,
      level: "A",
      english: "My brother wants to visit Canada / next year.",
      japanese: "私の兄は来年カナダを訪れたいと思っています。",
      parts: [
        {
          text: "My brother wants to visit Canada",
          fixedPhrases: ["私の兄は"],
          selectionGroups: [
            {
              key: "wants-to-visit",
              prompt: "動詞",
              correctIndex: 0,
              options: ["訪れたい", "訪れた", "訪れなければならない"]
            },
            {
              key: "canada-object",
              prompt: "目的語",
              correctIndex: 0,
              options: ["カナダを", "アメリカを", "韓国を"]
            }
          ]
        },
        {
          text: "next year.",
          fixedPhrases: ["来年"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 17,
      level: "A",
      english: "We are going to play soccer / after school.",
      japanese: "私たちは放課後にサッカーをする予定です。",
      parts: [
        {
          text: "We are going to play soccer",
          fixedPhrases: ["私たちは"],
          selectionGroups: [
            {
              key: "be-going-to",
              prompt: "動詞",
              correctIndex: 0,
              options: ["サッカーをする予定だ", "サッカーをしていた", "サッカーをしなければならない"]
            }
          ]
        },
        {
          text: "after school.",
          fixedPhrases: ["放課後に"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 18,
      level: "A",
      english: "I haven't seen my uncle / for three years.",
      japanese: "私はおじに3年間会っていません。",
      parts: [
        {
          text: "I haven't seen my uncle",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "havent-seen-uncle",
              prompt: "動詞",
              correctIndex: 0,
              options: ["会っていない", "会わなかった", "会うつもりだ"]
            },
            {
              key: "uncle-object",
              prompt: "目的語",
              correctIndex: 0,
              options: ["おじに", "友達に", "先生に"]
            }
          ]
        },
        {
          text: "for three years.",
          fixedPhrases: ["3年間"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 19,
      level: "A",
      english: "Mika went to the library / to study English.",
      japanese: "ミカは英語を勉強するために図書館へ行きました。",
      parts: [
        {
          text: "Mika went to the library",
          fixedPhrases: ["ミカは"],
          selectionGroups: [
            {
              key: "went",
              prompt: "動詞",
              correctIndex: 0,
              options: ["行った", "行く", "行っている"]
            },
            {
              key: "library-destination",
              prompt: "場所",
              correctIndex: 0,
              options: ["図書館へ", "駅へ", "公園へ"]
            }
          ]
        },
        {
          text: "to study English.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "to-study",
              prompt: "不定詞",
              correctIndex: 0,
              options: ["勉強するために", "勉強した後で", "勉強している間に"]
            },
            {
              key: "english-object",
              prompt: "目的語",
              correctIndex: 0,
              options: ["英語を", "数学を", "理科を"]
            }
          ]
        }
      ]
    },
    {
      id: 20,
      level: "B",
      english: "I hear that / you are preparing for a school festival / with your classmates.",
      japanese: "あなたがクラスメートと学校祭の準備をしていると聞いています。",
      parts: [
        {
          text: "I hear that",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "hear",
              prompt: "動詞",
              correctIndex: 0,
              options: ["聞いている", "聞いた", "聞いていない"]
            },
            {
              key: "that-clause",
              prompt: "接続",
              correctIndex: 0,
              options: ["～ということを", "～する前に", "～したので"]
            }
          ]
        },
        {
          text: "you are preparing for a school festival",
          fixedPhrases: ["あなたが"],
          selectionGroups: [
            {
              key: "are-preparing",
              prompt: "時制",
              correctIndex: 0,
              options: ["準備している", "準備した", "準備するつもりだ"]
            },
            {
              key: "for-festival",
              prompt: "前置詞",
              correctIndex: 0,
              options: ["学校祭のために", "学校祭のあとで", "学校祭の近くで"]
            }
          ]
        },
        {
          text: "with your classmates.",
          fixedPhrases: ["クラスメートと"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 21,
      level: "B",
      english: "When I come back to Japan, / I will show you / the pictures I took in Australia.",
      japanese: "日本に帰ったら、オーストラリアで撮った写真をあなたに見せるつもりです。",
      parts: [
        {
          text: "When I come back to Japan,",
          fixedPhrases: ["私は"],
          layoutOrder: ["g0", "f0", "g1", "g2"],
          selectionGroups: [
            {
              key: "when-come-back",
              prompt: "接続",
              correctIndex: 0,
              options: ["～したら", "～する前に", "～している間"]
            },
            {
              key: "come-back",
              prompt: "動詞",
              correctIndex: 0,
              options: ["帰ってくる", "帰ってきた", "帰ってこない"]
            },
            {
              key: "to-japan",
              prompt: "場所",
              correctIndex: 0,
              options: ["日本へ", "カナダへ", "アメリカへ"]
            }
          ]
        },
        {
          text: "I will show you",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "will-show",
              prompt: "助動詞",
              correctIndex: 0,
              options: ["見せるつもりだ", "見せた", "見せている"]
            },
            {
              key: "to-you",
              prompt: "目的語",
              correctIndex: 0,
              options: ["あなたに", "あなたを", "あなたと"]
            }
          ]
        },
        {
          text: "the pictures I took in Australia.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "pictures",
              prompt: "目的語",
              correctIndex: 0,
              options: ["写真を", "手紙を", "地図を"]
            },
            {
              key: "i-took",
              prompt: "関係節",
              correctIndex: 0,
              options: ["私が撮った", "私が見る", "私が送った"]
            },
            {
              key: "in-australia",
              prompt: "前置詞",
              correctIndex: 0,
              options: ["オーストラリアで", "日本で", "カナダで"]
            }
          ]
        }
      ]
    },
    {
      id: 22,
      level: "B",
      english: "The bag was too expensive / for me to buy, / so I chose a cheaper one.",
      japanese: "そのバッグは私が買うには高すぎたので、もっと安いものを選びました。",
      parts: [
        {
          text: "The bag was too expensive",
          fixedPhrases: ["そのバッグは"],
          selectionGroups: [
            {
              key: "too-expensive",
              prompt: "形容詞",
              correctIndex: 0,
              options: ["高すぎた", "高くない", "ちょうどよかった"]
            }
          ]
        },
        {
          text: "for me to buy,",
          fixedPhrases: ["私が"],
          selectionGroups: [
            {
              key: "for-to-buy",
              prompt: "文構造",
              correctIndex: 0,
              options: ["買うには", "買ったので", "買っている間に"]
            }
          ]
        },
        {
          text: "so I chose a cheaper one.",
          fixedPhrases: ["だから私は"],
          selectionGroups: [
            {
              key: "chose",
              prompt: "動詞",
              correctIndex: 0,
              options: ["選んだ", "選ぶ", "選んでいる"]
            },
            {
              key: "cheaper-one",
              prompt: "代名詞",
              correctIndex: 0,
              options: ["もっと安いものを", "同じものを", "高いものを"]
            }
          ]
        }
      ]
    },
    {
      id: 23,
      level: "B",
      english: "After finishing her homework, / Emi helped her mother / make dinner.",
      japanese: "宿題を終えた後、エミは母が夕食を作るのを手伝いました。",
      parts: [
        {
          text: "After finishing her homework,",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "after-finishing",
              prompt: "接続",
              correctIndex: 0,
              options: ["終えた後", "終える前", "終えている間"]
            },
            {
              key: "homework",
              prompt: "目的語",
              correctIndex: 0,
              options: ["宿題を", "買い物を", "練習を"]
            }
          ]
        },
        {
          text: "Emi helped her mother",
          fixedPhrases: ["エミは"],
          selectionGroups: [
            {
              key: "helped",
              prompt: "動詞",
              correctIndex: 0,
              options: ["手伝った", "手伝う", "手伝っている"]
            },
            {
              key: "her-mother",
              prompt: "目的語",
              correctIndex: 0,
              options: ["母を", "姉を", "友達を"]
            }
          ]
        },
        {
          text: "make dinner.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "make-dinner",
              prompt: "文構造",
              correctIndex: 0,
              options: ["夕食を作るのを", "夕食を食べるのを", "夕食を買うのを"]
            }
          ]
        }
      ]
    },
    {
      id: 24,
      level: "B",
      english: "Yuta was happy to see his friend / because they hadn't met / for a long time.",
      japanese: "長い間会っていなかったので、ユウタは友達に会えてうれしかったです。",
      parts: [
        {
          text: "Yuta was happy to see his friend",
          fixedPhrases: ["ユウタは"],
          selectionGroups: [
            {
              key: "was-happy",
              prompt: "形容詞",
              correctIndex: 0,
              options: ["うれしかった", "悲しかった", "怒っていた"]
            },
            {
              key: "to-see-friend",
              prompt: "不定詞",
              correctIndex: 0,
              options: ["友達に会えて", "友達に会うために", "友達に会わずに"]
            }
          ]
        },
        {
          text: "because they hadn't met",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "because-they",
              prompt: "接続",
              correctIndex: 0,
              options: ["なぜなら二人は", "しかし二人は", "それでも二人は"]
            },
            {
              key: "hadnt-met",
              prompt: "時制",
              correctIndex: 0,
              options: ["会っていなかった", "会っていた", "会うだろう"]
            }
          ]
        },
        {
          text: "for a long time.",
          fixedPhrases: ["長い間"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 25,
      level: "C",
      english: "Miki went to a bookstore / to buy a birthday present for her friend. / When she got there, / she couldn't find the book she wanted. / But a store clerk showed her another book, / and she decided to buy it.",
      japanese: "ミキは友達への誕生日プレゼントを買うために本屋へ行きました。そこに着くと、欲しかった本を見つけることができませんでした。しかし、店員が別の本を見せてくれたので、それを買うことにしました。",
      parts: [
        {
          text: "Miki went to a bookstore",
          fixedPhrases: ["ミキは"],
          selectionGroups: [
            { key: "went", prompt: "動詞", correctIndex: 0, options: ["行った", "行く", "行っている"] },
            { key: "bookstore", prompt: "場所", correctIndex: 0, options: ["本屋へ", "図書館へ", "駅へ"] }
          ]
        },
        {
          text: "to buy a birthday present for her friend.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "to-buy", prompt: "不定詞", correctIndex: 0, options: ["買うために", "買ったあとで", "買っている間に"] },
            { key: "birthday-present", prompt: "目的語", correctIndex: 0, options: ["誕生日プレゼントを", "宿題を", "おみやげを"] },
            { key: "for-friend", prompt: "前置詞", correctIndex: 0, options: ["友達への", "友達と", "友達の近くで"] }
          ]
        },
        {
          text: "When she got there,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "when-she", prompt: "接続", correctIndex: 0, options: ["～したとき彼女が", "～する前に彼女が", "～している間彼女が"] },
            { key: "got-there", prompt: "動詞", correctIndex: 0, options: ["そこに着いた", "そこを出た", "そこに戻る"] }
          ]
        },
        {
          text: "she couldn't find the book she wanted.",
          fixedPhrases: ["彼女は"],
          selectionGroups: [
            { key: "couldnt-find", prompt: "助動詞", correctIndex: 0, options: ["見つけられなかった", "見つけられる", "見つけるつもりだった"] },
            { key: "book-wanted", prompt: "関係節", correctIndex: 0, options: ["欲しかった本を", "読んだ本を", "借りる本を"] }
          ]
        },
        {
          text: "But a store clerk showed her another book,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but-clerk", prompt: "接続", correctIndex: 0, options: ["しかし店員が", "だから店員が", "そして店員が"] },
            { key: "showed", prompt: "動詞", correctIndex: 0, options: ["見せてくれた", "見せる", "見せられた"] },
            { key: "another-book", prompt: "目的語", correctIndex: 0, options: ["別の本を", "同じ本を", "古い本を"] }
          ]
        },
        {
          text: "and she decided to buy it.",
          fixedPhrases: ["そして彼女は"],
          selectionGroups: [
            { key: "decided-to-buy", prompt: "動詞", correctIndex: 0, options: ["買うことに決めた", "買わないことにした", "買っている"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それを", "それらを", "そこで"] }
          ]
        }
      ]
    },
    {
      id: 26,
      level: "C",
      english: "Kota is going to play tennis / with his friends tomorrow morning. / After that, they will have lunch / at a restaurant near the station. / Kota has never been there, / so he is looking forward to it.",
      japanese: "コウタは明日の朝、友達とテニスをする予定です。その後、駅の近くのレストランで昼食をとります。コウタはそこへ行ったことがないので、楽しみにしています。",
      parts: [
        {
          text: "Kota is going to play tennis",
          fixedPhrases: ["コウタは"],
          selectionGroups: [
            { key: "be-going-to-play", prompt: "時制", correctIndex: 0, options: ["テニスをする予定だ", "テニスをした", "テニスをしなければならない"] }
          ]
        },
        {
          text: "with his friends tomorrow morning.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "with-friends", prompt: "前置詞", correctIndex: 0, options: ["友達と", "先生と", "家族と"] },
            { key: "tomorrow-morning", prompt: "時", correctIndex: 0, options: ["明日の朝", "昨夜", "来週"] }
          ]
        },
        {
          text: "After that, they will have lunch",
          fixedPhrases: [],
          selectionGroups: [
            { key: "after-that-they", prompt: "接続", correctIndex: 0, options: ["その後彼らは", "しかし彼らは", "その前に彼らは"] },
            { key: "will-have-lunch", prompt: "助動詞", correctIndex: 0, options: ["昼食をとる予定だ", "昼食をとった", "昼食をとっている"] }
          ]
        },
        {
          text: "at a restaurant near the station.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "at-restaurant", prompt: "前置詞", correctIndex: 0, options: ["レストランで", "レストランへ", "レストランから"] },
            { key: "near-station", prompt: "修飾", correctIndex: 0, options: ["駅の近くの", "駅の向こうの", "駅の外の"] }
          ]
        },
        {
          text: "Kota has never been there,",
          fixedPhrases: ["コウタは"],
          selectionGroups: [
            { key: "has-never-been", prompt: "現在完了", correctIndex: 0, options: ["一度も行ったことがない", "行ったことがある", "今行っている"] },
            { key: "there", prompt: "副詞", correctIndex: 0, options: ["そこへ", "ここへ", "家へ"] }
          ]
        },
        {
          text: "so he is looking forward to it.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "so-he", prompt: "接続", correctIndex: 0, options: ["だから彼は", "しかし彼は", "それでも彼は"] },
            { key: "looking-forward", prompt: "動詞", correctIndex: 0, options: ["楽しみにしている", "心配している", "忘れてしまった"] },
            { key: "to-it", prompt: "代名詞", correctIndex: 0, options: ["それを", "彼を", "それらを"] }
          ]
        }
      ]
    },
    {
      id: 27,
      level: "C",
      english: "While Nana was shopping for dinner, / she saw her old music teacher. / They talked about their school days / for about twenty minutes. / Nana was surprised to see him / because he now lived in another city.",
      japanese: "ナナが夕食の買い物をしていると、昔の音楽の先生を見かけました。二人は学校時代について約20分間話しました。先生は今別の町に住んでいたので、ナナは会って驚きました。",
      parts: [
        {
          text: "While Nana was shopping for dinner,",
          fixedPhrases: ["ナナが"],
          layoutOrder: ["g0", "f0", "g1", "g2"],
          selectionGroups: [
            { key: "while", prompt: "接続", correctIndex: 0, options: ["～している間", "～した後", "～する前"] },
            { key: "was-shopping", prompt: "時制", correctIndex: 0, options: ["買い物をしていた", "買い物をした", "買い物をするだろう"] },
            { key: "for-dinner", prompt: "前置詞", correctIndex: 0, options: ["夕食のために", "夕食のあとで", "夕食の近くで"] }
          ]
        },
        {
          text: "she saw her old music teacher.",
          fixedPhrases: ["彼女は"],
          selectionGroups: [
            { key: "saw", prompt: "動詞", correctIndex: 0, options: ["見かけた", "見つける", "会う予定だ"] },
            { key: "old-teacher", prompt: "目的語", correctIndex: 0, options: ["昔の音楽の先生を", "新しい英語の先生を", "近所の友達を"] }
          ]
        },
        {
          text: "They talked about their school days",
          fixedPhrases: [],
          selectionGroups: [
            { key: "they-talked", prompt: "主語", correctIndex: 0, options: ["二人は", "彼女は", "先生は"] },
            { key: "talked-about", prompt: "動詞", correctIndex: 0, options: ["話した", "聞いた", "忘れた"] },
            { key: "school-days", prompt: "前置詞", correctIndex: 0, options: ["学校時代について", "学校時代の前に", "学校時代のあとで"] }
          ]
        },
        {
          text: "for about twenty minutes.",
          fixedPhrases: ["約20分間"],
          selectionGroups: []
        },
        {
          text: "Nana was surprised to see him",
          fixedPhrases: ["ナナは"],
          selectionGroups: [
            { key: "was-surprised", prompt: "動詞", correctIndex: 0, options: ["驚いた", "喜んだ", "安心した"] },
            { key: "to-see-him", prompt: "不定詞", correctIndex: 0, options: ["彼に会って", "彼に会うために", "彼に会わずに"] }
          ]
        },
        {
          text: "because he now lived in another city.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because-he-now", prompt: "接続", correctIndex: 0, options: ["なぜなら彼は今", "しかし彼は今", "その前に彼は今"] },
            { key: "lived", prompt: "動詞", correctIndex: 0, options: ["住んでいた", "住んでいる", "住むだろう"] },
            { key: "another-city", prompt: "場所", correctIndex: 0, options: ["別の町に", "同じ町に", "学校に"] }
          ]
        }
      ]
    },
    {
      id: 28,
      level: "C",
      english: "Sora visited a large park / with his host family in New Zealand. / The weather was beautiful, / so he took many pictures of the lake and flowers. / He wants to show them to his family / when he returns to Japan.",
      japanese: "ソラはニュージーランドでホストファミリーと大きな公園を訪れました。天気がとてもよかったので、湖や花の写真をたくさん撮りました。日本へ帰ったら、その写真を家族に見せたいと思っています。",
      parts: [
        {
          text: "Sora visited a large park",
          fixedPhrases: ["ソラは"],
          selectionGroups: [
            { key: "visited", prompt: "動詞", correctIndex: 0, options: ["訪れた", "訪れる", "訪れている"] },
            { key: "large-park", prompt: "目的語", correctIndex: 0, options: ["大きな公園を", "小さな公園を", "博物館を"] }
          ]
        },
        {
          text: "with his host family in New Zealand.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "with-host-family", prompt: "前置詞", correctIndex: 0, options: ["ホストファミリーと", "クラスメートと", "先生と"] },
            { key: "in-new-zealand", prompt: "場所", correctIndex: 0, options: ["ニュージーランドで", "日本で", "オーストラリアで"] }
          ]
        },
        {
          text: "The weather was beautiful,",
          fixedPhrases: ["天気は"],
          selectionGroups: [
            { key: "was-beautiful", prompt: "形容詞", correctIndex: 0, options: ["とてもよかった", "悪かった", "変わらなかった"] }
          ]
        },
        {
          text: "so he took many pictures of the lake and flowers.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "so-he", prompt: "接続", correctIndex: 0, options: ["だから彼は", "しかし彼は", "その前に彼は"] },
            { key: "took-pictures", prompt: "動詞", correctIndex: 0, options: ["たくさん写真を撮った", "写真を見た", "写真をなくした"] },
            { key: "of-lake-flowers", prompt: "前置詞", correctIndex: 0, options: ["湖や花の", "山や川の", "家や学校の"] }
          ]
        },
        {
          text: "He wants to show them to his family",
          fixedPhrases: ["彼は"],
          selectionGroups: [
            { key: "wants-to-show", prompt: "動詞", correctIndex: 0, options: ["見せたい", "見せた", "見せなければならない"] },
            { key: "them-to-family", prompt: "代名詞", correctIndex: 0, options: ["それらを家族に", "それを先生に", "彼を家族に"] }
          ]
        },
        {
          text: "when he returns to Japan.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "when-he", prompt: "接続", correctIndex: 0, options: ["～したとき彼が", "～する前に彼が", "～したので彼が"] },
            { key: "returns-to-japan", prompt: "動詞", correctIndex: 0, options: ["日本へ帰る", "日本へ来た", "日本に住んでいる"] }
          ]
        }
      ]
    },
    {
      id: 29,
      level: "C",
      english: "Haruka usually rides her bike to school, / but she took the bus this morning / because it was raining heavily. / The bus was crowded, / so she couldn't find a seat. / She stood near the door instead / and read a book on the way to school.",
      japanese: "ハルカは普段、自転車で学校へ行きますが、今朝は雨が激しく降っていたのでバスに乗りました。バスは混んでいて座席を見つけられなかったので、代わりにドアの近くに立ち、学校へ行く途中で本を読みました。",
      parts: [
        {
          text: "Haruka usually rides her bike to school,",
          fixedPhrases: ["ハルカは普段"],
          selectionGroups: [
            { key: "rides-bike", prompt: "動詞", correctIndex: 0, options: ["自転車で行く", "歩いて行く", "行かなかった"] },
            { key: "to-school", prompt: "場所", correctIndex: 0, options: ["学校へ", "駅へ", "図書館へ"] }
          ]
        },
        {
          text: "but she took the bus this morning",
          fixedPhrases: ["しかし彼女は"],
          selectionGroups: [
            { key: "took-bus", prompt: "動詞", correctIndex: 0, options: ["バスに乗った", "バスに乗る", "バスを待っている"] },
            { key: "this-morning", prompt: "時", correctIndex: 0, options: ["今朝", "昨夜", "来週"] }
          ]
        },
        {
          text: "because it was raining heavily.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because", prompt: "接続", correctIndex: 0, options: ["なぜなら", "しかし", "それでも"] },
            { key: "rain-heavily", prompt: "時制", correctIndex: 0, options: ["雨が激しく", "雪が静かに", "風が弱く"] },
            { key: "was-raining", prompt: "動詞", correctIndex: 0, options: ["降っていたから", "降るだろうから", "降っていないから"] }
          ]
        },
        {
          text: "The bus was crowded,",
          fixedPhrases: ["バスは"],
          selectionGroups: [
            { key: "was-crowded", prompt: "形容詞", correctIndex: 0, options: ["混んでいた", "空いていた", "止まっていた"] }
          ]
        },
        {
          text: "so she couldn't find a seat.",
          fixedPhrases: ["だから彼女は"],
          selectionGroups: [
            { key: "couldnt-find", prompt: "助動詞", correctIndex: 0, options: ["見つけられなかった", "見つけられる", "見つけるつもりだ"] },
            { key: "a-seat", prompt: "目的語", correctIndex: 0, options: ["座席を", "切符を", "かばんを"] }
          ]
        },
        {
          text: "She stood near the door instead",
          fixedPhrases: ["彼女は代わりに"],
          selectionGroups: [
            { key: "stood", prompt: "動詞", correctIndex: 0, options: ["立っていた", "座っていた", "走っていた"] },
            { key: "near-door", prompt: "場所", correctIndex: 0, options: ["ドアの近くに", "窓の外に", "駅の前に"] }
          ]
        },
        {
          text: "and read a book on the way to school.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "and-read", prompt: "接続", correctIndex: 0, options: ["そして本を読んだ", "しかし本をなくした", "だから本を買った"] },
            { key: "on-the-way", prompt: "前置詞", correctIndex: 0, options: ["学校へ行く途中で", "学校へ着いたあとで", "学校へ行く前に"] }
          ]
        }
      ]
    },
    {
      id: 30,
      level: "A",
      english: "My father told me / to come home early.",
      japanese: "父は私に早く家に帰るように言いました。",
      parts: [
        {
          text: "My father told me",
          fixedPhrases: ["父は"],
          selectionGroups: [
            {
              key: "told-me",
              prompt: "動詞",
              correctIndex: 0,
              options: ["私に言った", "私に尋ねた", "私に見せた"]
            }
          ]
        },
        {
          text: "to come home early.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "to-come-home-early",
              prompt: "不定詞",
              correctIndex: 0,
              options: ["早く家に帰るように", "早く家を出た後で", "早く家に帰っている間に"]
            }
          ]
        }
      ]
    },
    {
      id: 31,
      level: "A",
      english: "She has already finished / her homework.",
      japanese: "彼女はもう宿題を終えています。",
      parts: [
        {
          text: "She has already finished",
          fixedPhrases: ["彼女は"],
          selectionGroups: [
            {
              key: "has-already-finished",
              prompt: "現在完了",
              correctIndex: 0,
              options: ["もう終えている", "今終えているところだ", "これから終える"]
            }
          ]
        },
        {
          text: "her homework.",
          fixedPhrases: ["宿題を"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 32,
      level: "A",
      english: "If it is sunny tomorrow, / we will go to the park.",
      japanese: "もし明日晴れたら、私たちは公園へ行くつもりです。",
      parts: [
        {
          text: "If it is sunny tomorrow,",
          fixedPhrases: ["明日晴れたら"],
          selectionGroups: [
            {
              key: "if",
              prompt: "接続",
              correctIndex: 0,
              options: ["もし～なら", "～した後で", "～なので"]
            }
          ]
        },
        {
          text: "we will go to the park.",
          fixedPhrases: ["私たちは", "公園へ"],
          selectionGroups: [
            {
              key: "will-go",
              prompt: "助動詞",
              correctIndex: 0,
              options: ["行くつもりだ", "行った", "行っていた"]
            }
          ]
        }
      ]
    },
    {
      id: 33,
      level: "A",
      english: "Tom bought some cakes / for his family.",
      japanese: "トムは家族のためにケーキを買いました。",
      parts: [
        {
          text: "Tom bought some cakes",
          fixedPhrases: ["トムは", "ケーキを買った"],
          selectionGroups: []
        },
        {
          text: "for his family.",
          fixedPhrases: ["家族のために"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 34,
      level: "A",
      english: "I was tired, / but I finished my homework.",
      japanese: "私は疲れていましたが、宿題を終えました。",
      parts: [
        {
          text: "I was tired,",
          fixedPhrases: ["私は", "疲れていた"],
          selectionGroups: []
        },
        {
          text: "but I finished my homework.",
          fixedPhrases: ["宿題を"],
          layoutOrder: ["g0", "g1", "f0"],
          selectionGroups: [
            {
              key: "but-i",
              prompt: "接続",
              correctIndex: 0,
              options: ["しかし私は", "だから私は", "その前に私は"]
            },
            {
              key: "finished",
              prompt: "動詞",
              correctIndex: 0,
              options: ["終えた", "終えている", "終えるつもりだ"]
            }
          ]
        }
      ]
    },
    {
      id: 35,
      level: "B",
      english: "I heard that / your brother won a soccer game / last Sunday.",
      japanese: "あなたのお兄さんが先週の日曜日にサッカーの試合に勝ったと聞きました。",
      parts: [
        {
          text: "I heard that",
          fixedPhrases: ["私は"],
          selectionGroups: [
            {
              key: "heard",
              prompt: "動詞",
              correctIndex: 0,
              options: ["聞いた", "信じている", "忘れた"]
            },
            {
              key: "that-clause",
              prompt: "接続",
              correctIndex: 0,
              options: ["～ということを", "～する前に", "～したので"]
            }
          ]
        },
        {
          text: "your brother won a soccer game",
          fixedPhrases: ["あなたの兄が", "サッカーの試合に"],
          selectionGroups: [
            {
              key: "won",
              prompt: "時制",
              correctIndex: 0,
              options: ["勝った", "勝っている", "勝つだろう"]
            }
          ]
        },
        {
          text: "last Sunday.",
          fixedPhrases: ["先週の日曜日に"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 36,
      level: "B",
      english: "Kei wanted to make a cake, / so he went to a supermarket / to buy some eggs.",
      japanese: "ケイはケーキを作りたかったので、卵を買うためにスーパーへ行きました。",
      parts: [
        {
          text: "Kei wanted to make a cake,",
          fixedPhrases: ["ケイは"],
          selectionGroups: [
            {
              key: "wanted-to-make",
              prompt: "不定詞",
              correctIndex: 0,
              options: ["ケーキを作りたかった", "ケーキを作っている", "ケーキを作らなかった"]
            }
          ]
        },
        {
          text: "so he went to a supermarket",
          fixedPhrases: ["スーパーへ"],
          layoutOrder: ["g0", "g1", "f0"],
          selectionGroups: [
            {
              key: "so-he",
              prompt: "接続",
              correctIndex: 0,
              options: ["だから彼は", "しかし彼は", "～したとき彼は"]
            },
            {
              key: "went",
              prompt: "時制",
              correctIndex: 0,
              options: ["行った", "行っている", "行くつもりだ"]
            }
          ]
        },
        {
          text: "to buy some eggs.",
          fixedPhrases: ["卵を"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            {
              key: "to-buy",
              prompt: "不定詞",
              correctIndex: 0,
              options: ["買うために", "買った後で", "買っている間に"]
            }
          ]
        }
      ]
    },
    {
      id: 37,
      level: "B",
      english: "When Emi opened the box, / she found a beautiful watch / inside it.",
      japanese: "エミが箱を開けると、その中にきれいな腕時計を見つけました。",
      parts: [
        {
          text: "When Emi opened the box,",
          fixedPhrases: ["エミが箱を開けた"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            {
              key: "when",
              prompt: "接続",
              correctIndex: 0,
              options: ["～したとき", "～する前に", "～したので"]
            }
          ]
        },
        {
          text: "she found a beautiful watch",
          fixedPhrases: ["彼女は", "きれいな腕時計を"],
          selectionGroups: [
            {
              key: "found",
              prompt: "時制",
              correctIndex: 0,
              options: ["見つけた", "見つけている", "見つけるだろう"]
            }
          ]
        },
        {
          text: "inside it.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "inside-it",
              prompt: "代名詞",
              correctIndex: 0,
              options: ["その箱の中に", "その腕時計の中に", "彼女の中に"]
            }
          ]
        }
      ]
    },
    {
      id: 38,
      level: "B",
      english: "My grandmother has lived in this town / for more than twenty years, / but she still likes finding new places.",
      japanese: "祖母はこの町に20年以上住んでいますが、今でも新しい場所を見つけることが好きです。",
      parts: [
        {
          text: "My grandmother has lived in this town",
          fixedPhrases: ["祖母は", "この町に"],
          selectionGroups: [
            {
              key: "has-lived",
              prompt: "現在完了",
              correctIndex: 0,
              options: ["住んでいる", "住んでいた", "住むつもりだ"]
            }
          ]
        },
        {
          text: "for more than twenty years,",
          fixedPhrases: ["20年以上"],
          selectionGroups: []
        },
        {
          text: "but she still likes finding new places.",
          fixedPhrases: [],
          selectionGroups: [
            {
              key: "but-she-still",
              prompt: "接続",
              correctIndex: 0,
              options: ["しかし彼女は今でも", "だから彼女はもう", "その前に彼女は"]
            },
            {
              key: "likes-finding",
              prompt: "文構造",
              correctIndex: 0,
              options: ["新しい場所を見つけることが好きだ", "新しい場所を見つけた", "新しい場所を見つける必要がある"]
            }
          ]
        }
      ]
    },
    {
      id: 39,
      level: "B",
      english: "Before we went to the museum, / my mother checked the train time / on her phone.",
      japanese: "私たちが博物館へ行く前に、母はスマートフォンで電車の時間を確認しました。",
      parts: [
        {
          text: "Before we went to the museum,",
          fixedPhrases: ["私たちが博物館へ行った"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            {
              key: "before",
              prompt: "接続",
              correctIndex: 0,
              options: ["～する前に", "～した後で", "～している間に"]
            }
          ]
        },
        {
          text: "my mother checked the train time",
          fixedPhrases: ["母は", "電車の時間を"],
          selectionGroups: [
            {
              key: "checked",
              prompt: "時制",
              correctIndex: 0,
              options: ["確認した", "確認している", "確認するだろう"]
            }
          ]
        },
        {
          text: "on her phone.",
          fixedPhrases: ["スマートフォンで"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 40,
      level: "C",
      english: "Yui wanted to give her father a present / for his birthday. / She went to a shopping mall / after school on Friday. / She first looked for a shirt, / but she couldn't find one she liked. / Then she saw a nice wallet / and decided to buy it.",
      japanese: "ユイは父の誕生日にプレゼントをあげたいと思い、金曜日の放課後にショッピングモールへ行きました。最初にシャツを探しましたが、気に入るものが見つかりませんでした。その後すてきな財布を見つけ、それを買うことにしました。",
      parts: [
        {
          text: "Yui wanted to give her father a present",
          fixedPhrases: ["ユイは"],
          selectionGroups: [
            { key: "wanted-to-give", prompt: "不定詞", correctIndex: 0, options: ["父にプレゼントをあげたかった", "父にプレゼントをあげている", "父にプレゼントをあげなかった"] }
          ]
        },
        {
          text: "for his birthday.",
          fixedPhrases: ["父の誕生日に"],
          selectionGroups: []
        },
        {
          text: "She went to a shopping mall",
          fixedPhrases: ["彼女は", "ショッピングモールへ"],
          selectionGroups: [
            { key: "went", prompt: "時制", correctIndex: 0, options: ["行った", "行っている", "行くつもりだ"] }
          ]
        },
        {
          text: "after school on Friday.",
          fixedPhrases: ["金曜日の放課後に"],
          selectionGroups: []
        },
        {
          text: "She first looked for a shirt,",
          fixedPhrases: ["彼女はまず", "シャツを"],
          selectionGroups: [
            { key: "looked-for", prompt: "動詞", correctIndex: 0, options: ["探した", "見つけた", "借りた"] }
          ]
        },
        {
          text: "but she couldn't find one she liked.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but-she", prompt: "接続", correctIndex: 0, options: ["しかし彼女は", "だから彼女は", "それから彼女は"] },
            { key: "couldnt-find", prompt: "助動詞", correctIndex: 0, options: ["見つけられなかった", "見つけられる", "見つけるつもりだった"] },
            { key: "one-liked", prompt: "代名詞", correctIndex: 0, options: ["気に入るものを", "気に入る財布を", "気に入る先生を"] }
          ]
        },
        {
          text: "Then she saw a nice wallet",
          fixedPhrases: ["それから彼女は", "すてきな財布を"],
          selectionGroups: [
            { key: "then-saw", prompt: "動詞", correctIndex: 0, options: ["見つけた", "なくした", "渡した"] }
          ]
        },
        {
          text: "and decided to buy it.",
          fixedPhrases: ["そして彼女は"],
          selectionGroups: [
            { key: "decided-to-buy", prompt: "不定詞", correctIndex: 0, options: ["買うことに決めた", "買わないことにした", "買っている"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それを", "それらを", "彼を"] }
          ]
        }
      ]
    },
    {
      id: 41,
      level: "C",
      english: "Kenta is staying with a host family / in Australia this month. / Last Saturday, they took him to a large zoo. / He saw many animals there, / but he liked the koalas best. / He took many pictures of them / and plans to show them to his friends / when he returns to Japan.",
      japanese: "ケンタは今月オーストラリアでホストファミリーと暮らしています。先週の土曜日、ホストファミリーは彼を大きな動物園へ連れて行きました。たくさんの動物を見ましたが、コアラが一番気に入りました。写真をたくさん撮り、日本へ帰ったら友達に見せる予定です。",
      parts: [
        {
          text: "Kenta is staying with a host family",
          fixedPhrases: ["ケンタは", "ホストファミリーと"],
          selectionGroups: [
            { key: "is-staying", prompt: "進行形", correctIndex: 0, options: ["滞在している", "滞在した", "滞在するだろう"] }
          ]
        },
        {
          text: "in Australia this month.",
          fixedPhrases: ["オーストラリアで", "今月"],
          selectionGroups: []
        },
        {
          text: "Last Saturday, they took him to a large zoo.",
          fixedPhrases: ["先週の土曜日", "彼を大きな動物園へ"],
          selectionGroups: [
            { key: "they-took", prompt: "時制", correctIndex: 0, options: ["彼らは連れて行った", "彼らは連れて行く", "彼らは迎えに行った"] }
          ]
        },
        {
          text: "He saw many animals there,",
          fixedPhrases: ["彼は", "たくさんの動物をそこで"],
          selectionGroups: [
            { key: "saw", prompt: "時制", correctIndex: 0, options: ["見た", "見ている", "見るつもりだ"] }
          ]
        },
        {
          text: "but he liked the koalas best.",
          fixedPhrases: ["コアラを"],
          layoutOrder: ["g0", "f0", "g1"],
          selectionGroups: [
            { key: "but-he", prompt: "接続", correctIndex: 0, options: ["しかし彼は", "だから彼は", "その前に彼は"] },
            { key: "liked-best", prompt: "動詞", correctIndex: 0, options: ["一番気に入った", "一番こわがった", "一番避けた"] }
          ]
        },
        {
          text: "He took many pictures of them",
          fixedPhrases: ["彼は", "それらの"],
          selectionGroups: [
            { key: "took-pictures", prompt: "動詞", correctIndex: 0, options: ["たくさん写真を撮った", "写真を見せた", "写真をなくした"] }
          ]
        },
        {
          text: "and plans to show them to his friends",
          fixedPhrases: ["それらを友達に"],
          layoutOrder: ["g0", "g1", "f0"],
          selectionGroups: [
            { key: "and-plans", prompt: "接続", correctIndex: 0, options: ["そして", "しかし", "そのあと"] },
            { key: "plans-to-show", prompt: "不定詞", correctIndex: 0, options: ["見せる予定だ", "見せた", "見せる必要がない"] }
          ]
        },
        {
          text: "when he returns to Japan.",
          fixedPhrases: ["彼が日本へ帰る"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            { key: "when", prompt: "接続", correctIndex: 0, options: ["～したとき", "～したので", "～する前に"] }
          ]
        }
      ]
    },
    {
      id: 42,
      level: "C",
      english: "Sara usually studies at home / after dinner. / Yesterday, however, she went to the library / because she needed a book for her science class. / While she was looking for the book, / she met one of her classmates. / They studied together for an hour / before they went home.",
      japanese: "サラは普段夕食後に家で勉強します。しかし昨日は、理科の授業で使う本が必要だったので図書館へ行きました。本を探しているとクラスメートの一人に会い、二人は家へ帰る前に1時間一緒に勉強しました。",
      parts: [
        {
          text: "Sara usually studies at home",
          fixedPhrases: ["サラは普段", "家で"],
          selectionGroups: [
            { key: "studies", prompt: "時制", correctIndex: 0, options: ["勉強する", "勉強した", "勉強しているところだ"] }
          ]
        },
        {
          text: "after dinner.",
          fixedPhrases: ["夕食後に"],
          selectionGroups: []
        },
        {
          text: "Yesterday, however, she went to the library",
          fixedPhrases: ["昨日は", "図書館へ"],
          layoutOrder: ["f0", "g0", "g1", "f1"],
          selectionGroups: [
            { key: "however-she", prompt: "接続", correctIndex: 0, options: ["しかし彼女は", "だから彼女は", "そのあと彼女は"] },
            { key: "went", prompt: "時制", correctIndex: 0, options: ["行った", "行く", "行っている"] }
          ]
        },
        {
          text: "because she needed a book for her science class.",
          fixedPhrases: ["理科の授業用の本が"],
          layoutOrder: ["g0", "g1", "f0"],
          selectionGroups: [
            { key: "because-she", prompt: "接続", correctIndex: 0, options: ["なぜなら彼女は", "しかし彼女は", "それでも彼女は"] },
            { key: "needed", prompt: "時制", correctIndex: 0, options: ["必要だった", "必要だ", "必要になるだろう"] }
          ]
        },
        {
          text: "While she was looking for the book,",
          fixedPhrases: ["彼女がその本を探していた"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            { key: "while", prompt: "接続", correctIndex: 0, options: ["～している間", "～した後で", "～する前に"] }
          ]
        },
        {
          text: "she met one of her classmates.",
          fixedPhrases: ["彼女は"],
          selectionGroups: [
            { key: "met", prompt: "時制", correctIndex: 0, options: ["会った", "会っている", "会う予定だ"] },
            { key: "one-of-classmates", prompt: "代名詞", correctIndex: 0, options: ["クラスメートの一人に", "先生の一人に", "家族の一人に"] }
          ]
        },
        {
          text: "They studied together for an hour",
          fixedPhrases: [],
          selectionGroups: [
            { key: "they-studied", prompt: "主語", correctIndex: 0, options: ["二人は", "彼女は", "先生は"] },
            { key: "studied-together", prompt: "動詞", correctIndex: 0, options: ["一緒に勉強した", "一緒に遊んだ", "一緒に食事した"] },
            { key: "for-an-hour", prompt: "期間", correctIndex: 0, options: ["1時間", "1日", "1週間"] }
          ]
        },
        {
          text: "before they went home.",
          fixedPhrases: ["二人が家へ帰る"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            { key: "before", prompt: "接続", correctIndex: 0, options: ["～する前に", "～した後で", "～している間に"] }
          ]
        }
      ]
    },
    {
      id: 43,
      level: "C",
      english: "Daichi planned to visit his grandfather / on Sunday morning. / Before he left home, / his mother asked him to take some fruit. / When he arrived at his grandfather's house, / they ate lunch together. / His grandfather told him many stories / about when he was young. / Daichi enjoyed listening to them very much.",
      japanese: "ダイチは日曜日の朝に祖父を訪ねる予定でした。家を出る前に、母から果物を持っていくよう頼まれました。祖父の家に着くと一緒に昼食を食べ、祖父は若かったころの話をたくさんしてくれました。ダイチはその話を聞くことをとても楽しみました。",
      parts: [
        {
          text: "Daichi planned to visit his grandfather",
          fixedPhrases: ["ダイチは"],
          selectionGroups: [
            { key: "planned-to-visit", prompt: "不定詞", correctIndex: 0, options: ["祖父を訪ねる予定だった", "祖父を訪ねている", "祖父を訪ねなかった"] }
          ]
        },
        {
          text: "on Sunday morning.",
          fixedPhrases: ["日曜日の朝に"],
          selectionGroups: []
        },
        {
          text: "Before he left home,",
          fixedPhrases: ["彼が家を出た"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            { key: "before", prompt: "接続", correctIndex: 0, options: ["～する前に", "～した後で", "～している間に"] }
          ]
        },
        {
          text: "his mother asked him to take some fruit.",
          fixedPhrases: ["母は彼に頼んだ", "果物を"],
          selectionGroups: [
            { key: "asked-him-to", prompt: "文構造", correctIndex: 0, options: ["持っていくように", "持っていった後で", "持っていく前に"] }
          ]
        },
        {
          text: "When he arrived at his grandfather's house,",
          fixedPhrases: ["彼が祖父の家に着いた"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            { key: "when", prompt: "接続", correctIndex: 0, options: ["～したとき", "～する前に", "～したので"] }
          ]
        },
        {
          text: "they ate lunch together.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "they-ate", prompt: "主語", correctIndex: 0, options: ["二人は", "彼だけが", "祖父だけが"] },
            { key: "ate-lunch", prompt: "動詞", correctIndex: 0, options: ["一緒に昼食を食べた", "一緒に昼食を作った", "一緒に昼食を運んだ"] }
          ]
        },
        {
          text: "His grandfather told him many stories",
          fixedPhrases: ["祖父は", "彼に", "たくさんの話を"],
          selectionGroups: [
            { key: "told", prompt: "時制", correctIndex: 0, options: ["話した", "話している", "話すつもりだ"] }
          ]
        },
        {
          text: "about when he was young.",
          fixedPhrases: ["祖父が若かったころ"],
          layoutOrder: ["g0", "f0"],
          selectionGroups: [
            { key: "about", prompt: "前置詞", correctIndex: 0, options: ["～について", "～の前に", "～のあとで"] }
          ]
        },
        {
          text: "Daichi enjoyed listening to them very much.",
          fixedPhrases: ["ダイチは"],
          selectionGroups: [
            { key: "enjoyed-listening", prompt: "動詞", correctIndex: 0, options: ["とても楽しんだ", "とても怖がった", "とても忘れていた"] },
            { key: "to-them", prompt: "代名詞", correctIndex: 0, options: ["それらを聞くことを", "彼を聞くことを", "それを作ることを"] }
          ]
        }
      ]
    },
    {
      id: 44,
      level: "C",
      english: "Mao joined a cooking class / at a community center last month. / She wanted to learn how to make Chinese food. / At first, she was worried / because she had never cooked it before. / However, the teacher showed her what to do, / and she made a delicious dish. / Her family enjoyed eating it / when she made it again at home.",
      japanese: "マオは先月、地域センターの料理教室に参加しました。中華料理の作り方を学びたかったのですが、それまで一度も作ったことがなく、最初は心配していました。しかし先生がやり方を教えてくれ、おいしい料理を作ることができました。家でもう一度作ると、家族も喜んで食べました。",
      parts: [
        {
          text: "Mao joined a cooking class",
          fixedPhrases: ["マオは", "料理教室に"],
          selectionGroups: [
            { key: "joined", prompt: "時制", correctIndex: 0, options: ["参加した", "参加している", "参加する予定だ"] }
          ]
        },
        {
          text: "at a community center last month.",
          fixedPhrases: ["地域センターで", "先月"],
          selectionGroups: []
        },
        {
          text: "She wanted to learn how to make Chinese food.",
          fixedPhrases: ["彼女は"],
          selectionGroups: [
            { key: "wanted-to-learn", prompt: "不定詞", correctIndex: 0, options: ["学びたかった", "学んでいる", "学ぶ必要がない"] },
            { key: "how-to-make", prompt: "文構造", correctIndex: 0, options: ["中華料理の作り方を", "中華料理を作る前に", "中華料理を作っている間に"] }
          ]
        },
        {
          text: "At first, she was worried",
          fixedPhrases: ["最初は彼女は"],
          selectionGroups: [
            { key: "was-worried", prompt: "動詞", correctIndex: 0, options: ["心配だった", "安心していた", "うれしかった"] }
          ]
        },
        {
          text: "because she had never cooked it before.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because-she", prompt: "接続", correctIndex: 0, options: ["なぜなら彼女は", "しかし彼女は", "そのあと彼女は"] },
            { key: "had-never-cooked", prompt: "過去完了", correctIndex: 0, options: ["一度も作ったことがなかった", "作ったことがある", "今作っている"] },
            { key: "it-before", prompt: "代名詞", correctIndex: 0, options: ["それを以前に", "それらを以前に", "彼を以前に"] }
          ]
        },
        {
          text: "However, the teacher showed her what to do,",
          fixedPhrases: ["先生は", "彼女に"],
          layoutOrder: ["g0", "f0", "f1", "g1"],
          selectionGroups: [
            { key: "however", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "その前に"] },
            { key: "showed-what-to-do", prompt: "文構造", correctIndex: 0, options: ["何をすればよいかを見せた", "何を買うかを忘れた", "何を食べるかを聞いた"] }
          ]
        },
        {
          text: "and she made a delicious dish.",
          fixedPhrases: ["そして彼女は", "おいしい料理を"],
          selectionGroups: [
            { key: "made", prompt: "時制", correctIndex: 0, options: ["作った", "作っている", "作らない"] }
          ]
        },
        {
          text: "Her family enjoyed eating it",
          fixedPhrases: ["家族は"],
          selectionGroups: [
            { key: "enjoyed", prompt: "動詞", correctIndex: 0, options: ["楽しんだ", "嫌がった", "避けた"] },
            { key: "eating-it", prompt: "代名詞", correctIndex: 0, options: ["それを食べることを", "それらを食べることを", "彼を食べることを"] }
          ]
        },
        {
          text: "when she made it again at home.",
          fixedPhrases: ["彼女がもう一度それを作った", "家で"],
          selectionGroups: [
            { key: "when", prompt: "接続", correctIndex: 0, options: ["～したとき", "～する前に", "～したので"] }
          ]
        }
      ]
    },
    {
      id: 45,
      level: "A",
      english: "I have to finish this report / before dinner.",
      japanese: "私は夕食の前にこのレポートを終えなければなりません。",
      parts: [
        {
          text: "I have to finish this report",
          fixedPhrases: ["私は", "このレポートを"],
          selectionGroups: [
            { key: "have-to-finish", prompt: "動詞", correctIndex: 0, options: ["終えなければならない", "終えたい", "終えたことがある"] }
          ]
        },
        {
          text: "before dinner.",
          fixedPhrases: ["夕食の前に"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 46,
      level: "A",
      english: "This bag is cheaper / than that one.",
      japanese: "このバッグはあのバッグより安いです。",
      parts: [
        {
          text: "This bag is cheaper",
          fixedPhrases: ["このバッグは"],
          selectionGroups: [
            { key: "cheaper", prompt: "比較", correctIndex: 0, options: ["より安い", "いちばん安い", "同じくらい高い"] }
          ]
        },
        {
          text: "than that one.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "than-that-one", prompt: "指示", correctIndex: 0, options: ["あのバッグより", "あの店より", "あの人より"] }
          ]
        }
      ]
    },
    {
      id: 47,
      level: "A",
      english: "I need something / to drink.",
      japanese: "私は何か飲むものが必要です。",
      parts: [
        {
          text: "I need something",
          fixedPhrases: ["私は"],
          selectionGroups: [
            { key: "need-something", prompt: "文構造", correctIndex: 0, options: ["何かが必要だ", "何かを作った", "何かを見つけた"] }
          ]
        },
        {
          text: "to drink.",
          fixedPhrases: ["飲むための"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 48,
      level: "B",
      english: "After I finished breakfast, / my father asked me / to help him wash the car.",
      japanese: "朝食を終えた後、父は私に車を洗うのを手伝うよう頼みました。",
      parts: [
        {
          text: "After I finished breakfast,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "after", prompt: "接続", correctIndex: 0, options: ["～した後で", "～する前に", "～している間に"] }
          ]
        },
        {
          text: "my father asked me",
          fixedPhrases: ["父は"],
          selectionGroups: [
            { key: "asked-me", prompt: "文構造", correctIndex: 0, options: ["私に頼んだ", "私に聞いた", "私に見せた"] }
          ]
        },
        {
          text: "to help him wash the car.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "to-help", prompt: "不定詞", correctIndex: 0, options: ["彼を手伝うように", "彼を助けたあとで", "彼を手伝わずに"] },
            { key: "wash-the-car", prompt: "文構造", correctIndex: 0, options: ["車を洗うのを", "車を見に行くのを", "車を直すのを"] }
          ]
        }
      ]
    },
    {
      id: 49,
      level: "B",
      english: "I have never used this camera, / so my sister showed me / how to use it.",
      japanese: "私はこのカメラを一度も使ったことがなかったので、姉が使い方を教えてくれました。",
      parts: [
        {
          text: "I have never used this camera,",
          fixedPhrases: ["私は", "このカメラを"],
          selectionGroups: [
            { key: "have-never-used", prompt: "現在完了", correctIndex: 0, options: ["一度も使ったことがない", "今使っている", "よく使っていた"] }
          ]
        },
        {
          text: "so my sister showed me",
          fixedPhrases: ["姉は", "私に"],
          layoutOrder: ["g0", "f0", "f1", "g1"],
          selectionGroups: [
            { key: "so", prompt: "接続", correctIndex: 0, options: ["だから", "しかし", "～する前に"] },
            { key: "showed-me", prompt: "動詞", correctIndex: 0, options: ["教えてくれた", "見せた", "借りた"] }
          ]
        },
        {
          text: "how to use it.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "how-to-use", prompt: "文構造", correctIndex: 0, options: ["使い方を", "使った場所を", "使う人を"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それの", "その人の", "その店の"] }
          ]
        }
      ]
    },
    {
      id: 50,
      level: "B",
      english: "If you come to my house tomorrow, / we can watch the movie / together.",
      japanese: "もし明日私の家に来たら、私たちは一緒にその映画を見ることができます。",
      parts: [
        {
          text: "If you come to my house tomorrow,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "if", prompt: "接続", correctIndex: 0, options: ["もし", "なぜなら", "しかし"] }
          ]
        },
        {
          text: "we can watch the movie",
          fixedPhrases: ["私たちは", "その映画を"],
          selectionGroups: [
            { key: "can", prompt: "助動詞", correctIndex: 0, options: ["見ることができる", "見なければならない", "見たことがある"] }
          ]
        },
        {
          text: "together.",
          fixedPhrases: ["一緒に"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 51,
      level: "B",
      english: "When the teacher came into the room, / the students were talking / about the school trip.",
      japanese: "先生が部屋に入ってきたとき、生徒たちは学校旅行について話していました。",
      parts: [
        {
          text: "When the teacher came into the room,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "when", prompt: "接続", correctIndex: 0, options: ["～したとき", "～する前に", "～したので"] }
          ]
        },
        {
          text: "the students were talking",
          fixedPhrases: ["生徒たちは"],
          selectionGroups: [
            { key: "were-talking", prompt: "時制", correctIndex: 0, options: ["話していた", "話した", "話すだろう"] }
          ]
        },
        {
          text: "about the school trip.",
          fixedPhrases: ["学校旅行について"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 52,
      level: "B",
      english: "Rina couldn't go to the party / because she had to work / that evening.",
      japanese: "リナはその晩働かなければならなかったので、パーティーへ行けませんでした。",
      parts: [
        {
          text: "Rina couldn't go to the party",
          fixedPhrases: ["リナは", "パーティーへ"],
          selectionGroups: [
            { key: "couldnt", prompt: "否定", correctIndex: 0, options: ["行けなかった", "行きたかった", "行った"] }
          ]
        },
        {
          text: "because she had to work",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because", prompt: "接続", correctIndex: 0, options: ["なぜなら", "しかし", "もし"] },
            { key: "had-to", prompt: "文構造", correctIndex: 0, options: ["働かなければならなかった", "働いていた", "働く予定だった"] }
          ]
        },
        {
          text: "that evening.",
          fixedPhrases: ["その晩"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 53,
      level: "B",
      english: "The book was more interesting / than I expected, / so I finished it in one day.",
      japanese: "その本は予想していたより面白かったので、私は1日で読み終えました。",
      parts: [
        {
          text: "The book was more interesting",
          fixedPhrases: ["その本は"],
          selectionGroups: [
            { key: "more-interesting", prompt: "比較", correctIndex: 0, options: ["もっと面白かった", "いちばん面白かった", "同じくらい面白かった"] }
          ]
        },
        {
          text: "than I expected,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "than", prompt: "比較", correctIndex: 0, options: ["私が予想したより", "私が聞いたあとで", "私が読んだために"] }
          ]
        },
        {
          text: "so I finished it in one day.",
          fixedPhrases: ["だから私は", "それを", "1日で"],
          selectionGroups: [
            { key: "finished", prompt: "動詞", correctIndex: 0, options: ["読み終えた", "始めた", "買った"] }
          ]
        }
      ]
    },
    {
      id: 54,
      level: "C",
      english: "Aki wanted to make dinner for her family, / but she did not know what to cook. / She looked in the refrigerator / and found some chicken and vegetables. / Then she searched for an easy recipe online. / After reading it, / she decided to make chicken soup. / Her family liked it very much, / so Aki wanted to make it again.",
      japanese: "アキは家族のために夕食を作りたかったのですが、何を作ればよいか分かりませんでした。冷蔵庫を見ると鶏肉と野菜があったので、インターネットで簡単なレシピを探しました。それを読んでチキンスープを作ることにしました。家族がとても気に入ったので、アキはまた作りたいと思いました。",
      parts: [
        {
          text: "Aki wanted to make dinner for her family,",
          fixedPhrases: ["アキは", "家族のために夕食を"],
          selectionGroups: [
            { key: "wanted-to-make", prompt: "不定詞", correctIndex: 0, options: ["作りたかった", "作っている", "作らなかった"] }
          ]
        },
        {
          text: "but she did not know what to cook.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "もし"] },
            { key: "did-not-know", prompt: "否定", correctIndex: 0, options: ["分からなかった", "分かっていた", "分かるだろう"] },
            { key: "what-to-cook", prompt: "文構造", correctIndex: 0, options: ["何を作ればよいか", "どこで作るか", "誰と作るか"] }
          ]
        },
        {
          text: "She looked in the refrigerator",
          fixedPhrases: ["彼女は", "冷蔵庫の中を"],
          selectionGroups: [
            { key: "looked", prompt: "時制", correctIndex: 0, options: ["見た", "見ている", "見る予定だ"] }
          ]
        },
        {
          text: "and found some chicken and vegetables.",
          fixedPhrases: ["そして"],
          selectionGroups: [
            { key: "found", prompt: "時制", correctIndex: 0, options: ["見つけた", "見つけている", "見つけない"] },
            { key: "chicken-vegetables", prompt: "名詞", correctIndex: 0, options: ["鶏肉と野菜を", "本と鉛筆を", "靴と帽子を"] }
          ]
        },
        {
          text: "Then she searched for an easy recipe online.",
          fixedPhrases: ["それから彼女は", "簡単なレシピを", "ネットで"],
          selectionGroups: [
            { key: "searched", prompt: "時制", correctIndex: 0, options: ["探した", "作った", "読んだ"] }
          ]
        },
        {
          text: "After reading it,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "after", prompt: "接続", correctIndex: 0, options: ["それを読んだ後で", "それを読んでいる間に", "それを読む前に"] }
          ]
        },
        {
          text: "she decided to make chicken soup.",
          fixedPhrases: ["彼女は", "チキンスープを"],
          selectionGroups: [
            { key: "decided-to-make", prompt: "不定詞", correctIndex: 0, options: ["作ることに決めた", "作らないことにした", "作っている"] }
          ]
        },
        {
          text: "Her family liked it very much,",
          fixedPhrases: ["家族は", "とても"],
          selectionGroups: [
            { key: "liked-it", prompt: "動詞", correctIndex: 0, options: ["気に入った", "見つけた", "忘れた"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それを", "それらを", "彼を"] }
          ]
        },
        {
          text: "so Aki wanted to make it again.",
          fixedPhrases: ["だからアキは", "また", "それを"],
          selectionGroups: [
            { key: "wanted-again", prompt: "不定詞", correctIndex: 0, options: ["作りたいと思った", "作ることを忘れた", "作る必要がなかった"] }
          ]
        }
      ]
    },
    {
      id: 55,
      level: "C",
      english: "Hiro went to the station / to meet his cousin from Osaka. / He arrived there early, / so he waited at a coffee shop nearby. / While he was drinking juice, / his cousin sent him a message. / The train was twenty minutes late, / but Hiro did not mind waiting. / He was happy when his cousin finally arrived.",
      japanese: "ヒロは大阪から来るいとこに会うため駅へ行きました。早く着いたので近くの喫茶店で待っていました。ジュースを飲んでいると、いとこから電車が20分遅れていると連絡がありました。ヒロは待つことを気にせず、いとこがようやく到着すると喜びました。",
      parts: [
        {
          text: "Hiro went to the station",
          fixedPhrases: ["ヒロは", "駅へ"],
          selectionGroups: [
            { key: "went", prompt: "時制", correctIndex: 0, options: ["行った", "行っている", "行くだろう"] }
          ]
        },
        {
          text: "to meet his cousin from Osaka.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "to-meet", prompt: "不定詞", correctIndex: 0, options: ["会うために", "会ったあとで", "会っている間に"] },
            { key: "from-osaka", prompt: "場所", correctIndex: 0, options: ["大阪から来る", "大阪へ行く", "大阪で住む"] }
          ]
        },
        {
          text: "He arrived there early,",
          fixedPhrases: ["彼は", "そこに"],
          selectionGroups: [
            { key: "arrived", prompt: "時制", correctIndex: 0, options: ["早く着いた", "遅く着いた", "着く予定だ"] }
          ]
        },
        {
          text: "so he waited at a coffee shop nearby.",
          fixedPhrases: ["だから彼は", "近くの喫茶店で"],
          selectionGroups: [
            { key: "waited", prompt: "時制", correctIndex: 0, options: ["待った", "待っている", "待つつもりだ"] }
          ]
        },
        {
          text: "While he was drinking juice,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "while", prompt: "接続", correctIndex: 0, options: ["～している間に", "～した後で", "～する前に"] },
            { key: "drinking", prompt: "進行形", correctIndex: 0, options: ["ジュースを飲んでいた", "ジュースを飲んだ", "ジュースを飲む予定だ"] }
          ]
        },
        {
          text: "his cousin sent him a message.",
          fixedPhrases: ["いとこは", "彼に", "メッセージを"],
          selectionGroups: [
            { key: "sent", prompt: "時制", correctIndex: 0, options: ["送った", "送っている", "送る予定だ"] }
          ]
        },
        {
          text: "The train was twenty minutes late,",
          fixedPhrases: ["電車は", "20分"],
          selectionGroups: [
            { key: "late", prompt: "形容詞", correctIndex: 0, options: ["遅れていた", "早かった", "止まった"] }
          ]
        },
        {
          text: "but Hiro did not mind waiting.",
          fixedPhrases: ["ヒロは"],
          layoutOrder: ["g0", "f0", "g1", "g2"],
          selectionGroups: [
            { key: "but", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "もし"] },
            { key: "did-not-mind", prompt: "否定", correctIndex: 0, options: ["気にしなかった", "気にした", "気にするだろう"] },
            { key: "waiting", prompt: "動名詞", correctIndex: 0, options: ["待つことを", "走ることを", "見ることを"] }
          ]
        },
        {
          text: "He was happy when his cousin finally arrived.",
          fixedPhrases: ["彼はうれしかった", "いとこがようやく到着した"],
          layoutOrder: ["f0", "g0", "f1"],
          selectionGroups: [
            { key: "when", prompt: "接続", correctIndex: 0, options: ["～したとき", "～する前に", "～したので"] }
          ]
        }
      ]
    },
    {
      id: 56,
      level: "C",
      english: "Mina joined the school tennis club / this spring. / At first, she could not hit the ball well, / and she often felt tired after practice. / However, she practiced three times a week / and asked older students for advice. / After two months, / she could play much better. / Her coach told her / that she had improved a lot.",
      japanese: "ミナはこの春、学校のテニス部に入りました。最初はボールをうまく打てず、練習後はよく疲れていました。しかし週3回練習し、上級生にもアドバイスを求めました。2か月後にはずっと上手にできるようになり、コーチからとても上達したと言われました。",
      parts: [
        {
          text: "Mina joined the school tennis club",
          fixedPhrases: ["ミナは", "学校のテニス部に"],
          selectionGroups: [
            { key: "joined", prompt: "時制", correctIndex: 0, options: ["入った", "入っている", "入る予定だ"] }
          ]
        },
        {
          text: "this spring.",
          fixedPhrases: ["この春"],
          selectionGroups: []
        },
        {
          text: "At first, she could not hit the ball well,",
          fixedPhrases: ["最初は彼女は", "ボールを"],
          selectionGroups: [
            { key: "could-not-hit", prompt: "助動詞", correctIndex: 0, options: ["うまく打てなかった", "うまく打った", "うまく打てるだろう"] }
          ]
        },
        {
          text: "and she often felt tired after practice.",
          fixedPhrases: ["そして彼女はよく", "練習後に"],
          selectionGroups: [
            { key: "felt-tired", prompt: "状態", correctIndex: 0, options: ["疲れていた", "元気だった", "緊張していた"] }
          ]
        },
        {
          text: "However, she practiced three times a week",
          fixedPhrases: ["彼女は", "週3回"],
          layoutOrder: ["g0", "f0", "g1", "f1"],
          selectionGroups: [
            { key: "however", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "もし"] },
            { key: "practiced", prompt: "時制", correctIndex: 0, options: ["練習した", "練習しなかった", "練習する予定だった"] }
          ]
        },
        {
          text: "and asked older students for advice.",
          fixedPhrases: ["そして"],
          selectionGroups: [
            { key: "asked", prompt: "時制", correctIndex: 0, options: ["求めた", "見せた", "忘れた"] },
            { key: "older-students", prompt: "名詞", correctIndex: 0, options: ["上級生に", "先生に", "家族に"] }
          ]
        },
        {
          text: "After two months,",
          fixedPhrases: ["2か月後"],
          selectionGroups: []
        },
        {
          text: "she could play much better.",
          fixedPhrases: ["彼女は"],
          selectionGroups: [
            { key: "could-play", prompt: "助動詞", correctIndex: 0, options: ["ずっと上手にできるようになった", "ずっと上手にできなかった", "ずっと上手にしたかった"] }
          ]
        },
        {
          text: "Her coach told her",
          fixedPhrases: ["コーチは", "彼女に"],
          selectionGroups: [
            { key: "told-her", prompt: "時制", correctIndex: 0, options: ["言った", "言っている", "言う予定だ"] }
          ]
        },
        {
          text: "that she had improved a lot.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "that", prompt: "接続", correctIndex: 0, options: ["彼女が", "しかし彼女が", "だから彼女が"] },
            { key: "had-improved", prompt: "過去完了", correctIndex: 0, options: ["とても上達した", "とても上達している", "とても上達する予定だ"] }
          ]
        }
      ]
    },
    {
      id: 57,
      level: "C",
      english: "Koji needed a book / for his history report. / He first looked for it at the school library, / but another student was using it. / The librarian told him / that the city library had the same book. / So Koji went there after school. / He found the book / and borrowed it for one week. / He finished his report two days later.",
      japanese: "コウジは歴史のレポートのために本が必要でした。学校の図書館で探しましたが、別の生徒が使っていました。司書から市立図書館にも同じ本があると聞き、放課後そこへ行きました。本を見つけて1週間借り、2日後にレポートを完成させました。",
      parts: [
        {
          text: "Koji needed a book",
          fixedPhrases: ["コウジは"],
          selectionGroups: [
            { key: "needed", prompt: "時制", correctIndex: 0, options: ["必要だった", "必要だ", "必要になるだろう"] }
          ]
        },
        {
          text: "for his history report.",
          fixedPhrases: ["歴史のレポートのために"],
          selectionGroups: []
        },
        {
          text: "He first looked for it at the school library,",
          fixedPhrases: ["彼はまず", "学校図書館で"],
          selectionGroups: [
            { key: "looked-for", prompt: "時制", correctIndex: 0, options: ["探した", "見つけた", "借りた"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それを", "彼を", "それらを"] }
          ]
        },
        {
          text: "but another student was using it.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "もし"] },
            { key: "was-using", prompt: "時制", correctIndex: 0, options: ["使っていた", "使った", "使う予定だ"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それを", "彼を", "それらを"] }
          ]
        },
        {
          text: "The librarian told him",
          fixedPhrases: ["司書は", "彼に"],
          selectionGroups: [
            { key: "told", prompt: "時制", correctIndex: 0, options: ["教えた", "見せた", "忘れた"] }
          ]
        },
        {
          text: "that the city library had the same book.",
          fixedPhrases: ["市立図書館に", "同じ本が"],
          selectionGroups: [
            { key: "that", prompt: "接続", correctIndex: 0, options: ["あると", "ないと", "見たいと"] }
          ]
        },
        {
          text: "So Koji went there after school.",
          fixedPhrases: ["だからコウジは", "放課後に"],
          selectionGroups: [
            { key: "went", prompt: "時制", correctIndex: 0, options: ["行った", "行っている", "行くだろう"] },
            { key: "there", prompt: "代名詞", correctIndex: 0, options: ["そこへ", "家へ", "公園へ"] }
          ]
        },
        {
          text: "He found the book",
          fixedPhrases: ["彼は", "その本を"],
          selectionGroups: [
            { key: "found", prompt: "時制", correctIndex: 0, options: ["見つけた", "探した", "読んだ"] }
          ]
        },
        {
          text: "and borrowed it for one week.",
          fixedPhrases: ["そして"],
          selectionGroups: [
            { key: "borrowed", prompt: "時制", correctIndex: 0, options: ["借りた", "返した", "買った"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それを", "彼を", "それらを"] }
          ]
        },
        {
          text: "He finished his report two days later.",
          fixedPhrases: ["彼は", "レポートを", "2日後に"],
          selectionGroups: [
            { key: "finished", prompt: "時制", correctIndex: 0, options: ["終えた", "始めた", "見つけた"] }
          ]
        }
      ]
    },
    {
      id: 58,
      level: "C",
      english: "Yuna received an e-mail from her friend / who lives in Canada. / Her friend asked her / what Japanese food she liked best. / Yuna thought about the question / for a few minutes. / She decided to write about curry rice / because her family often makes it together. / She also sent her friend a picture / that she took at dinner last week.",
      japanese: "ユナはカナダに住む友達からメールを受け取りました。友達は、ユナがどの日本料理を一番好きか尋ねました。ユナは少し考え、家族でよく一緒に作るカレーライスについて書くことにしました。また、先週の夕食時に撮った写真も友達に送りました。",
      parts: [
        {
          text: "Yuna received an e-mail from her friend",
          fixedPhrases: ["ユナは", "友達から", "メールを"],
          selectionGroups: [
            { key: "received", prompt: "時制", correctIndex: 0, options: ["受け取った", "受け取っている", "受け取る予定だ"] }
          ]
        },
        {
          text: "who lives in Canada.",
          fixedPhrases: ["カナダに住む"],
          selectionGroups: []
        },
        {
          text: "Her friend asked her",
          fixedPhrases: ["友達は", "彼女に"],
          selectionGroups: [
            { key: "asked", prompt: "時制", correctIndex: 0, options: ["尋ねた", "答えた", "見せた"] }
          ]
        },
        {
          text: "what Japanese food she liked best.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "what", prompt: "疑問", correctIndex: 0, options: ["どの日本料理を", "いつ日本料理を", "どこで日本料理を"] },
            { key: "liked-best", prompt: "時制", correctIndex: 0, options: ["一番好きか", "一番好きだったか", "一番好きになるか"] }
          ]
        },
        {
          text: "Yuna thought about the question",
          fixedPhrases: ["ユナは", "その質問について"],
          selectionGroups: [
            { key: "thought", prompt: "時制", correctIndex: 0, options: ["考えた", "考えている", "考える予定だ"] }
          ]
        },
        {
          text: "for a few minutes.",
          fixedPhrases: ["数分間"],
          selectionGroups: []
        },
        {
          text: "She decided to write about curry rice",
          fixedPhrases: ["彼女は", "カレーライスについて"],
          selectionGroups: [
            { key: "decided-to-write", prompt: "不定詞", correctIndex: 0, options: ["書くことに決めた", "書くことを忘れた", "書かないことにした"] }
          ]
        },
        {
          text: "because her family often makes it together.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because", prompt: "接続", correctIndex: 0, options: ["なぜなら", "しかし", "それから"] },
            { key: "family-makes", prompt: "時制", correctIndex: 0, options: ["家族がよく一緒に作るから", "家族が一緒に食べるから", "家族が一緒に見たから"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それを", "彼を", "それらを"] }
          ]
        },
        {
          text: "She also sent her friend a picture",
          fixedPhrases: ["彼女はまた", "友達に", "写真を"],
          selectionGroups: [
            { key: "sent", prompt: "時制", correctIndex: 0, options: ["送った", "見せた", "描いた"] }
          ]
        },
        {
          text: "that she took at dinner last week.",
          fixedPhrases: ["彼女が撮った", "先週の夕食時に"],
          selectionGroups: [
            { key: "that", prompt: "接続", correctIndex: 0, options: ["写真を", "友達を", "夕食を"] }
          ]
        }
      ]
    },
    {
      id: 59,
      level: "C",
      english: "Takumi and his classmates planned a school event / for younger students. / They wanted everyone to enjoy it, / so they prepared several games. / On the morning of the event, / one of the games did not work well. / The students were worried, / but their teacher gave them an idea. / They changed the rules a little, / and the younger students had a great time. / Takumi was glad that they did not give up.",
      japanese: "タクミとクラスメートは年下の生徒のために学校行事を計画し、みんなが楽しめるようにいくつかのゲームを準備しました。当日の朝、一つのゲームがうまく動かず心配しましたが、先生からアイデアをもらい、ルールを少し変えました。その結果、年下の生徒たちはとても楽しみ、タクミはみんながあきらめなかったことをうれしく思いました。",
      parts: [
        {
          text: "Takumi and his classmates planned a school event",
          fixedPhrases: ["タクミとクラスメートは", "学校行事を"],
          selectionGroups: [
            { key: "planned", prompt: "時制", correctIndex: 0, options: ["計画した", "計画している", "計画する予定だ"] }
          ]
        },
        {
          text: "for younger students.",
          fixedPhrases: ["年下の生徒たちのために"],
          selectionGroups: []
        },
        {
          text: "They wanted everyone to enjoy it,",
          fixedPhrases: ["彼らは", "それを"],
          selectionGroups: [
            { key: "wanted", prompt: "時制", correctIndex: 0, options: ["みんなに楽しんでほしかった", "みんなに見てほしかった", "みんなに終えてほしかった"] }
          ]
        },
        {
          text: "so they prepared several games.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "so", prompt: "接続", correctIndex: 0, options: ["だから", "しかし", "もし"] },
            { key: "prepared", prompt: "時制", correctIndex: 0, options: ["準備した", "準備している", "準備する予定だ"] },
            { key: "several-games", prompt: "名詞", correctIndex: 0, options: ["いくつかのゲームを", "いくつかの本を", "いくつかの部屋を"] }
          ]
        },
        {
          text: "On the morning of the event,",
          fixedPhrases: ["行事当日の朝"],
          selectionGroups: []
        },
        {
          text: "one of the games did not work well.",
          fixedPhrases: ["ゲームの一つが"],
          selectionGroups: [
            { key: "did-not-work", prompt: "否定", correctIndex: 0, options: ["うまくいかなかった", "うまくいった", "作られた"] }
          ]
        },
        {
          text: "The students were worried,",
          fixedPhrases: ["生徒たちは"],
          selectionGroups: [
            { key: "were-worried", prompt: "状態", correctIndex: 0, options: ["心配した", "安心した", "喜んだ"] }
          ]
        },
        {
          text: "but their teacher gave them an idea.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "もし"] },
            { key: "gave-them", prompt: "代名詞", correctIndex: 0, options: ["彼らにくれた", "彼をくれた", "それをくれた"] },
            { key: "idea", prompt: "名詞", correctIndex: 0, options: ["アイデアを", "地図を", "宿題を"] }
          ]
        },
        {
          text: "They changed the rules a little,",
          fixedPhrases: ["彼らは", "ルールを少し"],
          selectionGroups: [
            { key: "changed", prompt: "時制", correctIndex: 0, options: ["変えた", "変えている", "変える予定だ"] }
          ]
        },
        {
          text: "and the younger students had a great time.",
          fixedPhrases: ["そして年下の生徒たちは"],
          selectionGroups: [
            { key: "had-a-great-time", prompt: "文構造", correctIndex: 0, options: ["とても楽しんだ", "とても困った", "とても急いだ"] }
          ]
        },
        {
          text: "Takumi was glad that they did not give up.",
          fixedPhrases: ["タクミはうれしかった"],
          selectionGroups: [
            { key: "that", prompt: "接続", correctIndex: 0, options: ["彼らが", "彼が", "それが"] },
            { key: "did-not-give-up", prompt: "否定", correctIndex: 0, options: ["あきらめなかった", "あきらめた", "あきらめる予定だ"] }
          ]
        }
      ]
    },
    {
      id: 60,
      level: "A",
      english: "Have you ever been to Kyoto / before?",
      japanese: "あなたは以前、京都へ行ったことがありますか。",
      parts: [
        {
          text: "Have you ever been to Kyoto",
          fixedPhrases: ["あなたは", "京都へ"],
          selectionGroups: [
            { key: "have-never-been", prompt: "経験", correctIndex: 0, options: ["行ったことがありますか", "今行っていますか", "行く予定ですか"] }
          ]
        },
        {
          text: "before?",
          fixedPhrases: ["以前に"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 61,
      level: "A",
      english: "You should take an umbrella / because it may rain.",
      japanese: "雨が降るかもしれないので、傘を持っていくべきです。",
      parts: [
        {
          text: "You should take an umbrella",
          fixedPhrases: ["あなたは", "傘を"],
          selectionGroups: [
            { key: "should", prompt: "助動詞", correctIndex: 0, options: ["持っていくべきだ", "持っていくことがある", "持っていく予定だった"] }
          ]
        },
        {
          text: "because it may rain.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because", prompt: "接続", correctIndex: 0, options: ["なぜなら", "しかし", "もし"] },
            { key: "may", prompt: "助動詞", correctIndex: 0, options: ["降るかもしれない", "降ったにちがいない", "降る必要がある"] }
          ]
        }
      ]
    },
    {
      id: 62,
      level: "A",
      english: "This box is too heavy / for me to carry.",
      japanese: "この箱は私が運ぶには重すぎます。",
      parts: [
        {
          text: "This box is too heavy",
          fixedPhrases: ["この箱は"],
          selectionGroups: [
            { key: "too", prompt: "程度", correctIndex: 0, options: ["重すぎる", "重くない", "ちょうどよい"] }
          ]
        },
        {
          text: "for me to carry.",
          fixedPhrases: ["私が", "運ぶには"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 63,
      level: "B",
      english: "Since I moved to this town, / I have made many friends / at school.",
      japanese: "この町へ引っ越して以来、私は学校でたくさん友達ができました。",
      parts: [
        {
          text: "Since I moved to this town,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "since", prompt: "接続", correctIndex: 0, options: ["～して以来", "～する前に", "～したので"] }
          ]
        },
        {
          text: "I have made many friends",
          fixedPhrases: ["私は", "たくさん友達が"],
          selectionGroups: [
            { key: "have-made", prompt: "現在完了", correctIndex: 0, options: ["できました", "できています", "できるでしょう"] }
          ]
        },
        {
          text: "at school.",
          fixedPhrases: ["学校で"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 64,
      level: "B",
      english: "My teacher told us / that the museum would close early / that day.",
      japanese: "先生は、その日は博物館が早く閉まると私たちに言いました。",
      parts: [
        {
          text: "My teacher told us",
          fixedPhrases: ["先生は"],
          selectionGroups: [
            { key: "told-us", prompt: "動詞", correctIndex: 0, options: ["私たちに言った", "私たちに聞いた", "私たちに見せた"] }
          ]
        },
        {
          text: "that the museum would close early",
          fixedPhrases: ["博物館が", "早く"],
          selectionGroups: [
            { key: "that", prompt: "時制", correctIndex: 0, options: ["閉まると", "閉まるだろうと", "閉まったと"] }
          ]
        },
        {
          text: "that day.",
          fixedPhrases: ["その日"] ,
          selectionGroups: []
        }
      ]
    },
    {
      id: 65,
      level: "B",
      english: "I didn't know / which bus to take, / so I asked a station worker.",
      japanese: "私はどのバスに乗ればよいか分からなかったので、駅員に尋ねました。",
      parts: [
        {
          text: "I didn't know",
          fixedPhrases: ["私は"],
          selectionGroups: [
            { key: "didnt-know", prompt: "否定", correctIndex: 0, options: ["分からなかった", "分かっていた", "考えた"] }
          ]
        },
        {
          text: "which bus to take,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "which-bus-to-take", prompt: "疑問詞＋to", correctIndex: 0, options: ["どのバスに乗ればよいか", "どのバスに乗ったか", "どのバスに乗る予定か"] }
          ]
        },
        {
          text: "so I asked a station worker.",
          fixedPhrases: ["だから私は", "駅員に"],
          selectionGroups: [
            { key: "so", prompt: "接続", correctIndex: 0, options: ["尋ねた", "待った", "走った"] }
          ]
        }
      ]
    },
    {
      id: 66,
      level: "B",
      english: "The boy who is standing by the door / is my cousin / from Nagoya.",
      japanese: "ドアのそばに立っている男の子は、名古屋から来たいとこです。",
      parts: [
        {
          text: "The boy who is standing by the door",
          fixedPhrases: ["その男の子は", "ドアのそばに"],
          selectionGroups: [
            { key: "who", prompt: "関係代名詞", correctIndex: 0, options: ["立っている", "立っていた", "立つだろう"] }
          ]
        },
        {
          text: "is my cousin",
          fixedPhrases: ["私のいとこです"],
          selectionGroups: []
        },
        {
          text: "from Nagoya.",
          fixedPhrases: ["名古屋から来た"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 67,
      level: "B",
      english: "Mika was so tired / that she went to bed / before nine.",
      japanese: "ミカはとても疲れていたので、9時前に寝ました。",
      parts: [
        {
          text: "Mika was so tired",
          fixedPhrases: ["ミカは"],
          selectionGroups: [
            { key: "so", prompt: "程度", correctIndex: 0, options: ["とても疲れていた", "あまり疲れていなかった", "少し疲れそうだった"] }
          ]
        },
        {
          text: "that she went to bed",
          fixedPhrases: [],
          selectionGroups: [
            { key: "that", prompt: "結果", correctIndex: 0, options: ["そのため彼女は寝た", "そのため彼女は起きた", "しかし彼女は歩いた"] }
          ]
        },
        {
          text: "before nine.",
          fixedPhrases: ["9時前に"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 68,
      level: "B",
      english: "I was looking for my keys / when my brother found them / under the table.",
      japanese: "私が鍵を探していたとき、弟がテーブルの下でそれらを見つけました。",
      parts: [
        {
          text: "I was looking for my keys",
          fixedPhrases: ["私は"],
          selectionGroups: [
            { key: "was-looking", prompt: "過去進行形", correctIndex: 0, options: ["鍵を探していた", "鍵を見つけた", "鍵を持っていた"] }
          ]
        },
        {
          text: "when my brother found them",
          fixedPhrases: [],
          selectionGroups: [
            { key: "when", prompt: "接続", correctIndex: 0, options: ["～したとき", "～したあとで", "～する前に"] },
            { key: "found", prompt: "時制", correctIndex: 0, options: ["弟がそれらを見つけた", "弟がそれを忘れた", "弟がそれらを持った"] }
          ]
        },
        {
          text: "under the table.",
          fixedPhrases: ["テーブルの下で"],
          selectionGroups: []
        }
      ]
    },
    {
      id: 69,
      level: "C",
      english: "Mai received a message from her cousin / on Saturday morning. / Her cousin wanted to visit a new shopping mall / near Mai's house. / Mai had never been there, / so they decided to go together. / When they arrived, / many people were waiting outside. / They learned that the mall would open / thirty minutes later. / Instead of going home, / they waited at a nearby cafe.",
      japanese: "マイは土曜日の朝、いとこから連絡を受けました。いとこはマイの家の近くにできた新しいショッピングモールへ行きたがっていました。マイも行ったことがなかったので、一緒に行くことにしました。着いてみると多くの人が外で待っており、開店は30分後だと分かりました。二人は家へ帰らず、近くのカフェで待つことにしました。",
      parts: [
        {
          text: "Mai received a message from her cousin",
          fixedPhrases: ["マイは", "いとこから", "メッセージを"],
          selectionGroups: [
            { key: "received", prompt: "時制", correctIndex: 0, options: ["受け取った", "受け取っている", "受け取る予定だ"] }
          ]
        },
        {
          text: "on Saturday morning.",
          fixedPhrases: ["土曜日の朝に"],
          selectionGroups: []
        },
        {
          text: "Her cousin wanted to visit a new shopping mall",
          fixedPhrases: ["いとこは", "新しいショッピングモールへ"],
          selectionGroups: [
            { key: "wanted-to-visit", prompt: "不定詞", correctIndex: 0, options: ["行きたがっていた", "行きたかった", "行く必要があった"] }
          ]
        },
        {
          text: "near Mai's house.",
          fixedPhrases: ["マイの家の近くの"],
          selectionGroups: []
        },
        {
          text: "Mai had never been there,",
          fixedPhrases: ["マイは", "そこへ"],
          selectionGroups: [
            { key: "had-never-been", prompt: "現在完了", correctIndex: 0, options: ["一度も行ったことがなかった", "何度も行ったことがあった", "行くつもりだった"] }
          ]
        },
        {
          text: "so they decided to go together.",
          fixedPhrases: ["だから二人は"],
          selectionGroups: [
            { key: "so", prompt: "接続", correctIndex: 0, options: ["一緒に行くことに決めた", "別々に帰ることにした", "すぐ電話することにした"] }
          ]
        },
        {
          text: "When they arrived,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "when", prompt: "接続", correctIndex: 0, options: ["～したとき", "～する前に", "～したので"] }
          ]
        },
        {
          text: "many people were waiting outside.",
          fixedPhrases: ["多くの人が", "外で"],
          selectionGroups: [
            { key: "were-waiting", prompt: "時制", correctIndex: 0, options: ["待っていた", "待った", "待つだろう"] }
          ]
        },
        {
          text: "They learned that the mall would open",
          fixedPhrases: ["二人は", "モールが開くと"],
          layoutOrder: ["f0", "g0", "f1"],
          selectionGroups: [
            { key: "learned", prompt: "時制", correctIndex: 0, options: ["知った", "忘れた", "思った"] }
          ]
        },
        {
          text: "thirty minutes later.",
          fixedPhrases: ["30分後に"],
          selectionGroups: []
        },
        {
          text: "Instead of going home,",
          fixedPhrases: ["家へ帰る代わりに"],
          selectionGroups: [
            { key: "instead-of", prompt: "接続", correctIndex: 0, options: ["instead of ～ing", "because of ～ing", "before ～ing"] }
          ]
        },
        {
          text: "they waited at a nearby cafe.",
          fixedPhrases: ["二人は", "近くのカフェで"],
          selectionGroups: [
            { key: "waited", prompt: "時制", correctIndex: 0, options: ["待った", "探した", "歩いた"] }
          ]
        }
      ]
    },
    {
      id: 70,
      level: "C",
      english: "Ken's class was preparing for a school festival / when their teacher gave them some news. / The room they planned to use / was not available. / At first, the students were disappointed, / because they had already decorated it. / However, another teacher offered them a larger room. / The students moved their decorations there / and changed their plan a little. / In the end, / more people could visit their activity / than they had expected.",
      japanese: "ケンのクラスが学校祭の準備をしていると、使う予定だった部屋が使えなくなったと先生から知らされました。すでに飾り付けもしていたため最初はがっかりしましたが、別の先生がより大きな部屋を用意してくれました。飾りを移して計画を少し変えた結果、予想していたより多くの人が参加してくれました。",
      parts: [
        {
          text: "Ken's class was preparing for a school festival",
          fixedPhrases: ["ケンのクラスは"],
          selectionGroups: [
            { key: "was-preparing", prompt: "進行形", correctIndex: 0, options: ["準備していた", "準備した", "準備する予定だった"] }
          ]
        },
        {
          text: "when their teacher gave them some news.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "when", prompt: "接続", correctIndex: 0, options: ["～したとき", "～する前に", "～したので"] },
            { key: "gave-them", prompt: "代名詞", correctIndex: 0, options: ["先生が彼らに知らせた", "先生が彼を知らせた", "先生がそれを知らせた"] }
          ]
        },
        {
          text: "The room they planned to use",
          fixedPhrases: ["その部屋は"],
          selectionGroups: [
            { key: "they-planned", prompt: "関係代名詞", correctIndex: 0, options: ["彼らが使う予定だった", "彼らが掃除したかった", "彼らが見たかった"] }
          ]
        },
        {
          text: "was not available.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "was-not-available", prompt: "否定", correctIndex: 0, options: ["使えなかった", "使えた", "開いていた"] }
          ]
        },
        {
          text: "At first, the students were disappointed,",
          fixedPhrases: ["最初は", "生徒たちは"],
          selectionGroups: [
            { key: "were-disappointed", prompt: "状態", correctIndex: 0, options: ["がっかりした", "喜んだ", "緊張した"] }
          ]
        },
        {
          text: "because they had already decorated it.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because", prompt: "接続", correctIndex: 0, options: ["なぜなら", "しかし", "もし"] },
            { key: "had-already-decorated", prompt: "過去完了", correctIndex: 0, options: ["すでに飾り付けていた", "まだ飾り付けていなかった", "すぐに飾り付ける予定だった"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["そこを", "それを", "彼を"] }
          ]
        },
        {
          text: "However, another teacher offered them a larger room.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "however", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "それから"] },
            { key: "offered", prompt: "時制", correctIndex: 0, options: ["用意してくれた", "借りた", "見せた"] },
            { key: "larger", prompt: "比較", correctIndex: 0, options: ["より大きな部屋", "より小さな部屋", "同じ大きさの部屋"] }
          ]
        },
        {
          text: "The students moved their decorations there",
          fixedPhrases: ["生徒たちは", "飾りを"],
          selectionGroups: [
            { key: "moved", prompt: "時制", correctIndex: 0, options: ["移した", "見つけた", "作った"] },
            { key: "there", prompt: "代名詞", correctIndex: 0, options: ["そこへ", "それを", "そこで"] }
          ]
        },
        {
          text: "and changed their plan a little.",
          fixedPhrases: ["そして", "計画を少し"],
          selectionGroups: [
            { key: "changed", prompt: "時制", correctIndex: 0, options: ["変えた", "変えている", "変える予定だ"] }
          ]
        },
        {
          text: "In the end,",
          fixedPhrases: ["最終的に"],
          selectionGroups: []
        },
        {
          text: "more people could visit their activity",
          fixedPhrases: ["より多くの人が", "彼らの活動に"],
          selectionGroups: [
            { key: "could-visit", prompt: "助動詞", correctIndex: 0, options: ["参加できた", "参加しなければならなかった", "参加したことがある"] }
          ]
        },
        {
          text: "than they had expected.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "than", prompt: "比較", correctIndex: 0, options: ["彼らが予想したより", "彼らが知ったあとで", "彼らが行く前に"] }
          ]
        }
      ]
    },
    {
      id: 71,
      level: "C",
      english: "Ryo wanted to improve his English, / so he started watching short videos / in English every evening. / At first, he could understand only a few words. / His teacher told him / not to worry about understanding everything. / She suggested watching the same video several times. / Ryo followed her advice, / and after a few weeks, / he noticed that he could understand much more. / Now he enjoys studying English this way.",
      japanese: "リョウは英語を上達させたくて、毎晩短い英語の動画を見るようになりました。最初は少ししか理解できませんでしたが、先生から全部理解しようと心配せず、同じ動画を何度か見るよう勧められました。その助言を続けると、数週間後には以前よりずっと理解できるようになったことに気づきました。今ではこの方法で英語を勉強することを楽しんでいます。",
      parts: [
        {
          text: "Ryo wanted to improve his English,",
          fixedPhrases: ["リョウは", "英語を"],
          selectionGroups: [
            { key: "wanted-to-improve", prompt: "不定詞", correctIndex: 0, options: ["上達させたかった", "上達させている", "上達させる必要がない"] }
          ]
        },
        {
          text: "so he started watching short videos",
          fixedPhrases: [],
          selectionGroups: [
            { key: "so", prompt: "接続", correctIndex: 0, options: ["だから", "しかし", "～したあとで"] },
            { key: "started-watching", prompt: "動名詞", correctIndex: 0, options: ["見始めた", "見続けた", "見た"] }
          ]
        },
        {
          text: "in English every evening.",
          fixedPhrases: ["英語で", "毎晩"],
          selectionGroups: []
        },
        {
          text: "At first, he could understand only a few words.",
          fixedPhrases: ["最初は彼は"],
          selectionGroups: [
            { key: "only-a-few", prompt: "数量", correctIndex: 0, options: ["少しの単語しか理解できなかった", "多くの単語を理解できた", "単語をすぐ話せた"] }
          ]
        },
        {
          text: "His teacher told him",
          fixedPhrases: ["先生は", "彼に"],
          selectionGroups: [
            { key: "told-him", prompt: "時制", correctIndex: 0, options: ["言った", "尋ねた", "見せた"] }
          ]
        },
        {
          text: "not to worry about understanding everything.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "not-to-worry", prompt: "不定詞", correctIndex: 0, options: ["心配しないように", "心配するために", "心配したあとで"] },
            { key: "understanding-everything", prompt: "文構造", correctIndex: 0, options: ["すべてを理解することを", "すべてを忘れることを", "すべてを読むことを"] }
          ]
        },
        {
          text: "She suggested watching the same video several times.",
          fixedPhrases: ["先生は"],
          selectionGroups: [
            { key: "suggested", prompt: "時制", correctIndex: 0, options: ["勧めた", "止めた", "隠した"] },
            { key: "watching-the-same-video", prompt: "動名詞", correctIndex: 0, options: ["同じ動画を何度か見ること", "別の動画を1回見ること", "動画を作ること"] }
          ]
        },
        {
          text: "Ryo followed her advice,",
          fixedPhrases: ["リョウは", "彼女の助言に"],
          selectionGroups: [
            { key: "followed", prompt: "時制", correctIndex: 0, options: ["従った", "聞かなかった", "覚えた"] }
          ]
        },
        {
          text: "and after a few weeks,",
          fixedPhrases: ["そして数週間後"],
          selectionGroups: []
        },
        {
          text: "he noticed that he could understand much more.",
          fixedPhrases: ["彼は", "もっと理解できるようになったと"],
          layoutOrder: ["f0", "g0", "f1"],
          selectionGroups: [
            { key: "noticed", prompt: "時制", correctIndex: 0, options: ["気づいた", "思った", "忘れた"] }
          ]
        },
        {
          text: "Now he enjoys studying English this way.",
          fixedPhrases: ["今では彼は", "この方法で英語を勉強することを"],
          selectionGroups: [
            { key: "enjoys", prompt: "動詞", correctIndex: 0, options: ["楽しんでいる", "やめた", "忘れた"] }
          ]
        }
      ]
    },
    {
      id: 72,
      level: "C",
      english: "Nana's grandmother lives in a small town / near the sea. / During summer vacation, / Nana stayed with her for three days. / One morning, her grandmother asked her / to help pick vegetables in the garden. / After they finished the work, / they used some of the vegetables / to make lunch together. / Nana had never cooked that dish before, / but her grandmother showed her what to do. / Nana liked the meal so much / that she asked for the recipe.",
      japanese: "ナナの祖母は海の近くの小さな町に住んでいます。夏休みにナナは祖母の家に3日間泊まりました。ある朝、庭で野菜を採るのを手伝い、作業後、その野菜を使って一緒に昼食を作りました。ナナはその料理を作ったことがありませんでしたが、祖母が作り方を教えてくれました。とてもおいしかったので、ナナはレシピを教えてもらいました。",
      parts: [
        {
          text: "Nana's grandmother lives in a small town",
          fixedPhrases: ["ナナの祖母は", "小さな町に"],
          selectionGroups: [
            { key: "lives", prompt: "時制", correctIndex: 0, options: ["住んでいる", "住んでいた", "住む予定だ"] }
          ]
        },
        {
          text: "near the sea.",
          fixedPhrases: ["海の近くの"],
          selectionGroups: []
        },
        {
          text: "During summer vacation,",
          fixedPhrases: ["夏休みの間"],
          selectionGroups: []
        },
        {
          text: "Nana stayed with her for three days.",
          fixedPhrases: ["ナナは", "祖母の家に"],
          selectionGroups: [
            { key: "stayed", prompt: "時制", correctIndex: 0, options: ["泊まった", "泊まっている", "泊まる予定だ"] },
            { key: "for-three-days", prompt: "期間", correctIndex: 0, options: ["3日間", "3週間", "3か月間"] }
          ]
        },
        {
          text: "One morning, her grandmother asked her",
          fixedPhrases: ["ある朝", "祖母は", "ナナに"],
          selectionGroups: [
            { key: "asked", prompt: "時制", correctIndex: 0, options: ["頼んだ", "見せた", "教えた"] }
          ]
        },
        {
          text: "to help pick vegetables in the garden.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "to-help-pick", prompt: "不定詞", correctIndex: 0, options: ["手伝うように", "手伝わないように", "手伝ったあとで"] },
            { key: "pick-vegetables", prompt: "文構造", correctIndex: 0, options: ["庭で野菜を採るのを", "庭で花を植えるのを", "庭を歩くのを"] }
          ]
        },
        {
          text: "After they finished the work,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "after", prompt: "接続", correctIndex: 0, options: ["～した後で", "～する前に", "～したので"] }
          ]
        },
        {
          text: "they used some of the vegetables",
          fixedPhrases: ["二人は", "野菜の一部を"],
          selectionGroups: [
            { key: "used", prompt: "時制", correctIndex: 0, options: ["使った", "見つけた", "食べた"] }
          ]
        },
        {
          text: "to make lunch together.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "to-make-lunch", prompt: "不定詞", correctIndex: 0, options: ["一緒に昼食を作るために", "一緒に昼食を食べるために", "一緒に昼食を探すために"] }
          ]
        },
        {
          text: "Nana had never cooked that dish before,",
          fixedPhrases: ["ナナは", "その料理を以前に"],
          selectionGroups: [
            { key: "had-never-cooked", prompt: "過去完了", correctIndex: 0, options: ["一度も作ったことがなかった", "何度も作ったことがあった", "作る予定だった"] }
          ]
        },
        {
          text: "but her grandmother showed her what to do.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "もし"] },
            { key: "showed", prompt: "動詞", correctIndex: 0, options: ["教えた", "隠した", "忘れた"] },
            { key: "what-to-do", prompt: "疑問詞＋to", correctIndex: 0, options: ["何をすればよいか", "どこへ行くか", "いつ始めるか"] }
          ]
        },
        {
          text: "Nana liked the meal so much",
          fixedPhrases: ["ナナは", "その料理をとても"],
          selectionGroups: [
            { key: "liked", prompt: "動詞", correctIndex: 0, options: ["気に入った", "作った", "見た"] }
          ]
        },
        {
          text: "that she asked for the recipe.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "so", prompt: "結果", correctIndex: 0, options: ["そのため彼女は", "しかし彼女は", "その前に彼女は"] },
            { key: "asked-for-recipe", prompt: "動詞", correctIndex: 0, options: ["レシピを尋ねた", "料理を始めた", "家へ帰った"] }
          ]
        }
      ]
    },
    {
      id: 73,
      level: "C",
      english: "Sota was going to play soccer / with his friends after school, / but one of them hurt his leg / during P.E. class. / They decided not to play soccer that day. / Instead, they went to the library / to work on their science project. / While they were looking for information, / they found an interesting book about space. / They borrowed it / because they thought it would help their project.",
      japanese: "ソウタは放課後に友達とサッカーをする予定でしたが、そのうちの一人が体育の授業で足を痛めました。その日はサッカーをせず、代わりに理科の課題をするため図書館へ行きました。情報を探していると宇宙についての面白い本を見つけ、課題に役立つと思って借りました。",
      parts: [
        {
          text: "Sota was going to play soccer",
          fixedPhrases: ["ソウタは"],
          selectionGroups: [
            { key: "was-going-to", prompt: "予定", correctIndex: 0, options: ["サッカーをする予定だった", "サッカーをしていた", "サッカーをした"] }
          ]
        },
        {
          text: "with his friends after school,",
          fixedPhrases: ["友達と", "放課後に"],
          selectionGroups: []
        },
        {
          text: "but one of them hurt his leg",
          fixedPhrases: [],
          selectionGroups: [
            { key: "but", prompt: "接続", correctIndex: 0, options: ["しかし", "だから", "もし"] },
            { key: "one-of-them", prompt: "代名詞", correctIndex: 0, options: ["彼らの一人が", "彼の一人が", "それらの一人が"] },
            { key: "hurt", prompt: "時制", correctIndex: 0, options: ["足を痛めた", "足を見た", "足を洗った"] }
          ]
        },
        {
          text: "during P.E. class.",
          fixedPhrases: ["体育の授業中に"],
          selectionGroups: []
        },
        {
          text: "They decided not to play soccer that day.",
          fixedPhrases: ["彼らは", "その日はサッカーを"],
          selectionGroups: [
            { key: "not-to-play", prompt: "不定詞", correctIndex: 0, options: ["しないことに決めた", "しなかったことに決めた", "することに決めた"] }
          ]
        },
        {
          text: "Instead, they went to the library",
          fixedPhrases: ["代わりに彼らは", "図書館へ"],
          selectionGroups: [
            { key: "went", prompt: "時制", correctIndex: 0, options: ["行った", "行っている", "行くだろう"] }
          ]
        },
        {
          text: "to work on their science project.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "to-work", prompt: "不定詞", correctIndex: 0, options: ["取り組むために", "取り組んでいる間に", "取り組んだあとで"] },
            { key: "science-project", prompt: "名詞", correctIndex: 0, options: ["理科の課題に", "数学の問題に", "音楽の練習に"] }
          ]
        },
        {
          text: "While they were looking for information,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "while", prompt: "接続", correctIndex: 0, options: ["～している間", "～したあとで", "～する前に"] },
            { key: "looking-for", prompt: "進行形", correctIndex: 0, options: ["彼らが情報を探していた", "彼らが情報を探した", "彼らが情報を探す予定だ"] }
          ]
        },
        {
          text: "they found an interesting book about space.",
          fixedPhrases: ["彼らは", "宇宙についての面白い本を"],
          selectionGroups: [
            { key: "found", prompt: "時制", correctIndex: 0, options: ["見つけた", "読んだ", "借りた"] }
          ]
        },
        {
          text: "They borrowed it",
          fixedPhrases: ["彼らは", "それを"],
          selectionGroups: [
            { key: "borrowed", prompt: "時制", correctIndex: 0, options: ["借りた", "返した", "売った"] }
          ]
        },
        {
          text: "because they thought it would help their project.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "because", prompt: "接続", correctIndex: 0, options: ["なぜなら", "しかし", "それから"] },
            { key: "thought", prompt: "時制", correctIndex: 0, options: ["～と思った", "～を忘れた", "～を見た"] },
            { key: "it-help", prompt: "代名詞", correctIndex: 0, options: ["それが課題に役立つだろうと", "それが課題に必要だと", "それが課題を終えたと"] }
          ]
        }
      ]
    },
    {
      id: 74,
      level: "C",
      english: "Eri saw a poster about a volunteer event / at her community center. / The event was for people / who wanted to clean a nearby park. / Eri had never joined a volunteer event before, / but she decided to try it. / On Sunday morning, / she met the other volunteers at the park. / They picked up trash / and planted some flowers. / After the work was finished, / Eri was tired but happy. / She said that she wanted to join again / if there was another event.",
      japanese: "エリは地域センターで、公園を掃除するボランティア活動のポスターを見ました。参加したことはありませんでしたが、やってみることにしました。日曜日に他の参加者と公園でごみを拾い、花を植えました。作業後は疲れていましたが、うれしい気持ちになり、別の機会があればまた参加したいと言いました。",
      parts: [
        {
          text: "Eri saw a poster about a volunteer event",
          fixedPhrases: ["エリは", "ボランティア活動についての"],
          selectionGroups: [
            { key: "saw", prompt: "時制", correctIndex: 0, options: ["ポスターを見た", "ポスターを作った", "ポスターを配った"] }
          ]
        },
        {
          text: "at her community center.",
          fixedPhrases: ["地域センターで"],
          selectionGroups: []
        },
        {
          text: "The event was for people",
          fixedPhrases: ["その活動は", "人々のためのものだった"],
          selectionGroups: []
        },
        {
          text: "who wanted to clean a nearby park.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "who", prompt: "関係代名詞", correctIndex: 0, options: ["近くの公園を掃除したい", "近くの公園を見たい", "近くの公園を走りたい"] }
          ]
        },
        {
          text: "Eri had never joined a volunteer event before,",
          fixedPhrases: ["エリは", "一度も参加したことがなかった"],
          selectionGroups: [
            { key: "had-never-joined", prompt: "過去完了", correctIndex: 0, options: ["ボランティア活動に", "学校行事に", "会話練習に"] }
          ]
        },
        {
          text: "but she decided to try it.",
          fixedPhrases: ["しかし彼女は", "やってみることに"],
          selectionGroups: [
            { key: "decided", prompt: "時制", correctIndex: 0, options: ["決めた", "忘れた", "行った"] },
            { key: "it", prompt: "代名詞", correctIndex: 0, options: ["それを", "彼を", "それらを"] }
          ]
        },
        {
          text: "On Sunday morning,",
          fixedPhrases: ["日曜日の朝"],
          selectionGroups: []
        },
        {
          text: "she met the other volunteers at the park.",
          fixedPhrases: ["彼女は", "他の参加者に", "公園で"],
          layoutOrder: ["f0", "g0", "f1", "f2"],
          selectionGroups: [
            { key: "met", prompt: "時制", correctIndex: 0, options: ["会った", "見た", "探した"] }
          ]
        },
        {
          text: "They picked up trash",
          fixedPhrases: ["彼らは", "ごみを"],
          selectionGroups: [
            { key: "picked-up", prompt: "時制", correctIndex: 0, options: ["拾った", "捨てた", "見つけた"] }
          ]
        },
        {
          text: "and planted some flowers.",
          fixedPhrases: ["そして", "花を"],
          selectionGroups: [
            { key: "planted", prompt: "時制", correctIndex: 0, options: ["植えた", "描いた", "集めた"] }
          ]
        },
        {
          text: "After the work was finished,",
          fixedPhrases: [],
          selectionGroups: [
            { key: "after", prompt: "接続", correctIndex: 0, options: ["～した後で", "～する前に", "～している間に"] },
            { key: "work-finished", prompt: "受動態", correctIndex: 0, options: ["作業が終わった", "作業が始まった", "作業が続いた"] }
          ]
        },
        {
          text: "Eri was tired but happy.",
          fixedPhrases: ["エリは", "疲れていたがうれしかった"],
          selectionGroups: []
        },
        {
          text: "She said that she wanted to join again",
          fixedPhrases: ["彼女は言った"],
          selectionGroups: [
            { key: "that", prompt: "接続", correctIndex: 0, options: ["また参加したいと", "帰りたいと", "休みたいと"] }
          ]
        },
        {
          text: "if there was another event.",
          fixedPhrases: [],
          selectionGroups: [
            { key: "if", prompt: "接続", correctIndex: 0, options: ["もし", "なぜなら", "しかし"] },
            { key: "there-was", prompt: "存在", correctIndex: 0, options: ["別のイベントがあれば", "別のイベントで", "別のイベントに"] }
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

  function shuffleArray(source = [], randomFn = Math.random) {
    const result = Array.isArray(source) ? source.slice() : [];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(randomFn() * (index + 1));
      const temp = result[index];
      result[index] = result[swapIndex];
      result[swapIndex] = temp;
    }
    return result;
  }

  function buildTranslationTrainingSessionLevelOrder(levelCounts, randomFn = Math.random) {
    const buckets = [];
    Object.keys(levelCounts || {}).forEach((level) => {
      const count = Math.max(0, Number(levelCounts[level]) || 0);
      for (let index = 0; index < count; index += 1) {
        buckets.push(level);
      }
    });

    if (!buckets.length) {
      return [];
    }

    const isValidOrder = (order) => {
      if (!order.length) return false;
      if (order[0] === "C") return false;
      let maxStreak = 1;
      let currentStreak = 1;
      for (let index = 1; index < order.length; index += 1) {
        if (order[index] === "C" && order[index - 1] === "C") {
          return false;
        }
        if (order[index] === order[index - 1]) {
          currentStreak += 1;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }
      return maxStreak <= 2;
    };

    for (let attempt = 0; attempt < 250; attempt += 1) {
      const candidate = shuffleArray(buckets, randomFn);
      if (isValidOrder(candidate)) {
        return candidate;
      }
    }

    // Fallback sequence that keeps levels mixed, avoids C adjacency, and starts from non-C.
    return ["A", "B", "A", "C", "B", "B", "A", "C", "B", "C"];
  }

  function createTranslationTrainingSessionQuestions(questionBank = [], options = {}) {
    const source = Array.isArray(questionBank) ? questionBank : [];
    const randomFn = typeof options.randomFn === "function" ? options.randomFn : Math.random;
    const requestedLevelCounts = options.levelCounts && typeof options.levelCounts === "object"
      ? options.levelCounts
      : { A: 3, B: 4, C: 3 };

    const normalizedLevelCounts = {
      A: Math.max(0, Number(requestedLevelCounts.A) || 0),
      B: Math.max(0, Number(requestedLevelCounts.B) || 0),
      C: Math.max(0, Number(requestedLevelCounts.C) || 0)
    };

    const groupedByLevel = {
      A: source.filter((question) => String(question?.level || "").toUpperCase() === "A"),
      B: source.filter((question) => String(question?.level || "").toUpperCase() === "B"),
      C: source.filter((question) => String(question?.level || "").toUpperCase() === "C")
    };

    const hasRequiredBank = ["A", "B", "C"].every((level) => groupedByLevel[level].length >= normalizedLevelCounts[level]);
    if (!hasRequiredBank) {
      const fallbackSize = normalizedLevelCounts.A + normalizedLevelCounts.B + normalizedLevelCounts.C;
      return shuffleArray(source, randomFn).slice(0, Math.max(0, fallbackSize));
    }

    const selectedByLevel = {
      A: shuffleArray(groupedByLevel.A, randomFn).slice(0, normalizedLevelCounts.A),
      B: shuffleArray(groupedByLevel.B, randomFn).slice(0, normalizedLevelCounts.B),
      C: shuffleArray(groupedByLevel.C, randomFn).slice(0, normalizedLevelCounts.C)
    };

    const levelOrder = buildTranslationTrainingSessionLevelOrder(normalizedLevelCounts, randomFn);
    const usedByLevel = { A: 0, B: 0, C: 0 };
    const result = [];

    levelOrder.forEach((level) => {
      const list = selectedByLevel[level] || [];
      const pointer = usedByLevel[level] || 0;
      if (list[pointer]) {
        result.push(list[pointer]);
        usedByLevel[level] = pointer + 1;
      }
    });

    return result;
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
      partSelections: {},
      partFixedTaps: {}
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
      partSelections: {},
      partFixedTaps: {}
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
    const customOrder = Array.isArray(safePart?.layoutOrder) ? safePart.layoutOrder : [];
    const sequence = [];

    if (customOrder.length) {
      const usedFixed = new Set();
      const usedGroups = new Set();

      customOrder.forEach((token) => {
        const value = String(token || "").trim();
        if (/^f\d+$/.test(value)) {
          const fixedIndex = Number(value.slice(1));
          if (!Number.isInteger(fixedIndex) || usedFixed.has(fixedIndex)) return;
          const phrase = String(displayFixedPhrases[fixedIndex] || "").trim();
          if (!phrase) return;
          usedFixed.add(fixedIndex);
          sequence.push({ type: "fixed", phrases: [phrase] });
          return;
        }

        if (/^g\d+$/.test(value)) {
          const groupIndex = Number(value.slice(1));
          if (!Number.isInteger(groupIndex) || usedGroups.has(groupIndex) || !selectionGroups[groupIndex]) return;
          usedGroups.add(groupIndex);
          sequence.push({ type: "column", group: selectionGroups[groupIndex], groupIndex });
        }
      });

      displayFixedPhrases.forEach((phrase, index) => {
        if (usedFixed.has(index)) return;
        const text = String(phrase || "").trim();
        if (!text) return;
        sequence.push({ type: "fixed", phrases: [text] });
      });

      selectionGroups.forEach((group, index) => {
        if (usedGroups.has(index)) return;
        sequence.push({ type: "column", group, groupIndex: index });
      });

      return sequence;
    }

    if (displayFixedPhrases.length) {
      sequence.push({ type: "fixed", phrases: displayFixedPhrases });
    }
    if (!selectionGroups.length) {
      return sequence;
    }
    if (selectionGroups.length <= 1) {
      sequence.push({ type: "column", group: selectionGroups[0], groupIndex: 0 });
      return sequence;
    }
    selectionGroups.forEach((group, index) => {
      sequence.push({ type: "column", group, groupIndex: index });
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
    createTranslationTrainingSessionQuestions,
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
