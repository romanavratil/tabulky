import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  Legend,
} from 'recharts';
import { useLogsStore } from '../../state/useLogsStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import { useProductsStore } from '../../state/useProductsStore';
import { formatDay } from '../../lib/date';
import type { MealEntry } from '../../types';

const colors = ['#7f5fff', '#10b981', '#0ea5e9', '#f59e0b', '#ef4444'];

export default function InsightsCharts() {
  const logs = useLogsStore((state) => state.logs);
  const currentDate = useLogsStore((state) => state.currentDate);
  const settings = useSettingsStore((state) => state.settings);
  const products = useProductsStore((state) => state.products);

  const weeklyGoal = settings.dailyTargets.calories ?? 2000;
  const weeklyData = useMemo(() => {
    const entries = Object.values(logs).sort((a, b) => a.date.localeCompare(b.date));
    const lastSeven = entries.slice(-7);
    return lastSeven.map((log) => ({
      date: formatDay(log.date),
      calories: Math.round(log.totals.calories ?? 0),
      goal: weeklyGoal,
      variance: Math.round((log.totals.calories ?? 0) - weeklyGoal),
    }));
  }, [logs, weeklyGoal]);

  const weeklySummary = useMemo(() => {
    if (weeklyData.length === 0) return null;
    const totalCalories = weeklyData.reduce((acc, day) => acc + day.calories, 0);
    const average = Math.round(totalCalories / weeklyData.length);
    const onTargetDays = weeklyData.filter((day) => day.calories <= day.goal).length;
    const bestDay = weeklyData.reduce(
      (best, day) => (day.calories < best.calories ? day : best),
      weeklyData[0],
    );
    return {
      average,
      onTargetDays,
      bestDay: bestDay.date,
      bestDayCalories: bestDay.calories,
      daysCount: weeklyData.length,
    };
  }, [weeklyData]);

  const todayTotals = logs[currentDate]?.totals;
  const macroSplit = useMemo(() => {
    if (!todayTotals) return [];
    const macros = [
      { name: 'Protein', value: todayTotals.protein ?? 0, fill: colors[1] },
      { name: 'Carbs', value: todayTotals.carbs ?? 0, fill: colors[2] },
      { name: 'Fat', value: todayTotals.fat ?? 0, fill: colors[3] },
    ];
    const total = macros.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) return [];
    return macros.map((item) => ({
      ...item,
      percent: Math.round((item.value / total) * 100),
    }));
  }, [todayTotals]);
  const macroTotal = macroSplit.reduce((acc, item) => acc + item.value, 0);

  const topFoods = useMemo(() => {
    const map = new Map<string, { calories: number; count: number; entry: MealEntry }>();
    Object.values(logs).forEach((log) => {
      log.entries.forEach((entry) => {
        const existing = map.get(entry.productId);
        if (existing) {
          existing.calories += entry.nutrients.calories;
          existing.count += 1;
        } else {
          map.set(entry.productId, { calories: entry.nutrients.calories, count: 1, entry });
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.calories - a.calories)
      .slice(0, 5)
      .map((item) => ({
        product: products[item.entry.productId]?.name ?? 'Unknown',
        calories: Math.round(item.calories),
        count: item.count,
      }));
  }, [logs, products]);
  const highestFoodCalories = topFoods.reduce((max, food) => Math.max(max, food.calories), 0);
  const highestWeeklyCalories = weeklyData.reduce((max, day) => Math.max(max, day.calories), 0);
  const weeklyDomainMax = Math.max(
    weeklyGoal ? weeklyGoal * 1.2 : 0,
    highestWeeklyCalories ? highestWeeklyCalories * 1.1 : 0,
  );
  const topFoodsDomainMax = Math.max(
    highestFoodCalories ? highestFoodCalories * 1.1 : 0,
    weeklyGoal ? weeklyGoal * 0.6 : 0,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-surface p-4 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground">Weekly calories</h2>
        {weeklyData.length === 0 ? (
          <p className="mt-8 text-sm text-muted">Log meals for a few days to unlock your calorie trend.</p>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, weeklyDomainMax > 0 ? weeklyDomainMax : 2000]} />
                  <Tooltip
                    cursor={{ fill: 'rgba(127,95,255,0.08)' }}
                    formatter={(value) => [`${value} kcal`, 'Calories']}
                    labelFormatter={(label, payload) => {
                      const variance = payload?.[0]?.payload.variance ?? 0;
                      if (variance === 0) return `${label} · On goal`;
                      const direction = variance > 0 ? 'above' : 'below';
                      return `${label} · ${Math.abs(variance)} kcal ${direction} goal`;
                    }}
                  />
                  <ReferenceLine
                    y={weeklyGoal}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{ position: 'top', value: 'Goal', fill: '#64748b', fontSize: 10 }}
                  />
                  <Bar dataKey="calories" radius={[12, 12, 12, 12]}>
                    {weeklyData.map((entry) => (
                      <Cell
                        key={entry.date}
                        fill={entry.calories > weeklyGoal ? colors[4] : colors[0]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {weeklySummary && (
              <dl className="mt-4 grid gap-3 text-xs text-muted sm:grid-cols-3">
                <div className="rounded-2xl bg-surfaceMuted px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wide">7-day average</dt>
                  <dd className="text-sm font-medium text-foreground">{weeklySummary.average} kcal</dd>
                </div>
                <div className="rounded-2xl bg-surfaceMuted px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wide">Days on target</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {weeklySummary.onTargetDays} / {weeklySummary.daysCount}
                  </dd>
                </div>
                <div className="rounded-2xl bg-surfaceMuted px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wide">Best day</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {weeklySummary.bestDay} · {weeklySummary.bestDayCalories} kcal
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-surface p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-foreground">Macro split today</h2>
          {macroSplit.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Log today&apos;s meals to see your macro balance.</p>
          ) : (
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroSplit}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    labelLine={false}
                    label={({ payload }) => {
                      const percent = (payload as { percent?: number } | undefined)?.percent ?? 0;
                      return `${percent}%`;
                    }}
                  >
                    {macroSplit.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value: string) => value}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name, props) => {
                      const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                      const percent = (props?.payload as { percent?: number } | undefined)?.percent ?? 0;
                      return [`${numeric.toFixed(1)} g • ${percent}%`, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-xs text-muted">
                <span>Total today</span>
                <span className="text-base font-semibold text-foreground">
                  {Math.round(todayTotals?.calories ?? 0)} kcal
                </span>
                <span>{macroTotal.toFixed(0)} g macros</span>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-3xl bg-surface p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-foreground">Top foods</h2>
          {topFoods.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Log meals to uncover your most calorie-dense foods.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFoods} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f4f4f6" />
                  <XAxis type="number" hide domain={[0, topFoodsDomainMax > 0 ? topFoodsDomainMax : 600]} />
                  <YAxis dataKey="product" type="category" axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                    formatter={(value: number) => [`${value} kcal`, 'Calories']}
                    labelFormatter={(label, payload) => {
                      const servings = payload?.[0]?.payload.count;
                      if (!servings) return label;
                      return `${label} · ${servings} servings`;
                    }}
                  />
                  <Bar dataKey="calories" radius={[12, 12, 12, 12]} fill={colors[1]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
