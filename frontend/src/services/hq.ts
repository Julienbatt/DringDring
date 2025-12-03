import { apiAuthGet } from "@/lib/api";
import type { HqDashboard } from "@/lib/api";

export const fetchHqDashboard = (chainId: string, regionId: string) =>
  apiAuthGet<HqDashboard>(`/shops/chains/${chainId}/regions/${regionId}/dashboard`);
 