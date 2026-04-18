import { ArrowLeft, Camera, Sparkles, AlertCircle, Crown, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SpaceAnalysisProps {
  onBack: () => void;
  isPremium: boolean;
  onUpgrade: () => void;
}

interface SpaceRecommendation {
  title: string;
  description: string;
  equipment: string[];
}

interface AnalysisResult {
  dimensions: string;
  usableSpace: string;
  detectedEquipment: string[];
  floorType: string;
  obstacles: string[];
  recommendations: SpaceRecommendation[];
  safetyNotes: string[];
}

// Resize and compress an image file to stay well within the 5 MB API limit.
// Returns { base64, mimeType } ready to POST.
async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64  = dataUrl.split(',')[1];
      resolve({ base64, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression.'));
    };

    img.src = objectUrl;
  });
}

export default function SpaceAnalysis({ onBack, isPremium, onUpgrade }: SpaceAnalysisProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Premium Feature</h1>
          <p className="text-lg text-slate-600 mb-8">
            Space Analysis is available with a Premium subscription. Unlock AI-powered room
            optimization and get personalized exercise recommendations for your space.
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAnalysisResult(null);
    setError(null);

    // Show a preview immediately from the raw file.
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    // Compress in the background so the Analyze button is ready.
    try {
      const compressed = await compressImage(file);
      setCompressedImage(compressed);
    } catch {
      setError('Could not process this image. Please try a different file.');
      setImagePreview(null);
    }
  };

  const handleAnalyze = async () => {
    if (!compressedImage) return;
    setIsAnalyzing(true);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke('analyze-space', {
      body: {
        imageBase64: compressedImage.base64,
        mimeType: compressedImage.mimeType,
      },
    });

    setIsAnalyzing(false);

    if (fnError || !data?.result) {
      setError(
        fnError?.message ?? 'Analysis failed. Please try again with a clearer photo.',
      );
      return;
    }

    setAnalysisResult(data.result as AnalysisResult);
  };

  const handleReset = () => {
    setImagePreview(null);
    setCompressedImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          {analysisResult && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Space Analysis</h1>
          <p className="text-slate-600">
            Upload a photo of your space and let AI identify equipment and suggest exercises
            tailored to what it sees.
          </p>
        </div>

        {/* Upload */}
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
              <p className="text-sm text-slate-500 text-center">
                Include your room, any equipment, and the area you plan to exercise in.
                JPG, PNG, or WebP.
              </p>
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Image + actions */}
        {imagePreview && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Your Space</h2>
                {!analysisResult && (
                  <label
                    htmlFor="image-upload-change"
                    className="text-sm text-orange-600 hover:text-orange-700 cursor-pointer font-medium"
                  >
                    Change Photo
                    <input
                      id="image-upload-change"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <img src={imagePreview} alt="Your space" className="w-full rounded-xl" />

              {!analysisResult && !isAnalyzing && (
                <button
                  onClick={handleAnalyze}
                  disabled={!compressedImage}
                  className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-semibold px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Sparkles className="w-5 h-5" />
                  Analyze with AI
                </button>
              )}

              {isAnalyzing && (
                <div className="mt-4 bg-orange-50 rounded-xl p-6 text-center border border-orange-200">
                  <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-orange-900 font-medium text-sm">Analyzing your space…</p>
                  <p className="text-orange-700 text-xs mt-1">This usually takes 5–10 seconds.</p>
                </div>
              )}
            </div>

            {/* Results */}
            {analysisResult && (
              <div className="space-y-6">
                {/* Space details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-600" />
                    Space Overview
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Dimensions</p>
                      <p className="text-sm text-slate-800">{analysisResult.dimensions}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Floor Type</p>
                      <p className="text-sm text-slate-800 capitalize">{analysisResult.floorType}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Usable Area</p>
                      <p className="text-sm text-slate-800">{analysisResult.usableSpace}</p>
                    </div>
                  </div>

                  {analysisResult.detectedEquipment.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Equipment Detected</p>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.detectedEquipment.map((item) => (
                          <span
                            key={item}
                            className="px-3 py-1 bg-orange-100 text-orange-700 font-medium rounded-lg text-sm"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.obstacles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Space Constraints</p>
                      <ul className="space-y-1">
                        {analysisResult.obstacles.map((o) => (
                          <li key={o} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-slate-400 mt-0.5">–</span>
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Recommended Exercises
                  </h2>
                  <div className="space-y-3">
                    {analysisResult.recommendations.map((rec) => (
                      <div
                        key={rec.title}
                        className="border border-stone-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition-all"
                      >
                        <h3 className="font-semibold text-slate-900 mb-1 text-sm">{rec.title}</h3>
                        <p className="text-slate-600 text-sm mb-3 leading-relaxed">{rec.description}</p>
                        {rec.equipment.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {rec.equipment.map((item) => (
                              <span
                                key={item}
                                className="px-2 py-0.5 bg-stone-100 text-slate-600 rounded text-xs font-medium"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety */}
                {analysisResult.safetyNotes.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <h2 className="text-base font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Safety Reminders
                    </h2>
                    <ul className="space-y-2">
                      {analysisResult.safetyNotes.map((note) => (
                        <li key={note} className="text-amber-800 text-sm flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
