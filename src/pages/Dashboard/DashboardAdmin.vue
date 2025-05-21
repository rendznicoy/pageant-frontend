<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useEventStore } from "@/stores/event";
import { useSidebarStore } from "@/sidebar";
import { useRouter } from "vue-router";
import Navbar from "@/components/layout/Navbar.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import EventFilters from "@/components/dashboard/EventFilters.vue";
import CardsGrid from "@/components/dashboard/CardsGrid.vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";

const eventStore = useEventStore();
const sidebar = useSidebarStore();
const router = useRouter();

const filter = ref("all");
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 3;
const isLoading = ref(true);
const isRefreshing = ref(false);
const refreshKey = ref(0);

const windowWidth = ref(window.innerWidth);
const layoutShift = computed(() =>
  sidebar.isOpen && windowWidth.value >= 1024 ? "ml-64" : "ml-0"
);

const createEvent = () => {
  console.log("Navigating to create event page");
  router.push("/events/create");
};

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(async () => {
  isLoading.value = true;
  await eventStore.fetchEvents(true); // force fetch
  isLoading.value = false;
  window.addEventListener("resize", updateWindowWidth);
  window.addEventListener("refresh-dashboard", refreshDashboard);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWindowWidth);
  window.removeEventListener("refresh-dashboard", refreshDashboard);
});

const filtered = computed(() => {
  let result = [...eventStore.events];
  result = result.filter((e) => !e.removed);
  if (filter.value !== "all") {
    result = result.filter((e) => e.status === filter.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((e) => e.event_name.toLowerCase().includes(query));
  }
  console.log("Filtered events:", result); // Debug log
  return result;
});

const totalItems = computed(() => filtered.value.length);

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginated = filtered.value.slice(start, end);
  console.log("Paginated events:", paginated); // Debug log
  return paginated;
});

const totalPages = computed(() =>
  Math.ceil(filtered.value.length / itemsPerPage)
);

const refreshDashboard = async () => {
  isRefreshing.value = true;
  try {
    await eventStore.fetchEvents(true);
    console.log("Refreshed events:", eventStore.events); // Debug log
    await new Promise((resolve) => setTimeout(resolve, 500)); // Ensure animation is visible
    refreshKey.value++;
    await nextTick(); // Force re-render
  } catch (error) {
    console.error("Failed to refresh dashboard:", error);
  } finally {
    isRefreshing.value = false;
  }
};

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar @refresh-dashboard="refreshDashboard" />
    <Sidebar @refresh-dashboard="refreshDashboard" role="admin" />

    <div class="transition-all duration-300" :class="layoutShift">
      <h2 class="text-2xl font-semibold text-green-800 p-6">Events</h2>
      <Breadcrumbs
        :items="[
          { label: 'Home', to: '/admin/dashboard' },
          { label: 'Dashboard' },
        ]"
      />

      <div class="p-6 pt-4">
        <div
          class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 mt-8"
        >
          <div class="relative w-full max-w-md">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search intramural..."
              class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
            />
            <i
              class="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            ></i>
          </div>
          <button
            @click="createEvent"
            class="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none transition-colors w-full md:w-auto max-w-md"
          >
            <i class="fas fa-plus mr-2"></i>
            Add Intramural
          </button>
        </div>
        <EventFilters v-model:filter="filter" />

        <div v-if="isLoading || eventStore.loading" class="text-center py-8">
          <i class="fas fa-spinner fa-spin text-2xl text-green-600"></i>
          <p class="text-gray-500 mt-2">Loading events...</p>
        </div>

        <div v-else class="content-area" :class="{ 'fade-out': isRefreshing }">
          <div v-if="filtered.length === 0" class="text-center py-8">
            <p class="text-gray-500">No events found.</p>
          </div>

          <div v-else>
            <CardsGrid
              :key="refreshKey"
              :events="paginatedEvents"
              @remove="eventStore.deleteEvent"
            />
          </div>

          <div class="flex justify-between items-center mt-4">
            <span
              >Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
              {{ (currentPage - 1) * itemsPerPage + paginatedEvents.length }} of
              {{ totalItems }} results</span
            >
            <div class="flex space-x-2">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span class="px-2 py-1">{{ currentPage }}</span>
              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-area {
  transition: opacity 0.3s ease;
}
.content-area.fade-out {
  opacity: 0;
}
</style>
