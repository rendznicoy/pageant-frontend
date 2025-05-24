import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/user";
import axiosClient from "./axios";
import DefaultLayout from "./components/layout/DefaultLayout.vue";
import NotFound from "./pages/NotFound.vue";
import Confirmation from "./pages/Confirmation.vue";
import CreateEvent from "./pages/CreateEvent.vue";
import EventRedirect from "./pages/EventRedirect.vue";
import EventDetail from "./pages/EventDetail.vue";
import DashboardAdmin from "./pages/Dashboard/DashboardAdmin.vue";
import DashboardTabulator from "./pages/Dashboard/DashboardTabulator.vue";
import DashboardJudge from "./pages/Dashboard/DashboardJudge.vue";
import Login from "./pages/Login/Login.vue";
import LoginJudge from "./pages/Login/LoginJudge.vue";
import SignupAdmin from "./pages/Signup/SignupAdmin.vue";
import SignupTabulator from "./pages/Signup/SignupTabulator.vue";
import Images from "./pages/Images.vue";
import UserList from "./pages/UserList.vue";
import Events from "./pages/Events.vue";
import Categories from "./pages/Categories.vue";
import Candidates from "./pages/Candidates.vue";
import Judges from "./pages/Judges.vue";
import Scores from "./pages/Scores.vue";
import Forgot from "./pages/Forgot.vue";
import ThankYou from "./pages/ThankYou.vue";

const routes = [
  {
    path: "/",
    redirect: "/login/admin",
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
        path: "/judge/thank-you",
        name: "ThankYou",
        component: ThankYou,
        meta: { requiresAuth: false },
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
        path: "/forgot",
        name: "Forgot",
        component: Forgot,
      },
      {
        path: "/confirmation",
        name: "Confirmation",
        component: Confirmation,
        meta: { expectsFormData: true },
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
      {
        path: "/events/:id/edit",
        name: "EventEdit",
        component: CreateEvent, // Reuse CreateEvent for editing
        meta: { requiresAuth: true },
      },
    ],
  },
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
  const isJudgeSession = localStorage.getItem("judgeSession") === "true";

  if (to.meta.requiresAuth) {
    if (isJudgeSession && to.meta.role === "judge") {
      return next(); // skip fetchUser for judge session
    }

    try {
      await axiosClient.get("/api/v1/user");
      next();
    } catch (error) {
      next("/login/admin");
    }
  } else {
    next();
  }
});

export default router;
