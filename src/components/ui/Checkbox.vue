<script setup>
defineProps({
  modelValue: Boolean,
  id: String,
  name: String,
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <input
    type="checkbox"
    :id="id"
    :name="name"
    class="h-4 w-4 text-green-600 border-gray-400 rounded focus:ring-green-500"
    :checked="modelValue"
    @change="$emit('update:modelValue', $event.target.checked)"
  />
</template>
