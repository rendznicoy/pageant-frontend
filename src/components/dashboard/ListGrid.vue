<script setup>
import ListItem from "./ListItem.vue";

defineProps({
  events: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["toggle-star", "remove"]);
</script>

<template>
  <div class="space-y-4">
    <ListItem
      v-for="event in events"
      :key="event.event_id"
      :event="event"
      @toggle-star="emit('toggle-star', event.event_id)"
      @remove="emit('remove', event.event_id)"
    />
  </div>
</template>
