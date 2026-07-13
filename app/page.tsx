import type { Metadata } from "next";
import Link from "next/link";
import { Logo, LogoMark } from "@/app/components/Logo";
import {
  IconLink,
  IconUsers,
  IconBell,
  IconRefresh,
  IconCalendarDays,
  IconShieldCheck,
  IconCheckBadge,
} from "@/app/components/icons";

export const metadata: Metadata = {
  title: "Oraki | Πρόγραμμα μαθημάτων για καθηγητές ιδιαιτέρων, χωρίς τηλεφωνήματα",
  description:
    "Το Oraki οργανώνει τα ιδιαίτερα μαθήματά σου. Κάθε γονιός έχει τον δικό του σύνδεσμο, βλέπει μόνο το δικό του μάθημα και ζητάει αλλαγή ώρας με ένα άγγιγμα. Δωρεάν για 2 μαθητές.",
  keywords: [
    "πρόγραμμα ιδιαιτέρων μαθημάτων",
    "καθηγητής ιδιαιτέρων",
    "οργάνωση ιδιαίτερα μαθήματα",
    "αλλαγή ώρας μαθήματος",
    "πρόγραμμα καθηγητή",
    "ιδιαίτερα μαθήματα εφαρμογή",
  ],
  alternates: { canonical: "https://oraki.gr" },
  openGraph: {
    title: "Oraki | Το πρόγραμμα των μαθημάτων σου, χωρίς τηλεφωνήματα",
    description:
      "Οργάνωσε τα ιδιαίτερα μαθήματά σου σε μία σελίδα. Οι γονείς ζητούν αλλαγή ώρας με ένα άγγιγμα και εσύ απλώς εγκρίνεις.",
    url: "https://oraki.gr",
    siteName: "Oraki",
    locale: "el_GR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Oraki | Πρόγραμμα μαθημάτων για καθηγητές ιδιαιτέρων",
    description: "Οι γονείς ζητούν αλλαγή ώρας με ένα άγγιγμα και εσύ απλώς εγκρίνεις. Δωρεάν για 2 μαθητές.",
  },
};

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Τι χρειάζεται να κάνει ο γονιός ή ο μαθητής;",
    a: "Απολύτως τίποτα. Δεν φτιάχνει λογαριασμό, δεν κατεβάζει εφαρμογή, δεν θυμάται κωδικούς. Ανοίγει τον σύνδεσμο που του έστειλες, βλέπει την ώρα του μαθήματος και, αν χρειαστεί, ζητάει άλλη ώρα με ένα άγγιγμα.",
  },
  {
    q: "Πώς στέλνω τον σύνδεσμο στους γονείς;",
    a: "Όπως επικοινωνείς ήδη μαζί τους: Viber, WhatsApp, SMS ή email. Πατάς «Αντιγραφή συνδέσμου» στον πίνακά σου και τον στέλνεις μία φορά. Από εκεί και πέρα ο γονιός τον κρατάει αποθηκευμένο.",
  },
  {
    q: "Τι βλέπει ο κάθε γονιός όταν ανοίγει τον σύνδεσμό του;",
    a: "Μόνο το δικό του μάθημα: τη μέρα, την ώρα και το όνομα του καθηγητή. Ποτέ τα μαθήματα, τα ονόματα ή τις ώρες άλλων μαθητών. Ακόμα και όταν ζητάει αλλαγή, βλέπει μόνο τις ώρες που είσαι πραγματικά ελεύθερος.",
  },
  {
    q: "Η αλλαγή ώρας είναι μόνιμη;",
    a: "Όχι. Όταν εγκρίνεις ένα αίτημα, το μάθημα μετακινείται μόνο για εκείνη τη φορά. Την επόμενη εβδομάδα το πρόγραμμα συνεχίζει κανονικά στη σταθερή του ώρα. Αν θέλεις μόνιμη αλλαγή, την κάνεις εσύ από τον πίνακά σου σε δευτερόλεπτα.",
  },
  {
    q: "Τι γίνεται αν χαθεί ή διαρρεύσει ένας σύνδεσμος;",
    a: "Πατάς «Νέος σύνδεσμος» και ο παλιός σταματάει να δουλεύει αμέσως. Στέλνεις τον καινούριο στον γονιό και τελείωσες.",
  },
  {
    q: "Πόσο κοστίζει το Oraki;",
    a: "Για τους 2 πρώτους μαθητές είναι εντελώς δωρεάν, χωρίς κάρτα. Μετά κοστίζει 2 ευρώ ανά μαθητή τον μήνα, με ανώτατο όριο τα 25 ευρώ τον μήνα, όσους μαθητές κι αν έχεις. Ακυρώνεις όποτε θέλεις.",
  },
  {
    q: "Είναι ασφαλή τα δεδομένα μου και των μαθητών μου;",
    a: "Ναι. Τα δεδομένα είναι κρυπτογραφημένα κατά την αποθήκευση και τη μεταφορά τους, και η πρόσβαση είναι περιορισμένη εκ σχεδιασμού: ο σύνδεσμος ενός γονιού δείχνει μόνο τα δικά του μαθήματα. Δεν πουλάμε και δεν μοιραζόμαστε τα δεδομένα σου με κανέναν.",
  },
  {
    q: "Δουλεύει στο κινητό;",
    a: "Παντού. Το Oraki είναι φτιαγμένο πρώτα για κινητό, γιατί εκεί το ανοίγουν οι γονείς. Δουλεύει σε κάθε τηλέφωνο, tablet και υπολογιστή, χωρίς εγκατάσταση. Το δικό σου πρόγραμμα μπαίνει και στο ημερολόγιο του κινητού σου με ένα κουμπί.",
  },
];

const FEATURES = [
  {
    icon: <IconLink className="h-5 w-5 stroke-current" />,
    title: "Ένας σύνδεσμος για κάθε μαθητή",
    body: "Τον στέλνεις μία φορά, από όπου θέλεις: Viber, WhatsApp, SMS. Ο γονιός τον ανοίγει και βλέπει αμέσως πότε έχει μάθημα το παιδί του.",
  },
  {
    icon: <IconUsers className="h-5 w-5 stroke-current" />,
    title: "Χωρίς λογαριασμούς για γονείς",
    body: "Κανένας κωδικός, καμία εγκατάσταση, καμία εφαρμογή για να μάθουν. Ανοίγουν τον σύνδεσμο και όλα είναι εκεί.",
  },
  {
    icon: <IconBell className="h-5 w-5 stroke-current" />,
    title: "Εσύ έχεις τον τελευταίο λόγο",
    body: "Καμία αλλαγή δεν γίνεται μόνη της. Κάθε αίτημα έρχεται σε σένα και το εγκρίνεις ή το απορρίπτεις με ένα άγγιγμα.",
  },
  {
    icon: <IconRefresh className="h-5 w-5 stroke-current" />,
    title: "Η αλλαγή ισχύει για μία φορά",
    body: "Όταν ένα μάθημα μετακινηθεί, μετακινείται μόνο για εκείνη την εβδομάδα. Το σταθερό πρόγραμμα συνεχίζει όπως πριν, χωρίς μπερδέματα.",
  },
  {
    icon: <IconCalendarDays className="h-5 w-5 stroke-current" />,
    title: "Στο ημερολόγιο του κινητού σου",
    body: "Με ένα κουμπί, όλο το πρόγραμμα μπαίνει στο Google ή στο Apple Calendar και ενημερώνεται μόνο του σε κάθε αλλαγή.",
  },
  {
    icon: <IconShieldCheck className="h-5 w-5 stroke-current" />,
    title: "Ιδιωτικότητα εκ σχεδιασμού",
    body: "Οι γονείς βλέπουν μόνο τις ώρες που είσαι πραγματικά διαθέσιμος. Ποτέ ποιος άλλος μαθητής έχει μάθημα, ούτε πότε.",
  },
];

function StructuredData() {
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Oraki",
    url: "https://oraki.gr",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "el",
    description:
      "Εργαλείο οργάνωσης προγράμματος για καθηγητές ιδιαιτέρων μαθημάτων. Οι γονείς βλέπουν το μάθημά τους από προσωπικό σύνδεσμο και ζητούν αλλαγή ώρας με ένα άγγιγμα.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Δωρεάν για τους 2 πρώτους μαθητές. Μετά 2 ευρώ ανά μαθητή τον μήνα, με ανώτατο όριο 25 ευρώ.",
    },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(app) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
    </>
  );
}

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <StructuredData />

      <header className="sticky top-0 z-20 bg-cream/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-6">
            <Link href="#pos-doulevei" className="hidden text-sm font-medium text-ink-soft transition hover:text-ink sm:block">
              Πώς δουλεύει
            </Link>
            <Link href="#timi" className="hidden text-sm font-medium text-ink-soft transition hover:text-ink sm:block">
              Τιμή
            </Link>
            <Link href="#faq" className="hidden text-sm font-medium text-ink-soft transition hover:text-ink sm:block">
              Συχνές ερωτήσεις
            </Link>
            <Link href="/sign-in" className="text-sm font-medium text-ink-soft transition hover:text-ink">
              Είσοδος
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream transition hover:opacity-90 active:scale-[0.98] active:opacity-80"
            >
              Ξεκίνα δωρεάν
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-14 sm:py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col items-start gap-7">
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-dark">
            Για καθηγητές ιδιαιτέρων στην Ελλάδα
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Το πρόγραμμα των μαθημάτων σου,
            <span className="text-accent"> χωρίς τηλεφωνήματα</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-ink-soft">
            Ξέρεις τη σκηνή: «Κύριε, μπορούμε την Τετάρτη αντί για Τρίτη;» και αρχίζουν τα
            μηνύματα, οι κλήσεις και το ξεφύλλισμα στο ημερολόγιο. Το Oraki τα κόβει όλα αυτά.
            Κάθε γονιός έχει τον δικό του σύνδεσμο, βλέπει μόνο το δικό του μάθημα και ζητάει
            αλλαγή ώρας με ένα άγγιγμα. Εσύ απλώς εγκρίνεις.
          </p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/sign-up"
              className="rounded-full bg-accent px-7 py-4 text-base font-semibold text-cream shadow-sm shadow-accent/30 transition hover:shadow-md active:scale-[0.98] active:bg-accent-dark"
            >
              Ξεκίνα δωρεάν
            </Link>
            <Link
              href="#pos-doulevei"
              className="rounded-full border border-cream-dark bg-white px-7 py-4 text-base font-semibold text-ink transition hover:bg-cream-dark active:scale-[0.98]"
            >
              Δες πώς δουλεύει
            </Link>
          </div>
          <p className="text-sm text-ink-soft">
            Δωρεάν για τους 2 πρώτους μαθητές. Χωρίς κάρτα, χωρίς δέσμευση.
          </p>
        </div>

        {/* Product preview mockup */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent-soft blur-2xl" />
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-xl shadow-ink/10">
            <div className="flex items-center justify-between border-b border-cream-dark pb-3">
              <span className="text-sm font-semibold text-ink">Το πρόγραμμά σου</span>
              <span className="rounded-full bg-cream-dark px-2 py-0.5 text-xs font-medium text-ink-soft">
                Τρίτη
              </span>
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {[
                { name: "Μαρία Π.", subject: "Μαθηματικά", time: "16:00" },
                { name: "Γιώργος Κ.", subject: "Φυσική", time: "17:30" },
                { name: "Ελένη Ν.", subject: "Αγγλικά", time: "19:00" },
              ].map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between rounded-xl bg-cream px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{row.name}</p>
                    <p className="text-xs text-ink-soft">{row.subject}</p>
                  </div>
                  <span className="text-sm font-semibold text-accent-dark">{row.time}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-soft px-3 py-2.5">
              <span className="text-xs font-semibold text-accent-dark">1 αίτημα αλλαγής ώρας</span>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-accent-dark">
                Δες το
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-cream-dark bg-white/60 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
            Φτιαγμένο για το πώς δουλεύεις ήδη
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft">
            Δεν αλλάζεις τίποτα στον τρόπο που επικοινωνείς με τις οικογένειες. Το Oraki
            αναλαμβάνει μόνο το κομμάτι που σου τρώει χρόνο: το πρόγραμμα και τις αλλαγές του.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 rounded-2xl border border-cream-dark bg-white p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-dark">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-ink">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="pos-doulevei" className="scroll-mt-20 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">Πώς δουλεύει</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft">
            Τρία βήματα και μετά το πρόγραμμα φροντίζει τον εαυτό του.
          </p>
          <ol className="mt-12 flex flex-col gap-8">
            {[
              {
                title: "Βάλε τους μαθητές σου",
                body: "Όνομα, μάθημα, σταθερή μέρα και ώρα. Ένα λεπτό για τον καθένα, μία φορά. Αν κάποιος μαθητής κάνει δύο μαθήματα την εβδομάδα, βάζεις και τα δύο.",
              },
              {
                title: "Στείλε σε κάθε οικογένεια τον σύνδεσμό της",
                body: "Πατάς «Αντιγραφή συνδέσμου» και τον στέλνεις όπως θες: Viber, WhatsApp, SMS. Ο γονιός τον ανοίγει και βλέπει μόνο το δικό του μάθημα, χωρίς λογαριασμό και χωρίς εγκατάσταση.",
              },
              {
                title: "Έγκρινε τις αλλαγές με ένα άγγιγμα",
                body: "Όταν μια οικογένεια χρειαστεί άλλη ώρα, διαλέγει από τις ώρες που είσαι πραγματικά ελεύθερος και το αίτημα έρχεται σε σένα. Εγκρίνεις ή απορρίπτεις, και το πρόγραμμα ενημερώνεται παντού μόνο του.",
              },
            ].map((step, i) => (
              <li key={step.title} className="flex items-start gap-5 rounded-2xl border border-cream-dark bg-white p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-cream">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="timi" className="scroll-mt-20 border-t border-cream-dark bg-white/60 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
            Απλή τιμή, χωρίς ψιλά γράμματα
          </h2>
          <div className="mt-10 flex flex-col items-center gap-6 rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm">
            <p className="text-5xl font-extrabold tracking-tight text-ink">
              0€ <span className="text-lg font-medium text-ink-soft">για τους 2 πρώτους μαθητές</span>
            </p>
            <p className="max-w-md text-ink-soft">
              Μετά, <span className="font-semibold text-ink">2€ ανά μαθητή τον μήνα</span>. Δεν θα
              πληρώσεις ποτέ πάνω από <span className="font-semibold text-ink">25€ τον μήνα</span>,
              όσους μαθητές κι αν έχεις.
            </p>
            <ul className="flex flex-col gap-2 text-left text-sm text-ink-soft">
              {[
                "Απεριόριστα αιτήματα αλλαγής ώρας",
                "Προσωπικός σύνδεσμος για κάθε μαθητή",
                "Το πρόγραμμα στο ημερολόγιο του κινητού σου",
                "Χωρίς κάρτα για να ξεκινήσεις, ακύρωση όποτε θες",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <IconCheckBadge className="h-4 w-4 shrink-0 stroke-current text-accent-dark" />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="rounded-full bg-ink px-7 py-4 text-base font-semibold text-cream transition hover:opacity-90 active:scale-[0.98] active:opacity-80"
            >
              Ξεκίνα δωρεάν
            </Link>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="px-6 py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-dark">
            <IconShieldCheck className="h-7 w-7 stroke-current" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-ink">
            Τα δεδομένα των μαθητών σου είναι δική σου υπόθεση
          </h2>
          <p className="leading-relaxed text-ink-soft">
            Και το παίρνουμε σοβαρά. Τα δεδομένα είναι κρυπτογραφημένα κατά την αποθήκευση και τη
            μεταφορά τους, και η πρόσβαση είναι περιορισμένη εκ σχεδιασμού: ο σύνδεσμος ενός γονιού
            δείχνει μόνο τα δικά του μαθήματα, ποτέ κάποιου άλλου. Δεν πουλάμε και δεν μοιραζόμαστε
            τα δεδομένα σου με κανέναν. Αν αφαιρέσεις έναν μαθητή, ο σύνδεσμός του σταματάει να
            δουλεύει την ίδια στιγμή.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-cream-dark bg-white/60 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">Συχνές ερωτήσεις</h2>
          <div className="mt-10 flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-cream-dark bg-white p-5 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="text-xl font-medium text-accent-dark transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl bg-ink px-8 py-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-cream">
            Το επόμενο «αλλάζουμε ώρα;» να είναι ένα άγγιγμα
          </h2>
          <p className="max-w-md text-cream/80">
            Στήσε το πρόγραμμά σου σε πέντε λεπτά. Δωρεάν για τους 2 πρώτους μαθητές, χωρίς κάρτα.
          </p>
          <Link
            href="/sign-up"
            className="rounded-full bg-accent px-8 py-4 text-base font-semibold text-cream shadow-lg shadow-accent/25 transition hover:bg-accent-dark active:scale-[0.98]"
          >
            Ξεκίνα δωρεάν τώρα
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cream-dark px-6 py-14">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
              Το πρόγραμμα των ιδιαιτέρων σου, σε μια σελίδα. Φτιαγμένο για καθηγητές και για τις
              οικογένειες που τους εμπιστεύονται.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink">Oraki</h3>
            <Link href="#pos-doulevei" className="w-fit text-sm text-ink-soft transition hover:text-ink">
              Πώς δουλεύει
            </Link>
            <Link href="#timi" className="w-fit text-sm text-ink-soft transition hover:text-ink">
              Τιμή
            </Link>
            <Link href="#faq" className="w-fit text-sm text-ink-soft transition hover:text-ink">
              Συχνές ερωτήσεις
            </Link>
            <Link href="/sign-in" className="w-fit text-sm text-ink-soft transition hover:text-ink">
              Είσοδος
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink">Επικοινωνία</h3>
            <a href="mailto:support@oraki.gr" className="w-fit text-sm text-ink-soft transition hover:text-ink">
              support@oraki.gr
            </a>
            <p className="text-sm text-ink-soft">Απαντάμε συνήθως μέσα στην ίδια μέρα.</p>
          </div>
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col items-center justify-between gap-3 border-t border-cream-dark pt-6 sm:flex-row">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <LogoMark className="h-4 w-4" /> © {new Date().getFullYear()} Oraki. Με αγάπη από την Ελλάδα.
          </p>
          <p className="text-sm text-ink-soft">oraki.gr</p>
        </div>
      </footer>
    </main>
  );
}
