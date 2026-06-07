
import { Scale, Gavel, FileText, Globe } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export function RightsSection() {
    const { t } = useSettings();

    const rights = [
        {
            title: t('rights.dv.title'),
            desc: t('rights.dv.desc'),
            icon: Scale,
            color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
        },
        {
            title: t('rights.posh.title'),
            desc: t('rights.posh.desc'),
            icon: Gavel,
            color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
        },
        {
            title: t('rights.cyber.title'),
            desc: t('rights.cyber.desc'),
            icon: Globe,
            color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
        },
        {
            title: t('rights.fir.title'),
            desc: t('rights.fir.desc'),
            icon: FileText,
            color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
        }
    ];

    return (
        <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
            <div className="container px-4 mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4 text-suraksha-black dark:text-white">
                        {t('rights.title')}
                    </h2>
                    <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rights.map((right, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all flex gap-4"
                        >
                            <div className={`p-3 rounded-xl h-fit ${right.color}`}>
                                <right.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2 text-suraksha-black dark:text-white leading-tight">
                                    {right.title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {right.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
