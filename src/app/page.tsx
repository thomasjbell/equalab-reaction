"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LightBulbIcon, ClockIcon } from "@heroicons/react/24/solid";

type GameState = "idle" | "countdown" | "waiting" | "reacting" | "result";

interface Result {
  time: number | null;
  jumpStart: boolean;
  timestamp: Date;
}

export default function ReactionsPage() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [activeLights, setActiveLights] = useState(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [jumpStart, setJumpStart] = useState(false);
  const [systemLatency, setSystemLatency] = useState<number>(0);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(true);

  const lightsOffTimeRef = useRef<number>(0);
  const gameActiveRef = useRef<boolean>(false);

  // Calibrate system latency on "use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LightBulbIcon, ClockIcon } from "@heroicons/react/24/solid";

type GameState = "idle" | "countdown" | "waiting" | "reacting" | "result";

interface Result {
  time: number | null;
  jumpStart: boolean;
  timestamp: Date;
}

export default function ReactionsPage() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [activeLights, setActiveLights] = useState(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [jumpStart, setJumpStart] = useState(false);
  const [systemLatency, setSystemLatency] = useState<number>(0);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(true);

  const lightsOffTimeRef = useRef<number>(0);
  const gameActiveRef = useRef<boolean>(false);

  // Calibrate system latency on mount
  useEffect(() => {
    const calibrate = async () => {
      const samples: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await new Promise(resolve => setTimeout(resolve, 0));
        const end = performance.now();
        samples.push(end - start);
      }
      
      // Use the median to avoid outliers
      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(samples.length / 2)];
      
      // Add a small buffer for render time
      const estimatedLatency = median + 8;
      setSystemLatency(estimatedLatency);
      setIsCalibrating(false);
    };
    
    calibrate();
  }, []);

  const startGame = () => {
    if (gameActiveRef.current) return;
    
    gameActiveRef.current = true;
    setGameState("countdown");
    setActiveLights(0);
    setReactionTime(null);
    setJumpStart(false);

    let lightCount = 0;
    
    const interval = setInterval(() => {
      lightCount++;
      setActiveLights(lightCount);

      if (lightCount === 5) {
        clearInterval(interval);
        setGameState("waiting");

        const randomDelay = 1000 + Math.random() * 4000;
        
        setTimeout(() => {
          setActiveLights(0);
          lightsOffTimeRef.current = performance.now();
          setGameState("reacting");
        }, randomDelay);
      }
    }, 1000);
  };

  const handleReaction = () => {
    if (gameState === "countdown" || gameState === "waiting") {
      gameActiveRef.current = false;
      setJumpStart(true);
      setGameState("result");
      setActiveLights(0);

      setResults((prev) => [
        { time: null, jumpStart: true, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    } else if (gameState === "reacting") {
      gameActiveRef.current = false;
      const rawReactionMs = performance.now() - lightsOffTimeRef.current;
      // Subtract system latency and ensure minimum of 0
      const calibratedReactionMs = Math.max(0, Math.round(rawReactionMs - systemLatency));
      setReactionTime(calibratedReactionMs);
      setGameState("result");

      setResults((prev) => [
        { time: calibratedReactionMs, jumpStart: false, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        
        if (gameState === "idle" || gameState === "result") {
          startGame();
        } else if (gameState === "countdown" || gameState === "waiting" || gameState === "reacting") {
          handleReaction();
        }
      }
    };

    const handleClick = () => {
      if (gameState === "idle" || gameState === "result") {
        startGame();
      } else if (gameState === "countdown" || gameState === "waiting" || gameState === "reacting") {
        handleReaction();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("click", handleClick);
    };
  }, [gameState]);

  const getHint = (time: number) => {
    if (time > 300) return "Focus on the lights. Try to anticipate the exact moment.";
    if (time > 250) return "Good! Try to maintain focus for faster reactions.";
    if (time > 200) return "Excellent reaction time!";
    return "Outstanding! Professional level reaction time!";
  };

  const averageTime = results
    .filter((r) => !r.jumpStart && r.time !== null)
    .reduce((acc, r, _, arr) => acc + (r.time || 0) / arr.length, 0);

  if (isCalibrating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Calibrating system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 text-transparent bg-clip-text">
                Reaction Trainer
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              F1-Style Lights Reaction Testing
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              System latency compensation: {systemLatency.toFixed(1)}ms
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Lights and Game Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Lights */}
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                
                {/* Lights Container */}
                <div className="flex justify-center items-center gap-6 mb-8 min-h-[100px]">
                  {[1, 2, 3, 4, 5].map((lightNum) => (
                    <div
                      key={lightNum}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: activeLights >= lightNum ? '#dc2626' : '#1f2937',
                        border: '4px solid',
                        borderColor: activeLights >= lightNum ? '#991b1b' : '#374151',
                        boxShadow: activeLights >= lightNum 
                          ? '0 0 30px rgba(220, 38, 38, 0.8), 0 0 60px rgba(220, 38, 38, 0.4)' 
                          : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  ))}
                </div>

                {/* Status Display */}
                <div className="text-center min-h-[120px] flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                    {gameState === "idle" && (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                          Ready to Start
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          Click anywhere or press SPACE
                        </p>
                      </motion.div>
                    )}

                    {gameState === "countdown" && (
                      <motion.div
                        key="countdown"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          Get Ready...
                        </p>
                      </motion.div>
                    )}

                    {gameState === "waiting" && (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                          Wait for it...
                        </p>
                      </motion.div>
                    )}

                    {gameState === "reacting" && (
                      <motion.div
                        key="reacting"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          GO!
                        </p>
                      </motion.div>
                    )}

                    {gameState === "result" && (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full"
                      >
                        {jumpStart ? (
                          <div>
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                              JUMP START!
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                              You reacted before the lights went out
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-5xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 text-transparent bg-clip-text mb-2">
                              {reactionTime}ms
                            </p>
                            {reactionTime && reactionTime > 250 && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                                💡 {getHint(reactionTime)}
                              </p>
                            )}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startGame();
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg"
                        >
                          Try Again
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <LightBulbIcon className="w-6 h-6 text-yellow-500" />
                  How to Play
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li>• Watch the five red lights illuminate one by one</li>
                  <li>• When all lights turn off, react as quickly as possible</li>
                  <li>• Click anywhere or press SPACE to react</li>
                  <li>• Reacting before the lights go out counts as a jump start</li>
                  <li>• Times are automatically calibrated for system latency</li>
                </ul>
              </div>
            </div>

            {/* Results Table */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ClockIcon className="w-6 h-6 text-cyan-600" />
                  Results
                </h3>

                {results.length > 0 && !isNaN(averageTime) && averageTime > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-200 dark:border-cyan-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Average Time
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 text-transparent bg-clip-text">
                      {Math.round(averageTime)}ms
                    </p>
                  </div>
                )}

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No attempts yet
                    </p>
                  ) : (
                    results.map((result, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 rounded-xl border ${
                          result.jumpStart
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                            : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Attempt {results.length - index}
                          </span>
                          <span
                            className={`text-lg font-bold ${
                              result.jumpStart
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {result.jumpStart ? "JUMP START" : `${result.time}ms`}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
  useEffect(() => {
    const calibrate = async () => {
      const samples: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await new Promise(resolve => setTimeout(resolve, 0));
        const end = performance.now();
        samples.push(end - start);
      }
      
      // Use the median to avoid outliers
      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(samples.length / 2)];
      
      // Add a small buffer for render time
      const estimatedLatency = median + 8;
      setSystemLatency(estimatedLatency);
      setIsCalibrating(false);
    };
    
    calibrate();
  }, []);

  const startGame = () => {
    if (gameActiveRef.current) return;
    
    gameActiveRef.current = true;
    setGameState("countdown");
    setActiveLights(0);
    setReactionTime(null);
    setJumpStart(false);

    let lightCount = 0;
    
    const interval = setInterval(() => {
      lightCount++;
      setActiveLights(lightCount);

      if (lightCount === 5) {
        clearInterval(interval);
        setGameState("waiting");

        const randomDelay = 1000 + Math.random() * 4000;
        
        setTimeout(() => {
          setActiveLights(0);
          lightsOffTimeRef.current = performance.now();
          setGameState("reacting");
        }, randomDelay);
      }
    }, 1000);
  };

  const handleReaction = () => {
    if (gameState === "countdown" || gameState === "waiting") {
      gameActiveRef.current = false;
      setJumpStart(true);
      setGameState("result");
      setActiveLights(0);

      setResults((prev) => [
        { time: null, jumpStart: true, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    } else if (gameState === "reacting") {
      gameActiveRef.current = false;
      const rawReactionMs = performance.now() - lightsOffTimeRef.current;
      // Subtract system latency and ensure minimum of 0
      const calibratedReactionMs = Math.max(0, Math.round(rawReactionMs - systemLatency));
      setReactionTime(calibratedReactionMs);
      setGameState("result");

      setResults((prev) => [
        { time: calibratedReactionMs, jumpStart: false, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        
        if (gameState === "idle" || gameState === "result") {
          startGame();
        } else if (gameState === "countdown" || gameState === "waiting" || gameState === "reacting") {
          handleReaction();
        }
      }
    };

    const handleClick = () => {
      if (gameState === "idle" || gameState === "result") {
        startGame();
      } else if (gameState === "countdown" || gameState === "waiting" || gameState === "reacting") {
        handleReaction();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("click", handleClick);
    };
  }, [gameState]);

  const getHint = (time: number) => {
    if (time > 300) return "Focus on the lights. Try to anticipate the exact moment.";
    if (time > 250) return "Good! Try to maintain focus for faster reactions.";
    if (time > 200) return "Excellent reaction time!";
    return "Outstanding! Professional level reaction time!";
  };

  const averageTime = results
    .filter((r) => !r.jumpStart && r.time !== null)
    .reduce((acc, r, _, arr) => acc + (r.time || 0) / arr.length, 0);

  if (isCalibrating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Calibrating system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 text-transparent bg-clip-text">
                Reaction Trainer
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              F1-Style Lights Reaction Testing
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              System latency compensation: {systemLatency.toFixed(1)}ms
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Lights and Game Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Lights */}
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                
                {/* Lights Container */}
                <div className="flex justify-center items-center gap-6 mb-8 min-h-[100px]">
                  {[1, 2, 3, 4, 5].map((lightNum) => (
                    <div
                      key={lightNum}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: activeLights >= lightNum ? '#dc2626' : '#1f2937',
                        border: '4px solid',
                        borderColor: activeLights >= lightNum ? '#991b1b' : '#374151',
                        boxShadow: activeLights >= lightNum 
                          ? '0 0 30px rgba(220, 38, 38, 0.8), 0 0 60px rgba(220, 38, 38, 0.4)' 
                          : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  ))}
                </div>

                {/* Status Display */}
                <div className="text-center min-h-[120px] flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                    {gameState === "idle" && (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                          Ready to Start
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          Click anywhere or press SPACE
                        </p>
                      </motion.div>
                    )}

                    {gameState === "countdown" && (
                      <motion.div
                        key="countdown"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          Get Ready...
                        </p>
                      </motion.div>
                    )}

                    {gameState === "waiting" && (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                          Wait for it...
                        </p>
                      </motion.div>
                    )}

                    {gameState === "reacting" && (
                      <motion.div
                        key="reacting"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          GO!
                        </p>
                      </motion.div>
                    )}

                    {gameState === "result" && (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full"
                      >
                        {jumpStart ? (
                          <div>
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                              JUMP START!
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                              You reacted before the lights went out
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-5xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 text-transparent bg-clip-text mb-2">
                              {reactionTime}ms
                            </p>
                            {reactionTime && reactionTime > 250 && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                                💡 {getHint(reactionTime)}
                              </p>
                            )}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startGame();
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg"
                        >
                          Try Again
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <LightBulbIcon className="w-6 h-6 text-yellow-500" />
                  How to Play
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li>• Watch the five red lights illuminate one by one</li>
                  <li>• When all lights turn off, react as quickly as possible</li>
                  <li>• Click anywhere or press SPACE to react</li>
                  <li>• Reacting before the lights go out counts as a jump start</li>
                  <li>• Times are automatically calibrated for system latency</li>
                </ul>
              </div>
            </div>

            {/* Results Table */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ClockIcon className="w-6 h-6 text-cyan-600" />
                  Results
                </h3>

                {results.length > 0 && !isNaN(averageTime) && averageTime > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-200 dark:border-cyan-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Average Time
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 text-transparent bg-clip-text">
                      {Math.round(averageTime)}ms
                    </p>
                  </div>
                )}

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No attempts yet
                    </p>
                  ) : (
                    results.map((result, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 rounded-xl border ${
                          result.jumpStart
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                            : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Attempt {results.length - index}
                          </span>
                          <span
                            className={`text-lg font-bold ${
                              result.jumpStart
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {result.jumpStart ? "JUMP START" : `${result.time}ms`}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
