import { X } from 'lucide-react';
import { CleaningTracker } from '../appointments/CleaningTracker';

interface CleaningTrackerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CleaningTrackerModal = ({ isOpen, onClose }: CleaningTrackerModalProps) => {
    if (!isOpen) return null;

    const mockAppointmentId = 'preview-123';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Visualização do Cliente
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            É assim que seu cliente vê o progresso
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <CleaningTracker appointmentId={mockAppointmentId} />
                </div>

                {/* Footer Hint */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Este link é enviado automaticamente pelo WhatsApp
                    </p>
                </div>
            </div>
        </div>
    );
};
