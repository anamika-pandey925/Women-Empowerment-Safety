
export interface User {
    id: string;
    name: string;
    email: string;
    password: string; // In a real app, this should be hashed
    phone: string;
    role: 'user' | 'admin';
    emergencyContacts: { name: string; phone: string }[];
    createdAt: string;
}

const STORAGE_KEY = 'suraksha_users';
const CURRENT_USER_KEY = 'suraksha_current_user';

// Initial admin user
const ADMIN_USER: User = {
    id: 'admin-001',
    name: 'System Admin',
    email: 'admin@suraksha.org',
    password: 'admin', // Simple password for demo
    phone: '0000000000',
    role: 'admin',
    emergencyContacts: [],
    createdAt: new Date().toISOString()
};

export class UserDb {
    private static getUsers(): User[] {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            // Initialize with admin user if empty
            const initial = [ADMIN_USER];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
            return initial;
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse users:', e);
            return [ADMIN_USER];
        }
    }

    private static saveUsers(users: User[]) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }

    static getAll(): User[] {
        return this.getUsers();
    }

    static getById(id: string): User | undefined {
        return this.getUsers().find(u => u.id === id);
    }

    static getByEmail(email: string): User | undefined {
        return this.getUsers().find(u => u.email === email);
    }

    static create(user: Omit<User, 'id' | 'createdAt'>): User {
        const users = this.getUsers();
        if (users.find(u => u.email === user.email)) {
            throw new Error('User with this email already exists');
        }

        const newUser: User = {
            ...user,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);
        return newUser;
    }

    static update(id: string, updates: Partial<User>): User {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === id);

        if (index === -1) throw new Error('User not found');

        const updatedUser = { ...users[index], ...updates };
        users[index] = updatedUser;
        this.saveUsers(users);

        // meaningful update to current user session if needed
        const currentUser = this.getCurrentSession();
        if (currentUser && currentUser.id === id) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
        }

        return updatedUser;
    }

    static delete(id: string) {
        const users = this.getUsers().filter(u => u.id !== id);
        this.saveUsers(users);
    }

    static login(email: string, password: string): User | null {
        const user = this.getByEmail(email);
        if (user && user.password === password) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
            return user;
        }
        return null;
    }

    static logout() {
        localStorage.removeItem(CURRENT_USER_KEY);
    }

    static getCurrentSession(): User | null {
        const stored = localStorage.getItem(CURRENT_USER_KEY);
        try {
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.error('Failed to parse current session:', e);
            localStorage.removeItem(CURRENT_USER_KEY);
            return null;
        }
    }
}
