// ====== ESTADO DO JOGO ======
let questions = [];
let currentQuestion = 0;
let score = 0;
let lives = 3;
let level = 1;
let subject = null; // começa sem matéria
let isMuted = false;
let awaitingNext = false; // quando true, o botão "Confirmar" vira "Próxima"
let lastQuestionRevealed = null; // guarda a questão cujo gabarito foi revelado

// ====== ELEMENTOS ======
const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const submitBtn = document.getElementById("submitBtn");
const restartBtn = document.getElementById("restartBtn");
const subjectSelect = document.getElementById("subjectSelect");
const muteBtn = document.getElementById("muteBtn"); // opcional no HTML

// ====== FUNÇÕES ÚTEIS ======
// Embaralhar (Fisher–Yates)
function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Extrai nome do arquivo a partir de um path/URL
function filenameFromPath(p) {
  return (p || "").split("/").pop();
}

// ====== SONS ======
const soundCorrect = new Audio("sounds/correct.mp3");
const soundWrong = new Audio("sounds/wrong.mp3");
const soundWin = new Audio("sounds/win.mp3");
const soundGameOver = new Audio("sounds/gameover.wav");

// Música de fundo
const bgMusic = new Audio("sounds/background.wav");
bgMusic.loop = true;
bgMusic.volume = 0.1;

// Aplica estado de mudo / volume
function applyMuteState() {
  const vol = isMuted ? 0 : 1;
  // efeitos
  soundCorrect.volume = vol;
  soundWrong.volume = vol;
  soundWin.volume = vol;
  soundGameOver.volume = vol;
  // música (mantém volume base 0.1 quando ON)
  bgMusic.volume = isMuted ? 0 : 0.1;
  if (muteBtn) {
    muteBtn.textContent = isMuted ? "🔇 Música: OFF" : "🔊 Música: ON";
    muteBtn.setAttribute("aria-pressed", String(!isMuted));
  }
}

function playSound(type) {
  if (isMuted) return;
  if (type === "correct") soundCorrect.play();
  else if (type === "wrong") soundWrong.play();
  else if (type === "win") soundWin.play();
  else if (type === "gameover") soundGameOver.play();
}

function startBackgroundMusic() {
  if (isMuted) return;
  bgMusic.play().catch(() => {
    // Autoplay será liberado após interação do usuário
    console.log("Autoplay bloqueado, música será iniciada após interação.");
  });
}

function stopBackgroundMusic() {
  bgMusic.pause();
  bgMusic.currentTime = 0;
}

// ====== CONFETE ======
function launchConfetti(bursts = 30) {
  for (let i = 0; i < bursts; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.top = "-10px";
    c.style.background = `hsl(${Math.random() * 360}, 90%, 60%)`;
    c.style.animationDuration = 1.5 + Math.random() * 1.2 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}

// ====== CARREGAR QUESTÕES ======
async function loadQuestions() {
  if (!subject) {
    feedbackEl.textContent = "⚠️ Selecione uma matéria para começar!";
    return;
  }
  try {
    const response = await fetch("questions.json");
    if (!response.ok) throw new Error("Falha ao carregar questions.json");
    const data = await response.json();

    if (!data[subject] || !Array.isArray(data[subject])) {
      throw new Error("Matéria não encontrada no arquivo de questões");
    }

    questions = shuffle(data[subject]); // chaves: "3-materias", "ciências naturais", "português"
    currentQuestion = 0;
    loadQuestion();
  } catch (err) {
    console.error(err);
    feedbackEl.textContent =
      "❌ Erro ao carregar as questões. Verifique o arquivo e o caminho.";
  }
}

// ====== MOSTRAR QUESTÃO ATUAL ======
function loadQuestion() {
  const q = questions[currentQuestion];

  questionEl.textContent = q.text;
  optionsEl.innerHTML = "";

  // ✅ cria e guarda as opções embaralhadas para esta pergunta
  // (assim a checagem e a revelação usam a mesma ordem exibida)
  q._shuffledOptions = shuffle(q.options);

  q._shuffledOptions.forEach((opt) => {
    const div = document.createElement("div");
    div.className = "option";
    div.setAttribute("role", "button");
    div.setAttribute("tabindex", "0");

    // 🔐 guarda se é correta e um id estável no próprio elemento
    div.dataset.correct = opt.correct ? "1" : "0";
    div.dataset.type = opt.type;

    if (opt.type === "text") {
      div.textContent = opt.text;
      div.dataset.id = (opt.text || "").trim().toLowerCase();
    } else if (opt.type === "image") {
      const img = document.createElement("img");
      img.src = opt.src;
      img.alt = "opção";
      img.style.maxWidth = "120px";
      img.style.borderRadius = "8px";
      div.appendChild(img);
      div.dataset.id = (opt.src || "").split("/").pop().trim().toLowerCase();
    }

    // Detecta se tem 1 ou várias corretas
    const correctCount = q.options.filter((o) => o.correct).length;

    div.addEventListener("click", () => {
      if (correctCount === 1) {
        optionsEl
          .querySelectorAll(".option")
          .forEach((o) => o.classList.remove("selected"));
        div.classList.add("selected");
      } else {
        div.classList.toggle("selected");
      }
    });

    div.addEventListener("keydown", (e) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        div.click();
      }
    });

    optionsEl.appendChild(div);
  });

  // limpar feedback/destaques
  feedbackEl.textContent = "";
  feedbackEl.className = "";

  optionsEl.querySelectorAll(".option").forEach((el) => {
    el.classList.remove("correct-reveal", "wrong-reveal", "selected", "correct", "wrong");
    el.style.pointerEvents = "";
  });

  // reseta a “segunda chance” ao entrar na pergunta
  q._triedOnce = false;

  // reseta o modo "Próxima", se estiver ativo
  if (typeof awaitingNext !== "undefined") {
    awaitingNext = false;
    submitBtn.textContent = "✅ Confirmar";
  }
}

// ====== REVELAR GABARITO (CORRIGIDO) ======
// Destaca corretas/erradas usando os dados do próprio elemento (independe do embaralhamento)
function revealCorrectAnswers(q) {
  const optionEls = [...optionsEl.querySelectorAll(".option")];

  optionEls.forEach((el) => {
    const isCorrect = el.dataset.correct === "1";

    // remove seleção e bloqueia novas interações
    el.classList.remove("selected");
    el.style.pointerEvents = "none";

    // aplica as classes específicas de "revelação" previstas no CSS
    el.classList.toggle("correct-reveal", isCorrect);
    el.classList.toggle("wrong-reveal", !isCorrect);

    // garante que classes antigas não interfiram (se existirem)
    el.classList.remove("correct", "wrong");
  });
}

// ====== VERIFICAR RESPOSTA ======
function checkAnswer() {
  console.log("checkAnswer chamada");

  // Se estamos aguardando o clique para ir à próxima, apenas avança
  if (awaitingNext) {
    awaitingNext = false;
    submitBtn.textContent = "✅ Confirmar";
    currentQuestion++;
    if (currentQuestion < questions.length) {
      loadQuestion();
      submitBtn.disabled = false;
    } else {
      feedbackEl.textContent = "🏆 Fim do jogo!";
      playSound("win");
      if (typeof launchConfetti === "function") launchConfetti(60);
      stopBackgroundMusic();
    }
    return;
  }

  submitBtn.disabled = true;

  const q = questions[currentQuestion];
  const optionEls = [...optionsEl.querySelectorAll(".option")];

  // Conjunto do gabarito (corretas)
  const correctSet = new Set(
    q.options
      .filter((o) => o.correct)
      .map((o) =>
        (o.type === "text" ? (o.text || "") : (o.src || "").split("/").pop())
          .trim()
          .toLowerCase()
      )
  );

  // Selecionadas pelo usuário
  const selectedEls = optionEls.filter((el) => el.classList.contains("selected"));

  if (selectedEls.length === 0) {
    feedbackEl.textContent = "⚠️ Escolha uma opção!";
    submitBtn.disabled = false;
    return;
  }

  const selectedSet = new Set(
    selectedEls.map((el) => {
      const img = el.querySelector("img");
      return img
        ? img.src.split("/").pop().trim().toLowerCase()
        : (el.textContent || "").trim().toLowerCase();
    })
  );

  // Função para comparar conjuntos
  const setsAreEqual = (A, B) => A.size === B.size && [...A].every((x) => B.has(x));
  const acerto = setsAreEqual(selectedSet, correctSet);

  // ✅ ACERTO
  if (acerto) {
    feedbackEl.textContent = "🎉 Correto!";
    feedbackEl.className = "correct";
    score += 10;
    level++;
    playSound("correct");
    updateHud();

    setTimeout(() => {
      currentQuestion++;
      if (currentQuestion < questions.length) {
        loadQuestion();
        submitBtn.disabled = false;
      } else {
        feedbackEl.textContent = "🏆 Fim do jogo!";
        playSound("win");
        if (typeof launchConfetti === "function") launchConfetti(60);
        stopBackgroundMusic();
      }
    }, 1000);

    return;
  }

  // ❌ ERRO
  // Primeira tentativa errada → segunda chance
  if (!q._triedOnce) {
    q._triedOnce = true;
    feedbackEl.textContent = "❌ Não foi dessa vez... tente novamente!";
    feedbackEl.className = "wrong";
    score = Math.max(0, score - 2); // penalidade leve
    updateHud();
    submitBtn.disabled = false;
    return; // NÃO avança ainda
  }

  // Segunda tentativa errada → revela corretas e espera clique para avançar
  feedbackEl.textContent = "❌ Errado! A resposta correta está destacada em verde.";
  feedbackEl.className = "wrong";
  score = Math.max(0, score - 5);
  lives--;
  playSound("wrong");
  updateHud();

  // Revela usando os dados do DOM (corrigido)
  revealCorrectAnswers(q);
  lastQuestionRevealed = q;

  if (lives <= 0) {
    feedbackEl.textContent = "💀 Game Over!";
    submitBtn.disabled = true;
    playSound("gameover");
    stopBackgroundMusic();
    return;
  }

  // Agora aguardamos o clique do jogador para ir para a próxima
  awaitingNext = true;
  submitBtn.textContent = "➡️ Próxima";
  submitBtn.disabled = false;
}

function updateHud() {
  scoreEl.textContent = "⭐ Pontuação: " + score;
  livesEl.textContent = "❤️ Vidas: " + lives;
  levelEl.textContent = "🚀 Fase: " + level;
}

// ====== REINICIAR JOGO ======
function restartGame() {
  score = 0;
  lives = 3;
  level = 1;
  updateHud();
  feedbackEl.textContent = "";
  submitBtn.disabled = false;
  loadQuestions();
  startBackgroundMusic();
}

// ====== EVENTOS ======
submitBtn.addEventListener("click", checkAnswer);
restartBtn.addEventListener("click", restartGame);

subjectSelect.addEventListener("change", (e) => {
  subject = e.target.value;
  restartGame();
  startBackgroundMusic(); // garante início após a primeira interação
});

if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    applyMuteState();
    if (!isMuted) startBackgroundMusic();
  });
}

// Primeira dica
feedbackEl.textContent = "📚 Selecione a matéria para começar!";

// Aplica estado de áudio inicial
applyMuteState();