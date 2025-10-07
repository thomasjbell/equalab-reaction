"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LightBulbIcon, ClockIcon } from "@heroicons/react/24/solid";

type GameState = "idle" | "countdown" | "waiting" | "reacting" | "result";

interface Result {
  time: number | null; // milliseconds or null for jump starts
  jumpStart: boolean;
  timestamp: string;
}

export default function ReactionsPage() {
  // --- UI state ---
  const [gameState, setGameState] = useState<GameState>("idle");
  const [activeLights, setActiveLights] = useState(0); // 0..5
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [systemLatency, setSystemLatency] = useState<number>(0);
  const [isCalibrating, setIsCalibrating] = useState(true);

  // --- refs for precise timers and flags (no re-renders) ---
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lightsStartRef = useRef<number>(0);
  const lightsOutTimeRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  const bestRef = useRef<number>(Infinity);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("best");
      if (stored) bestRef.current = Number(stored);
    }
  }, []);

  // keep local storage best synced on mount
  useEffect(() => {
    if (bestRef.current !== Infinity) {
      // nothing to do here; UI reads from results/best when available
    }
  }, []);

  // --- calibration: measure the minimal delay of a macrotask loop ---
  useEffect(() => {
    // run a short median sample of setTimeout(0) roundtrips
    const samples: number[] = [];
    let count = 0;

    function sampleOnce() {
      const t0 = performance.now();
      setTimeout(() => {
        samples.push(performance.now() - t0);
        count++;
        if (count < 12) sampleOnce();
        else {
          samples.sort((a, b) => a - b);
          const median = samples[Math.floor(samples.length / 2)];
          // Use median; do not add arbitrary offsets. Keep >=0
          setSystemLatency(Math.max(0, Math.round(median)));
          setIsCalibrating(false);
        }
      }, 0);
    }

    sampleOnce();

    return () => {};
  }, []);

  // --- helpers ---
  const pushResult = (r: Result) => {
    setResults((prev) => [r, ...prev].slice(0, 10));
    // update best
    if (!r.jumpStart && r.time !== null) {
      if (r.time < (bestRef.current || Infinity)) {
        bestRef.current = r.time;
        localStorage.setItem("best", String(r.time));
      }
    }
  };

  function formatMs(ms: number | null) {
    if (ms === null) return "JUMP START";
    return `${Math.round(ms)}ms`;
  }

  // --- core: start using requestAnimationFrame for frame-accurate lighting ---
  const startGame = () => {
    if (runningRef.current) return; // already running
    runningRef.current = true;
    setReactionTime(null);
    setJumpStart(false);
    lightsOutTimeRef.current = 0;
    setActiveLights(0);
    setGameState("countdown");

    const lightsStart = performance.now();
    lightsStartRef.current = lightsStart;

    function frame(now: number) {
      // compute how many lights should be lit based on elapsed seconds
      const elapsed = now - lightsStartRef.current;
      const toLight = Math.min(5, Math.floor(elapsed / 1000) + 1);

      if (toLight !== activeLights) {
        setActiveLights(toLight);
      }

      if (toLight < 5) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        // finished lighting phase
        setGameState("waiting");
        // choose random delay and schedule lights out
        const delay = 1000 + Math.random() * 4000;
        timeoutRef.current = window.setTimeout(() => {
          // lights go out -> record exact time and change state
          lightsOutTimeRef.current = performance.now();
          setActiveLights(0);
          setGameState("reacting");
        }, delay);
      }
    }

    rafRef.current = requestAnimationFrame(frame);
  };

  const [jumpStart, setJumpStart] = useState(false);

  const stopRunningClean = () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    rafRef.current = null;
    timeoutRef.current = null;
  };

  const handleReaction = (fromEvent?: Event) => {
    // Prevent default when coming from input to avoid page scrolling
    try {
      (fromEvent as any)?.preventDefault?.();
    } catch {}

    // If game wasn't started, start
    if (
      !runningRef.current &&
      (gameState === "idle" || gameState === "result")
    ) {
      startGame();
      return;
    }

    // If lights haven't gone out yet -> jump start
    if (!lightsOutTimeRef.current) {
      stopRunningClean();
      setJumpStart(true);
      setGameState("result");
      setActiveLights(0);
      pushResult({
        time: null,
        jumpStart: true,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Normal reaction
    stopRunningClean();
    const raw = performance.now() - lightsOutTimeRef.current;
    const calibrated = Math.max(0, Math.round(raw - systemLatency));
    setReactionTime(calibrated);
    setGameState("result");
    pushResult({
      time: calibrated,
      jumpStart: false,
      timestamp: new Date().toISOString(),
    });
  };

  // --- input handlers (pointer & keyboard) ---
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      // ignore right-clicks
      if ((e as PointerEvent).button === 2) return;
      // ignore clicks on links
      const target = e.target as HTMLElement | null;
      if (target && target.closest && target.closest("a")) return;
      e.preventDefault();
      handleReaction(e);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleReaction(e);
      }
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("keydown", onKeyDown, { passive: false });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, systemLatency]);

  // --- utility: average of last valid results ---
  const validTimes = results
    .filter((r) => !r.jumpStart && r.time !== null)
    .map((r) => r.time as number);
  const averageTime = validTimes.length
    ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
    : NaN;

  const getHint = (time: number) => {
    if (time > 300)
      return "Focus on the lights. Try to anticipate the exact moment.";
    if (time > 250) return "Good! Try to maintain focus for faster reactions.";
    if (time > 200) return "Excellent reaction time!";
    return "Outstanding! Professional level reaction time!";
  };

  if (isCalibrating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Calibrating system...
          </p>
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
              System latency compensation: {systemLatency}ms
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Lights and Game Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Lights */}
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex justify-center items-center gap-6 mb-8 min-h-[100px]">
                  {[1, 2, 3, 4, 5].map((lightNum) => (
                    <div
                      key={lightNum}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        backgroundColor:
                          activeLights >= lightNum ? "#dc2626" : "#1f2937",
                        border: "4px solid",
                        borderColor:
                          activeLights >= lightNum ? "#991b1b" : "#374151",
                        boxShadow:
                          activeLights >= lightNum
                            ? "0 0 30px rgba(220, 38, 38, 0.8), 0 0 60px rgba(220, 38, 38, 0.4)"
                            : "none",
                        transition: "none",
                      }}
                    />
                  ))}
                </div>

                <div className="text-center min-h-[120px] flex flex-col items-center justify-center">
                  {gameState === "idle" && (
                    <div>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                        Ready to Start
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Click anywhere or press SPACE
                      </p>
                    </div>
                  )}

                  {gameState === "countdown" && (
                    <div>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Get Ready...
                      </p>
                    </div>
                  )}

                  {gameState === "waiting" && (
                    <div>
                      <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                        Wait for it...
                      </p>
                    </div>
                  )}

                  {gameState === "reacting" && (
                    <div>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        GO!
                      </p>
                    </div>
                  )}

                  {gameState === "result" && (
                    <div className="w-full">
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

                      <div className="flex items-center justify-center gap-4 mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startGame();
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}
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
                  <li>
                    • When all lights turn off, react as quickly as possible
                  </li>
                  <li>• Click anywhere or press SPACE to react</li>
                  <li>
                    • Reacting before the lights go out counts as a jump start
                  </li>
                  <li>
                    • Times are automatically calibrated for system latency
                  </li>
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

                {results.length > 0 &&
                  !Number.isNaN(averageTime) &&
                  averageTime > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-200 dark:border-cyan-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Average Time
                      </p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 text-transparent bg-clip-text">
                        {averageTime}ms
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
                        transition={{ delay: index * 0.03 }}
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
                            {result.jumpStart
                              ? "JUMP START"
                              : `${result.time}ms`}
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
