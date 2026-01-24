import React from 'react';
import { ShiftOrdersSidebar } from './ShiftOrdersSidebar';
import { X } from 'lucide-react';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  onEditOrder: (order: any) => void;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  shiftId,
  onEditOrder
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-sm h-full bg-[#1C1C1E] shadow-2xl animate-slide-in-right flex flex-col border-l border-white/10">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex-1 min-h-0">
          <ShiftOrdersSidebar
            shiftId={shiftId}
            onEditOrder={onEditOrder}
          />
        </div>
      </div>
    </div>
  );
};
