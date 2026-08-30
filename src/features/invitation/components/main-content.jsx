import Hero from "@/features/invitation/components/hero";
import { Location } from "@/features/location";
import { Gifts } from "@/features/gifts";
import Rsvp from "@/features/rsvp/components/rsvp";
import { Wishes } from "@/features/wishes";
import ErrorBoundary from "@/components/error-boundary";

// Main Invitation Content
export default function MainContent() {
  return (
    <>
      <ErrorBoundary name="hero" section>
        <Hero />
      </ErrorBoundary>
      <ErrorBoundary name="rsvp" section>
        <Rsvp />
      </ErrorBoundary>
      <ErrorBoundary name="location" section>
        <Location />
      </ErrorBoundary>
      <ErrorBoundary name="gifts" section>
        <Gifts />
      </ErrorBoundary>
      <ErrorBoundary name="wishes" section>
        <Wishes />
      </ErrorBoundary>
    </>
  );
}
