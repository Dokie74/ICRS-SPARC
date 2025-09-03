# HTS Browser Test Strategy

## Overview

This document outlines the comprehensive testing strategy for the HTS Browser feature in ICRS SPARC, a Foreign Trade Zone Operations Management System. The HTS Browser provides users with the ability to search, browse, and calculate duty rates for Harmonized Tariff Schedule codes.

## Testing Approach

### Test Pyramid Structure

```
    E2E Tests (Integration & Workflows)
         API Tests (Contract & Performance)
              Unit Tests (Components & Services)
```

### Coverage Strategy

- **Unit Tests**: 80% code coverage for individual components and services
- **API Tests**: 100% endpoint coverage with error scenarios
- **E2E Tests**: Complete user journey validation and critical path testing

## Test Categories

### 1. End-to-End Tests (`/tests/e2e/`)

#### Core Functionality Tests
- **File**: `hts-browser.spec.js`
- **Coverage**: Basic user interactions, search, navigation
- **Duration**: ~15 minutes
- **Priority**: Critical

**Test Scenarios**:
- Service initialization and loading states
- Search by HTS description and code
- Country selection and duty calculations
- Popular codes interaction
- Navigation between search and details views
- Responsive design validation

#### API Integration Tests
- **File**: `hts-browser-api.spec.js`
- **Coverage**: Backend API endpoints and data contracts
- **Duration**: ~20 minutes
- **Priority**: Critical

**Test Scenarios**:
- All HTS API endpoints (`/api/hts/*`)
- Authentication and authorization
- Rate limiting behavior
- Data validation and error responses
- Performance benchmarks

#### Integration Workflow Tests
- **File**: `hts-browser-integration.spec.js`
- **Coverage**: Complete user journeys and complex workflows
- **Duration**: ~25 minutes
- **Priority**: High

**Test Scenarios**:
- Full search-to-duty-calculation workflows
- State management across views
- Cache functionality validation
- Multi-user concurrent usage
- Country-specific duty comparisons

#### Error Scenario Tests
- **File**: `hts-browser-error-scenarios.spec.js`
- **Coverage**: Error handling, edge cases, and recovery
- **Duration**: ~20 minutes
- **Priority**: High

**Test Scenarios**:
- Network failure recovery
- API error handling (4xx, 5xx responses)
- Invalid data scenarios
- Service unavailable conditions
- Browser compatibility issues

### 2. Backend Unit Tests (`/tests/backend/`)

#### HTS Service Tests
- **File**: `services/hts-service.test.js`
- **Coverage**: Business logic, data processing, caching
- **Duration**: ~5 minutes
- **Priority**: Critical

#### API Route Tests
- **File**: `api/hts-routes.test.js`
- **Coverage**: Route handlers, middleware, validation
- **Duration**: ~10 minutes
- **Priority**: Critical

### 3. Frontend Unit Tests (`/tests/frontend/`)

#### Component Tests
- **File**: `components/HTSBrowser.test.js`
- **Coverage**: React component behavior, state management
- **Duration**: ~8 minutes
- **Priority**: High

#### Service Tests
- **File**: `services/htsService.test.js`
- **Coverage**: Frontend service layer, API communication
- **Duration**: ~5 minutes
- **Priority**: High

## Test Environment Setup

### Prerequisites

1. **Application Stack**
   - Frontend: React 18 on `http://localhost:3000`
   - Backend: Node.js/Express on `http://localhost:5000`
   - Database: PostgreSQL with test data

2. **Test Infrastructure**
   - Playwright for E2E testing
   - Jest for unit testing
   - Supertest for API testing
   - MSW for API mocking

3. **Test Data**
   - Sample HTS codes covering major categories
   - Country data with various trade agreements
   - User accounts with different roles

### Browser Support Matrix

| Browser | Desktop | Mobile | Priority |
|---------|---------|--------|-----------|
| Chrome | ✅ | ✅ | Critical |
| Firefox | ✅ | ❌ | High |
| Safari | ✅ | ✅ | Medium |
| Edge | ✅ | ❌ | Medium |

## Performance Testing

### Key Metrics

| Operation | Target | Threshold | Notes |
|-----------|---------|-----------|-------|
| Initial Load | < 5s | < 10s | First visit |
| Search Response | < 2s | < 5s | Typical query |
| Details Load | < 1s | < 3s | Single HTS code |
| Country Change | < 500ms | < 2s | Duty calculation |

### Load Testing Scenarios

- **Concurrent Users**: 50 simultaneous searches
- **Large Result Sets**: 1000+ HTS codes returned
- **Rapid Interactions**: 10 searches per second
- **Cache Performance**: Hit rate > 80%

## Data Validation Strategy

### Test Data Categories

1. **Valid HTS Codes**
   - Electronics: 8542310001 (Integrated circuits)
   - Textiles: 6205200020 (Cotton shirts)
   - Machinery: 8413709990 (Pumps)

2. **Country Scenarios**
   - China (CN): Section 301 tariffs
   - Mexico (MX): USMCA preferential rates
   - Germany (DE): MFN rates

3. **Edge Cases**
   - Invalid HTS codes
   - Special characters in search
   - Extremely long search terms
   - Empty or null responses

## Error Handling Validation

### Network Error Scenarios

- **Connection Failures**: Complete network down
- **Slow Networks**: 3G/4G simulation
- **Timeouts**: Request timeout after 30s
- **Intermittent Issues**: 30% failure rate

### API Error Scenarios

- **Authentication**: 401 Unauthorized
- **Authorization**: 403 Forbidden
- **Not Found**: 404 HTS code not found
- **Rate Limiting**: 429 Too many requests
- **Server Error**: 500 Internal server error
- **Service Down**: 503 Service unavailable

### Data Error Scenarios

- **Malformed JSON**: Invalid response format
- **Missing Fields**: Required data not present
- **Type Mismatches**: String instead of number
- **Null Values**: Unexpected null responses

## Accessibility Testing

### WCAG Compliance

- **Level AA Compliance**: Target standard
- **Keyboard Navigation**: All functions accessible
- **Screen Readers**: Compatible with NVDA, JAWS
- **Color Contrast**: 4.5:1 minimum ratio
- **Focus Management**: Clear focus indicators

### Assistive Technology Testing

- **Screen Readers**: Content properly announced
- **Keyboard Only**: Complete navigation support
- **Voice Control**: Compatible with Dragon
- **High Contrast**: Windows high contrast mode

## Security Testing

### Input Validation

- **XSS Prevention**: Script injection attempts
- **SQL Injection**: Database query manipulation
- **CSRF Protection**: Cross-site request forgery
- **Input Sanitization**: Special character handling

### Authentication & Authorization

- **Token Validation**: JWT token verification
- **Role-based Access**: Feature access by role
- **Session Management**: Proper session handling
- **Rate Limiting**: API abuse prevention

## Continuous Integration Strategy

### Test Execution Pipeline

1. **Commit Stage**
   - Unit tests (5 minutes)
   - Linting and code quality
   - Fast feedback loop

2. **Integration Stage**
   - API tests (10 minutes)
   - Database integration
   - Service contract validation

3. **E2E Stage**
   - Smoke tests (15 minutes)
   - Critical path validation
   - Cross-browser testing

4. **Performance Stage**
   - Load testing (20 minutes)
   - Performance regression
   - Resource utilization

### Test Automation Levels

- **Level 1**: Every commit (Unit + Smoke)
- **Level 2**: Pull requests (Full E2E)
- **Level 3**: Nightly (Performance + Security)
- **Level 4**: Release (Full regression)

## Risk Assessment

### High Risk Areas

1. **Duty Rate Calculations**
   - **Risk**: Incorrect rates leading to compliance issues
   - **Mitigation**: Comprehensive rate validation tests

2. **Search Performance**
   - **Risk**: Poor performance with large datasets
   - **Mitigation**: Performance benchmarks and monitoring

3. **Data Accuracy**
   - **Risk**: Outdated or incorrect HTS data
   - **Mitigation**: Data freshness validation

4. **Country-specific Rules**
   - **Risk**: Incorrect trade agreement applications
   - **Mitigation**: Country-specific test scenarios

### Medium Risk Areas

1. **User Interface Responsiveness**
2. **Cache Invalidation**
3. **Error Message Clarity**
4. **Mobile Device Compatibility**

## Test Maintenance Strategy

### Regular Maintenance Tasks

- **Monthly**: Update test data with latest HTS codes
- **Quarterly**: Review and update country trade agreements
- **Annually**: Full test suite review and optimization

### Test Data Management

- **Source**: USITC official HTS database
- **Updates**: Automated sync with official sources
- **Validation**: Cross-reference with CBP data
- **Backup**: Version-controlled test datasets

## Success Metrics

### Quality Metrics

- **Test Coverage**: ≥ 80% for critical paths
- **Defect Escape Rate**: < 2% to production
- **Test Pass Rate**: ≥ 95% on CI/CD pipeline
- **Performance Regression**: 0% degradation

### Efficiency Metrics

- **Test Execution Time**: ≤ 60 minutes full suite
- **Flaky Test Rate**: < 1% of test runs
- **Test Maintenance Overhead**: ≤ 20% of development time
- **Bug Detection Speed**: Within 24 hours

### User Experience Metrics

- **Page Load Performance**: 95th percentile < 5s
- **Search Response Time**: 95th percentile < 3s
- **Error Recovery Rate**: 100% from transient failures
- **Accessibility Compliance**: 100% WCAG AA

## Reporting and Documentation

### Test Reports

- **Daily**: Automated test execution status
- **Weekly**: Test coverage and quality metrics
- **Monthly**: Performance trend analysis
- **Release**: Comprehensive test summary

### Documentation Maintenance

- **Test Cases**: Living documentation in code
- **API Contracts**: OpenAPI specification validation
- **User Journeys**: Playwright trace recordings
- **Performance Baselines**: Continuous monitoring data

This test strategy ensures comprehensive validation of the HTS Browser functionality while maintaining efficient test execution and clear quality metrics.