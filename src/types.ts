/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  availability: boolean;
  publicationYear: number;
  ISBN: string;
  totalCopies: number;
  availableCopies: number;
}

export interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  renewCount: number;
  fineAmount: number;
  status: 'active' | 'returned' | 'overdue';
}

export interface RecommendationRequest {
  genre?: string;
  author?: string;
  interest?: string;
  mood?: string;
  age?: number;
  readingLevel?: string;
}

export interface RecommendedBook {
  title: string;
  author: string;
  genre: string;
  reason: string;
}

export interface RecommendationResponse {
  recommendations: RecommendedBook[];
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface LibraryStats {
  totalBooks: number;
  borrowedBooks: number;
  totalUsers: number;
  overdueBooksCount: number;
  totalFinesCollected: number;
  genreDistribution: Record<string, number>;
}
