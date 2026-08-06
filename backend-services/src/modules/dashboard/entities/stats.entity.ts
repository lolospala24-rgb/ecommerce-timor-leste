// placeholder for src/modules/dashboard/entities/stats.entity.ts
export class StatsEntity {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
  timestamp: Date;

  constructor(partial: Partial<StatsEntity>) {
    Object.assign(this, partial);
    this.calculateChange();
  }

  private calculateChange() {
    if (this.previousValue !== undefined && this.value !== undefined) {
      this.change = this.value - this.previousValue;
      this.changePercentage = this.previousValue !== 0 
        ? (this.change / this.previousValue) * 100 
        : 100;
      this.trend = this.change > 0 ? 'up' : this.change < 0 ? 'down' : 'stable';
    }
  }

  // Format value for display
  formatValue(): string {
    if (this.name === 'revenue' || this.name === 'totalSpent') {
      return `$${this.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return this.value.toLocaleString();
  }

  // Get trend icon name
  getTrendIcon(): string {
    switch (this.trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'minus';
    }
  }

  // Get trend color
  getTrendColor(): string {
    switch (this.trend) {
      case 'up': return 'green';
      case 'down': return 'red';
      default: return 'gray';
    }
  }

  // Get formatted change percentage
  getFormattedChange(): string {
    if (this.changePercentage === undefined) return '';
    const sign = this.changePercentage > 0 ? '+' : '';
    return `${sign}${this.changePercentage.toFixed(1)}%`;
  }
}

export class TimeSeriesStats {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];

  constructor(partial: Partial<TimeSeriesStats>) {
    Object.assign(this, partial);
  }
}

export class DistributionStats {
  labels: string[];
  values: number[];
  percentages: number[];

  constructor(partial: Partial<DistributionStats>) {
    Object.assign(this, partial);
    this.calculatePercentages();
  }

  private calculatePercentages() {
    const total = this.values.reduce((sum, val) => sum + val, 0);
    this.percentages = this.values.map(val => total > 0 ? (val / total) * 100 : 0);
  }

  // Get percentage for specific index
  getPercentage(index: number): number {
    return this.percentages[index] || 0;
  }
}