<script setup>
import { computed, ref, onMounted, defineEmits, defineProps } from "vue";
import { useSidebarStore } from "../../sidebar";
import { useEventStore } from "@/stores/event";
import { useRouter } from "vue-router";

const router = useRouter();
const sidebar = useSidebarStore();
const eventStore = useEventStore();

const emit = defineEmits(["refresh-dashboard"]);

// Define props
const props = defineProps({
  role: {
    type: String,
    default: "admin", // Default to admin if not specified
    validator: (value) => ["admin", "tabulator"].includes(value),
  },
});

const wrapperClass = computed(() =>
  sidebar.isOpen ? "translate-x-0" : "-translate-x-full"
);

const sortedEvents = computed(() => {
  return eventStore.events
    .filter((e) => !e.removed)
    .sort((a, b) => {
      if (a.starred === b.starred) {
        return a.event_name.localeCompare(b.event_name);
      }
      return a.starred ? -1 : 1;
    });
});

const navigateToDashboard = () => {
  if (
    router.currentRoute.value.path === "/admin/dashboard" ||
    router.currentRoute.value.path === "/tabulator/dashboard"
  ) {
    emit("refresh-dashboard");
  } else {
    // Redirect to appropriate dashboard based on role
    router.push(
      props.role === "admin" ? "/admin/dashboard" : "/tabulator/dashboard"
    );
  }
};

onMounted(() => {
  if (!eventStore.initialized) {
    eventStore.fetchEvents();
  }
});
</script>

<template>
  <div
    class="fixed top-0 left-0 h-full bg-gray-100 text-green-800 z-40 w-64 transition-transform duration-300 ease-in-out"
    :class="wrapperClass"
    style="margin-top: 57px"
  >
    <div class="p-4">
      <nav class="sidebar-nav">
        <ul class="space-y-4">
          <li>
            <a @click.prevent="navigateToDashboard" href="#" class="menu-item">
              <i class="fas fa-tachometer-alt w-4"></i>
              <span class="ml-2">Dashboard</span>
            </a>
          </li>

          <!-- Only show User list for admins -->
          <li v-if="role === 'admin'">
            <a href="/users" class="menu-item">
              <i class="fas fa-user w-4"></i>
              <span class="ml-2">User list</span>
            </a>
          </li>

          <!-- Only show Logs for admins -->
          <li v-if="role === 'admin'">
            <a href="/logs" class="menu-item">
              <i class="fas fa-folder w-4"></i>
              <span class="ml-2">Logs</span>
            </a>
          </li>

          <li>
            <a href="/reports" class="menu-item">
              <i class="fas fa-file w-4"></i>
              <span class="ml-2">Pageant Files</span>
            </a>
          </li>
          <li class="menu-section">
            <div class="menu-header">
              <i class="fas fa-calendar-alt w-4"></i>
              <span class="ml-2">My Events</span>
            </div>
            <ul class="submenu">
              <li v-for="event in sortedEvents" :key="event.event_id">
                <a
                  :href="`/events/${event.event_id}`"
                  class="event-item"
                  :class="{
                    'bg-green-400': event.status === 'active',
                    'bg-gray-400': event.status === 'inactive',
                    'bg-blue-400': event.status === 'completed',
                  }"
                  :title="`Status: ${event.status}`"
                >
                  <div class="event-content">
                    <i
                      class="fas w-8 flex-shrink-0"
                      :class="{
                        'fa-play': event.status === 'active',
                        'fa-pause': event.status === 'inactive',
                        'fa-check-circle': event.status === 'completed',
                      }"
                    ></i>
                    <span class="event-name">{{ event.event_name }}</span>
                  </div>
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.sidebar-wrapper {
  background-color: #f2f2f2; /* bg-gray-100 */
  color: #19470d; /* text-green-800 */
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  color: inherit;
  text-decoration: none;
  background-color: #fcd53a;
  border: 2px solid #f4cc2a;
  margin-bottom: 0.75rem;
}

.menu-item:hover {
  background-color: #ffffff;
  color: #166534;
}

.event-item {
  display: block;
  padding: 0;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  color: #1a1a1a;
  text-decoration: none;
  border: 2px solid #f4cc2a;
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.event-item:hover {
  background-color: #ffffff !important;
  color: #166534;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.event-content {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
}

.event-name {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  padding-left: 0.75rem;
}

.menu-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  font-weight: 300;
  color: #817a5d;
  cursor: default;
  background-color: #fcd53a;
  border: 2px solid #f4cc2a;
  border-radius: 0.5rem;
  margin: 0.75rem 1;
}

.menu-section {
  margin-top: 1.5rem;
}

.submenu {
  padding-left: 0;
  margin-top: 0.75rem;
}

.menu-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: #166534;
  background-color: #fef08a;
  border: 2px solid #eab308;
  border-radius: 0.5rem;
}

.menu-item:hover i,
.submenu-item:hover i {
  color: #166534; /* text-green-800 */
}

.event-item.bg-green-400 {
  border-color: #4ade80;
}
.event-item.bg-gray-400 {
  border-color: #9ca3af;
}
.event-item.bg-blue-400 {
  border-color: #60a5fa;
}

/* Icon colors */
.event-item .fas {
  color: inherit;
}
</style>
