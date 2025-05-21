import { useRouter } from "vue-router";

export function useRoleRouter() {
  const router = useRouter();

  const redirectToDashboard = (role) => {
    switch (role) {
      case "admin":
        router.push("/admin/dashboard");
        break;
      case "tabulator":
        router.push("/tabulator/dashboard");
        break;
      case "judge":
        router.push("/judge/dashboard");
        break;
      default:
        throw new Error("Unknown user role. Cannot redirect.");
    }
  };

  const getDashboardRoute = (role) => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "tabulator":
        return "/tabulator/dashboard";
      case "judge":
        return "/judge/dashboard";
      default:
        return null;
    }
  };

  return {
    redirectToDashboard,
    getDashboardRoute,
  };
}
