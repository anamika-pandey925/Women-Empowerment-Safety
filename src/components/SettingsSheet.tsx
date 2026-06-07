import { Settings, Moon, Sun, Languages, Shield, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { ContactsManager } from '@/components/ContactsManager';

export function SettingsSheet() {
    const {
        language, setLanguage,
        silentMode, setSilentMode,
        t
    } = useSettings();
    const { theme, setTheme } = useTheme();

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                    <Settings className="w-5 h-5" />
                </button>
            </SheetTrigger>
            <SheetContent className="w-[340px] sm:w-[500px] overflow-y-auto backdrop-blur-3xl bg-white/90 dark:bg-gray-950/90 border-l border-gray-200 dark:border-gray-800">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Settings className="w-6 h-6 text-primary" />
                        </div>
                        {t('settings.title')}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                        Adjust your general and safety settings.
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="general">{t('settings.tab.general')}</TabsTrigger>
                        <TabsTrigger value="safety">{t('settings.tab.safety')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6 animate-in slide-in-from-left-4 duration-300">

                        {/* Appearance */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                {t('settings.appearance')}
                            </h3>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-1 border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-medium">{t('settings.dark_mode')}</div>
                                            <div className="text-xs text-gray-500">{t('settings.dark_mode.desc')}</div>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={theme === 'dark'}
                                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                    />
                                </div>
                            </div>
                        </section>



                        {/* Language */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                {t('settings.language')} / भाषा
                            </h3>

                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                        <Languages className="w-5 h-5" />
                                    </div>
                                    <div className="font-medium">{t('settings.language')}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant={language === 'en' ? 'default' : 'outline'}
                                        onClick={() => setLanguage('en')}
                                        className="w-full justify-center"
                                    >
                                        English
                                    </Button>
                                    <Button
                                        variant={language === 'hi' ? 'default' : 'outline'}
                                        onClick={() => setLanguage('hi')}
                                        className={`w-full justify-center ${language === 'hi' ? 'font-bold' : ''}`}
                                    >
                                        हिंदी
                                    </Button>
                                </div>
                            </div>
                        </section>

                    </TabsContent>

                    <TabsContent value="safety" className="space-y-6 animate-in slide-in-from-right-4 duration-300">

                        <section className="space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 text-center">
                                <Shield className="w-12 h-12 text-red-500 mx-auto mb-2" />
                                <h3 className="font-bold text-red-700 dark:text-red-400">{t('settings.safety.title')}</h3>
                                <p className="text-sm text-red-600/80 dark:text-red-400/70">
                                    {t('settings.safety.desc')}
                                </p>
                            </div>

                            <ContactsManager />
                        </section>

                        <Separator />

                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                {t('settings.alert.title')}
                            </h3>

                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{t('settings.alert.silent')}</div>
                                        <div className="text-xs text-gray-500">{t('settings.alert.silent.desc')}</div>
                                    </div>
                                </div>
                                <Switch
                                    checked={silentMode}
                                    onCheckedChange={setSilentMode}
                                />
                            </div>
                        </section>

                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
