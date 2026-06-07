export interface VideoReport {
    id: string;
    timestamp: number;
    description: string;
    location?: string;
    status: 'pending' | 'viewed' | 'action_taken';
    videoUrl?: string; // Mock URL or base64
    fileName?: string;
}

const STORAGE_KEY = 'suraksha-video-reports';

export const VideoDb = {
    getAll: (): VideoReport[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    add: (report: Omit<VideoReport, 'id' | 'timestamp' | 'status'>) => {
        const reports = VideoDb.getAll();
        const newReport: VideoReport = {
            ...report,
            id: Date.now().toString(),
            timestamp: Date.now(),
            status: 'pending',
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newReport, ...reports]));
        return newReport;
    },

    updateStatus: (id: string, status: VideoReport['status']) => {
        const reports = VideoDb.getAll();
        const updated = reports.map(r => r.id === id ? { ...r, status } : r);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },

    delete: (id: string) => {
        const reports = VideoDb.getAll();
        const updated = reports.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
};
