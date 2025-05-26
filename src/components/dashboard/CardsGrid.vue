<script setup>
import CardItem from "@/components/dashboard/CardItem.vue";
import EditEventModal from "@/components/dashboard/EditEventModal.vue";
import { ref, computed } from "vue";
import { useEventStore } from "@/stores/event";
import { useDarkModeStore } from "@/stores/darkMode";

const store = useEventStore();
const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

const props = defineProps({
  events: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["remove", "eventUpdated"]);

const showEditModal = ref(false);
const selectedEvent = ref(null);

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
  emit("eventUpdated", updatedEvent);
  closeEditModal();
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <CardItem
      v-for="event in props.events"
      :key="event.event_id"
      :event="event"
      :is-dark-mode="isDarkMode"
      @remove="emit('remove', event.event_id)"
      @edit="openEditModal"
    />
  </div>

  <!-- Edit Modal with proper z-index -->
  <Teleport to="body">
    <EditEventModal
      v-if="showEditModal && selectedEvent"
      :event="selectedEvent"
      :is-dark-mode="isDarkMode"
      @close="closeEditModal"
      @updated="handleEventUpdate"
    />
  </Teleport>
</template>
