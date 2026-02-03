import { Calendar, Sparkles, Image, Zap, Target, ArrowRight } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-stone-50 smooth-scroll">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-orange-100/40 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-16 sm:pb-24">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-6 animate-slide-down">
              <img
                src="/kinetic-snacks-logo-horizontal.png"
                alt="Kinetic Snacks"
                className="h-16 sm:h-20 lg:h-28"
              />
            </div>

            <h1 className="sr-only">Kinetic Snacks</h1>

            {/* Headline */}
            <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-3 tracking-tight leading-tight px-4">
                Movement that actually
                <span className="block text-orange-600">fits your life</span>
              </h2>
            </div>

            {/* Subheadline */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed px-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Stop abandoning gym memberships. Start with 3-minute movement snacks that slip perfectly into your actual schedule—no sweat, no changing, no excuses.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 px-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <button
                onClick={onGetStarted}
                className="touch-target group w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-semibold px-8 py-4 rounded-full text-base sm:text-lg transition-smooth hover:scale-105 hover:shadow-xl shadow-lg flex items-center justify-center gap-2"
              >
                Start Moving Better
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Trust indicators */}
            <p className="text-xs sm:text-sm text-slate-500 font-medium animate-fade-in px-4" style={{ animationDelay: '0.4s' }}>
              No credit card • 2 minute setup • Works anywhere
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto mt-12 sm:mt-16 px-4 animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">3-15</div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 leading-tight">Minutes per snack</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">Zero</div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 leading-tight">Equipment needed</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">Any</div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 leading-tight">Space works</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem/Solution Section */}
      <div className="bg-white py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 leading-tight">
              The gym isn't the problem.<br />Your schedule is.
            </h3>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              We use AI to find the natural gaps in your day and fill them with perfectly-timed movement breaks. No calendar Tetris required.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <FeatureCard
            icon={<Calendar className="w-7 h-7" />}
            title="Calendar-Aware"
            description="AI scans your schedule and suggests snacks during natural breaks"
            color="bg-orange-500"
            delay="0s"
          />

          <FeatureCard
            icon={<Sparkles className="w-7 h-7" />}
            title="Hyper-Personalized"
            description="Adapts to your space, gear, injuries, and what you're wearing"
            color="bg-orange-500"
            delay="0.1s"
          />

          <FeatureCard
            icon={<Image className="w-7 h-7" />}
            title="Space Intelligence"
            description="Snap a photo, get exercises optimized for your exact room"
            color="bg-orange-500"
            delay="0.2s"
          />

          <FeatureCard
            icon={<Zap className="w-7 h-7" />}
            title="Work-Friendly"
            description="Low-intensity moves you can do in business casual, no shower needed"
            color="bg-orange-500"
            delay="0s"
          />

          <FeatureCard
            icon={<Target className="w-7 h-7" />}
            title="Habit Building"
            description="Tiny, consistent wins that compound into real fitness gains"
            color="bg-orange-500"
            delay="0.1s"
          />

          <FeatureCard
            icon={<Sparkles className="w-7 h-7" />}
            title="Surprise Mode"
            description="Roulette feature keeps workouts fresh and spontaneous"
            color="bg-orange-500"
            delay="0.2s"
          />
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative overflow-hidden bg-slate-900 py-16 sm:py-24 safe-bottom">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Your body doesn't need<br />another January promise
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-stone-300 mb-10 leading-relaxed max-w-2xl mx-auto">
            It needs movement that actually happens. Start today with AI that fits fitness into your real life.
          </p>
          <button
            onClick={onGetStarted}
            className="touch-target group w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-bold px-10 py-5 rounded-full text-base sm:text-lg transition-smooth hover:scale-105 hover:shadow-2xl shadow-xl inline-flex items-center justify-center gap-2"
          >
            Begin Your First Snack
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-stone-400 text-xs sm:text-sm mt-6 font-medium">
            Join the movement revolution • Free forever
          </p>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  delay: string;
}

function FeatureCard({ icon, title, description, color, delay }: FeatureCardProps) {
  return (
    <div
      className="group bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-smooth border border-stone-100 hover:border-orange-200 hover:-translate-y-1 animate-scale-in"
      style={{ animationDelay: delay }}
    >
      <div className={`${color} w-11 h-11 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-smooth`}>
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-tight">{title}</h3>
      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{description}</p>
    </div>
  );
}
