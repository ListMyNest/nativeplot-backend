import { redirect } from "next/navigation";

export default function AdminAgentsRedirectPage() {
  redirect("/admin/dashboard");
}
