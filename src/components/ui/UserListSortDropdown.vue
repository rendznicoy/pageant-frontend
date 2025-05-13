<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "id" },
  direction: { type: String, default: "asc" },
});

const emit = defineEmits(["update:modelValue", "update:direction"]);

const options = [
  { value: "id", label: "ID" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "username", label: "Username" },
  { value: "role", label: "Role" },
];

// Emit change for the dropdown selection
const updateValue = (event) => {
  emit("update:modelValue", event.target.value);
};

// Toggle sort direction for the currently selected field
const toggleDirection = () => {
  const newDirection = props.direction === "asc" ? "desc" : "asc";
  emit("update:direction", newDirection);
};

// Icon class based on direction
const iconClass = computed(() => ({
  fas: true,
  "fa-arrow-up-wide-short": props.direction === "asc",
  "fa-arrow-down-wide-short": props.direction === "desc",
}));
</script>

<template>
  <div class="relative inline-block">
    <button
      @click="toggleDirection"
      class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 hover:rounded-full p-1"
      aria-label="Toggle sort direction"
      title="Toggle sort direction"
    >
      <i :class="iconClass"></i>
    </button>
    <select
      :value="modelValue"
      @change="updateValue"
      class="pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.relative {
  position: relative;
  display: inline-block;
}
</style>
