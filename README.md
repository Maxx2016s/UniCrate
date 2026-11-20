# 📦 UniCrate — University Parcel Management System

**A centralized digital parcel management system designed to simplify parcel tracking and collection within a university campus.**

UniCrate replaces traditional manual parcel registers with a digital platform where university staff can register incoming parcels, manage parcel records, and track collection status, while students can view the status of their own parcels.

---

## 🎯 Project Objectives

- Digitize the university's manual parcel registration process.
- Maintain organized and accessible parcel records.
- Allow students to track their own parcels.
- Enable staff to manage parcel registration and collection.
- Provide role-based access to ensure data privacy and security.

## ✨ Key Features

- **User Authentication:** Secure registration and login using JWT.
- **Password Security:** Passwords are hashed using bcryptjs.
- **Role-Based Access Control:** Three user roles — ADMIN, EDITOR, and VIEWER.
- **Parcel Registration:** Staff can register incoming parcels.
- **Unique Tracking IDs:** Every parcel receives a unique tracking ID.
- **Parcel Management:** View, update, search, filter, and delete parcel records.
- **Collection Tracking:** Staff can mark parcels as collected, recording the collection time and staff member.
- **Student Privacy:** Students can only access parcels associated with their own registration number.
- **Dashboard Statistics:** Provides parcel counts and recently registered parcels.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | Backend framework and REST APIs |
| MongoDB Atlas | Cloud database |
| Prisma ORM | Database access and schema management |
| JWT | Authentication |
| bcryptjs | Password hashing |
| dotenv | Environment variable management |
| HTML, CSS, JavaScript | Frontend (planned/under development) |

## 👥 User Roles

| Role | Permissions |
|---|---|
| ADMIN | Manage users, manage parcels, and access administrative operations |
| EDITOR | Register and manage parcels, and create VIEWER accounts |
| VIEWER | View parcels associated with their own registration number |

The first registered account automatically receives the ADMIN role.

## 🗄️ Database Design

UniCrate currently uses two main Prisma models.

### 1. User

Stores user information and authentication details.

- id
- name
- email
- password
- registrationNumber
- role
- createdAt
- updatedAt

### 2. Parcel

Stores parcel information and collection details.

- id
- trackingId
- studentName
- studentRegistrationNumber
- studentEmail
- courierName
- description
- arrivalDate
- status
- collectedAt
- registeredById
- collectedById
- createdAt
- updatedAt

### Relationships

- A user can register multiple parcels.
- A user can collect multiple parcels.
- Every parcel is associated with the staff member who registered it.
- A collected parcel records the staff member who marked it as collected.

## 🔌 API Overview

Base URL:

`http://localhost:3000`

### Authentication APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/auth/me` | Get the logged-in user's details |

### Parcel APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/parcels` | Get parcels |
| GET | `/api/parcels/:id` | Get a parcel by ID |
| POST | `/api/parcels` | Register a parcel |
| PUT | `/api/parcels/:id` | Update parcel details |
| PATCH | `/api/parcels/:id/collect` | Mark a parcel as collected |
| DELETE | `/api/parcels/:id` | Delete a parcel |
| GET | `/api/parcels/stats` | Get parcel dashboard statistics |

Protected endpoints require a JWT bearer token.

## 📁 Project Structure

```text
UniCrate/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── parcelController.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── roleMiddleware.js
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── parcelRoutes.js
│   │   │
│   │   ├── utils/
│   │   │   └── generateTrackingId.js
│   │   │
│   │   ├── public/
│   │   │
│   │   └── index.js
│   │
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

- Node.js and npm
- MongoDB Atlas account
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Maxx2016s/UniCrate.git
cd UniCrate
```

### 2. Navigate to the backend

```bash
cd backend
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file inside the backend directory.

Add the following variables:

```env
DATABASE_URL="your_mongodb_atlas_connection_string"
JWT_SECRET="your_secret_key"
JWT_EXPIRES_IN="1d"
PORT=3000
```

Replace the placeholder values with your own configuration.

**Important:** Never commit your `.env` file or expose database credentials and JWT secrets publicly.

### 5. Generate Prisma Client

```bash
npm run db:generate
```

### 6. Sync the database schema

```bash
npm run db:push
```

### 7. Start the server

```bash
npm run dev
```

Use `npm start` to run the server without automatic restarts.

The backend should run at:

`http://localhost:3000`

## 👨‍💻 Team Contributions

UniCrate is developed collaboratively by a team of four members.

| Team Member | Contributions |
|---|---|
| **Arpan Kaur** | Database schema design using Prisma, MongoDB Atlas integration, shared Prisma client configuration, server entry point, tracking ID generation, and backend integration/testing. |
| **Manya** | Authentication controller and authentication routes, including user registration, login, password hashing, and JWT generation. |
| **Vibhu** | Authentication middleware and role-based authorization middleware for protected routes and access control. |
| **Shaurya** | Parcel controller and parcel routes, including parcel registration, retrieval, updating, collection, deletion, search, filtering, and dashboard statistics. |

## 🔐 Security Considerations

- Passwords are stored as bcrypt hashes.
- JWT tokens are used to authenticate protected requests.
- User roles determine access permissions.
- Students cannot access other students' parcel records.
- Password hashes are excluded from API responses.
- Environment variables are used for sensitive configuration.

## 🚀 Future Improvements

We aim to make UniCrate smarter and more efficient by introducing AI-powered capabilities and additional features.

- **AI-Powered Parcel Assistant**
- **Smart Parcel Notifications:** 
- **AI-Based Analytics**
- **Predictive Analytics**
- **Smart Search:** Introduce AI-powered natural language search so users can find parcel information using conversational queries.
- **Improved Dashboard:** Develop an advanced dashboard with interactive visualizations and operational insights.
- **Email Integration:** Send automated email notifications for parcel arrivals and collection confirmations.
- **Enhanced User Experience:** Improve the frontend with a responsive interface and a smoother user experience.

## 📌 Project Status

**Backend development:** Core implementation completed; API integration and testing in progress.

**Frontend development:** Under development.

---

## 👥 Team UniCrate

Built with collaboration, code, and a goal to make university parcel management simpler.

**Repository:** [UniCrate on GitHub](https://github.com/Maxx2016s/UniCrate)
