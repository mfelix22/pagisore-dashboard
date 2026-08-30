"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Template = {
  event_name: string;
  content: string;
};

const EVENTS = [
  { name: "Guild League", label: "Guild League (GL)" },
  { name: "Emperium Overrun", label: "Emperium Overrun (EO)" },
];

export default function SettingsPage() {
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/attendance-templates");
      const json = (await res.json()) as {
        success: boolean;
        data?: Template[];
        error?: string;
      };

      if (json.success && json.data) {
        const map: Record<string, string> = {};
        json.data.forEach((t) => {
          map[t.event_name] = t.content;
        });
        setTemplates(map);
      } else {
        setMessage(json.error || "Failed to load settings.");
      }
    } catch {
      setMessage("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  function update(eventName: string, value: string) {
    setTemplates((prev) => ({ ...prev, [eventName]: value }));
  }

  async function save(eventName: string) {
    setSaving((prev) => ({ ...prev, [eventName]: true }));
    setMessage(null);

    try {
      const res = await fetch("/api/attendance-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: eventName,
          content: templates[eventName] || "",
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };

      if (json.success) {
        setMessage(`${eventName} text saved.`);
      } else {
        setMessage(json.error || `Failed to save ${eventName}.`);
      }
    } catch {
      setMessage(`Failed to save ${eventName}.`);
    } finally {
      setSaving((prev) => ({ ...prev, [eventName]: false }));
    }
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <main className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[#f2f3f5] sm:text-3xl">
            Settings
          </h1>
          <Link
            href="/"
            className="rounded-md bg-[#383a40] px-3 py-1.5 text-sm font-medium text-[#f2f3f5] hover:bg-[#2b2d31]"
          >
            Back to Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-md px-4 py-3 text-sm ${
              message.startsWith("Failed")
                ? "bg-red-500/15 text-red-400"
                : "bg-[#3ba55d]/15 text-[#3ba55d]"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#b5bac1]">Loading settings...</p>
        ) : (
          <div className="space-y-6">
            {EVENTS.map((event) => (
              <section
                key={event.name}
                className="rounded-2xl bg-[#2b2d31] p-4 shadow-lg ring-1 ring-white/5 sm:p-6"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#f2f3f5]">
                    {event.label} Message
                  </h2>
                  <button
                    onClick={() => save(event.name)}
                    disabled={saving[event.name]}
                    className="rounded-md bg-[#5865f2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-60"
                  >
                    {saving[event.name] ? "Saving..." : "Save"}
                  </button>
                </div>

                <p className="mb-2 text-xs text-[#b5bac1]">
                  This text is posted above the attendance embed. Use{" "}
                  <code className="rounded bg-[#1e1f22] px-1 py-0.5 text-[#f2f3f5]">
                    {"@everyone"}
                  </code>{" "}
                  and{" "}
                  <code className="rounded bg-[#1e1f22] px-1 py-0.5 text-[#f2f3f5]">
                    {"{attendance_channel}"}
                  </code>{" "}
                  for the attendance channel mention.
                </p>

                <textarea
                  value={templates[event.name] || ""}
                  onChange={(e) => update(event.name, e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-3 text-sm text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2]"
                  placeholder={`Type the ${event.label} attendance post message here...`}
                />
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
