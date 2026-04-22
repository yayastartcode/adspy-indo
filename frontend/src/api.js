import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Keywords
export const getKeywords = () => api.get('/keywords').then(r => r.data);
export const addKeyword = (data) => api.post('/keywords', data).then(r => r.data);
export const updateKeyword = (id, data) => api.put(`/keywords/${id}`, data).then(r => r.data);
export const deleteKeyword = (id) => api.delete(`/keywords/${id}`).then(r => r.data);

// Scraping
export const startScrape = (keyword) => api.post(`/scrape/${keyword}`).then(r => r.data);
export const getScrapeStatus = (keyword) => api.get(`/scrape/${keyword}/status`).then(r => r.data);
export const stopScrape = (keyword) => api.post(`/scrape/${keyword}/stop`).then(r => r.data);

// Results
export const getResults = (keyword, params = {}) => api.get(`/results/${keyword}`, { params }).then(r => r.data);
export const getAdvertiserDetail = (keyword, advertiser) => api.get(`/results/${keyword}/detail/${encodeURIComponent(advertiser)}`).then(r => r.data);

// Overview
export const getOverview = () => api.get('/overview').then(r => r.data);
