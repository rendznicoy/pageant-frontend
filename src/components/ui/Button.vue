<template>
  <button
    v-bind="$attrs"
    :disabled="disabled"
    :class="[
      'bg-yellow-300 hover:bg-gray-300 text-gray-900 font-semibold px-4 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600',
      disabled ? 'opacity-50 cursor-not-allowed' : '',
    ]"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({ disabled: Boolean });
</script>
