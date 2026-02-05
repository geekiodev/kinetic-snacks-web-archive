import { ArrowLeft, Clock, Zap, CheckCircle2, Play, Sparkles, Trophy, Timer } from 'lucide-react';
import { Exercise } from '../App';
import { useState, useEffect } from 'react';

interface ExerciseDetailProps {
  exercise: Exercise;
  onBack: () => void;
  onComplete?: (exercise: Exercise) => Promise<void>;
}

export default function ExerciseDetail({ exercise, onBack, onComplete }: ExerciseDetailProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(exercise.duration * 60);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const toggleStep = (index: number) => {
    setCompletedSteps(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleStart = () => {
    setIsStarted(true);
    setTimeRemaining(exercise.duration * 60);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isStarted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isStarted, timeRemaining]);

  const handleComplete = async () => {
    setSaveError('');
    if (onComplete) {
      setIsSaving(true);
      try {
        await onComplete(exercise);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Unable to save your progress.');
      } finally {
        setIsSaving(false);
      }
    }
    setShowCelebration(true);
    setTimeout(() => {
      onBack();
    }, 2500);
  };

  const progressPercentage = (completedSteps.length / exercise.instructions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const totalSeconds = exercise.duration * 60;
    const percentRemaining = (timeRemaining / totalSeconds) * 100;

    if (percentRemaining > 50) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (percentRemaining > 25) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-red-600 border-red-200 bg-red-50';
  };

  const getTimerRingColor = () => {
    const totalSeconds = exercise.duration * 60;
    const percentRemaining = (timeRemaining / totalSeconds) * 100;

    if (percentRemaining > 50) return 'text-emerald-500';
    if (percentRemaining > 25) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-stone-50 smooth-scroll safe-bottom">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 max-w-md w-full text-center shadow-2xl animate-scale-in">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-orange-600">
              Snack Complete!
            </h2>
            <p className="text-slate-600 text-lg mb-2">
              You just invested {exercise.duration} minutes in yourself
            </p>
            <div className="flex justify-center gap-2 mt-6">
              <div className="text-4xl animate-confetti" style={{ animationDelay: '0s' }}>🎉</div>
              <div className="text-4xl animate-confetti" style={{ animationDelay: '0.1s' }}>✨</div>
              <div className="text-4xl animate-confetti" style={{ animationDelay: '0.2s' }}>💪</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="glass-effect border-b border-stone-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="touch-target flex items-center gap-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-smooth -ml-2 sm:ml-0"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium text-sm sm:text-base">Back</span>
            </button>

            {isStarted && (
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-slate-600">
                  {completedSteps.length}/{exercise.instructions.length} steps
                </div>
                <div className="relative w-12 h-12">
                  <svg className="transform -rotate-90 w-12 h-12">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-stone-200"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPercentage / 100)}`}
                      className="text-orange-500 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-700">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Exercise Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-sm mb-4 sm:mb-6 border border-stone-100 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">
                {exercise.title}
              </h1>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="flex items-center gap-1.5 sm:gap-2 text-slate-700 text-xs sm:text-sm font-medium bg-stone-100 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {exercise.duration} min
                </span>
                <span className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 ${
                  exercise.intensity === 'low'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {exercise.intensity}
                </span>
                <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-orange-100 text-orange-700 font-bold rounded-lg text-xs sm:text-sm">
                  {exercise.category}
                </span>
              </div>
            </div>

            {exercise.scheduledTime && (
              <div className="text-right ml-2 sm:ml-4">
                <div className="text-[10px] sm:text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Scheduled</div>
                <div className="text-xl sm:text-3xl font-bold text-orange-600">
                  {exercise.scheduledTime}
                </div>
              </div>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-6 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-orange-900 font-medium text-sm leading-relaxed">
              {exercise.tips}
            </p>
          </div>
        </div>

        {/* Countdown Timer */}
        {isStarted && (
          <div className={`rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg mb-4 sm:mb-6 border-2 transition-all animate-slide-up ${getTimerColor()}`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Timer Display */}
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative">
                  <svg className="transform -rotate-90 w-24 h-24 sm:w-28 sm:h-28">
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-stone-200"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - (timeRemaining / (exercise.duration * 60)))}`}
                      className={`${getTimerRingColor()} transition-all duration-1000`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Timer className={`w-8 h-8 sm:w-10 sm:h-10 ${getTimerRingColor()}`} />
                  </div>
                </div>

                <div>
                  <div className="text-xs sm:text-sm font-medium opacity-75 mb-1">Time Remaining</div>
                  <div className="text-4xl sm:text-5xl font-bold tracking-tight">
                    {formatTime(timeRemaining)}
                  </div>
                  {timeRemaining === 0 && (
                    <div className="text-sm font-semibold mt-1 animate-pulse">Time's up!</div>
                  )}
                </div>
              </div>

              {/* Timer Info */}
              <div className="text-center sm:text-right">
                <div className="text-xs sm:text-sm font-medium opacity-75 mb-1">Total Duration</div>
                <div className="text-xl sm:text-2xl font-bold">{exercise.duration} min</div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Needed */}
        {exercise.equipment.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 border border-stone-100 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
              What You'll Need
            </h2>
            <div className="flex flex-wrap gap-2">
              {exercise.equipment.map((item, index) => (
                <span
                  key={index}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-stone-100 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold border border-stone-200 hover:border-orange-300 hover:bg-orange-50 transition-smooth"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-20 sm:mb-6 border border-stone-100 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Exercise Steps
            </h2>
            {isStarted && (
              <span className="text-sm font-bold text-orange-600">
                {completedSteps.length} of {exercise.instructions.length} done
              </span>
            )}
          </div>

          <div className="space-y-2 sm:space-y-3">
            {exercise.instructions.map((instruction, index) => (
              <button
                key={index}
                onClick={() => toggleStep(index)}
                disabled={!isStarted}
                className={`touch-target group w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl transition-smooth text-left ${
                  completedSteps.includes(index)
                    ? 'bg-orange-50 border-2 border-orange-400 scale-[0.98]'
                    : 'bg-stone-50 border-2 border-stone-100 hover:border-orange-200 hover:bg-orange-50/50 active:scale-95'
                } ${!isStarted ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
              >
                <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-smooth ${
                  completedSteps.includes(index)
                    ? 'bg-orange-500 text-white scale-110'
                    : 'bg-stone-200 text-slate-600 group-hover:bg-orange-200'
                }`}>
                  {completedSteps.includes(index) ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`flex-1 text-sm sm:text-base leading-relaxed ${
                  completedSteps.includes(index)
                    ? 'text-orange-900 font-semibold'
                    : 'text-slate-700 font-medium'
                }`}>
                  {instruction}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom for mobile */}
        <div className="fixed sm:sticky bottom-0 left-0 right-0 sm:relative bg-stone-50 border-t sm:border-t-0 border-stone-200 safe-bottom">
          <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
            {!isStarted ? (
              <button
                onClick={handleStart}
                className="touch-target group w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-bold px-8 py-4 sm:py-5 rounded-xl sm:rounded-2xl transition-smooth hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 shadow-lg"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-smooth" />
                <span className="text-base sm:text-lg">Start Exercise</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={onBack}
                  className="touch-target px-6 sm:px-8 py-3 sm:py-4 rounded-xl border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-100 active:scale-95 transition-smooth font-semibold text-sm sm:text-base"
                >
                  Save for Later
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completedSteps.length !== exercise.instructions.length}
                  className={`touch-target flex-1 font-bold px-6 sm:px-8 py-3 sm:py-5 rounded-xl sm:rounded-2xl transition-smooth flex items-center justify-center gap-2 sm:gap-3 ${
                    completedSteps.length === exercise.instructions.length
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white shadow-lg hover:shadow-xl hover:scale-105'
                      : 'bg-stone-200 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-base sm:text-lg">
                    {isSaving ? 'Saving...' : 'Complete Snack'}
                  </span>
                </button>
              </div>
            )}
            {saveError && (
              <p className="text-sm text-red-600 text-center mt-3">
                {saveError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
