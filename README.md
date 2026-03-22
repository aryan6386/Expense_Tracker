# FinDash - Personal Finance Tracker

FinDash is a comprehensive personal finance management application built with the MERN stack. It allows users to track their income and expenses, visualize their financial health through interactive charts, and manage transactions with ease.

## 🚀 Features

- **User Authentication**: Secure signup and login using JWT (JSON Web Tokens) and Bcrypt for password hashing.
- **Financial Dashboard**: An intuitive overview of total balance, income, and expenses.
- **Transaction Management**:
  - Add new income or expense entries with categories, amounts, and dates.
  - Filter transactions by date range or predefined periods (Daily, Weekly, Monthly).
  - List and delete transactions.
- **Visual Analytics**: Interactive bar and pie charts powered by Recharts to visualize spending patterns.
- **Responsive Design**: Built with React and Tailwind CSS 4 for a seamless experience across devices.

## 🛠️ Tech Stack

### Frontend
- **React (Vite)**: Modern frontend library and build tool.
- **React Router Dom**: For navigation and routing.
- **Tailwind CSS 4**: Utility-first CSS framework for styling.
- **Recharts**: Data visualization library for financial charts.
- **Axios**: Promised-based HTTP client for API requests.

### Backend
- **Node.js & Express**: Scalable backend runtime and framework.
- **MongoDB & Mongoose**: NoSQL database and object modeling.
- **JWT & Bcrypt**: Secure authentication and password protection.
- **Dotenv**: Environment variable management.
- **Cors**: Cross-Origin Resource Sharing.

## 📂 Project Structure

```text
fin/
├── backend/               # Express server and MongoDB models
│   ├── routes/            # API endpoints (auth, transactions)
│   ├── models/            # Mongoose schemas
│   ├── middlewares/       # Auth middleware
│   └── server.js          # Entry point
├── frontend/              # Vite + React application
│   ├── src/
│   │   ├── pages/         # Dashboard, Login, Register
│   │   ├── components/    # Reusable UI elements
│   │   └── assets/        # Images and styles
│   └── index.html
└── README.md              # Project documentation
```

## ⚙️ Setup and Installation

### Prerequisites
- Node.js installed
- MongoDB instance (local or Atlas)

### 1. Clone the repository
```bash
git clone <repository-url>
cd fin
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and add the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user and get token

### Transactions (Protected Routes)
- `GET /api/transactions` - Fetch all transactions (with optional filters)
- `POST /api/transactions` - Add a new transaction
- `PUT /api/transactions/:id` - Update an existing transaction
- `DELETE /api/transactions/:id` - Remove a transaction

## 📄 License
ISC
