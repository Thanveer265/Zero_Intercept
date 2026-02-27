import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 15000,
});

api.interceptors.response.use(
    response => response.data,
    error => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

// Dashboard
export const getDashboardSummary = () => api.get('/dashboard/summary');

// Workload
export const getDeptWorkload = () => api.get('/workload/department');
export const getStaffWorkload = () => api.get('/workload/staff');
export const getHourlyHeatmap = () => api.get('/workload/hourly-heatmap');
export const getWeeklyTrend = () => api.get('/workload/weekly-trend');

// SLA
export const getResolutionTrend = () => api.get('/sla/resolution-trend');
export const getDelayedPercentage = () => api.get('/sla/delayed-percentage');
export const getViolationRisk = () => api.get('/sla/violation-risk');
export const getDeptEfficiency = () => api.get('/sla/department-efficiency');

// Predictive
export const getWorkloadForecast = () => api.get('/predictive/forecast');
export const getBurnoutPrediction = () => api.get('/predictive/burnout');
export const getSurgeDetection = () => api.get('/predictive/surge');

// Root Cause
export const getRootCause = () => api.get('/root-cause/analysis');

// Digital Twin
export const getDigitalTwinState = () => api.get('/digital-twin/state');

// Simulation
export const runSimulation = (params) => api.post('/simulation/run', params);

// Optimization
export const getOptimization = () => api.get('/optimization/recommend');

// Sentiment
export const getSentiment = () => api.get('/sentiment/analysis');

// Alerts
export const getAlerts = () => api.get('/alerts/active');

// Strategic
export const simulateScenario = (params) => api.post('/strategic/simulate', params);

// Financial
export const getFinancialImpact = () => api.get('/financial/impact');

// Assistant
export const queryAssistant = (query) => api.post('/assistant/query', { query });

// Reports
export const getReport = () => api.get('/reports/generate');

export default api;
