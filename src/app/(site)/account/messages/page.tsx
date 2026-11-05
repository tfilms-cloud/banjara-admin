import { Suspense } from "react";
import type { Metadata } from "next";
import { WebsiteMessages } from "@/components/site/messages/website-messages";
export const metadata: Metadata = {
  title: "Messages",
  description: "Your BANJARA travel conversations and booking arrangements.",
};
export default function MessagesPage() {
  return (
    <Suspense>
      <WebsiteMessages />
    </Suspense>
  );
}
