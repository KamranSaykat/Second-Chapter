# Second Chapter - Campus Used Textbook Marketplace

**Second Chapter** is a web-based platform designed for university students to buy and sell used course textbooks directly within their campus community. It streamlines book discovery, condition verification, purchase requests, and transaction recording with a built-in 5% platform commission calculation.

> **Currency Specification:** All monetary values across the application are strictly in **Bangladeshi Taka (BDT / ৳)** formatted as `৳1,200`, `৳850`, `৳2,000`. No dollars (`$`) or foreign currencies are used anywhere in the codebase.

---

## Technology Stack

- **Frontend:** Semantic HTML5, Vanilla CSS3 (Custom Responsive Layouts), Vanilla JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Database:** SQLite (via `sqlite3`)
- **Authentication:** Session-based authentication (`express-session`)
- **Security:** Password Hashing (`bcryptjs`), Parameterized SQL Queries
- **File Uploads:** Multer (Image validation, file size limits, safe file naming)

> **Note:** Built strictly using lightweight native web standards and Express. No React, Next.js, MongoDB, or external payment gateways are used.

---

## Requirements

Before running the application, ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (comes bundled with Node.js)

---

## Installation

1. Open your terminal or command prompt in the project root directory.
2. Install all required dependencies:

```bash
npm install
```

---

## Database Setup & Demo Data Seeding

The project uses an embedded **SQLite** database.

- **Database File Location:** `./database.sqlite` (created automatically at the project root).
- **Automatic Initialization:** On server startup, the database schema (tables for `users`, `books`, `purchase_requests`, and `transactions`) and the default **System Admin** account are initialized automatically if they do not exist.
- **Seeding Demo Data (`npm run seed`):**
  To populate the application with a realistic set of Bangladeshi Taka (৳) demo records (including 4 users, 9 book listings across all 4 statuses, 5 purchase requests, and 3 completed 5% commission transactions), run:
  ```bash
  npm run seed
  ```
  *(Note: The seed command is idempotent and safe to run multiple times without creating duplicate records).*

- **Resetting / Recreating Demo Data:**
  To reset the application to a completely fresh state:
  1. Stop the running server.
  2. Delete the `database.sqlite` file from the project root directory.
  3. Start the server (`npm start`), or re-run `npm run seed`.

---

## Running the Application

To start the server:

```bash
npm start
```

Once started, open your browser and navigate to:

```
http://localhost:3000
```

- **Default Port:** `3000` (Can be configured via `PORT` environment variable).

---

## Demo Login Credentials

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **System Admin** | System Admin | `admin@secondchapter.edu` | `admin123` |
| **Seller / Student A** | Alice Smith | `alice@secondchapter.edu` | `student123` |
| **Buyer / Student B** | Bob Johnson | `bob@secondchapter.edu` | `student123` |
| **Student C** | Charlie Ahmed | `charlie@secondchapter.edu` | `student123` |

---

## Project Structure

```
Second Chapter/
├── .agents/
│   └── skills/
│       └── second-chapter/
│           └── SKILL.md      # Project specification & guidelines
├── public/
│   ├── css/
│   │   └── style.css         # Clean university marketplace styling
│   ├── js/
│   │   ├── main.js           # Navigation & global BDT formatting helpers
│   │   ├── marketplace.js    # Search & filtering controller
│   │   ├── dashboard.js      # Student dashboard & requests controller
│   │   └── admin.js          # Admin verification portal controller
│   └── uploads/              # Storage directory for textbook photos
├── src/
│   ├── config/
│   │   └── db.js             # SQLite connection & table creation
│   ├── middleware/
│   │   ├── auth.js           # Session auth & Admin authorization
│   │   └── upload.js         # Multer file upload validation
│   ├── routes/
│   │   ├── auth.routes.js    # Register, Login, Logout, Session API
│   │   ├── book.routes.js    # Marketplace & Listing creation API
│   │   ├── request.routes.js # Purchase requests & Seller acceptance API
│   │   ├── admin.routes.js   # Admin pending review & user directory API
│   │   └── user.routes.js    # Student transaction history API
│   └── app.js                # Express app setup & route binding
├── views/                    # Semantic HTML pages
│   ├── index.html            # Landing / Home page
│   ├── marketplace.html      # Public textbook marketplace (BDT)
│   ├── book-details.html     # Single book view & purchase request action
│   ├── login.html            # Student & Admin sign-in
│   ├── register.html         # Student account registration
│   ├── dashboard.html        # Student dashboard (Listings, Requests, Sales)
│   ├── create-listing.html   # Sell book form with photo upload
│   └── admin.html            # Admin verification portal
├── scripts/
│   └── seed.js               # Idempotent demo data seeding script (BDT)
├── scratch/
│   └── test-suite.js         # Automated end-to-end integration tests (BDT)
├── .env.example              # Environment variables template
├── database.sqlite           # SQLite database file (generated)
├── package.json              # Project scripts & dependencies
└── server.js                 # Application entry point
```

---

## How to View the SQLite Database

You can inspect the database tables (`users`, `books`, `purchase_requests`, `transactions`) using either of the following methods:

### Method 1: Using DB Browser for SQLite (GUI Application)
1. Download and open **DB Browser for SQLite** (free open-source GUI).
2. Click **Open Database** and select `./database.sqlite` from the project folder.
3. Click the **Browse Data** tab.
4. Select any table from the dropdown (`users`, `books`, `purchase_requests`, `transactions`) to inspect stored records, timestamps, and BDT financial commission data.

### Method 2: Using VS Code / Antigravity SQLite Extension
1. Install the **SQLite Viewer** or **SQLite** extension in VS Code.
2. Right-click `database.sqlite` in your file explorer sidebar.
3. Select **Open Database** or **View Database**.

---

## API Endpoints Summary

### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` — Register a new student account
- `POST /api/auth/login` — Login user & create session
- `POST /api/auth/logout` — Destroy user session
- `GET /api/auth/me` — Return current session status

### Book Routes (`/api/books`)
- `POST /api/books` — Create book listing with uploaded photo (Status: `pending`)
- `GET /api/books` — Fetch approved books with search & BDT price filter parameters
- `GET /api/books/my/listings` — Fetch logged-in student's book listings
- `GET /api/books/:id` — Fetch single book details with seller info

### Purchase Request Routes (`/api/requests`)
- `POST /api/requests` — Send purchase request for an approved book
- `GET /api/requests/incoming` — Fetch incoming requests for seller's books
- `GET /api/requests/outgoing` — Fetch purchase requests sent by buyer
- `POST /api/requests/:id/accept` — Seller accepts request (Marks book `sold`, calculates 5% commission in BDT)
- `POST /api/requests/:id/decline` — Seller declines purchase request

### Admin Routes (`/api/admin`)
- `GET /api/admin/pending-books` — Fetch pending listings for photo verification
- `POST /api/admin/books/:id/approve` — Approve pending listing
- `POST /api/admin/books/:id/reject` — Reject/flag listing
- `GET /api/admin/users` — Fetch registered users list
- `GET /api/admin/transactions` — Fetch system-wide transactions & BDT revenue metrics

### User Routes (`/api/user`)
- `GET /api/user/transactions` — Fetch completed sales & purchase records for student in BDT

---

## Testing

### Automated Integration Test Suite
To run the complete end-to-end integration test suite verifying all 14 business rules using BDT currency:

```bash
npm test
```

### Manual Testing Workflow
1. **Register** a student account (e.g., Student A).
2. **Create a Listing** with textbook details and upload a photo (Price in BDT, e.g. ৳1,200).
3. **Login as Admin** (`admin@secondchapter.edu` / `admin123`) and open `/admin`. Inspect the photo and approve the listing.
4. **Register / Login** as Student B, open `/marketplace`, find the book, and send a **Purchase Request**.
5. **Login as Student A**, open `/dashboard`, go to **Incoming Sales Requests**, and click **Accept**.
6. Verify the book status updates to **SOLD**, and a transaction record with **5% commission in BDT** (৳60 commission, ৳1,140 seller amount) is generated in both Student A's dashboard and the Admin portal.

---

## Troubleshooting

- **`npm install` script error on Windows PowerShell:**
  If PowerShell blocks scripts, run npm commands using CMD or bypass policy:
  ```cmd
  cmd /c npm install
  ```
- **Port 3000 already in use:**
  Set a custom port before starting:
  ```bash
  PORT=8080 npm start
  ```
- **Image upload fails:**
  Ensure uploaded files are JPEG, PNG, or WebP formats under 5MB. Uploaded images are stored in `./public/uploads`.
- **Database reset / re-seeding:**
  Run `npm run seed` to re-populate fresh BDT demo data at any time.

---

## University Demo Guide (Live Instructor Presentation in BDT ৳)

Follow these 10 simple steps to demonstrate the complete project in under 3 minutes during a viva or presentation:

1. **Start Server:** Run `npm start` and navigate to `http://localhost:3000`.
2. **Seed Sample BDT Data:** Run `npm run seed` to load demo textbooks in BDT.
3. **Login as Student (Alice):** Login with `alice@secondchapter.edu` / `student123`.
4. **Create Listing:** Click **+ Sell Book**, enter title, department, set price as `৳1800`, attach a photo, and submit (Show that status is `pending`).
5. **Demonstrate Public Marketplace Protection:** Go to `/marketplace` and show that the newly submitted book is **not** visible yet.
6. **Admin Verification:** Log out and sign in as Admin (`admin@secondchapter.edu` / `admin123`). Navigate to `/admin`, inspect the pending listing photo, and click **Approve**.
7. **Marketplace Search & Filter:** Log out, sign in as Charlie (`charlie@secondchapter.edu` / `student123`), go to `/marketplace`, search for the textbook, and demonstrate the BDT price range and department filters.
8. **Send Purchase Request:** Open book details and click **Send Purchase Request**. (Attempting a duplicate request will show the protection message).
9. **Seller Accept & Transaction:** Log out, sign in as Alice, open `/dashboard` ➔ **Incoming Sales Requests**, and click **Accept**.
10. **Show 5% Platform Commission in BDT (৳):** View **Transaction History** in Alice's dashboard and the Admin portal (`/admin`) to highlight the automated 5% platform commission calculation (৳1,800 sale ➔ ৳90 commission, ৳1,710 seller payout) and verified sold-book status.
