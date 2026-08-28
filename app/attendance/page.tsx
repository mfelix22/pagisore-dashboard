"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Member = {
  id: number;
  ign: string;
  job: string | null;
  is_active: boolean;
};

type Event = {
  id: number;
  name: string;
  event_date: string | null;
};

type AttendanceRecord = {
  member_id: number;
  event_id: number;
  status: string;
};

type Counts = {
  hadir: number;
  tentative: number;
  tidak_hadir: number;
};

function formatEventDate(date: string | null): string {
  if (!date) return "No date";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatJob(job: string | null) {
  if (!job || job.trim() === "") return "—";
  return job;
}

function getStatusStyle(status: string) {
  if (status === "hadir") {
    return "bg-[#3ba55d]/15 text-[#3ba55d]";
  }
  if (status === "tentative") {
    return "bg-[#faa61a]/15 text-[#faa61a]";
  }
  if (status === "tidak_hadir" || status === "not_attending") {
    return "bg-red-500/15 text-red-400";
  }
  return "bg-[#383a40] text-[#b5bac1]";
}

function getStatusDisplay(status: string) {
  if (status === "hadir") return "Hadir";
  if (status === "tentative") return "Tentative";
  if (status === "tidak_hadir") return "Tidak Hadir";
  if (status === "not_attending") return "Tidak Hadir";
  return "No response";
}

export default function AttendanceReportPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);

      const [{ data: membersData, error: membersError }, { data: eventsData, error: eventsError }, { data: recordsData, error: recordsError }] = await Promise.all([
        supabase.from("members").select("id, ign, job, is_active").order("ign", { ascending: true }),
        supabase.from("events").select("id, name, event_date").order("event_date", { ascending: false }),
        supabase.from("event_attendance").select("member_id, event_id, status"),
      ]);

      if (membersError) {
        setLoadError(`Failed to load members: ${membersError.message}`);
        setMembers([]);
      } else {
        setMembers((membersData as Member[]) ?? []);
      }

      if (eventsError) {
        console.error("Failed to load events:", eventsError);
        setEvents([]);
      } else {
        setEvents((eventsData as Event[]) ?? []);
      }

      if (recordsError) {
        console.error("Failed to load attendance:", recordsError);
        setRecords([]);
      } else {
        setRecords((recordsData as AttendanceRecord[]) ?? []);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const memberCounts = useMemo(() => {
    const map = new Map<number, Counts>();
    records.forEach((r) => {
      if (!map.has(r.member_id)) {
        map.set(r.member_id, { hadir: 0, tentative: 0, tidak_hadir: 0 });
      }
      const c = map.get(r.member_id)!;
      if (r.status === "hadir") c.hadir++;
      else if (r.status === "tentative") c.tentative++;
      else if (r.status === "tidak_hadir" || r.status === "not_attending") c.tidak_hadir++;
    });
    return map;
  }, [records]);

  const eventStatusMap = useMemo(() => {
    const map = new Map<number, Map<number, string>>();
    records.forEach((r) => {
      if (!map.has(r.event_id)) {
        map.set(r.event_id, new Map());
      }
      map.get(r.event_id)!.set(r.member_id, r.status);
    });
    return map;
  }, [records]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        m.ign.toLowerCase().includes(q) ||
        (m.job ?? "").toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [members, search]);

  const tableRows = useMemo(() => {
    return filteredMembers.map((m) => {
      if (selectedEventId == null) {
        const counts = memberCounts.get(m.id) ?? { hadir: 0, tentative: 0, tidak_hadir: 0 };
        return { ...m, counts, status: null };
      }
      const raw = eventStatusMap.get(selectedEventId)?.get(m.id) ?? "no_response";
      const status = raw === "not_attending" ? "tidak_hadir" : raw;
      return { ...m, counts: null, status };
    });
  }, [filteredMembers, selectedEventId, memberCounts, eventStatusMap]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  async function updateAttendance(memberId: number, newStatus: string) {
    if (!selectedEventId) return;
    setSavingMemberId(memberId);
    setLoadError(null);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          eventId: selectedEventId,
          status: newStatus,
        }),
      });

      const text = await res.text();
      let data: { success?: boolean; error?: string } = { success: false };
      try {
        data = text ? JSON.parse(text) : data;
      } catch {
        throw new Error(text || `Server error: ${res.status}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update attendance");
      }

      setRecords((prev) => {
        if (newStatus === "no_response") {
          return prev.filter(
            (r) => !(r.member_id === memberId && r.event_id === selectedEventId)
          );
        }
        const index = prev.findIndex(
          (r) => r.member_id === memberId && r.event_id === selectedEventId
        );
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], status: newStatus };
          return next;
        }
        return [
          ...prev,
          { member_id: memberId, event_id: selectedEventId, status: newStatus },
        ];
      });
    } catch (err) {
      console.error("Failed to update attendance:", err);
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to update attendance";
      setLoadError(errorMessage);
    } finally {
      setSavingMemberId(null);
      setEditingMemberId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <main className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[#f2f3f5] sm:text-3xl">
            Attendance Report
          </h1>
          <Link
            href="/"
            className="rounded-md bg-[#383a40] px-3 py-1.5 text-sm font-medium text-[#f2f3f5] hover:bg-[#2b2d31]"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="mb-4 grid gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="flex-1">
            <select
              value={selectedEventId ?? "all"}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedEventId(v === "all" ? null : Number(v));
                setEditingMemberId(null);
                setSavingMemberId(null);
              }}
              className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-3 text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2] sm:w-80"
            >
              <option value="all">All events</option>
              {events.map((event) => (
                <option key={event.id} value={String(event.id)}>
                  {event.name} — {formatEventDate(event.event_date)}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-3 text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2] sm:w-64"
          />
        </section>

        {selectedEvent && (
          <p className="mb-4 text-sm text-[#b5bac1]">
            Showing attendance for: {selectedEvent.name} — {formatEventDate(selectedEvent.event_date)}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[#b5bac1]">Loading attendance data...</p>
        ) : loadError ? (
          <p className="text-sm text-red-400">{loadError}</p>
        ) : tableRows.length === 0 ? (
          <p className="text-sm text-[#b5bac1]">No members found.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl bg-[#2b2d31] shadow-lg ring-1 ring-white/5 sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1e1f22] text-[#b5bac1]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">IGN</th>
                    <th className="px-4 py-3 font-semibold">Job</th>
                    {selectedEventId == null ? (
                      <>
                        <th className="px-4 py-3 text-center font-semibold">Hadir</th>
                        <th className="px-4 py-3 text-center font-semibold">Tentative</th>
                        <th className="px-4 py-3 text-center font-semibold">Tidak Hadir</th>
                        <th className="px-4 py-3 text-center font-semibold">Total</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                        <th className="px-4 py-3 text-center font-semibold">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383a40]">
                  {tableRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#383a40]/30">
                      <td className="px-4 py-3 font-medium text-[#f2f3f5]">{row.ign}</td>
                      <td className="px-4 py-3 text-[#b5bac1]">{formatJob(row.job)}</td>
                      {row.counts ? (
                        <>
                          <td className="px-4 py-3 text-center font-bold text-[#3ba55d]">{row.counts.hadir}</td>
                          <td className="px-4 py-3 text-center font-bold text-[#faa61a]">{row.counts.tentative}</td>
                          <td className="px-4 py-3 text-center font-bold text-red-400">{row.counts.tidak_hadir}</td>
                          <td className="px-4 py-3 text-center font-bold text-[#f2f3f5]">
                            {row.counts.hadir + row.counts.tentative + row.counts.tidak_hadir}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-center">
                            {editingMemberId === row.id ? (
                              <select
                                value={row.status ?? "no_response"}
                                onChange={(e) =>
                                  updateAttendance(row.id, e.target.value)
                                }
                                disabled={savingMemberId === row.id}
                                className="w-32 rounded-md border border-[#383a40] bg-[#1e1f22] px-2 py-1 text-sm text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none"
                              >
                                <option value="hadir">Hadir</option>
                                <option value="tentative">Tentative</option>
                                <option value="tidak_hadir">Tidak Hadir</option>
                                <option value="no_response">No response</option>
                              </select>
                            ) : (
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusStyle(row.status ?? "no_response")}`}>
                                {getStatusDisplay(row.status ?? "no_response")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editingMemberId === row.id ? (
                              savingMemberId === row.id ? (
                                <span className="text-xs text-[#b5bac1]">Saving...</span>
                              ) : (
                                <button
                                  onClick={() => setEditingMemberId(null)}
                                  className="rounded-md bg-[#383a40] px-2 py-1 text-xs font-medium text-[#f2f3f5] hover:bg-[#2b2d31]"
                                >
                                  Cancel
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => setEditingMemberId(row.id)}
                                className="rounded-md bg-[#5865f2] px-2 py-1 text-xs font-medium text-white hover:bg-[#4752c4]"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {tableRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl bg-[#2b2d31] p-4 shadow-lg ring-1 ring-white/5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold text-[#f2f3f5]">{row.ign}</span>
                    {row.status != null ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusStyle(row.status)}`}>
                        {getStatusDisplay(row.status)}
                      </span>
                    ) : (
                      <span className="text-sm text-[#b5bac1]">
                        Total: {row.counts ? row.counts.hadir + row.counts.tentative + row.counts.tidak_hadir : 0}
                      </span>
                    )}
                  </div>
                  <p className="mb-1 text-sm text-[#b5bac1]">
                    <span className="text-[#b5bac1]/70">Job:</span> {formatJob(row.job)}
                  </p>
                  {row.counts && (
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-xs text-[#b5bac1]">Hadir</p>
                        <p className="font-bold text-[#3ba55d]">{row.counts.hadir}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#b5bac1]">Tentative</p>
                        <p className="font-bold text-[#faa61a]">{row.counts.tentative}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#b5bac1]">Tidak Hadir</p>
                        <p className="font-bold text-red-400">{row.counts.tidak_hadir}</p>
                      </div>
                    </div>
                  )}

                  {selectedEventId != null && (
                    <div className="mt-3">
                      {editingMemberId === row.id ? (
                        <select
                          value={row.status ?? "no_response"}
                          onChange={(e) =>
                            updateAttendance(row.id, e.target.value)
                          }
                          disabled={savingMemberId === row.id}
                          className="w-full rounded-md border border-[#383a40] bg-[#1e1f22] px-2 py-1.5 text-sm text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none"
                        >
                          <option value="hadir">Hadir</option>
                          <option value="tentative">Tentative</option>
                          <option value="tidak_hadir">Tidak Hadir</option>
                          <option value="no_response">No response</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingMemberId(row.id)}
                          className="w-full rounded-md bg-[#5865f2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4]"
                        >
                          Edit Status
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
