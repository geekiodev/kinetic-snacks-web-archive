import { Check, Zap, Crown, X } from 'lucide-react';

interface PricingProps {
  onSelectPlan: (plan: 'free' | 'premium') => void;
  onSkip?: () => void;
}

export default function Pricing({ onSelectPlan, onSkip }: PricingProps) {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      icon: Zap,
      iconColor: 'text-slate-600',
      bgColor: 'from-slate-50 to-slate-100',
      borderColor: 'border-slate-200',
      buttonColor: 'bg-slate-600 hover:bg-slate-700',
      features: [
        { text: '3 exercises per day', included: true },
        { text: 'Basic movement library', included: true },
        { text: 'Daily reminders', included: true },
        { text: 'Full exercise library', included: false },
        { text: 'Unlimited daily exercises', included: false },
        { text: 'Custom workout plans', included: false },
        { text: 'Space analysis tool', included: false },
        { text: 'Progress tracking & analytics', included: false },
        { text: 'AI-powered recommendations', included: false },
      ],
      cta: 'Start Free',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$4.99',
      period: 'per month',
      icon: Crown,
      iconColor: 'text-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-300',
      buttonColor: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
      popular: true,
      features: [
        { text: 'Unlimited exercises per day', included: true },
        { text: 'Full exercise library (100+ moves)', included: true },
        { text: 'Custom workout plans', included: true },
        { text: 'Space analysis tool', included: true },
        { text: 'Progress tracking & analytics', included: true },
        { text: 'AI-powered recommendations', included: true },
        { text: 'Advanced movement patterns', included: true },
        { text: 'Priority support', included: true },
        { text: 'Early access to new features', included: true },
      ],
      cta: 'Start 7-Day Free Trial',
      badge: 'Most Popular',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 smooth-scroll safe-bottom overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 animate-slide-down">
          <div className="flex justify-center mb-6">
            <img
              src="/kinetic-snacks-logo-horizontal.png"
              alt="Kinetic Snacks"
              className="h-12 sm:h-16"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4">
            Choose Your Plan
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Start free and upgrade anytime. Cancel whenever you want.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto mb-8 animate-scale-in">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border-2 transition-all hover:shadow-2xl hover:scale-[1.02] ${
                  plan.borderColor
                } ${plan.popular ? 'md:scale-105' : ''}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  {/* Plan Header */}
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${plan.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${plan.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{plan.name}</h2>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-bold text-slate-900">{plan.price}</span>
                      <span className="text-base sm:text-lg text-slate-600">/ {plan.period}</span>
                    </div>
                    {plan.id === 'premium' && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-2">
                        Then $4.99/month. Cancel anytime.
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => onSelectPlan(plan.id as 'free' | 'premium')}
                    className={`touch-target w-full ${plan.buttonColor} text-white font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl transition-all active:scale-95 shadow-lg hover:shadow-xl mb-6 sm:mb-8 text-sm sm:text-base`}
                  >
                    {plan.cta}
                  </button>

                  {/* Features */}
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wide">
                      {plan.id === 'free' ? 'What\'s Included' : 'Everything in Free, plus:'}
                    </p>
                    <ul className="space-y-2.5 sm:space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 sm:gap-3">
                          {feature.included ? (
                            <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                              <X className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                            </div>
                          )}
                          <span
                            className={`text-sm sm:text-base ${
                              feature.included ? 'text-slate-900' : 'text-slate-400 line-through'
                            }`}
                          >
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Skip Option */}
        {onSkip && (
          <div className="text-center">
            <button
              onClick={onSkip}
              className="touch-target text-slate-600 hover:text-slate-900 font-medium transition-colors text-sm sm:text-base"
            >
              I'll decide later
            </button>
          </div>
        )}

        {/* Trust Signals */}
        <div className="mt-8 sm:mt-12 pt-8 border-t border-stone-200">
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">7-Day Free Trial</p>
              <p className="text-xs text-slate-600">No credit card required</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">Cancel Anytime</p>
              <p className="text-xs text-slate-600">No long-term commitment</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">Secure Payments</p>
              <p className="text-xs text-slate-600">Your data is safe</p>
            </div>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-8 text-center">
          <p className="text-xs sm:text-sm text-slate-600">
            Not satisfied? Get a full refund within 30 days, no questions asked.
          </p>
        </div>
      </div>
    </div>
  );
}
