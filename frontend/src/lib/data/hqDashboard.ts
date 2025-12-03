import type { HqDashboard } from "@/lib/api";

export const hqDashboardMock: HqDashboard = {
  today: {
    deliveries: 32,
    totalBags: 210,
    totalAmount: 7800,
    totalFees: 1200,
    shopFees: 520,
    authorityFees: 340,
    chainFees: 340,
  },
  week: {
    deliveries: 210,
    totalBags: 1420,
    totalAmount: 51_200,
    totalFees: 8_640,
    shopFees: 3_400,
    authorityFees: 2_720,
    chainFees: 2_520,
  },
  month: {
    deliveries: 890,
    totalBags: 5_600,
    totalAmount: 201_500,
    totalFees: 33_200,
    shopFees: 13_400,
    authorityFees: 10_020,
    chainFees: 9_780,
  },
  topEmployees: [
    { name: "Sophie Muller", deliveries: 42 },
    { name: "David Chen", deliveries: 35 },
  ],
  topSectors: [
    { name: "Genève Centre", deliveries: 120 },
    { name: "Lausanne Nord", deliveries: 98 },
  ],
  lastUpdated: new Date().toISOString(),
};
import { hqRegionsMock, hqStatsMock } from "@/data/mocks/dashboard";

type FetchParams = {
  chainId: string;
};

export const fetchHqDashboard = async (_params: FetchParams) => {
  // TODO: replace with real API request filtered by params.chainId
  return {
    stats: hqStatsMock,
    regions: hqRegionsMock,
  };
};



