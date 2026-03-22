"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  CreditCard,
  FileText,
  Send,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatCard } from "@/app/admin/_components/StatCard";

import styles from "./dashboard.module.css";

type Period = "7d" | "30d" | "90d";

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersYesterday: number;
  totalRecords: number;
  totalDeliveredReports: number;
  totalPayments: number;
  totalRevenue: number;
}

interface ChartDataPoint {
  date: string;
  value: number;
}

interface ChartData {
  signups: ChartDataPoint[];
  revenue: ChartDataPoint[];
}

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatValue?: (value: number) => string;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
  { value: "90d", label: "90일" },
];

const CHART_COLORS = {
  primary: "var(--color-primary-500)",
  primarySub: "var(--color-primary-300)",
  grid: "var(--color-neutral-200)",
};

const formatCurrency = (value: number): string =>
  `\u20A9${value.toLocaleString("ko-KR")}`;

const formatShortDate = (dateStr: string): string => {
  const parts = dateStr.split("-");
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
};

const calculatePercentChange = (
  current: number,
  previous: number
): { value: number; type: "increase" | "decrease" | "neutral" } => {
  if (previous === 0 && current === 0) {
    return { value: 0, type: "neutral" };
  }
  if (previous === 0) {
    return { value: 100, type: "increase" };
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change > 0) return { value: change, type: "increase" };
  if (change < 0) return { value: Math.abs(change), type: "decrease" };
  return { value: 0, type: "neutral" };
};

const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
}: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const [firstItem] = payload;
  const { value } = firstItem;
  const displayValue = formatValue
    ? formatValue(value)
    : value.toLocaleString("ko-KR");

  return (
    <div className={styles.tooltipContainer}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p className={styles.tooltipValue}>{displayValue}</p>
    </div>
  );
};

const StatsSkeleton = () => (
  <div className={styles.statsGrid}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className={styles.skeletonCard}>
        <div className={styles.skeletonLineShort} />
        <div className={styles.skeletonLineWide} />
      </div>
    ))}
  </div>
);

const ChartsSkeleton = () => (
  <div className={styles.chartsGrid}>
    <div className={styles.skeletonChart} />
    <div className={styles.skeletonChart} />
  </div>
);

const AdminDashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [chartsError, setChartsError] = useState<string | null>(null);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const xAxisInterval = useMemo(() => {
    if (windowWidth <= 480)
      return Math.ceil(chartData?.signups?.length ?? 7 / 4);
    if (windowWidth <= 768)
      return Math.ceil((chartData?.signups?.length ?? 7) / 6);
    return "preserveStartEnd" as const;
  }, [windowWidth, chartData?.signups?.length]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      const response = await fetch("/api/admin/dashboard/stats");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "통계 데이터를 불러올 수 없습니다.");
      }

      const data: DashboardStats = await response.json();
      setStats(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "통계 데이터를 불러올 수 없습니다.";
      setStatsError(message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchCharts = useCallback(async () => {
    setChartsLoading(true);
    setChartsError(null);

    try {
      const response = await fetch(
        `/api/admin/dashboard/charts?period=${period}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "차트 데이터를 불러올 수 없습니다.");
      }

      const data: ChartData = await response.json();
      setChartData(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "차트 데이터를 불러올 수 없습니다.";
      setChartsError(message);
    } finally {
      setChartsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
  };

  const renderError = (message: string, onRetry: () => void) => (
    <div className={styles.errorContainer}>
      <AlertCircle size={32} className={styles.errorIcon} />
      <p className={styles.errorText}>{message}</p>
      <button className={styles.retryButton} onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>대시보드</h1>
          <div className={styles.filterGroup}>
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`${styles.filterTab} ${
                  period === option.value ? styles.filterTabActive : ""
                }`}
                onClick={() => handlePeriodChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {statsLoading ? (
          <StatsSkeleton />
        ) : statsError ? (
          renderError(statsError, fetchStats)
        ) : stats ? (
          <div className={styles.statsGrid}>
            <StatCard
              label="총 유저"
              value={stats.totalUsers}
              icon={<Users size={20} />}
              suffix="명"
            />
            <StatCard
              label="오늘 가입"
              value={stats.newUsersToday}
              icon={<Users size={20} />}
              change={calculatePercentChange(
                stats.newUsersToday,
                stats.newUsersYesterday
              )}
              suffix="명"
            />
            <StatCard
              label="생기부 제출"
              value={stats.totalRecords}
              icon={<FileText size={20} />}
              suffix="건"
            />
            <StatCard
              label="리포트 발급"
              value={stats.totalDeliveredReports}
              icon={<Send size={20} />}
              suffix="건"
            />
            <StatCard
              label="총 결제"
              value={stats.totalPayments}
              icon={<CreditCard size={20} />}
              suffix="건"
            />
            <StatCard
              label="총 결제액"
              value={formatCurrency(stats.totalRevenue)}
              icon={<Banknote size={20} />}
            />
          </div>
        ) : null}

        {chartsLoading ? (
          <ChartsSkeleton />
        ) : chartsError ? (
          renderError(chartsError, fetchCharts)
        ) : chartData ? (
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>
                <BarChart3
                  size={16}
                  style={{
                    display: "inline",
                    marginRight: 6,
                    verticalAlign: "text-bottom",
                  }}
                />
                일별 가입 추이
              </h2>
              <div className={styles.chartArea}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.signups}>
                    <defs>
                      <linearGradient
                        id="signupGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={CHART_COLORS.primary}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={CHART_COLORS.primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_COLORS.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: windowWidth <= 480 ? 10 : 12 }}
                      stroke={CHART_COLORS.grid}
                      tickLine={false}
                      axisLine={false}
                      interval={xAxisInterval}
                    />
                    <YAxis
                      tick={{ fontSize: windowWidth <= 480 ? 10 : 12 }}
                      stroke={CHART_COLORS.grid}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={windowWidth <= 480 ? 30 : 40}
                    />
                    <Tooltip
                      content={<CustomTooltip formatValue={(v) => `${v}명`} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      fill="url(#signupGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>
                <BarChart3
                  size={16}
                  style={{
                    display: "inline",
                    marginRight: 6,
                    verticalAlign: "text-bottom",
                  }}
                />
                일별 매출 추이
              </h2>
              <div className={styles.chartArea}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.revenue}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_COLORS.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: windowWidth <= 480 ? 10 : 12 }}
                      stroke={CHART_COLORS.grid}
                      tickLine={false}
                      axisLine={false}
                      interval={xAxisInterval}
                    />
                    <YAxis
                      tick={{ fontSize: windowWidth <= 480 ? 10 : 12 }}
                      stroke={CHART_COLORS.grid}
                      tickLine={false}
                      axisLine={false}
                      width={windowWidth <= 480 ? 35 : 45}
                      tickFormatter={(value: number) =>
                        value >= 10000
                          ? `${Math.round(value / 10000)}만`
                          : value.toLocaleString("ko-KR")
                      }
                    />
                    <Tooltip
                      content={<CustomTooltip formatValue={formatCurrency} />}
                    />
                    <Bar
                      dataKey="value"
                      fill={CHART_COLORS.primarySub}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default AdminDashboardPage;
