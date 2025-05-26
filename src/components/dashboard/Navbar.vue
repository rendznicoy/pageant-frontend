<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useSidebarStore } from "@/stores/sidebar";
import { useDarkModeStore } from "@/stores/darkMode";
import DarkModeToggle from "./DarkModeToggle.vue";

const props = defineProps({
  eventStatus: {
    type: String,
    default: "inactive",
  },
  navigationLinks: {
    type: Array,
    default: () => [],
  },
});

const router = useRouter();
const isRefreshing = ref(false);
const showUserMenu = ref(false);
const sidebar = useSidebarStore();
const userStore = useUserStore();
const darkModeStore = useDarkModeStore();

const emit = defineEmits(["refresh-dashboard"]);

const isDarkMode = computed(() => darkModeStore.isDarkMode);
const currentUser = computed(() => userStore.user);
const isAuthenticated = computed(() => userStore.isAuthenticated);

const toggleSidebar = () => {
  sidebar.toggle();
};

const handleRefreshDashboard = () => {
  isRefreshing.value = true;
  emit("refresh-dashboard");
  setTimeout(() => (isRefreshing.value = false), 1000);
};

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const closeUserMenu = () => {
  showUserMenu.value = false;
};

// Fixed logout function with proper redirection
const handleLogout = async () => {
  try {
    const success = await userStore.logout();
    if (success) {
      closeUserMenu();
      // Clear any stored session data
      localStorage.removeItem("token");
      localStorage.removeItem("judgeSession");
      // Redirect to login page
      await router.push("/login/admin");
    }
  } catch (error) {
    console.error("Logout failed:", error);
    // Force redirect even if logout fails
    closeUserMenu();
    localStorage.clear();
    await router.push("/login/admin");
  }
};

// Close user menu when clicking outside
const handleClickOutside = (event) => {
  const userMenuElement = document.querySelector(".user-menu");
  if (userMenuElement && !userMenuElement.contains(event.target)) {
    closeUserMenu();
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

// Event status badge color
const eventStatusColor = computed(() => {
  switch (props.eventStatus) {
    case "active":
      return "bg-green-500 text-white";
    case "completed":
      return "bg-blue-500 text-white";
    case "inactive":
      return "bg-gray-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
});
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-50 border-b shadow-lg transition-all duration-300"
    :class="
      isDarkMode
        ? 'bg-gray-900 border-gray-700'
        : 'bg-green-900 border-green-800'
    "
  >
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Left Section -->
        <div class="flex items-center space-x-4">
          <!-- Burger Menu - Only show when authenticated -->
          <button
            v-if="isAuthenticated"
            @click="toggleSidebar"
            class="navbar-burger-btn"
            aria-label="Toggle Sidebar"
          >
            <div class="burger-container">
              <div class="burger-icon" :class="{ active: sidebar.isOpen }">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </button>

          <!-- Logo/Brand - Always visible -->
          <div class="flex items-center space-x-3">
            <img
              src="/logoFI.png"
              alt="PSV Logo"
              class="h-8 w-8 rounded-full"
            />
            <h1
              class="text-xl font-bold hidden sm:block"
              :class="isDarkMode ? 'text-white ' : 'text-white '"
            >
              Pageant Scoring
            </h1>
          </div>

          <!-- Event Status Badge - Only when authenticated -->
          <div
            v-if="isAuthenticated && eventStatus && eventStatus !== 'inactive'"
            class="hidden md:flex items-center space-x-2"
          >
            <span class="event-status-badge" :class="eventStatusColor">
              <i class="fas fa-circle mr-1 text-xs"></i>
              {{ eventStatus.toUpperCase() }}
            </span>
          </div>
        </div>

        <!-- Center Section - Navigation Links - Only when authenticated -->
        <div
          v-if="isAuthenticated"
          class="hidden lg:flex items-center space-x-2"
        >
          <router-link
            v-for="link in navigationLinks.slice(0, 5)"
            :key="link.path"
            :to="link.path"
            class="nav-link"
            :class="{ 'nav-link-active': $route.path === link.path }"
          >
            <i v-if="link.icon" :class="link.icon" class="text-sm mr-2"></i>
            <span>{{ link.name }}</span>
          </router-link>
        </div>

        <!-- Right Section -->
        <div class="flex items-center space-x-4">
          <!-- Refresh Button - Always visible -->
          <button
            @click="handleRefreshDashboard"
            :disabled="isRefreshing"
            class="refresh-btn"
            :class="{ 'refresh-spinning': isRefreshing }"
          >
            <i class="fas fa-sync-alt text-sm"></i>
          </button>

          <!-- Dark Mode Toggle - Always visible -->
          <DarkModeToggle />

          <!-- User Menu - Only when authenticated -->
          <div v-if="isAuthenticated" class="relative user-menu">
            <button @click="toggleUserMenu" class="user-menu-btn">
              <img
                :src="currentUser?.profile_photo || '/user24.png'"
                :alt="currentUser?.first_name || 'User'"
                class="user-avatar"
                @error="$event.target.src = '/user24.png'"
              />
              <span class="hidden md:block text-sm font-medium">
                {{ currentUser?.first_name || "User" }}
              </span>
              <i
                class="user-menu-chevron"
                :class="{ 'user-menu-chevron-open': showUserMenu }"
              ></i>
            </button>

            <!-- User Dropdown Menu -->
            <transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-150"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div v-if="showUserMenu" class="user-dropdown">
                <!-- User Info -->
                <div class="user-info">
                  <div class="flex items-center space-x-3">
                    <img
                      :src="currentUser?.profile_photo || '/user24.png'"
                      :alt="currentUser?.first_name || 'User'"
                      class="user-info-avatar"
                      @error="$event.target.src = '/user24.png'"
                    />
                    <div>
                      <p class="text-sm font-semibold text-gray-900">
                        {{ currentUser?.first_name }}
                        {{ currentUser?.last_name }}
                      </p>
                      <p class="text-xs text-gray-600">
                        {{ currentUser?.email }}
                      </p>
                      <span class="user-role-badge">
                        {{ currentUser?.role?.toUpperCase() }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Menu Items -->
                <div class="py-2">
                  <button
                    @click="handleLogout"
                    class="dropdown-item dropdown-item-danger"
                  >
                    <i class="fas fa-sign-out-alt mr-3"></i>
                    Sign Out
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Burger Menu Styles */
.navbar-burger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 0.375rem;
  color: white;
  transition: all 0.2s;
}

.navbar-burger-btn:hover {
  background-color: #16a34a;
}

.navbar-burger-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px #16a34a;
}

.burger-container {
  width: 24px;
  height: 18px;
  position: relative;
  cursor: pointer;
}

.burger-icon {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.3s ease;
}

.burger-icon span {
  display: block;
  position: absolute;
  height: 2px;
  width: 100%;
  background: white;
  border-radius: 2px;
  opacity: 1;
  left: 0;
  transform: rotate(0deg);
  transition: 0.25s ease-in-out;
}

.burger-icon span:nth-child(1) {
  top: 0px;
}

.burger-icon span:nth-child(2) {
  top: 8px;
}

.burger-icon span:nth-child(3) {
  top: 16px;
}

.burger-icon.active span:nth-child(1) {
  top: 8px;
  transform: rotate(45deg);
}

.burger-icon.active span:nth-child(2) {
  opacity: 0;
}

.burger-icon.active span:nth-child(3) {
  top: 8px;
  transform: rotate(-45deg);
}

/* Event Status Badge */
.event-status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Navigation Links */
.nav-link {
  display: flex;
  align-items: center;
  appearance: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-link:hover {
  background-color: #16a34a;
}

.nav-link-active {
  background-color: #16a34a;
}

/* Refresh Button */
.refresh-btn {
  padding: 0.5rem;
  border-radius: 0.375rem;
  color: white;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background-color: #16a34a;
}

.refresh-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px #16a34a;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* User Menu */
.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  color: white;
  transition: all 0.2s;
}

.user-menu-btn:hover {
  background-color: #16a34a;
}

.user-menu-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px #16a34a;
}

.user-avatar {
  height: 2rem;
  width: 2rem;
  border-radius: 50%;
  border: 2px solid #15803d;
  object-fit: cover;
}

.user-menu-chevron {
  font-size: 0.75rem;
  transition: transform 0.2s;
}

.user-menu-chevron-open {
  transform: rotate(180deg);
}

/* User Dropdown */
.user-dropdown {
  position: absolute;
  right: 0;
  margin-top: 0.5rem;
  width: 16rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  z-index: 50;
}

.user-info {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.user-info-avatar {
  height: 3rem;
  width: 3rem;
  border-radius: 50%;
  border: 2px solid #16a34a;
  object-fit: cover;
}

.user-role-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: #dcfce7;
  color: #166534;
  border-radius: 9999px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.15s;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
}

.dropdown-item-danger {
  color: #dc2626;
}

.dropdown-item-danger:hover {
  background-color: #fef2f2;
}

/* Mobile Navigation */
.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  color: white;
  text-decoration: none;
  transition: all 0.15s;
}

.mobile-nav-link:hover {
  background-color: #15803d;
}

.mobile-nav-link-active {
  background-color: #15803d;
}

.navbar-burger-btn {
  z-index: 60; /* Higher than sidebar */
}

@media (max-width: 1023px) {
  .navbar-burger-btn {
    position: relative;
    z-index: 60;
  }
}
</style>
