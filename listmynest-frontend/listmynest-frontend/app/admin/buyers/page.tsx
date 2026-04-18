import { redirect } from "next/navigation";

export default function AdminBuyersRedirectPage() {
  redirect("/admin/dashboard");
}
