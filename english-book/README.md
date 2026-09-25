# Word Garden 词园 — English study book, beginner to advanced

A self-contained web app for memorising English vocabulary at three levels. It has no build step and no dependencies: open `index.html` in a browser.

```bash
cd english-book
python3 -m http.server 8000   # then visit http://localhost:8000
```

## What's inside

- **18 units × 12 words** at three levels, each word with IPA, part of speech, a Chinese definition and an example sentence:
  - **初级 Beginner (A2)**: Food & Drink, Shopping, Home & Family, Getting Around
  - **中级 Intermediate (B1, CET-4)**: Campus Life, Health, Technology, Environment, Work & Career, Travel & Culture, Economy & Society, Science & Discovery, Friends & Communication, Free Time & Media
  - **高级 Advanced (B2–C1, CET-6/IELTS)**: Modern Living, Mind & Wellbeing, Media & Information, Global Challenges
- The contents page filters by level or by **日常生活** (everyday-life units). Reading passages get longer as the level goes up: about 120, 170 and 200 words.
- **单词 Words**: flip cards with pronunciation. Grade each word 不认识 / 模糊 / 认识.
- **听写 Dictation**: hear the word (or see the Chinese) and type it. Mistakes get a letter-by-letter diff.
- **完形 Cloze**: a CET-4 style banked cloze passage (选词填空), plus fill-in-the-blank from example sentences.
- **阅读 Reading**: a passage with 4 questions and explanations. Tap any underlined word to see its meaning.
- **翻译 Translation**: 中译英 and 英译中. You get a reference answer and a similarity score, then grade yourself.
- **复习 Review**: spaced repetition with Leitner boxes (1, 2, 4, 7, 15 and 30 days), as flip cards or spelling.
- **错题本 Mistake book**: every wrong answer is collected here. 重练错词 drills those words until you get them right.
- **我的词库 My words**: add words one at a time or paste a list (`word, 中文, example`). They get their own chapter.
- **设置 Settings**: daily goal, light/dark theme, US/UK voice, speech rate, and JSON backup/restore.

Your progress is saved in the browser's `localStorage` on this device. Before you switch devices, export a backup from **设置**.

Pronunciation uses the browser's built-in speech synthesis, which works in Chrome, Edge and Safari.

To add more built-in content, edit `data.js` (the core CET-4 units) or `levels.js` (the level list and the other units). Every unit has the same shape plus a `level`, and `daily: true` marks an everyday-life topic.
