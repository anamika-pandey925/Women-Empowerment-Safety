import { useState } from 'react';
import { Users, Trash2, Plus, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';

export function ContactsManager() {
    const { contacts, setContacts, t } = useSettings();
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    const addContact = () => {
        if (!newName || !newPhone) {
            toast.error(t('contacts.error.incomplete'));
            return;
        }
        // Basic validation
        if (newPhone.length < 3) {
            toast.error(t('contacts.error.phone'));
            return;
        }

        setContacts([...contacts, { id: Date.now().toString(), name: newName, phone: newPhone }]);
        setNewName('');
        setNewPhone('');
        toast.success(t('contacts.success.added'));
    };

    const removeContact = (id: string) => {
        setContacts(contacts.filter(c => c.id !== id));
        toast.success(t('contacts.success.removed'));
    };

    return (
        <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" /> {t('contacts.title')}
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400/80 mb-4">
                    {t('contacts.desc')}
                </p>

                <div className="space-y-2 mb-4">
                    {contacts.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-red-100 dark:border-red-900/30 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{contact.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> {contact.phone}
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => removeContact(contact.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    {contacts.length === 0 && (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                            {t('contacts.empty')}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-2">
                        <Input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder={t('contacts.add.name')}
                            className="h-9 text-sm bg-white dark:bg-gray-800"
                        />
                        <div className="flex gap-2">
                            <Input
                                value={newPhone}
                                onChange={e => setNewPhone(e.target.value)}
                                placeholder={t('contacts.add.phone')}
                                className="h-9 text-sm bg-white dark:bg-gray-800"
                            />
                            <Button onClick={addContact} size="icon" className="h-9 w-9 shrink-0 bg-red-600 hover:bg-red-700 text-white">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
