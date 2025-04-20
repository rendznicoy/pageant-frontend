import { createRouter, createWebHistory } from "vue-router";
import DefaultLayout from "./components/DefaultLayout.vue";
import NotFound from "./pages/NotFound.vue";

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
import Users from "./pages/Users.vue";
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
        path: "admin/dashboard",
        name: "AdminDashboard",
        component: DashboardAdmin,
      },
      {
        path: "tabulator/dashboard",
        name: "TabulatorDashboard",
        component: DashboardTabulator,
      },
      {
        path: "judge/dashboard",
        name: "JudgeDashboard",
        component: DashboardJudge,
      },
      {
        path: "images",
        name: "Images",
        component: Images,
      },
      {
        path: "users",
        name: "Users",
        component: Users,
      },
      {
        path: "events",
        name: "Events",
        component: Events,
      },
      {
        path: "categories",
        name: "Categories",
        component: Categories,
      },
      {
        path: "candidates",
        name: "Candidates",
        component: Candidates,
      },
      {
        path: "judges",
        name: "Judges",
        component: Judges,
      },
      {
        path: "scores",
        name: "Scores",
        component: Scores,
      },
      {
        path: "reports",
        name: "Reports",
        component: Reports,
      },
      {
        path: "forgot",
        name: "Forgot",
        component: Forgot,
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

export default router;
