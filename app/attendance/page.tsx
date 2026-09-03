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
  reason: string | null;
};

type Counts = {
  hadir: number;
  izin: number;
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

function formatEventDateCompact(date: string | null): string {
  if (!date) return "No date";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatJob(job: string | null) {
  if (!job || job.trim() === "") return "—";
  return job;
}

function shortenEventName(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getStatusStyle(status: string) {
  if (status === "hadir") {
    return "bg-[#3ba55d]/15 text-[#3ba55d]";
  }
  if (status === "izin") {
    return "bg-[#faa61a]/15 text-[#faa61a]";
  }
  if (status === "tidak_hadir" || status === "not_attending") {
    return "bg-red-500/15 text-red-400";
  }
  return "bg-[#383a40] text-[#b5bac1]";
}

function getStatusTextColor(status: string) {
  if (status === "hadir") {
    return "text-[#3ba55d]";
  }
  if (status === "izin") {
    return "text-[#faa61a]";
  }
  if (status === "tidak_hadir" || status === "not_attending") {
    return "text-red-400";
  }
  return "text-[#f2f3f5]";
}

function getTimelineDotColor(status: string) {
  if (status === "hadir") return "bg-[#3ba55d]";
  if (status === "izin") return "bg-[#faa61a]";
  if (status === "tidak_hadir") return "bg-red-400";
  return "bg-[#383a40]";
}

function getStatusDisplay(status: string) {
  if (status === "hadir") return "Hadir";
  if (status === "izin") return "Izin";
  if (status === "tidak_hadir" || status === "not_attending") return "Tidak Hadir";
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
  const [bulkMode, setBulkMode] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [pendingReasons, setPendingReasons] = useState<Record<number, string>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkInit, setBulkInit] = useState(false);

  async function loadRecords() {
    const res = await fetch("/api/attendance", { cache: "no-store" });
    const text = await res.text();
    let recordsData: AttendanceRecord[] = [];
    try {
      const json = text ? JSON.parse(text) : { success: false };
      if (res.ok && json.success && Array.isArray(json.data)) {
        recordsData = json.data;
      } else {
        console.error("Failed to load attendance:", json.error || text);
      }
    } catch {
      console.error("Failed to parse attendance response:", text);
    }
    setRecords(
      recordsData.map((r) => ({
        ...r,
        member_id: Number(r.member_id),
        event_id: Number(r.event_id),
      }))
    );
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);

      const [{ data: membersData, error: membersError }, { data: eventsData, error: eventsError }] = await Promise.all([
        supabase.from("members").select("id, ign, job, is_active").order("ign", { ascending: true }),
        supabase.from("events").select("id, name, event_date").order("event_date", { ascending: false }),
      ]);

      if (membersError) {
        setLoadError(`Failed to load members: ${membersError.message}`);
        setMembers([]);
      } else {
        const active = ((membersData as Member[]) ?? []).map((m) => ({
          ...m,
          id: Number(m.id),
        })).filter((m) => m.is_active);
        setMembers(active);
      }

      if (eventsError) {
        console.error("Failed to load events:", eventsError);
        setEvents([]);
      } else {
        setEvents(((eventsData as Event[]) ?? []).map((e) => ({
          ...e,
          id: Number(e.id),
        })));
      }

      await loadRecords();

      setLoading(false);
    }

    loadData();
  }, []);

  const memberCounts = useMemo(() => {
    const map = new Map<number, Counts>();
    records.forEach((r) => {
      if (!map.has(r.member_id)) {
        map.set(r.member_id, { hadir: 0, izin: 0, tentative: 0, tidak_hadir: 0 });
      }
      const c = map.get(r.member_id)!;
      if (r.status === "hadir") c.hadir++;
      else if (r.status === "izin") c.izin++;
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

  const absentStreaks = useMemo(() => {
    const map = new Map<number, number>();
    members.forEach((m) => {
      let streak = 0;
      for (const event of events) {
        const status = eventStatusMap.get(event.id)?.get(m.id);
        if (status === "tidak_hadir" || status === "not_attending") {
          streak++;
        } else {
          break;
        }
      }
      map.set(m.id, streak);
    });
    return map;
  }, [members, events, eventStatusMap]);

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

  const memberTimelines = useMemo(() => {
    const recentEvents = events.slice(0, 12);
    const map = new Map<number, string[]>();
    members.forEach((m) => {
      const statuses = recentEvents.map((e) => {
        const raw = eventStatusMap.get(e.id)?.get(m.id) ?? "no_response";
        return raw === "not_attending" ? "tidak_hadir" : raw;
      });
      map.set(m.id, statuses);
    });
    return map;
  }, [members, events, eventStatusMap]);

  const tableRows = useMemo(() => {
    return filteredMembers.map((m) => {
      if (selectedEventId == null) {
        const counts = memberCounts.get(m.id) ?? { hadir: 0, izin: 0, tentative: 0, tidak_hadir: 0 };
        const total = counts.hadir + counts.izin + counts.tidak_hadir;
        const rate = total > 0 ? Math.round((counts.hadir / total) * 100) : 0;
        return {
          ...m,
          counts,
          rate,
          absentStreak: absentStreaks.get(m.id) ?? 0,
          timeline: memberTimelines.get(m.id) ?? [],
          status: null,
        };
      }
      const raw = eventStatusMap.get(selectedEventId)?.get(m.id) ?? "no_response";
      const status = raw === "not_attending" ? "tidak_hadir" : raw;
      return { ...m, counts: null, rate: null, absentStreak: null, timeline: null, status };
    });
  }, [filteredMembers, selectedEventId, memberCounts, eventStatusMap, absentStreaks, memberTimelines]);

  useEffect(() => {
    if (bulkMode && !bulkInit && selectedEventId != null) {
      const initialStatus: Record<number, string> = {};
      const initialReasons: Record<number, string> = {};
      members.forEach((m) => {
        const raw =
          eventStatusMap.get(selectedEventId)?.get(m.id) ?? "no_response";
        const status = raw === "not_attending" ? "tidak_hadir" : raw;
        initialStatus[m.id] = status;
        const record = records.find(
          (r) => r.member_id === m.id && r.event_id === selectedEventId
        );
        if (record?.reason) {
          initialReasons[m.id] = record.reason;
        }
      });
      setPendingStatus(initialStatus);
      setPendingReasons(initialReasons);
      setBulkInit(true);
    }
    if (!bulkMode && bulkInit) {
      setPendingStatus({});
      setPendingReasons({});
      setBulkInit(false);
    }
  }, [bulkMode, bulkInit, selectedEventId, members, eventStatusMap, records]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const selectedEventCounts = useMemo(() => {
    if (selectedEventId == null) return null;
    const counts = { hadir: 0, izin: 0, tidak_hadir: 0, no_response: 0 };
    members.forEach((m) => {
      const raw =
        eventStatusMap.get(selectedEventId)?.get(m.id) ?? "no_response";
      const status = raw === "not_attending" ? "tidak_hadir" : raw;
      if (status === "hadir") counts.hadir++;
      else if (status === "izin") counts.izin++;
      else if (status === "tidak_hadir") counts.tidak_hadir++;
      else counts.no_response++;
    });
    return counts;
  }, [selectedEventId, members, eventStatusMap]);

  const personalReasons = useMemo(() => {
    const list: {
      ign: string;
      reason: string;
      status: string;
      hasReason: boolean;
      eventName?: string;
      eventDate?: string;
    }[] = [];
    const membersById = new Map(members.map((m) => [m.id, m]));

    if (selectedEventId != null) {
      records.forEach((r) => {
        if (r.event_id !== selectedEventId) return;
        if (
          r.status !== "izin" &&
          r.status !== "tidak_hadir" &&
          r.status !== "not_attending" &&
          r.status !== "no_response"
        )
          return;
        const member = membersById.get(r.member_id);
        if (!member) return;
        const isNoResponse = r.status === "no_response";
        const isTidakHadir =
          r.status === "tidak_hadir" || r.status === "not_attending";
        const isIzin = r.status === "izin";
        const reasonText = isTidakHadir || isIzin
          ? r.reason?.trim() || "No reason"
          : "No response";
        let status = "tidak_hadir";
        if (isNoResponse) status = "no_response";
        else if (isIzin) status = "izin";
        list.push({
          ign: member.ign,
          status,
          hasReason: (isTidakHadir || isIzin) && !!r.reason?.trim(),
          reason: reasonText,
        });
      });
    } else {
      const latestEvent = events[0];
      if (latestEvent) {
        const recordsByKey = new Map(
          records.map((r) => [`${r.member_id}-${r.event_id}`, r])
        );
        members.forEach((m) => {
          const raw =
            eventStatusMap.get(latestEvent.id)?.get(m.id) ?? "no_response";
          const status = raw === "not_attending" ? "tidak_hadir" : raw;
          if (status === "hadir") return;
          const record = recordsByKey.get(`${m.id}-${latestEvent.id}`);
          const isTidakHadir = status === "tidak_hadir";
          const isIzin = status === "izin";
          list.push({
            ign: m.ign,
            status,
            hasReason: (isTidakHadir || isIzin) && !!record?.reason?.trim(),
            reason: isTidakHadir || isIzin
              ? record?.reason?.trim() || "No reason"
              : "No response",
            eventName: latestEvent.name,
            eventDate: latestEvent.event_date
              ? formatEventDate(latestEvent.event_date)
              : undefined,
          });
        });
      }
    }
    return list.sort((a, b) => a.ign.localeCompare(b.ign));
  }, [selectedEventId, records, members, events]);

  async function updateAttendance(memberId: number, newStatus: string) {
    if (!selectedEventId) return;

    let reason: string | null = null;
    if (newStatus === "izin") {
      const input = window.prompt("Reason for Izin (optional):");
      if (input === null) {
        setEditingMemberId(null);
        return;
      }
      reason = input.trim() || null;
    }

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
          reason,
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
          next[index] = { ...next[index], status: newStatus, reason };
          return next;
        }
        return [
          ...prev,
          {
            member_id: memberId,
            event_id: selectedEventId,
            status: newStatus,
            reason,
          },
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

  async function bulkUpdateAttendance() {
    if (!selectedEventId || !bulkInit || bulkSaving) return;

    setBulkSaving(true);
    setLoadError(null);

    const failures: { id: number; error: string }[] = [];

    try {
      for (const m of members) {
        const original =
          eventStatusMap.get(selectedEventId)?.get(m.id) ?? "no_response";
        const originalStatus =
          original === "not_attending" ? "tidak_hadir" : original;
        const newStatus = pendingStatus[m.id] ?? originalStatus;
        const needsReason = newStatus === "izin";
        const newReason = needsReason ? (pendingReasons[m.id]?.trim() || null) : null;

        const statusChanged = newStatus !== originalStatus;
        const record = records.find(
          (r) => r.member_id === m.id && r.event_id === selectedEventId
        );
        const reasonChanged =
          needsReason &&
          (!!record?.reason || !!newReason) &&
          (record?.reason?.trim() || null) !== newReason;

        if (!statusChanged && !reasonChanged) continue;

        try {
          const res = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberId: m.id,
              eventId: selectedEventId,
              status: newStatus,
              reason: newReason,
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
                (r) => !(r.member_id === m.id && r.event_id === selectedEventId)
              );
            }
            const index = prev.findIndex(
              (r) => r.member_id === m.id && r.event_id === selectedEventId
            );
            if (index >= 0) {
              const next = [...prev];
              next[index] = { ...next[index], status: newStatus, reason: newReason };
              return next;
            }
            return [
              ...prev,
              {
                member_id: m.id,
                event_id: selectedEventId,
                status: newStatus,
                reason: newReason,
              },
            ];
          });
        } catch (err) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Failed";
          console.error(`Bulk update failed for member ${m.id}:`, err);
          failures.push({ id: m.id, error: message });
        }
      }

      await loadRecords();

      if (failures.length > 0) {
        throw new Error(
          `Failed to update ${failures.length} member(s).`
        );
      }

      setBulkMode(false);
    } catch (err) {
      console.error("Bulk update failed:", err);
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to update attendance";
      setLoadError(errorMessage);
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <main className="mx-auto w-full max-w-full">
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
                setBulkMode(false);
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {selectedEventId != null && (
              <button
                onClick={() => {
                  setBulkMode((prev) => !prev);
                  setEditingMemberId(null);
                  setSavingMemberId(null);
                }}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                  bulkMode
                    ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                    : "bg-[#5865f2] text-white hover:bg-[#4752c4]"
                }`}
              >
                {bulkMode ? "Cancel" : "Bulk Edit"}
              </button>
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-3 text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2] sm:w-64"
            />
          </div>
        </section>

        {bulkMode && (
          <section className="mb-4 flex items-center justify-between rounded-xl bg-[#2b2d31] p-3 ring-1 ring-white/5">
            <p className="text-sm text-[#b5bac1]">
              Update each row and click Save.
            </p>
            <button
              onClick={bulkUpdateAttendance}
              disabled={bulkSaving}
              className="rounded-md bg-[#3ba55d] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2d7c46] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkSaving ? "Saving..." : "Save"}
            </button>
          </section>
        )}

        {selectedEvent && (
          <p className="mb-4 text-sm text-[#b5bac1]">
            Showing attendance for: {selectedEvent.name} — {formatEventDate(selectedEvent.event_date)}
          </p>
        )}

        {selectedEventCounts && (
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[#2b2d31] p-3 text-center shadow-lg ring-1 ring-white/5">
              <p className="text-xs text-[#b5bac1]">Hadir</p>
              <p className="text-xl font-bold text-[#3ba55d]">
                {selectedEventCounts.hadir}
              </p>
            </div>
            <div className="rounded-xl bg-[#2b2d31] p-3 text-center shadow-lg ring-1 ring-white/5">
              <p className="text-xs text-[#b5bac1]">Izin</p>
              <p className="text-xl font-bold text-[#faa61a]">
                {selectedEventCounts.izin}
              </p>
            </div>
            <div className="rounded-xl bg-[#2b2d31] p-3 text-center shadow-lg ring-1 ring-white/5">
              <p className="text-xs text-[#b5bac1]">Tidak Hadir</p>
              <p className="text-xl font-bold text-red-400">
                {selectedEventCounts.tidak_hadir}
              </p>
            </div>
            <div className="rounded-xl bg-[#2b2d31] p-3 text-center shadow-lg ring-1 ring-white/5">
              <p className="text-xs text-[#b5bac1]">No Response</p>
              <p className="text-xl font-bold text-[#f2f3f5]">
                {selectedEventCounts.no_response}
              </p>
            </div>
          </section>
        )}

        {selectedEventId != null && personalReasons.length > 0 && (
          <section className="mb-6 rounded-2xl bg-[#2b2d31] p-4 shadow-lg ring-1 ring-white/5 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold text-[#f2f3f5]">
              Who Can't / Didn't Attend
            </h2>
            <div className="space-y-2">
              {personalReasons.map((item) => (
                <div
                  key={item.ign}
                  className="rounded-lg bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/5"
                >
                  <span className="font-medium text-[#f2f3f5]">{item.ign}</span>
                  <span
                    className={`ml-2 inline-flex rounded px-2 py-0.5 text-xs font-semibold ${getStatusStyle(
                      item.status
                    )}`}
                  >
                    {getStatusDisplay(item.status)}
                  </span>
                  {item.hasReason && (
                    <span className="ml-1 text-[#b5bac1]">
                      — {item.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <p className="text-sm text-[#b5bac1]">Loading attendance data...</p>
        ) : loadError ? (
          <p className="text-sm text-red-400">{loadError}</p>
        ) : tableRows.length === 0 ? (
          <p className="text-sm text-[#b5bac1]">No members found.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-4 rounded-xl bg-[#2b2d31] p-3 ring-1 ring-white/5">
              {[
                { color: "bg-[#3ba55d]", label: "Hadir" },
                { color: "bg-[#faa61a]", label: "Izin" },
                { color: "bg-red-400", label: "Tidak Hadir" },
                { color: "bg-[#383a40]", label: "No Response" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`h-4 w-4 rounded ${item.color}`}
                  />
                  <span className="text-xs text-[#b5bac1]">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden w-fit rounded-2xl bg-[#2b2d31] shadow-lg ring-1 ring-white/5 sm:block">
              <table className="w-auto border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#1e1f22] text-[#b5bac1] [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-[#1e1f22]">
                  <tr>
                    <th className="px-1 py-0.5 font-semibold">IGN</th>
                    {selectedEventId == null ? (
                      <>
                        {events.slice(0, 12).reverse().map((e) => (
                          <th
                            key={e.id}
                            className="min-w-0 px-0.5 py-0.5 text-center text-xs font-medium leading-none"
                          >
                            <div>{shortenEventName(e.name)}</div>
                            <div className="text-[10px] font-normal text-[#b5bac1]">
                              {formatEventDateCompact(e.event_date)}
                            </div>
                          </th>
                        ))}
                        <th className="px-0.5 py-0.5 text-center text-xs font-medium">Hadir</th>
                        <th className="px-0.5 py-0.5 text-center text-xs font-medium">Izin</th>
                        <th className="px-0.5 py-0.5 text-center text-xs font-medium">Tidak Hadir</th>
                        <th className="px-0.5 py-0.5 text-center text-xs font-medium">Total</th>
                        <th className="px-0.5 py-0.5 text-center text-xs font-medium">Rate</th>
                        <th className="px-0.5 py-0.5 text-center text-xs font-medium">Streak</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 font-semibold">Job</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                        <th className="px-4 py-3 text-center font-semibold">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383a40]">
                  {tableRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#383a40]/30 ${
                        row.absentStreak && row.absentStreak >= 3
                          ? "bg-red-500/10"
                          : ""
                      }`}
                    >
                      <td className="px-1 py-0.5 font-medium text-[#f2f3f5]">{row.ign}</td>
                      {row.counts ? (
                        <>
                          {row.timeline.slice(0, 12).reverse().map((s, i) => (
                            <td key={i} className="min-w-0 px-0.5 py-0.5 text-center">
                              <span
                                title={getStatusDisplay(s)}
                                className={`inline-block h-3 w-3 rounded-sm ${getTimelineDotColor(
                                  s
                                )}`}
                              />
                            </td>
                          ))}
                          <td className="px-0.5 py-0.5 text-center font-bold text-[#3ba55d]">{row.counts.hadir}</td>
                          <td className="px-0.5 py-0.5 text-center font-bold text-[#faa61a]">{row.counts.izin}</td>
                          <td className="px-0.5 py-0.5 text-center font-bold text-red-400">{row.counts.tidak_hadir}</td>
                          <td className="px-0.5 py-0.5 text-center font-bold text-[#f2f3f5]">
                            {row.counts.hadir + row.counts.izin + row.counts.tidak_hadir}
                          </td>
                          <td className="px-0.5 py-0.5 text-center font-bold text-[#3ba55d]">
                            {row.rate}%
                          </td>
                          <td className="px-0.5 py-0.5 text-center">
                            {row.absentStreak && row.absentStreak >= 3 ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-red-500 px-0.5 py-0 text-[10px] font-bold text-white">
                                {row.absentStreak} streak
                              </span>
                            ) : (
                              <span className="font-bold text-[#f2f3f5]">
                                {row.absentStreak}
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-[#b5bac1]">{formatJob(row.job)}</td>
                          <td className="px-4 py-3 text-center align-middle">
                            {bulkMode ? (
                              <div className="flex flex-col items-center gap-1">
                                <select
                                  value={pendingStatus[row.id] ?? row.status ?? "no_response"}
                                  onChange={(e) => {
                                    setPendingStatus((prev) => ({
                                      ...prev,
                                      [row.id]: e.target.value,
                                    }));
                                  }}
                                  disabled={bulkSaving}
                                  className={`w-32 rounded-md border border-[#383a40] bg-[#1e1f22] px-2 py-1 text-sm ${getStatusTextColor(pendingStatus[row.id] ?? row.status ?? "no_response")} focus:border-[#5865f2] focus:outline-none`}
                                >
                                  <option value="hadir">Hadir</option>
                                  <option value="izin">Izin</option>
                                  <option value="tidak_hadir">Tidak Hadir</option>
                                  <option value="no_response">No response</option>
                                </select>
                                {(pendingStatus[row.id] ?? row.status ?? "no_response") === "izin" && (
                                  <input
                                    type="text"
                                    value={pendingReasons[row.id] ?? ""}
                                    onChange={(e) =>
                                      setPendingReasons((prev) => ({
                                        ...prev,
                                        [row.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Reason"
                                    className="w-32 rounded-md border border-[#383a40] bg-[#1e1f22] px-2 py-1 text-xs text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none"
                                  />
                                )}
                              </div>
                            ) : editingMemberId === row.id ? (
                              <select
                                value={row.status ?? "no_response"}
                                onChange={(e) =>
                                  updateAttendance(row.id, e.target.value)
                                }
                                disabled={savingMemberId === row.id}
                                className="w-32 rounded-md border border-[#383a40] bg-[#1e1f22] px-2 py-1 text-sm text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none"
                              >
                                <option value="hadir">Hadir</option>
                                <option value="izin">Izin</option>
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
                            {!bulkMode && (
                              editingMemberId === row.id ? (
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
                              )
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
                  className={`rounded-2xl p-4 shadow-lg ring-1 ${
                    row.absentStreak && row.absentStreak >= 3
                      ? "bg-red-500/10 ring-red-500/50"
                      : "bg-[#2b2d31] ring-white/5"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold text-[#f2f3f5]">{row.ign}</span>
                    {row.status != null && !bulkMode ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusStyle(row.status)}`}>
                        {getStatusDisplay(row.status)}
                      </span>
                    ) : (
                      <span className="text-sm text-[#b5bac1]">
                        Total: {row.counts ? row.counts.hadir + row.counts.izin + row.counts.tidak_hadir : 0}
                      </span>
                    )}
                  </div>
                  <p className="mb-1 text-sm text-[#b5bac1]">
                    <span className="text-[#b5bac1]/70">Job:</span> {formatJob(row.job)}
                  </p>
                  {row.counts && (
                    <>
                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        <div>
                          <p className="text-xs text-[#b5bac1]">Hadir</p>
                          <p className="font-bold text-[#3ba55d]">{row.counts.hadir}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#b5bac1]">Izin</p>
                          <p className="font-bold text-[#faa61a]">{row.counts.izin}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#b5bac1]">Tidak Hadir</p>
                          <p className="font-bold text-red-400">{row.counts.tidak_hadir}</p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-center text-sm">
                        <div>
                          <p className="text-xs text-[#b5bac1]">Rate</p>
                          <p className="font-bold text-[#3ba55d]">{row.rate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#b5bac1]">Streak</p>
                          {row.absentStreak && row.absentStreak >= 3 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                              {row.absentStreak} streak
                            </span>
                          ) : (
                            <p className="font-bold text-[#f2f3f5]">
                              {row.absentStreak}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="mb-1 text-xs text-[#b5bac1]">Last 12</p>
                        <div className="flex flex-wrap gap-1">
                          {row.timeline.slice().reverse().map((s, i) => (
                            <span
                              key={i}
                              title={s}
                              className={`h-2.5 w-2.5 rounded-full ${getTimelineDotColor(
                                s
                              )}`}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedEventId != null && (
                    <div className="mt-3 space-y-2">
                      {bulkMode ? (
                        <>
                          <select
                            value={pendingStatus[row.id] ?? row.status ?? "no_response"}
                            onChange={(e) =>
                              setPendingStatus((prev) => ({
                                ...prev,
                                [row.id]: e.target.value,
                              }))
                            }
                            disabled={bulkSaving}
                            className={`w-full rounded-md border border-[#383a40] bg-[#1e1f22] px-2 py-1.5 text-sm ${getStatusTextColor(pendingStatus[row.id] ?? row.status ?? "no_response")} focus:border-[#5865f2] focus:outline-none`}
                          >
                            <option value="hadir">Hadir</option>
                            <option value="izin">Izin</option>
                                  <option value="tidak_hadir">Tidak Hadir</option>
                            <option value="no_response">No response</option>
                          </select>
                          {(pendingStatus[row.id] ?? row.status ?? "no_response") === "izin" && (
                            <input
                              type="text"
                              value={pendingReasons[row.id] ?? ""}
                              onChange={(e) =>
                                setPendingReasons((prev) => ({
                                  ...prev,
                                  [row.id]: e.target.value,
                                }))
                              }
                              placeholder="Reason"
                              className="w-full rounded-md border border-[#383a40] bg-[#1e1f22] px-2 py-1.5 text-sm text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none"
                            />
                          )}
                        </>
                      ) : editingMemberId === row.id ? (
                        <select
                          value={row.status ?? "no_response"}
                          onChange={(e) =>
                            updateAttendance(row.id, e.target.value)
                          }
                          disabled={savingMemberId === row.id}
                          className="w-full rounded-md border border-[#383a40] bg-[#1e1f22] px-2 py-1.5 text-sm text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none"
                        >
                          <option value="hadir">Hadir</option>
                          <option value="izin">Izin</option>
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
