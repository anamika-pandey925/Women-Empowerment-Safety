# Data Records & Schemas

The Suraksha platform stores data in two main locations: a backend relational database (MySQL) for secure persistent information, and frontend browser storage (LocalStorage) for rapid offline-capable state and caching.

## 1. MySQL Database 
**Database Name:** `suraksha_db`
This database handles primarily authentication and sensitive permanent user data.

### Table: `users`
| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `user_id` | `INT` (Primary Key, Auto Increment) | Unique identifier for the user. |
| `name` | `VARCHAR(255)` | User's full name. |
| `email` | `VARCHAR(255)` (Unique) | User's email address used for login. |
| `password` | `VARCHAR(255)` | `bcrypt` hashed password string. |
| `phone` | `VARCHAR(20)` | User's contact number (optional). |
| `emergency_contacts` | `JSON` | Array of emergency contacts (Not fully implemented on client). |
| `role` | `ENUM('user', 'admin')` | Defines permissions within the app (defaults to 'user'). |
| `created_at` | `TIMESTAMP` | Record creation date and time. |

---

## 2. Browser LocalStorage (Client-Side Storage)
Because the platform focuses on accessibility and speed, it heavily utilizes browser APIs to simulate complex backend systems without requiring a live server connection for every action.

### Key: `suraksha-settings`
**Type:** JSON Object
**Description:** Stores user configuration and application preferences.
**Structure:**
```json
{
  "theme": "light",          // or "dark", "system"
  "language": "en",          // or "hi" for Hindi
  "silentMode": false,       // Disables sounds/vibrations if true
  "volume": 80               // Volume percentage for media
}
```

### Key: `suraksha-forum-posts`
**Type:** JSON Array
**Description:** Stores community discussions, posts, anonymous reports, and "likes".
**Example Structure:**
```json
[
  {
    "id": 1,
    "author": "Ananya",
    "content": "The new street lights on MG Road have made a huge difference! feel much safer walking home.",
    "likes": 12,
    "time": "2 hours ago"
  },
  {
    "id": 1740761234,
    "author": "You",
    "content": "This is a new anonymous post.",
    "likes": 0,
    "time": "Just now"
  }
]
```

### Key: `suraksha-video-reports`
**Type:** JSON Array
**Description:** Stores local metadata and simulated video uploads for incidents submitted through the AISafetyDashboard.
**Structure (TypeScript Interface):**
```typescript
{
    id: string;               // e.g. "1740761234567"
    timestamp: number;        // Unix timestamp
    description: string;      // User description of the footage
    location?: string;        // Optional GPS or manual location
    status: "pending" | "viewed" | "action_taken"; 
    videoUrl?: string;        // Mock URL or base64 data string
    fileName?: string;        // Original file name (e.g. "incident.mp4")
}
```

## Summary
The system separates secure business logic (auth) into a traditional SQL structure, while employing the speed and flexibility of `localStorage` for community and incident features to ensure instant UI responsiveness and mock functionality for presentations.
