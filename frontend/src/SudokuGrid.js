import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Box, Snackbar, Alert } from "@mui/material";
import "./SudokuGrid.css";
import { getSolvedBoard } from './solver.js';
import { saveGame, getGame } from './game/gameService';


function generateFullSudoku() {
  console.log('Starting generateFullSudoku...');
  const grid = [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9]
  ];
  console.log('Generated full grid:', grid);
  return grid;
}

function generateSudokuPuzzle(difficulty = "easy") {
  console.log('Starting generateSudokuPuzzle with difficulty:', difficulty);
  const fullGrid = generateFullSudoku();
  let clues;

  switch (difficulty) {
    case "medium":
      clues = 40;
      break;
    case "hard":
      clues = 30;
      break;
    default: // easy
      clues = 50;
      break;
  }
  console.log('Number of clues to keep:', clues);

  const puzzle = fullGrid.map(row => [...row]);
  const totalCells = 81;
  const cellsToRemove = totalCells - clues;
  
  console.log('Creating positions array...');
  // Create array of all positions and shuffle it
  const positions = [];
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      positions.push([i, j]);
    }
  }
  console.log('Generated positions:', positions);

  console.log('Shuffling positions...');
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  console.log('Shuffled positions:', positions);

  // Remove numbers based on difficulty
  console.log('Removing numbers from puzzle...');
  for (let i = 0; i < cellsToRemove; i++) {
    const [row, col] = positions[i];
    puzzle[row][col] = 0;
  }

  console.log('Final puzzle generated:', puzzle);
  return puzzle;
}






export default function SudokuGrid() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  // Generate initial puzzle on mount
  const initialGame = useMemo(() => generateSudokuPuzzle("easy"), []);
  
  const [initialPuzzle, setInitialPuzzle] = useState(initialGame);
  const [grid, setGrid] = useState(initialGame.map(row => [...row]));
  const [currentGameId, setCurrentGameId] = useState(gameId || null);
  const [difficulty, setDifficulty] = useState("easy");
  const [showDifficultyOptions, setShowDifficultyOptions] = useState(false);
  const [selected, setSelected] = useState({ row: null, col: null });
  const [pencilMode, setPencilMode] = useState(false);
  const [notes, setNotes] = useState(() => 
    Array(9).fill().map(() => Array(9).fill().map(() => new Set()))
  );
  const [errorCells, setErrorCells] = useState([]);
  const [history, setHistory] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const inputRefs = useRef([...Array(9)].map(() => Array(9).fill(null)));
  const [bestTime, setBestTime] = useState(() => {
    const stored = localStorage.getItem("sudoku-best-time");
    return stored ? parseInt(stored) : null;
  });

  useEffect(() => {
    if (!gameId) return;

    const loadGame = async () => {
      try {
        const savedGame = await getGame(gameId);
        setGrid(savedGame.board_state);
        setInitialPuzzle(savedGame.board_state.map(row => 
          row.map(cell => cell === 0 ? 0 : cell)
        ));
        if (savedGame.elapsed_time) {
          setSecondsElapsed(savedGame.elapsed_time);
        }
        setGameStarted(true);
      } catch (err) {
        console.error('Error loading game:', err);
        setSnackbar({
          open: true,
          message: 'Failed to load game',
          severity: 'error'
        });
        navigate('/games');
      }
    };

    loadGame();
  }, [gameId, navigate]);

  // 1. Check for mistakes in row/col/box
  const checkForMistakes = (row, col, num) => {
    const rowHasNumber = grid[row].some((val, idx) => idx !== col && val === num);
    const colHasNumber = grid.some((r, idx) => idx !== row && r[col] === num);

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        if ((r !== row || c !== col) && grid[r][c] === num) {
          return true;
        }
      }
    }

    return rowHasNumber || colHasNumber;
  };

  // 2. Check if the grid is complete and valid
  const isComplete = (grid) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const value = grid[r][c];
        if (value === 0 || checkForMistakes(r, c, value)) {
          return false;
        }
      }
    }
    return true;
  };






  const isFixed = (row, col) => initialPuzzle[row][col] !== 0;

  const saveToHistory = () => {
    setHistory(prev => [
      ...prev,
      {
        grid: grid.map(row => [...row]),
        notes: notes.map(row => row.map(set => new Set(set))),
        errorCells: [...errorCells],
      }
    ]);
    setRedoStack([]); // clear redo stack on new action
  };

  const handleCellClick = (row, col) => {
    if (!isFixed(row, col)) {
      setSelected({ row, col });
    }
  };

  const hasConflict = (row, col, num) => {
    const inRow = grid[row].includes(num);
    const inCol = grid.some(r => r[col] === num);
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        if (grid[r][c] === num) return true;
      }
    }

    return inRow || inCol;
  };

  const handleNumberInput = (num) => {
    if (!gameStarted) setGameStarted(true);

    const { row, col } = selected;
    if (row === null || col === null || isFixed(row, col)) return;

    saveToHistory();

    if (pencilMode) {
      setNotes(prev => {
        const updated = prev.map(r => r.map(s => new Set(s)));
        if (updated[row][col].has(num)) {
          updated[row][col].delete(num);
        } else {
          updated[row][col].add(num);
        }
        return updated;
      });
    } else {
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = num;
      setGrid(newGrid);

// Check for completion
if (isComplete(newGrid)) {
  if (bestTime === null || secondsElapsed < bestTime) {
    setBestTime(secondsElapsed);
    localStorage.setItem("sudoku-best-time", secondsElapsed);
    setSnackbar({
      open: true,
      message: "🎉 New Best Time! Puzzle Solved!",
      severity: 'success'
    });
  } else {
    setSnackbar({
      open: true,
      message: "✅ Puzzle Solved!",
      severity: 'success'
    });
  }
}


      setNotes(prev => {
        const updated = prev.map(r => r.map(s => new Set(s)));
        updated[row][col].clear();
        return updated;
      });

      if (hasConflict(row, col, num)) {
        setErrorCells(prev => [...prev, { row, col }]);
      } else {
        setErrorCells(prev =>
          prev.filter(cell => !(cell.row === row && cell.col === col))
        );
      }
    }
  };

  const restartGame = () => {
    setGrid(initialPuzzle.map(row => [...row]));
    setSelected({ row: null, col: null });
    setNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set())));
    setErrorCells([]);
    setUndoStack([]);
    setRedoStack([]);
    setSecondsElapsed(0);
    setGameStarted(false);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const prev = history[history.length - 1];
    const currentState = {
      grid: grid.map(r => [...r]),
      notes: notes.map(r => r.map(s => new Set(s))),
      errorCells: [...errorCells],
    };
    
    setUndoStack(prev => [...prev, currentState]);
    setGrid(prev.grid);
    setNotes(prev.notes);
    setErrorCells(prev.errorCells);
    setHistory(hist => hist.slice(0, -1));
    setRedoStack([]);
  };

  const handleRedo = () => {
    if (undoStack.length === 0) return;
    
    const next = undoStack[undoStack.length - 1];
    const currentState = {
      grid: grid.map(r => [...r]),
      notes: notes.map(r => r.map(s => new Set(s))),
      errorCells: [...errorCells],
    };
    
    setHistory(hist => [...hist, currentState]);
    setGrid(next.grid);
    setNotes(next.notes);
    setErrorCells(next.errorCells);
    setUndoStack(stack => stack.slice(0, -1));
  };

  const handleKeyDown = (e) => {
  const { row, col } = selected;

  // Undo: Ctrl+Z or Cmd+Z
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    if (e.shiftKey) {
      handleRedo(); // Ctrl+Shift+Z or Cmd+Shift+Z
    } else {
      handleUndo(); // Ctrl+Z or Cmd+Z
    }
    return;
  }

  // Redo: Ctrl+Y or Cmd+Y
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
    e.preventDefault();
    handleRedo();
    return;
  }

  if (row === null || col === null) return;

  let newRow = row;
  let newCol = col;

  switch (e.key) {
    case "ArrowUp": newRow = (row + 8) % 9; break;
    case "ArrowDown": newRow = (row + 1) % 9; break;
    case "ArrowLeft": newCol = (col + 8) % 9; break;
    case "ArrowRight": newCol = (col + 1) % 9; break;
    case "Backspace":
    case "Delete":
      if (!isFixed(row, col)) {
        saveToHistory();
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = 0;
        setGrid(newGrid);
        setNotes(prev => {
          const updated = prev.map(r => r.map(s => new Set(s)));
          updated[row][col].clear();
          return updated;
        });
        setErrorCells(prev =>
          prev.filter(cell => !(cell.row === row && cell.col === col))
        );
      }
      return;
    default:
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) handleNumberInput(num);
      return;
  }

  setSelected({ row: newRow, col: newCol });
  inputRefs.current[newRow][newCol]?.focus();
};


  useEffect(() => {
  let timer;
  if (gameStarted) {
    timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
  }
  return () => clearInterval(timer);
}, [gameStarted]);

useEffect(() => {
  const state = {
    grid,
    initialPuzzle,
    notes: notes.map(row => row.map(set => [...set])),
    secondsElapsed,
    difficulty,
  };
  localStorage.setItem("sudoku-save", JSON.stringify(state));
}, [grid, notes, secondsElapsed, initialPuzzle, difficulty]);

useEffect(() => {
  const saved = localStorage.getItem("sudoku-save");
  if (saved) {
    try {
      const {
        grid: savedGrid,
        initialPuzzle: savedInitial,
        notes: savedNotes,
        secondsElapsed: savedTime,
        difficulty: savedDifficulty,
      } = JSON.parse(saved);

      setGrid(savedGrid);
      setInitialPuzzle(savedInitial);
      setNotes(savedNotes.map(row => row.map(arr => new Set(arr))));
      setSecondsElapsed(savedTime);
      setDifficulty(savedDifficulty);
      setGameStarted(true);
    } catch (e) {
      console.error("Failed to load saved game:", e);
    }
  }
}, []);


const handleSolve = () => {
  const solved = getSolvedBoard(grid);
  if (solved) {
    setGrid(solved);
  } else {
    alert("This puzzle has no valid solution!");
  }
};

const handleSave = async () => {
  if (errorCells.length > 0) {
    setSnackbar({
      open: true,
      message: 'Cannot save game with errors. Please fix the highlighted cells first.',
      severity: 'error'
    });
    return;
  }

  try {
    const response = await saveGame(grid, isComplete(grid), currentGameId, secondsElapsed);
    setCurrentGameId(response.game_id);
    setSnackbar({
      open: true,
      message: 'Game saved successfully',
      severity: 'success'
    });
  } catch (err) {
    setSnackbar({
      open: true,
      message: 'Failed to save game',
      severity: 'error'
    });
  }
};

const handleBackToGames = () => {
  navigate('/');
};

  if (!grid || !initialPuzzle) {
    console.log('Rendering loading state. Grid:', grid, 'InitialPuzzle:', initialPuzzle);
    return <div>Loading...</div>;
  }

  console.log('Rendering full grid component...');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button variant="outlined" onClick={handleBackToGames}>
          Back to Games
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save Game
        </Button>
      </Box>

      <div className="sudoku-wrapper" onKeyDown={handleKeyDown} tabIndex={0}>
        <div className="sudoku-toolbar">
          <div className="timer">
            <p>Time: {secondsElapsed}s</p>
            {bestTime !== null && <p>Best: {bestTime}s</p>}
          </div>

          <div className="new-puzzle-wrapper">
            <button onClick={() => setShowDifficultyOptions(prev => !prev)}>
              New Puzzle
            </button>

            {showDifficultyOptions && (
              <div className="difficulty-options">
                {["easy", "medium", "hard"].map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setDifficulty(level);
                      setShowDifficultyOptions(false);
                      const newPuzzle = generateSudokuPuzzle(level);
                      setInitialPuzzle(newPuzzle);
                      setGrid(newPuzzle.map(row => [...row]));
                      setSelected({ row: null, col: null });
                      setNotes(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));
                      setErrorCells([]);
                      setUndoStack([]);
                      setRedoStack([]);
                      setHistory([]);
                      setSecondsElapsed(0);
                      setGameStarted(false);
                    }}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={restartGame}>Restart</button>
          <button className="solve-button" onClick={handleSolve}>
            Solve
          </button>
        </div>

        <div className="sudoku-grid">
          {grid.map((row, rIdx) => (
            <div className="sudoku-row" key={rIdx}>
              {row.map((cell, cIdx) => {
                const cellNotes = notes[rIdx][cIdx];
                const isError = errorCells.some(e => e.row === rIdx && e.col === cIdx);

                return (
                  <div
                    key={cIdx}
                    ref={el => (inputRefs.current[rIdx][cIdx] = el)}
                    className={`sudoku-cell ${isFixed(rIdx, cIdx) ? "fixed" : ""} ${selected.row === rIdx && selected.col === cIdx ? "selected" : ""} ${isError ? "error" : ""}`}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    tabIndex={-1}
                  >
                    {cell !== 0 ? (
                      cell
                    ) : (
                      <div className="pencil-notes">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
                          const hasMistake = cellNotes.has(n) && hasConflict(rIdx, cIdx, n);
                          return (
                            <span
                              key={n}
                              className={cellNotes.has(n) ? (hasMistake ? "conflicting-note" : "pencil-note") : ""}
                            >
                              {cellNotes.has(n) ? n : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="number-buttons">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handleNumberInput(num)}>
              {num}
            </button>
          ))}
        </div>

        <button className="delete-button" onClick={() => handleNumberInput(0)}>Delete</button>
        <button className="pencil-toggle" onClick={() => setPencilMode(!pencilMode)}>
          {pencilMode ? "Pencil Mode: ON" : "Pencil Mode: OFF"}
        </button>
        <button onClick={handleUndo} disabled={history.length === 0}>Undo</button>
        <button onClick={handleRedo} disabled={undoStack.length === 0}>Redo</button>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
