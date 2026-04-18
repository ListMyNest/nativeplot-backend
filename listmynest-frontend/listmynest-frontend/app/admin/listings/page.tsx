import { redirect } from "next/navigation";

export default function AdminListingsRedirectPage() {
  redirect("/admin/dashboard");
}
