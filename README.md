## API Endpoint

### 1. Auth Module (`/auth`)
For user registration, secure password-based or Google OAuth sign-in, and account access control[cite: 1].

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | New user registration | ❌ No |
| `POST` | `/auth/login` | Sign-in with email and password | ❌ No |
| `GET` | `/auth/google` | Google OAuth login redirect | ❌ No |
| `GET` | `/auth/google/callback` | Google OAuth callback and token generation | ❌ No |

---

### 2. User Profile Module (`/users`)
For viewing user profile information and updating only the user's name[cite: 1].

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/users/me` | Get current user profile data | 🔐 JWT |
| `PATCH` | `/users/me` | Update user's name (`fullName`) | 🔐 JWT |

---

### 3. Notebook Module (`/notebooks`)
Category/Notebook management for organizing encrypted notes[cite: 1].

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/notebooks` | Create a new notebook | 🔐 JWT |
| `GET` | `/notebooks` | Read all user notebooks | 🔐 JWT |
| `GET` | `/notebooks/:id` | Get details of a specific notebook | 🔐 JWT |
| `PATCH` | `/notebooks/:id` | Update notebook name, color, or icon | 🔐 JWT |
| `DELETE` | `/notebooks/:id` | Delete a notebook | 🔐 JWT |

---

### 4. Note Module (`/notes`)
Zero-knowledge encrypted data storage, pinning, soft delete, and permanent deletion lifecycle management[cite: 1].

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/notes` | Create a new encrypted note | 🔐 JWT |
| `GET` | `/notes` | Load list of all active notes | 🔐 JWT |
| `GET` | `/notes/trash` | [Static] List of notes in trash / soft-deleted | 🔐 JWT |
| `DELETE` | `/notes/trash/empty` | [Static] Empty all notes from trash at once | 🔐 JWT |
| `GET` | `/notes/:id` | Get a specific encrypted note | 🔐 JWT |
| `PATCH` | `/notes/:id` | Update note's encrypted data, tags, or color | 🔐 JWT |
| `PATCH` | `/notes/:id/restore` | Restore note from trash back to active list | 🔐 JWT |
| `DELETE` | `/notes/:id` | Soft-delete a note (move to trash) | 🔐 JWT |
| `DELETE` | `/notes/:id/permanent` | Permanently delete a note from the database | 🔐 JWT |

---

### 5. Audit Log Module (`/audit-logs`)
Transparency API used for user security tracking and activity feed[cite: 1].

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/audit-logs` | User security activity timeline history (with limits) | 🔐 JWT |