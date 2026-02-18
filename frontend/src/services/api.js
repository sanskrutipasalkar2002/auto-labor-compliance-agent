import axios from 'axios';

const API_BASE = 'https://auto-labor-compliance-agent-production.up.railway.app/api';

export const auditService = {
  initiateAudit: async (companyName) => {
    const response = await axios.post(`${API_BASE}/audit`, { company_name: companyName });
    return response.data;
  },

  fetchReports: async () => {
    const response = await axios.get(`${API_BASE}/reports`);
    return response.data;
  },

  fetchReportDetails: async (companyNames) => {
    const response = await axios.post(`${API_BASE}/compare`, { companies: companyNames });
    return response.data;
  },

  downloadReport: async (companyName) => {
    const response = await axios.get(`${API_BASE}/download_report`, {
      params: { company: companyName },
      responseType: 'blob',
    });
    return response.data;
  }
};