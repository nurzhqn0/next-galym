import { requireUser } from "@/lib/auth/guard";
import { route } from "@/lib/http";
import { listMySubmissions } from "@/lib/services/applications";

export const GET = route(async () => listMySubmissions((await requireUser()).id));
