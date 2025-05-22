<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps({
  items: {
    type: Array,
    required: true,
    validator: (items) => {
      return items.every((item) => {
        return "label" in item && ("to" in item || !("to" in item));
      });
    },
  },
  backButton: {
    type: Boolean,
    default: true,
  },
});

const navigate = (to, label) => {
  if (to) {
    if (label === "Home" && to === "/admin/dashboard") {
      window.dispatchEvent(new Event("refresh-dashboard"));
      router.push(to);
    } else {
      router.push(to);
    }
  }
};
</script>

<template>
  <div class="bg-white shadow">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center">
        <!-- Breadcrumb Items -->
        <div class="text-sm flex items-center">
          <template v-for="(item, index) in items" :key="index">
            <router-link
              v-if="item.to"
              :to="item.to"
              @click="navigate(item.to, item.label)"
              class="text-green-600 hover:text-orange-600 hover:underline transition"
            >
              {{ item.label }}
            </router-link>
            <span v-else class="text-gray-500 font-medium">
              {{ item.label }}
            </span>

            <!-- Separator -->
            <span v-if="index < items.length - 1" class="mx-2 text-gray-400">
              /
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles here if needed */
</style>
