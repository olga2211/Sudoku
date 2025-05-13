// utils/solver.js

// Check if a number can be placed at grid[row][col]
export function isValid(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) {
      return false;
    }
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[startRow + i][startCol + j] === num) {
        return false;
      }
    }
  }

  return true;
}

// Solve the Sudoku board using backtracking
export function solveSudoku(grid) {
  const findEmpty = () => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) return [row, col];
      }
    }
    return null;
  };

  const emptySpot = findEmpty();
  if (!emptySpot) return true; // Solved

  const [row, col] = emptySpot;

  for (let num = 1; num <= 9; num++) {
    if (isValid(grid, row, col, num)) {
      grid[row][col] = num;

      if (solveSudoku(grid)) return true;

      grid[row][col] = 0; // Backtrack
    }
  }

  return false; // No solution
}

// Clone and solve (to avoid mutating original)
export function getSolvedBoard(board) {
  const cloned = board.map(row => [...row]);
  const success = solveSudoku(cloned);
  return success ? cloned : null;
}
