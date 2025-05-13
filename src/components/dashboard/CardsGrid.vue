<script setup>
import CardItem from "./CardItem.vue";

defineProps({
  events: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["toggle-star", "remove"]);
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <CardItem
      v-for="event in events"
      :key="event.event_id"
      :event="event"
      @toggle-star="emit('toggle-star', event.event_id)"
      @remove="emit('remove', event.event_id)"
    />
  </div>
</template>
