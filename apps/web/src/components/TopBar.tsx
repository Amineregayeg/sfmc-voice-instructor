import { useAppStore } from "../store/appStore";
import { LANGUAGES, VOICES } from "@mvp-voice-agent/shared";

export function TopBar() {
  const { settings, setLanguage, setVoice, showSettings, toggleSettings } = useAppStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-20 bg-dark-bg-secondary/90 backdrop-blur-sm border-b border-dark-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* App title */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-warm-yellow animate-pulse-slow" />
          <h1 className="text-xl font-bold text-dark-text">
            SFMC Voice Instructor
          </h1>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Language toggle */}
          <div className="flex gap-1 bg-dark-bg-tertiary rounded-lg p-1">
            {Object.values(LANGUAGES).map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  settings.language === lang.code
                    ? "bg-warm-yellow text-dark-bg"
                    : "text-dark-text-secondary hover:text-dark-text"
                }`}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>

          {/* Voice selector */}
          <select
            value={settings.voice}
            onChange={(e) => setVoice(e.target.value as any)}
            className="bg-dark-bg-tertiary text-dark-text px-3 py-1.5 rounded-lg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-warm-yellow"
          >
            {Object.values(VOICES).map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
          </select>

          {/* Settings button */}
          <button
            onClick={toggleSettings}
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? "bg-warm-yellow text-dark-bg"
                : "bg-dark-bg-tertiary text-dark-text-secondary hover:text-dark-text"
            }`}
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
