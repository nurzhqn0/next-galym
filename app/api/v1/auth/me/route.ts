import { requireUser } from "@/lib/auth/guard";
import { route } from "@/lib/http";

export const GET = route(() => requireUser());
