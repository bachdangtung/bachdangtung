const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/tictactoe.json');
const README_FILE = path.join(__dirname, '../README.md');

const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

// Helper to load state
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading state file:', err);
  }
  return {
    board: [" ", " ", " ", " ", " ", " ", " ", " ", " "],
    turn: "X",
    winner: null,
    lastMoveBy: "No moves yet",
    stats: { gamesPlayed: 0, userWins: 0, botWins: 0, draws: 0 }
  };
}

// Helper to save state
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Check for winner
function checkWinner(board) {
  for (const combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] !== " " && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // "X" or "O"
    }
  }
  if (!board.includes(" ")) {
    return "draw";
  }
  return null;
}

// Simple AI logic for Bot (O)
function getBotMove(board) {
  // 1. Try to win
  for (const combo of WIN_COMBOS) {
    const values = combo.map(i => board[i]);
    const oCount = values.filter(v => v === "O").length;
    const emptyIndex = combo.find(i => board[i] === " ");
    if (oCount === 2 && emptyIndex !== undefined) {
      return emptyIndex;
    }
  }

  // 2. Try to block opponent (X)
  for (const combo of WIN_COMBOS) {
    const values = combo.map(i => board[i]);
    const xCount = values.filter(v => v === "X").length;
    const emptyIndex = combo.find(i => board[i] === " ");
    if (xCount === 2 && emptyIndex !== undefined) {
      return emptyIndex;
    }
  }

  // 3. Take center if available
  if (board[4] === " ") {
    return 4;
  }

  // 4. Take corners if available
  const corners = [0, 2, 6, 8].filter(i => board[i] === " ");
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // 5. Take any remaining empty cell
  const empties = board.map((v, i) => v === " " ? i : null).filter(v => v !== null);
  if (empties.length > 0) {
    return empties[Math.floor(Math.random() * empties.length)];
  }

  return -1;
}

// Render Markdown Board
function renderBoardMarkdown(state) {
  const repo = process.env.GITHUB_REPOSITORY || 'bachdangtung/bachdangtung';
  const player = process.env.GITHUB_ACTOR || 'Player';
  
  const playLink = (idx) => `https://github.com/${repo}/issues/new?title=tictactoe%3A+play+${idx}&body=Just+click+%22Submit+new+issue%22+to+make+your+move%21`;
  const resetLink = `https://github.com/${repo}/issues/new?title=tictactoe%3A+reset&body=Just+click+%22Submit+new+issue%22+to+reset+the+game%21`;

  const cell = (idx) => {
    const val = state.board[idx];
    if (val === "X") return "❌";
    if (val === "O") return "⭕";
    // If game is over, don't make empty cells clickable links (or make them link to a reset)
    if (state.winner) return "⬜";
    return `[⬜](${playLink(idx)})`;
  };

  let statusMsg = "";
  if (state.winner === "X") {
    statusMsg = `🎉 **You won!** Congratulations, @${player}!`;
  } else if (state.winner === "O") {
    statusMsg = `🤖 **Bot won!** Better luck next time, @${player}!`;
  } else if (state.winner === "draw") {
    statusMsg = `🤝 **It's a draw!** Well played, @${player}!`;
  } else {
    statusMsg = `🎮 **Your turn!** Click any ⬜ cell to place your ❌.`;
  }

  const markdown = `
### 🎮 Play Tic-Tac-Toe!

${statusMsg}

| | Column 1 | Column 2 | Column 3 |
| :---: | :---: | :---: | :---: |
| **Row 1** | ${cell(0)} | ${cell(1)} | ${cell(2)} |
| **Row 2** | ${cell(3)} | ${cell(4)} | ${cell(5)} |
| **Row 3** | ${cell(6)} | ${cell(7)} | ${cell(8)} |

**Last action:** ${state.lastMoveBy}

**🏆 Scores:**
- 👤 Users: **${state.stats.userWins}** wins
- 🤖 Bot: **${state.stats.botWins}** wins
- 🤝 Draws: **${state.stats.draws}**
- ⚔️ Total Games: **${state.stats.gamesPlayed}**

[🔄 Reset / Start New Game](${resetLink})
`;
  return markdown;
}

// Update README
function updateReadme(boardMarkdown) {
  if (!fs.existsSync(README_FILE)) {
    console.error('README.md not found');
    return;
  }
  let readme = fs.readFileSync(README_FILE, 'utf8');
  const startTag = '<!-- TICTACTOE:START -->';
  const endTag = '<!-- TICTACTOE:END -->';
  
  const startIndex = readme.indexOf(startTag);
  const endIndex = readme.indexOf(endTag);

  if (startIndex === -1 || endIndex === -1) {
    console.error('Tic-Tac-Toe tags not found in README.md');
    return;
  }

  const before = readme.substring(0, startIndex + startTag.length);
  const after = readme.substring(endIndex);
  
  const updatedReadme = before + '\n' + boardMarkdown.trim() + '\n' + after;
  fs.writeFileSync(README_FILE, updatedReadme, 'utf8');
  console.log('README.md updated successfully with new board state.');
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const command = args[0] ? args[0].toLowerCase() : '';
  const actor = process.env.GITHUB_ACTOR || 'Player';

  let state = loadState();

  if (command === 'reset') {
    state.board = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
    state.winner = null;
    state.turn = "X";
    state.lastMoveBy = `@${actor} reset the game.`;
    saveState(state);
    const md = renderBoardMarkdown(state);
    updateReadme(md);
    return;
  }

  if (command === 'play') {
    const cellIdx = parseInt(args[1], 10);
    if (isNaN(cellIdx) || cellIdx < 0 || cellIdx > 8) {
      console.error('Invalid cell index');
      return;
    }

    // If game is already won/drawn, reset the game first and play the move!
    if (state.winner !== null) {
      state.board = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
      state.winner = null;
      state.turn = "X";
    }

    // Check if cell is occupied
    if (state.board[cellIdx] !== " ") {
      console.log(`Cell ${cellIdx} is already occupied. Doing nothing.`);
      return;
    }

    // Player move
    state.board[cellIdx] = "X";
    let winner = checkWinner(state.board);

    if (winner) {
      state.winner = winner;
      state.stats.gamesPlayed++;
      if (winner === "X") {
        state.stats.userWins++;
        state.lastMoveBy = `@${actor} played cell ${cellIdx + 1} and won! 🎉`;
      } else {
        state.stats.draws++;
        state.lastMoveBy = `@${actor} played cell ${cellIdx + 1}. It's a draw! 🤝`;
      }
    } else {
      // Bot move
      const botMove = getBotMove(state.board);
      if (botMove !== -1) {
        state.board[botMove] = "O";
        winner = checkWinner(state.board);
        if (winner) {
          state.winner = winner;
          state.stats.gamesPlayed++;
          if (winner === "O") {
            state.stats.botWins++;
            state.lastMoveBy = `@${actor} played cell ${cellIdx + 1}. Bot responded at cell ${botMove + 1} and won! 🤖`;
          } else {
            state.stats.draws++;
            state.lastMoveBy = `@${actor} played cell ${cellIdx + 1}. Bot responded at cell ${botMove + 1}. It's a draw! 🤝`;
          }
        } else {
          state.lastMoveBy = `@${actor} played cell ${cellIdx + 1}. Bot responded at cell ${botMove + 1}.`;
        }
      } else {
        // No moves left for bot (should not happen normally since checkWinner would catch draw)
        state.winner = "draw";
        state.stats.gamesPlayed++;
        state.stats.draws++;
        state.lastMoveBy = `@${actor} played cell ${cellIdx + 1}. It's a draw! 🤝`;
      }
    }

    saveState(state);
    const md = renderBoardMarkdown(state);
    updateReadme(md);
  } else {
    // Just render board with current state (useful for local setup or validation)
    const md = renderBoardMarkdown(state);
    updateReadme(md);
  }
}

main();
