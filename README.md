# LibrarySense AI

LibrarySense AI is a full-stack, intelligent library assistant application that combines robust inventory tracking with advanced AI capabilities. Powered by the Gemini API, the platform provides automated book recommendation engines, customized summaries, an interactive virtual librarian assistant, overdue loan/fine calculations, and a complete administration portal.

---

## Key Features

- **📚 Intelligent Catalog Explorer**: Browse and search a complete catalog of books, view real-time availability, and checkout books with automated due dates.
- **💬 Interactive Chat Companion**: Consult an AI-powered library chatbot for detailed reference help, literature queries, and study assistance.
- **✨ AI Book Recommendations**: Receive customized reading lists based on your personal preferences, favorite genres, or learning objectives.
- **💳 Member Profile & Billing**: Track your active loans, borrow history, overdue items, and settle library fine invoices through a secure simulated payment portal.
- **⚙️ Administrator Dashboard**: Manage library catalogs, register new books, audit system borrow histories, and manage outstanding fine registers.

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express, TypeScript, Esbuild, Tsx
- **AI Integration**: Google GenAI SDK (`@google/genai`)

---

## Getting Started

### 1. Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18 or higher) installed on your system.

### 2. Installation

Clone or extract the project files, navigate to the directory, and install dependencies:

```bash
# Install package dependencies
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Open the `.env` file and insert your Gemini API Key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Running the Application

To boot up the unified full-stack development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### 5. Building for Production

Compile both client-side assets and the TypeScript backend server for production:

```bash
npm run build
```

Start the compiled production server:

```bash
npm run start
```

---

## License

This project is licensed under the Apache 2.0 License.
