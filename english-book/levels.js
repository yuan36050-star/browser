/*
 * Difficulty levels and the units beyond the core CET-4 book in data.js.
 * Same unit shape as data.js, plus `level` and an optional `daily: true`
 * for everyday-life topics (used by the 日常生活 filter).
 */
(function (BOOK) {
  BOOK.levels = [
    { id: "beginner", zh: "初级", en: "Beginner", cefr: "A2", desc: "日常生活基础词汇，初中到高中水平" },
    { id: "intermediate", zh: "中级", en: "Intermediate", cefr: "B1", desc: "大学英语四级 CET-4 核心词汇" },
    { id: "advanced", zh: "高级", en: "Advanced", cefr: "B2–C1", desc: "六级 / 雅思水平的学术与社会话题" }
  ];

  const beginner = [
    {
      id: "b1", level: "beginner", daily: true, title: "Food & Drink", titleZh: "饮食", emoji: "🍜",
      words: [
        { w: "breakfast", ph: "/ˈbrekfəst/", pos: "n.", zh: "早餐", ex: "I usually have eggs and milk for breakfast.", exZh: "我早餐通常吃鸡蛋、喝牛奶。" },
        { w: "vegetable", ph: "/ˈvedʒtəbl/", pos: "n.", zh: "蔬菜", ex: "Eat more fruit and vegetables every day.", exZh: "每天多吃水果和蔬菜。" },
        { w: "delicious", ph: "/dɪˈlɪʃəs/", pos: "adj.", zh: "美味的", ex: "This soup is delicious!", exZh: "这汤真好喝！" },
        { w: "hungry", ph: "/ˈhʌŋɡri/", pos: "adj.", zh: "饿的", ex: "I'm hungry. Let's have lunch.", exZh: "我饿了，我们去吃午饭吧。" },
        { w: "thirsty", ph: "/ˈθɜːrsti/", pos: "adj.", zh: "渴的", ex: "After running, I was very thirsty.", exZh: "跑完步后我很渴。" },
        { w: "menu", ph: "/ˈmenjuː/", pos: "n.", zh: "菜单", ex: "Could I see the menu, please?", exZh: "请给我看一下菜单好吗？" },
        { w: "order", ph: "/ˈɔːrdər/", pos: "v.", zh: "点（菜）；订购", ex: "We ordered noodles and dumplings.", exZh: "我们点了面条和饺子。" },
        { w: "cook", ph: "/kʊk/", pos: "v.", zh: "做饭；烹饪", ex: "My father likes to cook on weekends.", exZh: "我爸爸周末喜欢做饭。" },
        { w: "recipe", ph: "/ˈresəpi/", pos: "n.", zh: "食谱；做法", ex: "Can you share the recipe for this cake?", exZh: "你能分享这个蛋糕的做法吗？" },
        { w: "bill", ph: "/bɪl/", pos: "n.", zh: "账单", ex: "Excuse me, can we have the bill?", exZh: "打扰一下，可以结账吗？" },
        { w: "spicy", ph: "/ˈspaɪsi/", pos: "adj.", zh: "辣的", ex: "Sichuan food is famous for being spicy.", exZh: "川菜以辣闻名。" },
        { w: "snack", ph: "/snæk/", pos: "n.", zh: "零食；小吃", ex: "Nuts are a healthy snack.", exZh: "坚果是健康的零食。" }
      ],
      reading: {
        title: "A Busy Saturday Kitchen",
        text: "Every Saturday, Lily and her father cook lunch together. They start the day with a simple breakfast of bread, eggs and milk. Then they go to the market to buy fresh vegetables and meat.\nLily's father has an old recipe book from her grandmother. Today they are making tomato and egg noodles, Lily's favorite dish. Lily washes the vegetables, and her father does the cutting. He never makes the food too spicy, because Lily's little brother does not like hot food.\nWhen lunch is ready, the whole family sits down together. Everyone is hungry, and the noodles are delicious. After lunch, Lily says, \"Next week, I want to cook by myself!\"",
        questions: [
          { q: "When do Lily and her father cook together?", options: ["Every Sunday.", "Every Saturday.", "Every evening.", "Only on holidays."], answer: 1, explain: "第一句：Every Saturday, Lily and her father cook lunch together." },
          { q: "Where does the recipe book come from?", options: ["A bookshop.", "Lily's grandmother.", "The internet.", "Lily's school."], answer: 1, explain: "第二段：an old recipe book from her grandmother." },
          { q: "Why doesn't her father make the food too spicy?", options: ["He doesn't like spicy food.", "Lily's little brother doesn't like hot food.", "Spicy food is bad for health.", "They have no pepper."], answer: 1, explain: "第二段：because Lily's little brother does not like hot food." },
          { q: "What does Lily want to do next week?", options: ["Go to a restaurant.", "Cook by herself.", "Buy a new recipe book.", "Eat noodles again."], answer: 1, explain: "最后一句：I want to cook by myself!" }
        ]
      },
      cloze: {
        text: "When I am [hungry] after school, I usually eat a small [snack]. On weekends, my mother likes to [cook] for the family. She has a special [recipe] for fish, and it is always [delicious]. Last Sunday we went to a restaurant and [ordered] dumplings.",
        distractors: ["bill", "thirsty"]
      },
      translation: [
        { zh: "我每天早上七点吃早餐。", en: "I have breakfast at seven every morning." },
        { zh: "这家餐厅的面条非常好吃。", en: "The noodles in this restaurant are very delicious." },
        { zh: "请给我们看一下菜单好吗？", en: "Could you show us the menu, please?" },
        { zh: "我妈妈每个周末都给我们做饭。", en: "My mother cooks for us every weekend." },
        { zh: "多吃蔬菜对身体有好处。", en: "Eating more vegetables is good for your health." }
      ]
    },

    {
      id: "b2", level: "beginner", daily: true, title: "Shopping", titleZh: "购物", emoji: "🛍️",
      words: [
        { w: "price", ph: "/praɪs/", pos: "n.", zh: "价格", ex: "The price of this jacket is 200 yuan.", exZh: "这件夹克的价格是 200 元。" },
        { w: "cheap", ph: "/tʃiːp/", pos: "adj.", zh: "便宜的", ex: "Fruit is cheap at the market.", exZh: "市场上的水果很便宜。" },
        { w: "expensive", ph: "/ɪkˈspensɪv/", pos: "adj.", zh: "昂贵的", ex: "This phone is too expensive for me.", exZh: "这部手机对我来说太贵了。" },
        { w: "discount", ph: "/ˈdɪskaʊnt/", pos: "n.", zh: "折扣", ex: "Students can get a 10% discount.", exZh: "学生可以打九折。" },
        { w: "size", ph: "/saɪz/", pos: "n.", zh: "尺码；大小", ex: "Do you have this shirt in a larger size?", exZh: "这件衬衫有大一号的吗？" },
        { w: "try", ph: "/traɪ/", pos: "v.", zh: "试（穿）；尝试", ex: "Can I try these shoes on?", exZh: "我可以试穿这双鞋吗？" },
        { w: "cash", ph: "/kæʃ/", pos: "n.", zh: "现金", ex: "Do you accept cash or only cards?", exZh: "你们收现金还是只能刷卡？" },
        { w: "receipt", ph: "/rɪˈsiːt/", pos: "n.", zh: "收据；小票", ex: "Please keep your receipt.", exZh: "请保留好收据。" },
        { w: "customer", ph: "/ˈkʌstəmər/", pos: "n.", zh: "顾客", ex: "The shop was full of customers.", exZh: "商店里挤满了顾客。" },
        { w: "return", ph: "/rɪˈtɜːrn/", pos: "v.", zh: "退货；归还", ex: "You can return it within seven days.", exZh: "七天之内可以退货。" },
        { w: "deliver", ph: "/dɪˈlɪvər/", pos: "v.", zh: "送货；递送", ex: "The package was delivered this morning.", exZh: "包裹今天早上送到了。" },
        { w: "choose", ph: "/tʃuːz/", pos: "v.", zh: "选择", ex: "It's hard to choose between these two colors.", exZh: "这两种颜色很难选。" }
      ],
      reading: {
        title: "Online or In Store?",
        text: "Tom and his sister Amy both need new shoes, but they like to shop in different ways.\nTom prefers shopping online. He says it is fast and often cheap. He can compare prices on his phone, and many shops offer a discount on the internet. The shoes are delivered to his home in two days. If they don't fit, he can return them for free.\nAmy likes going to a real shop. She wants to try the shoes on before she pays. \"Every brand has a different size,\" she says. She also enjoys talking with the shop assistants and choosing colors with her own eyes.\nIn the end, they both find good shoes. Tom saves money, and Amy saves the trouble of returns.",
        questions: [
          { q: "Why does Tom like shopping online?", options: ["It is fast and often cheap.", "He likes talking to shop assistants.", "He can try the shoes on.", "He doesn't have a phone."], answer: 0, explain: "第二段：He says it is fast and often cheap." },
          { q: "How long does delivery take for Tom?", options: ["One day.", "Two days.", "A week.", "A month."], answer: 1, explain: "第二段：delivered to his home in two days." },
          { q: "Why does Amy want to try the shoes on?", options: ["They are expensive.", "Every brand has a different size.", "She has no time.", "Her brother told her to."], answer: 1, explain: "第三段：Every brand has a different size." },
          { q: "What is the main idea of the passage?", options: ["Online shopping is always better.", "People shop in different ways, and both can work.", "Shoes are too expensive.", "Shops are closing down."], answer: 1, explain: "两人方式不同，但最后都买到了好鞋。" }
        ]
      },
      cloze: {
        text: "I wanted to buy a new coat, but the first one I saw was too [expensive]. Luckily, the shop next door had a 30% [discount]. I asked the assistant if I could [try] it on. The [size] was perfect, so I paid in [cash] and kept the [receipt].",
        distractors: ["deliver", "customer"]
      },
      translation: [
        { zh: "这件衣服太贵了，有便宜一点的吗？", en: "This dress is too expensive. Do you have a cheaper one?" },
        { zh: "我可以试穿一下这双鞋吗？", en: "Can I try on these shoes?" },
        { zh: "网上购物又快又方便。", en: "Shopping online is fast and convenient." },
        { zh: "如果不合适，你可以在七天内退货。", en: "If it doesn't fit, you can return it within seven days." },
        { zh: "请保留好您的收据。", en: "Please keep your receipt." }
      ]
    },

    {
      id: "b3", level: "beginner", daily: true, title: "Home & Family", titleZh: "家庭生活", emoji: "🏠",
      words: [
        { w: "neighbor", ph: "/ˈneɪbər/", pos: "n.", zh: "邻居", ex: "Our neighbor often helps us water the plants.", exZh: "邻居经常帮我们浇花。" },
        { w: "apartment", ph: "/əˈpɑːrtmənt/", pos: "n.", zh: "公寓", ex: "They live in a small apartment near the park.", exZh: "他们住在公园附近的一间小公寓里。" },
        { w: "furniture", ph: "/ˈfɜːrnɪtʃər/", pos: "n.", zh: "家具", ex: "We bought some new furniture for the living room.", exZh: "我们为客厅买了一些新家具。" },
        { w: "housework", ph: "/ˈhaʊswɜːrk/", pos: "n.", zh: "家务", ex: "Everyone in my family helps with the housework.", exZh: "我家每个人都帮忙做家务。" },
        { w: "clean", ph: "/kliːn/", pos: "v.", zh: "打扫；清洁", ex: "I clean my room every Saturday.", exZh: "我每周六打扫房间。" },
        { w: "relative", ph: "/ˈrelətɪv/", pos: "n.", zh: "亲戚", ex: "We visit our relatives during the Spring Festival.", exZh: "春节期间我们走亲戚。" },
        { w: "comfortable", ph: "/ˈkʌmftəbl/", pos: "adj.", zh: "舒服的", ex: "This sofa is very comfortable.", exZh: "这张沙发很舒服。" },
        { w: "quiet", ph: "/ˈkwaɪət/", pos: "adj.", zh: "安静的", ex: "Please be quiet. The baby is sleeping.", exZh: "请安静，宝宝在睡觉。" },
        { w: "borrow", ph: "/ˈbɑːroʊ/", pos: "v.", zh: "借（入）", ex: "Can I borrow your umbrella?", exZh: "我能借用你的伞吗？" },
        { w: "repair", ph: "/rɪˈper/", pos: "v.", zh: "修理", ex: "My uncle can repair almost anything.", exZh: "我叔叔几乎什么都能修。" },
        { w: "share", ph: "/ʃer/", pos: "v.", zh: "分享；共用", ex: "I share a bedroom with my brother.", exZh: "我和弟弟共用一间卧室。" },
        { w: "together", ph: "/təˈɡeðər/", pos: "adv.", zh: "一起", ex: "We have dinner together every evening.", exZh: "我们每天晚上一起吃晚饭。" }
      ],
      reading: {
        title: "Moving Day",
        text: "Last month, the Wang family moved into a new apartment. It is bigger than their old home, and it has a small balcony with a view of the river.\nMoving was hard work. The family packed boxes for a whole week. On moving day, two relatives came to help carry the heavy furniture. The bed was too big for the door, so Mr. Wang had to take it apart. He also had to repair one of its legs.\nThe new neighbors are friendly. On the first evening, the woman next door brought them a plate of fruit. She said the building is quiet at night, which made Mrs. Wang very happy.\nNow the family shares the housework. The children clean their own rooms, and the parents cook. Their new home already feels comfortable.",
        questions: [
          { q: "What is special about the new apartment?", options: ["It has a big garden.", "It has a balcony with a river view.", "It is next to a school.", "It is smaller than the old one."], answer: 1, explain: "第一段：a small balcony with a view of the river." },
          { q: "Who helped carry the furniture?", options: ["The neighbors.", "Two relatives.", "Some workers.", "Friends from school."], answer: 1, explain: "第二段：two relatives came to help carry the heavy furniture." },
          { q: "What did the woman next door bring?", options: ["A plate of fruit.", "A cake.", "Some flowers.", "A lamp."], answer: 0, explain: "第三段：brought them a plate of fruit." },
          { q: "How does the family share the housework?", options: ["The parents do everything.", "The children clean their rooms and the parents cook.", "They pay a cleaner.", "Nobody does any housework."], answer: 1, explain: "最后一段：The children clean their own rooms, and the parents cook." }
        ]
      },
      cloze: {
        text: "My family lives in a small [apartment] on the fifth floor. It is not big, but it is [comfortable]. At weekends we do the [housework] [together]. My brother and I [clean] the living room, and my father [repairs] anything that is broken.",
        distractors: ["borrow", "neighbor"]
      },
      translation: [
        { zh: "我们的邻居非常友好。", en: "Our neighbors are very friendly." },
        { zh: "周末我们全家一起打扫房子。", en: "Our whole family cleans the house together at weekends." },
        { zh: "我可以借用一下你的自行车吗？", en: "Can I borrow your bike?" },
        { zh: "这间公寓又安静又舒服。", en: "This apartment is quiet and comfortable." },
        { zh: "春节时我们会去看望亲戚。", en: "We visit our relatives during the Spring Festival." }
      ]
    },

    {
      id: "b4", level: "beginner", daily: true, title: "Getting Around", titleZh: "出行交通", emoji: "🚇",
      words: [
        { w: "subway", ph: "/ˈsʌbweɪ/", pos: "n.", zh: "地铁", ex: "I take the subway to work every day.", exZh: "我每天坐地铁上班。" },
        { w: "ticket", ph: "/ˈtɪkɪt/", pos: "n.", zh: "票", ex: "How much is a ticket to Shanghai?", exZh: "去上海的票多少钱？" },
        { w: "station", ph: "/ˈsteɪʃn/", pos: "n.", zh: "车站", ex: "The train station is ten minutes away.", exZh: "火车站离这里十分钟路程。" },
        { w: "direction", ph: "/dəˈrekʃn/", pos: "n.", zh: "方向", ex: "Excuse me, am I going in the right direction?", exZh: "打扰一下，我走的方向对吗？" },
        { w: "traffic", ph: "/ˈtræfɪk/", pos: "n.", zh: "交通；车流", ex: "There is heavy traffic in the morning.", exZh: "早上交通很拥堵。" },
        { w: "cross", ph: "/krɔːs/", pos: "v.", zh: "穿过；横过", ex: "Look both ways before you cross the road.", exZh: "过马路前要看两边。" },
        { w: "turn", ph: "/tɜːrn/", pos: "v.", zh: "转弯", ex: "Turn left at the second corner.", exZh: "在第二个路口左转。" },
        { w: "map", ph: "/mæp/", pos: "n.", zh: "地图", ex: "I checked the map on my phone.", exZh: "我在手机上查了地图。" },
        { w: "passenger", ph: "/ˈpæsɪndʒər/", pos: "n.", zh: "乘客", ex: "The bus was full of passengers.", exZh: "公交车上坐满了乘客。" },
        { w: "delay", ph: "/dɪˈleɪ/", pos: "v.", zh: "延误；耽搁", ex: "Our flight was delayed because of the storm.", exZh: "我们的航班因暴风雨延误了。" },
        { w: "park", ph: "/pɑːrk/", pos: "v.", zh: "停车", ex: "You can't park your car here.", exZh: "你不能在这里停车。" },
        { w: "distance", ph: "/ˈdɪstəns/", pos: "n.", zh: "距离", ex: "The distance from my home to school is two kilometers.", exZh: "从我家到学校的距离是两公里。" }
      ],
      reading: {
        title: "Lost in a New City",
        text: "Last summer, Chen Jie visited Beijing for the first time. On her second day, she wanted to go to a famous museum, but she did not know the way.\nShe took the subway from her hotel. The station was very crowded, and she got on a train going in the wrong direction. When she noticed, she got off and checked the map on her phone. The museum was only a short distance from a station on another line.\nOutside that station, an old man saw that she looked lost. \"Turn right, cross the road, and walk straight for five minutes,\" he said with a smile.\nChen Jie arrived just in time. She learned two things that day: always check the direction, and don't be afraid to ask for help.",
        questions: [
          { q: "Where did Chen Jie want to go?", options: ["A museum.", "A park.", "Her hotel.", "A school."], answer: 0, explain: "第一段：she wanted to go to a famous museum." },
          { q: "What mistake did she make?", options: ["She lost her ticket.", "She took a train in the wrong direction.", "She missed the last train.", "She forgot her phone."], answer: 1, explain: "第二段：got on a train going in the wrong direction." },
          { q: "Who helped her outside the station?", options: ["A police officer.", "An old man.", "A student.", "A taxi driver."], answer: 1, explain: "第三段：an old man saw that she looked lost." },
          { q: "What did Chen Jie learn?", options: ["Taxis are faster than the subway.", "Check the direction and don't be afraid to ask for help.", "Never travel alone.", "Museums are boring."], answer: 1, explain: "最后一句。" }
        ]
      },
      cloze: {
        text: "Every morning there is heavy [traffic] on the roads, so I take the [subway]. I buy my [ticket] on my phone. At the [station], there are many [passengers] going to work. Sometimes the train is [delayed], but I usually get to the office on time.",
        distractors: ["map", "distance"]
      },
      translation: [
        { zh: "请问地铁站怎么走？", en: "Excuse me, how can I get to the subway station?" },
        { zh: "在下一个路口右转。", en: "Turn right at the next corner." },
        { zh: "早上的交通非常拥堵。", en: "The traffic is very heavy in the morning." },
        { zh: "我们的火车晚点了一个小时。", en: "Our train was delayed for an hour." },
        { zh: "过马路时一定要小心。", en: "Be careful when you cross the road." }
      ]
    }
  ];

  const intermediate = [
    {
      id: "u9", level: "intermediate", daily: true, title: "Friends & Communication", titleZh: "人际交往", emoji: "💬",
      words: [
        { w: "friendship", ph: "/ˈfrendʃɪp/", pos: "n.", zh: "友谊", ex: "Their friendship began in primary school.", exZh: "他们的友谊始于小学。" },
        { w: "communicate", ph: "/kəˈmjuːnɪkeɪt/", pos: "v.", zh: "交流；沟通", ex: "We communicate mostly by text messages.", exZh: "我们主要通过短信交流。" },
        { w: "misunderstanding", ph: "/ˌmɪsʌndərˈstændɪŋ/", pos: "n.", zh: "误解；误会", ex: "The argument was caused by a simple misunderstanding.", exZh: "这次争吵是一个简单的误会引起的。" },
        { w: "apologize", ph: "/əˈpɑːlədʒaɪz/", pos: "v.", zh: "道歉", ex: "He apologized for being late.", exZh: "他为迟到道了歉。" },
        { w: "trust", ph: "/trʌst/", pos: "v.", zh: "信任", ex: "Good friends trust each other.", exZh: "好朋友彼此信任。" },
        { w: "respect", ph: "/rɪˈspekt/", pos: "v.", zh: "尊重", ex: "We should respect other people's opinions.", exZh: "我们应该尊重别人的观点。" },
        { w: "conflict", ph: "/ˈkɑːnflɪkt/", pos: "n.", zh: "冲突；矛盾", ex: "It's normal to have conflicts with roommates.", exZh: "和室友发生矛盾是正常的。" },
        { w: "support", ph: "/səˈpɔːrt/", pos: "v.", zh: "支持", ex: "My friends supported me when I was sad.", exZh: "我难过时朋友们支持了我。" },
        { w: "honest", ph: "/ˈɑːnɪst/", pos: "adj.", zh: "诚实的", ex: "Please be honest with me.", exZh: "请对我说实话。" },
        { w: "invite", ph: "/ɪnˈvaɪt/", pos: "v.", zh: "邀请", ex: "She invited me to her birthday party.", exZh: "她邀请我参加她的生日聚会。" },
        { w: "embarrassed", ph: "/ɪmˈbærəst/", pos: "adj.", zh: "尴尬的", ex: "I felt embarrassed when I forgot his name.", exZh: "我忘了他的名字，感到很尴尬。" },
        { w: "personality", ph: "/ˌpɜːrsəˈnæləti/", pos: "n.", zh: "性格；个性", ex: "She has a warm and friendly personality.", exZh: "她性格热情友好。" }
      ],
      reading: {
        title: "The Roommate Problem",
        text: "When Zhang Wei started university, he shared a dorm room with three strangers. At first, everything seemed fine. But after a few weeks, a conflict began. One roommate, Liu Yang, often played games late at night, and Zhang Wei could not sleep.\nInstead of talking about it, Zhang Wei stayed silent and grew angry. He began to avoid Liu Yang, who had no idea what was wrong. Their friendship was in danger because of a simple misunderstanding.\nFinally, another roommate suggested that they sit down and communicate honestly. Zhang Wei explained how tired he felt. Liu Yang was embarrassed; he had thought everyone was asleep and did not mind the noise. He apologized at once and started using headphones.\nPsychologists say that most conflicts between friends come from poor communication, not bad personalities. Being honest, showing respect and listening carefully can build trust. Today, the four roommates support each other and often invite one another home during the holidays.",
        questions: [
          { q: "What caused the conflict?", options: ["Liu Yang played games late at night.", "Zhang Wei was too noisy.", "They argued about money.", "They studied different subjects."], answer: 0, explain: "第一段：Liu Yang often played games late at night, and Zhang Wei could not sleep." },
          { q: "How did Zhang Wei react at first?", options: ["He talked to Liu Yang immediately.", "He stayed silent and grew angry.", "He moved out.", "He told a teacher."], answer: 1, explain: "第二段：Zhang Wei stayed silent and grew angry." },
          { q: "Why was Liu Yang embarrassed?", options: ["He had lost the game.", "He hadn't realized he was disturbing others.", "He was late for class.", "He broke his headphones."], answer: 1, explain: "第三段：he had thought everyone was asleep and did not mind the noise." },
          { q: "According to psychologists, most conflicts between friends come from ______.", options: ["bad personalities", "poor communication", "money problems", "different hobbies"], answer: 1, explain: "最后一段：most conflicts between friends come from poor communication." }
        ]
      },
      cloze: {
        text: "Every [friendship] has its difficult moments. When a [conflict] happens, it is important to [communicate] openly. If you have hurt someone, you should [apologize] sincerely. Being [honest] and showing [respect] help friends [trust] each other again.",
        distractors: ["invite", "embarrassed"]
      },
      translation: [
        { zh: "真正的朋友会在你困难时支持你。", en: "True friends will support you when you are in trouble." },
        { zh: "很多冲突都来自误解。", en: "Many conflicts come from misunderstandings." },
        { zh: "他为自己说错的话道了歉。", en: "He apologized for what he had said." },
        { zh: "我们应该尊重不同的观点。", en: "We should respect different opinions." },
        { zh: "良好的沟通能够建立信任。", en: "Good communication can build trust." }
      ]
    },

    {
      id: "u10", level: "intermediate", daily: true, title: "Free Time & Media", titleZh: "休闲娱乐", emoji: "🎬",
      words: [
        { w: "entertainment", ph: "/ˌentərˈteɪnmənt/", pos: "n.", zh: "娱乐", ex: "Television is still a popular form of entertainment.", exZh: "电视仍是一种流行的娱乐方式。" },
        { w: "hobby", ph: "/ˈhɑːbi/", pos: "n.", zh: "爱好", ex: "Photography is my favorite hobby.", exZh: "摄影是我最喜欢的爱好。" },
        { w: "relax", ph: "/rɪˈlæks/", pos: "v.", zh: "放松", ex: "I like to relax by listening to music.", exZh: "我喜欢听音乐放松。" },
        { w: "leisure", ph: "/ˈliːʒər/", pos: "n.", zh: "空闲；休闲", ex: "What do you do in your leisure time?", exZh: "你空闲时间做什么？" },
        { w: "audience", ph: "/ˈɔːdiəns/", pos: "n.", zh: "观众；听众", ex: "The audience clapped loudly at the end of the show.", exZh: "演出结束时观众热烈鼓掌。" },
        { w: "advertisement", ph: "/ˌædvərˈtaɪzmənt/", pos: "n.", zh: "广告", ex: "There are too many advertisements on this app.", exZh: "这个应用上的广告太多了。" },
        { w: "popular", ph: "/ˈpɑːpjələr/", pos: "adj.", zh: "受欢迎的；流行的", ex: "This song is very popular among teenagers.", exZh: "这首歌在青少年中很受欢迎。" },
        { w: "recommend", ph: "/ˌrekəˈmend/", pos: "v.", zh: "推荐", ex: "Can you recommend a good movie?", exZh: "你能推荐一部好电影吗？" },
        { w: "review", ph: "/rɪˈvjuː/", pos: "n.", zh: "评论；评价", ex: "The film got excellent reviews.", exZh: "这部电影获得了极好的评价。" },
        { w: "subscribe", ph: "/səbˈskraɪb/", pos: "v.", zh: "订阅", ex: "I subscribed to a music streaming service.", exZh: "我订阅了一个音乐流媒体服务。" },
        { w: "episode", ph: "/ˈepɪsoʊd/", pos: "n.", zh: "（电视剧的）一集", ex: "I watched three episodes last night.", exZh: "我昨晚看了三集。" },
        { w: "concert", ph: "/ˈkɑːnsərt/", pos: "n.", zh: "音乐会；演唱会", ex: "We bought tickets for the concert next month.", exZh: "我们买了下个月演唱会的票。" }
      ],
      reading: {
        title: "How We Spend Our Free Time",
        text: "How do young people spend their leisure time today? A recent survey of 2,000 university students gives some interesting answers.\nNot surprisingly, watching videos online is the most popular activity. On average, students spend nearly two hours a day on streaming platforms, and many subscribe to more than one service. Some admit they often watch several episodes of a series in one night, even before exams.\nHowever, the survey also shows a growing interest in offline hobbies. About 40 percent of students said they had been to a concert or a live show in the past year, and many enjoy sports, cooking or photography. \"Being part of a real audience feels different,\" one student explained. \"You share the moment with other people.\"\nExperts recommend a balance. Online entertainment is convenient and cheap, but activities that involve movement and face-to-face contact help people relax more deeply. As one researcher put it, the best hobby is the one that leaves you feeling better, not more tired.",
        questions: [
          { q: "What is the most popular leisure activity among the students?", options: ["Playing sports.", "Watching videos online.", "Going to concerts.", "Cooking."], answer: 1, explain: "第二段：watching videos online is the most popular activity." },
          { q: "What do some students admit?", options: ["They never watch videos.", "They watch several episodes in one night, even before exams.", "They dislike streaming.", "They only watch the news."], answer: 1, explain: "第二段最后一句。" },
          { q: "Why does one student prefer live shows?", options: ["They are cheaper.", "You share the moment with other people.", "They are shorter.", "They can be watched online."], answer: 1, explain: "第三段：You share the moment with other people." },
          { q: "What do experts recommend?", options: ["Stopping online entertainment.", "A balance between online and offline activities.", "Watching more videos.", "Only doing exercise."], answer: 1, explain: "最后一段：Experts recommend a balance." }
        ]
      },
      cloze: {
        text: "In my [leisure] time, I have several [hobbies]. I often watch a new [episode] of my favorite show to [relax]. Before choosing a film, I usually read online [reviews]. Last week a friend [recommended] a jazz [concert], and it was fantastic.",
        distractors: ["audience", "advertisement"]
      },
      translation: [
        { zh: "你空闲的时候喜欢做什么？", en: "What do you like to do in your free time?" },
        { zh: "这部电视剧在年轻人中很受欢迎。", en: "This TV series is very popular among young people." },
        { zh: "你能给我推荐一本好书吗？", en: "Can you recommend a good book to me?" },
        { zh: "听音乐是我放松的最好方式。", en: "Listening to music is the best way for me to relax." },
        { zh: "这个应用上的广告太多了。", en: "There are too many advertisements on this app." }
      ]
    }
  ];

  const advanced = [
    {
      id: "a1", level: "advanced", daily: true, title: "Modern Living", titleZh: "现代生活", emoji: "🛋️",
      words: [
        { w: "commute", ph: "/kəˈmjuːt/", pos: "n.", zh: "通勤", ex: "Her daily commute takes over an hour.", exZh: "她每天通勤要一个多小时。" },
        { w: "convenience", ph: "/kənˈviːniəns/", pos: "n.", zh: "便利", ex: "Many people are willing to pay extra for convenience.", exZh: "很多人愿意为便利多花钱。" },
        { w: "sedentary", ph: "/ˈsednteri/", pos: "adj.", zh: "久坐不动的", ex: "A sedentary lifestyle increases health risks.", exZh: "久坐的生活方式会增加健康风险。" },
        { w: "minimalism", ph: "/ˈmɪnɪməlɪzəm/", pos: "n.", zh: "极简主义", ex: "Minimalism encourages people to own fewer things.", exZh: "极简主义鼓励人们拥有更少的东西。" },
        { w: "clutter", ph: "/ˈklʌtər/", pos: "n.", zh: "杂乱的东西", ex: "Clearing the clutter made the room feel bigger.", exZh: "清理杂物后房间显得更大了。" },
        { w: "overwhelmed", ph: "/ˌoʊvərˈwelmd/", pos: "adj.", zh: "不堪重负的", ex: "She felt overwhelmed by all the messages.", exZh: "那么多消息让她喘不过气来。" },
        { w: "prioritize", ph: "/praɪˈɔːrətaɪz/", pos: "v.", zh: "优先考虑；按轻重排序", ex: "You need to prioritize your tasks.", exZh: "你需要分清任务的轻重缓急。" },
        { w: "routine", ph: "/ruːˈtiːn/", pos: "n.", zh: "日常惯例", ex: "A morning routine can improve your focus.", exZh: "固定的晨间安排可以让你更专注。" },
        { w: "productivity", ph: "/ˌproʊdʌkˈtɪvəti/", pos: "n.", zh: "生产力；效率", ex: "Too many meetings reduce productivity.", exZh: "会议太多会降低效率。" },
        { w: "isolation", ph: "/ˌaɪsəˈleɪʃn/", pos: "n.", zh: "孤立；隔绝", ex: "Working from home can lead to social isolation.", exZh: "在家办公可能导致社交孤立。" },
        { w: "compromise", ph: "/ˈkɑːmprəmaɪz/", pos: "n.", zh: "妥协；折中", ex: "Living with others requires compromise.", exZh: "与人同住需要互相妥协。" },
        { w: "indispensable", ph: "/ˌɪndɪˈspensəbl/", pos: "adj.", zh: "不可或缺的", ex: "Smartphones have become indispensable in daily life.", exZh: "智能手机已成为日常生活中不可或缺的东西。" }
      ],
      reading: {
        title: "The Paradox of Convenience",
        text: "Modern life offers a level of convenience that previous generations could hardly imagine. Groceries arrive at the door within half an hour, meetings take place on screens, and a single phone has become indispensable for banking, shopping and socializing. Yet surveys consistently find that many city dwellers feel more stressed and overwhelmed than ever.\nPart of the explanation lies in how convenience reshapes our days. When every task becomes easier, we tend to fill the saved time with more tasks rather than rest. The long commute may be replaced by remote work, but the boundary between office and home often disappears with it. Moreover, a largely sedentary routine, combined with fewer chance encounters with colleagues and neighbors, can quietly lead to isolation.\nIn response, a growing number of people are turning to minimalism. By removing physical and digital clutter, they hope to prioritize what genuinely matters: health, relationships and meaningful work. Critics argue that minimalism is itself a luxury, available mainly to those who already have enough. The more practical lesson may be one of compromise: using technology deliberately, protecting some hours from it, and measuring productivity not by how much we do, but by how well we live.",
        questions: [
          { q: "What paradox does the passage describe?", options: ["Convenience makes life cheaper but lonelier.", "Life has become more convenient, yet many people feel more stressed.", "Technology is becoming more expensive.", "People work less but earn more."], answer: 1, explain: "第一段：convenience... Yet many city dwellers feel more stressed and overwhelmed than ever." },
          { q: "According to the second paragraph, what do people often do with the time convenience saves?", options: ["Rest more.", "Fill it with more tasks.", "Exercise.", "Sleep longer."], answer: 1, explain: "第二段：we tend to fill the saved time with more tasks rather than rest." },
          { q: "What criticism of minimalism is mentioned?", options: ["It harms the economy.", "It is a luxury mainly for those who already have enough.", "It is too hard to understand.", "It creates more clutter."], answer: 1, explain: "第三段：minimalism is itself a luxury, available mainly to those who already have enough." },
          { q: "What does the author finally suggest?", options: ["Giving up technology completely.", "Using technology deliberately and judging life by its quality.", "Moving to the countryside.", "Working longer hours."], answer: 1, explain: "最后一句：measuring productivity not by how much we do, but by how well we live." }
        ]
      },
      cloze: {
        text: "Many office workers spend hours on their daily [commute] and then sit at a desk all day. This [sedentary] lifestyle, together with constant notifications, leaves them feeling [overwhelmed]. Experts suggest building a simple morning [routine] and learning to [prioritize] important tasks. Clearing digital [clutter] can also improve [productivity].",
        distractors: ["isolation", "compromise"]
      },
      translation: [
        { zh: "智能手机已成为现代生活中不可或缺的一部分。", en: "Smartphones have become an indispensable part of modern life." },
        { zh: "长时间通勤让很多上班族疲惫不堪。", en: "Long commutes leave many office workers exhausted." },
        { zh: "我们需要学会分清事情的轻重缓急。", en: "We need to learn how to prioritize." },
        { zh: "久坐的生活方式对健康有害。", en: "A sedentary lifestyle is harmful to health." },
        { zh: "便利的生活并不一定带来幸福。", en: "A convenient life does not necessarily bring happiness." }
      ]
    },

    {
      id: "a2", level: "advanced", title: "Mind & Wellbeing", titleZh: "心理与健康", emoji: "🧠",
      words: [
        { w: "resilience", ph: "/rɪˈzɪliəns/", pos: "n.", zh: "韧性；恢复力", ex: "Resilience helps people cope with setbacks.", exZh: "韧性帮助人们应对挫折。" },
        { w: "cope", ph: "/koʊp/", pos: "v.", zh: "应对；处理", ex: "She learned to cope with pressure at work.", exZh: "她学会了应对工作压力。" },
        { w: "setback", ph: "/ˈsetbæk/", pos: "n.", zh: "挫折", ex: "Failing the exam was only a temporary setback.", exZh: "考试失利只是暂时的挫折。" },
        { w: "mindfulness", ph: "/ˈmaɪndflnəs/", pos: "n.", zh: "正念", ex: "Mindfulness means paying attention to the present moment.", exZh: "正念是指专注于当下。" },
        { w: "burnout", ph: "/ˈbɜːrnaʊt/", pos: "n.", zh: "倦怠；精疲力竭", ex: "Working long hours without rest can lead to burnout.", exZh: "长时间工作不休息可能导致倦怠。" },
        { w: "perspective", ph: "/pərˈspektɪv/", pos: "n.", zh: "视角；观点", ex: "Travel gave me a new perspective on life.", exZh: "旅行给了我看待生活的新视角。" },
        { w: "cognitive", ph: "/ˈkɑːɡnətɪv/", pos: "adj.", zh: "认知的", ex: "Sleep affects our cognitive abilities.", exZh: "睡眠影响我们的认知能力。" },
        { w: "vulnerable", ph: "/ˈvʌlnərəbl/", pos: "adj.", zh: "脆弱的；易受伤害的", ex: "Teenagers are especially vulnerable to peer pressure.", exZh: "青少年尤其容易受到同伴压力的影响。" },
        { w: "therapy", ph: "/ˈθerəpi/", pos: "n.", zh: "治疗；疗法", ex: "Talking therapy can help people with anxiety.", exZh: "谈话疗法可以帮助焦虑的人。" },
        { w: "optimistic", ph: "/ˌɑːptɪˈmɪstɪk/", pos: "adj.", zh: "乐观的", ex: "She remains optimistic about the future.", exZh: "她对未来依然乐观。" },
        { w: "alleviate", ph: "/əˈliːvieɪt/", pos: "v.", zh: "减轻；缓解", ex: "Regular exercise can alleviate symptoms of depression.", exZh: "规律运动可以减轻抑郁症状。" },
        { w: "stigma", ph: "/ˈstɪɡmə/", pos: "n.", zh: "耻辱；污名", ex: "We must reduce the stigma around mental illness.", exZh: "我们必须减少对心理疾病的偏见。" }
      ],
      reading: {
        title: "Bouncing Back",
        text: "Why do some people recover quickly from failure while others struggle for years? Psychologists use the term resilience to describe the ability to adapt well in the face of adversity. Importantly, resilience is not a fixed personality trait; research suggests it can be developed, much like a muscle.\nOne key factor is perspective. People who interpret a setback as temporary and specific (\"I did badly on this exam\") tend to cope better than those who see it as permanent and personal (\"I am a failure\"). This insight forms the basis of cognitive behavioral therapy, which helps patients identify and challenge unhelpful patterns of thinking.\nDaily habits matter as well. Studies show that mindfulness practice, adequate sleep and regular exercise can alleviate stress and reduce the risk of burnout. Social connection may be the most powerful protection of all: people with supportive relationships are less vulnerable to depression after difficult life events.\nDespite this growing knowledge, many still hesitate to seek help because of the stigma attached to mental health problems. Experts argue that talking openly about emotions should be as normal as discussing a sprained ankle. Being resilient, they stress, does not mean never feeling sad; it means remaining cautiously optimistic that things can improve.",
        questions: [
          { q: "According to the passage, resilience ______.", options: ["is a fixed personality trait", "can be developed over time", "only matters in sports", "is extremely rare"], answer: 1, explain: "第一段：research suggests it can be developed, much like a muscle." },
          { q: "Which way of thinking helps people cope better?", options: ["Seeing setbacks as permanent and personal.", "Seeing setbacks as temporary and specific.", "Ignoring setbacks completely.", "Blaming other people."], answer: 1, explain: "第二段：interpret a setback as temporary and specific." },
          { q: "What may be the most powerful protection against depression?", options: ["Exercise.", "Social connection.", "Medicine.", "Wealth."], answer: 1, explain: "第三段：Social connection may be the most powerful protection of all." },
          { q: "According to experts, what does being resilient mean?", options: ["Never feeling sad.", "Remaining optimistic that things can improve.", "Hiding one's emotions.", "Working harder than others."], answer: 1, explain: "最后一句：remaining cautiously optimistic that things can improve." }
        ]
      },
      cloze: {
        text: "Everyone faces a [setback] at some point. What matters is how we [cope] with it. Psychologists believe that [resilience] can be learned. Practising [mindfulness] and getting enough sleep can [alleviate] stress and prevent [burnout]. Seeing problems from a new [perspective] also helps.",
        distractors: ["stigma", "vulnerable"]
      },
      translation: [
        { zh: "每个人都会遇到挫折，关键是如何应对。", en: "Everyone meets setbacks; the key is how to cope with them." },
        { zh: "规律运动可以缓解压力。", en: "Regular exercise can alleviate stress." },
        { zh: "我们应该消除对心理疾病的偏见。", en: "We should remove the stigma around mental illness." },
        { zh: "换个角度看问题，你会更乐观。", en: "If you look at the problem from a different perspective, you will be more optimistic." },
        { zh: "长期超负荷工作容易导致倦怠。", en: "Working too hard for a long time can easily lead to burnout." }
      ]
    },

    {
      id: "a3", level: "advanced", title: "Media & Information", titleZh: "媒体与信息", emoji: "📰",
      words: [
        { w: "credible", ph: "/ˈkredəbl/", pos: "adj.", zh: "可信的", ex: "Always check whether a source is credible.", exZh: "一定要核实信息来源是否可信。" },
        { w: "misinformation", ph: "/ˌmɪsɪnfərˈmeɪʃn/", pos: "n.", zh: "错误信息", ex: "Misinformation spreads quickly on social media.", exZh: "错误信息在社交媒体上传播很快。" },
        { w: "algorithm", ph: "/ˈælɡərɪðəm/", pos: "n.", zh: "算法", ex: "The algorithm decides which posts you see.", exZh: "算法决定你看到哪些帖子。" },
        { w: "bias", ph: "/ˈbaɪəs/", pos: "n.", zh: "偏见；偏向", ex: "Every news outlet has some degree of bias.", exZh: "每家新闻媒体都有一定程度的偏向。" },
        { w: "verify", ph: "/ˈverɪfaɪ/", pos: "v.", zh: "核实；证实", ex: "Journalists must verify facts before publishing.", exZh: "记者在发表前必须核实事实。" },
        { w: "sensational", ph: "/senˈseɪʃənl/", pos: "adj.", zh: "耸人听闻的", ex: "Sensational headlines attract more clicks.", exZh: "耸人听闻的标题会吸引更多点击。" },
        { w: "influence", ph: "/ˈɪnfluəns/", pos: "n.", zh: "影响", ex: "Social media has a huge influence on young people.", exZh: "社交媒体对年轻人影响巨大。" },
        { w: "transparency", ph: "/trænsˈpærənsi/", pos: "n.", zh: "透明度", ex: "The public demands greater transparency from companies.", exZh: "公众要求企业提高透明度。" },
        { w: "censorship", ph: "/ˈsensərʃɪp/", pos: "n.", zh: "审查制度", ex: "The film faced censorship in several countries.", exZh: "这部电影在几个国家受到审查。" },
        { w: "viral", ph: "/ˈvaɪrəl/", pos: "adj.", zh: "迅速传播的；走红的", ex: "The video went viral overnight.", exZh: "这段视频一夜之间走红网络。" },
        { w: "skeptical", ph: "/ˈskeptɪkl/", pos: "adj.", zh: "怀疑的", ex: "Be skeptical of stories that seem too good to be true.", exZh: "对好得难以置信的故事要持怀疑态度。" },
        { w: "literacy", ph: "/ˈlɪtərəsi/", pos: "n.", zh: "素养；读写能力", ex: "Media literacy should be taught in schools.", exZh: "学校应该教授媒体素养。" }
      ],
      reading: {
        title: "Reading the News in the Age of Algorithms",
        text: "A generation ago, most people received their news from a handful of newspapers and television channels. Today, the majority of young adults encounter news through social media feeds, where an algorithm selects stories based on what they are most likely to click. This shift has made information more accessible than ever, but it has also created new risks.\nBecause platforms reward engagement, sensational headlines and emotional content tend to go viral, while careful reporting may go unnoticed. Misinformation can spread faster than corrections: one well-known study found that false stories on a major platform reached people about six times faster than true ones. Furthermore, feeds that show users only what they already agree with can strengthen existing bias.\nNone of this means that traditional media were perfect; they, too, have been criticized for bias and a lack of transparency. The solution, many educators argue, is not censorship but media literacy. Readers should ask who produced a piece of information, what evidence supports it, and whether other credible sources report the same facts. Taking a moment to verify a claim before sharing it is a small habit with a large influence. In an age of endless information, a healthy skeptical attitude may be the most valuable skill of all.",
        questions: [
          { q: "How do most young adults encounter news today?", options: ["Through newspapers.", "Through social media feeds.", "Through the radio.", "Through television."], answer: 1, explain: "第一段：the majority of young adults encounter news through social media feeds." },
          { q: "According to the study mentioned, false stories ______.", options: ["reached people about six times faster than true ones", "were rarely shared", "were quickly deleted", "were less emotional"], answer: 0, explain: "第二段：reached people about six times faster than true ones." },
          { q: "What solution do many educators favor?", options: ["Stricter censorship.", "Media literacy.", "Banning social media.", "Reading only newspapers."], answer: 1, explain: "第三段：not censorship but media literacy." },
          { q: "What attitude does the author recommend?", options: ["Trusting all news.", "A healthy skeptical attitude.", "Avoiding the news entirely.", "Sharing news quickly."], answer: 1, explain: "最后一句：a healthy skeptical attitude may be the most valuable skill of all." }
        ]
      },
      cloze: {
        text: "On social media, an [algorithm] decides what we see. Stories that are [sensational] are more likely to go [viral], even if they contain [misinformation]. Before sharing, we should [verify] the facts and check whether the source is [credible]. This is why media [literacy] matters.",
        distractors: ["censorship", "transparency"]
      },
      translation: [
        { zh: "在转发之前，我们应该核实信息是否真实。", en: "Before sharing, we should verify whether the information is true." },
        { zh: "错误信息在网上传播得非常快。", en: "Misinformation spreads very fast online." },
        { zh: "这段视频一夜之间在网上走红。", en: "The video went viral online overnight." },
        { zh: "对耸人听闻的标题要保持怀疑。", en: "Be skeptical of sensational headlines." },
        { zh: "学校应该培养学生的媒体素养。", en: "Schools should develop students' media literacy." }
      ]
    },

    {
      id: "a4", level: "advanced", title: "Global Challenges", titleZh: "全球议题", emoji: "🌍",
      words: [
        { w: "globalization", ph: "/ˌɡloʊbələˈzeɪʃn/", pos: "n.", zh: "全球化", ex: "Globalization has connected economies around the world.", exZh: "全球化把世界各地的经济联系在一起。" },
        { w: "poverty", ph: "/ˈpɑːvərti/", pos: "n.", zh: "贫困", ex: "Millions of people have been lifted out of poverty.", exZh: "数百万人已经摆脱了贫困。" },
        { w: "migration", ph: "/maɪˈɡreɪʃn/", pos: "n.", zh: "迁移；移民", ex: "Migration from rural areas to cities continues to grow.", exZh: "从农村到城市的人口迁移持续增长。" },
        { w: "scarcity", ph: "/ˈskersəti/", pos: "n.", zh: "短缺；匮乏", ex: "Water scarcity is a serious problem in many regions.", exZh: "水资源短缺是许多地区的严重问题。" },
        { w: "cooperation", ph: "/koʊˌɑːpəˈreɪʃn/", pos: "n.", zh: "合作", ex: "The crisis requires international cooperation.", exZh: "这场危机需要国际合作。" },
        { w: "initiative", ph: "/ɪˈnɪʃətɪv/", pos: "n.", zh: "倡议；举措", ex: "The government launched a new initiative to reduce waste.", exZh: "政府推出了一项减少浪费的新举措。" },
        { w: "mitigate", ph: "/ˈmɪtɪɡeɪt/", pos: "v.", zh: "缓解；减轻", ex: "Planting trees can help mitigate climate change.", exZh: "植树有助于缓解气候变化。" },
        { w: "equitable", ph: "/ˈekwɪtəbl/", pos: "adj.", zh: "公平的；公正的", ex: "We need a more equitable distribution of resources.", exZh: "我们需要更公平的资源分配。" },
        { w: "unprecedented", ph: "/ʌnˈpresɪdentɪd/", pos: "adj.", zh: "前所未有的", ex: "The pandemic caused unprecedented disruption.", exZh: "疫情造成了前所未有的混乱。" },
        { w: "infrastructure", ph: "/ˈɪnfrəstrʌktʃər/", pos: "n.", zh: "基础设施", ex: "The country invested heavily in infrastructure.", exZh: "该国在基础设施上投入巨大。" },
        { w: "humanitarian", ph: "/hjuːˌmænɪˈteriən/", pos: "adj.", zh: "人道主义的", ex: "Aid agencies provided humanitarian assistance.", exZh: "援助机构提供了人道主义援助。" },
        { w: "interdependent", ph: "/ˌɪntərdɪˈpendənt/", pos: "adj.", zh: "相互依存的", ex: "Today's economies are highly interdependent.", exZh: "当今各国经济高度相互依存。" }
      ],
      reading: {
        title: "A Shared Future",
        text: "In an interdependent world, problems rarely stay within national borders. A drought in one region can raise food prices on another continent; a new virus can travel across the globe in days. Globalization has brought enormous benefits, helping lift hundreds of millions of people out of extreme poverty, yet it has also made societies more exposed to shocks that no single country can manage alone.\nClimate change is perhaps the clearest example. Rising temperatures are expected to worsen water scarcity and may force large-scale migration from the most affected areas. The poorest communities, which have contributed least to the problem, often lack the infrastructure to adapt. For this reason, many argue that any response must be equitable as well as effective.\nThere are encouraging signs. International cooperation has produced agreements to mitigate emissions, and humanitarian organizations respond to disasters more quickly than in the past. Local initiatives, from community solar projects to water-saving farming methods, show that practical solutions often begin on a small scale.\nNevertheless, the scale of the challenge is unprecedented. Meeting it will require not only new technology and funding, but also a shift in thinking: seeing global problems not as distant issues belonging to others, but as shared responsibilities.",
        questions: [
          { q: "What is the main point of the first paragraph?", options: ["Globalization only brings problems.", "In an interdependent world, problems cross borders.", "Food prices are always rising.", "Viruses are becoming weaker."], answer: 1, explain: "第一句：problems rarely stay within national borders." },
          { q: "Why should responses to climate change be equitable?", options: ["Rich countries suffer the most.", "The poorest communities contributed least but often lack the means to adapt.", "It is cheaper that way.", "Scientists demand it."], answer: 1, explain: "第二段：have contributed least to the problem, often lack the infrastructure to adapt." },
          { q: "What do local initiatives show?", options: ["They are mostly useless.", "Practical solutions often begin on a small scale.", "Only governments can act.", "Technology is unnecessary."], answer: 1, explain: "第三段最后一句。" },
          { q: "What shift in thinking does the author call for?", options: ["Focusing only on national interests.", "Seeing global problems as shared responsibilities.", "Stopping globalization.", "Relying only on technology."], answer: 1, explain: "最后一句：seeing global problems... as shared responsibilities." }
        ]
      },
      cloze: {
        text: "[Globalization] has made the world more [interdependent] than ever. Challenges such as water [scarcity] and climate-driven [migration] cannot be solved by one country alone. Only through international [cooperation] can we [mitigate] these risks and build a more [equitable] future.",
        distractors: ["poverty", "infrastructure"]
      },
      translation: [
        { zh: "全球化使各国经济相互依存。", en: "Globalization has made national economies interdependent." },
        { zh: "应对气候变化需要国际合作。", en: "Tackling climate change requires international cooperation." },
        { zh: "数百万人已经摆脱了贫困。", en: "Millions of people have been lifted out of poverty." },
        { zh: "许多地区面临严重的水资源短缺。", en: "Many regions face serious water scarcity." },
        { zh: "我们正面临前所未有的挑战。", en: "We are facing unprecedented challenges." }
      ]
    }
  ];

  BOOK.units = [...beginner, ...BOOK.units, ...intermediate, ...advanced];
})(window.BOOK);
