<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import Navbar from "../../components/Navbar.vue";
import Sidebar from "../../components/buttons/Sidebar.vue";
import DropdownFilter from "../../components/buttons/FilterDropdown.vue";
import DropdownSort from "../../components/buttons//SortDropdown.vue";
import DropdownView from "../../components/buttons//ViewDropdown.vue";
import axiosClient from "../../axios";
import { useSidebarStore } from "../../sidebar";

const sidebar = useSidebarStore();
const windowWidth = ref(window.innerWidth);

// Core States
const events = ref([]);
const filteredEvents = ref([]);
const viewMode = ref("card"); // card or list
const filterBy = ref("all");
const sortBy = ref("event_name");
const showCount = ref("all"); // 'all' or 12

// Fetch events
onMounted(async () => {
  const res = await axiosClient.get("/api/v1/events");
  events.value = res.data.map((event) => ({
    ...event,
    removed: false, // We'll locally track if "removed from view"
  }));

  applyFilters();
});

// Window resize logic
window.addEventListener("resize", () => {
  windowWidth.value = window.innerWidth;
});

// Computed dynamic class for main layout
const contentClass = computed(() => {
  if (windowWidth.value < 1024) return "";
  return sidebar.isOpen ? "ml-64" : "ml-0";
});

const headerClass = computed(() => {
  if (windowWidth.value < 1024) return "top-14";
  return sidebar.isOpen ? "left-64" : "left-0";
});

// Filtering, Sorting
const applyFilters = () => {
  let temp = [...events.value].filter((event) => !event.removed);

  if (filterBy.value !== "all") {
    if (filterBy.value === "starred") {
      temp = temp.filter((e) => e.starred);
    } else if (filterBy.value === "removed") {
      temp = events.value.filter((e) => e.removed);
    } else {
      temp = temp.filter((e) => e.status === filterBy.value);
    }
  }

  // Sort
  if (sortBy.value === "event_name") {
    temp.sort((a, b) => a.event_name.localeCompare(b.event_name));
  } else if (sortBy.value === "last_accessed") {
    temp.sort((a, b) => new Date(b.last_accessed) - new Date(a.last_accessed));
  }

  // Starred always float to top on All view
  if (filterBy.value === "all") {
    temp.sort((a, b) => (b.starred === a.starred ? 0 : b.starred ? 1 : -1));
  }

  filteredEvents.value = temp;
};

// Pagination
const paginatedEvents = computed(() => {
  if (showCount.value === "all") return filteredEvents.value;
  return filteredEvents.value.slice(0, 12);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWidth);
});

const updateWidth = () => {
  windowWidth.value = window.innerWidth;
};

// Refresh Page
const refreshPage = () => {
  window.location.reload();
};

// Actions
const toggleStar = (eventId) => {
  const event = events.value.find((e) => e.event_id === eventId);
  if (event) {
    event.starred = !event.starred;
    applyFilters();
  }
};

const removeEvent = (eventId) => {
  const event = events.value.find((e) => e.event_id === eventId);
  if (event) {
    event.removed = true;
    applyFilters();
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <Sidebar />

    <!-- Header Logo -->
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

    <!-- Main Content -->
    <div
      class="main-content transition-all duration-400 ease-in-out"
      :class="contentClass"
    >
      <!-- Content Area -->
      <div class="p-6 space-y-6">
        <!-- Filters and Sorters -->
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
          <div class="flex space-x-2">
            <DropdownFilter v-model="filterBy" @change="applyFilters" />
            <DropdownSort v-model="sortBy" @change="applyFilters" />
            <DropdownView v-model="viewMode" />
          </div>
          <div>
            <button
              disabled
              title="Customize is under maintenance"
              class="bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-not-allowed"
            >
              Customize this page
            </button>
          </div>
        </div>
        <!-- Events Display -->
        <div>
          <div
            v-if="filteredEvents.length === 0"
            class="text-center text-gray-500"
          >
            No events found.
          </div>

          <div v-else>
            <div
              v-if="viewMode === 'card'"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <EventCard
                v-for="event in paginatedEvents"
                :key="event.event_id"
                :event="event"
                @toggle-star="toggleStar"
                @remove="removeEvent"
              />
            </div>

            <div v-else class="space-y-4">
              <EventListItem
                v-for="event in paginatedEvents"
                :key="event.event_id"
                :event="event"
                @toggle-star="toggleStar"
                @remove="removeEvent"
              />
            </div>
          </div>
        </div>

        <!-- Show Filters -->
        <div class="flex justify-center mt-6">
          <select
            v-model="showCount"
            @change="applyFilters"
            class="border rounded px-4 py-2 text-gray-700"
          >
            <option value="all">Show All</option>
            <option value="12">Show 12</option>
          </select>
        </div>
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
  z-index: 25;
  transition-property: left;
}

/* Sidebar styling for diffe        rent screen sizes */
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
