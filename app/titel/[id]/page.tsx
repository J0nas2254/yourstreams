import { DetailClient } from "./detail-client";

export async function generateStaticParams() {
  return [];
}

export default function DetailPage({ params }: { params: { id: string } }) {
  return <DetailClient id={params.id} />;
}
