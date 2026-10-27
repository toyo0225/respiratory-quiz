/* Quiz data and state: no DOM, storage, or network dependencies. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RespiratoryQuiz = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TERMS = Object.freeze([
    { id: 'lung', en: 'lung', ja: '肺', group: 'anatomy', note: 'lung は肺、lobe は肺葉。' },
    { id: 'lobe', en: 'lobe', ja: '肺葉', group: 'anatomy', note: 'この呼吸器の単語集では、lobe を「肺葉」として扱います。' },
    { id: 'pharynx', en: 'pharynx', ja: '咽頭', group: 'anatomy', note: 'pharynx は咽頭、larynx は喉頭。つづりと意味をセットで区別。' },
    { id: 'larynx', en: 'larynx', ja: '喉頭', group: 'anatomy', note: 'larynx は喉頭、pharynx は咽頭。' },
    { id: 'trachea', en: 'trachea', ja: '気管', group: 'anatomy', note: 'trachea は気管、bronchus は気管支。' },
    { id: 'bronchus', en: 'bronchus', ja: '気管支', group: 'anatomy', note: 'bronchus は気管支、bronchitis は気管支炎。' },
    { id: 'alveolus', en: 'alveolus', ja: '肺胞', group: 'anatomy', note: 'alveolus は肺胞。' },
    { id: 'thorax', en: 'thorax', ja: '胸郭', group: 'anatomy', note: 'この単語集では thorax を「胸郭」として扱います。' },
    { id: 'pleura', en: 'pleura', ja: '胸膜', group: 'anatomy', note: 'pleura は胸膜。' },
    { id: 'cough', en: 'cough', ja: '咳嗽', group: 'symptom', note: '咳嗽（がいそう）は、せきのこと。' },
    { id: 'sputum', en: 'sputum', ja: '喀痰', group: 'symptom', note: '喀痰（かくたん）は、たんのこと。' },
    { id: 'apnea', en: 'apnea', ja: '無呼吸', group: 'breathing', note: 'apnea は無呼吸。hypoventilation（低換気）と区別。' },
    { id: 'dyspnea', en: 'dyspnea', ja: '呼吸困難', group: 'breathing', note: 'dyspnea は呼吸困難、hypoxia は低酸素症。' },
    { id: 'tachypnea', en: 'tachypnea', ja: '頻呼吸', group: 'breathing', note: 'tachypnea は頻呼吸。hyperventilation（過換気）とは別の用語です。' },
    { id: 'hyperventilation', en: 'hyperventilation', ja: '過換気', group: 'breathing', note: 'hyperventilation は過換気、hypoventilation は低換気。' },
    { id: 'hypoventilation', en: 'hypoventilation', ja: '低換気', group: 'breathing', note: 'hypoventilation は低換気。apnea（無呼吸）と区別。' },
    { id: 'hypoxia', en: 'hypoxia', ja: '低酸素症', group: 'breathing', note: 'hypoxia は低酸素症、dyspnea は呼吸困難。' },
    { id: 'tblb', en: 'TBLB', ja: '経気管支肺生検', group: 'procedure', note: 'TBLB は経気管支肺生検、BAL は気管支肺胞洗浄。' },
    { id: 'bal', en: 'BAL', ja: '気管支肺胞洗浄', group: 'procedure', note: 'BAL は気管支肺胞洗浄、TBLB は経気管支肺生検。' },
    { id: 'pneumonia', en: 'pneumonia', ja: '肺炎', group: 'disease', note: 'pneumonia は肺炎。' },
    { id: 'tb', en: 'TB', ja: '結核', group: 'disease', note: 'TB は結核。' },
    { id: 'bronchitis', en: 'bronchitis', ja: '気管支炎', group: 'disease', note: 'bronchitis は気管支炎、bronchus は気管支。' },
    { id: 'asthma', en: 'asthma', ja: '気管支喘息', group: 'disease', note: 'この呼吸器の単語集では、asthma を「気管支喘息」として扱います。' },
    { id: 'emphysema', en: 'emphysema', ja: '肺気腫', group: 'disease', note: 'emphysema は肺気腫。' },
    { id: 'copd', en: 'COPD', ja: '慢性閉塞性肺疾患', group: 'disease', note: 'COPD は慢性閉塞性肺疾患。' },
    { id: 'silicosis', en: 'silicosis', ja: '珪肺', group: 'disease', note: '珪肺（けいはい）。silicosis とセットで覚えましょう。' },
    { id: 'cancer', en: 'cancer', ja: 'がん（悪性腫瘍）', group: 'neoplasm', note: 'cancer は悪性腫瘍の総称。carcinoma は上皮性の悪性腫瘍（癌腫）を指します。' },
    { id: 'carcinoma', en: 'carcinoma', ja: '癌腫（上皮性悪性腫瘍）', group: 'neoplasm', note: 'carcinoma は上皮性の悪性腫瘍（癌腫）。より広い総称の cancer と区別します。' }
  ].map(Object.freeze));
  const byId = new Map(TERMS.map(term => [term.id, term]));

  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeQuestion(term, mode, random) {
    // Use nearby terms first. Always draw distractors from the full 28-term bank,
    // even in a one-question retry. Do not contrast overlapping cancer categories.
    const candidates = TERMS.filter(other => other.id !== term.id &&
      !(term.group === 'neoplasm' && other.group === 'neoplasm'));
    const nearby = shuffle(candidates.filter(other => other.group === term.group), random);
    const others = shuffle(candidates.filter(other => other.group !== term.group), random);
    const chosen = [term];
    for (const other of nearby.concat(others)) {
      if (other.group === 'neoplasm' && chosen.some(item => item.group === 'neoplasm')) continue;
      chosen.push(other);
      if (chosen.length === 4) break;
    }
    const options = shuffle(chosen, random)
      .map(other => ({ id: other.id, label: mode === 'en-ja' ? other.ja : other.en }));
    return { id: term.id, prompt: mode === 'en-ja' ? term.en : term.ja,
      options, correctId: term.id, note: term.note };
  }

  function createSession({ mode = 'en-ja', termIds = TERMS.map(term => term.id), random = Math.random } = {}) {
    if (!['en-ja', 'ja-en'].includes(mode)) throw new Error('Unknown quiz mode.');
    const ids = [...new Set(termIds)];
    if (ids.length === 0 || ids.some(id => !byId.has(id))) throw new Error('Choose at least one valid term.');
    return { mode, questions: shuffle(ids.map(id => byId.get(id)), random).map(term => makeQuestion(term, mode, random)),
      index: 0, answers: [], complete: false };
  }

  function currentQuestion(session) {
    return session.complete ? null : session.questions[session.index];
  }

  function answerQuestion(session, optionId) {
    const question = currentQuestion(session);
    if (!question || session.answers.length !== session.index || !question.options.some(option => option.id === optionId)) {
      return { accepted: false, correct: false };
    }
    const correct = optionId === question.correctId;
    session.answers.push({ questionId: question.id, optionId, correct });
    return { accepted: true, correct };
  }

  function advanceQuestion(session) {
    if (session.complete || session.answers.length !== session.index + 1) return false;
    if (session.index === session.questions.length - 1) session.complete = true;
    else session.index++;
    return true;
  }

  function getSummary(session) {
    const correct = session.answers.filter(answer => answer.correct).length;
    return { total: session.questions.length, answered: session.answers.length, correct,
      wrongIds: session.answers.filter(answer => !answer.correct).map(answer => answer.questionId),
      percentage: Math.round(correct / session.questions.length * 100) };
  }

  return { TERMS, shuffle, createSession, currentQuestion, answerQuestion, advanceQuestion, getSummary };
});
