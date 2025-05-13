import { createRouter, createWebHistory } from "vue-router";
import axiosClient from "./axios";
import DefaultLayout from "./components/layout/DefaultLayout.vue";
import NotFound from "./pages/NotFound.vue";
import Confirmation from "./pages/Confirmation.vue";
import Logs from "./pages/Logs.vue";
import Notification from "./pages/Notification.vue";
import Profile from "./pages/Profile.vue";
import Preferences from "./pages/Preferences.vue";
import CreateEvent from "./pages/CreateEvent.vue";
import EventRedirect from "./pages/EventRedirect.vue";
import EventDetail from "./pages/EventDetail.vue";

// Dashboard Pages
import DashboardAdmin from "./pages/Dashboard/DashboardAdmin.vue";
import DashboardTabulator from "./pages/Dashboard/DashboardTabulator.vue";
import DashboardJudge from "./pages/Dashboard/DashboardJudge.vue";

// Auth Pages
import Login from "./pages/Login/Login.vue";
import LoginJudge from "./pages/Login/LoginJudge.vue";
import SignupAdmin from "./pages/Signup/SignupAdmin.vue";
import SignupTabulator from "./pages/Signup/SignupTabulator.vue";

// Other Pages
import Images from "./pages/Images.vue";
import UserList from "./pages/UserList.vue";
import Events from "./pages/Events.vue";
import Categories from "./pages/Categories.vue";
import Candidates from "./pages/Candidates.vue";
import Judges from "./pages/Judges.vue";
import Scores from "./pages/Scores.vue";
import Reports from "./pages/Reports.vue";
import Forgot from "./pages/Forgot.vue";

const routes = [
  {
    path: "/",
    redirect: "/login/admin", // Redirect root path to admin login
  },
  {
    path: "/",
    component: DefaultLayout,
    children: [
      {
        path: "/admin/dashboard",
        name: "AdminDashboard",
        component: DashboardAdmin,
        meta: { requiresAuth: true, role: "admin" },
      },
      {
        path: "/tabulator/dashboard",
        name: "TabulatorDashboard",
        component: DashboardTabulator,
        meta: { requiresAuth: true, role: "tabulator" },
      },
      {
        path: "/judge/dashboard",
        name: "JudgeDashboard",
        component: DashboardJudge,
        meta: { requiresAuth: true, role: "judge" },
      },
      {
        path: "/images",
        name: "Images",
        component: Images,
      },
      {
        path: "/users",
        name: "UserList",
        component: UserList,
      },
      {
        path: "/events",
        name: "Events",
        component: Events,
      },
      {
        path: "/categories",
        name: "Categories",
        component: Categories,
      },
      {
        path: "/candidates",
        name: "Candidates",
        component: Candidates,
      },
      {
        path: "/judges",
        name: "Judges",
        component: Judges,
      },
      {
        path: "/scores",
        name: "Scores",
        component: Scores,
      },
      {
        path: "/reports",
        name: "Reports",
        component: Reports,
      },
      {
        path: "/forgot",
        name: "Forgot",
        component: Forgot,
      },
      {
        path: "/confirmation",
        name: "Confirmation",
        component: Confirmation,
        // Adding meta property to indicate this route expects POST data
        meta: { expectsFormData: true },
      },
      {
        path: "/logs",
        name: "Logs",
        component: Logs,
      },
      {
        path: "/notification",
        name: "Notification",
        component: Notification,
      },
      {
        path: "/profile",
        name: "Profile",
        component: Profile,
      },
      {
        path: "/preferences",
        name: "Preferences",
        component: Preferences,
      },
      {
        path: "/events/create",
        name: "CreateEvent",
        component: CreateEvent,
        meta: { requiresAuth: true },
      },
      {
        path: "/events/:id",
        name: "EventRedirect",
        component: EventRedirect,
        meta: { requiresAuth: true },
      },
      {
        path: "/events/:id/details",
        name: "EventDetail",
        component: EventDetail,
        meta: { requiresAuth: true },
      },
    ],
  },

  // Auth Routes
  {
    path: "/login/admin",
    name: "Login",
    component: Login,
  },
  {
    path: "/login/judge",
    name: "LoginJudge",
    component: LoginJudge,
  },
  {
    path: "/signup/admin",
    name: "SignupAdmin",
    component: SignupAdmin,
  },
  {
    path: "/signup/tabulator",
    name: "SignupTabulator",
    component: SignupTabulator,
  },

  // Catch-all route
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      // Check if authenticated by making a request to a protected endpoint
      await axiosClient.get("/api/v1/user"); // or whatever endpoint checks authentication
      next();
    } catch (error) {
      next("/login/admin");
    }
  } else {
    next();
  }
});

export default router;
