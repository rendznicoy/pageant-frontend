<script setup>
import CardItem from "@/components/dashboard/CardItem.vue";
import EditEventModal from "@/components/dashboard/EditEventModal.vue";
import { ref, computed, watch, onMounted } from "vue";
import { useEventStore } from "@/stores/event";

// Import the event store
const store = useEventStore();

const props = defineProps({
  events: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["remove", "eventUpdated"]);

const showEditModal = ref(false);
const selectedEvent = ref(null);

const localEvents = computed(() => store.events); // 🔥 cleaner

function openEditModal(event) {
  selectedEvent.value = { ...event };
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  selectedEvent.value = null;
}

async function handleEventUpdate(updatedEvent) {
  await store.fetchEvents(true);
  emit("eventUpdated", updatedEvent); // Or just `store.events` if you prefer
  closeEditModal();
}
</script>

<template>
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto overflow-y-auto"
  >
    <CardItem
      v-for="event in localEvents"
      :key="event.event_id"
      :event="event"
      @remove="emit('remove', event.event_id)"
      @edit="openEditModal"
    />
  </div>

  <!-- Edit Modal - Only render when needed -->
  <Teleport to="body">
    <EditEventModal
      v-if="showEditModal && selectedEvent"
      :event="selectedEvent"
      @close="closeEditModal"
      @updated="handleEventUpdate"
    />
  </Teleport>
</template>
