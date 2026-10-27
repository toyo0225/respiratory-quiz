(function () {
  'use strict';
  const { TERMS, createSession, currentQuestion, answerQuestion, advanceQuestion, getSummary } = window.RespiratoryQuiz;
  const $ = id => document.getElementById(id);
  const byId = new Map(TERMS.map(term => [term.id, term]));
  const groups = { anatomy: 'ANATOMY / 解剖', symptom: 'SYMPTOMS / 症状', breathing: 'BREATHING / 呼吸', procedure: 'PROCEDURES / 検査', disease: 'DISEASES / 疾患', neoplasm: 'NEOPLASMS / 腫瘍' };
  let session = null;
  let reviewMode = false;

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function showScreen(screen) {
    ['home', 'quiz', 'results'].forEach(name => { $(`${name}-screen`).hidden = name !== screen; });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function startQuiz(termIds, mode) {
    reviewMode = Boolean(termIds);
    session = createSession({ mode: mode || document.querySelector('input[name="mode"]:checked').value, ...(termIds ? { termIds } : {}) });
    showScreen('quiz');
    renderQuestion();
  }

  function updateProgress() {
    const summary = getSummary(session);
    $('question-counter').replaceChildren(element('strong', '', String(session.index + 1).padStart(2, '0')), document.createTextNode(` / ${summary.total}`));
    $('score-counter').textContent = `${summary.correct}問 正解`;
    $('progress-fill').style.width = `${summary.answered / summary.total * 100}%`;
    $('quiz-progress').setAttribute('aria-valuemax', String(summary.total));
    $('quiz-progress').setAttribute('aria-valuenow', String(summary.answered));
    $('quiz-progress').setAttribute('aria-valuetext', `${summary.total}問中${summary.answered}問回答済み`);
  }

  function renderQuestion() {
    const question = currentQuestion(session);
    if (!question) return;
    const term = byId.get(question.id);
    const isEnglish = session.mode === 'en-ja';
    $('quiz-mode').textContent = isEnglish ? '英語 → 日本語' : '日本語 → 英語';
    $('question-category').textContent = groups[term.group];
    $('review-badge').hidden = !reviewMode;
    $('question-instruction').textContent = isEnglish ? 'この英単語の日本語訳は？' : 'この日本語を表す英単語は？';
    $('question-term').textContent = question.prompt;
    $('question-term').lang = isEnglish ? 'en' : 'ja';
    $('question-term').classList.toggle('is-japanese', !isEnglish);
    $('question-context').hidden = term.group !== 'neoplasm';
    $('question-context').textContent = 'この単語集では、悪性腫瘍の総称と上皮性悪性腫瘍を区別します。';
    $('options').replaceChildren();
    question.options.forEach((option, index) => {
      const button = element('button', 'option-button');
      button.type = 'button';
      button.dataset.optionId = option.id;
      const letter = element('span', 'option-letter', ['A', 'B', 'C', 'D'][index]);
      letter.setAttribute('aria-hidden', 'true');
      const label = element('span', 'option-label', option.label);
      label.lang = isEnglish ? 'ja' : 'en';
      button.append(letter, label);
      button.addEventListener('click', () => chooseAnswer(option.id));
      $('options').append(button);
    });
    $('feedback').replaceChildren();
    $('feedback').className = 'feedback';
    $('next-button').hidden = true;
    $('next-button').textContent = session.index === session.questions.length - 1 ? '結果を見る →' : '次の問題へ →';
    $('answer-tip').hidden = false;
    updateProgress();
    $('question-term').focus({ preventScroll: true });
  }

  function chooseAnswer(optionId) {
    const outcome = answerQuestion(session, optionId);
    if (!outcome.accepted) return;
    const question = currentQuestion(session);
    for (const button of $('options').querySelectorAll('button')) {
      button.disabled = true;
      const id = button.dataset.optionId;
      if (id === question.correctId) {
        button.classList.add('is-correct');
        button.append(element('span', 'option-state', '✓ 正解'));
      } else if (id === optionId) {
        button.classList.add('is-wrong');
        button.append(element('span', 'option-state', '× 選択'));
      } else button.classList.add('is-muted');
    }
    $('feedback').classList.toggle('is-wrong', !outcome.correct);
    const answer = question.options.find(option => option.id === question.correctId).label;
    $('feedback').replaceChildren(element('strong', '', outcome.correct ? '正解！その調子。' : `惜しい！正解は「${answer}」`), element('p', '', question.note));
    $('next-button').hidden = false;
    $('answer-tip').hidden = true;
    updateProgress();
    // Move keyboard focus out of a now-disabled option; feedback is announced separately.
    $('next-button').focus({ preventScroll: true });
  }

  function renderResults() {
    const summary = getSummary(session);
    showScreen('results');
    $('final-score').textContent = summary.correct;
    $('final-total').textContent = ` / ${summary.total}`;
    $('final-percent').textContent = `正答率 ${summary.percentage}%`;
    $('score-ring').style.background = `conic-gradient(var(--green) ${summary.percentage * 3.6}deg, #e8eee1 0deg)`;
    $('results-title').textContent = reviewMode ? '復習、おつかれさまでした！' : 'おつかれさまでした！';
    const perfect = summary.correct === summary.total;
    $('result-message').textContent = perfect ? '全問正解、すばらしい！' : summary.percentage >= 70 ? 'あと少しで、しっかり定着。' : 'ここから、少しずつ覚えよう。';
    $('result-description').textContent = perfect ? '次は逆向きのモードでも挑戦してみましょう。' : `間違えた${summary.wrongIds.length}語を振り返って、もう一度チャレンジ。`;
    $('retry-button').hidden = perfect;
    $('retry-button').textContent = `間違えた${summary.wrongIds.length}問だけ復習 →`;
    $('mistakes-section').hidden = perfect;
    $('mistakes-count').textContent = `${summary.wrongIds.length}語`;
    $('mistakes-list').replaceChildren();
    for (const answer of session.answers.filter(item => !item.correct)) {
      const term = byId.get(answer.questionId);
      const selected = byId.get(answer.optionId);
      const card = element('article', 'mistake-item');
      const title = element('h3', 'mistake-term', term.en);
      title.lang = 'en';
      card.append(title, element('p', 'mistake-answer', `正解：${term.ja}`),
        element('p', 'mistake-selected', `選んだ答え：${session.mode === 'en-ja' ? selected.ja : selected.en}`),
        element('p', 'mistake-note', term.note));
      $('mistakes-list').append(card);
    }
    $('results-title').focus({ preventScroll: true });
  }

  $('brand-link').addEventListener('click', event => {
    event.preventDefault();
    if (session && !session.complete) $('quit-dialog').showModal();
    else goHome();
  });
  $('start-button').addEventListener('click', () => startQuiz());
  $('next-button').addEventListener('click', () => {
    if (!session || !advanceQuestion(session)) return;
    if (session.complete) renderResults();
    else { renderQuestion(); window.scrollTo({ top: 0, behavior: 'instant' }); }
  });
  $('retry-button').addEventListener('click', () => {
    const wrongIds = getSummary(session).wrongIds;
    if (wrongIds.length) startQuiz(wrongIds, session.mode);
  });
  $('restart-button').addEventListener('click', () => startQuiz(undefined, session.mode));
  $('home-button').addEventListener('click', goHome);
  $('quit-button').addEventListener('click', () => $('quit-dialog').showModal());
  $('continue-button').addEventListener('click', () => $('quit-dialog').close());
  $('confirm-quit-button').addEventListener('click', () => { $('quit-dialog').close(); goHome(); });

  function goHome() {
    session = null;
    showScreen('home');
    $('start-button').focus({ preventScroll: true });
  }

  TERMS.forEach(term => {
    const row = element('dl', 'vocabulary-item');
    row.style.margin = '0';
    const english = element('dt', '', term.en);
    english.lang = 'en';
    row.append(english, element('dd', '', term.ja));
    $('vocabulary').append(row);
  });
})();
