// Состояние игры
let secretNumber = "";
let attempts = 0;
let history = [];
let gameFinished = false;

// Элементы страницы
const guessInput = document.querySelector("#guessInput");
const checkButton = document.querySelector("#checkButton");
const newGameButton = document.querySelector("#newGameButton");
const errorMessage = document.querySelector("#errorMessage");
const resultMessage = document.querySelector("#resultMessage");

// Генерирует четырёхзначное число с неповторяющимися цифрами.
function generateSecretNumber() {
    const digits = [];

    while (digits.length < 4) {
        const digit = Math.floor(Math.random() * 10).toString();

        if (digits.includes(digit)) {
            continue;
        }

        if (digits.length === 0 && digit === "0") {
            continue;
        }

        digits.push(digit);
    }

    return digits.join("");
}

// Проверяет корректность числа.
function validateNumber(value) {
    if (!/^\d{4}$/.test(value)) {
        return "Введите ровно 4 цифры без букв и символов.";
    }

    if (new Set(value).size !== 4) {
        return "Все 4 цифры должны быть разными.";
    }

    return "";
}

// Считает быков и коров.
function countBullsAndCows(secret, guess) {
    let bulls = 0;
    let cows = 0;

    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === secret[i]) {
            bulls++;
        } else if (secret.includes(guess[i])) {
            cows++;
        }
    }

    return { bulls, cows };
}

// Рендерит историю из массива.
// Новая попытка добавляется в начало массива, поэтому она отображается сверху.
function render() {
    const historyList = document.querySelector("#historyList");
    const emptyHistory = document.querySelector("#emptyHistory");
    const attemptsCount = document.querySelector("#attemptsCount");

    attemptsCount.textContent = attempts;
    historyList.innerHTML = "";

    if (history.length === 0) {
        emptyHistory.style.display = "block";
        return;
    }

    emptyHistory.style.display = "none";

    history.forEach((item) => {
        const li = document.createElement("li");
        li.textContent =
            `${item.guess} → ${item.bulls} бык${getBullsEnding(item.bulls)}, ` +
            `${item.cows} коров${getCowsEnding(item.cows)}`;
        historyList.appendChild(li);
    });
}

// Окончания слов для красивого вывода.
function getBullsEnding(number) {
    if (number === 1) return "";
    if (number >= 2 && number <= 4) return "а";
    return "ов";
}

function getCowsEnding(number) {
    if (number === 1) return "а";
    if (number >= 2 && number <= 4) return "ы";
    return "";
}

function getAttemptsEnding(number) {
    if (number % 100 >= 11 && number % 100 <= 14) return "попыток";
    const lastDigit = number % 10;
    if (lastDigit === 1) return "попытку";
    if (lastDigit >= 2 && lastDigit <= 4) return "попытки";
    return "попыток";
}

// Сбрасывает состояние и начинает новую игру.
function startNewGame() {
    secretNumber = generateSecretNumber();
    attempts = 0;
    history = [];
    gameFinished = false;

    errorMessage.textContent = "";
    resultMessage.textContent = "";
    guessInput.value = "";
    guessInput.disabled = false;
    checkButton.disabled = false;

    render();
    guessInput.focus();

    console.log("Новое загаданное число:", secretNumber);
}

// Проверяет попытку.
function checkGuess() {
    if (gameFinished) {
        return;
    }

    const guess = guessInput.value.trim();

    errorMessage.textContent = "";
    resultMessage.textContent = "";

    const validationError = validateNumber(guess);

    if (validationError) {
        errorMessage.textContent = validationError;
        return;
    }

    const result = countBullsAndCows(secretNumber, guess);

    attempts++;

    history.unshift({
        id: Date.now(),
        guess,
        bulls: result.bulls,
        cows: result.cows
    });

    render();

    if (result.bulls === 4) {
        gameFinished = true;
        resultMessage.textContent =
            `Победа! Угадано за ${attempts} ${getAttemptsEnding(attempts)}.`;

        guessInput.disabled = true;
        checkButton.disabled = true;
        return;
    }

    guessInput.value = "";
    guessInput.focus();
}

// События.
checkButton.addEventListener("click", checkGuess);
newGameButton.addEventListener("click", startNewGame);

guessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        checkGuess();
    }
});

// Запуск игры при загрузке.
startNewGame();