import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Timer, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SudokuGame({ onComplete }) {
    const [grid, setGrid] = useState([]);
    const [initialGrid, setInitialGrid] = useState([]);
    const [solution, setSolution] = useState([]);
    const [selectedCell, setSelectedCell] = useState(null);
    const [isWon, setIsWon] = useState(false);
    const [timer, setTimer] = useState(0);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        generateGame();
        const interval = setInterval(() => setTimer(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const generateGame = () => {
        const sol = generateFullGrid();
        setSolution(sol);

        // Very Easy: hide only 10 cells
        const gameGrid = sol.map(row => [...row]);
        let hidden = 0;
        while (hidden < 10) {
            const r = Math.floor(Math.random() * 9);
            const c = Math.floor(Math.random() * 9);
            if (gameGrid[r][c] !== 0) {
                gameGrid[r][c] = 0;
                hidden++;
            }
        }
        setGrid(gameGrid);
        setInitialGrid(gameGrid.map(row => [...row]));
        setIsWon(false);
    };

    const generateFullGrid = () => {
        const full = Array(9).fill().map(() => Array(9).fill(0));
        const solve = (g) => {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (g[r][c] === 0) {
                        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                        for (let n of nums) {
                            if (isValid(g, r, c, n)) {
                                g[r][c] = n;
                                if (solve(g)) return true;
                                g[r][c] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        };
        solve(full);
        return full;
    };

    const isValid = (g, r, c, n) => {
        for (let i = 0; i < 9; i++) {
            if (g[r][i] === n || g[i][c] === n) return false;
        }
        const startR = Math.floor(r / 3) * 3;
        const startC = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (g[startR + i][startC + j] === n) return false;
            }
        }
        return true;
    };

    const handleNumberInput = (num) => {
        if (!selectedCell || isWon) return;
        const [r, c] = selectedCell;
        if (initialGrid[r][c] !== 0) return;

        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = num;
        setGrid(newGrid);

        // Check for win
        const allFilled = newGrid.every(row => row.every(cell => cell !== 0));
        if (allFilled) {
            const isCorrect = newGrid.every((row, rIdx) =>
                row.every((cell, cIdx) => cell === solution[rIdx][cIdx])
            );
            if (isCorrect) {
                setIsWon(true);
                setTimeout(() => onComplete?.(timer), 1500);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-sm mx-auto p-4">
            <div className="text-center space-y-2">
                <h3 className="text-lg font-bold flex items-center justify-center gap-2 text-indigo-400">
                    <Timer size={20} />
                    <span>{formatTime(timer)}</span>
                </h3>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                    {isWon ? 'Победа! Загружаем вопросы...' : 'Быстрое Судоку: заполни 10 цифр'}
                </p>
            </div>

            {/* Sudoku Grid */}
            <div className="grid grid-cols-9 bg-zinc-900 border-2 border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                {grid.map((row, r) => (
                    row.map((cell, c) => {
                        const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
                        const isOriginal = initialGrid[r][c] !== 0;
                        const isBorderRight = (c + 1) % 3 === 0 && c !== 8;
                        const isBorderBottom = (r + 1) % 3 === 0 && r !== 8;

                        return (
                            <div
                                key={`${r}-${c}`}
                                onClick={() => setSelectedCell([r, c])}
                                className={`
                                    w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-sm md:text-base cursor-pointer transition-all
                                    ${isSelected ? 'bg-indigo-500 text-white scale-110 z-10 shadow-lg' : 'bg-transparent text-zinc-300 hover:bg-zinc-800'}
                                    ${isOriginal ? 'font-bold text-zinc-100' : 'text-indigo-400'}
                                    ${isBorderRight ? 'border-r-2 border-zinc-700' : 'border-r border-zinc-800/50'}
                                    ${isBorderBottom ? 'border-b-2 border-zinc-700' : 'border-b border-zinc-800/50'}
                                `}
                            >
                                {cell !== 0 ? cell : ''}
                            </div>
                        );
                    })
                ))}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-5 md:grid-cols-9 gap-2 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        onClick={() => handleNumberInput(num)}
                        className="py-3 md:py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-lg font-bold hover:bg-zinc-800 active:scale-95 transition-all text-zinc-100"
                    >
                        {num}
                    </button>
                ))}
            </div>

            {/* Tips */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-900/50 px-4 py-2 rounded-full">
                <AlertCircle size={12} />
                <span>Время прохождения учитывается в таблице лидеров</span>
            </div>

            <AnimatePresence>
                {isWon && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-emerald-400 font-bold"
                    >
                        <CheckCircle2 size={20} />
                        <span>Готово! Решено за {formatTime(timer)}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
