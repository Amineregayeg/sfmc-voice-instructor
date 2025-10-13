import { useAppStore } from "../store/appStore";

export function SettingsPanel() {
  const { showSettings, transcript, clearTranscript } = useAppStore();

  if (!showSettings) return null;

  return (
    <div className="fixed top-16 right-4 z-30 w-96 max-h-[calc(100vh-8rem)] bg-dark-bg-secondary border border-dark-border rounded-lg shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-dark-border">
        <h2 className="text-lg font-bold text-dark-text">Session Info</h2>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
        {/* Transcript */}
        <div className="p-4 border-b border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-dark-text-secondary">Transcript</h3>
            {transcript && (
              <button
                onClick={clearTranscript}
                className="text-xs text-warm-yellow hover:text-warm-yellow-glow"
              >
                Clear
              </button>
            )}
          </div>
          <div className="bg-dark-bg-tertiary rounded p-3 min-h-[100px] max-h-[300px] overflow-y-auto">
            {transcript ? (
              <p className="text-sm text-dark-text whitespace-pre-wrap font-mono">{transcript}</p>
            ) : (
              <p className="text-sm text-dark-text-muted italic">
                Conversation transcript will appear here...
              </p>
            )}
          </div>
        </div>

        {/* About SFMC Instructor */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-dark-text-secondary mb-2">
            About SFMC Instructor
          </h3>
          <div className="text-xs text-dark-text-muted space-y-2">
            <p>
              Your AI-powered Salesforce Marketing Cloud expert. Ask questions about:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Email Studio & campaign management</li>
              <li>Journey Builder & automation</li>
              <li>Data Extensions & segmentation</li>
              <li>AMPscript & SSJS development</li>
              <li>Deliverability & compliance</li>
              <li>Content Builder & assets</li>
            </ul>
            <p className="mt-3 pt-3 border-t border-dark-border">
              The instructor adapts to your chosen language and provides cited references to
              official Salesforce documentation.
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="p-4 bg-warm-yellow/5 border-t border-dark-border">
          <h3 className="text-sm font-semibold text-warm-yellow mb-2">Tips</h3>
          <ul className="text-xs text-dark-text-muted space-y-1">
            <li>• Speak clearly and naturally</li>
            <li>• You can interrupt the assistant at any time</li>
            <li>• Request mini-quizzes to test your knowledge</li>
            <li>• Ask for real-world scenarios and examples</li>
            <li>• Switch languages anytime in the top bar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
