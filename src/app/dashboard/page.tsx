import { redirect } from "next/navigation";

// The dashboard has been consolidated into the Intelligence console.
export default function DashboardRedirect() {
  redirect("/intel");
}
