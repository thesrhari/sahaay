"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";

// UI Components from ShadCN/UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

// Icons from lucide-react
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  BarChart3,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";

// Charting Library
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Custom Components and Services
import { apiService } from "@/services/api";
import {
  Feedback,
  Document,
  Section,
  Analytics,
  SentimentData,
  KeywordData,
} from "@/types/types";
import WordCloud from "@/components/WordCloud";
import EditDialog from "@/components/EditDialog";

// Helper component for expandable text
const ExpandableText: React.FC<{ text: string; maxLength?: number }> = ({
  text,
  maxLength = 100, // Default to 100 characters
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Return plain text if it's not long enough to be truncated
  if (text.length <= maxLength) {
    return <p className="text-sm">{text}</p>;
  }

  // Render expandable text with a "Read More/Less" button
  return (
    <div>
      <p className="text-sm">
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </p>
      <Button
        variant="link"
        size="sm"
        className="px-0 h-auto text-xs" // Styling for a subtle link-like button
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "Read Less" : "Read More"}
      </Button>
    </div>
  );
};

// Main Dashboard Component
const SahaayDashboard: React.FC = () => {
  // Core Data State
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // UI/UX State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedDocument, setSelectedDocument] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog State
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Data Fetching Logic
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Documents are fetched once to populate the filter
      const documentsData = await apiService.fetchDocuments();
      setDocuments(documentsData);

      const currentDoc =
        selectedDocument ||
        (documentsData.length > 0 ? documentsData[0].id : "");
      if (!selectedDocument && currentDoc) {
        setSelectedDocument(currentDoc);
      }

      const filters = {
        document: currentDoc,
        section: selectedSection,
        sentiment:
          selectedSentiment === "ALL" ? "" : selectedSentiment.toLowerCase(),
        page: currentPage,
        limit: pageSize,
      };

      const [feedbackResponse, analyticsData] = await Promise.all([
        apiService.fetchFeedback(filters),
        apiService.getAnalytics(filters),
      ]);

      setFeedback(feedbackResponse.data || []);
      setTotalCount(feedbackResponse.total || 0);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedDocument,
    selectedSection,
    selectedSentiment,
    currentPage,
    pageSize,
  ]);

  const fetchSectionsForDocument = useCallback(async (documentId: string) => {
    if (!documentId) {
      setSections([]);
      return;
    }
    try {
      const sectionsData = await apiService.fetchSections(documentId);
      setSections(sectionsData);
    } catch (err) {
      console.error("Error fetching sections:", err);
      setSections([]); // Reset on error
    }
  }, []);

  // Effects to trigger data fetching
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedDocument) {
      fetchSectionsForDocument(selectedDocument);
      setSelectedSection(""); // Reset section filter when document changes
    }
  }, [selectedDocument, fetchSectionsForDocument]);

  // Event Handlers
  const handleDocumentChange = (documentId: string) => {
    setSelectedDocument(documentId);
    setCurrentPage(1);
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setCurrentPage(1);
  };

  const handleSentimentFilter = (sentiment: string) => {
    setSelectedSentiment(sentiment);
    setCurrentPage(1);
  };

  const handleEditFeedback = (feedbackItem: Feedback) => {
    setEditingFeedback(feedbackItem);
    setIsEditDialogOpen(true);
  };

  const handleSaveFeedback = async (id: string, updates: Partial<Feedback>) => {
    await apiService.updateFeedback(id, updates);
    // Refresh all data to ensure consistency across analytics and the feedback list
    fetchData();
  };

  // Memoized values for chart data transformation
  const totalPages = Math.ceil(totalCount / pageSize);

  const sentimentChartData = useMemo<SentimentData[]>(() => {
    if (!analytics) return [];
    return [
      {
        name: "Positive",
        value: analytics.positive || 0,
        color: "var(--sentiment-positive)",
      },
      {
        name: "Negative",
        value: analytics.negative || 0,
        color: "var(--sentiment-negative)",
      },
      {
        name: "Neutral",
        value: analytics.neutral || 0,
        color: "var(--sentiment-neutral)",
      },
    ].filter((item) => item.value > 0);
  }, [analytics]);

  const keywordChartData = useMemo<KeywordData[]>(() => {
    if (!analytics?.keywords) return [];
    return Object.entries(analytics.keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
  }, [analytics]);

  const allKeywordsForCloud = useMemo(() => {
    return feedback.flatMap((item) => item.keywords || []);
  }, [feedback]);

  // Conditional Rendering for Loading and Error States
  if (isLoading && feedback.length === 0) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center text-neutral">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[color:var(--primary)]" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[color:var(--danger)]" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
              <p className="text-neutral mb-4">{error}</p>
              <Button onClick={fetchData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Dashboard JSX
  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[color:var(--primary)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MCA</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">SAHAAY</h1>
                <p className="text-sm text-neutral">
                  Public Consultation Analysis
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral">
                Ministry of Corporate Affairs
              </p>
              <p className="text-xs text-neutral/80">Government of India</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Document
                </Label>
                <Select
                  value={selectedDocument}
                  onValueChange={handleDocumentChange}
                >
                  <SelectTrigger className="w-full [&>span]:truncate">
                    <SelectValue placeholder="Select document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <span className="truncate">{doc.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Section
                </Label>
                <Select
                  value={selectedSection}
                  onValueChange={handleSectionChange}
                  disabled={!selectedDocument || sections.length === 0}
                >
                  <SelectTrigger className="w-full [&>span]:truncate">
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        <span className="truncate">{sec.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Sentiment
                </Label>
                <div className="flex gap-2">
                  {["ALL", "POSITIVE", "NEGATIVE", "NEUTRAL"].map((s) => (
                    <Button
                      key={s}
                      variant={selectedSentiment === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSentimentFilter(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics & Charts */}
        {analytics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral">Total Comments</p>
                      <p className="text-2xl font-bold">
                        {analytics.total || 0}
                      </p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-[color:var(--primary)]" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral">Overall Sentiment</p>
                      <p className="text-2xl font-bold">
                        {analytics.overallSentiment || "Mixed"}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-[color:var(--accent)]" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral">Positive</p>
                      <p className="text-2xl font-bold text-[color:var(--accent)]">
                        {analytics.positive || 0}{" "}
                        <span className="text-sm">
                          (
                          {analytics.total > 0
                            ? Math.round(
                                (analytics.positive / analytics.total) * 100
                              )
                            : 0}
                          %)
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral">Negative</p>
                      <p className="text-2xl font-bold text-[color:var(--danger)]">
                        {analytics.negative || 0}{" "}
                        <span className="text-sm">
                          (
                          {analytics.total > 0
                            ? Math.round(
                                (analytics.negative / analytics.total) * 100
                              )
                            : 0}
                          %)
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {sentimentChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentimentChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            // By typing the props parameter as 'any', we bypass the incorrect type definition.
                            // This allows us to destructure 'name' and 'percent', which are present at runtime.
                            label={({ name, percent }: any) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {sentimentChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-neutral">
                        <BarChart3 className="w-8 h-8 mr-2" />
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Cloud</CardTitle>
                </CardHeader>
                <CardContent>
                  <WordCloud keywords={allKeywordsForCloud} />
                </CardContent>
              </Card>
            </div>

            {keywordChartData.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Top Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={keywordChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="keyword" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--primary)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Feedback Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Freedback</span>
              <div className="flex items-center gap-2 text-sm font-normal text-neutral">
                <Users className="w-4 h-4" />
                {totalCount} total comments
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
              <div className="text-center py-12 text-neutral">
                <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-black mb-2">
                  No Comments Found
                </h3>
                <p>Try adjusting your filters to see more results.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">
                          Comment ID
                        </th>
                        <th className="text-left py-3 px-2 font-medium">
                          Comment Text
                        </th>
                        <th className="text-left py-3 px-2 font-medium">
                          AI Summary
                        </th>
                        <th className="text-left py-3 px-2 font-medium">
                          Sentiment
                        </th>
                        <th className="text-left py-3 px-2 font-medium">
                          Clause
                        </th>
                        <th className="text-left py-3 px-2 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedback.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b hover:bg-gray-50/50"
                        >
                          <td className="py-4 px-2 font-medium text-[color:var(--primary)]">
                            {item.id}
                          </td>
                          <td className="py-4 px-2 max-w-xs">
                            <ExpandableText text={item.feedback} />
                          </td>
                          <td className="py-4 px-2 max-w-xs">
                            <ExpandableText text={item.summary} />
                          </td>
                          <td className="py-4 px-2">
                            <Badge
                              variant={
                                item.sentiment === "positive"
                                  ? "default"
                                  : item.sentiment === "negative"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {item.sentiment}
                            </Badge>
                          </td>
                          <td className="py-4 px-2 text-sm">
                            <p className="font-medium">{item.section}</p>
                            <p className="text-neutral text-xs">
                              {item.document}
                            </p>
                          </td>
                          <td className="py-4 px-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditFeedback(item)}
                            >
                              <Edit3 className="w-4 h-4 mr-1" /> Correct
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral">Rows:</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(v) => setPageSize(Number(v))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 25, 50].map((p) => (
                          <SelectItem key={p} value={p.toString()}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral">
                      {Math.min((currentPage - 1) * pageSize + 1, totalCount)}-
                      {Math.min(currentPage * pageSize, totalCount)} of{" "}
                      {totalCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <EditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        feedback={editingFeedback}
        onSave={handleSaveFeedback}
      />
    </div>
  );
};

export default SahaayDashboard;
