"use client";

import { useMemo, useState } from "react";
import { GREEK_DAY_LABELS, dayLabel, dateLabel, timeLabel } from "@/lib/greek";
import { TimeSelect } from "@/app/components/TimeSelect";
import { ResponsiveNav, type NavItem } from "@/app/components/ResponsiveNav";
import { CalendarView } from "@/app/dashboard/components/CalendarView";
import { Avatar } from "@/app/components/Avatar";
import { Logo } from "@/app/components/Logo";
import { Expandable } from "@/app/components/Expandable";
import {
  IconUsers,
  IconBell,
  IconClock,
  IconCopy,
  IconRefresh,
  IconTrash,
  IconPencil,
  IconPlus,
  IconArrowRight,
  IconCalendarDays,
  IconCreditCard,
  IconSettings,
  IconEye,
} from "@/app/components/icons";
import type { CalendarEntry } from "@/lib/calendar";
import type { ActionResult } from "@/app/dashboard/actions";
import {
  normalizeStudentLabel,
  appendSlugSuffix,
  isValidTutorSlug,
  isValidCustomStudentSlug,
  studentLinkPath,
} from "@/lib/slugs";
import { computeOccurrences, computeOpenSlotsForDateRange, nextOccurrenceDate, type OpenSlot } from "@/lib/schedule";
import {
  FREE_STUDENT_COUNT,
  BILLED_STUDENT_CAP,
  PRICE_PER_STUDENT_EUR,
  billedQuantity,
  monthlyChargeEur,
} from "@/lib/stripe/billing";

type MockSlot = { id: string; dayOfWeek: number; startTime: string; durationMinutes: number };
type MockStudent = {
  id: string;
  name: string;
  subject: string;
  contactEmail: string;
  label: string;
  slug: string;
  active: boolean;
  slots: MockSlot[];
};
// A request always names WHICH recurring lesson (originalSlotId) and
// WHICH occurrence of it (originalDate) is being changed — never just an
// abstract "new time." Mirrors reschedule_requests in the real schema.
type MockRequest = {
  id: string;
  studentId: string;
  originalSlotId: string;
  originalDate: string;
  newDate: string;
  newStartTime: string;
  durationMinutes: number;
};
// Approving a request creates ONE of these — the recurring slot itself is
// never touched, so the lesson keeps happening normally every other week.
type MockException = {
  id: string;
  originalSlotId: string;
  originalDate: string;
  newDate: string;
  newStartTime: string;
  newDurationMinutes: number;
};
type MockAvailability = { id: string; dayOfWeek: number; startTime: string; endTime: string };

let nextId = 1000;
function newId(): string {
  nextId += 1;
  return `mock-${nextId}`;
}

const INITIAL_STUDENTS: MockStudent[] = [
  {
    id: "s1",
    name: "Μαρία Παπαδοπούλου",
    subject: "Μαθηματικά",
    contactEmail: "maria.parent@example.com",
    label: "maria",
    slug: "maria-x7fq2k9a2b",
    active: true,
    slots: [{ id: "sl1", dayOfWeek: 2, startTime: "16:00", durationMinutes: 60 }],
  },
  {
    id: "s2",
    name: "Γιώργος Κωνσταντίνου",
    subject: "Φυσική",
    contactEmail: "",
    label: "giorgos",
    slug: "giorgos-m3n8p2q7rs",
    active: true,
    // Two lessons a week — the case where the student must pick WHICH one.
    slots: [
      { id: "sl2", dayOfWeek: 2, startTime: "17:30", durationMinutes: 60 },
      { id: "sl2b", dayOfWeek: 4, startTime: "17:00", durationMinutes: 60 },
    ],
  },
  {
    id: "s3",
    name: "Ελένη Νικολάου",
    subject: "Αγγλικά",
    contactEmail: "eleni.parent@example.com",
    label: "eleni",
    slug: "eleni-w9x4y6z1ab",
    active: true,
    slots: [{ id: "sl3", dayOfWeek: 2, startTime: "19:00", durationMinutes: 60 }],
  },
  {
    id: "s4",
    name: "Νίκος Δημητρίου",
    subject: "Χημεία",
    contactEmail: "",
    label: "nikos",
    slug: "nikos-t5u2v8w3cd",
    active: false,
    slots: [],
  },
];

const INITIAL_AVAILABILITY: MockAvailability[] = [
  { id: "a1", dayOfWeek: 1, startTime: "15:00", endTime: "21:00" },
  { id: "a2", dayOfWeek: 2, startTime: "15:00", endTime: "21:00" },
  { id: "a3", dayOfWeek: 3, startTime: "15:00", endTime: "21:00" },
  { id: "a4", dayOfWeek: 4, startTime: "15:00", endTime: "21:00" },
  { id: "a5", dayOfWeek: 5, startTime: "15:00", endTime: "21:00" },
  { id: "a6", dayOfWeek: 6, startTime: "10:00", endTime: "14:00" },
];

function initialRequests(): MockRequest[] {
  // Γιώργος wants to move his Thursday 17:00 lesson (just that occurrence)
  // to next Friday 18:00.
  return [
    {
      id: "r1",
      studentId: "s2",
      originalSlotId: "sl2b",
      originalDate: nextOccurrenceDate(4),
      newDate: nextOccurrenceDate(5),
      newStartTime: "18:00",
      durationMinutes: 60,
    },
  ];
}

const TABS = [
  { key: "dashboard", label: "Πρόγραμμα", icon: <IconCalendarDays className="h-5 w-5 stroke-current" /> },
  { key: "availability", label: "Διαθεσιμότητα", shortLabel: "Ώρες", icon: <IconClock className="h-5 w-5 stroke-current" /> },
  { key: "billing", label: "Συνδρομή", icon: <IconCreditCard className="h-5 w-5 stroke-current" /> },
  { key: "settings", label: "Ρυθμίσεις", icon: <IconSettings className="h-5 w-5 stroke-current" /> },
  { key: "student", label: "Μαθητής", icon: <IconEye className="h-5 w-5 stroke-current" /> },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function PreviewApp() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [tutorName] = useState("Δημήτρης Παπαδόπουλος");
  const [tutorSlug, setTutorSlug] = useState("ger1");
  const [students, setStudents] = useState<MockStudent[]>(INITIAL_STUDENTS);
  const [requests, setRequests] = useState<MockRequest[]>(initialRequests);
  const [exceptions, setExceptions] = useState<MockException[]>([]);
  const [availability, setAvailability] = useState<MockAvailability[]>(INITIAL_AVAILABILITY);
  const [previewStudentId, setPreviewStudentId] = useState<string>(INITIAL_STUDENTS[0].id);

  const activeStudents = students.filter((s) => s.active);
  const inactiveStudents = students.filter((s) => !s.active);

  function addStudent(input: { name: string; subject: string; contactEmail: string; dayOfWeek: number; startTime: string; durationMinutes: number }) {
    const label = normalizeStudentLabel(input.name);
    const student: MockStudent = {
      id: newId(),
      name: input.name,
      subject: input.subject,
      contactEmail: input.contactEmail,
      label,
      slug: appendSlugSuffix(label),
      active: true,
      slots: [{ id: newId(), dayOfWeek: input.dayOfWeek, startTime: input.startTime, durationMinutes: input.durationMinutes }],
    };
    setStudents((prev) => [...prev, student]);
  }

  function removeStudent(id: string) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, active: false } : s)));
  }

  function reactivateStudent(id: string) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, active: true } : s)));
  }

  function regenerateLink(id: string) {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, slug: appendSlugSuffix(s.label) } : s))
    );
  }

  function setCustomSlug(id: string, newSlug: string): { ok: true } | { ok: false; error: string } {
    const normalized = newSlug.trim().toLowerCase();
    if (!isValidCustomStudentSlug(normalized)) {
      return { ok: false, error: "Ο σύνδεσμος πρέπει να έχει 3-60 λατινικούς χαρακτήρες, αριθμούς ή παύλες" };
    }
    if (students.some((s) => s.id !== id && s.slug === normalized)) {
      return { ok: false, error: "Αυτός ο σύνδεσμος χρησιμοποιείται ήδη, δοκίμασε άλλον" };
    }
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, slug: normalized } : s)));
    return { ok: true };
  }

  /**
   * Tutor-initiated slot changes, independent of the reschedule-request
   * flow below — mirrors addSlotAction/updateSlotAction/removeSlotAction
   * in the real app. These edit the recurring pattern directly.
   */
  async function addSlot(
    studentId: string,
    input: { dayOfWeek: number; startTime: string; durationMinutes: number }
  ): Promise<ActionResult> {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, slots: [...s.slots, { id: newId(), ...input }] }
          : s
      )
    );
    return { ok: true };
  }

  async function updateSlot(
    slotId: string,
    input: { dayOfWeek: number; startTime: string; durationMinutes: number }
  ): Promise<ActionResult> {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        slots: s.slots.map((slot) => (slot.id === slotId ? { ...slot, ...input } : slot)),
      }))
    );
    return { ok: true };
  }

  async function removeSlot(slotId: string): Promise<ActionResult> {
    setStudents((prev) => prev.map((s) => ({ ...s, slots: s.slots.filter((slot) => slot.id !== slotId) })));
    return { ok: true };
  }

  // Approving writes a one-time exception, exactly like
  // approve_reschedule_request in the real DB — `slots` is never mutated,
  // so the recurring lesson is unaffected on every other week.
  function decideRequest(id: string, decision: "approve" | "decline") {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    if (decision === "approve") {
      setExceptions((prev) => [
        ...prev,
        {
          id: newId(),
          originalSlotId: req.originalSlotId,
          originalDate: req.originalDate,
          newDate: req.newDate,
          newStartTime: req.newStartTime,
          newDurationMinutes: req.durationMinutes,
        },
      ]);
    }
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  const navItems: NavItem[] = TABS.map((t) => ({
    key: t.key,
    label: t.label,
    shortLabel: "shortLabel" in t ? t.shortLabel : undefined,
    icon: t.icon,
    active: tab === t.key,
    onClick: () => setTab(t.key),
  }));

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink px-4 py-1.5 text-center text-xs font-semibold text-cream">
        Προεπισκόπηση με πλαστά δεδομένα
      </div>
      <ResponsiveNav brand={<Logo markClassName="h-7 w-7" textClassName="text-lg" />} items={navItems} />

      <main className="px-4 py-6 pb-24 sm:px-6 sm:pb-6">
        {tab === "dashboard" && (
          <DashboardTab
            tutorSlug={tutorSlug}
            activeStudents={activeStudents}
            inactiveStudents={inactiveStudents}
            requests={requests}
            exceptions={exceptions}
            students={students}
            onAdd={addStudent}
            onRemove={removeStudent}
            onReactivate={reactivateStudent}
            onRegenerate={regenerateLink}
            onDecide={decideRequest}
            onSetCustomSlug={setCustomSlug}
            onAddSlot={addSlot}
            onUpdateSlot={updateSlot}
            onRemoveSlot={removeSlot}
            hasAvailability={availability.length > 0}
            onGoToAvailability={() => setTab("availability")}
          />
        )}
        {tab === "availability" && (
          <AvailabilityTab availability={availability} setAvailability={setAvailability} />
        )}
        {tab === "billing" && <BillingTab activeCount={activeStudents.length} />}
        {tab === "settings" && (
          <SettingsTab tutorName={tutorName} tutorSlug={tutorSlug} setTutorSlug={setTutorSlug} />
        )}
        {tab === "student" && (
          <StudentPreviewTab
            tutorName={tutorName}
            tutorSlug={tutorSlug}
            students={activeStudents}
            allActiveSlots={activeStudents.flatMap((s) => s.slots)}
            exceptions={exceptions}
            selectedId={previewStudentId}
            onSelect={setPreviewStudentId}
            availability={availability}
            pendingRequests={requests}
            onRequest={(req) => setRequests((prev) => [...prev, req])}
          />
        )}
      </main>
    </div>
  );
}

function DashboardTab({
  tutorSlug,
  activeStudents,
  inactiveStudents,
  requests,
  exceptions,
  students,
  onAdd,
  onRemove,
  onReactivate,
  onRegenerate,
  onDecide,
  onSetCustomSlug,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  hasAvailability,
  onGoToAvailability,
}: {
  tutorSlug: string;
  activeStudents: MockStudent[];
  inactiveStudents: MockStudent[];
  requests: MockRequest[];
  exceptions: MockException[];
  students: MockStudent[];
  onAdd: (input: { name: string; subject: string; contactEmail: string; dayOfWeek: number; startTime: string; durationMinutes: number }) => void;
  onRemove: (id: string) => void;
  onReactivate: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDecide: (id: string, decision: "approve" | "decline") => void;
  onSetCustomSlug: (id: string, newSlug: string) => { ok: true } | { ok: false; error: string };
  onAddSlot: (studentId: string, input: { dayOfWeek: number; startTime: string; durationMinutes: number }) => Promise<ActionResult>;
  onUpdateSlot: (slotId: string, input: { dayOfWeek: number; startTime: string; durationMinutes: number }) => Promise<ActionResult>;
  onRemoveSlot: (slotId: string) => Promise<ActionResult>;
  hasAvailability: boolean;
  onGoToAvailability: () => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("16:00");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);

  function findLesson(slotId: string) {
    for (const student of students) {
      const slot = student.slots.find((s) => s.id === slotId);
      if (slot) return { student, slot };
    }
    return null;
  }

  const calendarEntries: CalendarEntry[] = activeStudents.flatMap((student) =>
    student.slots.map((slot) => ({
      slotId: slot.id,
      studentId: student.id,
      studentName: student.name,
      subject: student.subject,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      durationMinutes: slot.durationMinutes,
    }))
  );

  const todayDayOfWeek = new Date().getDay();
  const lessonsToday = activeStudents.flatMap((s) => s.slots.filter((sl) => sl.dayOfWeek === todayDayOfWeek));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Γεια σου!</h1>
        <p className="mt-1 text-sm text-ink-soft">Να τι συμβαίνει στο πρόγραμμά σου αυτή τη στιγμή.</p>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
        <MockStatTile icon={<IconUsers />} label="Μαθητές" value={activeStudents.length} />
        <MockStatTile icon={<IconBell />} label="Αιτήματα" value={requests.length} />
        <MockStatTile icon={<IconClock />} label="Σήμερα" value={lessonsToday.length} />
      </section>

      {!hasAvailability && activeStudents.length > 0 && (
        <button
          onClick={onGoToAvailability}
          className="rounded-2xl bg-accent-soft p-4 text-left text-sm text-accent-dark transition active:scale-[0.99]"
        >
          Δεν έχεις ορίσει ακόμα πότε μπορείς να κάνεις μάθημα. Μέχρι τότε, οι μαθητές σου δεν
          μπορούν να ζητήσουν αλλαγή ώρας. <span className="font-semibold underline">Όρισέ το εδώ</span>
        </button>
      )}

      {requests.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Αιτήματα αλλαγής ώρας</h2>
          {requests.map((r) => {
            const found = findLesson(r.originalSlotId);
            return (
              <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-cream-dark bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={found?.student.name ?? "?"} />
                  <div>
                    <p className="text-lg font-semibold text-ink">{found?.student.name}</p>
                    <p className="text-sm text-ink-soft">
                      {found && `${dayLabel(found.slot.dayOfWeek)} ${timeLabel(found.slot.startTime)} → `}
                      <span className="font-medium text-accent-dark">
                        {dateLabel(r.newDate)}, {timeLabel(r.newStartTime)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    onClick={() => onDecide(r.id, "approve")}
                    className="flex-1 rounded-full bg-accent px-3 py-2.5 text-sm font-semibold text-cream transition active:scale-[0.98] hover:bg-accent-dark active:bg-accent-dark sm:flex-none"
                  >
                    Έγκριση
                  </button>
                  <button
                    onClick={() => onDecide(r.id, "decline")}
                    className="flex-1 rounded-full border border-cream-dark px-3 py-2.5 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark sm:flex-none"
                  >
                    Απόρριψη
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {exceptions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Προσωρινές αλλαγές</h2>
          {exceptions.map((exc) => {
            const found = findLesson(exc.originalSlotId);
            return (
              <div key={exc.id} className="flex items-center gap-3 rounded-2xl border border-accent-soft bg-white p-4">
                <Avatar name={found?.student.name ?? "?"} />
                <div>
                  <p className="text-lg font-semibold text-ink">{found?.student.name}</p>
                  <p className="text-sm text-ink-soft">
                    {dateLabel(exc.originalDate)} →{" "}
                    <span className="font-medium text-accent-dark">
                      {dateLabel(exc.newDate)}, {timeLabel(exc.newStartTime)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Εβδομαδιαίο πρόγραμμα</h2>
        <CalendarView entries={calendarEntries} onUpdate={onUpdateSlot} onRemove={onRemoveSlot} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Μαθητές</h2>
        {activeStudents.map((student) => {
          const link = `http://localhost:3000${studentLinkPath(tutorSlug, student.slug)}`;
          const lessonText =
            student.slots.length === 0
              ? "Χωρίς ώρα μαθήματος ακόμα"
              : student.slots.length === 1
                ? `${dayLabel(student.slots[0].dayOfWeek)}, ${timeLabel(student.slots[0].startTime)}`
                : `${student.slots.length} μαθήματα την εβδομάδα`;
          return (
            <Expandable
              key={student.id}
              header={
                <div className="flex items-center gap-3">
                  <Avatar name={student.name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {student.name} <span className="font-normal text-ink-soft">— {student.subject}</span>
                    </p>
                    <p className="truncate text-xs text-ink-soft">{lessonText}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(link);
                      setCopiedId(student.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-cream transition active:scale-95 hover:opacity-90 active:opacity-80"
                  >
                    {copiedId === student.id ? <IconArrowRight /> : <IconCopy />}
                    {copiedId === student.id && "Έγινε!"}
                  </button>
                </div>
              }
            >
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onRegenerate(student.id)}
                  className="flex items-center gap-1.5 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
                >
                  <IconRefresh />
                  Νέος σύνδεσμος
                </button>
                <button
                  onClick={() => onRemove(student.id)}
                  className="flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition active:scale-[0.98] hover:bg-red-50 active:bg-red-50"
                >
                  <IconTrash />
                  Αφαίρεση
                </button>
              </div>
              <MockCustomSlugEditor studentId={student.id} currentSlug={student.slug} onSetCustomSlug={onSetCustomSlug} />
              <MockAddLessonButton studentId={student.id} onAddSlot={onAddSlot} />
            </Expandable>
          );
        })}
      </section>

      {inactiveStudents.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Αφαιρεμένοι μαθητές</h2>
          {inactiveStudents.map((student) => (
            <div key={student.id} className="flex items-center justify-between rounded-2xl border border-cream-dark bg-white p-4 opacity-70">
              <div className="flex items-center gap-3">
                <Avatar name={student.name} />
                <p className="text-ink">
                  {student.name} — {student.subject}
                </p>
              </div>
              <button
                onClick={() => onReactivate(student.id)}
                className="flex items-center gap-1.5 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
              >
                <IconRefresh />
                Επαναφορά
              </button>
            </div>
          ))}
        </section>
      )}

      {!addFormOpen ? (
        <button
          onClick={() => setAddFormOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-cream-dark bg-white px-4 py-4 text-base font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
        >
          <IconPlus />
          Πρόσθεσε μαθητή
        </button>
      ) : (
      <section className="flex flex-col gap-3 rounded-2xl border border-cream-dark bg-white p-4">
        <h3 className="text-lg font-semibold text-ink">Πρόσθεσε μαθητή</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα"
          className="rounded-md border border-cream-dark px-3 py-2 text-base"
        />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Μάθημα"
          className="rounded-md border border-cream-dark px-3 py-2 text-base"
        />
        <input
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="Email γονέα/μαθητή (προαιρετικό)"
          className="rounded-md border border-cream-dark px-3 py-2 text-base"
        />
        <div className="flex gap-3">
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-base"
          >
            {GREEK_DAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
          <TimeSelect
            value={startTime}
            onChange={setStartTime}
            className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-base"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!name.trim() || !subject.trim()) return;
              onAdd({ name, subject, contactEmail, dayOfWeek, startTime, durationMinutes: 60 });
              setName("");
              setSubject("");
              setContactEmail("");
              setAddFormOpen(false);
            }}
            className="rounded-full bg-accent px-4 py-3 text-base font-semibold text-cream transition active:scale-[0.98] hover:bg-accent-dark active:bg-accent-dark"
          >
            Προσθήκη μαθητή
          </button>
          <button
            onClick={() => setAddFormOpen(false)}
            className="rounded-full border border-cream-dark px-4 py-3 text-base font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
          >
            Άκυρο
          </button>
        </div>
      </section>
      )}
    </div>
  );
}

function AvailabilityTab({
  availability,
  setAvailability,
}: {
  availability: MockAvailability[];
  setAvailability: (updater: (prev: MockAvailability[]) => MockAvailability[]) => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("21:00");
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Πότε μπορείς να κάνεις μάθημα</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Οι μαθητές θα βλέπουν μόνο ελεύθερες ώρες μέσα σε αυτά τα διαστήματα, όταν ζητάνε αλλαγή.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {availability
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-cream-dark bg-white p-4">
              <p className="text-ink">
                {dayLabel(w.dayOfWeek)}: {timeLabel(w.startTime)}–{timeLabel(w.endTime)}
              </p>
              <button
                onClick={() => setAvailability((prev) => prev.filter((x) => x.id !== w.id))}
                className="rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark"
              >
                Αφαίρεση
              </button>
            </div>
          ))}
        {availability.length === 0 && <p className="text-sm text-ink-soft">Δεν έχεις ορίσει ακόμα διαθεσιμότητα.</p>}
      </div>

      {!formOpen ? (
        <button
          onClick={() => setFormOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-cream-dark bg-white px-4 py-4 text-base font-medium text-ink-soft transition hover:bg-cream-dark active:scale-[0.98] active:bg-cream-dark"
        >
          <IconPlus />
          Πρόσθεσε διαθεσιμότητα
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-cream-dark bg-white p-4">
          <h3 className="text-lg font-semibold text-ink">Πρόσθεσε διαθεσιμότητα</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-base"
            >
              {GREEK_DAY_LABELS.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
            <TimeSelect
              value={startTime}
              onChange={setStartTime}
              className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-base"
            />
            <TimeSelect
              value={endTime}
              onChange={setEndTime}
              className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-base"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (endTime <= startTime) return;
                setAvailability((prev) => [...prev, { id: newId(), dayOfWeek, startTime, endTime }]);
                setFormOpen(false);
              }}
              className="rounded-full bg-accent px-4 py-3 text-base font-semibold text-cream transition hover:bg-accent-dark active:scale-[0.98] active:bg-accent-dark"
            >
              Προσθήκη
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="rounded-full border border-cream-dark px-4 py-3 text-base font-medium text-ink-soft transition hover:bg-cream-dark active:scale-[0.98] active:bg-cream-dark"
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BillingTab({ activeCount }: { activeCount: number }) {
  const charge = monthlyChargeEur(activeCount);
  const billed = billedQuantity(activeCount);
  const nearLimit = activeCount === FREE_STUDENT_COUNT;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Η συνδρομή σου</h1>

      <div className="rounded-xl border border-cream-dark bg-white p-4">
        <p className="text-sm text-ink-soft">Μαθητές αυτή τη στιγμή</p>
        <p className="text-2xl font-semibold text-ink">{activeCount}</p>
      </div>

      <div className="rounded-xl border border-cream-dark bg-white p-4">
        <p className="text-sm text-ink-soft">Μηνιαία χρέωση</p>
        <p className="text-2xl font-semibold text-ink">{charge}€ / μήνα</p>
        <p className="mt-1 text-sm text-ink-soft">
          Οι πρώτοι {FREE_STUDENT_COUNT} μαθητές είναι δωρεάν. Μετά, {PRICE_PER_STUDENT_EUR}€ ανά
          μαθητή τον μήνα, με ανώτατο όριο {BILLED_STUDENT_CAP * PRICE_PER_STUDENT_EUR}€.
        </p>
        {billed >= BILLED_STUDENT_CAP && (
          <p className="mt-1 text-sm text-ink-soft">
            Έχεις φτάσει το ανώτατο όριο χρέωσης — επιπλέον μαθητές δεν προσθέτουν κόστος.
          </p>
        )}
      </div>

      {nearLimit && (
        <div className="rounded-xl bg-accent-soft p-4 text-sm text-accent-dark">
          Ο επόμενος μαθητής που θα προσθέσεις θα ξεκινήσει τη χρέωση των {PRICE_PER_STUDENT_EUR}€/μήνα.
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  tutorName,
  tutorSlug,
  setTutorSlug,
}: {
  tutorName: string;
  tutorSlug: string;
  setTutorSlug: (slug: string) => void;
}) {
  const [draft, setDraft] = useState(tutorSlug);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Ρυθμίσεις</h1>
      <p className="text-sm text-ink-soft">Συνδεδεμένος ως {tutorName}</p>

      <div className="flex flex-col gap-3 rounded-xl border border-cream-dark bg-white p-4">
        <h3 className="text-lg font-semibold text-ink">Ο δικός σου σύνδεσμος</h3>
        <p className="text-sm text-ink-soft">
          Αυτό είναι το πρώτο κομμάτι του συνδέσμου κάθε μαθητή σου: oraki.gr/
          <span className="text-lg font-semibold text-ink">{draft || "..."}</span>/...
        </p>
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value.toLowerCase());
            setSaved(false);
          }}
          className="rounded-md border border-cream-dark px-3 py-2 text-base"
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        {saved && <p className="text-sm text-accent-dark">Αποθηκεύτηκε!</p>}
        <button
          onClick={() => {
            if (!isValidTutorSlug(draft)) {
              setError("Ο σύνδεσμος πρέπει να έχει 3-40 λατινικούς χαρακτήρες/αριθμούς/παύλες");
              return;
            }
            setError(null);
            setTutorSlug(draft);
            setSaved(true);
          }}
          className="self-start rounded-full bg-ink px-4 py-3 text-base font-semibold text-cream hover:opacity-90 active:opacity-80"
        >
          Αποθήκευση
        </button>
      </div>
    </div>
  );
}

function StudentPreviewTab({
  tutorName,
  tutorSlug,
  students,
  allActiveSlots,
  exceptions,
  selectedId,
  onSelect,
  availability,
  pendingRequests,
  onRequest,
}: {
  tutorName: string;
  tutorSlug: string;
  students: MockStudent[];
  allActiveSlots: MockSlot[];
  exceptions: MockException[];
  selectedId: string;
  onSelect: (id: string) => void;
  availability: MockAvailability[];
  pendingRequests: MockRequest[];
  onRequest: (req: MockRequest) => void;
}) {
  const student = students.find((s) => s.id === selectedId) ?? students[0];
  const pendingForStudent = pendingRequests.filter((r) => r.studentId === student?.id);
  const availableLessons = (student?.slots ?? []).filter(
    (slot) => !pendingForStudent.some((r) => r.originalSlotId === slot.id)
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selectedLesson = student?.slots.find((s) => s.id === selectedLessonId) ?? null;

  const openSlots: OpenSlot[] = useMemo(() => {
    if (!selectedLesson) return [];
    const bookedOccurrences = computeOccurrences(allActiveSlots, exceptions, new Date(), 14);
    const windows = availability.map((w) => ({ dayOfWeek: w.dayOfWeek, startTime: w.startTime, endTime: w.endTime }));
    return computeOpenSlotsForDateRange(windows, bookedOccurrences, selectedLesson.durationMinutes, new Date(), 14);
  }, [selectedLesson, allActiveSlots, exceptions, availability]);

  // Same grouped day→time picker as the real student page: one decision
  // at a time instead of a flat list of every slot across two weeks.
  const slotsByDate = useMemo(() => {
    const map = new Map<string, OpenSlot[]>();
    for (const slot of openSlots) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    return map;
  }, [openSlots]);

  const dates = useMemo(() => [...slotsByDate.keys()].sort(), [slotsByDate]);
  const activeDate = selectedDate ?? dates[0] ?? null;

  if (!student) return <p className="text-ink-soft">Δεν υπάρχουν ενεργοί μαθητές να προβάλεις.</p>;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-ink-soft">Προβολή ως:</label>
        <select
          value={selectedId}
          onChange={(e) => {
            onSelect(e.target.value);
            setSelectedLessonId(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setSubmitted(false);
          }}
          className="rounded-md border border-cream-dark px-3 py-2 text-sm"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-ink-soft">
        Αυτό βλέπει ο μαθητής στο oraki.gr/{tutorSlug}/{student.slug}
      </p>

      <div className="rounded-3xl border border-cream-dark bg-white p-6 shadow-sm">
        <p className="text-sm text-ink-soft">Καθηγητής: {tutorName}</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Γεια σου, {student.name.split(" ")[0]}!</h1>
        <p className="text-sm text-ink-soft">{student.subject}</p>

        <div className="mt-4 rounded-xl border border-cream-dark p-4">
          <h2 className="text-lg font-semibold text-ink">{student.slots.length > 1 ? "Τα μαθήματά σου" : "Το μάθημά σου"}</h2>
          {student.slots.length === 0 && <p className="mt-2 text-sm text-ink-soft">Δεν έχει οριστεί ακόμα ώρα μαθήματος.</p>}
          <ul className="mt-2 flex flex-col gap-2 text-ink">
            {student.slots.map((slot) => {
              const pending = pendingForStudent.find((r) => r.originalSlotId === slot.id);
              return (
                <li key={slot.id}>
                  {dayLabel(slot.dayOfWeek)}, {timeLabel(slot.startTime)} ({slot.durationMinutes}′)
                  {pending && (
                    <p className="mt-0.5 w-fit rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-dark">
                      Ζήτησες: {dateLabel(pending.newDate)}, {timeLabel(pending.newStartTime)} (περιμένει απάντηση)
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4">
          {submitted ? (
            <p className="rounded-xl bg-accent-soft p-4 text-accent-dark">
              Το αίτημά σου στάλθηκε. Θα ενημερωθείς μόλις απαντήσει ο καθηγητής.
            </p>
          ) : availableLessons.length === 0 ? (
            student.slots.length === 0 ? null : (
              <p className="rounded-xl bg-accent-soft p-4 text-sm text-accent-dark">
                Το αίτημά σου έχει σταλεί. Θα ενημερωθείς μόλις απαντήσει ο καθηγητής.
              </p>
            )
          ) : !selectedLessonId ? (
            <div className="flex flex-col gap-3">
              {availableLessons.length > 1 && <p className="text-sm font-medium text-ink">Για ποιο μάθημα θέλεις άλλη ώρα;</p>}
              <div className="flex flex-col gap-2">
                {availableLessons.length === 1 ? (
                  <button
                    onClick={() => setSelectedLessonId(availableLessons[0].id)}
                    className="w-full rounded-full bg-ink px-4 py-4 text-base font-semibold text-cream transition hover:opacity-90 active:scale-[0.98] active:opacity-80"
                  >
                    Ζήτησε άλλη ώρα
                  </button>
                ) : (
                  availableLessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className="rounded-xl border border-cream-dark bg-cream px-4 py-3 text-left text-base text-ink transition hover:bg-cream-dark active:bg-cream-dark"
                    >
                      {dayLabel(lesson.dayOfWeek)}, {timeLabel(lesson.startTime)}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {dates.length === 0 && <p className="text-sm text-ink-soft">Δεν υπάρχουν διαθέσιμες ώρες τις επόμενες μέρες.</p>}

              {dates.length > 0 && (
                <>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-ink">Διάλεξε μέρα</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {dates.map((date) => (
                        <button
                          key={date}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedTime(null);
                          }}
                          className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
                            activeDate === date
                              ? "bg-ink text-cream"
                              : "border border-cream-dark bg-white text-ink-soft"
                          }`}
                        >
                          {dateLabel(date)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeDate && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-ink">Διάλεξε ώρα</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(slotsByDate.get(activeDate) ?? []).map((slot) => (
                          <button
                            key={slot.startTime}
                            onClick={() => setSelectedTime(slot.startTime)}
                            className={`rounded-xl px-3 py-3 text-base font-medium transition active:scale-95 ${
                              selectedTime === slot.startTime
                                ? "bg-accent text-cream"
                                : "border border-cream-dark bg-white text-ink"
                            }`}
                          >
                            {timeLabel(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                disabled={!selectedTime || !activeDate}
                onClick={() => {
                  if (!selectedTime || !activeDate || !selectedLesson) return;
                  onRequest({
                    id: newId(),
                    studentId: student.id,
                    originalSlotId: selectedLesson.id,
                    originalDate: nextOccurrenceDate(selectedLesson.dayOfWeek),
                    newDate: activeDate,
                    newStartTime: selectedTime,
                    durationMinutes: selectedLesson.durationMinutes,
                  });
                  setSubmitted(true);
                }}
                className="rounded-full bg-ink px-4 py-4 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
              >
                Επιβεβαίωση αιτήματος
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MockCustomSlugEditor({
  studentId,
  currentSlug,
  onSetCustomSlug,
}: {
  studentId: string;
  currentSlug: string;
  onSetCustomSlug: (id: string, newSlug: string) => { ok: true } | { ok: false; error: string };
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentSlug);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
      >
        <IconPencil />
        Δικός μου σύνδεσμος
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-cream-dark p-3">
      <label className="text-xs text-ink-soft">
        Γράψε το κομμάτι του συνδέσμου που θέλεις μετά το όνομά σου (π.χ. &quot;gerdinos&quot;)
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-base"
        />
        <button
          onClick={() => {
            const result = onSetCustomSlug(studentId, value);
            if (result.ok) {
              setError(null);
              setOpen(false);
            } else {
              setError(result.error);
            }
          }}
          className="rounded-md bg-ink px-3 py-2 text-sm font-semibold text-cream hover:opacity-90 active:opacity-80"
        >
          Αποθήκευση
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setValue(currentSlug);
            setError(null);
          }}
          className="rounded-md border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark"
        >
          Άκυρο
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

function MockAddLessonButton({
  studentId,
  onAddSlot,
}: {
  studentId: string;
  onAddSlot: (studentId: string, input: { dayOfWeek: number; startTime: string; durationMinutes: number }) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("16:00");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
      >
        <IconPlus />
        Ώρα μαθήματος
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-cream-dark p-3">
      <div className="flex gap-2">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="flex-1 rounded-md border border-cream-dark px-2 py-1.5 text-sm"
        >
          {GREEK_DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
        <TimeSelect value={startTime} onChange={setStartTime} className="rounded-md border border-cream-dark px-2 py-1.5 text-sm" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await onAddSlot(studentId, { dayOfWeek, startTime, durationMinutes: 60 });
            setOpen(false);
          }}
          className="rounded-full bg-ink px-3 py-2 text-sm font-semibold text-cream hover:opacity-90 active:opacity-80"
        >
          Προσθήκη
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark"
        >
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function MockStatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-cream-dark bg-white p-3 text-center sm:flex-1 sm:flex-row sm:items-center sm:gap-3 sm:p-4 sm:text-left">
      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark sm:flex">
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold leading-none text-ink sm:text-2xl">{value}</p>
        <p className="mt-1 text-[11px] leading-tight text-ink-soft sm:text-xs">{label}</p>
      </div>
    </div>
  );
}
