import Hero from "@/features/invitation/components/hero";
import { Events } from "@/features/events";
import { Location } from "@/features/location";
import { Gifts } from "@/features/gifts";
import Rsvp from "@/features/rsvp/components/rsvp";
import { Wishes } from "@/features/wishes";

// Main Invitation Content
export default function MainContent() {
  return (
    <>
      <Hero />
      <Rsvp />
      <Events />
      <Location />
      <Gifts />
      <Wishes />
    </>
  );
}
