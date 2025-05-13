<template>
  <input
    v-bind="$attrs"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
    :class="[
      'border px-3 py-2 text-sm rounded-sm w-full focus:outline-none focus:ring-2',
      error
        ? 'border-red-500 ring-red-300'
        : 'border-gray-400 focus:ring-green-400',
    ]"
  />
</template>

<script setup>
defineProps({
  modelValue: String,
  error: Boolean,
});

defineEmits(["update:modelValue"]);
</script>
