import { Feedback, Document, Section, Analytics } from "@/types/types";

const API_BASE = "/api";

export const apiService = {
  async fetchFeedback(
    params: Record<string, any> = {}
  ): Promise<{ data: Feedback[]; total: number }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE}/feedback?${queryParams}`);
    if (!response.ok) throw new Error("Failed to fetch feedback");
    return response.json();
  },

  async fetchDocuments(): Promise<Document[]> {
    const response = await fetch(`${API_BASE}/documents`);
    if (!response.ok) throw new Error("Failed to fetch documents");
    return response.json();
  },

  async fetchSections(documentId: string): Promise<Section[]> {
    const response = await fetch(
      `${API_BASE}/sections?document=${encodeURIComponent(documentId)}`
    );
    if (!response.ok) throw new Error("Failed to fetch sections");
    return response.json();
  },

  async updateFeedback(
    id: string,
    updates: Partial<Feedback>
  ): Promise<Feedback> {
    const response = await fetch(`${API_BASE}/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update feedback");
    return response.json();
  },

  async getAnalytics(params: Record<string, any> = {}): Promise<Analytics> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE}/analytics?${queryParams}`);
    if (!response.ok) throw new Error("Failed to fetch analytics");
    return response.json();
  },
};
