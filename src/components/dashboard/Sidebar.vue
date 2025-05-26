<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useSidebarStore } from "@/stores/sidebar";
import { useEventStore } from "@/stores/event";
import { useUserStore } from "@/stores/user";
import { useDarkModeStore } from "@/stores/darkMode";
import axiosClient from "@/axios";

const BACKEND_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const router = useRouter();
const sidebar = useSidebarStore();
const eventStore = useEventStore();
const userStore = useUserStore();
const darkModeStore = useDarkModeStore();

const emit = defineEmits(["refresh-dashboard"]);
const imageError = ref(false);
const isEventsExpanded = ref(true);

const props = defineProps({
  role: {
    type: String,
    default: "admin",
    validator: (value) => ["admin", "tabulator", "judge"].includes(value),
  },
});

const isDarkMode = computed(() => darkModeStore.isDarkMode);

const wrapperClass = computed(() => {
  return sidebar.isOpen ? "translate-x-0" : "-translate-x-full";
});

const sortedEvents = computed(() => {
  return eventStore.events
    .filter((e) => !e.removed)
    .sort((a, b) => a.event_name.localeCompare(b.event_name));
});

const profileImageUrl = computed(() => {
  const photo = userStore.user?.profile_photo;
  if (imageError.value || !photo) return "/user24.png";

  if (photo.startsWith("http://") || photo.startsWith("https://")) {
    return photo;
  }

  return `${BACKEND_BASE_URL}/${photo}`;
});

const navigationItems = computed(() => {
  const baseItems = [];

  const dashboardPath =
    props.role === "admin"
      ? "/admin/dashboard"
      : props.role === "tabulator"
      ? "/tabulator/dashboard"
      : "/judge/dashboard";

  baseItems.push({
    name: "Dashboard",
    path: dashboardPath,
    icon: "fas fa-tachometer-alt",
    action: navigateToDashboard,
  });

  if (props.role === "admin") {
    baseItems.push({
      name: "Users",
      path: "/users",
      icon: "fas fa-users",
    });
  }

  if (props.role === "admin" || props.role === "tabulator") {
    baseItems.push({
      name: "Create Event",
      path: "/events/create",
      icon: "fas fa-plus-circle",
    });
  }

  return baseItems;
});

const handleImageError = () => {
  console.warn("Image failed to load:", profileImageUrl.value);
  imageError.value = true;
};

const navigateToDashboard = () => {
  const currentPath = router.currentRoute.value.path;
  const dashboardPath =
    props.role === "admin"
      ? "/admin/dashboard"
      : props.role === "tabulator"
      ? "/tabulator/dashboard"
      : "/judge/dashboard";

  if (currentPath === dashboardPath) {
    emit("refresh-dashboard");
  } else {
    router.push(dashboardPath);
  }
  sidebar.close();
};

const handleLogout = async (event) => {
  event.preventDefault();
  try {
    await axiosClient.get("/api/csrf-cookie");
    const response = await axiosClient.post("/api/v1/logout");
    if (response.status === 200) {
      router.push("/login/admin");
      sidebar.close();
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
};

const isActiveRoute = (path) => {
  return router.currentRoute.value.path === path;
};

const navigateToEvent = (eventId) => {
  router.push(`/events/${eventId}`);
  sidebar.close();
};

const toggleEvents = () => {
  isEventsExpanded.value = !isEventsExpanded.value;
};

const handleOutsideClick = (event) => {
  const sidebarElement = document.querySelector(".sidebar-nav");
  const burgerButton = document.querySelector(".burger-container");

  if (
    sidebar.isOpen &&
    sidebarElement &&
    !sidebarElement.contains(event.target) &&
    burgerButton &&
    !burgerButton.contains(event.target)
  ) {
    sidebar.close();
  }
};

onMounted(async () => {
  const fetched = await userStore.fetchUser();
  if (!fetched) {
    console.warn("User fetch failed or returned null");
  }
  document.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
});
</script>

<template>
  <!-- Mobile Overlay - Fixed z-index -->
  <div
    v-if="sidebar.isOpen"
    class="sidebar-overlay"
    @click="sidebar.close()"
  ></div>

  <!-- Sidebar - Fixed mobile positioning -->
  <div
    class="sidebar-container sidebar-nav"
    :class="[wrapperClass, isDarkMode ? 'sidebar-dark' : 'sidebar-light']"
  >
    <!-- Keep all existing sidebar content -->
    <div class="sidebar-content">
      <!-- User Profile Section -->
      <div
        v-if="userStore.user && userStore.user.first_name"
        class="user-profile-section"
      >
        <div class="flex items-center space-x-4">
          <div class="relative">
            <img
              class="profile-image"
              :src="profileImageUrl"
              @error="handleImageError"
              alt="Profile Picture"
            />
            <div class="profile-status-dot"></div>
          </div>
          <div class="flex-1">
            <h3 class="profile-name">
              {{ userStore.user?.first_name }} {{ userStore.user?.last_name }}
            </h3>
            <p class="profile-email">{{ userStore.user?.email }}</p>
            <span class="profile-role-badge">
              {{ userStore.user?.role?.toUpperCase() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav-menu">
        <!-- Keep existing navigation content -->
        <div class="px-4 space-y-2">
          <!-- Main Navigation Items -->
          <div v-for="item in navigationItems" :key="item.path" class="mb-2">
            <a
              v-if="item.action"
              @click.prevent="item.action"
              href="#"
              :class="[
                'menu-item group',
                isActiveRoute(item.path) ? 'menu-item-active' : '',
              ]"
            >
              <i :class="item.icon" class="menu-icon"></i>
              <span class="ml-3 font-medium">{{ item.name }}</span>
              <i
                v-if="isActiveRoute(item.path)"
                class="fas fa-circle ml-auto text-xs text-green-300"
              ></i>
            </a>
            <router-link
              v-else
              :to="item.path"
              :class="[
                'menu-item group',
                isActiveRoute(item.path) ? 'menu-item-active' : '',
              ]"
              @click="sidebar.close()"
            >
              <i :class="item.icon" class="menu-icon"></i>
              <span class="ml-3 font-medium">{{ item.name }}</span>
              <i
                v-if="isActiveRoute(item.path)"
                class="fas fa-circle ml-auto text-xs text-green-300"
              ></i>
            </router-link>
          </div>

          <!-- Events Section -->
          <div
            v-if="props.role === 'admin' || props.role === 'tabulator'"
            class="mt-8"
          >
            <button @click="toggleEvents" class="menu-header">
              <div class="flex items-center">
                <i class="fas fa-calendar-alt menu-icon"></i>
                <span class="ml-3 font-semibold">Events</span>
                <span class="events-count-badge">
                  {{ sortedEvents.length }}
                </span>
              </div>
              <i
                class="events-chevron"
                :class="{ 'events-chevron-open': isEventsExpanded }"
              ></i>
            </button>

            <!-- Events List -->
            <transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="transform opacity-0 -translate-y-2"
              enter-to-class="transform opacity-100 translate-y-0"
              leave-active-class="transition ease-in duration-150"
              leave-from-class="transform opacity-100 translate-y-0"
              leave-to-class="transform opacity-0 -translate-y-2"
            >
              <div v-if="isEventsExpanded" class="mt-3 space-y-1">
                <div v-if="sortedEvents.length === 0" class="empty-events">
                  No events found
                </div>
                <button
                  v-for="event in sortedEvents"
                  :key="event.event_id"
                  @click="navigateToEvent(event.event_id)"
                  :class="[
                    'event-item group w-full',
                    router.currentRoute.value.path ===
                    `/events/${event.event_id}`
                      ? 'event-item-active'
                      : '',
                    {
                      'event-item-active-status': event.status === 'active',
                      'event-item-inactive-status': event.status === 'inactive',
                      'event-item-completed-status':
                        event.status === 'completed',
                    },
                  ]"
                >
                  <div class="event-content">
                    <div class="event-status-icon">
                      <i
                        class="fas text-sm"
                        :class="{
                          'fa-play text-green-400': event.status === 'active',
                          'fa-pause text-gray-400': event.status === 'inactive',
                          'fa-check-circle text-blue-400':
                            event.status === 'completed',
                        }"
                      ></i>
                    </div>
                    <div class="flex-1 text-left">
                      <div class="event-name">
                        {{ event.event_name }}
                      </div>
                      <div class="event-status-text">
                        {{ event.status.toUpperCase() }}
                      </div>
                    </div>
                    <i class="event-arrow"></i>
                  </div>
                </button>
              </div>
            </transition>
          </div>
        </div>
      </nav>

      <!-- Footer Section -->
      <div class="sidebar-footer">
        <!-- Keep existing footer content -->
        <div class="sidebar-footer-content">
          <div class="app-branding">
            <img src="/logoFI.png" alt="App Logo" class="app-logo" />
            <div class="app-info">
              <p class="app-title">Pageant Scoring</p>
              <p class="app-subtitle">Visayas State University</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mobile Overlay - Fixed z-index to be below navbar */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 45; /* Below navbar (50) but above content */
}

/* Sidebar Container - Fixed mobile positioning */
.sidebar-container {
  position: fixed;
  top: 64px; /* Below navbar on desktop */
  left: 0;
  bottom: 0;
  width: 20rem;
  z-index: 45; /* Below navbar burger button */
  transition: transform 0.3s ease-in-out;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.sidebar-light {
  background: linear-gradient(to bottom, #14532d, #166534);
  color: white;
}

.sidebar-dark {
  background: linear-gradient(to bottom, #111827, #1f2937);
  color: #e5e7eb;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Mobile specific adjustments */
@media (max-width: 1023px) {
  .sidebar-container {
    top: 0; /* Full height on mobile, overlaps with navbar */
    z-index: 45; /* Below navbar burger button */
    padding-top: 64px; /* Add padding to account for navbar */
  }

  .sidebar-content {
    height: calc(100vh - 64px); /* Adjust for navbar padding */
  }

  /* Ensure burger button stays accessible */
  .navbar-burger-btn {
    z-index: 60 !important;
    position: relative;
  }
}

/* User Profile Section */
.user-profile-section {
  flex-shrink: 0;
  padding: 1.5rem;
  border-bottom: 1px solid #15803d;
  background-color: rgba(22, 101, 52, 0.5);
}

.sidebar-dark .user-profile-section {
  border-bottom-color: #374151;
  background-color: rgba(55, 65, 81, 0.5);
}

.profile-image {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #4ade80;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.profile-status-dot {
  position: absolute;
  bottom: -0.25rem;
  right: -0.25rem;
  width: 1rem;
  height: 1rem;
  background-color: #4ade80;
  border-radius: 50%;
  border: 2px solid #166534;
}

.profile-name {
  font-weight: 600;
  color: white;
  font-size: 1.125rem;
}

.profile-email {
  color: #bbf7d0;
  font-size: 0.875rem;
}

.sidebar-dark .profile-email {
  color: #9ca3af;
}

.profile-role-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: #16a34a;
  color: white;
  border-radius: 9999px;
}

/* Navigation Menu - Fixed scrolling */
.sidebar-nav-menu {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 0;
  min-height: 0; /* Important for flex child to scroll */
}

/* Menu Items */
.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
  color: white;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
}

.sidebar-dark .menu-item {
  color: #e5e7eb;
}

.menu-item:hover {
  background-color: rgba(21, 128, 61, 0.5);
  color: #bbf7d0;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.sidebar-dark .menu-item:hover {
  background-color: rgba(55, 65, 81, 0.5);
  color: #d1d5db;
}

.menu-item-active {
  background-color: #16a34a;
  color: white;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  transform: translateX(4px);
}

.sidebar-dark .menu-item-active {
  background-color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
}

.menu-icon {
  width: 1.25rem;
  text-align: center;
  transition: transform 0.2s;
}

.group:hover .menu-icon {
  transform: scale(1.1);
}

/* Menu Header */
.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: #bbf7d0;
  border-radius: 0.5rem;
  transition: all 0.2s;
  background: none;
  border: none;
  cursor: pointer;
}

.sidebar-dark .menu-header {
  color: #9ca3af;
}

.menu-header:hover {
  color: white;
  background-color: rgba(21, 128, 61, 0.3);
}

.sidebar-dark .menu-header:hover {
  background-color: rgba(55, 65, 81, 0.3);
}

.events-count-badge {
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background-color: #16a34a;
  border-radius: 9999px;
}

.sidebar-dark .events-count-badge {
  background-color: #3b82f6;
}

.events-chevron {
  font-size: 0.75rem;
  transition: transform 0.2s;
}

.events-chevron-open {
  transform: rotate(180deg);
}

/* Events */
.empty-events {
  padding: 0.75rem 0.5rem;
  font-size: 0.875rem;
  color: #bbf7d0;
  font-style: italic;
}

.sidebar-dark .empty-events {
  color: #9ca3af;
}

.event-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
  color: white;
  border-left: 4px solid transparent;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
}

.sidebar-dark .event-item {
  color: #e5e7eb;
}

.event-item:hover {
  background-color: rgba(21, 128, 61, 0.5);
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sidebar-dark .event-item:hover {
  background-color: rgba(55, 65, 81, 0.5);
}

.event-item-active {
  background-color: #16a34a;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateX(2px);
}

.sidebar-dark .event-item-active {
  background-color: #3b82f6;
}

.event-item-active-status {
  border-left-color: #4ade80;
}

.event-item-inactive-status {
  border-left-color: #9ca3af;
}

.event-item-completed-status {
  border-left-color: #60a5fa;
}

.event-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.event-status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid currentColor;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.group:hover .event-status-icon {
  opacity: 1;
}

.event-name {
  font-weight: 500;
  color: white;
  transition: color 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 12rem;
}

.sidebar-dark .event-name {
  color: #e5e7eb;
}

.group:hover .event-name {
  color: #bbf7d0;
}

.sidebar-dark .group:hover .event-name {
  color: #d1d5db;
}

.event-status-text {
  font-size: 0.75rem;
  color: #bbf7d0;
  margin-top: 0.25rem;
}

.sidebar-dark .event-status-text {
  color: #9ca3af;
}

.event-arrow {
  font-size: 0.75rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.group:hover .event-arrow {
  opacity: 1;
}

/* Footer - Fixed positioning and overflow */
.sidebar-footer {
  flex-shrink: 0;
  border-top: 1px solid #15803d;
  background-color: rgba(22, 101, 52, 0.5);
}

.sidebar-dark .sidebar-footer {
  border-top-color: #374151;
  background-color: rgba(55, 65, 81, 0.5);
}

.sidebar-footer-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.logout-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: #fca5a5;
  border: 1px solid rgba(220, 38, 38, 0.3);
  background: none;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  color: #fecaca;
  background-color: rgba(153, 27, 27, 0.3);
}

.app-branding {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  backdrop-filter: blur(4px);
}

.sidebar-dark .app-branding {
  background-color: rgba(55, 65, 81, 0.3);
}

.app-logo {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.app-info {
  min-width: 0; /* Allows text to truncate */
}

.app-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  margin: 0;
}

.sidebar-dark .app-title {
  color: #e5e7eb;
}

.app-subtitle {
  font-size: 0.75rem;
  color: #bbf7d0;
  margin: 0;
}

.sidebar-dark .app-subtitle {
  color: #9ca3af;
}

/* Custom Scrollbar */
.sidebar-nav-menu::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav-menu::-webkit-scrollbar-track {
  background: rgba(34, 197, 94, 0.1);
}

.sidebar-nav-menu::-webkit-scrollbar-thumb {
  background: rgba(34, 197, 94, 0.3);
  border-radius: 2px;
}

.sidebar-nav-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(34, 197, 94, 0.5);
}

/* Responsive */
@media (max-width: 1023px) {
  .sidebar-container {
    top: 0;
    bottom: 0;
  }
}
</style>
