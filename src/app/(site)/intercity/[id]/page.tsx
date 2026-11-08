import type { Metadata } from "next";
import { IntercityRequestStatus } from "@/components/site/intercity/intercity-request-status";

export const metadata: Metadata = { title: "Your City to City ride" };

type Props = { params: Promise<{ id: string }> };

export default async function IntercityRequestPage({ params }: Props) {
  const { id } = await params;
  return <IntercityRequestStatus id={id} />;
}
