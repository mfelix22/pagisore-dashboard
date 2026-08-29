"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Member = {
  id: number;
  ign: string;
  discord_id: string | null;
  job: string | null;
  is_active: boolean;
  created_at: string;
};

type StatusFilter = "all" | "active" | "inactive";

type MemberFormValues = {
  ign: string;
  job: string;
  is_active: boolean;
};

type InactivateConfirm = {
  member: Member;
  ign: string;
  job: string | null;
};

type ReactivateConfirm = {
  existing: Member;
  ign: string;
  job: string | null;
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function formatJob(job: string | null) {
  if (!job || job.trim() === "") return "—";
  return job;
}

function getJobColorClass(job: string): string {
  const j = job.toLowerCase();

  if (j.includes("lord knight")) return "text-red-400";
  if (j.includes("paladin")) return "text-red-500";

  if (j.includes("assassin cross")) return "text-purple-400";
  if (j.includes("stalker")) return "text-purple-500";

  if (j.includes("high wizard")) return "text-blue-400";
  if (j.includes("professor")) return "text-blue-500";

  if (j.includes("sniper")) return "text-yellow-500";
  if (j.includes("minstrel")) return "text-yellow-400";
  if (j.includes("gypsy")) return "text-yellow-600";

  if (j.includes("high priest")) return "text-green-400";
  if (j.includes("champion")) return "text-green-500";

  if (j.includes("mastersmith")) return "text-orange-400";
  if (j.includes("biochemist")) return "text-orange-500";

  if (j.includes("gunslinger")) return "text-black";
  if (j.includes("summoner")) return "text-pink-400";

  return "";
}

function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) =>
    a.ign.localeCompare(b.ign, undefined, { sensitivity: "base" })
  );
}

function normalizeIgn(ign: string) {
  return ign.trim().toLowerCase();
}

const JOB_OPTIONS: string[] = [
  "Assassin Cross",
  "Biochemist",
  "Champion",
  "Gunslinger",
  "Gypsy",
  "High Priest",
  "High Wizard",
  "Lord Knight",
  "Mastersmith",
  "Minstrel",
  "Paladin",
  "Professor",
  "Sniper",
  "Stalker",
  "Summoner",
];

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-[#2b2d31] p-6 shadow-2xl ring-1 ring-white/10">
      <h2 className="mb-4 text-lg font-bold text-[#f2f3f5]">{title}</h2>
      {children}
    </div>
  );
}

type MemberFormModalProps = {
  mode: "add" | "edit";
  member: Member | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: MemberFormValues) => Promise<void>;
};

function MemberFormModal({
  mode,
  member,
  saving,
  onClose,
  onSubmit,
}: MemberFormModalProps) {
  const [ign, setIgn] = useState("");
  const [job, setJob] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setIgn(member.ign);
      setJob(member.job ?? "");
      setIsActive(member.is_active);
    } else {
      setIgn("");
      setJob("");
      setIsActive(true);
    }
    setValidationError(null);
  }, [member]);

  const currentJob = member?.job?.trim();
  const extraOption =
    currentJob && !JOB_OPTIONS.includes(currentJob) ? [currentJob] : [];

  async function handleSave() {
    const trimmedIgn = ign.trim();
    if (!trimmedIgn) {
      setValidationError("IGN is required.");
      return;
    }
    setValidationError(null);
    await onSubmit({ ign, job, is_active: isActive });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Panel title={mode === "add" ? "Add Member" : "Edit Member"}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="member-ign"
              className="mb-1 block text-sm font-medium text-[#b5bac1]"
            >
              IGN
            </label>
            <input
              id="member-ign"
              type="text"
              value={ign}
              onChange={(e) => setIgn(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-2.5 text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2] disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="member-job"
              className="mb-1 block text-sm font-medium text-[#b5bac1]"
            >
              Job
            </label>
            <select
              id="member-job"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-2.5 text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2] disabled:opacity-60"
            >
              <option value="">— Not set</option>
              {extraOption.map((j) => (
                <option key={j} value={j}>
                  {j} (current)
                </option>
              ))}
              {JOB_OPTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[#b5bac1]">
              Select a 2nd transcendence job.
            </p>
          </div>

          {mode === "edit" && member && (
            <div>
              <label
                htmlFor="member-discord"
                className="mb-1 block text-sm font-medium text-[#b5bac1]"
              >
                Discord ID
              </label>
              <input
                id="member-discord"
                type="text"
                value={member.discord_id ?? "—"}
                readOnly
                disabled
                className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-2.5 text-[#b5bac1] opacity-60"
              />
              <p className="mt-1 text-xs text-[#b5bac1]">
                Discord ID mapping is managed separately for now.
              </p>
            </div>
          )}

          {mode === "edit" && (
            <div>
              <label
                htmlFor="member-status"
                className="mb-1 block text-sm font-medium text-[#b5bac1]"
              >
                Status
              </label>
              <select
                id="member-status"
                value={isActive ? "true" : "false"}
                onChange={(e) => setIsActive(e.target.value === "true")}
                disabled={saving}
                className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-2.5 text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2] disabled:opacity-60"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}

          {validationError && (
            <p className="text-sm text-red-400">{validationError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md bg-[#383a40] px-4 py-2 text-sm font-medium text-[#f2f3f5] hover:bg-[#4e5058] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-[#5865f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

type ConfirmModalProps = {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmColor?: "red" | "green";
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmModal({
  title,
  description,
  confirmLabel,
  confirmColor = "red",
  saving,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const confirmClass =
    confirmColor === "green"
      ? "bg-[#3ba55d] hover:bg-[#318a4e]"
      : "bg-red-500 hover:bg-red-600";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <Panel title={title}>
        <p className="mb-6 text-sm leading-relaxed text-[#b5bac1]">
          {description}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md bg-[#383a40] px-4 py-2 text-sm font-medium text-[#f2f3f5] hover:bg-[#4e5058] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${confirmClass}`}
          >
            {saving ? "Saving..." : confirmLabel}
          </button>
        </div>
      </Panel>
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [confirmInactivate, setConfirmInactivate] =
    useState<InactivateConfirm | null>(null);
  const [duplicateReactivate, setDuplicateReactivate] =
    useState<ReactivateConfirm | null>(null);

  async function loadMembers() {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from("members")
      .select("id, ign, discord_id, job, is_active, created_at")
      .order("ign", { ascending: true });

    if (error) {
      console.error("Failed to load members:", error);
      setLoadError(
        `Failed to load members: ${error.message}${
          error.code ? ` (code: ${error.code})` : ""
        }`
      );
      setMembers([]);
    } else {
      setMembers(
        sortMembers(((data as Member[]) ?? []).filter((m) => m.ign?.trim()))
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        m.ign.toLowerCase().includes(q) ||
        (m.job ?? "").toLowerCase().includes(q) ||
        (m.discord_id ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && m.is_active) ||
        (statusFilter === "inactive" && !m.is_active);
      const matchesJob =
        jobFilter === "all" || (m.job ?? "").trim() === jobFilter;
      return matchesSearch && matchesStatus && matchesJob;
    });
  }, [members, search, statusFilter, jobFilter]);

  const counts = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [members]);

  const jobCounts = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => {
      if (!m.is_active) return;
      const key = m.job?.trim() || "Not set";
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [members]);

  const jobOptions = useMemo(() => {
    const jobs = new Set<string>();
    members.forEach((m) => {
      if (m.job?.trim()) jobs.add(m.job.trim());
    });
    return Array.from(jobs).sort();
  }, [members]);

  async function doUpdateMember(
    id: number,
    ign: string,
    job: string | null,
    isActive: boolean
  ) {
    setSaving(true);
    setSaveMessage(null);

    const { error } = await supabase
      .from("members")
      .update({ ign, job, is_active: isActive })
      .eq("id", id);

    if (error) {
      console.error("Failed to update member:", error);
      setSaveMessage(
        `Failed to update member: ${error.message}${
          error.code ? ` (code: ${error.code})` : ""
        }`
      );
    } else {
      setMembers((prev) =>
        sortMembers(
          prev.map((m) =>
            m.id === id ? { ...m, ign, job, is_active: isActive } : m
          )
        )
      );
      setSaveMessage("Member updated successfully.");
      setEditing(null);
      setConfirmInactivate(null);
    }

    setSaving(false);
  }

  async function handleEditSubmit(values: MemberFormValues) {
    if (!editing) return;

    const trimmedIgn = values.ign.trim();
    const trimmedJob = values.job.trim() || null;

    if (editing.is_active && !values.is_active) {
      setEditing(null);
      setConfirmInactivate({
        member: editing,
        ign: trimmedIgn,
        job: trimmedJob,
      });
      return;
    }

    await doUpdateMember(editing.id, trimmedIgn, trimmedJob, values.is_active);
  }

  async function handleAddSubmit(values: MemberFormValues) {
    const trimmedIgn = values.ign.trim();
    const trimmedJob = values.job.trim() || null;

    const existing = members.find(
      (m) => normalizeIgn(m.ign) === normalizeIgn(trimmedIgn)
    );

    if (existing) {
      if (existing.is_active) {
        setSaveMessage("A member with this IGN already exists.");
        return;
      }

      setAdding(false);
      setDuplicateReactivate({
        existing,
        ign: trimmedIgn,
        job: trimmedJob,
      });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    const { data, error } = await supabase
      .from("members")
      .insert({
        ign: trimmedIgn,
        job: trimmedJob,
        is_active: true,
        discord_id: null,
      })
      .select("id, ign, discord_id, job, is_active, created_at")
      .single();

    if (error) {
      console.error("Failed to add member:", error);
      if (error.code === "23505") {
        setSaveMessage("A member with this IGN already exists.");
      } else {
        setSaveMessage(
          `Failed to add member: ${error.message}${
            error.code ? ` (code: ${error.code})` : ""
          }`
        );
      }
    } else {
      const newMember = (data ?? {
        id: -1,
        ign: trimmedIgn,
        discord_id: null,
        job: trimmedJob,
        is_active: true,
        created_at: new Date().toISOString(),
      }) as Member;
      setMembers((prev) => sortMembers([...prev, newMember]));
      setSaveMessage("Member added successfully.");
      setAdding(false);
    }

    setSaving(false);
  }

  async function handleReactivateConfirm(confirmed: boolean) {
    if (!duplicateReactivate) return;

    if (confirmed) {
      setSaving(true);
      setSaveMessage(null);

      const { error } = await supabase
        .from("members")
        .update({ is_active: true, job: duplicateReactivate.job })
        .eq("id", duplicateReactivate.existing.id);

      if (error) {
        console.error("Failed to reactivate member:", error);
        setSaveMessage(
          `Failed to reactivate member: ${error.message}${
            error.code ? ` (code: ${error.code})` : ""
          }`
        );
      } else {
        setMembers((prev) =>
          sortMembers(
            prev.map((m) =>
              m.id === duplicateReactivate.existing.id
                ? { ...m, is_active: true, job: duplicateReactivate.job }
                : m
            )
          )
        );
        setSaveMessage("Member reactivated successfully.");
      }

      setSaving(false);
    }

    setDuplicateReactivate(null);
  }

  async function handleInactivateConfirm(confirmed: boolean) {
    if (!confirmInactivate) return;

    if (confirmed) {
      await doUpdateMember(
        confirmInactivate.member.id,
        confirmInactivate.ign,
        confirmInactivate.job,
        false
      );
    } else {
      setConfirmInactivate(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <main className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[#f2f3f5] sm:text-3xl">
            PAGISORE Members
          </h1>
          <Link
            href="/"
            className="rounded-md bg-[#383a40] px-3 py-1.5 text-sm font-medium text-[#f2f3f5] hover:bg-[#2b2d31]"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === opt.value
                    ? "bg-[#5865f2] text-white"
                    : "bg-[#2b2d31] text-[#b5bac1] hover:bg-[#383a40]"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="rounded-md border border-[#383a40] bg-[#1e1f22] px-3 py-1.5 text-sm text-[#f2f3f5] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2]"
            >
              <option value="all">All Jobs</option>
              {jobOptions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="rounded-md bg-[#3ba55d] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#318a4e]"
          >
            + Add Member
          </button>
        </section>

        <section className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full rounded-lg border border-[#383a40] bg-[#1e1f22] px-4 py-3 text-[#f2f3f5] placeholder-[#b5bac1] focus:border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2]"
          />
        </section>

        <section className="mb-6 grid grid-cols-3 gap-3 text-center sm:gap-4">
          <div className="rounded-xl bg-[#2b2d31] p-3 shadow-lg ring-1 ring-white/5">
            <p className="text-xs text-[#b5bac1]">Total Members</p>
            <p className="text-xl font-bold text-[#f2f3f5]">{counts.total}</p>
          </div>
          <div className="rounded-xl bg-[#2b2d31] p-3 shadow-lg ring-1 ring-white/5">
            <p className="text-xs text-[#b5bac1]">Active</p>
            <p className="text-xl font-bold text-[#3ba55d]">{counts.active}</p>
          </div>
          <div className="rounded-xl bg-[#2b2d31] p-3 shadow-lg ring-1 ring-white/5">
            <p className="text-xs text-[#b5bac1]">Inactive</p>
            <p className="text-xl font-bold text-red-400">{counts.inactive}</p>
          </div>
        </section>

        {jobCounts.length > 0 && (
          <section className="mb-6 rounded-2xl bg-[#2b2d31] p-4 shadow-lg ring-1 ring-white/5 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold text-[#f2f3f5]">
              Active Members by Job
            </h2>
            <div className="flex flex-wrap gap-2">
              {jobCounts.map(([job, count]) => (
                <div
                  key={job}
                  className="rounded-lg bg-[#1e1f22] px-3 py-2 text-sm text-[#f2f3f5] ring-1 ring-white/5"
                >
                  <span
                    className={`font-medium ${
                      getJobColorClass(job) || "text-[#f2f3f5]"
                    }`}
                  >
                    {job}
                  </span>{" "}
                  <span className="text-[#b5bac1]">({count})</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {saveMessage && (
          <div
            className={`mb-4 rounded-md px-4 py-3 text-sm ${
              saveMessage.startsWith("Failed")
                ? "bg-red-500/15 text-red-400"
                : "bg-[#3ba55d]/15 text-[#3ba55d]"
            }`}
          >
            {saveMessage}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#b5bac1]">Loading members...</p>
        ) : loadError ? (
          <p className="text-sm text-red-400">{loadError}</p>
        ) : filteredMembers.length === 0 ? (
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
                    <th className="px-4 py-3 font-semibold">Discord ID</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383a40]">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-[#383a40]/30">
                      <td className="px-4 py-3 font-medium text-[#f2f3f5]">
                        {member.ign}
                      </td>
                      <td className="px-4 py-3 text-[#b5bac1]">
                        {formatJob(member.job)}
                      </td>
                      <td className="px-4 py-3 text-[#b5bac1]">
                        {member.discord_id ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            member.is_active
                              ? "bg-[#3ba55d]/15 text-[#3ba55d]"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setEditing(member)}
                          className="rounded-md bg-[#5865f2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4752c4]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl bg-[#2b2d31] p-4 shadow-lg ring-1 ring-white/5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold text-[#f2f3f5]">
                      {member.ign}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        member.is_active
                          ? "bg-[#3ba55d]/15 text-[#3ba55d]"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mb-1 text-sm text-[#b5bac1]">
                    <span className="text-[#b5bac1]/70">Job:</span>{" "}
                    {formatJob(member.job)}
                  </p>
                  <p className="mb-3 text-sm text-[#b5bac1]">
                    <span className="text-[#b5bac1]/70">Discord:</span>{" "}
                    {member.discord_id ?? "—"}
                  </p>
                  <div className="text-right">
                    <button
                      onClick={() => setEditing(member)}
                      className="rounded-md bg-[#5865f2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4752c4]"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {(editing || adding) && (
        <MemberFormModal
          mode={adding ? "add" : "edit"}
          member={editing}
          saving={saving}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSubmit={adding ? handleAddSubmit : handleEditSubmit}
        />
      )}

      {confirmInactivate && (
        <ConfirmModal
          title={`Inactivate ${confirmInactivate.member.ign}?`}
          description={
            <>
              This member will remain in historical records but will no longer
              appear in future active member lists or EO assignment pools.
            </>
          }
          confirmLabel="Inactivate"
          confirmColor="red"
          saving={saving}
          onCancel={() => setConfirmInactivate(null)}
          onConfirm={() => handleInactivateConfirm(true)}
        />
      )}

      {duplicateReactivate && (
        <ConfirmModal
          title="Reactivate member?"
          description={
            <>
              A member named <strong>{duplicateReactivate.ign}</strong> already
              exists but is inactive. Would you like to reactivate them and
              update their job?
            </>
          }
          confirmLabel="Reactivate"
          confirmColor="green"
          saving={saving}
          onCancel={() => setDuplicateReactivate(null)}
          onConfirm={() => handleReactivateConfirm(true)}
        />
      )}
    </div>
  );
}
