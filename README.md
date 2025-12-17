# OrgFlow

Hi! This is **OrgFlow**, a full-stack project management tool I built to streamline task tracking within organizations using **Django** and **React**.

This project was a deep dive for me into **GraphQL** APIs, managing complex state in React, and implementing secure Role-Based Access Control (RBAC).

## 💡 What it does (Features)

I focused on creating a smooth workflow for teams. Here are the core features I implemented:

* **Multi-Organization Architecture:** You aren't stuck in one workspace. Users can register their own organizations or join existing ones.
* **Interactive Kanban Board:** I built a drag-and-drop board where you can move tasks between "Todo", "In Progress", and "Done". It feels tactile and responsive.
* **Smart Permissions (RBAC):** This was a key challenge. I set it up so **Admins (Organization Owners)** have full control (like assigning tasks), while standard **Members** can contribute (comment, move tasks) but can't override administrative decisions.
* **Optimistic UI Updates:** The UI updates instantly when you drag a task or edit details, and it syncs with the server in the background.
* **Secure Authentication:** Fully implemented JWT (JSON Web Token) authentication for login and registration.
* **Context-Aware Comments:** Every task has its own discussion thread so the team can collaborate right where the work happens.

## 🛠️ The Tech Stack

I chose this stack to leverage the robustness of Python for the backend and the speed of React for the frontend.

* **Backend:** Python, Django, Graphene-Django (GraphQL), PostgreSQL.
* **Frontend:** React (v18), TypeScript, Apollo Client.
* **Styling:** Tailwind CSS (for that modern, clean look).
* **Auth:** Django GraphQL JWT.

---

## 💻 How to Run This Locally

### Prerequisites

You'll need **Python**, **Node.js**, and **PostgreSQL** installed.

### 1. Clone the Repo


clone the repository
```bash

cd OrgFlow

```

### 2. Setting up the Backend (Django)

Navigate to the backend folder and set up the environment.

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

```

**Database Setup:**
Make sure you have a Postgres database created (I named mine `minipm` locally, but you can change it in `settings.py`).

```bash
# Apply migrations to create the database schema
python manage.py makemigrations
python manage.py migrate

# Start the server
python manage.py runserver

```

The backend should now be running at `http://127.0.0.1:8000/`.

### 3. Setting up the Frontend (React)

Open a new terminal terminal, go to the frontend folder, and fire it up.

```bash
cd frontend

# Install the node modules
npm install

# Start the React development server
npm start

```

The app will open at `http://localhost:3000`.

---

## 🧪 Testing the Permissions

To see the role-based logic in action:

1. **Register** a new user and create an Organization (e.g., "My Startup"). You are now the **Admin**.
2. Create a Project and add some tasks.
3. (Optional) Open an incognito window, register a *second* user, and use the **exact same Organization Name** during signup. This user will join as a **Member**.
4. Notice how the "Admin" can change Assignees, but the "Member" sees that field as read-only.

---

Thanks for checking it out! 🚀
