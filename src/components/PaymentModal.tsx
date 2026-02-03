import { X, Lock, CreditCard } from 'lucide-react';
import { useState } from 'react';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ onClose, onSuccess }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Premium Subscription</h2>
            <p className="text-sm text-slate-600">7-day free trial, then $4.99/month</p>
          </div>
          <button
            onClick={onClose}
            className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 active:scale-95 transition-all"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Trial Notice */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-900 font-medium">
              You won't be charged for 7 days. Cancel anytime before your trial ends.
            </p>
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Card Number
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={formData.cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  if (formatted.replace(/\s/g, '').length <= 16) {
                    setFormData({ ...formData, cardNumber: formatted });
                  }
                }}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 focus:border-orange-500 focus:ring-orange-500 focus:outline-none focus:ring-2 transition-all"
              />
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              value={formData.cardName}
              onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
              placeholder="John Doe"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-orange-500 focus:ring-orange-500 focus:outline-none focus:ring-2 transition-all"
            />
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expiry Date
              </label>
              <input
                type="text"
                value={formData.expiry}
                onChange={(e) => {
                  const formatted = formatExpiry(e.target.value);
                  if (formatted.replace(/\D/g, '').length <= 4) {
                    setFormData({ ...formData, expiry: formatted });
                  }
                }}
                placeholder="MM/YY"
                maxLength={5}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-orange-500 focus:ring-orange-500 focus:outline-none focus:ring-2 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CVV
              </label>
              <input
                type="text"
                value={formData.cvv}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 3) {
                    setFormData({ ...formData, cvv: value });
                  }
                }}
                placeholder="123"
                maxLength={3}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-orange-500 focus:ring-orange-500 focus:outline-none focus:ring-2 transition-all"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Lock className="w-4 h-4" />
            <p>Your payment information is encrypted and secure</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="touch-target w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>Start My Free Trial</>
            )}
          </button>

          {/* Terms */}
          <p className="text-xs text-center text-slate-500">
            By confirming your subscription, you agree to our{' '}
            <button className="text-orange-600 hover:text-orange-700 font-medium">
              Terms of Service
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
