<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useDarkModeStore } from "@/stores/darkMode";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const darkModeStore = useDarkModeStore();
const userStore = useUserStore();

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

// Compute the correct dashboard route based on user role
const getDashboardRoute = () => {
  const userRole = userStore.user?.role;
  switch (userRole) {
    case "admin":
      return "/admin/dashboard";
    case "tabulator":
      return "/admin/dashboard";
    case "judge":
      return "/judge/dashboard";
    default:
      // Fallback: try to determine from current route
      const currentRoute = router.currentRoute.value.path;
      if (currentRoute.includes("/admin/")) return "/admin/dashboard";
      if (currentRoute.includes("/tabulator/")) return "/admin/dashboard";
      if (currentRoute.includes("/judge/")) return "/judge/dashboard";
      return "/admin/dashboard";
  }
};

// Process breadcrumb items to handle automatic routing
const processedItems = computed(() => {
  return props.items.map((item) => {
    // Auto-route "Home" to correct dashboard
    if (item.label === "Home" && (item.to === "auto" || !item.to)) {
      return { ...item, to: getDashboardRoute() };
    }
    // Auto-route "Dashboard" to correct dashboard
    if (
      item.label === "Dashboard" &&
      (item.to === "auto" || item.to === "/dashboard")
    ) {
      return { ...item, to: getDashboardRoute() };
    }
    return item;
  });
});

const navigate = (to, label) => {
  if (to) {
    // Check if clicking "Home" or "Dashboard" on any dashboard route
    const isDashboardRoute =
      to === "/admin/dashboard" ||
      to === "/admin/dashboard" ||
      to === "/judge/dashboard";

    if ((label === "Home" || label === "Dashboard") && isDashboardRoute) {
      window.dispatchEvent(new Event("refresh-dashboard"));
    }
    router.push(to);
  }
};

const isDarkMode = computed(() => darkModeStore.isDarkMode);
</script>

<template>
  <div
    class="shadow rounded mx-4 mt-4 overflow-x-auto overflow-y-auto transition-colors duration-200"
    :class="isDarkMode ? 'bg-gray-800' : 'bg-white'"
  >
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center">
        <!-- Breadcrumb Items -->
        <div class="text-sm flex items-center space-x-2">
          <template v-for="(item, index) in processedItems" :key="index">
            <router-link
              v-if="item.to"
              :to="item.to"
              @click="navigate(item.to, item.label)"
              class="transition flex items-center duration-200 hover:underline"
              :class="
                isDarkMode
                  ? 'text-gray-400 hover:text-green-400'
                  : 'text-gray-600 hover:text-green-600'
              "
            >
              <i v-if="item.label === 'Home'" class="fas fa-home mr-1 mb-1"></i>
              <i
                v-if="item.label === 'Dashboard'"
                class="fas fa-tachometer-alt mr-1 mb-1"
              ></i>
              {{ item.label }}
            </router-link>
            <span
              v-else
              class="font-medium transition-colors duration-200"
              :class="isDarkMode ? 'text-green-400' : 'text-green-500'"
            >
              {{ item.label }}
            </span>

            <!-- Separator -->
            <span
              v-if="index < processedItems.length - 1"
              class="mx-2 transition-colors duration-200"
              :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'"
            >
              /
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
