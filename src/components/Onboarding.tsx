import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { UserPreferences } from '../App';

interface OnboardingProps {
  onComplete: (preferences: UserPreferences) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState<UserPreferences>({
    limitations: [],
    equipment: [],
    location: [],
    intensityLevel: 'low',
    duration: 5,
  });

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete(preferences);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  return (
    <div className="min-h-screen smooth-scroll flex items-center justify-center px-4 bg-stone-50 safe-bottom">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-12 border border-stone-100 animate-scale-in">
          {/* Logo */}
          <div className="flex justify-center mb-6 animate-slide-down">
            <img
              src="/kinetic-snacks-logo-horizontal.png"
              alt="Kinetic Snacks"
              className="h-12 sm:h-16"
            />
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2 mb-10">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2.5 flex-1 rounded-full transition-smooth ${
                  s <= step ? 'bg-orange-500' : 'bg-stone-200'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Limitations */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 leading-tight">
                  Any limitations we should know about?
                </h2>
                <p className="text-slate-600 text-sm">
                  Select any injuries or physical limitations you currently have
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
                {['Knee Issues', 'Back Pain', 'Shoulder Injury', 'Wrist Problems', 'Ankle Issues', 'Hip Pain', 'None'].map(
                  (limitation) => (
                    <button
                      key={limitation}
                      onClick={() =>
                        setPreferences({
                          ...preferences,
                          limitations: toggleArrayItem(preferences.limitations, limitation),
                        })
                      }
                      className={`touch-target p-3 sm:p-3.5 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 text-left text-sm font-medium ${
                        preferences.limitations.includes(limitation)
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      {limitation}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Step 2: Equipment */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 leading-tight">
                  What equipment do you have access to?
                </h2>
                <p className="text-slate-600 text-sm">
                  Select all that apply - don't worry, bodyweight is great too!
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
                {[
                  'Doorway Pull-up Bar',
                  'Resistance Bands',
                  'Dumbbells',
                  'Yoga Mat',
                  'Chair',
                  'Countertop',
                  'Wall Space',
                  'Floor Space',
                  'None / Bodyweight Only',
                ].map((equipment) => (
                  <button
                    key={equipment}
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        equipment: toggleArrayItem(preferences.equipment, equipment),
                      })
                    }
                    className={`touch-target p-3 sm:p-3.5 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 text-left text-sm font-medium ${
                      preferences.equipment.includes(equipment)
                        ? 'border-orange-500 bg-orange-50 text-orange-900'
                        : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    {equipment}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 leading-tight">
                  Where will you be doing these snacks?
                </h2>
                <p className="text-slate-600 text-sm">
                  This helps us understand your clothing and privacy needs
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
                {[
                  'Home Office',
                  'Workplace',
                  'Living Room',
                  'Bedroom',
                  'Outdoor Space',
                  'Gym',
                ].map((location) => (
                  <button
                    key={location}
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        location: toggleArrayItem(preferences.location, location),
                      })
                    }
                    className={`touch-target p-3 sm:p-3.5 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 text-left text-sm font-medium ${
                      preferences.location.includes(location)
                        ? 'border-orange-500 bg-orange-50 text-orange-900'
                        : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Duration & Intensity */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 leading-tight">
                  Let's set your preferences
                </h2>
                <p className="text-slate-600 text-sm">
                  How long should each kinetic snack be?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Duration: {preferences.duration} minutes
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={preferences.duration}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      duration: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>3 min</span>
                  <span>15 min</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Intensity Level
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {[
                    { value: 'low', label: 'Low', desc: 'Gentle, no sweat' },
                    { value: 'medium', label: 'Medium', desc: 'Light workout' },
                  ].map((intensity) => (
                    <button
                      key={intensity.value}
                      onClick={() =>
                        setPreferences({
                          ...preferences,
                          intensityLevel: intensity.value,
                        })
                      }
                      className={`touch-target p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 text-left ${
                        preferences.intensityLevel === intensity.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 text-sm">{intensity.label}</div>
                      <div className="text-xs sm:text-sm text-slate-600">{intensity.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2.5 sm:gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="touch-target flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:scale-95 transition-all font-medium text-sm sm:text-base"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="touch-target group flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 font-bold shadow-lg hover:shadow-xl text-white transition-smooth hover:scale-105 ml-auto text-sm sm:text-base"
            >
              {step === 4 ? 'Start My Journey' : 'Continue'}
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
