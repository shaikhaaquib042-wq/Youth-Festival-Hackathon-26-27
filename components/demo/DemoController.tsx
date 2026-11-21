'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { buildDemoTimeline, DemoChapter } from '@/lib/demo/timeline';
import { AppDataStore } from '@/types';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  FastForward,
  Sparkles,
} from 'lucide-react';

interface DemoControllerProps {
  onExit: () => void;
}

export const DemoController: React.FC<DemoControllerProps> = ({ onExit }) => {
  const { data, initialize, setActiveView, setActiveRequestId } = useAppStore();

  const [initialRealState] = useState<AppDataStore>(() => JSON.parse(JSON.stringify(data)));
  const chapters = useRef<DemoChapter[]>(buildDemoTimeline(initialRealState)).current;

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 5 | 20>(5);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const applyChapter = useCallback(
    (index: number) => {
      const chapter = chapters[index];
      if (!chapter) return;

      const modifiedState = chapter.applyState(initialRealState);
      initialize(modifiedState);
      setActiveView(chapter.view);

      const demoReq = modifiedState.requests.find((r) => r.id.includes('demo-req'));
      if (demoReq) {
        setActiveRequestId(demoReq.id);
      }
    },
    [chapters, initialRealState, initialize, setActiveView, setActiveRequestId]
  );

  // Jump to specific chapter
  const goToChapter = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(chapters.length - 1, index));
      setCurrentChapterIndex(clamped);
      applyChapter(clamped);
    },
    [chapters.length, applyChapter]
  );

  // Next / Previous
  const nextChapter = useCallback(() => {
    if (currentChapterIndex < chapters.length - 1) {
      goToChapter(currentChapterIndex + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentChapterIndex, chapters.length, goToChapter]);

  const prevChapter = useCallback(() => {
    if (currentChapterIndex > 0) {
      goToChapter(currentChapterIndex - 1);
    }
  }, [currentChapterIndex, goToChapter]);

  const resetDemo = useCallback(() => {
    goToChapter(0);
    setIsPlaying(true);
  }, [goToChapter]);

  // Handle Play / Step Timer based on speed
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPlaying) {
      // 1x = 10s per chapter, 5x = 4s, 20x = 1.5s
      const delayMs = speed === 1 ? 10000 : speed === 5 ? 4000 : 1500;
      timerRef.current = setInterval(() => {
        nextChapter();
      }, delayMs);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, nextChapter]);

  // Initial chapter application
  useEffect(() => {
    applyChapter(0);
  }, [applyChapter]);

  const handleExit = useCallback(() => {
    // Restore real state
    initialize(initialRealState);
    setActiveView('map');
    onExit();
  }, [initialize, initialRealState, setActiveView, onExit]);

  // Global Keyboard Shortcuts (Space = play/pause, ArrowLeft = prev, ArrowRight = next, R = reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextChapter();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevChapter();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetDemo();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextChapter, prevChapter, resetDemo, handleExit]);

  const currentChapter = chapters[currentChapterIndex] || chapters[0];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="glass-panel-elevated p-4 rounded-2xl border border-cyan/40 shadow-2xl backdrop-blur-xl bg-surface/95 space-y-3">
        {/* Top Header: Badge, Scene Title & Exit */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blood/20 text-blood-glow border border-blood/30 shrink-0">
              {currentChapter.badge}
            </span>
            <div className="overflow-hidden">
              <h4 className="font-display font-bold text-sm text-white truncate">
                {currentChapter.title}
              </h4>
              <p className="text-[11px] text-cyan truncate">{currentChapter.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Speed Selector */}
            <div className="flex items-center bg-surface-elevated rounded-lg p-0.5 border border-surface-border text-[11px] font-mono">
              {([1, 5, 20] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    speed === s ? 'bg-cyan text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={handleExit}
              title="Exit Scripted Demo (Restores Real State)"
              className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-border text-slate-400 hover:text-white border border-surface-border"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Narrative Description Snippet */}
        <p className="text-xs text-slate-300 leading-relaxed bg-surface-elevated/60 p-2.5 rounded-xl border border-surface-border">
          {currentChapter.description}
        </p>

        {/* Timeline Progress Bar with Chapter Markers */}
        <div className="space-y-1">
          <div className="grid grid-cols-8 gap-1.5">
            {chapters.map((ch, idx) => {
              const isPast = idx < currentChapterIndex;
              const isCurrent = idx === currentChapterIndex;
              return (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(idx)}
                  className={`h-2 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-cyan shadow-glow-cyan'
                      : isPast
                      ? 'bg-blood/80'
                      : 'bg-surface-border hover:bg-surface-border/80'
                  }`}
                  title={`Jump to Scene ${ch.id}: ${ch.title}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>SCENE {currentChapterIndex + 1} OF 8</span>
            <span>PRESS SPACE TO PAUSE · ARROWS TO SCRUB · ESC TO EXIT</span>
          </div>
        </div>

        {/* Playback Controls Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={prevChapter}
              disabled={currentChapterIndex === 0}
              title="Previous Scene (Left Arrow)"
              className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-border disabled:opacity-40 text-slate-300 hover:text-white border border-surface-border"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              title={isPlaying ? 'Pause Demo (Space)' : 'Play Demo (Space)'}
              className="px-4 py-2 rounded-lg bg-blood hover:bg-blood/90 text-white font-bold text-xs shadow-glow-blood flex items-center gap-1.5 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>RESUME</span>
                </>
              )}
            </button>

            <button
              onClick={nextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
              title="Next Scene (Right Arrow)"
              className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-border disabled:opacity-40 text-slate-300 hover:text-white border border-surface-border"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={resetDemo}
            title="Replay from Scene 1 (R)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-border text-slate-300 hover:text-white text-xs font-mono border border-surface-border"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};
