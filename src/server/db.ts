/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sampleBooks } from '../data/sampleBooks';
import { Book, User, BorrowRecord, ChatMessage } from '../types';

const DB_DIR = path.join(process.cwd(), 'data-db');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const USERS_FILE = path.join(DB_DIR, 'users.json');
const BOOKS_FILE = path.join(DB_DIR, 'books.json');
const BORROW_FILE = path.join(DB_DIR, 'borrow_history.json');
const CHAT_FILE = path.join(DB_DIR, 'chat_history.json');

// Hash password helper
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initial Database Seeding
function initializeDB() {
  // 1. Seed Books
  if (!fs.existsSync(BOOKS_FILE)) {
    fs.writeFileSync(BOOKS_FILE, JSON.stringify(sampleBooks, null, 2));
  }

  // 2. Seed Users
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
      {
        id: "user-admin",
        username: "Librarian Admin",
        email: "admin@librarysense.edu",
        passwordHash: hashPassword("adminpassword"),
        role: "admin",
        createdAt: new Date().toISOString()
      },
      {
        id: "user-student",
        username: "John Doe",
        email: "student@librarysense.edu",
        passwordHash: hashPassword("studentpassword"),
        role: "student",
        createdAt: new Date().toISOString()
      },
      {
        id: "user-faculty",
        username: "Prof. Sarah Jenkins",
        email: "faculty@librarysense.edu",
        passwordHash: hashPassword("facultypassword"),
        role: "faculty",
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
  }

  // 3. Seed Borrow History (Create 1 active, 1 completed, 1 overdue to demonstrate tracking)
  if (!fs.existsSync(BORROW_FILE)) {
    const now = new Date();
    
    const completedBorrow: BorrowRecord = {
      id: "borrow-1",
      userId: "user-student",
      bookId: "book-1", // 1984
      bookTitle: "1984",
      bookAuthor: "George Orwell",
      borrowDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
      dueDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
      returnDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // returned 1 day ago
      renewCount: 0,
      fineAmount: 2.50, // 5 days overdue (returned 1 day ago when it was due 6 days ago)
      status: 'returned'
    };

    const activeBorrow: BorrowRecord = {
      id: "borrow-2",
      userId: "user-student",
      bookId: "book-11", // Dune
      bookTitle: "Dune",
      bookAuthor: "Frank Herbert",
      borrowDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      dueDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days in future
      returnDate: null,
      renewCount: 1,
      fineAmount: 0.0,
      status: 'active'
    };

    const overdueBorrow: BorrowRecord = {
      id: "borrow-3",
      userId: "user-student",
      bookId: "book-41", // Clean Code
      bookTitle: "Clean Code",
      bookAuthor: "Robert C. Martin",
      borrowDate: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days ago
      dueDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
      returnDate: null,
      renewCount: 0,
      fineAmount: 2.00, // 4 days overdue * $0.50 = $2.00
      status: 'overdue'
    };

    const initialHistory = [completedBorrow, activeBorrow, overdueBorrow];
    fs.writeFileSync(BORROW_FILE, JSON.stringify(initialHistory, null, 2));

    // Adjust catalog copies
    const books = JSON.parse(fs.readFileSync(BOOKS_FILE, 'utf-8')) as Book[];
    const b1 = books.find(b => b.id === "book-11");
    if (b1) b1.availableCopies -= 1;
    const b2 = books.find(b => b.id === "book-41");
    if (b2) b2.availableCopies -= 1;
    fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
  }

  // 4. Seed Chat History
  if (!fs.existsSync(CHAT_FILE)) {
    fs.writeFileSync(CHAT_FILE, JSON.stringify({}, null, 2));
  }
}

// Run DB Init
initializeDB();

// Database Query Engines
export class Database {
  // Users
  static getUsers(): any[] {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }

  static saveUsers(users: any[]) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }

  // Books
  static getBooks(): Book[] {
    return JSON.parse(fs.readFileSync(BOOKS_FILE, 'utf-8'));
  }

  static saveBooks(books: Book[]) {
    fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
  }

  // Borrow Record
  static getBorrowHistory(): BorrowRecord[] {
    const history = JSON.parse(fs.readFileSync(BORROW_FILE, 'utf-8')) as BorrowRecord[];
    // Dynamic Fine Recalculator
    const now = new Date();
    let updated = false;

    history.forEach(record => {
      if (record.status !== 'returned') {
        const dueDate = new Date(record.dueDate);
        if (now > dueDate) {
          const diffTime = Math.abs(now.getTime() - dueDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const currentFine = diffDays * 0.50;
          if (record.fineAmount !== currentFine || record.status !== 'overdue') {
            record.fineAmount = currentFine;
            record.status = 'overdue';
            updated = true;
          }
        } else {
          if (record.status !== 'active') {
            record.status = 'active';
            record.fineAmount = 0.0;
            updated = true;
          }
        }
      }
    });

    if (updated) {
      fs.writeFileSync(BORROW_FILE, JSON.stringify(history, null, 2));
    }

    return history;
  }

  static saveBorrowHistory(history: BorrowRecord[]) {
    fs.writeFileSync(BORROW_FILE, JSON.stringify(history, null, 2));
  }

  // Chat History
  static getChatHistory(userId: string): ChatMessage[] {
    const chats = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8'));
    return chats[userId] || [];
  }

  static saveChatHistory(userId: string, messages: ChatMessage[]) {
    const chats = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8'));
    chats[userId] = messages;
    fs.writeFileSync(CHAT_FILE, JSON.stringify(chats, null, 2));
  }

  static clearChatHistory(userId: string) {
    const chats = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8'));
    delete chats[userId];
    fs.writeFileSync(CHAT_FILE, JSON.stringify(chats, null, 2));
  }
}
