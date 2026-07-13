import { ensureTutorRecord } from "@/lib/tutors";
import { TutorSlugForm } from "@/app/dashboard/settings/TutorSlugForm";
import { CalendarFeedSection } from "@/app/dashboard/settings/CalendarFeedSection";

export default async function SettingsPage() {
  const tutor = await ensureTutorRecord();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://oraki.gr";
  const appHost = appUrl.replace(/^https?:\/\//, "");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Ρυθμίσεις</h1>
      <TutorSlugForm currentSlug={tutor.slug} appUrl={appUrl} />
      <CalendarFeedSection appHost={appHost} initialToken={tutor.calendar_feed_token} />
    </div>
  );
}
