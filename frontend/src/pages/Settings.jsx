export default function Settings() {
  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-semibold text-gray-700">Configuration</h2>
        <p className="text-sm text-gray-500">
          All settings are managed via the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env</code> file
          on the server. Restart the backend after making changes.
        </p>

        <div className="space-y-3 text-sm">
          {[
            { key: "YOUTUBE_API_KEY",          desc: "YouTube Data API v3 key" },
            { key: "SPOTIFY_CLIENT_ID/SECRET", desc: "Spotify app credentials" },
            { key: "INSTAGRAM_USERNAME",        desc: "Instagram scraper account" },
            { key: "TIKTOK_SESSION_ID",         desc: "TikTok session cookie" },
            { key: "GMAIL_ADDRESS",             desc: "Cold email sender address" },
            { key: "GMAIL_APP_PASSWORD",        desc: "Gmail App Password (16-char)" },
            { key: "CALENDLY_LINK",             desc: "Your Calendly booking URL" },
            { key: "DAILY_EMAIL_LIMIT",         desc: "Max emails per day (default: 200)" },
            { key: "DAILY_INSTAGRAM_DM_LIMIT",  desc: "Max Instagram DMs per day (default: 50)" },
            { key: "DAILY_SCRAPE_TARGET",       desc: "Creators to scrape per day (default: 1000)" },
            { key: "SCRAPE_HOUR",               desc: "Hour to auto-scrape (default: 6 = 6AM)" },
            { key: "OUTREACH_HOUR",             desc: "Hour to auto-outreach (default: 10 = 10AM)" },
            { key: "API_BASE_URL",              desc: "VPS public URL for tracking pixels" },
          ].map(({ key, desc }) => (
            <div key={key} className="flex gap-4">
              <code className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700 font-mono w-52 shrink-0">{key}</code>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-3">
        <h2 className="font-semibold text-gray-700">Email Sequence Schedule</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Day 0 — First email sent on enrollment</p>
          <p>Day 3 — Follow-up #1</p>
          <p>Day 7 — Follow-up #2</p>
          <p>Day 11 — Follow-up #3</p>
          <p>Day 14 — Final email (soft close)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-3">
        <h2 className="font-semibold text-gray-700">Instagram DM Schedule</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Day 0 — First DM on enrollment</p>
          <p>Day 4 — Follow-up #1</p>
          <p>Day 8 — Follow-up #2</p>
          <p>Day 14 — Final DM (soft close)</p>
        </div>
      </div>
    </div>
  );
}
