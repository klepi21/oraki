import "server-only";
import { Resend } from "resend";

function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY!);
}

const FROM_ADDRESS = "Oraki <notifications@oraki.gr>";

export async function sendRescheduleRequestedEmail(params: {
  tutorEmail: string;
  studentName: string;
  requestedDayLabel: string;
  requestedTimeLabel: string;
}) {
  const resend = getResendClient();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.tutorEmail,
    subject: `Νέο αίτημα αλλαγής ώρας από ${params.studentName}`,
    html: `
      <p>Ο/Η <strong>${params.studentName}</strong> ζήτησε νέα ώρα μαθήματος:</p>
      <p>${params.requestedDayLabel}, ${params.requestedTimeLabel}</p>
      <p>Μπες στο πρόγραμμά σου για να το εγκρίνεις ή να το απορρίψεις.</p>
    `,
  });
}

export async function sendRescheduleDecisionEmail(params: {
  studentEmail: string;
  studentName: string;
  approved: boolean;
  declineReason?: string;
  dayLabel: string;
  timeLabel: string;
}) {
  const resend = getResendClient();
  const subject = params.approved
    ? "Η νέα ώρα μαθήματος επιβεβαιώθηκε"
    : "Η ώρα που ζήτησες δεν είναι διαθέσιμη";

  const body = params.approved
    ? `<p>Το μάθημα του/της ${params.studentName} μετακινήθηκε: ${params.dayLabel}, ${params.timeLabel}.</p>`
    : `<p>Δυστυχώς η ώρα που ζητήθηκε δεν είναι πια διαθέσιμη${
        params.declineReason ? `: ${params.declineReason}` : ""
      }. Δοκίμασε ξανά μέσα από τον προσωπικό σου σύνδεσμο.</p>`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.studentEmail,
    subject,
    html: body,
  });
}

export async function sendPaymentFailedEmail(params: { tutorEmail: string; graceDaysLeft: number }) {
  const resend = getResendClient();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.tutorEmail,
    subject: "Πρόβλημα με την πληρωμή σου",
    html: `
      <p>Η τελευταία χρέωση δεν πέρασε. Έχεις ${params.graceDaysLeft} μέρες να ενημερώσεις τα στοιχεία πληρωμής σου πριν κλειδώσει προσωρινά το πρόγραμμά σου.</p>
    `,
  });
}
