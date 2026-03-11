import { ArrowLeft, Save, User, Bell, Shield, HelpCircle, LogOut, Camera, Mail, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { UserPreferences } from '../App';

interface SettingsProps {
  preferences: UserPreferences;
  user: { name: string; email: string } | null;
  onSave: (preferences: UserPreferences) => void;
  onSignOut: () => void;
  onBack: () => void;
}

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'account';

export default function Settings({ preferences, user, onSave, onSignOut, onBack }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [notifications, setNotifications] = useState({
    exerciseReminders: true,
    dailyStreak: true,
    weeklyProgress: false,
    newExercises: false,
    pushNotifications: true,
    emailNotifications: false,
  });

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const handleSave = () => {
    onSave(localPreferences);
  };

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      onSignOut();
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: User },
    { id: 'preferences' as SettingsTab, label: 'Preferences', icon: Shield },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'account' as SettingsTab, label: 'Account', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-stone-50 smooth-scroll safe-bottom">
      {/* Header */}
      <header className="glass-effect border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="touch-target flex items-center gap-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-smooth -ml-2 sm:ml-0"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium text-sm sm:text-base">Back</span>
            </button>

            {activeTab === 'preferences' && (
              <button
                onClick={handleSave}
                className="touch-target flex items-center gap-2 bg-orange-600 hover:bg-orange-700 active:scale-95 font-semibold shadow-md hover:shadow-lg text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-all text-sm sm:text-base"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 sm:mb-8">Settings</h1>

        {/* Tabs */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-stone-100 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`touch-target flex-1 min-w-[80px] flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-transparent text-slate-600 hover:bg-stone-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-semibold">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Profile Picture */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Profile Picture
              </h2>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
                    {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-stone-200 flex items-center justify-center hover:bg-stone-50 active:scale-95 transition-all shadow-sm">
                    <Camera className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <div>
                  <button className="touch-target text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                    Change Photo
                  </button>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>
            </section>

            {/* Personal Information */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Personal Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 border-stone-200 focus:border-orange-500 focus:ring-orange-500 focus:outline-none focus:ring-2 transition-all text-sm sm:text-base"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 border-stone-200 focus:border-orange-500 focus:ring-orange-500 focus:outline-none focus:ring-2 transition-all text-sm sm:text-base"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Limitations */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Physical Limitations
              </h2>
              <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
                {['Knee Issues', 'Back Pain', 'Shoulder Injury', 'Wrist Problems', 'Ankle Issues', 'Hip Pain', 'None'].map(
                  (limitation) => {
                    const isSelected = localPreferences.limitations.includes(limitation);
                    const toggle = () =>
                      setLocalPreferences((prev) => ({
                        ...prev,
                        limitations: toggleArrayItem(prev.limitations, limitation),
                      }));
                    return (
                      <button
                        key={limitation}
                        type="button"
                        aria-pressed={isSelected}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          toggle();
                        }}
                        className={`touch-target p-3 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 text-left text-sm font-medium ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-900'
                            : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {limitation}
                      </button>
                    );
                  }
                )}
              </div>
            </section>

            {/* Equipment */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Available Equipment
              </h2>
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
                ].map((equipment) => {
                  const isSelected = localPreferences.equipment.includes(equipment);
                  const toggle = () =>
                    setLocalPreferences((prev) => ({
                      ...prev,
                      equipment: toggleArrayItem(prev.equipment, equipment),
                    }));
                  return (
                    <button
                      key={equipment}
                      type="button"
                      aria-pressed={isSelected}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        toggle();
                      }}
                      className={`touch-target p-3 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 text-left text-sm font-medium ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      {equipment}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Location */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Workout Locations
              </h2>
              <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
                {[
                  'Home Office',
                  'Workplace',
                  'Living Room',
                  'Bedroom',
                  'Outdoor Space',
                  'Gym',
                ].map((location) => {
                  const isSelected = localPreferences.location.includes(location);
                  const toggle = () =>
                    setLocalPreferences((prev) => ({
                      ...prev,
                      location: toggleArrayItem(prev.location, location),
                    }));
                  return (
                    <button
                      key={location}
                      type="button"
                      aria-pressed={isSelected}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        toggle();
                      }}
                      className={`touch-target p-3 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 text-left text-sm font-medium ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      {location}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Duration & Intensity */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Workout Preferences
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Duration: {localPreferences.duration} minutes
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={localPreferences.duration}
                    onChange={(e) =>
                      setLocalPreferences({
                        ...localPreferences,
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
                    ].map((intensity) => {
                      const isSelected = localPreferences.intensityLevel === intensity.value;
                      const choose = () =>
                        setLocalPreferences((prev) => ({
                          ...prev,
                          intensityLevel: intensity.value,
                        }));
                      return (
                        <button
                          key={intensity.value}
                          type="button"
                          aria-pressed={isSelected}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            choose();
                          }}
                          className={`touch-target p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 text-left ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 text-sm">{intensity.label}</div>
                          <div className="text-xs sm:text-sm text-slate-600">{intensity.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Push Notifications */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Push Notifications
                  </h2>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-slate-900 text-sm sm:text-base">Exercise Reminders</p>
                    <p className="text-xs sm:text-sm text-slate-500">Get notified when it's time for your snack</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.exerciseReminders}
                      onChange={(e) => setNotifications({ ...notifications, exerciseReminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-slate-900 text-sm sm:text-base">Daily Streak</p>
                    <p className="text-xs sm:text-sm text-slate-500">Daily reminder to maintain your streak</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.dailyStreak}
                      onChange={(e) => setNotifications({ ...notifications, dailyStreak: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-slate-900 text-sm sm:text-base">Weekly Progress</p>
                    <p className="text-xs sm:text-sm text-slate-500">Summary of your weekly activity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.weeklyProgress}
                      onChange={(e) => setNotifications({ ...notifications, weeklyProgress: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-slate-900 text-sm sm:text-base">New Exercises</p>
                    <p className="text-xs sm:text-sm text-slate-500">When new exercises are added</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.newExercises}
                      onChange={(e) => setNotifications({ ...notifications, newExercises: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Email Notifications */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Email Notifications
                  </h2>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-slate-900 text-sm sm:text-base">Email Updates</p>
                  <p className="text-xs sm:text-sm text-slate-500">Receive updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            </section>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Help & Support */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Help & Support
              </h2>
              <div className="space-y-2">
                <button className="touch-target w-full flex items-center justify-between p-3 sm:p-4 hover:bg-stone-50 active:scale-[0.98] rounded-lg sm:rounded-xl transition-all">
                  <span className="text-slate-700 font-medium text-sm sm:text-base">Help Center</span>
                  <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
                </button>
                <button className="touch-target w-full flex items-center justify-between p-3 sm:p-4 hover:bg-stone-50 active:scale-[0.98] rounded-lg sm:rounded-xl transition-all">
                  <span className="text-slate-700 font-medium text-sm sm:text-base">Contact Support</span>
                  <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
                </button>
                <button className="touch-target w-full flex items-center justify-between p-3 sm:p-4 hover:bg-stone-50 active:scale-[0.98] rounded-lg sm:rounded-xl transition-all">
                  <span className="text-slate-700 font-medium text-sm sm:text-base">Privacy Policy</span>
                  <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
                </button>
                <button className="touch-target w-full flex items-center justify-between p-3 sm:p-4 hover:bg-stone-50 active:scale-[0.98] rounded-lg sm:rounded-xl transition-all">
                  <span className="text-slate-700 font-medium text-sm sm:text-base">Terms of Service</span>
                  <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
                </button>
              </div>
            </section>

            {/* App Information */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                About
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm">App Version</span>
                  <span className="text-slate-900 font-medium text-sm">1.0.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm">Build Number</span>
                  <span className="text-slate-900 font-medium text-sm">2024.01</span>
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border-2 border-red-100">
              <h2 className="text-lg font-semibold text-red-900 mb-4">
                Danger Zone
              </h2>
              <div className="space-y-3">
                <button
                  onClick={handleSignOut}
                  className="touch-target w-full flex items-center justify-center gap-2 p-3 sm:p-4 bg-red-50 hover:bg-red-100 active:scale-95 border-2 border-red-200 text-red-700 font-semibold rounded-lg sm:rounded-xl transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
                <button className="touch-target w-full flex items-center justify-center gap-2 p-3 sm:p-4 bg-white hover:bg-red-50 active:scale-95 border-2 border-red-200 text-red-600 font-medium rounded-lg sm:rounded-xl transition-all text-sm">
                  Delete Account
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
