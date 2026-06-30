const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/wordle.json');
const README_FILE = path.join(__dirname, '../README.md');

const WORDS = [
  'react', 'coder', 'stack', 'swift', 'nodes', 'bytes', 'logic', 'debug', 'codes',
  'merge', 'clone', 'array', 'query', 'cloud', 'build', 'write', 'learn', 'cyber',
  'input', 'print', 'while', 'const', 'class', 'super', 'fetch', 'await', 'async'
];

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading state file:', err);
  }
  return {
    secretWord: 'react',
    guesses: [],
    gameStatus: 'PLAYING',
    lastGuessBy: 'No guesses yet.',
    stats: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, currentStreak: 0, maxStreak: 0 }
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Wordle evaluation logic
function evaluateGuess(guess, target) {
  const result = Array(5).fill('⬛');
  const targetLetters = target.split('');
  const guessLetters = guess.split('');

  // First pass: correct positions (green)
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = '🟩';
      targetLetters[i] = null;
      guessLetters[i] = null;
    }
  }

  // Second pass: wrong positions (yellow)
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] !== null) {
      const idx = targetLetters.indexOf(guessLetters[i]);
      if (idx !== -1) {
        result[i] = '🟨';
        targetLetters[idx] = null;
      }
    }
  }
  return result;
}

// Helper to render alphabet tracker
function getAlphabetStatus(guesses, target) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const status = {}; // char -> '🟩' | '🟨' | '⬛' | 'unused'

  alphabet.forEach(c => {
    status[c] = 'unused';
  });

  guesses.forEach(guess => {
    const evaluation = evaluateGuess(guess, target);
    for (let i = 0; i < 5; i++) {
      const char = guess[i];
      const evalEmoji = evaluation[i];

      if (evalEmoji === '🟩') {
        status[char] = '🟩';
      } else if (evalEmoji === '🟨') {
        if (status[char] !== '🟩') {
          status[char] = '🟨';
        }
      } else if (evalEmoji === '⬛') {
        if (status[char] !== '🟩' && status[char] !== '🟨') {
          status[char] = '⬛';
        }
      }
    }
  });

  return status;
}

function renderWordleMarkdown(state) {
  const repo = process.env.GITHUB_REPOSITORY || 'bachdangtung/bachdangtung';
  const player = process.env.GITHUB_ACTOR || 'Player';
  
  const guessLink = `https://github.com/${repo}/issues/new?title=wordle%3A+guess+%3CYOUR_GUESS_HERE%3E&body=Replace+%3CYOUR_GUESS_HERE%3E+with+a+5-letter+word+in+the+issue+title+and+click+%22Submit+new+issue%22%21`;
  const resetLink = `https://github.com/${repo}/issues/new?title=wordle%3A+reset&body=Click+%22Submit+new+issue%22+to+reset+the+game%21`;

  // Grid rendering
  let gridMd = '';
  for (let i = 0; i < 6; i++) {
    if (i < state.guesses.length) {
      const guess = state.guesses[i];
      const evaluation = evaluateGuess(guess, state.secretWord);
      // Format row as: | 🟩 | ⬛ | 🟨 | 🟩 | ⬛ |
      const guessLetters = guess.toUpperCase().split('');
      const rowString = evaluation.map((emoji, idx) => `${emoji} ${guessLetters[idx]}`).join(' &nbsp; ');
      gridMd += `<p align="center"><b>Attempt ${i + 1}:</b> &nbsp; ${rowString}</p>\n`;
    } else {
      // Empty row
      gridMd += `<p align="center"><b>Attempt ${i + 1}:</b> &nbsp; ⬜ &nbsp;&nbsp;&nbsp; ⬜ &nbsp;&nbsp;&nbsp; ⬜ &nbsp;&nbsp;&nbsp; ⬜ &nbsp;&nbsp;&nbsp; ⬜</p>\n`;
    }
  }

  // Alphabet status tracking
  const alphabetStatus = getAlphabetStatus(state.guesses, state.secretWord);
  const correctLetters = [];
  const presentLetters = [];
  const absentLetters = [];

  Object.keys(alphabetStatus).forEach(char => {
    const s = alphabetStatus[char];
    const upper = char.toUpperCase();
    if (s === '🟩') correctLetters.push(upper);
    else if (s === '🟨') presentLetters.push(upper);
    else if (s === '⬛') absentLetters.push(upper);
  });

  const letterStatusSection = `
<p align="center">
  <b>Letter Status:</b><br />
  🟩 Correct: ${correctLetters.length > 0 ? `<b>${correctLetters.join(', ')}</b>` : 'None'}<br />
  🟨 Present: ${presentLetters.length > 0 ? `<b>${presentLetters.join(', ')}</b>` : 'None'}<br />
  ⬛ Absent: ${absentLetters.length > 0 ? `<b>${absentLetters.join(', ')}</b>` : 'None'}
</p>
`;

  let statusMsg = "";
  if (state.gameStatus === "WON") {
    statusMsg = `<p align="center">🎉 **You won!** The secret word was **${state.secretWord.toUpperCase()}**. Congratulations, @${player}!</p>`;
  } else if (state.gameStatus === "LOST") {
    statusMsg = `<p align="center">😢 **Game Over!** You ran out of attempts. The word was **${state.secretWord.toUpperCase()}**.</p>`;
  } else {
    statusMsg = `<p align="center">🎮 **Play Wordle!** Try to guess the 5-letter programming word. <a href="${guessLink}"><b>Make a Guess (Click here)</b></a></p>`;
  }

  const markdown = `
### 🎮 Profile Wordle

${statusMsg}

${gridMd}
${letterStatusSection}

<p align="center">
  <b>Last Action:</b> ${state.lastGuessBy}<br />
  🏆 <b>Streak:</b> ${state.stats.currentStreak} wins (Max: ${state.stats.maxStreak}) &nbsp;|&nbsp; ⚔️ <b>Total Games:</b> ${state.stats.gamesPlayed} (Won: ${state.stats.gamesWon})
</p>

<p align="center">
  <a href="${resetLink}"><b>🔄 Reset / Start New Game</b></a>
</p>
`;
  return markdown;
}

function updateReadme(wordleMarkdown) {
  if (!fs.existsSync(README_FILE)) {
    console.error('README.md not found');
    return;
  }
  let readme = fs.readFileSync(README_FILE, 'utf8');
  const startTag = '<!-- WORDLE:START -->';
  const endTag = '<!-- WORDLE:END -->';
  
  const startIndex = readme.indexOf(startTag);
  const endIndex = readme.indexOf(endTag);

  if (startIndex === -1 || endIndex === -1) {
    console.error('Wordle tags not found in README.md');
    return;
  }

  const before = readme.substring(0, startIndex + startTag.length);
  const after = readme.substring(endIndex);
  
  const updatedReadme = before + '\n' + wordleMarkdown.trim() + '\n' + after;
  fs.writeFileSync(README_FILE, updatedReadme, 'utf8');
  console.log('README.md updated successfully with Wordle board.');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] ? args[0].toLowerCase() : '';
  const actor = process.env.GITHUB_ACTOR || 'Player';

  let state = loadState();

  if (command === 'reset') {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    state.secretWord = randomWord;
    state.guesses = [];
    state.gameStatus = 'PLAYING';
    state.lastGuessBy = `@${actor} started a new game.`;
    saveState(state);
    const md = renderWordleMarkdown(state);
    updateReadme(md);
    return;
  }

  if (command === 'guess') {
    let guessWord = args[1] ? args[1].toLowerCase().trim() : '';
    
    // Sanitize guessWord
    guessWord = guessWord.replace(/[^a-z]/g, '');

    if (guessWord.length !== 5) {
      console.log(`Invalid guess length: "${guessWord}". Word must be exactly 5 letters.`);
      return;
    }

    // Auto reset if game is already completed
    if (state.gameStatus !== 'PLAYING') {
      const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
      state.secretWord = randomWord;
      state.guesses = [];
      state.gameStatus = 'PLAYING';
    }

    // Double check that we don't exceed 6 guesses
    if (state.guesses.length >= 6) {
      console.log('Already used 6 guesses.');
      return;
    }

    state.guesses.push(guessWord);
    
    if (guessWord === state.secretWord) {
      state.gameStatus = 'WON';
      state.stats.gamesPlayed++;
      state.stats.gamesWon++;
      state.stats.currentStreak++;
      if (state.stats.currentStreak > state.stats.maxStreak) {
        state.stats.maxStreak = state.stats.currentStreak;
      }
      state.lastGuessBy = `@${actor} guessed **${guessWord.toUpperCase()}** and WON! 🎉`;
    } else if (state.guesses.length >= 6) {
      state.gameStatus = 'LOST';
      state.stats.gamesPlayed++;
      state.stats.gamesLost++;
      state.stats.currentStreak = 0;
      state.lastGuessBy = `@${actor} guessed **${guessWord.toUpperCase()}**. Game Over! The word was **${state.secretWord.toUpperCase()}**. 😢`;
    } else {
      state.lastGuessBy = `@${actor} guessed **${guessWord.toUpperCase()}**.`;
    }

    saveState(state);
    const md = renderWordleMarkdown(state);
    updateReadme(md);
  } else {
    // Render current state
    const md = renderWordleMarkdown(state);
    updateReadme(md);
  }
}

main();
