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
