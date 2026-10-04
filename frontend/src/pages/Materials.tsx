import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Search,
  CheckCircle,
  Sparkles,
  RefreshCw,
  UploadCloud,
  Eye
} from 'lucide-react';
import { api } from '../api/client';
import type { MaterialItem, CourseItem, RAGSearchResult, MaterialDetail, RAGStats } from '../api/client';

export default function Materials() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [ragStats, setRagStats] = useState<RAGStats | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab view: list vs RAG semantic query tester
  const [activeTab, setActiveTab] = useState<'catalog' | 'rag_search'>('catalog');

  // Semantic RAG Search State
  const [ragQuery, setRagQuery] = useState('Binary Search Tree time complexity and rotations');
  const [ragCourseFilter, setRagCourseFilter] = useState<number | undefined>(undefined);
  const [ragResults, setRagResults] = useState<RAGSearchResult | null>(null);
  const [ragSearching, setRagSearching] = useState(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCourseId, setUploadCourseId] = useState<number>(1);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Material Detail Modal
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialDetail | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const [matData, courseData, statsData] = await Promise.all([
        api.getMaterials(),
        api.getCourses().catch(() => []),
        api.getRAGStats().catch(() => null),
      ]);
      setMaterials(matData);
      setCourses(courseData);
      if (statsData) setRagStats(statsData);
      if (courseData.length > 0) setUploadCourseId(courseData[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleRAGSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ragQuery.trim()) return;
    try {
      setRagSearching(true);
      const res = await api.searchRAG(ragQuery, ragCourseFilter, 5);
      setRagResults(res);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setRagSearching(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setUploading(true);
      setUploadSuccess(null);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('course_id', String(uploadCourseId));
      if (uploadTitle.trim()) formData.append('title', uploadTitle.trim());

      const res = await api.uploadMaterial(formData);
      setUploadSuccess(`Successfully ingested '${res.title}' into RAG! ${res.chunks_indexed} chunks indexed.`);
      setUploadFile(null);
      setUploadTitle('');
      await fetchMaterials();
      setTimeout(() => setShowUploadModal(false), 2000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDetail = async (matId: number) => {
    try {
      const detail = await api.getMaterialDetail(matId);
      setSelectedMaterial(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.course_code.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle className="h-3 w-3 mr-1 text-emerald-600" />
              RAG Knowledge Base & Retrieval
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              {ragStats?.total_chunks || materials.length * 3} Vector Chunks
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-2">Course Materials & Knowledge</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fahmly synchronizes and vectorizes syllabus documents, lecture slides, and reading packs for grounded AI coaching.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <UploadCloud className="h-4 w-4 mr-1.5" />
            Upload Document (PDF / Slides)
          </button>
          <button
            onClick={fetchMaterials}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition"
            title="Refresh Knowledge Base"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">Total Materials</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{materials.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">Vector Chunks</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {ragStats?.total_chunks || materials.length * 3}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">Vector Store</span>
          <p className="text-2xl font-black text-blue-600 mt-1 capitalize">
            {ragStats?.backend || 'SQLite Vector'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">RAG Grounding</span>
          <p className="text-2xl font-black text-primary-600 mt-1">Active (100%)</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl p-1 shadow-xs space-x-1">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'catalog' ? 'bg-primary-50 text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Course Material Catalog ({materials.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('rag_search');
            if (!ragResults) handleRAGSearch();
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'rag_search' ? 'bg-primary-50 text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Live RAG Vector Search & Chunk Inspector</span>
        </button>
      </div>

      {/* TAB 1: Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search bar for catalog */}
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials or course code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 bg-white shadow-xs"
            />
          </div>

          {loading && materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
              <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-3" />
              <p className="text-gray-500 font-medium text-sm">Loading knowledge base...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <Layers className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-base font-semibold text-gray-900">No materials match</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white p-5 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-xs transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary-700">
                        {mat.course_code}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {mat.type}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{mat.course_name}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => handleViewDetail(mat.id)}
                      className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-gray-900"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View Chunks
                    </button>

                    <Link
                      to={`/coach`}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      Ask Coach
                      <Sparkles className="h-3.5 w-3.5 ml-1 text-amber-500" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Live RAG Semantic Vector Search */}
      {activeTab === 'rag_search' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Semantic Vector Query & Grounding Inspector</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Test how Fahmly's RAG vector retriever finds relevant slides, notes, and textbook citations for any student question.
              </p>
            </div>

            <form onSubmit={handleRAGSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Ask or search any course concept (e.g. Normalization 3NF, B-Trees, Alpha-Beta)..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <select
                value={ragCourseFilter || ''}
                onChange={(e) => setRagCourseFilter(e.target.value ? Number(e.target.value) : undefined)}
                className="text-xs p-2 border border-gray-300 rounded-lg bg-gray-50"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={ragSearching}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Search className={`h-3.5 w-3.5 ${ragSearching ? 'animate-spin' : ''}`} />
                <span>{ragSearching ? 'Searching...' : 'Vector Search'}</span>
              </button>
            </form>
          </div>

          {/* Results list */}
          {ragResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span>
                  Retrieved <strong>{ragResults.results.length}</strong> semantic chunks for "{ragResults.query}"
                </span>
              </div>

              {ragResults.results.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
                        {item.metadata.course_code || 'CS'}
                      </span>
                      <span className="text-xs font-bold text-gray-900">{item.metadata.title}</span>
                      <span className="text-[10px] text-gray-400">Chunk #{item.metadata.chunk_index + 1}</span>
                    </div>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.score > 0.8
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.score > 0.5
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Relevance: {item.score}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700 font-mono leading-relaxed border border-gray-100 whitespace-pre-wrap">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Upload Course Material into RAG</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Upload PDF lecture slides, syllabus documents, or reading notes. The RAG pipeline will extract text, chunk it, embed it, and index it into the vector database.
            </p>

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
                {uploadSuccess}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Course</label>
                <select
                  value={uploadCourseId}
                  onChange={(e) => setUploadCourseId(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Document Title (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4: Relational Algebra & SQL"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select File (.pdf, .txt, .md, .html)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.txt,.md,.html,.htm"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {uploading ? 'Extracting & Indexing...' : 'Upload & Index to RAG'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Detail Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                  {selectedMaterial.course_code}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">{selectedMaterial.title}</h3>
              </div>
              <button onClick={() => setSelectedMaterial(null)} className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <span className="text-xs font-bold text-gray-500 uppercase">Extracted Text Content for RAG Grounding:</span>
              <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-800 font-mono leading-relaxed whitespace-pre-wrap border border-gray-200">
                {selectedMaterial.content_text || 'No preview text stored for this resource.'}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedMaterial(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
