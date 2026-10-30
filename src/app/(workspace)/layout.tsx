import { redirect } from "next/navigation";
import { admin, configured, AppError } from "@/lib/server";
export default async function Workspace({
  children,
}: {
  children: React.ReactNode;
}) {
  if (configured()) {
    try {
      await admin();
    } catch (e) {
      if (e instanceof AppError && (e.status === 401 || e.status === 403))
        redirect("/login");
      throw e;
    }
  }
  return children;
}
