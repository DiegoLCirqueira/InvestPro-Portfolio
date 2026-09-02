import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import type { UserRole } from "@/types/user";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface UseAdminUsersOptions {
  initialData?: AdminUser[];
  enabled?: boolean;
}

export function useAdminUsers({
  initialData,
  enabled = true,
}: UseAdminUsersOptions = {}) {
  return useQuery<AdminUser[]>({
    fetcher: () => api.get<AdminUser[]>("/admin/users"),
    deps: [],
    initialData,
    enabled,
  });
}
