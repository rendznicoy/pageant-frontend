<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const debugMessage = ref("");

onMounted(async () => {
  const eventId = route.params.id;
  debugMessage.value = `Looking for event with ID: ${eventId}`;

  try {
    // Check if events are already loaded
    if (!eventStore.initialized) {
      debugMessage.value += "\nStore not initialized, fetching events...";
      await eventStore.fetchEvents();
    }

    debugMessage.value += `\nEvents in store: ${eventStore.events.length}`;

    // Important: Make sure to handle type conversion for eventId
    // The route param will be a string, but your event_id might be stored as a number
    const event = eventStore.events.find((e) => {
      // Convert both to strings for comparison to ensure correct matching
      return String(e.event_id) === String(eventId);
    });

    if (event) {
      debugMessage.value += "\nEvent found, redirecting to details page...";

      // Redirect to the event details page
      router.replace(`/events/${eventId}/details`);
    } else {
      debugMessage.value += "\nEvent not found in store";
      console.warn(`Event with ID ${eventId} not found in store`);

      // Log all events for debugging
      console.log("Available events:", eventStore.events);

      // Redirect to dashboard with error
      router.replace("/admin/dashboard?error=event_not_found");
    }
  } catch (error) {
    debugMessage.value += `\nError: ${error.message}`;
    console.error("Error fetching event:", error);
    router.replace("/admin/dashboard?error=event_load_failed");
  }
});
</script>

<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen bg-gray-100"
  >
    <div class="text-center">
      <i class="fas fa-spinner fa-spin text-4xl text-green-600 mb-4"></i>
      <p class="text-lg text-gray-700 mb-4">Loading event...</p>
    </div>
  </div>
</template>
