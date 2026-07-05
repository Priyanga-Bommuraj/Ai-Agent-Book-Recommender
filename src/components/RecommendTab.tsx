/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Award, Heart, HelpCircle, Loader2 } from 'lucide-react';
import { RecommendedBook } from '../types';

interface RecommendTabProps {
  token: string;
  addToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  onBorrowSuccess: () => void;
}

export default function RecommendTab({ token, addToast, onBorrowSuccess }: RecommendTabProps) {
  const [genre, setGenre] = useState('');
  const [author, setAuthor] = useState('');
  const [interest, setInterest] = useState('');
  const [mood, setMood] = useState('Curious');
  const [readingLevel, setReadingLevel] = useState('Standard');
  const [loading, setLoading] = useState(false);
  
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [explanation, setExplanation] = useState<string>('');

  const genres = ['Classics', 'Science Fiction', 'Fantasy', 'Mystery', 'Technology', 'Science', 'History', 'Philosophy', 'Biography', 'Fiction'];
  const moods = ['Curious', 'Relaxed', 'Anxious', 'Adventurous', 'Philosophical', 'Academic', 'Melancholy', 'Energetic'];
  const levels = ['General Reader', 'Academic', 'Beginner', 'High Difficulty', 'Leisurely'];

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRecommendations([]);
    setExplanation('');

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          genre,
          author,
          interest,
          mood,
          readingLevel
        })
      });

      const data = await response.json();
      if (response.ok) {
        setRecommendations(data.recommendations || []);
        setExplanation(data.explanation || '');
        addToast("Custom reading recommendations processed!", "success");
      } else {
        addToast(data.error || "Failed to compile recommendations.", "error");
      }
    } catch (err) {
      addToast("Failed to connect to recommendation server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowRecommend = async (bookTitle: string) => {
    try {
      // Find book in our catalog dynamically via search
      const searchRes = await fetch(`/api/books?search=${encodeURIComponent(bookTitle)}`);
      const searchData = await searchRes.json();
      
      if (!searchRes.ok || searchData.length === 0) {
        addToast(`"${bookTitle}" is recommended by AI, but is currently not mapped in our core catalog. Contact library staff to acquire.`, "warning");
        return;
      }

      // Borrow the first matched book
      const matchedBook = searchData[0];
      const borrowRes = await fetch('/api/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId: matchedBook.id })
      });

      const borrowData = await borrowRes.json();
      if (borrowRes.ok) {
        addToast(`Successfully checked out: "${borrowData.bookTitle}" via AI Recommendations!`, "success");
        onBorrowSuccess();
      } else {
        addToast(borrowData.error || "Failed to borrow book.", "error");
      }
    } catch (err) {
      addToast("Failed to coordinate book borrow request.", "error");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header Panel */}
      <div className="p-8 border-b border-slate-200 bg-white shrink-0">
        <h2 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-500" />
          <span>AI Reading Recommendation Engine</span>
        </h2>
        <p className="text-sm text-slate-500 font-sans mt-0.5">Define your reading mood, preferences, and interests to receive structured recommendations from our AI Agent</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col xl:flex-row gap-8">
        {/* Form panel */}
        <div className="w-full xl:w-96 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs shrink-0 h-fit">
          <h3 className="font-display font-bold text-base text-slate-800 mb-5 pb-3 border-b border-slate-100">Reading Preference Vectors</h3>
          
          <form onSubmit={handleRecommend} className="space-y-4 text-sm font-sans">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Preferred Genre</label>
              <select
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-700 cursor-pointer"
              >
                <option value="">Any Genre</option>
                {genres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Current Mood</label>
              <select
                value={mood}
                onChange={e => setMood(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-700 cursor-pointer"
              >
                {moods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reading Level</label>
              <select
                value={readingLevel}
                onChange={e => setReadingLevel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-700 cursor-pointer"
              >
                {levels.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target Author Name (Optional)</label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="e.g. Isaac Asimov"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Specific Keywords / Interests</label>
              <input
                type="text"
                value={interest}
                onChange={e => setInterest(e.target.value)}
                placeholder="e.g. survival, tech ethics, AI history"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-medium py-3 rounded-xl transition-colors shadow-sm text-xs mt-2 relative overflow-hidden cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Thinking...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesize Matches</span>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium font-sans">Connecting to Gemini recommendation driver...</p>
              <p className="text-xs text-slate-400 font-sans max-w-xs text-center leading-relaxed">Processing dynamic parameters, parsing library volumes, and calculating narrative match ratios...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4">
              <Heart className="w-10 h-10 text-slate-300 mb-3" />
              <p className="font-display font-semibold text-slate-700">Ready for recommendations</p>
              <p className="text-xs text-slate-400 mt-1 font-sans">Select your genre, mood, and topics on the left-hand panel, then click synthesize to let AI build a tailor-made catalog report for you!</p>
            </div>
          ) : (
            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
              {/* Strategy Explanation banner */}
              {explanation && (
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-sm text-slate-700 leading-relaxed font-sans shrink-0">
                  <span className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
                    <Award className="w-4 h-4" />
                    Librarian's Strategy Summary
                  </span>
                  {explanation}
                </div>
              )}

              {/* Grid of matches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {recommendations.map((rec, index) => (
                  <div key={index} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/40 hover:border-emerald-300 transition-all flex flex-col justify-between animate-slide-up">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{rec.genre}</span>
                        <span className="text-[9px] font-mono text-slate-400">Match Rank #{index + 1}</span>
                      </div>

                      <h4 className="font-display font-bold text-slate-900 text-base leading-tight mt-1">{rec.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 font-sans">by {rec.author}</p>

                      {/* AI Reasoning block */}
                      <div className="mt-4 p-3 bg-white border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed font-sans">
                        <strong className="text-[10px] font-bold text-slate-400 block uppercase mb-1 font-mono">Match Justification:</strong>
                        {rec.reason}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Available in Catalog
                      </span>
                      <button
                        onClick={() => handleBorrowRecommend(rec.title)}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        <span>Borrow Book</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
