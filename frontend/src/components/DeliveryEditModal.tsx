"use client";
import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { showToast } from "@/lib/toast";

type Delivery = {
  id: string;
  date: string;
  timeSlot: string;
  shopName: string;
  shopAddress?: string;
  bags: number;
  status: "scheduled" | "confirmed" | "in_progress" | "delivered" | "cancelled";
  totalAmount: number;
  notes?: string;
  createdAt: string;
};

type DeliveryEditPayload = {
  id: string;
  date: string;
  timeSlot: string;
  bags: number;
  notes?: string;
};

type DeliveryEditModalProps = {
  delivery: Delivery | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: DeliveryEditPayload) => Promise<void> | void;
};

export default function DeliveryEditModal({
  delivery,
  isOpen,
  onClose,
  onSave,
}: DeliveryEditModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    timeSlot: '',
    bags: 1,
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Générer les créneaux horaires disponibles
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endHour = minute === 30 ? hour + 1 : hour;
        const endMinute = minute === 30 ? 0 : 30;
        const endTimeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        slots.push(`${timeString}-${endTimeString}`);
      }
    }
    return slots;
  };

  useEffect(() => {
    if (delivery) {
      const deliveryDate = new Date(delivery.date);
      setFormData({
        date: deliveryDate.toISOString().split('T')[0],
        timeSlot: delivery.timeSlot,
        bags: delivery.bags,
        notes: delivery.notes || ''
      });
      setAvailableTimeSlots(generateTimeSlots());
    }
  }, [delivery]);

  const calculatePrice = (bags: number) => {
    // Logique de tarification DringDring
    if (bags <= 2) return 15.0;
    if (bags <= 4) return 30.0;
    if (bags <= 6) return 45.0;
    if (bags <= 8) return 60.0;
    if (bags <= 10) return 75.0;
    return (Math.floor((bags - 1) / 2) + 1) * 15.0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivery) return;

    setIsLoading(true);
    try {
      const updatedDelivery: DeliveryEditPayload = {
        id: delivery.id,
        date: new Date(
          `${formData.date}T${formData.timeSlot.split("-")[0]}:00`
        ).toISOString(),
        timeSlot: formData.timeSlot,
        bags: formData.bags,
        notes: formData.notes || undefined,
      };

      await Promise.resolve(onSave(updatedDelivery));
      showToast("Livraison modifiée avec succès", "success");
      onClose();
    } catch (error: any) {
      console.error("Erreur modification livraison:", error);
      showToast("Erreur lors de la modification de la livraison", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, date }));
    // Réinitialiser le créneau horaire si la date change
    if (formData.timeSlot) {
      setFormData(prev => ({ ...prev, timeSlot: '' }));
    }
  };

  if (!isOpen || !delivery) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Modifier la livraison
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Magasin (lecture seule) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Magasin
            </label>
            <input
              type="text"
              value={delivery.shopName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de livraison *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Créneau horaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Créneau horaire *
            </label>
            <select
              value={formData.timeSlot}
              onChange={(e) => setFormData(prev => ({ ...prev, timeSlot: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un créneau</option>
              {availableTimeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>

          {/* Nombre de sacs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de sacs *
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  bags: Math.max(1, prev.bags - 1) 
                }))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
              >
                -
              </button>
              <input
                type="number"
                value={formData.bags}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  bags: Math.max(1, parseInt(e.target.value) || 1) 
                }))}
                min="1"
                max="20"
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  bags: Math.min(20, prev.bags + 1) 
                }))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Prix calculé */}
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Prix de la livraison :
              </span>
              <span className="text-lg font-bold text-blue-600">
                {calculatePrice(formData.bags).toFixed(2)} CHF
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tarif basé sur le nombre de sacs
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Instructions spéciales, informations de contact..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Modification...' : 'Modifier la livraison'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



