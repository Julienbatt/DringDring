export type ReportPeriod = "week" | "month" | "quarter" | "year";

export type ReportBreakdownRow = {
  label: string;
  deliveries: number;
  revenue: number;
};

export type ReportTimeSeriesPoint = {
  date: string;
  deliveries: number;
  revenue: number;
};

export type ReportSummary = {
  period: ReportPeriod;
  totalDeliveries: number;
  totalRevenue: number;
  averageOrderValue: number;
  topShops: ReportBreakdownRow[];
  deliveriesByDay: ReportTimeSeriesPoint[];
  deliveriesByRegion: ReportBreakdownRow[];
};
export type Period = 'week' | 'month' | 'quarter' | 'year';

export type TopShop = {
  name: string;
  deliveries: number;
  revenue: number;
};

export type DailyPerformance = {
  date: string;
  deliveries: number;
  revenue: number;
};

export type RegionPerformance = {
  region: string;
  deliveries: number;
  revenue: number;
};

export type ReportData = {
  period: string;
  totalDeliveries: number;
  totalRevenue: number;
  averageOrderValue: number;
  topShops: TopShop[];
  deliveriesByDay: DailyPerformance[];
  deliveriesByRegion: RegionPerformance[];
};

export type ReportMeta = {
  startDate: string;
  endDate: string;
  previousDeliveries: number;
  previousRevenue: number;
  deliveriesGrowth: number;
  revenueGrowth: number;
};

export type RealtimeReport = ReportData & {
  meta: ReportMeta;
};

export type ComparisonSnapshot = {
  revenueDelta: number;
  deliveriesDelta: number;
};

export type MetricCard = {
  id: string;
  label: string;
  value: string;
  icon: string;
  tone?: 'positive' | 'negative' | 'neutral';
  trendLabel?: string;
  hint?: string;
};



