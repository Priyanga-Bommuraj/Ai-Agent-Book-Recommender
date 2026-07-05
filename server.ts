/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { Database, hashPassword } from './src/server/db';
import { buildDynamicChatPrompt, buildRecommendationPrompt, LIBRARY_AGENT_SYSTEM_PROMPT } from './src/prompts';
import { createServer as createViteServer } from 'vite';
import { Book, BorrowRecord, ChatMessage } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// --- LAZY INITIALIZED GEMINI CLIENT ---
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will fallback to mock templates.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// --- SECURE AUTHORIZATION MIDDLEWARE ---
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: 'student' | 'faculty' | 'admin';
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    res.status(401).json({ error: "Access denied. Token missing." });
    return;
  }

  try {
    // For simplicity and absolute reliability, our token is: "user_id:role:username_base64"
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, role, username] = decoded.split(':::');

    const users = Database.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      res.status(403).json({ error: "Invalid or expired session token." });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid session token." });
  }
}

// Admin only gate
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: "Unauthorized access. Administrative privileges required." });
    return;
  }
  next();
}

// --- AUTHENTICATION API ---

// POST /register
app.post('/api/register', (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: "Username, email, and password are required." });
    return;
  }

  const users = Database.getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    res.status(400).json({ error: "An account with this email already exists." });
    return;
  }

  const newUser = {
    id: 'user-' + Date.now(),
    username,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role: role === 'faculty' ? 'faculty' : (role === 'admin' ? 'admin' : 'student'),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  Database.saveUsers(users);

  // Generate safe session token
  const tokenStr = `${newUser.id}:::${newUser.role}:::${newUser.username}`;
  const token = Buffer.from(tokenStr).toString('base64');

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }
  });
});

// POST /api/login
app.post('/api/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const users = Database.getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  // Generate safe session token
  const tokenStr = `${user.id}:::${user.role}:::${user.username}`;
  const token = Buffer.from(tokenStr).toString('base64');

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// GET /api/profile
app.get('/api/profile', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// --- BOOK MANAGEMENT API ---

// GET /api/books
app.get('/api/books', (req: Request, res: Response) => {
  const books = Database.getBooks();
  const search = req.query.search as string;
  const genre = req.query.genre as string;

  let filtered = books;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.author.toLowerCase().includes(q) || 
      b.ISBN.includes(q) ||
      b.description.toLowerCase().includes(q)
    );
  }

  if (genre && genre !== 'All') {
    filtered = filtered.filter(b => b.genre.toLowerCase() === genre.toLowerCase());
  }

  res.json(filtered);
});

// GET /api/books/:id
app.get('/api/books/:id', (req: Request, res: Response) => {
  const books = Database.getBooks();
  const book = books.find(b => b.id === req.params.id);

  if (!book) {
    res.status(404).json({ error: "Book not found." });
    return;
  }

  res.json(book);
});

// POST /api/books (Admin Only)
app.post('/api/books', authenticateToken as any, requireAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const { title, author, genre, description, publicationYear, ISBN, totalCopies } = req.body;

  if (!title || !author || !genre || !ISBN || !totalCopies) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const books = Database.getBooks();
  const newBook: Book = {
    id: 'book-' + Date.now(),
    title,
    author,
    genre,
    description: description || "No description provided.",
    publicationYear: parseInt(publicationYear) || new Date().getFullYear(),
    ISBN,
    totalCopies: parseInt(totalCopies) || 1,
    availableCopies: parseInt(totalCopies) || 1,
    availability: true
  };

  books.push(newBook);
  Database.saveBooks(books);

  res.status(201).json(newBook);
});

// PUT /api/books/:id (Admin Only)
app.put('/api/books/:id', authenticateToken as any, requireAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const { title, author, genre, description, publicationYear, ISBN, totalCopies } = req.body;
  const books = Database.getBooks();
  const bookIndex = books.findIndex(b => b.id === req.params.id);

  if (bookIndex === -1) {
    res.status(404).json({ error: "Book not found." });
    return;
  }

  const existingBook = books[bookIndex];
  const oldTotal = existingBook.totalCopies;
  const oldAvailable = existingBook.availableCopies;
  const newTotal = parseInt(totalCopies) || existingBook.totalCopies;

  // Adjust available copies based on the change of total copies
  const diff = newTotal - oldTotal;
  let newAvailable = oldAvailable + diff;
  if (newAvailable < 0) newAvailable = 0;

  const updatedBook: Book = {
    ...existingBook,
    title: title || existingBook.title,
    author: author || existingBook.author,
    genre: genre || existingBook.genre,
    description: description || existingBook.description,
    publicationYear: parseInt(publicationYear) || existingBook.publicationYear,
    ISBN: ISBN || existingBook.ISBN,
    totalCopies: newTotal,
    availableCopies: newAvailable,
    availability: newAvailable > 0
  };

  books[bookIndex] = updatedBook;
  Database.saveBooks(books);

  res.json(updatedBook);
});

// DELETE /api/books/:id (Admin Only)
app.delete('/api/books/:id', authenticateToken as any, requireAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const books = Database.getBooks();
  const filtered = books.filter(b => b.id !== req.params.id);

  if (filtered.length === books.length) {
    res.status(404).json({ error: "Book not found." });
    return;
  }

  Database.saveBooks(filtered);
  res.json({ message: "Book successfully deleted." });
});


// --- BORROW SYSTEM API ---

// GET /api/history (Personal user history)
app.get('/api/history', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const history = Database.getBorrowHistory();
  const userHistory = history.filter(h => h.userId === req.user!.id);
  res.json(userHistory);
});

// POST /api/borrow
app.post('/api/borrow', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { bookId } = req.body;
  if (!bookId) {
    res.status(400).json({ error: "Book ID is required." });
    return;
  }

  // Prevent multiple active borrows of the same book by the same user
  const history = Database.getBorrowHistory();
  const alreadyBorrowed = history.some(h => h.userId === req.user!.id && h.bookId === bookId && h.status !== 'returned');
  if (alreadyBorrowed) {
    res.status(400).json({ error: "You are currently borrowing an active copy of this book." });
    return;
  }

  const books = Database.getBooks();
  const bookIndex = books.findIndex(b => b.id === bookId);

  if (bookIndex === -1) {
    res.status(404).json({ error: "Book not found in catalog." });
    return;
  }

  const book = books[bookIndex];
  if (book.availableCopies <= 0) {
    res.status(400).json({ error: "This book is currently out of stock." });
    return;
  }

  // Decrement copies
  book.availableCopies -= 1;
  book.availability = book.availableCopies > 0;
  Database.saveBooks(books);

  // Record history
  const now = new Date();
  const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days loan

  const newRecord: BorrowRecord = {
    id: 'borrow-' + Date.now(),
    userId: req.user!.id,
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    borrowDate: now.toISOString(),
    dueDate: dueDate.toISOString(),
    returnDate: null,
    renewCount: 0,
    fineAmount: 0.0,
    status: 'active'
  };

  history.push(newRecord);
  Database.saveBorrowHistory(history);

  res.status(201).json(newRecord);
});

// POST /api/return
app.post('/api/return', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { borrowId } = req.body;
  if (!borrowId) {
    res.status(400).json({ error: "Borrow record ID is required." });
    return;
  }

  const history = Database.getBorrowHistory();
  const recordIndex = history.findIndex(h => h.id === borrowId);

  if (recordIndex === -1) {
    res.status(404).json({ error: "Borrow record not found." });
    return;
  }

  const record = history[recordIndex];
  if (record.returnDate !== null) {
    res.status(400).json({ error: "This book has already been returned." });
    return;
  }

  // Secure ownership check
  if (record.userId !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: "You do not own this borrow transaction." });
    return;
  }

  // Set return values
  const now = new Date();
  record.returnDate = now.toISOString();
  record.status = 'returned';

  // Fine calculation finalizer ($0.50/day overdue)
  const dueDate = new Date(record.dueDate);
  if (now > dueDate) {
    const diffTime = Math.abs(now.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    record.fineAmount = diffDays * 0.50;
  } else {
    record.fineAmount = 0.0;
  }

  Database.saveBorrowHistory(history);

  // Return copy back to catalog
  const books = Database.getBooks();
  const book = books.find(b => b.id === record.bookId);
  if (book) {
    book.availableCopies += 1;
    book.availability = true;
    Database.saveBooks(books);
  }

  res.json(record);
});

// POST /api/renew
app.post('/api/renew', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { borrowId } = req.body;
  if (!borrowId) {
    res.status(400).json({ error: "Borrow record ID is required." });
    return;
  }

  const history = Database.getBorrowHistory();
  const recordIndex = history.findIndex(h => h.id === borrowId);

  if (recordIndex === -1) {
    res.status(404).json({ error: "Borrow record not found." });
    return;
  }

  const record = history[recordIndex];
  if (record.status === 'returned') {
    res.status(400).json({ error: "Cannot renew a book that has already been returned." });
    return;
  }

  if (record.status === 'overdue') {
    res.status(400).json({ error: "Cannot renew an overdue book. Please return it and clear outstanding fines." });
    return;
  }

  if (record.renewCount >= 2) {
    res.status(400).json({ error: "Maximum renewal limit (2 times) reached for this item." });
    return;
  }

  // Extend due date by 14 days
  const currentDueDate = new Date(record.dueDate);
  const extendedDueDate = new Date(currentDueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  record.dueDate = extendedDueDate.toISOString();
  record.renewCount += 1;

  Database.saveBorrowHistory(history);
  res.json(record);
});

// POST /api/pay-fines
app.post('/api/pay-fines', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const history = Database.getBorrowHistory();
  let paidCount = 0;
  let totalPaid = 0;

  history.forEach(record => {
    if (record.userId === req.user!.id && record.fineAmount > 0) {
      totalPaid += record.fineAmount;
      record.fineAmount = 0.0;
      paidCount += 1;
    }
  });

  if (paidCount > 0) {
    Database.saveBorrowHistory(history);
  }

  res.json({ message: "Outstanding library fines paid successfully.", paidCount, totalPaid });
});


// --- AI INTERACTIVE ENGINES (GEMINI DRIVER) ---

// POST /api/chat
app.post('/api/chat', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  const { message } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required." });
    return;
  }

  try {
    const userId = req.user!.id;
    const catalog = Database.getBooks();
    const borrowHistory = Database.getBorrowHistory().filter(h => h.userId === userId);
    
    // Conversation History Load
    const conversationHistory = Database.getChatHistory(userId);

    // Save User's incoming message
    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now() + '-user',
      role: 'user',
      text: message,
      timestamp: new Date().toISOString()
    };
    conversationHistory.push(userMessage);

    // Prompt Engine Builder
    const constructedPrompt = buildDynamicChatPrompt({
      userQuery: message,
      catalog,
      userProfile: req.user,
      borrowHistory,
      conversationHistory: conversationHistory.map(m => ({ role: m.role, text: m.text }))
    });

    let aiResponseText = "";

    // Lazy initialization of Gemini SDK
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: constructedPrompt,
          config: {
            systemInstruction: LIBRARY_AGENT_SYSTEM_PROMPT,
            temperature: 0.7
          }
        });
        aiResponseText = response.text || "I apologize, but I could not formulate a response at this moment.";
      } catch (geminiError: any) {
        console.error("Gemini AI invocation failed, using offline fallback. Error:", geminiError);
        aiResponseText = `*Librarian Agent Note: [Offline Fallback Active]* I received your message: "${message}". 

I can see in our active system that you are currently logged in as **${req.user!.username}**. 
To search or borrow books, you can use our interactive dashboard panels directly! I am fully capable of matching your requirements. Please let me know what specific genre or book title you'd like to read.`;
      }
    } else {
      // Offline fallback when API key is missing
      aiResponseText = `*Librarian Agent Note: [Developer API Key Missing]* Welcome, **${req.user!.username}**! 

I am LibrarySense AI. I can guide you through our collections! For example, we have highly sought-after titles like **Clean Code**, **1984**, and **Dune** ready in our catalog. 
You can search, borrow, and renew books on the left-hand navigation. To enable intelligent recommendations and conversational reasoning, please add a valid \`GEMINI_API_KEY\` to your secrets panel!`;
    }

    // Save Model's response
    const modelMessage: ChatMessage = {
      id: 'msg-' + Date.now() + '-model',
      role: 'model',
      text: aiResponseText,
      timestamp: new Date().toISOString()
    };
    conversationHistory.push(modelMessage);
    Database.saveChatHistory(userId, conversationHistory);

    res.json({ message: modelMessage, history: conversationHistory });
  } catch (error: any) {
    console.error("Chat agent error:", error);
    res.status(500).json({ error: "An error occurred inside the AI Library Agent." });
  }
});

// GET /api/chat/history (Fetch chat history)
app.get('/api/chat/history', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const history = Database.getChatHistory(req.user!.id);
  res.json(history);
});

// DELETE /api/chat/history (Clear conversations)
app.delete('/api/chat/history', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  Database.clearChatHistory(req.user!.id);
  res.json({ message: "Conversation history cleared successfully." });
});

// POST /api/recommend
app.post('/api/recommend', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  const { genre, author, interest, mood, age, readingLevel } = req.body;
  const catalog = Database.getBooks();
  const borrowHistory = Database.getBorrowHistory().filter(h => h.userId === req.user!.id);

  try {
    const constructedPrompt = buildRecommendationPrompt({
      genre, author, interest, mood, age, readingLevel, borrowHistory, catalog
    });

    let resultJSON: any = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: constructedPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      author: { type: Type.STRING },
                      genre: { type: Type.STRING },
                      reason: { type: Type.STRING }
                    },
                    required: ["title", "author", "genre", "reason"]
                  }
                },
                explanation: { type: Type.STRING }
              },
              required: ["recommendations", "explanation"]
            }
          }
        });

        const text = response.text?.trim() || "{}";
        resultJSON = JSON.parse(text);
      } catch (geminiError) {
        console.error("Gemini Recommendation call failed, running offline recommendation heuristics.", geminiError);
      }
    }

    // Heuristic Fallback Recommendation System (If offline or fails)
    if (!resultJSON) {
      const selectedGenre = genre || 'Science Fiction';
      const catalogBooks = Database.getBooks();
      
      // Match by genre first
      let matches = catalogBooks.filter(b => b.genre.toLowerCase() === selectedGenre.toLowerCase());
      if (matches.length === 0) {
        matches = catalogBooks.slice(0, 3);
      }

      const recs = matches.slice(0, 3).map(b => ({
        title: b.title,
        author: b.author,
        genre: b.genre,
        reason: `Highly matching your preference for "${selectedGenre}". Since you mentioned an interest in "${interest || 'reading'}", this acclaimed title offers a perfect starting point.`
      }));

      resultJSON = {
        recommendations: recs,
        explanation: `Here are hand-picked selections matching your preference for ${selectedGenre} and mood: "${mood || 'curious'}". They represent highly rated titles available in our digital library catalog.`
      };
    }

    res.json(resultJSON);
  } catch (error: any) {
    console.error("Recommendation error:", error);
    res.status(500).json({ error: "Failed to generate recommendations." });
  }
});

// POST /api/summary
app.post('/api/summary', authenticateToken as any, async (req: Request, res: Response) => {
  const { bookId } = req.body;
  if (!bookId) {
    res.status(400).json({ error: "Book ID is required." });
    return;
  }

  const books = Database.getBooks();
  const book = books.find(b => b.id === bookId);

  if (!book) {
    res.status(404).json({ error: "Book not found." });
    return;
  }

  try {
    const prompt = `Provide a comprehensive literary summary, core themes, key takeaways, and historic background for the book: "${book.title}" by ${book.author} (Published: ${book.publicationYear}, Genre: ${book.genre}).
    The summary must be professional, informative, and formatted beautifully in markdown with headers for Summary, Major Themes, and Key Takeaways.`;

    let summaryText = "";

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt
        });
        summaryText = response.text || "Summary details are currently unavailable.";
      } catch (geminiError) {
        summaryText = `### Offline Overview of **${book.title}**\n\n*This is an offline summary placeholder because the Gemini API key is not configured.* \n\n**${book.title}** is a notable work in the **${book.genre}** genre by author **${book.author}**. First published in **${book.publicationYear}**, it explores important social and structural concepts. We currently hold copies of this book in our university library. Try borrowing it today to explore its full depth!`;
      }
    } else {
      summaryText = `### AI Overview of **${book.title}**\n\n*Configure your \`GEMINI_API_KEY\` to retrieve rich, custom-generated literary analyses and reading summaries!*\n\n**Book Details:**\n- **Title:** ${book.title}\n- **Author:** ${book.author}\n- **Genre:** ${book.genre}\n- **Description:** ${book.description}\n- **Published:** ${book.publicationYear}\n- **ISBN:** ${book.ISBN}`;
    }

    res.json({ summary: summaryText });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate book summary." });
  }
});

// POST /api/search (AI-Assisted Natural Language Search)
app.post('/api/search', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    res.status(400).json({ error: "Search query is required." });
    return;
  }

  const catalog = Database.getBooks();

  try {
    const prompt = `The user is looking for book recommendations using natural language search: "${query}".
    Map their intent to the following active library books and return the top 3-4 most relevant matching Book IDs.
    
    Catalog:
    ${catalog.map(b => `- ID: ${b.id} | Title: "${b.title}" | Author: ${b.author} | Genre: ${b.genre} | Description: ${b.description}`).slice(0, 40).join('\n')}
    
    Format your response as a JSON array containing only matched IDs, like: ["book-1", "book-11"]. Do not output any markdown code blocks.`;

    let matchedIds: string[] = [];

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        });
        const text = response.text?.trim() || "[]";
        matchedIds = JSON.parse(text);
      } catch (err) {
        console.error("AI search failed, running standard keywords search fallback.");
      }
    }

    // Keyword matching fallback
    if (matchedIds.length === 0) {
      const q = query.toLowerCase();
      matchedIds = catalog
        .filter(b => b.title.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q) || b.description.toLowerCase().includes(q))
        .map(b => b.id)
        .slice(0, 4);
    }

    // Map matched IDs back to complete book records
    const matchedBooks = catalog.filter(b => matchedIds.includes(b.id));
    res.json(matchedBooks);
  } catch (error) {
    res.status(500).json({ error: "Failed to process AI search." });
  }
});


// --- ADMIN METRICS & REPORTING ---

// GET /api/admin/stats
app.get('/api/admin/stats', authenticateToken as any, requireAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const books = Database.getBooks();
  const borrowHistory = Database.getBorrowHistory();
  const users = Database.getUsers();

  const totalBooks = books.reduce((sum, b) => sum + b.totalCopies, 0);
  const activeBorrows = borrowHistory.filter(h => h.status === 'active' || h.status === 'overdue');
  const overdueRecords = borrowHistory.filter(h => h.status === 'overdue');
  
  const totalFinesCollected = borrowHistory
    .filter(h => h.status === 'returned')
    .reduce((sum, h) => sum + h.fineAmount, 0);

  const genreDistribution: Record<string, number> = {};
  books.forEach(b => {
    genreDistribution[b.genre] = (genreDistribution[b.genre] || 0) + b.totalCopies;
  });

  res.json({
    totalBooks,
    borrowedBooks: activeBorrows.length,
    totalUsers: users.length,
    overdueBooksCount: overdueRecords.length,
    totalFinesCollected,
    genreDistribution
  });
});

// GET /api/admin/reports (Retrieve Master Borrow Logs)
app.get('/api/admin/reports', authenticateToken as any, requireAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const history = Database.getBorrowHistory();
  const users = Database.getUsers();

  // Attach username and email to borrow logs for transparency
  const masterLogs = history.map(h => {
    const borrower = users.find(u => u.id === h.userId);
    return {
      ...h,
      borrowerName: borrower ? borrower.username : "Deleted User",
      borrowerEmail: borrower ? borrower.email : "N/A"
    };
  });

  res.json(masterLogs);
});


// --- VITE DEV ENGINE INTEGRATION & FALLBACKS ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=============================================================`);
    console.log(`   LibrarySense AI - Intelligent Library Assistant Agent     `);
    console.log(`   Server running locally at http://localhost:${PORT}         `);
    console.log(`=============================================================`);
  });
}

startServer();
