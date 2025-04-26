<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import Navbar from "../../components/Navbar.vue";
import Sidebar from "../../components/buttons/Sidebar.vue";
import { useSidebarStore } from "../../sidebar";

const sidebar = useSidebarStore();
const windowWidth = ref(window.innerWidth);

const updateWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener("resize", updateWidth);
  // Initialize based on screen size
  if (window.innerWidth >= 1024) {
    sidebar.isOpen = true; // Default open on large screens
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWidth);
});

const contentClass = computed(() => {
  // On small screens, sidebar will overlap (no margin shift)
  if (windowWidth.value < 1024) {
    return "";
  }
  return sidebar.isOpen ? "ml-64" : "ml-0";
});

const headerClass = computed(() => {
  // On small screens, header stays below navbar
  if (windowWidth.value < 1024) {
    return "top-14"; // Adjust to match your navbar height
  }
  return sidebar.isOpen ? "left-64" : "left-0";
});

const refreshPage = () => {
  window.location.reload();
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <Sidebar />

    <!-- Image Header Section -->
    <div
      class="admin-header bg-white shadow-md transition-all duration-400 ease-in-out"
      :class="headerClass"
    >
      <div class="flex items-center justify-center p-8 h-24">
        <img
          src="/VSU Logo.png"
          alt="VISAYAS STATE UNIVERSITY"
          class="h-14 cursor-pointer hover:opacity-90 transition-opacity"
          @click="refreshPage"
          title="Click to refresh"
        />
      </div>
    </div>

    <!-- Main content area -->
    <div
      class="main-content transition-all duration-400 ease-in-out"
      :class="contentClass"
    >
      <!-- Content Area -->
      <div class="p-6">
        <slot></slot>
        <h2 class="text-xl font-semibold text-gray-700 mt-4">Welcome Admin!</h2>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-content {
  padding-top: 33px;
}

.admin-header {
  position: sticky;
  top: 56px;
  z-index: 25; /* Below navbar but above content */
  border-bottom: 1px solid #e5e7eb;
  transition-property: left;
}

/* Sidebar styling for different screen sizes */
@media (max-width: 1023px) {
  .sidebar-wrapper {
    z-index: 40; /* Above header and content */
  }
}

/* Animation for click feedback */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}

img:active {
  animation: pulse 0.2s ease;
}
</style>
