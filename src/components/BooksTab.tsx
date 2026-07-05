/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Sparkles, Filter, Plus, Edit, Trash2, ArrowRight, BookMarked, X, Loader2 } from 'lucide-react';
import { Book, User } from '../types';

interface BooksTabProps {
  user: User;
  token: string;
  addToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  onBorrowSuccess: () => void;
}

export default function BooksTab({ user, token, addToast, onBorrowSuccess }: BooksTabProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);

  // Book detail modal state
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Admin CRUD states
  const [crudModal, setCrudModal] = useState<'create' | 'edit' | null>(null);
  const [crudBookId, setCrudBookId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formGenre, setFormGenre] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formISBN, setFormISBN] = useState('');
  const [formCopies, setFormCopies] = useState(1);
  const [submittingCrud, setSubmittingCrud] = useState(false);

  const genres = ['All', 'Classics', 'Science Fiction', 'Fantasy', 'Mystery', 'Technology', 'Science', 'History', 'Philosophy', 'Biography', 'Fiction'];

  const fetchBooks = async (query = '', genre = 'All') => {
    setLoading(true);
    try {
      let url = `/api/books?search=${encodeURIComponent(query)}`;
      if (genre !== 'All') {
        url += `&genre=${encodeURIComponent(genre)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setBooks(data);
      }
    } catch (err) {
      addToast("Failed to retrieve books catalog.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!aiSearchMode) {
      fetchBooks(search, genreFilter);
    }
  }, [search, genreFilter, aiSearchMode]);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchQuery.trim()) return;

    setAiSearching(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: aiSearchQuery })
      });
      const data = await response.json();
      if (response.ok) {
        setBooks(data);
        addToast(`Smart Agent matched ${data.length} books in our library context!`, "success");
      } else {
        addToast(data.error || "AI Search failed.", "error");
      }
    } catch (err) {
      addToast("Failed to perform AI-assisted search.", "error");
    } finally {
      setAiSearching(false);
    }
  };

  const handleBorrow = async (bookId: string) => {
    try {
      const response = await fetch('/api/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to borrow book.");
      }

      addToast(`Successfully checked out: "${data.bookTitle}"! Enjoy your read.`, "success");
      onBorrowSuccess();
      setSelectedBook(null); // Close detail drawer
      fetchBooks(search, genreFilter); // Refresh list
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

  const triggerSummary = async (bookId: string) => {
    setLoadingSummary(true);
    setAiSummary('');
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });
      const data = await response.json();
      if (response.ok) {
        setAiSummary(data.summary);
      } else {
        addToast(data.error || "Failed to get AI summary.", "error");
      }
    } catch (err) {
      addToast("An error occurred while generating summary.", "error");
    } finally {
      setLoadingSummary(false);
    }
  };

  const openCrudModal = (mode: 'create' | 'edit', book?: Book) => {
    setCrudModal(mode);
    if (mode === 'edit' && book) {
      setCrudBookId(book.id);
      setFormTitle(book.title);
      setFormAuthor(book.author);
      setFormGenre(book.genre);
      setFormDesc(book.description);
      setFormYear(book.publicationYear);
      setFormISBN(book.ISBN);
      setFormCopies(book.totalCopies);
    } else {
      setCrudBookId(null);
      setFormTitle('');
      setFormAuthor('');
      setFormGenre('Fiction');
      setFormDesc('');
      setFormYear(new Date().getFullYear());
      setFormISBN('');
      setFormCopies(1);
    }
  };

  const handleCrudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCrud(true);
    try {
      const endpoint = crudModal === 'create' ? '/api/books' : `/api/books/${crudBookId}`;
      const method = crudModal === 'create' ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          author: formAuthor,
          genre: formGenre,
          description: formDesc,
          publicationYear: formYear,
          ISBN: formISBN,
          totalCopies: formCopies
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Operation failed.");
      }

      addToast(
        crudModal === 'create' ? `Added "${data.title}" successfully!` : `Updated "${data.title}" successfully!`,
        "success"
      );
      setCrudModal(null);
      fetchBooks(search, genreFilter);
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setSubmittingCrud(false);
    }
  };

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`Are you absolutely sure you want to delete "${title}" from the catalog? This is irreversible.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Successfully deleted "${title}" from catalog.`, "success");
        fetchBooks(search, genreFilter);
      } else {
        addToast(data.error || "Failed to delete book.", "error");
      }
    } catch (err) {
      addToast("Failed to delete book from database.", "error");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Panel */}
      <div className="p-8 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800">Library Book Catalog</h2>
          <p className="text-sm text-slate-500 font-sans mt-0.5">Explore literary titles, trigger AI analysis summaries, or borrow books</p>
        </div>

        <div className="flex gap-2">
          {user.role === 'admin' && (
            <button
              onClick={() => openCrudModal('create')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catalog Book</span>
            </button>
          )}

          {/* Smart Search Toggle */}
          <button
            onClick={() => {
              setAiSearchMode(!aiSearchMode);
              setAiSearchQuery('');
              setSearch('');
              fetchBooks();
            }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all cursor-pointer ${
              aiSearchMode 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>{aiSearchMode ? "Fuzzy Catalog" : "AI Smart Search"}</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="p-6 bg-slate-50/50 border-b border-slate-200 shrink-0">
        {aiSearchMode ? (
          <form onSubmit={handleAiSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-emerald-500" />
              <input
                type="text"
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                placeholder="Type complex conceptual search (e.g. 'thought provoking books about black holes or space journey')"
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800"
                required
              />
            </div>
            <button
              type="submit"
              disabled={aiSearching}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:bg-slate-300"
            >
              {aiSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Query AI</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by book title, author, description, or ISBN..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-slate-800"
              />
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl shrink-0">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="text-sm bg-transparent outline-none pr-6 text-slate-700 font-medium cursor-pointer"
              >
                {genres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Book Grid */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
            <p className="text-sm text-slate-500 font-medium font-sans">Accessing catalog index...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center p-6 bg-white border border-slate-200/60 rounded-2xl">
            <BookMarked className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-display font-semibold text-slate-700">No books found matching criteria</p>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              {aiSearchMode 
                ? "Try a different natural language conceptual phrase."
                : "Check spelling, try other keywords, or clear filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => {
              const bgBadge = book.availableCopies > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200';
              return (
                <div 
                  key={book.id} 
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-6 flex flex-col cursor-pointer hover:-translate-y-0.5 group"
                  onClick={() => { setSelectedBook(book); setAiSummary(''); }}
                >
                  {/* Genre Tag */}
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">{book.genre}</span>
                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${bgBadge}`}>
                      {book.availableCopies > 0 ? `${book.availableCopies} left` : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Title & Author */}
                  <div className="flex-1 mb-4">
                    <h3 className="font-display font-semibold text-slate-950 text-lg tracking-tight group-hover:text-emerald-600 transition-colors line-clamp-1">{book.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 font-sans">by {book.author}</p>
                    <p className="text-xs text-slate-400 mt-3 line-clamp-3 leading-relaxed font-sans">{book.description}</p>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-auto shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-[10px] font-mono text-slate-400">ISBN: {book.ISBN}</span>
                    <div className="flex gap-2">
                      {user.role === 'admin' && (
                        <>
                          <button
                            onClick={() => openCrudModal('edit', book)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            title="Edit details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id, book.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                            title="Delete book"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => { setSelectedBook(book); setAiSummary(''); }}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book details Drawer Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/35 backdrop-blur-xs animate-fade-in" onClick={() => setSelectedBook(null)}>
          <div 
            className="w-full max-w-xl bg-white h-screen shadow-2xl flex flex-col p-8 overflow-y-auto animate-slide-up" 
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-5 shrink-0">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">{selectedBook.genre}</span>
                <h3 className="font-display font-bold text-2xl text-slate-900 mt-1">{selectedBook.title}</h3>
                <p className="text-sm text-slate-500 font-sans mt-0.5">by {selectedBook.author}</p>
              </div>
              <button 
                onClick={() => setSelectedBook(null)}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Book Info Metadata */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl mb-6 text-sm shrink-0 font-sans">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Publication Year</p>
                <p className="text-slate-800 font-semibold mt-0.5">{selectedBook.publicationYear < 0 ? `${Math.abs(selectedBook.publicationYear)} BC` : selectedBook.publicationYear}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Book ISBN Code</p>
                <p className="text-slate-800 font-semibold font-mono mt-0.5">{selectedBook.ISBN}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Current Stock</p>
                <p className="text-slate-800 font-semibold mt-0.5">{selectedBook.availableCopies} of {selectedBook.totalCopies} copies available</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Physical Status</p>
                <p className={`font-semibold mt-0.5 ${selectedBook.availableCopies > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {selectedBook.availableCopies > 0 ? 'Ready to Borrow' : 'All Borrowed'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8 shrink-0">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Librarian Description</h4>
              <p className="text-sm text-slate-600 leading-relaxed font-sans">{selectedBook.description}</p>
            </div>

            {/* Dynamic AI summary engine */}
            <div className="border-t border-slate-200 pt-6 mb-8 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <h4 className="font-display font-semibold text-slate-850">AI Summary & Literary Analysis</h4>
                </div>
                {!aiSummary && !loadingSummary && (
                  <button
                    onClick={() => triggerSummary(selectedBook.id)}
                    className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Generate Analysis
                  </button>
                )}
              </div>

              {loadingSummary ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-100 gap-3">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  <span className="text-xs text-slate-500 font-medium font-sans">Intelligently summarizing the narrative...</span>
                </div>
              ) : aiSummary ? (
                <div className="p-5 bg-emerald-50/40 border border-emerald-100 rounded-2xl text-slate-700 text-sm overflow-auto max-h-80 select-text">
                  <div className="markdown-body font-sans text-slate-600">
                    {/* Render basic custom paragraphs/bold, fallback if needed. The backend outputs clean Markdown. */}
                    {aiSummary.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h3 key={idx} className="font-display font-bold text-slate-800 mt-4 mb-2 text-md">{line.replace('### ', '')}</h3>;
                      } else if (line.startsWith('## ')) {
                        return <h2 key={idx} className="font-display font-bold text-slate-800 mt-4 mb-2 text-lg">{line.replace('## ', '')}</h2>;
                      } else if (line.startsWith('- ') || line.startsWith('* ')) {
                        return <li key={idx} className="ml-4 list-disc mb-1">{line.substring(2)}</li>;
                      } else if (line.trim() === "") {
                        return <div key={idx} className="h-2" />;
                      } else {
                        return <p key={idx} className="mb-2 leading-relaxed">{line}</p>;
                      }
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-400 font-sans">Request an AI generated deep overview detailing major themes, plot points, and key literary takeaways.</p>
                </div>
              )}
            </div>

            {/* Check out actions */}
            <div className="mt-auto shrink-0 pt-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSelectedBook(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                Close View
              </button>
              <button
                disabled={selectedBook.availableCopies <= 0}
                onClick={() => handleBorrow(selectedBook.id)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer text-center"
              >
                {selectedBook.availableCopies > 0 ? "Check Out Book" : "Out of Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Add/Edit Book Modal */}
      {crudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in" onClick={() => setCrudModal(null)}>
          <div className="bg-white max-w-lg w-full rounded-2xl border border-slate-100 shadow-2xl p-8 overflow-y-auto max-h-[90vh] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
              <h3 className="font-display font-bold text-xl text-slate-900">
                {crudModal === 'create' ? 'Add New Catalog Volume' : 'Modify Book Details'}
              </h3>
              <button 
                onClick={() => setCrudModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrudSubmit} className="space-y-4 text-sm font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Book Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800"
                    placeholder="Enter full title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Author Name</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={e => setFormAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800"
                    placeholder="e.g. Stephen King"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Genre</label>
                  <select
                    value={formGenre}
                    onChange={e => setFormGenre(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800 cursor-pointer"
                  >
                    {genres.filter(g => g !== 'All').map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ISBN Code</label>
                  <input
                    type="text"
                    value={formISBN}
                    onChange={e => setFormISBN(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800 font-mono"
                    placeholder="e.g. 9780553293357"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Publication Year</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={e => setFormYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Library Copies</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formCopies}
                    onChange={e => setFormCopies(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Librarian Synopsis</label>
                  <textarea
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800"
                    placeholder="Enter short storyline summary..."
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCrudModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCrud}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors disabled:bg-slate-300 flex items-center justify-center gap-2"
                >
                  {submittingCrud && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{crudModal === 'create' ? 'Insert Book' : 'Update Book'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
