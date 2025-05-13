<script setup>
import { ref, watch } from "vue";
import { debounce } from "lodash";

const props = defineProps({
  placeholder: { type: String, default: "Search..." },
  value: { type: String, default: "" },
  debounce: { type: Number, default: 300 },
});

const emit = defineEmits(["update:value"]);

const searchInput = ref(props.value);
const inputRef = ref(null);

// Debounced emit for typing
const debouncedEmit = debounce(
  (val) => emit("update:value", val),
  props.debounce
);

watch(searchInput, (newVal) => debouncedEmit(newVal));

// Keep local input in sync with parent
watch(
  () => props.value,
  (val) => {
    if (val !== searchInput.value) searchInput.value = val;
  }
);

const focusInput = () => inputRef.value?.focus();

const handleEnter = (e) => {
  e.preventDefault();
  debouncedEmit(searchInput.value);
  debouncedEmit.flush();
};

const clearSearch = () => {
  searchInput.value = "";
  emit("update:value", "");
};
</script>

<template>
  <div class="relative">
    <button
      @click="focusInput"
      class="absolute left-3 top-3 text-gray-500 hover:text-gray-700"
    >
      <i class="fas fa-search"></i>
    </button>
    <input
      ref="inputRef"
      v-model="searchInput"
      type="text"
      :placeholder="placeholder"
      @keyup.enter="handleEnter"
      class="block w-full pl-10 pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
    />
    <button
      v-if="searchInput"
      @click="clearSearch"
      class="absolute right-3 top-1/4 text-gray-500 hover:text-gray-700"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>
