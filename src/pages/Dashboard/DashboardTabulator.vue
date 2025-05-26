<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useEventStore } from "@/stores/event";
import { useDarkModeStore } from "@/stores/darkMode";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import EventFilters from "@/components/dashboard/EventFilters.vue";
import CardsGrid from "@/components/dashboard/CardsGrid.vue";
import ListGrid from "@/components/dashboard/ListGrid.vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";

const eventStore = useEventStore();
const darkModeStore = useDarkModeStore();
const toast = useToast();
const router = useRouter();

// Reactive dark mode
const isDarkMode = computed(() => darkModeStore.isDarkMode);

const filter = ref("all");
const sort = ref("event_name");
const view = ref("card");
const showCount = ref("all");
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 6;
const isLoading = ref(true);
const isRefreshing = ref(false);
const refreshKey = ref(0);
const windowWidth = ref(window.innerWidth);

// Watch for filter changes and reset pagination
watch([filter, searchQuery], () => {
  currentPage.value = 1;
});

const createEvent = () => {
  router.push("/events/create");
};

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(async () => {
  isLoading.value = true;

  try {
    await eventStore.fetchEvents(true);

    if (eventStore.events.length === 0) {
      toast.info("No events found. Create your first event!", {
        timeout: 4000,
        position: "top-right",
        icon: "fas fa-calendar-plus",
      });
    } else {
      toast.success(`Loaded ${eventStore.events.length} events successfully`, {
        timeout: 3000,
        position: "top-right",
      });
    }
  } catch (error) {
    console.error("Failed to load events:", error);
    toast.error("Failed to load events. Please refresh the page.", {
      timeout: 5000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
  } finally {
    isLoading.value = false;
  }

  window.addEventListener("resize", updateWindowWidth);
  window.addEventListener("refresh-dashboard", refreshDashboard);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWindowWidth);
  window.removeEventListener("refresh-dashboard", refreshDashboard);
});

// Enhanced filtering logic for tabulator (preserving original constraints)
const filteredEvents = computed(() => {
  let result = [...eventStore.events];

  if (filter.value === "removed") {
    result = result.filter((e) => e.removed);
  } else {
    result = result.filter((e) => !e.removed);
    if (filter.value === "starred") {
      result = result.filter((e) => e.starred);
    } else if (filter.value !== "all") {
      result = result.filter((e) => e.status === filter.value);
    }
  }

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter(
      (e) =>
        e.event_name.toLowerCase().includes(query) ||
        e.venue?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
    );
  }

  // Apply sorting
  if (sort.value === "event_name") {
    result.sort((a, b) => a.event_name.localeCompare(b.event_name));
  } else if (sort.value === "last_accessed") {
    result.sort(
      (a, b) => new Date(b.last_accessed) - new Date(a.last_accessed)
    );
  }

  // Starred items first for "all" filter
  if (filter.value === "all") {
    result.sort((a, b) => (a.starred === b.starred ? 0 : a.starred ? -1 : 1));
  }

  return result;
});

const totalItems = computed(() => filteredEvents.value.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage));

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return showCount.value === "all"
    ? filteredEvents.value.slice(start, end)
    : filteredEvents.value.slice(0, Math.min(12, end));
});

const refreshDashboard = async () => {
  if (isRefreshing.value) return;

  isRefreshing.value = true;

  const loadingToastId = toast.info("Refreshing events...", {
    timeout: false,
    closeOnClick: false,
    pauseOnFocusLoss: false,
    pauseOnHover: false,
    draggable: false,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: false,
    icon: "fas fa-sync-alt fa-spin",
    position: "top-right",
  });

  try {
    await eventStore.fetchEvents(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    refreshKey.value++;
    await nextTick();

    toast.dismiss(loadingToastId);
    toast.success("Events refreshed successfully!", {
      timeout: 3000,
      position: "top-right",
      icon: "fas fa-check-circle",
    });
  } catch (error) {
    console.error("Failed to refresh dashboard:", error);
    toast.dismiss(loadingToastId);
    toast.error("Failed to refresh events. Please try again.", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
  } finally {
    isRefreshing.value = false;
  }
};

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

const clearFilters = () => {
  searchQuery.value = "";
  filter.value = "all";
  currentPage.value = 1;

  toast.success("Filters cleared", {
    timeout: 2000,
    position: "top-right",
    icon: "fas fa-filter",
  });
};

const handleEventRemoval = async (eventId) => {
  try {
    await eventStore.toggleRemoved(eventId);
  } catch (error) {
    console.error("Failed to remove event:", error);
    toast.error("Failed to remove event. Please try again.", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
  }
};

const handleEventUpdate = (updatedEvent) => {
  toast.success(`"${updatedEvent.event_name}" updated successfully!`, {
    timeout: 3000,
    position: "top-right",
    icon: "fas fa-check-circle",
  });
};

const pageNumbers = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(total);
    }
  }

  return pages;
});
</script>

<template>
  <div
    class="min-h-screen transition-colors duration-200"
    :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-100'"
  >
    <div class="transition-all duration-300">
      <div class="mt-4 mx-4 rounded-lg">
        <Breadcrumbs
          :items="[
            { label: 'Home', to: '/tabulator/dashboard' },
            { label: 'Dashboard' },
          ]"
        />
      </div>

      <!-- Main Card Container -->
      <div
        class="rounded-lg shadow-md p-6 mt-4 mx-4 transition-colors duration-200"
        :class="isDarkMode ? 'bg-gray-800' : 'bg-white'"
      >
        <!-- Section Heading -->
        <div class="flex items-center justify-between p-6 pt-2 pb-0 mx-4 mb-4">
          <div class="flex items-center space-x-2">
            <i
              class="fas fa-calendar-alt text-2xl mb-1 transition-colors duration-200"
              :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
            ></i>
            <h2
              class="text-2xl font-semibold transition-colors duration-200"
              :class="isDarkMode ? 'text-green-200' : 'text-green-800'"
            >
              Events Dashboard
            </h2>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="refreshDashboard"
              :disabled="isRefreshing"
              class="flex items-center px-3 py-2 text-white rounded-md transition-colors duration-200 disabled:opacity-50"
              :class="
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-600 hover:bg-gray-700'
              "
              title="Refresh events"
            >
              <i
                class="fas fa-sync-alt mr-2"
                :class="{ 'fa-spin': isRefreshing }"
              ></i>
              Refresh
            </button>
            <button
              @click="createEvent"
              class="flex items-center px-4 py-2 text-white rounded-md transition-colors duration-200"
              :class="
                isDarkMode
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-green-600 hover:bg-green-700'
              "
            >
              <i class="fas fa-plus mr-2"></i>
              Add Event
            </button>
          </div>
        </div>

        <div
          class="border rounded-lg p-4 mb-6 transition-colors duration-200"
          :class="
            isDarkMode
              ? 'bg-gray-700 border-gray-600'
              : 'bg-white border-gray-200'
          "
        >
          <div
            class="flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <div class="flex items-center space-x-2 w-full md:w-40">
              <EventFilters
                v-model:filter="filter"
                v-model:sort="sort"
                v-model:view="view"
                v-model:show-count="showCount"
              />
            </div>

            <div class="relative w-full md:w-80">
              <i
                class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200"
                :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
              ></i>
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Search events..."
                class="pl-10 pr-12 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 text-sm transition-colors duration-200"
                :class="
                  isDarkMode
                    ? 'border-gray-600 bg-gray-800 text-gray-100 focus:ring-green-400'
                    : 'border-gray-300 bg-white text-gray-900 focus:ring-green-600'
                "
              />
              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="transform scale-95 opacity-0"
                enter-to-class="transform scale-100 opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="transform scale-100 opacity-100"
                leave-to-class="transform scale-95 opacity-0"
              >
                <button
                  v-if="searchQuery"
                  @click="searchQuery = ''"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200"
                  :class="
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'
                  "
                  title="Clear search"
                >
                  <i class="fas fa-times"></i>
                </button>
              </Transition>
            </div>
          </div>

          <!-- Results Summary -->
          <div class="mt-3 flex items-center justify-between">
            <div
              class="text-sm transition-colors duration-200"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
            >
              <span v-if="searchQuery || filter !== 'all'">
                Showing {{ totalItems }} of
                {{ eventStore.events.length }} events
                <span v-if="searchQuery">
                  matching "<strong>{{ searchQuery }}</strong
                  >"
                </span>
                <span v-if="filter !== 'all'">
                  with filter "<strong>{{ filter }}</strong
                  >"
                </span>
              </span>
              <span v-else> Showing all {{ totalItems }} events </span>
            </div>

            <button
              v-if="searchQuery || filter !== 'all'"
              @click="clearFilters"
              class="text-sm transition-colors duration-200"
              :class="
                isDarkMode
                  ? 'text-green-400 hover:text-green-300'
                  : 'text-green-600 hover:text-green-700'
              "
            >
              <i class="fas fa-filter mr-1"></i>
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Content Loader or Events -->
        <div v-if="isLoading || eventStore.loading" class="text-center py-12">
          <div
            class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors duration-200"
            :class="isDarkMode ? 'bg-green-900' : 'bg-green-100'"
          >
            <i
              class="fas fa-spinner fa-spin text-2xl transition-colors duration-200"
              :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
            ></i>
          </div>
          <p
            class="text-lg transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
          >
            Loading events...
          </p>
          <p
            class="text-sm mt-1 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
          >
            Please wait while we fetch your events
          </p>
        </div>

        <div v-else class="content-area" :class="{ 'fade-out': isRefreshing }">
          <div v-if="filteredEvents.length === 0" class="text-center py-12">
            <div
              class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 transition-colors duration-200"
              :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
            >
              <i
                class="fas fa-calendar-times text-3xl transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
              ></i>
            </div>
            <h3
              class="text-xl font-medium mb-2 transition-colors duration-200"
              :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
            >
              {{
                searchQuery || filter !== "all"
                  ? "No matching events found"
                  : "No events yet"
              }}
            </h3>
            <p
              class="mb-6 transition-colors duration-200"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
            >
              {{
                searchQuery || filter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Create your first event to get started"
              }}
            </p>
            <div class="flex justify-center space-x-3">
              <button
                v-if="searchQuery || filter !== 'all'"
                @click="clearFilters"
                class="px-4 py-2 text-white rounded-md transition-colors duration-200"
                :class="
                  isDarkMode
                    ? 'bg-gray-600 hover:bg-gray-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                "
              >
                <i class="fas fa-filter mr-2"></i>
                Clear Filters
              </button>
              <button
                @click="createEvent"
                class="px-4 py-2 text-white rounded-md transition-colors duration-200"
                :class="
                  isDarkMode
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-green-600 hover:bg-green-700'
                "
              >
                <i class="fas fa-plus mr-2"></i>
                Create Event
              </button>
            </div>
          </div>

          <div v-else>
            <CardsGrid
              v-if="view === 'card'"
              :key="refreshKey"
              :events="paginatedEvents"
              @remove="handleEventRemoval"
              @eventUpdated="handleEventUpdate"
            />
          </div>
        </div>

        <!-- Enhanced Pagination Controls -->
        <div
          v-if="totalPages > 1 && showCount === 'all'"
          class="border rounded-lg shadow-md p-4 mt-6 mx-4 transition-colors duration-200"
          :class="
            isDarkMode
              ? 'bg-gray-700 border-gray-600'
              : 'bg-white border-gray-200'
          "
        >
          <div
            class="flex flex-col sm:flex-row justify-between items-center gap-4"
          >
            <span
              class="text-sm font-medium transition-colors duration-200"
              :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
            >
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
              {{ Math.min(currentPage * itemsPerPage, totalItems) }} of
              {{ totalItems }} results
            </span>

            <div class="flex items-center space-x-1">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-3 py-2 text-sm border rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :class="
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                "
                title="Previous page"
              >
                <i class="fas fa-chevron-left"></i>
              </button>

              <template v-for="page in pageNumbers" :key="page">
                <button
                  v-if="page !== '...'"
                  @click="goToPage(page)"
                  :class="[
                    'px-3 py-2 text-sm border rounded-md transition-colors duration-200',
                    page === currentPage
                      ? 'bg-green-600 border-green-600 text-white shadow-lg'
                      : isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                  ]"
                  :title="`Go to page ${page}`"
                >
                  {{ page }}
                </button>
                <span
                  v-else
                  class="px-3 py-2 text-sm transition-colors duration-200"
                  :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                >
                  ...
                </span>
              </template>

              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="px-3 py-2 text-sm border rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :class="
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                "
                title="Next page"
              >
                <i class="fas fa-chevron-right"></i>
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
  opacity: 0.5;
}
</style>
