import { ArrowLeft, Camera, Sparkles, AlertCircle, Crown } from 'lucide-react';
import { useState } from 'react';

interface SpaceAnalysisProps {
  onBack: () => void;
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function SpaceAnalysis({ onBack, isPremium, onUpgrade }: SpaceAnalysisProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-stone-50 smooth-scroll safe-bottom">
        <header className="glass-effect border-b border-stone-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={onBack}
              className="touch-target flex items-center gap-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Crown className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Premium Feature
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Space Analysis is available with a Premium subscription. Unlock AI-powered room optimization and get personalized exercise recommendations for your space.
          </p>
          <button
            onClick={onUpgrade}
            className="touch-target bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      setAnalysisResult({
        dimensions: '10ft x 8ft',
        equipment: ['Doorway Pull-up Bar', 'Yoga Mat', 'Wall Space'],
        usableSpace: 'Approximately 60 sq ft of clear floor space',
        recommendations: [
          {
            title: 'Doorway Pull-up Variations',
            description: 'Great setup for upper body work. Consider dead hangs, scapular pulls, and assisted pull-ups.',
            equipment: ['Doorway Pull-up Bar']
          },
          {
            title: 'Floor Work Sequence',
            description: 'Plenty of space for yoga mat exercises: planks, bridges, stretches, and core work.',
            equipment: ['Yoga Mat', 'Floor Space']
          },
          {
            title: 'Wall-Assisted Exercises',
            description: 'Wall push-ups, wall sits, shoulder slides, and balance work using the wall.',
            equipment: ['Wall Space']
          }
        ],
        safetyNotes: [
          'Ensure pull-up bar is properly secured before each use',
          'Clear any obstacles from floor space before exercises',
          'Use a mat for comfort during floor work'
        ]
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            AI Space Analysis
          </h1>
          <p className="text-slate-600">
            Upload a photo of your space and let AI identify equipment and suggest exercises
          </p>
        </div>

        {/* Upload Section */}
        {!imagePreview && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100">
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-12 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all"
            >
              <Camera className="w-16 h-16 text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-900 mb-2">
                Upload a photo of your space
              </p>
              <p className="text-sm text-slate-600 text-center">
                Take a photo that shows your room, available equipment, and workout area
              </p>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Image Preview and Analysis */}
        {imagePreview && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Your Space
                </h2>
                <label htmlFor="image-upload-change" className="text-sm text-orange-600 hover:text-orange-700 cursor-pointer font-medium">
                  Change Photo
                  <input
                    id="image-upload-change"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <img
                src={imagePreview}
                alt="Your space"
                className="w-full rounded-xl"
              />

              {!analysisResult && !isAnalyzing && (
                <button
                  onClick={handleAnalyze}
                  className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Sparkles className="w-5 h-5" />
                  Analyze with AI
                </button>
              )}

              {isAnalyzing && (
                <div className="mt-4 bg-orange-50 rounded-xl p-6 text-center border border-orange-200">
                  <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-orange-900 font-medium text-sm">
                    Analyzing your space...
                  </p>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            {analysisResult && (
              <div className="space-y-6">
                {/* Space Details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-600" />
                    Space Analysis
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-slate-900 mb-1 text-sm">Dimensions</h3>
                      <p className="text-slate-600 text-sm">{analysisResult.dimensions}</p>
                    </div>

                    <div>
                      <h3 className="font-medium text-slate-900 mb-2 text-sm">Equipment Detected</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.equipment.map((item, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-orange-100 text-orange-700 font-medium rounded-lg text-sm"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-slate-900 mb-1 text-sm">Usable Space</h3>
                      <p className="text-slate-600 text-sm">{analysisResult.usableSpace}</p>
                    </div>
                  </div>
                </div>

                {/* Exercise Recommendations */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Recommended Exercises
                  </h2>

                  <div className="space-y-3">
                    {analysisResult.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="border border-stone-200 rounded-xl p-4 hover:border-orange-400 hover:shadow-sm transition-all"
                      >
                        <h3 className="font-semibold text-slate-900 mb-2 text-sm">
                          {rec.title}
                        </h3>
                        <p className="text-slate-600 text-sm mb-3 leading-relaxed">
                          {rec.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {rec.equipment.map((item, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-stone-100 text-slate-600 rounded text-xs font-medium"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety Notes */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                  <h2 className="text-base font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Safety Reminders
                  </h2>
                  <ul className="space-y-2">
                    {analysisResult.safetyNotes.map((note, index) => (
                      <li key={index} className="text-amber-800 text-sm flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AnalysisResult {
  dimensions: string;
  equipment: string[];
  usableSpace: string;
  recommendations: {
    title: string;
    description: string;
    equipment: string[];
  }[];
  safetyNotes: string[];
}
