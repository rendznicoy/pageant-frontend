<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useDarkModeStore } from "@/stores/darkMode";
import { useUserStore } from "@/stores/user";
import { useSidebarStore } from "@/stores/sidebar";
import { setToastInstance } from "@/utils/toast";
import Navbar from "@/components/dashboard/Navbar.vue";
import Sidebar from "@/components/dashboard/Sidebar.vue";

const route = useRoute();
const toast = useToast();
const darkModeStore = useDarkModeStore();
const userStore = useUserStore();
const sidebar = useSidebarStore();

const isDarkMode = computed(() => darkModeStore.isDarkMode);
const isAuthenticated = computed(() => userStore.isAuthenticated);
const currentEventStatus = ref("inactive");
const userRole = computed(() => userStore.user?.role || "admin");

// Check if current route is judge dashboard
const isJudgeDashboard = computed(() => {
  return (
    route.path === "/judge/dashboard" ||
    route.name === "JudgeDashboard" ||
    route.path.startsWith("/judge")
  );
});

// Check if user is a judge - this is the key addition
const isJudgeUser = computed(() => {
  return userStore.user?.role === "judge";
});

// Navigation links based on user role and current context
const navigationLinks = computed(() => {
  const user = userStore.user;
  if (!user || isJudgeDashboard.value || isJudgeUser.value) return [];

  const links = [];

  // Dashboard
  const dashboardPath = `/admin/dashboard`;
  links.push({
    name: "Dashboard",
    path: dashboardPath,
    icon: "fas fa-tachometer-alt",
  });

  if (user.role === "admin") {
    links.push({
      name: "Users",
      path: "/users",
      icon: "fas fa-users",
    });
  }

  // Role-based links
  if (user.role === "admin" || user.role === "tabulator") {
    links.push({
      name: "Create Event",
      path: "/events/create",
      icon: "fas fa-plus-circle",
    });
  }

  return links;
});

const handleRefreshDashboard = () => {
  console.log("Dashboard refresh requested");
};

// Watch route changes to close sidebar on judge routes
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith("/judge") || isJudgeUser.value) {
      sidebar.close();
    }
  },
  { immediate: true }
);

onMounted(() => {
  // Initialize toast system
  setToastInstance(toast);

  // Initialize dark mode first
  darkModeStore.initializeDarkMode();

  // Fetch user data
  userStore.fetchUser();

  // Handle responsive sidebar behavior
  const handleResize = () => {
    if (window.innerWidth < 1024) {
      sidebar.close();
    }
  };

  window.addEventListener("resize", handleResize);

  // Cleanup
  return () => {
    window.removeEventListener("resize", handleResize);
  };
});
</script>

<template>
  <div
    class="app-container"
    :class="isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'"
  >
    <!-- Navbar - Hidden for judge dashboard AND judge users -->
    <Navbar
      v-if="!isJudgeDashboard && !isJudgeUser"
      :event-status="currentEventStatus"
      :navigation-links="navigationLinks"
      @refresh-dashboard="handleRefreshDashboard"
    />

    <!-- Sidebar - Hidden for judge dashboard AND judge users -->
    <Sidebar
      v-if="!isJudgeDashboard && !isJudgeUser && isAuthenticated"
      :role="userRole"
      @refresh-dashboard="handleRefreshDashboard"
    />

    <!-- Main content with conditional spacing -->
    <main
      class="main-content"
      :class="[
        !isJudgeDashboard && !isJudgeUser && sidebar.isOpen ? 'lg:ml-80' : '',
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900',
        isJudgeDashboard || isJudgeUser ? 'pt-0' : 'pt-16',
      ]"
    >
      <div class="content-wrapper" :class="isDarkMode ? 'dark' : ''">
        <router-view @refresh-dashboard="handleRefreshDashboard" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  transition: all 0.3s ease-in-out;
}

.main-content {
  transition: all 0.3s ease;
  min-height: 100vh;
}

.content-wrapper {
  transition: all 0.3s ease;
}

/* Global dark mode styles */
:global(.dark) {
  color-scheme: dark;
}

:global(.dark *) {
  border-color: #374151;
}

:global(.dark input) {
  background-color: #374151;
  color: #e5e7eb;
}

:global(.dark textarea) {
  background-color: #374151;
  color: #e5e7eb;
}

:global(.dark select) {
  background-color: #374151;
  color: #e5e7eb;
}
</style>
