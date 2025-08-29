// src/backend/monitoring/MonitoringService.js
// Comprehensive monitoring and observability service

/**
 * Monitoring service for collecting metrics, logs, and performance data
 * Integrates with external monitoring systems and provides internal observability
 */
class MonitoringService {
  constructor() {
    this.metrics = [];
    this.logs = [];
    this.maxMetricsBuffer = 10000;
    this.maxLogsBuffer = 10000;
    this.isInitialized = false;
  }

  /**
   * Initialize the monitoring service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing MonitoringService...');
    
    // Set up periodic cleanup of old data
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
    
    this.isInitialized = true;
    console.log('MonitoringService initialized');
  }

  /**
   * Shutdown the monitoring service
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    console.log('MonitoringService shutdown complete');
    this.isInitialized = false;
  }

  /**
   * Record a metric
   */
  recordMetric(metric) {
    const metricEntry = {
      name: metric.name,
      value: metric.value,
      labels: metric.labels || {},
      timestamp: metric.timestamp || new Date().toISOString()
    };
    
    this.metrics.push(metricEntry);
    
    // Prevent memory leaks
    if (this.metrics.length > this.maxMetricsBuffer) {
      this.metrics = this.metrics.slice(-this.maxMetricsBuffer / 2);
    }
    
    // Send to external monitoring system
    this.sendMetricToMonitoring(metricEntry);
  }

  /**
   * Log an entry
   */
  log(entry) {
    const logEntry = {
      level: entry.level,
      message: entry.message,
      service: entry.service,
      operation: entry.operation,
      duration: entry.duration,
      context: entry.context,
      traceId: entry.traceId,
      userId: entry.userId,
      timestamp: entry.timestamp || new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    
    // Prevent memory leaks
    if (this.logs.length > this.maxLogsBuffer) {
      this.logs = this.logs.slice(-this.maxLogsBuffer / 2);
    }
    
    // Send to logging system
    this.sendLogToSystem(logEntry);
    
    // Console output for development
    const logMethod = console[entry.level] || console.log;
    logMethod(`[${entry.service || 'System'}] ${entry.message}`, entry.context || '');
  }

  /**
   * Get metrics by name pattern
   */
  getMetrics(namePattern = null, timeRange = null) {
    let filteredMetrics = this.metrics;
    
    if (namePattern) {
      filteredMetrics = filteredMetrics.filter(m => m.name.includes(namePattern));
    }
    
    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      
      filteredMetrics = filteredMetrics.filter(m => {
        const metricTime = new Date(m.timestamp).getTime();
        return metricTime >= startTime && metricTime <= endTime;
      });
    }
    
    return filteredMetrics;
  }

  /**
   * Get logs by service and level
   */
  getLogs(service = null, level = null, timeRange = null) {
    let filteredLogs = this.logs;
    
    if (service) {
      filteredLogs = filteredLogs.filter(log => log.service === service);
    }
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      
      filteredLogs = filteredLogs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= startTime && logTime <= endTime;
      });
    }
    
    return filteredLogs;
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(metricName, aggregation = 'sum', groupBy = null, timeRange = null) {
    const metrics = this.getMetrics(metricName, timeRange);
    
    if (!groupBy) {
      // Simple aggregation
      const values = metrics.map(m => m.value);
      
      switch (aggregation) {
        case 'sum':
          return values.reduce((sum, val) => sum + val, 0);
        case 'avg':
          return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        case 'min':
          return Math.min(...values);
        case 'max':
          return Math.max(...values);
        case 'count':
          return values.length;
        default:
          return values;
      }
    } else {
      // Group by label and aggregate
      const groups = {};
      
      metrics.forEach(metric => {
        const groupKey = metric.labels[groupBy] || 'unknown';
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(metric.value);
      });
      
      const result = {};
      for (const [group, values] of Object.entries(groups)) {
        switch (aggregation) {
          case 'sum':
            result[group] = values.reduce((sum, val) => sum + val, 0);
            break;
          case 'avg':
            result[group] = values.reduce((sum, val) => sum + val, 0) / values.length;
            break;
          case 'min':
            result[group] = Math.min(...values);
            break;
          case 'max':
            result[group] = Math.max(...values);
            break;
          case 'count':
            result[group] = values.length;
            break;
          default:
            result[group] = values;
        }
      }
      
      return result;
    }
  }

  /**
   * Get system performance metrics
   */
  getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    return {
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(uptime),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get service performance summary
   */
  getServicePerformanceSummary(serviceName, timeRange = null) {
    const logs = this.getLogs(serviceName, null, timeRange);
    const metrics = this.getMetrics('service_operation', timeRange)
      .filter(m => m.labels.service === serviceName);
    
    const operationCounts = {};
    const operationDurations = {};
    const errorCounts = {};
    
    logs.forEach(log => {
      if (log.operation) {
        operationCounts[log.operation] = (operationCounts[log.operation] || 0) + 1;
        
        if (log.duration) {
          if (!operationDurations[log.operation]) {
            operationDurations[log.operation] = [];
          }
          operationDurations[log.operation].push(log.duration);
        }
        
        if (log.level === 'error') {
          errorCounts[log.operation] = (errorCounts[log.operation] || 0) + 1;
        }
      }
    });
    
    // Calculate averages for durations
    const avgDurations = {};
    for (const [operation, durations] of Object.entries(operationDurations)) {
      avgDurations[operation] = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    }
    
    return {
      service: serviceName,
      timeRange,
      operations: {
        counts: operationCounts,
        averageDurations: avgDurations,
        errorCounts
      },
      totalOperations: Object.values(operationCounts).reduce((sum, count) => sum + count, 0),
      totalErrors: Object.values(errorCounts).reduce((sum, count) => sum + count, 0)
    };
  }

  /**
   * Send metric to external monitoring system
   */
  sendMetricToMonitoring(metric) {
    // Implementation would integrate with actual monitoring service
    // For now, we'll just store it locally
    
    // Example integration points:
    // - Prometheus
    // - DataDog
    // - New Relic
    // - CloudWatch
  }

  /**
   * Send log to external logging system
   */
  sendLogToSystem(entry) {
    // Implementation would integrate with logging service
    // For now, we'll just store it locally
    
    // Example integration points:
    // - ELK Stack (Elasticsearch, Logstash, Kibana)
    // - Splunk
    // - CloudWatch Logs
    // - Fluentd
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  cleanupOldData() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const initialMetricsCount = this.metrics.length;
    const initialLogsCount = this.logs.length;
    
    this.metrics = this.metrics.filter(metric => 
      new Date(metric.timestamp) > cutoffTime
    );
    
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffTime
    );
    
    const cleanedMetrics = initialMetricsCount - this.metrics.length;
    const cleanedLogs = initialLogsCount - this.logs.length;
    
    if (cleanedMetrics > 0 || cleanedLogs > 0) {
      console.log(`Cleaned up ${cleanedMetrics} old metrics and ${cleanedLogs} old logs`);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    const systemMetrics = this.getSystemMetrics();
    const memoryPercent = (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100;
    
    let status = 'healthy';
    const issues = [];
    
    if (memoryPercent > 90) {
      status = 'unhealthy';
      issues.push('High memory usage');
    } else if (memoryPercent > 75) {
      status = 'warning';
      issues.push('Elevated memory usage');
    }
    
    if (this.metrics.length >= this.maxMetricsBuffer * 0.9) {
      issues.push('Metrics buffer nearly full');
    }
    
    if (this.logs.length >= this.maxLogsBuffer * 0.9) {
      issues.push('Logs buffer nearly full');
    }
    
    return {
      status,
      details: {
        systemMetrics,
        bufferStatus: {
          metricsCount: this.metrics.length,
          logsCount: this.logs.length,
          maxMetrics: this.maxMetricsBuffer,
          maxLogs: this.maxLogsBuffer
        },
        issues
      }
    };
  }
}

module.exports = MonitoringService;