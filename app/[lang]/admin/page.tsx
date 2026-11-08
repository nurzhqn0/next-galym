import { redirect } from "next/navigation";
import { getLocale } from "../dictionaries";

export default async function AdminPage() {
  redirect(`/${await getLocale()}/admin/news`);
}
