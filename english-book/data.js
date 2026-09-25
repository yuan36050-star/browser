/*
 * Built-in content for Word Garden (CET-4 level).
 *
 * Unit shape:
 *   words[]      { w, ph, pos, zh, ex, exZh }
 *   reading      { title, text (paragraphs split by \n), questions[{ q, options[4], answer, explain }] }
 *   cloze        { text: passage with [answer] blanks, distractors[] }   -- banked cloze (选词填空)
 *   translation  [{ zh, en }]                                             -- used in both directions
 */
window.BOOK = {
  units: [
    {
      id: "u1", level: "intermediate", title: "Campus Life", titleZh: "校园生活", emoji: "🎓",
      words: [
        { w: "academic", ph: "/ˌækəˈdemɪk/", pos: "adj.", zh: "学术的；学业的", ex: "She has an excellent academic record.", exZh: "她的学业成绩非常优秀。" },
        { w: "semester", ph: "/sɪˈmestər/", pos: "n.", zh: "学期", ex: "The new semester begins in September.", exZh: "新学期九月开始。" },
        { w: "tuition", ph: "/tuˈɪʃn/", pos: "n.", zh: "学费；讲授", ex: "Tuition fees have risen sharply in recent years.", exZh: "近几年学费大幅上涨。" },
        { w: "scholarship", ph: "/ˈskɑːlərʃɪp/", pos: "n.", zh: "奖学金", ex: "He won a scholarship to study abroad.", exZh: "他获得了出国留学的奖学金。" },
        { w: "lecture", ph: "/ˈlektʃər/", pos: "n.", zh: "讲座；讲课", ex: "The professor gave a lecture on modern history.", exZh: "教授做了一场关于现代史的讲座。" },
        { w: "assignment", ph: "/əˈsaɪnmənt/", pos: "n.", zh: "作业；任务", ex: "I have to finish my assignment before Friday.", exZh: "我必须在周五前完成作业。" },
        { w: "deadline", ph: "/ˈdedlaɪn/", pos: "n.", zh: "截止日期", ex: "The deadline for applications is next Monday.", exZh: "申请截止日期是下周一。" },
        { w: "graduate", ph: "/ˈɡrædʒueɪt/", pos: "v.", zh: "毕业", ex: "She will graduate from Peking University next year.", exZh: "她明年将从北京大学毕业。" },
        { w: "curriculum", ph: "/kəˈrɪkjələm/", pos: "n.", zh: "课程（总称）", ex: "Computer science is now part of the school curriculum.", exZh: "计算机科学现在是学校课程的一部分。" },
        { w: "participate", ph: "/pɑːrˈtɪsɪpeɪt/", pos: "v.", zh: "参加；参与", ex: "All students are encouraged to participate in club activities.", exZh: "鼓励所有学生参加社团活动。" },
        { w: "campus", ph: "/ˈkæmpəs/", pos: "n.", zh: "校园", ex: "There is a large library on campus.", exZh: "校园里有一座大图书馆。" },
        { w: "motivate", ph: "/ˈmoʊtɪveɪt/", pos: "v.", zh: "激励；激发", ex: "Good teachers know how to motivate their students.", exZh: "好老师懂得如何激励学生。" }
      ],
      reading: {
        title: "Making the Most of University",
        text: "For many students, the first semester at university is both exciting and confusing. Unlike high school, where teachers check every piece of homework, university life requires students to manage their own time. Lectures may be attended by hundreds of people, and professors rarely notice who is absent. Assignments often come with deadlines that are weeks away, so it is easy to delay work until the last minute.\nExperts suggest that successful students do three things. First, they make a weekly plan and stick to it. Second, they participate actively in class discussions and study groups, which helps them understand difficult ideas. Third, they look after their health, because lack of sleep can quickly harm academic performance.\nMoney is another concern. Tuition and living costs can be high, but many universities offer scholarships to students with good grades or financial difficulties. Students who find it hard to stay motivated can also visit campus advisers, who are trained to help them set realistic goals. In the end, university is not only about getting a degree; it is about learning how to learn.",
        questions: [
          { q: "What is the main difference between high school and university mentioned in the passage?", options: ["University teachers are stricter.", "University students must manage their own time.", "High school has more lectures.", "University assignments are easier."], answer: 1, explain: "第一段：university life requires students to manage their own time." },
          { q: "Which of the following is NOT one of the three things successful students do?", options: ["Make a weekly plan.", "Participate in discussions.", "Look after their health.", "Choose the easiest courses."], answer: 3, explain: "第二段列出的三点是：制定周计划、积极参与讨论、照顾健康，没有提到选简单的课。" },
          { q: "According to the passage, scholarships are offered to students who ______.", options: ["have good grades or financial difficulties", "live on campus", "attend every lecture", "join study groups"], answer: 0, explain: "第三段：scholarships to students with good grades or financial difficulties." },
          { q: "What does the author mean by \"learning how to learn\"?", options: ["Memorizing textbooks.", "Developing the skills to study independently.", "Getting a degree quickly.", "Attending more lectures."], answer: 1, explain: "全文强调自主管理和学习方法，“学会学习”指培养独立学习的能力。" }
        ]
      },
      cloze: {
        text: "Many students feel stressed near the end of the [semester]. They have to hand in several [assignments] and prepare for exams at the same time. Missing a [deadline] can lower their grades. To stay [motivated], some students form study groups and [participate] in regular discussions. Others visit the library on [campus] every evening.",
        distractors: ["tuition", "curriculum"]
      },
      translation: [
        { zh: "他每天都去图书馆准备期末考试。", en: "He goes to the library every day to prepare for the final exams." },
        { zh: "学生们应该学会合理安排自己的时间。", en: "Students should learn to manage their time properly." },
        { zh: "她因为学习成绩优秀获得了奖学金。", en: "She won a scholarship because of her excellent academic performance." },
        { zh: "这门课程的作业必须在周五之前提交。", en: "The assignments for this course must be handed in before Friday." },
        { zh: "大学不仅是获得学位的地方，也是学会学习的地方。", en: "University is not only a place to get a degree but also a place to learn how to learn." }
      ]
    },

    {
      id: "u2", level: "intermediate", title: "Health & Lifestyle", titleZh: "健康生活", emoji: "🥗",
      words: [
        { w: "nutrition", ph: "/nuˈtrɪʃn/", pos: "n.", zh: "营养", ex: "Good nutrition is essential for children's growth.", exZh: "良好的营养对儿童成长至关重要。" },
        { w: "balanced", ph: "/ˈbælənst/", pos: "adj.", zh: "均衡的；平衡的", ex: "A balanced diet includes fruit, vegetables and grains.", exZh: "均衡的饮食包括水果、蔬菜和谷物。" },
        { w: "fitness", ph: "/ˈfɪtnəs/", pos: "n.", zh: "健康；健身", ex: "He goes to the gym to improve his fitness.", exZh: "他去健身房提高身体素质。" },
        { w: "stress", ph: "/stres/", pos: "n.", zh: "压力", ex: "Exams can cause a lot of stress.", exZh: "考试会带来很大压力。" },
        { w: "anxiety", ph: "/æŋˈzaɪəti/", pos: "n.", zh: "焦虑", ex: "Deep breathing can reduce anxiety.", exZh: "深呼吸可以缓解焦虑。" },
        { w: "consume", ph: "/kənˈsuːm/", pos: "v.", zh: "吃；喝；消耗", ex: "Many people consume too much sugar.", exZh: "许多人摄入过多的糖。" },
        { w: "symptom", ph: "/ˈsɪmptəm/", pos: "n.", zh: "症状", ex: "A high fever is a common symptom of flu.", exZh: "高烧是流感的常见症状。" },
        { w: "recover", ph: "/rɪˈkʌvər/", pos: "v.", zh: "恢复；康复", ex: "It took him two weeks to recover from the illness.", exZh: "他花了两周才从病中康复。" },
        { w: "prevent", ph: "/prɪˈvent/", pos: "v.", zh: "预防；阻止", ex: "Washing your hands helps prevent disease.", exZh: "洗手有助于预防疾病。" },
        { w: "obesity", ph: "/oʊˈbiːsəti/", pos: "n.", zh: "肥胖", ex: "Obesity is a growing problem among teenagers.", exZh: "肥胖在青少年中是一个日益严重的问题。" },
        { w: "moderate", ph: "/ˈmɑːdərət/", pos: "adj.", zh: "适度的；中等的", ex: "Moderate exercise is good for the heart.", exZh: "适度运动对心脏有益。" },
        { w: "immune", ph: "/ɪˈmjuːn/", pos: "adj.", zh: "免疫的", ex: "Sleep helps keep your immune system strong.", exZh: "睡眠有助于保持免疫系统强健。" }
      ],
      reading: {
        title: "The Power of Small Habits",
        text: "Many people believe that staying healthy requires dramatic changes, such as expensive gym memberships or strict diets. However, recent research suggests that small, consistent habits are often more effective.\nTake exercise as an example. A study of office workers found that those who walked for just twenty minutes a day had lower levels of stress and anxiety than those who exercised hard only once a week. Moderate activity, done regularly, seems to benefit both the body and the mind.\nDiet works in a similar way. Instead of giving up all their favorite foods, people who make one small change, such as drinking water instead of sugary drinks, are more likely to keep the habit for years. Over time, this can help prevent obesity and other health problems.\nSleep is perhaps the most underrated habit of all. Adults who sleep seven to eight hours a night have stronger immune systems and recover from illness more quickly. The message is simple: good health is not built in a day, but step by step.",
        questions: [
          { q: "What is the main idea of the passage?", options: ["Gym memberships are too expensive.", "Small, consistent habits are key to good health.", "Office workers are unhealthy.", "Strict diets are the best way to lose weight."], answer: 1, explain: "第一段点题：small, consistent habits are often more effective." },
          { q: "According to the study, office workers who walked twenty minutes a day ______.", options: ["lost more weight", "had less stress and anxiety", "slept longer", "ate less sugar"], answer: 1, explain: "第二段：had lower levels of stress and anxiety." },
          { q: "Why are small changes in diet effective?", options: ["They are cheaper.", "People are more likely to keep them for a long time.", "They need a doctor's help.", "They work within a week."], answer: 1, explain: "第三段：are more likely to keep the habit for years." },
          { q: "The word \"underrated\" in the last paragraph most probably means ______.", options: ["not valued enough", "too popular", "dangerous", "expensive"], answer: 0, explain: "under（不足）+ rated（评价），即“被低估的”。" }
        ]
      },
      cloze: {
        text: "Doctors say that a [balanced] diet and [moderate] exercise are the best ways to stay healthy. People who [consume] too much fast food are more likely to suffer from [obesity]. Regular exercise can also reduce [stress] and make your [immune] system stronger.",
        distractors: ["symptom", "recover"]
      },
      translation: [
        { zh: "每天适度锻炼有助于减轻压力。", en: "Moderate exercise every day helps reduce stress." },
        { zh: "均衡的饮食对我们的健康非常重要。", en: "A balanced diet is very important for our health." },
        { zh: "他花了一个月才从手术中康复。", en: "It took him a month to recover from the operation." },
        { zh: "充足的睡眠可以增强免疫系统。", en: "Enough sleep can strengthen the immune system." },
        { zh: "预防疾病比治疗疾病更容易。", en: "Preventing disease is easier than curing it." }
      ]
    },

    {
      id: "u3", level: "intermediate", title: "Technology", titleZh: "科技生活", emoji: "💡",
      words: [
        { w: "device", ph: "/dɪˈvaɪs/", pos: "n.", zh: "设备；装置", ex: "Smartphones are the most popular device among students.", exZh: "智能手机是学生中最流行的设备。" },
        { w: "digital", ph: "/ˈdɪdʒɪtl/", pos: "adj.", zh: "数字的；数码的", ex: "We live in a digital age.", exZh: "我们生活在数字时代。" },
        { w: "artificial", ph: "/ˌɑːrtɪˈfɪʃl/", pos: "adj.", zh: "人工的；人造的", ex: "Artificial intelligence is changing many industries.", exZh: "人工智能正在改变许多行业。" },
        { w: "innovation", ph: "/ˌɪnəˈveɪʃn/", pos: "n.", zh: "创新；新发明", ex: "Innovation is the key to economic growth.", exZh: "创新是经济增长的关键。" },
        { w: "access", ph: "/ˈækses/", pos: "n.", zh: "使用权；访问", ex: "Students have free access to the online library.", exZh: "学生可以免费使用在线图书馆。" },
        { w: "privacy", ph: "/ˈpraɪvəsi/", pos: "n.", zh: "隐私", ex: "Many users worry about their privacy online.", exZh: "许多用户担心他们的网络隐私。" },
        { w: "convenient", ph: "/kənˈviːniənt/", pos: "adj.", zh: "方便的", ex: "Online shopping is fast and convenient.", exZh: "网上购物快捷方便。" },
        { w: "replace", ph: "/rɪˈpleɪs/", pos: "v.", zh: "取代；替换", ex: "Will robots replace human workers?", exZh: "机器人会取代人类工人吗？" },
        { w: "addicted", ph: "/əˈdɪktɪd/", pos: "adj.", zh: "上瘾的；沉迷的", ex: "Some teenagers are addicted to video games.", exZh: "一些青少年沉迷于电子游戏。" },
        { w: "efficient", ph: "/ɪˈfɪʃnt/", pos: "adj.", zh: "高效的", ex: "The new system is more efficient than the old one.", exZh: "新系统比旧系统更高效。" },
        { w: "data", ph: "/ˈdeɪtə/", pos: "n.", zh: "数据", ex: "The company collects data about its customers.", exZh: "这家公司收集客户数据。" },
        { w: "transform", ph: "/trænsˈfɔːrm/", pos: "v.", zh: "彻底改变；转变", ex: "The internet has transformed the way we communicate.", exZh: "互联网彻底改变了我们的交流方式。" }
      ],
      reading: {
        title: "Living with Smart Machines",
        text: "Twenty years ago, few people could imagine carrying a powerful computer in their pocket. Today, smartphones and other digital devices have transformed almost every part of daily life. We use them to pay bills, order food, and talk to friends on the other side of the world.\nArtificial intelligence (AI) is the latest step in this innovation. AI programs can translate languages, recommend films, and even help doctors find diseases in medical images. For businesses, AI makes work faster and more efficient.\nHowever, these changes also bring problems. To work well, AI systems need large amounts of personal data, which raises serious questions about privacy. Some people fear that machines will replace human workers, especially in jobs that involve repetitive tasks. Others worry that people, particularly young people, are becoming addicted to their screens.\nMost experts agree that technology itself is neither good nor bad. What matters is how we use it. Governments, companies and individuals all have a role to play in making sure that technology serves people, rather than the other way around.",
        questions: [
          { q: "According to the first paragraph, digital devices have ______.", options: ["made life more difficult", "changed almost every part of daily life", "become too expensive", "replaced computers"], answer: 1, explain: "第一段：have transformed almost every part of daily life." },
          { q: "Which of the following is NOT mentioned as something AI can do?", options: ["Translate languages.", "Recommend films.", "Help doctors find diseases.", "Cook meals."], answer: 3, explain: "第二段只提到翻译、推荐电影、帮助医生，没有提到做饭。" },
          { q: "Why does AI raise concerns about privacy?", options: ["It needs large amounts of personal data.", "It is controlled by governments.", "It often makes mistakes.", "It works too slowly."], answer: 0, explain: "第三段：AI systems need large amounts of personal data, which raises serious questions about privacy." },
          { q: "What is the author's attitude toward technology?", options: ["Strongly negative.", "Completely positive.", "Balanced: it depends on how we use it.", "Uninterested."], answer: 2, explain: "最后一段：technology itself is neither good nor bad. What matters is how we use it." }
        ]
      },
      cloze: {
        text: "[Artificial] intelligence has [transformed] the way we work. Many tasks that took hours can now be done in minutes, making companies more [efficient]. But AI systems depend on huge amounts of [data], so protecting users' [privacy] has become a major challenge. Some people also fear that machines will [replace] them at work.",
        distractors: ["convenient", "addicted"]
      },
      translation: [
        { zh: "智能手机让我们的生活更加方便。", en: "Smartphones make our lives more convenient." },
        { zh: "人工智能不会完全取代人类。", en: "Artificial intelligence will not completely replace humans." },
        { zh: "我们应该保护自己在网上的隐私。", en: "We should protect our privacy online." },
        { zh: "很多年轻人沉迷于手机。", en: "Many young people are addicted to their phones." },
        { zh: "互联网彻底改变了人们获取信息的方式。", en: "The internet has transformed the way people get information." }
      ]
    },

    {
      id: "u4", level: "intermediate", title: "Environment", titleZh: "环境保护", emoji: "🌿",
      words: [
        { w: "pollution", ph: "/pəˈluːʃn/", pos: "n.", zh: "污染", ex: "Air pollution is a serious problem in many cities.", exZh: "空气污染是许多城市的严重问题。" },
        { w: "climate", ph: "/ˈklaɪmət/", pos: "n.", zh: "气候", ex: "Climate change affects every country in the world.", exZh: "气候变化影响着世界上的每一个国家。" },
        { w: "resource", ph: "/ˈriːsɔːrs/", pos: "n.", zh: "资源", ex: "Water is a precious natural resource.", exZh: "水是一种宝贵的自然资源。" },
        { w: "renewable", ph: "/rɪˈnuːəbl/", pos: "adj.", zh: "可再生的", ex: "Solar power is a renewable source of energy.", exZh: "太阳能是一种可再生能源。" },
        { w: "emission", ph: "/iˈmɪʃn/", pos: "n.", zh: "排放；排放物", ex: "We must cut carbon emissions to protect the planet.", exZh: "我们必须减少碳排放来保护地球。" },
        { w: "protect", ph: "/prəˈtekt/", pos: "v.", zh: "保护", ex: "Everyone has a duty to protect the environment.", exZh: "每个人都有保护环境的责任。" },
        { w: "species", ph: "/ˈspiːʃiːz/", pos: "n.", zh: "物种", ex: "Many species are in danger of dying out.", exZh: "许多物种面临灭绝的危险。" },
        { w: "recycle", ph: "/ˌriːˈsaɪkl/", pos: "v.", zh: "回收利用", ex: "We recycle paper, glass and plastic at home.", exZh: "我们在家回收纸张、玻璃和塑料。" },
        { w: "sustainable", ph: "/səˈsteɪnəbl/", pos: "adj.", zh: "可持续的", ex: "The city is working towards sustainable development.", exZh: "这座城市正致力于可持续发展。" },
        { w: "reduce", ph: "/rɪˈduːs/", pos: "v.", zh: "减少；降低", ex: "Taking the bus can reduce traffic jams.", exZh: "乘坐公交车可以减少交通拥堵。" },
        { w: "consequence", ph: "/ˈkɑːnsəkwens/", pos: "n.", zh: "后果；结果", ex: "Cutting down forests has serious consequences.", exZh: "砍伐森林会带来严重后果。" },
        { w: "awareness", ph: "/əˈwernəs/", pos: "n.", zh: "意识；认识", ex: "The campaign raised public awareness of the problem.", exZh: "这次活动提高了公众对这个问题的意识。" }
      ],
      reading: {
        title: "A Greener Way to Live",
        text: "Climate change is no longer a distant threat. Rising temperatures, stronger storms and longer droughts are already affecting millions of people. Scientists agree that the main cause is the emission of greenhouse gases from burning coal, oil and gas.\nMany countries are now turning to renewable energy. Solar and wind power, once considered too expensive, have become much cheaper over the past decade. In some regions, they already provide more electricity than traditional power stations.\nBut governments cannot solve the problem alone. Individuals also have an important role to play. Simple actions, such as taking public transport, recycling household waste and saving water, can reduce our impact on the planet. When millions of people make these choices, the result is significant.\nEducation is equally important. Schools that teach students about the environment help raise awareness from an early age. As one environmental expert put it, \"We do not inherit the earth from our ancestors; we borrow it from our children.\" Living in a sustainable way is not a sacrifice; it is a responsibility.",
        questions: [
          { q: "According to scientists, what is the main cause of climate change?", options: ["Natural storms.", "Greenhouse gas emissions from burning coal, oil and gas.", "Population growth.", "Solar power."], answer: 1, explain: "第一段：the main cause is the emission of greenhouse gases from burning coal, oil and gas." },
          { q: "What has happened to solar and wind power over the past decade?", options: ["They have become much cheaper.", "They have been banned.", "They have become less popular.", "They have caused pollution."], answer: 0, explain: "第二段：have become much cheaper over the past decade." },
          { q: "Which action is NOT mentioned as something individuals can do?", options: ["Taking public transport.", "Recycling household waste.", "Saving water.", "Planting trees."], answer: 3, explain: "第三段只提到公共交通、回收垃圾、节约用水。" },
          { q: "What does the quotation in the last paragraph suggest?", options: ["We should respect our ancestors.", "We must protect the earth for future generations.", "The earth belongs to scientists.", "Children should pay for pollution."], answer: 1, explain: "“我们从子孙那里借来地球”，强调要为后代保护地球。" }
        ]
      },
      cloze: {
        text: "To slow down [climate] change, we need to [reduce] carbon [emissions]. One solution is to use [renewable] energy such as wind and solar power. We can also [recycle] more waste and [protect] the forests that are home to many animals.",
        distractors: ["species", "awareness"]
      },
      translation: [
        { zh: "保护环境是每个人的责任。", en: "Protecting the environment is everyone's responsibility." },
        { zh: "我们应该尽可能多地回收利用废物。", en: "We should recycle as much waste as possible." },
        { zh: "太阳能是一种清洁的可再生能源。", en: "Solar energy is a clean and renewable source of energy." },
        { zh: "空气污染对人们的健康造成了严重后果。", en: "Air pollution has serious consequences for people's health." },
        { zh: "这次活动提高了公众的环保意识。", en: "The campaign raised public awareness of environmental protection." }
      ]
    },

    {
      id: "u5", level: "intermediate", title: "Work & Career", titleZh: "求职与职场", emoji: "💼",
      words: [
        { w: "career", ph: "/kəˈrɪr/", pos: "n.", zh: "职业；事业", ex: "She wants a career in medicine.", exZh: "她想从事医学职业。" },
        { w: "interview", ph: "/ˈɪntərvjuː/", pos: "n.", zh: "面试；采访", ex: "I have a job interview tomorrow morning.", exZh: "我明天上午有一场求职面试。" },
        { w: "applicant", ph: "/ˈæplɪkənt/", pos: "n.", zh: "申请人", ex: "There were over 200 applicants for the position.", exZh: "这个职位有两百多名申请人。" },
        { w: "qualification", ph: "/ˌkwɑːlɪfɪˈkeɪʃn/", pos: "n.", zh: "资格；学历", ex: "What qualifications do you need for this job?", exZh: "这份工作需要什么资格？" },
        { w: "salary", ph: "/ˈsæləri/", pos: "n.", zh: "薪水", ex: "The starting salary is quite attractive.", exZh: "起薪相当有吸引力。" },
        { w: "colleague", ph: "/ˈkɑːliːɡ/", pos: "n.", zh: "同事", ex: "My colleagues are friendly and helpful.", exZh: "我的同事们友好且乐于助人。" },
        { w: "responsible", ph: "/rɪˈspɑːnsəbl/", pos: "adj.", zh: "负责的；有责任的", ex: "He is responsible for training new staff.", exZh: "他负责培训新员工。" },
        { w: "promote", ph: "/prəˈmoʊt/", pos: "v.", zh: "晋升；促进", ex: "She was promoted to manager last year.", exZh: "她去年被提升为经理。" },
        { w: "flexible", ph: "/ˈfleksəbl/", pos: "adj.", zh: "灵活的；有弹性的", ex: "The company offers flexible working hours.", exZh: "公司提供弹性工作时间。" },
        { w: "experience", ph: "/ɪkˈspɪriəns/", pos: "n.", zh: "经验；经历", ex: "Do you have any work experience?", exZh: "你有工作经验吗？" },
        { w: "competitive", ph: "/kəmˈpetətɪv/", pos: "adj.", zh: "竞争激烈的", ex: "The job market is highly competitive.", exZh: "就业市场竞争非常激烈。" },
        { w: "negotiate", ph: "/nɪˈɡoʊʃieɪt/", pos: "v.", zh: "谈判；协商", ex: "You can negotiate your salary after you get an offer.", exZh: "收到录用通知后你可以协商薪水。" }
      ],
      reading: {
        title: "Landing Your First Job",
        text: "For many graduates, finding the first job is a stressful experience. The job market is competitive, and a single position may attract hundreds of applicants. So what can young people do to stand out?\nFirst, employers value practical experience. Internships and part-time jobs show that a candidate can work in a team and handle real responsibilities. Even volunteer work can be useful, as it demonstrates commitment and communication skills.\nSecond, preparation is essential before an interview. Candidates should research the company, practise answering common questions and prepare a few questions of their own. Interviewers are often impressed by applicants who show genuine interest in the organization.\nThird, graduates should think about the long term. A high starting salary is attractive, but opportunities to learn and be promoted may matter more for a successful career. Flexible working arrangements and supportive colleagues can also make a big difference to job satisfaction.\nFinally, it is important not to give up. Rejection is a normal part of the process, and each interview is a chance to improve.",
        questions: [
          { q: "Why is finding the first job stressful for many graduates?", options: ["Salaries are low.", "The job market is competitive.", "Graduates lack qualifications.", "Companies do not hold interviews."], answer: 1, explain: "第一段：The job market is competitive, and a single position may attract hundreds of applicants." },
          { q: "Why can volunteer work be useful?", options: ["It pays well.", "It shows commitment and communication skills.", "It can replace a degree.", "It guarantees a job."], answer: 1, explain: "第二段：it demonstrates commitment and communication skills." },
          { q: "What often impresses interviewers?", options: ["Expensive clothes.", "Genuine interest in the organization.", "Asking for a high salary.", "Very long answers."], answer: 1, explain: "第三段：impressed by applicants who show genuine interest in the organization." },
          { q: "What does the author advise about rejection?", options: ["Change careers immediately.", "Treat it as normal and keep improving.", "Complain to the company.", "Stop applying for jobs."], answer: 1, explain: "最后一段：Rejection is a normal part of the process, and each interview is a chance to improve." }
        ]
      },
      cloze: {
        text: "The [interview] went better than I expected. The manager asked about my [qualifications] and previous work [experience]. She said the position was very [competitive], but the company offers [flexible] hours and a good [salary].",
        distractors: ["colleague", "negotiate"]
      },
      translation: [
        { zh: "我明天有一场重要的面试。", en: "I have an important interview tomorrow." },
        { zh: "这份工作需要至少两年的工作经验。", en: "This job requires at least two years of work experience." },
        { zh: "她负责公司的市场部。", en: "She is responsible for the company's marketing department." },
        { zh: "如今就业市场竞争非常激烈。", en: "Nowadays the job market is very competitive." },
        { zh: "良好的沟通能力对职业发展很重要。", en: "Good communication skills are important for career development." }
      ]
    },

    {
      id: "u6", level: "intermediate", title: "Travel & Culture", titleZh: "旅行与文化", emoji: "🧭",
      words: [
        { w: "destination", ph: "/ˌdestɪˈneɪʃn/", pos: "n.", zh: "目的地", ex: "Paris is a popular tourist destination.", exZh: "巴黎是热门旅游目的地。" },
        { w: "tradition", ph: "/trəˈdɪʃn/", pos: "n.", zh: "传统", ex: "Eating dumplings at the Spring Festival is a Chinese tradition.", exZh: "春节吃饺子是中国的传统。" },
        { w: "custom", ph: "/ˈkʌstəm/", pos: "n.", zh: "习俗；风俗", ex: "It is a local custom to give gifts at weddings.", exZh: "在婚礼上送礼是当地的习俗。" },
        { w: "diverse", ph: "/daɪˈvɜːrs/", pos: "adj.", zh: "多样的；多元的", ex: "London is a culturally diverse city.", exZh: "伦敦是一座文化多元的城市。" },
        { w: "souvenir", ph: "/ˌsuːvəˈnɪr/", pos: "n.", zh: "纪念品", ex: "I bought a small souvenir for my mother.", exZh: "我给妈妈买了一个小纪念品。" },
        { w: "explore", ph: "/ɪkˈsplɔːr/", pos: "v.", zh: "探索；游览", ex: "We spent the afternoon exploring the old town.", exZh: "我们花了一下午探索老城区。" },
        { w: "heritage", ph: "/ˈherɪtɪdʒ/", pos: "n.", zh: "遗产", ex: "The Great Wall is a World Heritage Site.", exZh: "长城是世界文化遗产。" },
        { w: "accommodation", ph: "/əˌkɑːməˈdeɪʃn/", pos: "n.", zh: "住宿", ex: "The price includes flights and accommodation.", exZh: "价格包括机票和住宿。" },
        { w: "local", ph: "/ˈloʊkl/", pos: "adj.", zh: "当地的；本地的", ex: "Try the local food when you travel.", exZh: "旅行时尝尝当地美食。" },
        { w: "itinerary", ph: "/aɪˈtɪnəreri/", pos: "n.", zh: "行程；旅行计划", ex: "Our itinerary includes three cities in five days.", exZh: "我们的行程是五天游览三个城市。" },
        { w: "appreciate", ph: "/əˈpriːʃieɪt/", pos: "v.", zh: "欣赏；感激", ex: "Travel helps us appreciate other cultures.", exZh: "旅行帮助我们欣赏其他文化。" },
        { w: "festival", ph: "/ˈfestɪvl/", pos: "n.", zh: "节日", ex: "The Mid-Autumn Festival is celebrated with mooncakes.", exZh: "人们吃月饼庆祝中秋节。" }
      ],
      reading: {
        title: "Travel as a Classroom",
        text: "In the past, travel was a luxury enjoyed by only a few. Today, cheaper flights and online booking have made it possible for millions of young people to explore the world. But what do we really gain from travelling?\nFor many, the greatest benefit is cultural understanding. When we visit a foreign destination, we see how people live, eat and celebrate. Taking part in a local festival or learning about an old tradition can teach us more than any textbook. We begin to appreciate that there are many different, equally valid ways of life.\nTravel also builds practical skills. Planning an itinerary, finding accommodation and dealing with unexpected problems, such as a missed train, require independence and patience.\nHowever, responsible travellers remember that they are guests. Respecting local customs, protecting heritage sites and supporting small local businesses rather than buying cheap souvenirs made elsewhere all help to make tourism a positive force. After all, the best journeys change not only where we are, but also who we are.",
        questions: [
          { q: "Why are more young people able to travel today?", options: ["They have longer holidays.", "Flights are cheaper and booking is online.", "Schools require it.", "Governments pay for it."], answer: 1, explain: "第一段：cheaper flights and online booking have made it possible..." },
          { q: "According to the passage, taking part in a local festival can ______.", options: ["be very expensive", "teach us more than any textbook", "be dangerous", "replace school"], answer: 1, explain: "第二段：can teach us more than any textbook." },
          { q: "Which skills does travel help to build?", options: ["Cooking skills.", "Independence and patience.", "Driving skills.", "Singing skills."], answer: 1, explain: "第三段：require independence and patience." },
          { q: "What does \"the best journeys change ... who we are\" mean?", options: ["Travel changes our nationality.", "Travel can change us as people.", "Travel is always tiring.", "We should move abroad."], answer: 1, explain: "最好的旅行不仅改变我们所在的地方，也改变我们自己。" }
        ]
      },
      cloze: {
        text: "Before visiting a new [destination], it is a good idea to learn about its [customs]. Book your [accommodation] early and plan a clear [itinerary]. When you arrive, take time to [explore] the old streets and try some [local] food.",
        distractors: ["souvenir", "heritage"]
      },
      translation: [
        { zh: "春节是中国最重要的传统节日。", en: "The Spring Festival is the most important traditional festival in China." },
        { zh: "旅行帮助我们了解不同的文化。", en: "Travel helps us understand different cultures." },
        { zh: "我们应该尊重当地的风俗习惯。", en: "We should respect local customs." },
        { zh: "长城是世界文化遗产之一。", en: "The Great Wall is one of the World Heritage Sites." },
        { zh: "出发之前请制定好你的行程。", en: "Please plan your itinerary before you set off." }
      ]
    },

    {
      id: "u7", level: "intermediate", title: "Economy & Society", titleZh: "经济与社会", emoji: "🏙️",
      words: [
        { w: "economy", ph: "/ɪˈkɑːnəmi/", pos: "n.", zh: "经济", ex: "China's economy has grown rapidly.", exZh: "中国经济发展迅速。" },
        { w: "consumer", ph: "/kənˈsuːmər/", pos: "n.", zh: "消费者", ex: "Consumers are spending more on services.", exZh: "消费者在服务上的花费越来越多。" },
        { w: "budget", ph: "/ˈbʌdʒɪt/", pos: "n.", zh: "预算", ex: "Students should plan a monthly budget.", exZh: "学生应该制定每月预算。" },
        { w: "invest", ph: "/ɪnˈvest/", pos: "v.", zh: "投资", ex: "It is wise to invest in your own education.", exZh: "投资自己的教育是明智的。" },
        { w: "income", ph: "/ˈɪnkʌm/", pos: "n.", zh: "收入", ex: "Their family income has doubled in ten years.", exZh: "他们的家庭收入十年间翻了一番。" },
        { w: "afford", ph: "/əˈfɔːrd/", pos: "v.", zh: "负担得起", ex: "Many young people cannot afford to buy a house.", exZh: "许多年轻人买不起房子。" },
        { w: "urban", ph: "/ˈɜːrbən/", pos: "adj.", zh: "城市的", ex: "More and more people live in urban areas.", exZh: "越来越多的人生活在城市地区。" },
        { w: "population", ph: "/ˌpɑːpjuˈleɪʃn/", pos: "n.", zh: "人口", ex: "The city has a population of ten million.", exZh: "这座城市有一千万人口。" },
        { w: "generation", ph: "/ˌdʒenəˈreɪʃn/", pos: "n.", zh: "一代人；代", ex: "The younger generation grew up with the internet.", exZh: "年轻一代是伴随互联网长大的。" },
        { w: "inequality", ph: "/ˌɪnɪˈkwɑːləti/", pos: "n.", zh: "不平等", ex: "Education can help reduce inequality.", exZh: "教育有助于减少不平等。" },
        { w: "volunteer", ph: "/ˌvɑːlənˈtɪr/", pos: "n.", zh: "志愿者", ex: "She works as a volunteer at the hospital.", exZh: "她在医院当志愿者。" },
        { w: "community", ph: "/kəˈmjuːnəti/", pos: "n.", zh: "社区；团体", ex: "The whole community helped clean the park.", exZh: "整个社区的人都来帮忙清理公园。" }
      ],
      reading: {
        title: "Spending Smarter",
        text: "Young consumers today have more choices than any generation before them. With a few taps on a phone, they can buy almost anything and have it delivered the same day. This convenience, however, comes with a risk: it has never been easier to spend more than we can afford.\nFinancial experts recommend that young people start with a simple budget. By writing down their monthly income and expenses, they can see where their money goes. Many are surprised to discover how much they spend on small items such as coffee, snacks and online subscriptions.\nSaving is the next step. Even a small amount saved every month can grow over time, especially if it is invested wisely. More importantly, good financial habits reduce stress and give people the freedom to make choices about their future.\nMoney is not only a personal matter, though. As urban populations grow, inequality between rich and poor has become a major social issue. Many young people now volunteer in their communities, showing that a healthy economy should benefit everyone, not just a few.",
        questions: [
          { q: "What risk of online shopping does the passage mention?", options: ["Goods often arrive late.", "It is easy to spend more than we can afford.", "Products are of poor quality.", "Phones get damaged."], answer: 1, explain: "第一段：it has never been easier to spend more than we can afford." },
          { q: "Why should young people write down their income and expenses?", options: ["To pay taxes.", "To see where their money goes.", "To get a bank loan.", "To impress their parents."], answer: 1, explain: "第二段：they can see where their money goes." },
          { q: "What surprises many people?", options: ["How much they spend on small items.", "How high their income is.", "How cheap coffee is.", "How easy investing is."], answer: 0, explain: "第二段：surprised to discover how much they spend on small items." },
          { q: "What does the last paragraph suggest?", options: ["Only rich people should volunteer.", "A healthy economy should benefit everyone.", "City life is too expensive.", "Inequality is not important."], answer: 1, explain: "最后一句：a healthy economy should benefit everyone, not just a few." }
        ]
      },
      cloze: {
        text: "Making a monthly [budget] is the first step to managing money. Write down your [income] and list what you spend. If you cannot [afford] something, wait and save. Over time, you may even be able to [invest] part of your savings. Habits like these help a whole [generation] build a stronger [economy].",
        distractors: ["urban", "volunteer"]
      },
      translation: [
        { zh: "很多年轻人买不起大城市的房子。", en: "Many young people cannot afford houses in big cities." },
        { zh: "制定预算可以帮助你节约开支。", en: "Making a budget can help you save money." },
        { zh: "越来越多的人选择在城市生活。", en: "More and more people choose to live in cities." },
        { zh: "她每个周末都在社区做志愿者。", en: "She volunteers in her community every weekend." },
        { zh: "教育是减少社会不平等的重要途径。", en: "Education is an important way to reduce social inequality." }
      ]
    },

    {
      id: "u8", level: "intermediate", title: "Science & Discovery", titleZh: "科学探索", emoji: "🔭",
      words: [
        { w: "experiment", ph: "/ɪkˈsperɪmənt/", pos: "n.", zh: "实验", ex: "We did an experiment in the chemistry lab.", exZh: "我们在化学实验室做了一个实验。" },
        { w: "theory", ph: "/ˈθiːəri/", pos: "n.", zh: "理论；学说", ex: "Einstein's theory changed our view of time and space.", exZh: "爱因斯坦的理论改变了我们对时空的看法。" },
        { w: "evidence", ph: "/ˈevɪdəns/", pos: "n.", zh: "证据", ex: "There is no evidence to support this idea.", exZh: "没有证据支持这个观点。" },
        { w: "research", ph: "/ˈriːsɜːrtʃ/", pos: "n.", zh: "研究", ex: "She is doing research on brain development.", exZh: "她正在研究大脑发育。" },
        { w: "discover", ph: "/dɪˈskʌvər/", pos: "v.", zh: "发现", ex: "Scientists discovered a new kind of fish.", exZh: "科学家们发现了一种新鱼类。" },
        { w: "observe", ph: "/əbˈzɜːrv/", pos: "v.", zh: "观察；注意到", ex: "Children learn by observing adults.", exZh: "孩子们通过观察大人来学习。" },
        { w: "analyze", ph: "/ˈænəlaɪz/", pos: "v.", zh: "分析", ex: "The team will analyze the results next week.", exZh: "团队下周将分析结果。" },
        { w: "conclusion", ph: "/kənˈkluːʒn/", pos: "n.", zh: "结论", ex: "What conclusion can we draw from the data?", exZh: "我们能从数据中得出什么结论？" },
        { w: "phenomenon", ph: "/fəˈnɑːmɪnən/", pos: "n.", zh: "现象", ex: "A rainbow is a natural phenomenon.", exZh: "彩虹是一种自然现象。" },
        { w: "universe", ph: "/ˈjuːnɪvɜːrs/", pos: "n.", zh: "宇宙", ex: "How old is the universe?", exZh: "宇宙有多古老？" },
        { w: "curious", ph: "/ˈkjʊriəs/", pos: "adj.", zh: "好奇的", ex: "Scientists are curious about everything.", exZh: "科学家对一切都充满好奇。" },
        { w: "significant", ph: "/sɪɡˈnɪfɪkənt/", pos: "adj.", zh: "重大的；显著的", ex: "This is a significant discovery.", exZh: "这是一个重大发现。" }
      ],
      reading: {
        title: "How Science Works",
        text: "Every great scientific discovery begins with a question. Why does an apple fall to the ground? What are stars made of? Scientists are, above all, curious people who refuse to accept things without evidence.\nThe scientific method gives this curiosity a structure. First, researchers observe a phenomenon and form a theory that might explain it. Next, they design an experiment to test the theory. They collect data, analyze the results and then draw a conclusion. If the evidence does not support the theory, it must be changed or abandoned.\nThis process is slow, and failure is common. Thomas Edison famously tested thousands of materials before finding one that worked in his light bulb. Yet each failure provides useful information.\nImportantly, science is a shared effort. Research is published so that others can check it and build on it. A single significant result may come from years of work by teams around the world. This openness is what has allowed humans to understand everything from tiny cells to the vast universe.",
        questions: [
          { q: "According to the passage, what do scientists refuse to do?", options: ["Ask questions.", "Accept things without evidence.", "Work in teams.", "Publish their research."], answer: 1, explain: "第一段：curious people who refuse to accept things without evidence." },
          { q: "What should happen if the evidence does not support a theory?", options: ["The results should be hidden.", "The theory should be changed or abandoned.", "The experiment should be repeated until it works.", "It should be published anyway."], answer: 1, explain: "第二段：it must be changed or abandoned." },
          { q: "Why does the author mention Thomas Edison?", options: ["To show that failure is a normal part of science.", "To explain how light bulbs work.", "To praise all inventors.", "To criticize his methods."], answer: 0, explain: "第三段：failure is common... each failure provides useful information." },
          { q: "Why is research published?", options: ["To make money.", "So that others can check it and build on it.", "To make scientists famous.", "Because the law requires it."], answer: 1, explain: "最后一段：so that others can check it and build on it." }
        ]
      },
      cloze: {
        text: "Scientists are [curious] about the world. When they [observe] something unusual, they form a [theory] and design an [experiment] to test it. After they [analyze] the results, they draw a [conclusion] based on the [evidence].",
        distractors: ["universe", "phenomenon"]
      },
      translation: [
        { zh: "科学家们发现了一种新的物种。", en: "Scientists have discovered a new species." },
        { zh: "没有足够的证据支持这个理论。", en: "There is not enough evidence to support this theory." },
        { zh: "我们需要仔细分析实验结果。", en: "We need to analyze the experimental results carefully." },
        { zh: "好奇心是科学进步的动力。", en: "Curiosity is the driving force of scientific progress." },
        { zh: "这项研究具有重大意义。", en: "This research is of great significance." }
      ]
    }
  ]
};
