<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps({
  items: {
    type: Array,
    required: true,
    validator: (items) =>
      items.every(
        (item) => "label" in item && ("to" in item || !("to" in item))
      ),
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
    }
    router.push(to);
  }
};
</script>

<template>
  <div
    class="bg-white shadow rounded mx-4 mt-4 overflow-x-auto overflow-y-auto"
  >
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center">
        <!-- Breadcrumb Items -->
        <div class="text-sm flex items-center space-x-2">
          <template v-for="(item, index) in items" :key="index">
            <router-link
              v-if="item.to"
              :to="item.to"
              @click="navigate(item.to, item.label)"
              class="text-gray-600 hover:text-green-600 transition flex items-center"
            >
              <i v-if="item.label === 'Home'" class="fas fa-home mr-1 mb-1"></i>
              {{ item.label }}
            </router-link>
            <span v-else class="text-green-500 font-medium">
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
