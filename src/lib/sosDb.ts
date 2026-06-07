
export interface SOSAlert {
    id: string;
    userId: string | null; // Can be null if guest/anonymous
    userName: string; // Helper for display
    latitude: number | null;
    longitude: number | null;
    timestamp: string;
    status: 'active' | 'resolved' | 'false_alarm';
}

const SOS_STORAGE_KEY = 'suraksha_sos_alerts';

export class SOSDb {
    private static getAlerts(): SOSAlert[] {
        const stored = localStorage.getItem(SOS_STORAGE_KEY);
        try {
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to parse SOS alerts:', e);
            return [];
        }
    }

    private static saveAlerts(alerts: SOSAlert[]) {
        localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(alerts));
    }

    static getAll(): SOSAlert[] {
        return this.getAlerts().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    static getActive(): SOSAlert[] {
        return this.getAll().filter(a => a.status === 'active');
    }

    static create(alert: Omit<SOSAlert, 'id' | 'timestamp' | 'status'>): SOSAlert {
        const alerts = this.getAlerts();

        const newAlert: SOSAlert = {
            ...alert,
            id: `sos-${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: 'active'
        };

        alerts.unshift(newAlert); // Add to beginning
        this.saveAlerts(alerts);
        return newAlert;
    }

    static updateStatus(id: string, status: SOSAlert['status']): void {
        const alerts = this.getAlerts();
        const index = alerts.findIndex(a => a.id === id);

        if (index !== -1) {
            alerts[index].status = status;
            this.saveAlerts(alerts);
        }
    }

    static resolve(id: string): void {
        this.updateStatus(id, 'resolved');
    }
}
