import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  EmptyPlaceholder,
  formatAmount,
  Icons,
} from '@wealthfolio/ui';
import { Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from '@wealthfolio/ui/chart';
import type { MonthlyDividendSummary } from '../types';
import type { Account } from '@wealthfolio/addon-sdk';

interface DividendsByMonthProps {
  monthlyData: MonthlyDividendSummary[];
  accounts: Account[];
  baseCurrency: string;
  isBalanceHidden: boolean;
  selectedYear: number;
}

// Generate gradient colors for each account
const CHART_GRADIENTS = [
  { id: 'gradient-olive-month', start: '#8a9e6d', end: '#5a6d42' },  // Olive Green
  { id: 'gradient-blue-month', start: '#2e5c9e', end: '#1a3558' },   // Blue
  { id: 'gradient-orange-month', start: '#FA8112', end: '#B45A0C' }, // Orange
  { id: 'gradient-darkgreen-month', start: '#3d6b1f', end: '#1e3510' }, // Dark Green
  { id: 'gradient-red-month', start: '#A64650', end: '#8A244B' },   // Soft Red
  { id: 'gradient-min-montht', start: '#44F5C3', end: '#2FA37F' },   // Mint
  { id: 'gradient-purple-month', start: '#923BC2', end: '#5F247F' }, // Purple
  { id: 'gradient-mauve-month', start: '#FA0123', end: '#B30019' },    // Mauve
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function DividendsByMonth({
  monthlyData,
  accounts,
  baseCurrency,
  isBalanceHidden,
  selectedYear,
}: DividendsByMonthProps) {
  const accountColors = useMemo(() => {
    const colors: Record<string, string> = {};
    accounts.forEach((account, index) => {
      const gradient = CHART_GRADIENTS[index % CHART_GRADIENTS.length];
      colors[account.id] = `url(#${gradient.id})`;
    });
    return colors;
  }, [accounts]);

  const accountSolidColors = useMemo(() => {
    const colors: Record<string, string> = {};
    accounts.forEach((account, index) => {
      const gradient = CHART_GRADIENTS[index % CHART_GRADIENTS.length];
      colors[account.id] = gradient.start; // Use start color for tooltips and legends
    });
    return colors;
  }, [accounts]);

  const filteredMonthlyData = useMemo(() => {
    return monthlyData.filter((m) => m.year === selectedYear);
  }, [monthlyData, selectedYear]);

  // Filter accounts to only include those with dividends for the selected year
  const accountsWithDividends = useMemo(() => {
    return accounts.filter((account) => {
      const total = filteredMonthlyData.reduce((sum, month) => sum + (month.byAccount[account.id] || 0), 0);
      return total > 0;
    });
  }, [accounts, filteredMonthlyData]);

  const chartData = useMemo(() => {
    // Create array of all 12 months
    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const monthData = filteredMonthlyData.find((m) => m.month === i + 1);
      const data: any = {
        month: MONTH_NAMES[i],
        monthNum: i + 1,
      };

      accountsWithDividends.forEach((account) => {
        data[account.id] = monthData?.byAccount[account.id] || 0;
      });

      return data;
    });

    return allMonths;
  }, [filteredMonthlyData, accountsWithDividends]);

  // Sort accounts by total dividend amount for selected year (largest first)
  const sortedAccounts = useMemo(() => {
    return [...accountsWithDividends].sort((a, b) => {
      const totalA = filteredMonthlyData.reduce((sum, month) => sum + (month.byAccount[a.id] || 0), 0);
      const totalB = filteredMonthlyData.reduce((sum, month) => sum + (month.byAccount[b.id] || 0), 0);
      return totalB - totalA; // Descending order (largest first)
    });
  }, [accountsWithDividends, filteredMonthlyData]);

  const chartConfig = useMemo(() => {
    const config: any = {};
    sortedAccounts.forEach((account) => {
      config[account.id] = {
        label: account.name,
        color: accountSolidColors[account.id],
      };
    });
    return config;
  }, [sortedAccounts, accountSolidColors]);

  if (monthlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dividends by Month</CardTitle>
          <CardDescription>No dividend data available</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyPlaceholder
            className="mx-auto flex h-[300px] max-w-[420px] items-center justify-center"
            icon={<Icons.ChartBar className="size-10" />}
            title="No dividend data"
            description="Start tracking dividends to see your monthly breakdown"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr] grid-cols-1">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Dividends by Month</CardTitle>
            <CardDescription>Monthly dividends for {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-6">
            <ChartContainer className="min-h-[300px] w-full" config={chartConfig}>
              <ComposedChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <defs>
                  {CHART_GRADIENTS.map((gradient) => (
                    <linearGradient key={gradient.id} id={gradient.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={gradient.start} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={gradient.end} stopOpacity={0.9} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;

                    // Sort payload to match legend order (reversed - first legend item at bottom)
                    const sortedPayload = [...payload].sort((a, b) => {
                      const indexA = sortedAccounts.findIndex((acc) => acc.id === a.dataKey);
                      const indexB = sortedAccounts.findIndex((acc) => acc.id === b.dataKey);
                      return indexB - indexA;
                    });

                    return (
                      <div className="bg-background border border-border rounded-lg shadow-lg p-2 min-w-[180px]">
                        <div className="font-medium mb-1.5">{label}</div>
                        <div className="flex flex-col gap-1">
                          {sortedPayload.map((item: any) => {
                            const account = accounts.find((a) => a.id === item.dataKey || a.name === item.dataKey);
                            const formattedValue = isBalanceHidden
                              ? '••••'
                              : formatAmount(Number(item.value), baseCurrency);
                            return (
                              <div key={item.dataKey} className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: account ? accountSolidColors[account.id] : undefined,
                                  }}
                                />
                                <span className="text-muted-foreground flex-1">
                                  {account?.name || item.name}
                                </span>
                                <span className="text-foreground font-mono font-medium tabular-nums">
                                  {formattedValue}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                <ChartLegend
                  content={() => {
                    return (
                      <div className="flex flex-wrap justify-center gap-3 text-[11px] sm:text-xs mt-4">
                        {sortedAccounts.map((account) => (
                          <div key={account.id} className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{ backgroundColor: accountSolidColors[account.id] }}
                            />
                            <span className="text-muted-foreground">{account.name}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                {sortedAccounts.map((account) => (
                  <Bar
                    key={account.id}
                    dataKey={account.id}
                    name={account.name}
                    stackId="dividends"
                    fill={accountColors[account.id]}
                    stroke={accountSolidColors[account.id]}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>{selectedYear} dividends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Month</th>
                    {accountsWithDividends.map((account) => (
                      <th key={account.id} className="text-right p-2 font-medium">
                        {account.name}
                      </th>
                    ))}
                    <th className="text-right p-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((monthData) => {
                    const total = accountsWithDividends.reduce(
                      (sum, account) => sum + (monthData[account.id] || 0),
                      0
                    );
                    return (
                      <tr key={monthData.monthNum} className="border-b">
                        <td className="p-2">{monthData.month}</td>
                        {accountsWithDividends.map((account) => (
                          <td key={account.id} className="text-right p-2 font-mono tabular-nums">
                            {isBalanceHidden
                              ? '••••'
                              : formatAmount(monthData[account.id] || 0, baseCurrency)}
                          </td>
                        ))}
                        <td className="text-right p-2 font-mono font-semibold tabular-nums">
                          {isBalanceHidden ? '••••' : formatAmount(total, baseCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="font-semibold bg-muted/50">
                    <td className="p-2">Total</td>
                    {accountsWithDividends.map((account) => {
                      const accountTotal = chartData.reduce(
                        (sum, monthData) => sum + (monthData[account.id] || 0),
                        0
                      );
                      return (
                        <td key={account.id} className="text-right p-2 font-mono tabular-nums">
                          {isBalanceHidden ? '••••' : formatAmount(accountTotal, baseCurrency)}
                        </td>
                      );
                    })}
                    <td className="text-right p-2 font-mono tabular-nums">
                      {isBalanceHidden
                        ? '••••'
                        : formatAmount(
                            chartData.reduce((sum, monthData) => {
                              return (
                                sum +
                                accountsWithDividends.reduce(
                                  (s, account) => s + (monthData[account.id] || 0),
                                  0
                                )
                              );
                            }, 0),
                            baseCurrency
                          )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
