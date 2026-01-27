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
        <div className="flex-1 min-h-0">
          <ShiftOrdersSidebar
            shiftId={shiftId}
            onEditOrder={onEditOrder}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
