// src/backend/services/registry/ServiceRegistry.js
// Service dependency injection and registry for enhanced service communication

const EventEmitter = require('events');

/**
 * Service Registry for dependency injection and service discovery
 * Manages service lifecycle and enables cross-service communication
 */
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.eventEmitter = new EventEmitter();
    this.monitoring = null;
    this.isInitialized = false;
  }

  /**
   * Register a service in the registry
   */
  register(name, serviceClass, dependencies = []) {
    try {
      // Check if dependencies are available
      const missingDeps = dependencies.filter(dep => !this.services.has(dep));
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies for ${name}: ${missingDeps.join(', ')}`);
      }

      // Create service instance with dependencies
      let serviceInstance;
      if (typeof serviceClass === 'function') {
        // Instantiate service class
        serviceInstance = new serviceClass(this, this.eventEmitter, this.monitoring);
      } else {
        // Use existing service instance
        serviceInstance = serviceClass;
      }

      this.services.set(name, {
        instance: serviceInstance,
        dependencies,
        registeredAt: new Date().toISOString()
      });

      console.log(`Service registered: ${name}`);
      this.eventEmitter.emit('service.registered', { name, dependencies });
      
      return serviceInstance;
    } catch (error) {
      console.error(`Failed to register service ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get a service from the registry
   */
  get(name) {
    const serviceEntry = this.services.get(name);
    if (!serviceEntry) {
      throw new Error(`Service ${name} not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
    }
    return serviceEntry.instance;
  }

  /**
   * Check if a service is registered
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Unregister a service
   */
  unregister(name) {
    if (this.services.has(name)) {
      const serviceEntry = this.services.get(name);
      
      // Check for dependent services
      const dependentServices = Array.from(this.services.entries())
        .filter(([, entry]) => entry.dependencies.includes(name))
        .map(([serviceName]) => serviceName);
      
      if (dependentServices.length > 0) {
        console.warn(`Warning: Unregistering ${name} which has dependent services: ${dependentServices.join(', ')}`);
      }
      
      this.services.delete(name);
      this.eventEmitter.emit('service.unregistered', { name });
      console.log(`Service unregistered: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Get all registered services
   */
  getAll() {
    const services = {};
    for (const [name, entry] of this.services) {
      services[name] = {
        name,
        dependencies: entry.dependencies,
        registeredAt: entry.registeredAt
      };
    }
    return services;
  }

  /**
   * Set monitoring service
   */
  setMonitoring(monitoring) {
    this.monitoring = monitoring;
    // Update existing services with monitoring
    for (const [name, entry] of this.services) {
      if (entry.instance.monitoring !== undefined) {
        entry.instance.monitoring = monitoring;
      }
    }
  }

  /**
   * Initialize all services in dependency order
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('Service registry already initialized');
      return;
    }

    console.log('Initializing service registry...');
    
    try {
      // Sort services by dependency order
      const sortedServices = this.topologicalSort();
      
      // Initialize services in order
      for (const serviceName of sortedServices) {
        const serviceEntry = this.services.get(serviceName);
        if (serviceEntry.instance.initialize && typeof serviceEntry.instance.initialize === 'function') {
          await serviceEntry.instance.initialize();
          console.log(`Initialized service: ${serviceName}`);
        }
      }
      
      this.isInitialized = true;
      this.eventEmitter.emit('registry.initialized');
      console.log('Service registry initialization complete');
      
    } catch (error) {
      console.error('Failed to initialize service registry:', error);
      throw error;
    }
  }

  /**
   * Shutdown all services
   */
  async shutdown() {
    console.log('Shutting down service registry...');
    
    // Shutdown services in reverse dependency order
    const sortedServices = this.topologicalSort().reverse();
    
    for (const serviceName of sortedServices) {
      try {
        const serviceEntry = this.services.get(serviceName);
        if (serviceEntry.instance.shutdown && typeof serviceEntry.instance.shutdown === 'function') {
          await serviceEntry.instance.shutdown();
          console.log(`Shutdown service: ${serviceName}`);
        }
      } catch (error) {
        console.error(`Error shutting down service ${serviceName}:`, error);
      }
    }
    
    this.services.clear();
    this.isInitialized = false;
    this.eventEmitter.emit('registry.shutdown');
    console.log('Service registry shutdown complete');
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const healthStatus = {
      healthy: 0,
      unhealthy: 0,
      total: this.services.size,
      services: {}
    };
    
    for (const [name, entry] of this.services) {
      try {
        let status = 'healthy';
        let details = {};
        
        // Check if service has health check method
        if (entry.instance.healthCheck && typeof entry.instance.healthCheck === 'function') {
          const healthResult = await entry.instance.healthCheck();
          status = healthResult.status || 'healthy';
          details = healthResult.details || {};
        }
        
        healthStatus.services[name] = {
          status,
          details,
          dependencies: entry.dependencies,
          registeredAt: entry.registeredAt
        };
        
        if (status === 'healthy') {
          healthStatus.healthy++;
        } else {
          healthStatus.unhealthy++;
        }
        
      } catch (error) {
        healthStatus.services[name] = {
          status: 'unhealthy',
          error: error.message,
          dependencies: entry.dependencies,
          registeredAt: entry.registeredAt
        };
        healthStatus.unhealthy++;
      }
    }
    
    return healthStatus;
  }

  /**
   * Topological sort for dependency resolution
   */
  topologicalSort() {
    const visited = new Set();
    const temp = new Set();
    const result = [];
    
    const visit = (serviceName) => {
      if (temp.has(serviceName)) {
        throw new Error(`Circular dependency detected involving service: ${serviceName}`);
      }
      
      if (!visited.has(serviceName)) {
        temp.add(serviceName);
        
        const serviceEntry = this.services.get(serviceName);
        if (serviceEntry) {
          for (const dependency of serviceEntry.dependencies) {
            if (this.services.has(dependency)) {
              visit(dependency);
            }
          }
        }
        
        temp.delete(serviceName);
        visited.add(serviceName);
        result.push(serviceName);
      }
    };
    
    for (const serviceName of this.services.keys()) {
      if (!visited.has(serviceName)) {
        visit(serviceName);
      }
    }
    
    return result;
  }

  /**
   * Subscribe to service registry events
   */
  on(event, callback) {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    this.eventEmitter.off(event, callback);
  }
}

module.exports = ServiceRegistry;