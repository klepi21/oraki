import { ensureTutorRecord } from "@/lib/tutors";
import { OnboardingForm } from "@/app/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  await ensureTutorRecord();

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Πρόσθεσε τον πρώτο σου μαθητή</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Μετά θα σου δώσουμε έναν σύνδεσμο να τον στείλεις στον γονέα ή στον μαθητή.
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
