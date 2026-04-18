import { redirect } from "next/navigation";

export default function AdminSellersRedirectPage() {
  redirect("/admin/dashboard");
}
