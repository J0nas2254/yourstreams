import { Suspense } from "react";
import TitelDetail from "./detail";

export default function TitelPage() {
  return (
    <Suspense fallback={<p className="text-slate-300">Titel wird geladen …</p>}>
      <TitelDetail />
    </Suspense>
  );
}
