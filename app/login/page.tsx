"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Wrong password");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-[#2b2d31] p-6 shadow-2xl ring-1 ring-white/10">
        <h1 className="mb-4 text-xl font-bold text-[#f2f3f5]">Officer Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="officer-password"
              className="mb-1 block text-sm font-medium text-[#b5bac1]"
            >
              Officer Password
            </label>
            <input
              id="officer-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter officer password"
              className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-3 text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2]"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#5865f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-60"
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
