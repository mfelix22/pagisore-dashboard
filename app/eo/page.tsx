"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SearchableSelect from "./components/SearchableSelect";

const EO_EVENT_NAME = "Emperium Overrun";
const SLOTS_PER_PARTY = 5;
const NOT_ATTENDING_STATUS = "tidak_hadir";

type TimeGroup = "pagi" | "sore" | "malam";

const TIME_GROUPS: TimeGroup[] = ["pagi", "sore", "malam"];

const DISPLAY_GROUP: Record<TimeGroup, string> = {
  pagi: "Pagi",
  sore: "Sore",
  malam: "Malam",
};

type Event = {
  id: number;
  name: string;
  event_type: string;
  event_date: string | null;
};

type Member = {
  id: number;
  ign: string;
  job: string | null;
  is_active: boolean;
};

type AttendanceRecord = {
  member_id: number;
  status: string;
};

type DbParty = {
  id: number;
  event_id: number;
  time_group: string;
  party_number: number;
  raid_leader_member_id: number | null;
  created_at: string;
};

type DbPartyMember = {
  id: number;
  eo_party_id: number;
  member_id: number;
  slot_number: number;
  created_at: string;
};

type Party = {
  dbId?: number | null;
  partyNumber: number;
  slots: (number | null)[];
};

type PartyState = Record<TimeGroup, Party[]>;

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

function buildEoPreview(
  event: Event | null,
  members: Member[],
  parties: PartyState,
  applyTo: Record<TimeGroup, number | null>
): string {
  const lines: string[] = [];
  lines.push("**⚔️ EMPERIUM OVERRUN**");
  lines.push("");
  lines.push(event ? `**${formatEventDate(event.event_date)}**` : "");
  lines.push("");

  TIME_GROUPS.forEach((group) => {
    const groupParties = parties[group].filter((p) =>
      p.slots.some((s) => s != null)
    );
    if (groupParties.length === 0) return;

    const icon =
      group === "pagi" ? "🌅" : group === "sore" ? "🌇" : "🌙";
    const targetId = applyTo[group];
    const target = targetId ? members.find((m) => m.id === targetId) : null;
    const applySuffix = target ? ` — APPLY ${target.ign}` : "";
    lines.push(`**${icon} TEAM ${DISPLAY_GROUP[group].toUpperCase()}**${applySuffix}`);

    groupParties.forEach((party) => {
      const names = party.slots
        .map((memberId, slotIndex) => {
          if (memberId == null) return null;
          const m = members.find((x) => x.id === memberId);
          const name = m ? m.ign : "Unknown";
          const prefix = slotIndex === 0 ? "👑 " : "";
          return `${prefix}${name}`;
        })
        .filter((n): n is string => n != null);
      lines.push(`>>> **Party ${party.partyNumber}** — ${names.join(", ")}`);
    });

    lines.push("");
  });

  return lines.join("\n");
}

function buildSnapshot(
  parties: PartyState,
  applyTo: Record<TimeGroup, number | null>
): string {
  const normalized = {
    applyTo,
    parties: {
      pagi: parties.pagi.map((p) => ({ partyNumber: p.partyNumber, slots: p.slots })),
      sore: parties.sore.map((p) => ({ partyNumber: p.partyNumber, slots: p.slots })),
      malam: parties.malam.map((p) => ({ partyNumber: p.partyNumber, slots: p.slots })),
    },
  };
  return JSON.stringify(normalized);
}

function getStatusBadge(status: string | undefined) {
  if (status === "hadir") {
    return (
      <span className="rounded-full bg-[#3ba55d]/15 px-2 py-0.5 text-xs font-semibold text-[#3ba55d]">
        Hadir
      </span>
    );
  }
  if (status === "tentative") {
    return (
      <span className="rounded-full bg-[#faa61a]/15 px-2 py-0.5 text-xs font-semibold text-[#faa61a]">
        Tentative
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#383a40] px-2 py-0.5 text-xs font-medium text-[#b5bac1]">
      No response
    </span>
  );
}

function getJobColorClass(job: string | null): string {
  if (!job) return "";
  const j = job.toLowerCase();

  if (
    j.includes("swordsman") ||
    j.includes("knight") ||
    j.includes("crusader") ||
    j.includes("lord knight") ||
    j.includes("paladin")
  ) {
    return "text-red-400";
  }

  if (
    j.includes("thief") ||
    j.includes("assassin") ||
    j.includes("rogue") ||
    j.includes("stalker") ||
    j.includes("assassin cross")
  ) {
    return "text-purple-400";
  }

  if (
    j.includes("mage") ||
    j.includes("wizard") ||
    j.includes("sage") ||
    j.includes("professor") ||
    j.includes("scholar") ||
    j.includes("high wizard")
  ) {
    return "text-blue-400";
  }

  if (
    j.includes("archer") ||
    j.includes("hunter") ||
    j.includes("sniper") ||
    j.includes("bard") ||
    j.includes("dancer") ||
    j.includes("clown") ||
    j.includes("gypsy") ||
    j.includes("minstrel")
  ) {
    return "text-yellow-500";
  }

  if (
    j.includes("acolyte") ||
    j.includes("priest") ||
    j.includes("monk") ||
    j.includes("champion") ||
    j.includes("high priest")
  ) {
    return "text-green-400";
  }

  if (
    j.includes("merchant") ||
    j.includes("blacksmith") ||
    j.includes("whitesmith") ||
    j.includes("mastersmith") ||
    j.includes("alchemist") ||
    j.includes("biochemist")
  ) {
    return "text-orange-400";
  }

  if (j.includes("gunslinger")) {
    return "text-black";
  }

  if (j.includes("summoner")) {
    return "text-pink-400";
  }

  return "";
}

function createEmptyParty(partyNumber: number): Party {
  return { partyNumber, slots: Array(SLOTS_PER_PARTY).fill(null) };
}

function createInitialParties(): PartyState {
  return {
    pagi: [1, 2, 3].map(createEmptyParty),
    sore: [1, 2, 3].map(createEmptyParty),
    malam: [1, 2, 3].map(createEmptyParty),
  };
}

function renumberParties(parties: Party[]): Party[] {
  return parties.map((p, i) => ({ ...p, partyNumber: i + 1 }));
}

export default function EmperiumOverrunPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Map<number, string>>(new Map());
  const [parties, setParties] = useState<PartyState>(createInitialParties);
  const [applyTo, setApplyTo] = useState<Record<TimeGroup, number | null>>({
    pagi: null,
    sore: null,
    malam: null,
  });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingParties, setLoadingParties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [partiesError, setPartiesError] = useState<string | null>(null);
  const [timeGroupsError, setTimeGroupsError] = useState<string | null>(null);
  const [loadingTimeGroups, setLoadingTimeGroups] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishMode, setPublishMode] = useState<"publish" | "save-and-publish" | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(true);
      setEventsError(null);

      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_type, event_date")
        .eq("name", EO_EVENT_NAME)
        .order("event_date", { ascending: false });

      if (error) {
        console.error("Failed to load events:", error);
        setEventsError(error.message);
        setEvents([]);
      } else {
        const eoEvents = (data as Event[]) ?? [];
        setEvents(eoEvents);
        if (eoEvents.length > 0) {
          setSelectedEventId(eoEvents[0].id);
        }
      }

      setLoadingEvents(false);
    }

    async function loadMembers() {
      setLoadingMembers(true);

      const { data, error } = await supabase
        .from("members")
        .select("id, ign, job, is_active")
        .eq("is_active", true)
        .order("ign", { ascending: true });

      if (error) {
        console.error("Failed to load members:", error);
        setMembers([]);
      } else {
        setMembers(((data as Member[]) ?? []).filter((m) => m.ign?.trim()));
      }

      setLoadingMembers(false);
    }

    loadEvents();
    loadMembers();
  }, []);

  useEffect(() => {
    setSavedSnapshot(null);
    if (!selectedEventId) return;

    async function loadAttendance() {
      setLoadingAttendance(true);
      setAttendanceError(null);

      const { data, error } = await supabase
        .from("event_attendance")
        .select("member_id, status")
        .eq("event_id", selectedEventId);

      if (error) {
        console.error("Failed to load attendance:", error);
        setAttendanceError(error.message);
        setAttendance(new Map());
      } else {
        const map = new Map<number, string>();
        (data as AttendanceRecord[])?.forEach((row) => {
          if (row.member_id != null) {
            map.set(row.member_id, row.status);
          }
        });
        setAttendance(map);
      }

      setLoadingAttendance(false);
    }

    async function loadParties() {
      setLoadingParties(true);
      setPartiesError(null);
      setSaveMessage(null);

      const { data: dbParties, error: partiesError } = await supabase
        .from("eo_parties")
        .select("id, event_id, time_group, party_number, raid_leader_member_id, created_at")
        .eq("event_id", selectedEventId)
        .order("party_number", { ascending: true });

      if (partiesError) {
        console.error("Failed to load parties:", partiesError);
        setPartiesError(partiesError.message);
        setParties(createInitialParties);

        setLoadingParties(false);
        return;
      }

      let loadedParties = (dbParties as DbParty[]) ?? [];

      if (loadedParties.length === 0) {
        const idx = events.findIndex((e) => e.id === selectedEventId);
        const previousEventId = events[idx + 1]?.id;

        if (previousEventId) {
          const { data: prevDbParties, error: prevPartiesError } = await supabase
            .from("eo_parties")
            .select(
              "id, event_id, time_group, party_number, raid_leader_member_id, created_at"
            )
            .eq("event_id", previousEventId)
            .order("party_number", { ascending: true });

          if (prevPartiesError) {
            console.error("Failed to load previous parties:", prevPartiesError);
            setPartiesError(prevPartiesError.message);
            setParties(createInitialParties);
            setLoadingParties(false);
            return;
          }

          loadedParties = (prevDbParties as DbParty[]) ?? [];
        }
      }

      if (loadedParties.length === 0) {
        setParties(createInitialParties);

        setLoadingParties(false);
        return;
      }

      const partyIds = loadedParties.map((p) => p.id);

      const { data: dbMembers, error: membersError } = await supabase
        .from("eo_party_members")
        .select("id, eo_party_id, member_id, slot_number, created_at")
        .in("eo_party_id", partyIds);

      if (membersError) {
        console.error("Failed to load party members:", membersError);
        setPartiesError(membersError.message);
        setParties(createInitialParties);

        setLoadingParties(false);
        return;
      }

      const partyMemberMap = new Map<number, DbPartyMember[]>();
      (dbMembers as DbPartyMember[])?.forEach((row) => {
        const list = partyMemberMap.get(row.eo_party_id) ?? [];
        list.push(row);
        partyMemberMap.set(row.eo_party_id, list);
      });

      const newState: PartyState = { pagi: [], sore: [], malam: [] };

      loadedParties.forEach((dbParty) => {
        const group = dbParty.time_group as TimeGroup;
        if (!newState[group]) return;

        const slots: (number | null)[] = Array(SLOTS_PER_PARTY).fill(null);
        if (dbParty.raid_leader_member_id != null) {
          slots[0] = dbParty.raid_leader_member_id;
        }

        const pmList = partyMemberMap.get(dbParty.id) ?? [];
        pmList.forEach((pm) => {
          if (pm.slot_number >= 1 && pm.slot_number <= SLOTS_PER_PARTY) {
            slots[pm.slot_number - 1] = pm.member_id;
          }
        });

        newState[group].push({
          dbId: dbParty.id,
          partyNumber: dbParty.party_number,
          slots,
        });
      });

      setParties(newState);
      setLoadingParties(false);
    }

    async function loadTimeGroups() {
      setLoadingTimeGroups(true);
      setTimeGroupsError(null);

      const { data, error } = await supabase
        .from("eo_time_groups")
        .select("time_group, apply_to_member_id")
        .eq("event_id", selectedEventId);

      if (error) {
        console.error("Failed to load eo_time_groups:", error);
        setTimeGroupsError(error.message);
        setApplyTo({ pagi: null, sore: null, malam: null });
      } else {
        let rows =
          (data as {
            time_group: string;
            apply_to_member_id: number | null;
          }[]) ?? [];

        if (rows.length === 0) {
          const idx = events.findIndex((e) => e.id === selectedEventId);
          const previousEventId = events[idx + 1]?.id;

          if (previousEventId) {
            const { data: prevData, error: prevError } = await supabase
              .from("eo_time_groups")
              .select("time_group, apply_to_member_id")
              .eq("event_id", previousEventId);

            if (!prevError) {
              rows =
                (prevData as {
                  time_group: string;
                  apply_to_member_id: number | null;
                }[]) ?? [];
            }
          }
        }

        const next: Record<TimeGroup, number | null> = {
          pagi: null,
          sore: null,
          malam: null,
        };
        rows.forEach((row) => {
          const group = row.time_group as TimeGroup;
          if (TIME_GROUPS.includes(group)) {
            next[group] = row.apply_to_member_id;
          }
        });
        setApplyTo(next);
      }

      setLoadingTimeGroups(false);
    }

    loadAttendance();
    loadParties();
    loadTimeGroups();
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    if (loadingAttendance || loadingParties || loadingTimeGroups) return;
    if (attendanceError || partiesError || timeGroupsError) return;
    setSavedSnapshot((prev) => prev ?? buildSnapshot(parties, applyTo));
  }, [
    selectedEventId,
    loadingAttendance,
    loadingParties,
    loadingTimeGroups,
    attendanceError,
    partiesError,
    timeGroupsError,
    parties,
    applyTo,
  ]);

  const currentSnapshot = useMemo(
    () => buildSnapshot(parties, applyTo),
    [parties, applyTo]
  );

  const hasUnsaved = useMemo(
    () => savedSnapshot != null && currentSnapshot !== savedSnapshot,
    [currentSnapshot, savedSnapshot]
  );

  const availableMembers = useMemo(() => {
    return members
      .filter((m) => attendance.get(m.id) !== NOT_ATTENDING_STATUS)
      .sort((a, b) => a.ign.localeCompare(b.ign, undefined, { sensitivity: "base" }));
  }, [members, attendance]);

  const statusCounts = useMemo(() => {
    let hadir = 0;
    let tentative = 0;
    let noResponse = 0;
    availableMembers.forEach((m) => {
      const status = attendance.get(m.id);
      if (status === "hadir") hadir++;
      else if (status === "tentative") tentative++;
      else noResponse++;
    });
    return { hadir, tentative, noResponse };
  }, [availableMembers, attendance]);

  const assignedMemberIds = useMemo(() => {
    const ids = new Set<number>();
    TIME_GROUPS.forEach((group) => {
      parties[group].forEach((party) => {
        party.slots.forEach((id) => {
          if (id != null) ids.add(id);
        });
      });
    });
    return ids;
  }, [parties]);

  const assignedCount = useMemo(() => {
    return Array.from(assignedMemberIds).filter((id) =>
      availableMembers.some((m) => m.id === id)
    ).length;
  }, [assignedMemberIds, availableMembers]);

  const unassignedMembers = useMemo(() => {
    return availableMembers.filter((m) => !assignedMemberIds.has(m.id));
  }, [availableMembers, assignedMemberIds]);

  const notAttendingMembers = useMemo(() => {
    return members
      .filter((m) => attendance.get(m.id) === NOT_ATTENDING_STATUS)
      .sort((a, b) =>
        a.ign.localeCompare(b.ign, undefined, { sensitivity: "base" })
      );
  }, [members, attendance]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const previewText = useMemo(
    () => buildEoPreview(selectedEvent, members, parties, applyTo),
    [selectedEvent, members, parties, applyTo]
  );

  function copyPreview() {
    navigator.clipboard
      .writeText(previewText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Failed to copy preview:", err));
  }

  function assignSlot(
    group: TimeGroup,
    partyIndex: number,
    slotIndex: number,
    memberId: number | null
  ) {
    setParties((prev) => {
      const next: PartyState = { ...prev };
      const groupParties = [...next[group]];
      const party = { ...groupParties[partyIndex] };
      const slots = [...party.slots];
      slots[slotIndex] = memberId;
      party.slots = slots;
      groupParties[partyIndex] = party;
      next[group] = groupParties;
      return next;
    });
  }

  function addParty(group: TimeGroup) {
    setParties((prev) => {
      const next: PartyState = { ...prev };
      const groupParties = [...next[group]];
      groupParties.push(createEmptyParty(groupParties.length + 1));
      next[group] = groupParties;
      return next;
    });
  }

  function removeParty(group: TimeGroup, partyIndex: number) {
    setParties((prev) => {
      const party = prev[group][partyIndex];
      if (!party || party.slots.some((s) => s != null)) return prev;

      const next: PartyState = { ...prev };
      const groupParties = [...next[group]];
      groupParties.splice(partyIndex, 1);
      next[group] = renumberParties(groupParties);
      return next;
    });
  }

  function setApplyTarget(group: TimeGroup, memberId: number | null) {
    setApplyTo((prev) => ({ ...prev, [group]: memberId }));
  }

  function openPublishDialog() {
    if (!selectedEventId) return;
    if (hasUnsaved) {
      setPublishMode("save-and-publish");
    } else {
      setPublishMode("publish");
    }
    setPublishConfirmOpen(true);
  }

  async function publishToDiscord() {
    if (!selectedEventId) return;

    setPublishing(true);
    setPublishMessage(null);

    try {
      const res = await fetch("/api/eo/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId }),
      });

      const data = await res.json().catch(() => ({
        success: false,
        error: "Invalid response from server",
      }));

      if (!res.ok || !data.success) {
        setPublishMessage(
          `Failed to publish to Discord: ${data.error || res.statusText}`
        );
      } else {
        setPublishMessage("Published to Discord successfully.");
      }
    } catch (error) {
      console.error("Publish failed:", error);
      setPublishMessage("Failed to publish to Discord: network error");
    } finally {
      setPublishing(false);
      setPublishConfirmOpen(false);
    }
  }

  async function handleConfirmPublish() {
    if (publishMode === "save-and-publish") {
      const saved = await saveParties();
      if (saved) {
        await publishToDiscord();
      }
    } else {
      await publishToDiscord();
    }
  }

  async function saveParties(): Promise<boolean> {
    if (!selectedEventId) return false;

    setSaving(true);
    setSaveMessage(null);

    try {
      const timeGroupUpserts = TIME_GROUPS.map((group) => ({
        event_id: selectedEventId,
        time_group: group,
        apply_to_member_id: applyTo[group],
      }));

      const { error: upsertTimeGroupsError } = await supabase
        .from("eo_time_groups")
        .upsert(timeGroupUpserts, { onConflict: "event_id,time_group" });

      if (upsertTimeGroupsError) {
        throw new Error(
          `Failed to save eo_time_groups: ${upsertTimeGroupsError.message}`
        );
      }

      const { data: existingParties, error: existingError } = await supabase
        .from("eo_parties")
        .select("id")
        .eq("event_id", selectedEventId);

      if (existingError) {
        throw new Error(`Failed to load existing parties: ${existingError.message}`);
      }

      const existingIds = (existingParties as { id: number }[])?.map((p) => p.id) ?? [];

      if (existingIds.length > 0) {
        const { error: delMembersError } = await supabase
          .from("eo_party_members")
          .delete()
          .in("eo_party_id", existingIds);

        if (delMembersError) {
          throw new Error(
            `Failed to delete existing eo_party_members: ${delMembersError.message}`
          );
        }
      }

      const { error: delPartiesError } = await supabase
        .from("eo_parties")
        .delete()
        .eq("event_id", selectedEventId);

      if (delPartiesError) {
        throw new Error(`Failed to delete existing eo_parties: ${delPartiesError.message}`);
      }

      const partiesToSave: {
        time_group: TimeGroup;
        partyNumber: number;
        slots: (number | null)[];
        originalIndex: number;
      }[] = [];

      TIME_GROUPS.forEach((group) => {
        let number = 1;
        parties[group].forEach((party, index) => {
          if (party.slots.some((memberId) => memberId != null)) {
            partiesToSave.push({
              time_group: group,
              partyNumber: number++,
              slots: party.slots,
              originalIndex: index,
            });
          }
        });
      });

      const partyInserts = partiesToSave.map((party) => ({
        event_id: selectedEventId,
        time_group: party.time_group,
        party_number: party.partyNumber,
        raid_leader_member_id: party.slots[0] ?? null,
      }));

      let insertedParties: DbParty[] | null = null;

      if (partyInserts.length > 0) {
        const { data, error: insertPartiesError } = await supabase
          .from("eo_parties")
          .insert(partyInserts)
          .select("id, time_group, party_number");

        if (insertPartiesError) {
          throw new Error(`Failed to create eo_parties: ${insertPartiesError.message}`);
        }

        insertedParties = (data as DbParty[]) ?? null;
      }

      const memberInserts: {
        eo_party_id: number;
        member_id: number;
        slot_number: number;
      }[] = [];

      insertedParties?.forEach((dbParty, i) => {
        const party = partiesToSave[i];
        if (!party) return;

        party.slots.forEach((memberId, slotIndex) => {
          if (memberId != null) {
            memberInserts.push({
              eo_party_id: dbParty.id,
              member_id: memberId,
              slot_number: slotIndex + 1,
            });
          }
        });
      });

      if (memberInserts.length > 0) {
        const { error: insertMembersError } = await supabase
          .from("eo_party_members")
          .insert(memberInserts);

        if (insertMembersError) {
          throw new Error(`Failed to create eo_party_members: ${insertMembersError.message}`);
        }
      }

      if (insertedParties && insertedParties.length > 0) {
        const dbIdsByGroupIndex: Record<TimeGroup, Map<number, number>> = {
          pagi: new Map(),
          sore: new Map(),
          malam: new Map(),
        };
        insertedParties.forEach((dbParty, i) => {
          const party = partiesToSave[i];
          if (party) {
            dbIdsByGroupIndex[party.time_group].set(party.originalIndex, dbParty.id);
          }
        });

        setParties((prev) => {
          const next: PartyState = { ...prev };
          TIME_GROUPS.forEach((group) => {
            next[group] = prev[group].map((party, index) => ({
              ...party,
              dbId: dbIdsByGroupIndex[group].get(index) ?? party.dbId,
            }));
          });
          return next;
        });
      }

      setSaveMessage("EO parties saved successfully.");
      setSavedSnapshot(buildSnapshot(parties, applyTo));
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      setSaveMessage(error instanceof Error ? `Failed to save EO parties: ${error.message}` : "Failed to save EO parties.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const isLoading = loadingEvents || loadingMembers || loadingTimeGroups;

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <main className="mx-auto w-full max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[#f2f3f5] sm:text-3xl">
            Emperium Overrun Party Organizer
          </h1>
          <Link
            href="/"
            className="rounded-md bg-[#383a40] px-3 py-1.5 text-sm font-medium text-[#f2f3f5] hover:bg-[#2b2d31]"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="mb-6 rounded-2xl bg-[#2b2d31] p-4 shadow-lg ring-1 ring-white/5 sm:p-6">
          <label
            htmlFor="eo-event"
            className="mb-2 block text-sm font-semibold text-[#b5bac1]"
          >
            EO Event
          </label>

          {loadingEvents ? (
            <p className="text-sm text-[#b5bac1]">Loading events...</p>
          ) : eventsError ? (
            <p className="text-sm text-red-400">
              Error loading events: {eventsError}
            </p>
          ) : events.length === 0 ? (
            <p className="text-sm text-[#b5bac1]">No EO events found.</p>
          ) : (
            <select
              id="eo-event"
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(Number(e.target.value) || null)}
              className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-3 text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2]"
            >
              {events.map((event) => (
                <option key={event.id} value={String(event.id)}>
                  {event.name} — {formatEventDate(event.event_date)}
                </option>
              ))}
            </select>
          )}
        </section>

        {isLoading || loadingAttendance || loadingParties ? (
          <p className="text-sm text-[#b5bac1]">Loading organizer...</p>
        ) : attendanceError ? (
          <p className="text-sm text-red-400">
            Error loading attendance: {attendanceError}
          </p>
        ) : partiesError ? (
          <p className="text-sm text-red-400">
            Error loading parties: {partiesError}
          </p>
        ) : timeGroupsError ? (
          <p className="text-sm text-red-400">
            Error loading time groups: {timeGroupsError}
          </p>
        ) : selectedEventId ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
            <aside className="rounded-2xl bg-[#2b2d31] p-4 shadow-lg ring-1 ring-white/5 sm:p-6 xl:sticky xl:top-6 xl:self-start">
              <h2 className="mb-4 text-lg font-bold text-[#f2f3f5]">
                Unassigned Members
              </h2>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-[#383a40] p-2 text-center">
                  <p className="text-xs text-[#b5bac1]">Total</p>
                  <p className="font-bold text-[#f2f3f5]">{availableMembers.length}</p>
                </div>
                <div className="rounded-lg bg-[#383a40] p-2 text-center">
                  <p className="text-xs text-[#b5bac1]">Hadir</p>
                  <p className="font-bold text-[#3ba55d]">{statusCounts.hadir}</p>
                </div>
                <div className="rounded-lg bg-[#383a40] p-2 text-center">
                  <p className="text-xs text-[#b5bac1]">Tentative</p>
                  <p className="font-bold text-[#faa61a]">{statusCounts.tentative}</p>
                </div>
                <div className="rounded-lg bg-[#383a40] p-2 text-center">
                  <p className="text-xs text-[#b5bac1]">No response</p>
                  <p className="font-bold text-[#b5bac1]">{statusCounts.noResponse}</p>
                </div>
                <div className="rounded-lg bg-[#383a40] p-2 text-center">
                  <p className="text-xs text-[#b5bac1]">Assigned</p>
                  <p className="font-bold text-[#5865f2]">{assignedCount}</p>
                </div>
                <div className="rounded-lg bg-[#383a40] p-2 text-center">
                  <p className="text-xs text-[#b5bac1]">Unassigned</p>
                  <p className="font-bold text-[#f2f3f5]">
                    {availableMembers.length - assignedCount}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg bg-[#383a40] p-2 text-center">
                  <p className="text-xs text-[#b5bac1]">Tidak Hadir</p>
                  <p className="font-bold text-red-400">
                    {notAttendingMembers.length}
                  </p>
                </div>
              </div>

              <p className="mb-3 text-sm text-[#b5bac1]">
                {unassignedMembers.length} members still unassigned
              </p>

              <ul className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                {unassignedMembers.map((member) => (
                  <li
                    key={member.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("memberId", String(member.id));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="flex cursor-grab items-center justify-between rounded-lg bg-[#383a40] px-3 py-2 active:cursor-grabbing"
                  >
                    <span
                      className={`text-sm font-medium ${
                        getJobColorClass(member.job) || "text-[#f2f3f5]"
                      }`}
                    >
                      {member.ign}
                    </span>
                    {getStatusBadge(attendance.get(member.id))}
                  </li>
                ))}
              </ul>

              {notAttendingMembers.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-[#b5bac1]">
                    Tidak Hadir
                  </p>
                  <ul className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                    {notAttendingMembers.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between rounded-lg bg-[#383a40]/50 px-3 py-2 opacity-60"
                      >
                        <span
                          className={`text-sm font-medium ${
                            getJobColorClass(member.job) || "text-[#f2f3f5]"
                          }`}
                        >
                          {member.ign}
                        </span>
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
                          Tidak Hadir
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>

            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#f2f3f5]">EO Party Organizer</h2>
                  {savedSnapshot != null && (
                    <span
                      className={`flex items-center gap-1.5 text-sm font-medium ${
                        hasUnsaved ? "text-[#faa61a]" : "text-[#3ba55d]"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          hasUnsaved ? "bg-[#faa61a]" : "bg-[#3ba55d]"
                        }`}
                      />
                      {hasUnsaved ? "Unsaved changes" : "Saved"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {publishMessage && (
                    <span
                      className={`text-sm font-medium ${
                        publishMessage.startsWith("Failed")
                          ? "text-red-400"
                          : "text-[#3ba55d]"
                      }`}
                    >
                      {publishMessage}
                    </span>
                  )}
                  {saveMessage && (
                    <span
                      className={`text-sm font-medium ${
                        saveMessage.startsWith("Failed")
                          ? "text-red-400"
                          : "text-[#3ba55d]"
                      }`}
                    >
                      {saveMessage}
                    </span>
                  )}
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="rounded-md bg-[#383a40] px-4 py-2 text-sm font-medium text-[#f2f3f5] hover:bg-[#2b2d31]"
                  >
                    Preview
                  </button>
                  <button
                    onClick={saveParties}
                    disabled={saving}
                    className="rounded-md bg-[#5865f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save EO Parties"}
                  </button>
                  <button
                    onClick={openPublishDialog}
                    disabled={publishing || saving}
                    className="rounded-md bg-[#3ba55d] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d7d46] disabled:opacity-60"
                  >
                    {publishing ? "Publishing..." : "Publish to Discord"}
                  </button>
                </div>
              </div>

              {TIME_GROUPS.map((group) => (
                <section
                  key={group}
                  className="rounded-2xl bg-[#2b2d31] p-4 shadow-lg ring-1 ring-white/5 sm:p-6"
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-bold text-[#f2f3f5]">
                      TEAM {DISPLAY_GROUP[group].toUpperCase()}
                    </h3>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-[#b5bac1]">
                        Apply To:
                      </label>
                      <SearchableSelect
                        value={applyTo[group] ?? 0}
                        onChange={(v) => setApplyTarget(group, v || null)}
                        options={[
                          { value: 0, label: "— None —" },
                          ...members.map((m) => ({
                            value: m.id,
                            label: m.ign,
                            className: getJobColorClass(m.job),
                          })),
                        ]}
                        placeholder="— None —"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {parties[group].map((party, partyIndex) => {
                      const isEmpty = party.slots.every((s) => s == null);

                      return (
                        <div
                          key={party.partyNumber}
                          className="rounded-xl bg-[#383a40] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="font-bold text-[#f2f3f5]">
                              Party {party.partyNumber}
                            </h4>
                            {isEmpty && (
                              <button
                                onClick={() => removeParty(group, partyIndex)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {party.slots.map((slotMemberId, slotIndex) => {
                              const currentValue = slotMemberId ?? "";

                              const options = availableMembers.filter(
                                (m) =>
                                  m.id === slotMemberId ||
                                  !assignedMemberIds.has(m.id)
                              );

                              return (
                                <div
                                  key={slotIndex}
                                  className="flex flex-col gap-1"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const dropped = Number(
                                      e.dataTransfer.getData("memberId")
                                    );
                                    if (
                                      !dropped ||
                                      slotMemberId === dropped ||
                                      slotMemberId != null ||
                                      assignedMemberIds.has(dropped)
                                    )
                                      return;
                                    assignSlot(
                                      group,
                                      partyIndex,
                                      slotIndex,
                                      dropped
                                    );
                                  }}
                                >
                                  <label className="text-xs font-medium text-[#b5bac1]">
                                    {slotIndex === 0 ? "Leader" : `Slot ${slotIndex + 1}`}
                                  </label>
                                  <SearchableSelect
                                    value={currentValue ? Number(currentValue) : 0}
                                    onChange={(v) =>
                                      assignSlot(
                                        group,
                                        partyIndex,
                                        slotIndex,
                                        v || null
                                      )
                                    }
                                    options={[
                                      { value: 0, label: "— Empty —" },
                                      ...options.map((m) => ({
                                        value: m.id,
                                        label: `${m.ign} — ${attendance.get(m.id) ?? "No response"}`,
                                        className: getJobColorClass(m.job),
                                      })),
                                    ]}
                                    placeholder="— Empty —"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => addParty(group)}
                    className="mt-4 w-full rounded-md border border-dashed border-[#5865f2]/50 py-2 text-sm font-medium text-[#5865f2] hover:bg-[#5865f2]/10"
                  >
                    + Add Party
                  </button>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#b5bac1]">
            Select an EO event to start organizing parties.
          </p>
        )}

        {previewOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-[#2b2d31] p-6 shadow-xl ring-1 ring-white/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#f2f3f5]">EO Preview</h2>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="text-sm font-medium text-[#b5bac1] hover:text-[#f2f3f5]"
                >
                  Close
                </button>
              </div>

              <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#1e1f22] p-4 text-sm text-[#f2f3f5]">
                {previewText}
              </pre>

              <div className="mt-4 flex items-center justify-between">
                {copied && (
                  <span className="text-sm text-[#3ba55d]">Copied!</span>
                )}
                <button
                  onClick={copyPreview}
                  className="ml-auto rounded-md bg-[#5865f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4]"
                >
                  Copy Message
                </button>
              </div>
            </div>
          </div>
        )}

        {publishConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => !publishing && setPublishConfirmOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-[#2b2d31] p-6 shadow-xl ring-1 ring-white/5"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-xl font-bold text-[#f2f3f5]">
                {publishMode === "save-and-publish"
                  ? "Unsaved Changes"
                  : "Publish EO Parties?"}
              </h2>
              <p className="mb-6 text-sm text-[#b5bac1]">
                {publishMode === "save-and-publish"
                  ? "You have unsaved changes. Save the EO parties before publishing."
                  : "This will send the current saved EO organization to the configured Discord channel."}
              </p>

              {publishing && (
                <p className="mb-4 text-sm text-[#b5bac1]">Publishing...</p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPublishConfirmOpen(false)}
                  disabled={publishing}
                  className="rounded-md bg-[#383a40] px-4 py-2 text-sm font-medium text-[#f2f3f5] hover:bg-[#2b2d31] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPublish}
                  disabled={publishing || saving}
                  className="rounded-md bg-[#3ba55d] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d7d46] disabled:opacity-60"
                >
                  {publishMode === "save-and-publish"
                    ? saving
                      ? "Saving..."
                      : "Save & Publish"
                    : publishing
                      ? "Publishing..."
                      : "Publish"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
