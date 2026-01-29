import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, Search } from 'lucide-react';
import { api } from '../services/api';

interface ServicePackage {
    id: string;
    name: string;
    description: string;
    price: number;
    items: string; // JSON string from backend
    isActive: boolean;
}

const ServiceCatalog = () => {
    const [services, setServices] = useState<ServicePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [editingService, setEditingService] = useState<ServicePackage | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        items: [] as string[]
    });
    const [newItem, setNewItem] = useState('');

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/services');
            setServices(data);
        } catch (error) {
            console.error('Failed to fetch services:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        try {
            setLoading(true);
            await api.post('/services/seed');
            fetchServices();
        } catch (error) {
            console.error('Failed to seed services:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = (service?: ServicePackage) => {
        if (service) {
            let parsedItems: string[] = [];
            try {
                parsedItems = JSON.parse(service.items);
            } catch (e) {
                parsedItems = [];
            }

            setEditingService(service);
            setFormData({
                name: service.name,
                description: service.description || '',
                price: service.price.toString(),
                items: parsedItems
            });
        } else {
            setEditingService(null);
            setFormData({ name: '', description: '', price: '', items: [] });
        }
        setIsModalOpen(true);
    };

    const handleAddItem = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newItem.trim()) {
            e.preventDefault();
            setFormData({ ...formData, items: [...formData.items, newItem.trim()] });
            setNewItem('');
        }
    };

    const handleRemoveItem = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const body = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                items: formData.items
            };

            if (editingService) {
                await api.put(`/services/${editingService.id}`, body);
            } else {
                await api.post('/services', body);
            }

            fetchServices();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to save service:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service package?')) return;

        try {
            await api.delete(`/services/${id}`);
            fetchServices();
        } catch (error) {
            console.error('Failed to delete service:', error);
        }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Service Catalog</h1>
                    <p className="text-slate-500">Manage your service packages and proposals</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <Plus size={20} /> New Service
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                        <p className="text-slate-500">Loading services...</p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        <div className="max-w-md mx-auto">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">No service packages found</h3>
                            <p className="text-slate-500 mb-6">
                                {searchTerm
                                    ? `No services matching "${searchTerm}"`
                                    : "Get started by creating your first service package or use our templates."}
                            </p>
                            {!searchTerm && (
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => handleOpenModal()}
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Create Custom
                                    </button>
                                    <button
                                        onClick={handleSeed}
                                        className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                        Use Templates
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    filteredServices.map((service) => {
                        let items: string[] = [];
                        try { items = JSON.parse(service.items); } catch (e) { }

                        return (
                            <div key={service.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-slate-900">{service.name}</h3>
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold text-sm">
                                            ${service.price}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{service.description}</p>

                                    <div className="space-y-2 mb-6">
                                        {items.slice(0, 3).map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                <Check size={14} className="text-emerald-500" />
                                                <span className="truncate">{item}</span>
                                            </div>
                                        ))}
                                        {items.length > 3 && (
                                            <p className="text-xs text-slate-400 pl-6">+{items.length - 3} more items</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => handleOpenModal(service)}
                                            className="flex-1 py-2 text-slate-600 font-medium text-sm bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Edit2 size={16} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(service.id)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-900">
                                {editingService ? 'Edit Service Package' : 'New Service Package'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Package Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Deep Cleaning"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Base Price ($)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Brief description of this service..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Checklist Items (What's included?)</label>
                                <div className="space-y-2 mb-3">
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg group">
                                            <Check size={16} className="text-emerald-500 flex-shrink-0" />
                                            <span className="flex-1 text-sm text-slate-700">{item}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type item and press Enter..."
                                        value={newItem}
                                        onChange={e => setNewItem(e.target.value)}
                                        onKeyDown={handleAddItem}
                                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (newItem.trim()) {
                                                setFormData({ ...formData, items: [...formData.items, newItem.trim()] });
                                                setNewItem('');
                                            }
                                        }}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02]"
                                >
                                    {editingService ? 'Save Changes' : 'Create Package'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceCatalog;
