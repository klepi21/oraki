import type { Metadata } from "next";
import { PreviewApp } from "@/app/preview/PreviewApp";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PreviewPage() {
  return <PreviewApp />;
}
