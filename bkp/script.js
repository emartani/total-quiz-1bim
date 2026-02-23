let questions = [];
let currentQuestion = 0;
let score = 0;
let lives = 3;
let level = 1;
let subject = null; // começa sem matéria

const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const submitBtn = document.getElementById("submitBtn");
const restartBtn = document.getElementById("restartBtn");
const subjectSelect = document.getElementById("subjectSelect");

// 🔀 Embaralhar array
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

// 🎵 Sons
const soundCorrect = new Audio("sounds/correct.mp3");
const soundWrong = new Audio("sounds/wrong.mp3");
const soundWin = new Audio("sounds/win.mp3");
const soundGameOver = new Audio("sounds/gameover.wav");

// Música de fundo
const bgMusic = new Audio("sounds/background.wav");
bgMusic.loop = true;
bgMusic.volume = 0.1;

function playSound(type) {
  if (type === "correct") soundCorrect.play();
  else if (type === "wrong") soundWrong.play();
  else if (type === "win") soundWin.play();
  else if (type === "gameover") soundGameOver.play();
}

function startBackgroundMusic() {
  bgMusic.play().catch(() => {
    console.log("Autoplay bloqueado, música será iniciada após interação.");
  });
}

function stopBackgroundMusic() {
  bgMusic.pause();
  bgMusic.currentTime = 0;
}

// 📚 Carregar questões da matéria escolhida
async function loadQuestions() {
  if (!subject) {
    feedbackEl.textContent = "⚠️ Selecione uma matéria para começar!";
    return;
  }
  const response = await fetch("questions.json");
  const data = await response.json();
  questions = shuffle(data[subject]);
  currentQuestion = 0;
  loadQuestion();
}

// Mostrar questão atual
function loadQuestion() {
  const q = questions[currentQuestion];
  questionEl.textContent = q.text;
  optionsEl.innerHTML = "";

  
// script.js — dentro de loadQuestion()
q.options.forEach(opt => {
  let div = document.createElement("div");
  div.className = "option";

  if (opt.type === "text") {
    div.textContent = opt.text;
  } else if (opt.type === "image") {
    const img = document.createElement("img");
    img.src = opt.src;
    img.alt = "opção";
    img.style.maxWidth = "120px";
    img.style.borderRadius = "8px";
    div.appendChild(img);
  }

  // 🔁 Toggle de seleção (permite múltiplas)
  div.addEventListener("click", () => {
    // Detecta se a questão tem 1 ou várias corretas
    const correctCount = q.options.filter(o => o.correct).length;

    if (correctCount === 1) {
      // seleção única
      optionsEl.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
      div.classList.add("selected");
    } else {
      // múltipla seleção (toggle)
      div.classList.toggle("selected");
    }
  });

  optionsEl.appendChild(div);
});


  feedbackEl.textContent = "";
  feedbackEl.className = "";
}

// Verificar resposta
function checkAnswer() {
  const q = questions[currentQuestion];
  const selected = [...optionsEl.querySelectorAll(".selected")];

  if (selected.length === 0) {
    feedbackEl.textContent = "⚠️ Escolha uma opção!";
    return;
  }

  let correctSelected = true;
  q.options.forEach(opt => {
    const isSelected = selected.some(sel => {
      if (opt.type === "text") return sel.textContent === opt.text;
      if (opt.type === "image") return sel.querySelector("img")?.src.includes(opt.src);
    });
    if (opt.correct && !isSelected) correctSelected = false;
    if (!opt.correct && isSelected) correctSelected = false;
  });

  if (correctSelected) {
    feedbackEl.textContent = "🎉 Correto!";
    feedbackEl.className = "correct";
    score += 10;
    level++;
    playSound("correct");
  } else {
    feedbackEl.textContent = "❌ Errado!";
    feedbackEl.className = "wrong";
    score -= 5;
    lives--;
    playSound("wrong");
    if (lives <= 0) {
      feedbackEl.textContent = "💀 Game Over!";
      submitBtn.disabled = true;
      playSound("gameover");
      stopBackgroundMusic();
      return;
    }
  }

  scoreEl.textContent = "⭐ Pontuação: " + score;
  livesEl.textContent = "❤️ Vidas: " + lives;
  levelEl.textContent = "🚀 Fase: " + level;

  currentQuestion++;
  if (currentQuestion < questions.length) {
    setTimeout(loadQuestion, 1500);
  } else {
    feedbackEl.textContent += " 🏆 Fim do jogo!";
    submitBtn.disabled = true;
    playSound("win");
    stopBackgroundMusic();
  }
}

// Reiniciar jogo
function restartGame() {
  score = 0;
  lives = 3;
  level = 1;
  scoreEl.textContent = "⭐ Pontuação: " + score;
  livesEl.textContent = "❤️ Vidas: " + lives;
  levelEl.textContent = "🚀 Fase: " + level;
  feedbackEl.textContent = "";
  submitBtn.disabled = false;
  loadQuestions();
  startBackgroundMusic();
}

// Eventos dos botões
submitBtn.addEventListener("click", checkAnswer);
restartBtn.addEventListener("click", restartGame);

// Troca de matéria
subjectSelect.addEventListener("change", e => {
  subject = e.target.value;
  restartGame();
});

// Mensagem inicial
feedbackEl.textContent = "📚 Selecione a matéria para começar!";
