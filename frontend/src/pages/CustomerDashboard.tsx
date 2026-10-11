import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Ticket } from '../types';
import { Header } from '../components/common/Header';
import { TicketForm } from '../components/tickets/TicketForm';
import { TicketCard } from '../components/tickets/TicketCard';
import { TicketDetail } from '../components/tickets/TicketDetail';
import { RatingModal } from '../components/tickets/RatingModal';
import { Modal } from '../components/common/Modal';
import { PlusCircle, Layers, Inbox } from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'my-tickets'>('my-tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<Ticket | null>(null);
  const [selectedTicketForRate, setSelectedTicketForRate] = useState<Ticket | null>(null);

  const loadTickets = async () => {
    try {
      const all = await apiClient.getTickets({ limit: 200 });
      const my = user
        ? all.filter((t) => t.creatorId === user.id || t.creatorName === user.fullName)
        : all;
      setTickets(my);
    } catch (err) {
      console.error('Lỗi tải tickets:', err);
    }
  };

  useEffect(() => {
    loadTickets();
    const timer = setInterval(loadTickets, 30000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const handleTicketCreated = () => {
    loadTickets();
    setActiveTab('my-tickets');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('my-tickets')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'my-tickets'
                  ? 'bg-[#B71C1C] text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Phiếu của tôi ({tickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-[#B71C1C] text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-[#FFD700]" />
              <span>+ Tạo phiếu mới</span>
            </button>
          </div>


        </div>

        {activeTab === 'create' && (
          <TicketForm onSuccess={handleTicketCreated} />
        )}

        {activeTab === 'my-tickets' && (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200/90 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-neutral-800 text-base">Chưa có phiếu yêu cầu nào</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  Hãy bấm "Tạo phiếu mới" để gửi yêu cầu hỗ trợ.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onViewDetail={(item) => setSelectedTicketForDetail(item)}
                    onRate={(item) => setSelectedTicketForRate(item)}
                    showRateButton={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Modal
        isOpen={!!selectedTicketForDetail}
        onClose={() => setSelectedTicketForDetail(null)}
        title="Chi tiết phiếu"
        subtitle={`Mã phiếu: ${selectedTicketForDetail?.code}`}
        maxWidth="2xl"
      >
        {selectedTicketForDetail && (
          <TicketDetail
            ticket={selectedTicketForDetail}
            onClose={() => setSelectedTicketForDetail(null)}
            canRate={true}
            onRate={() => {
              const current = selectedTicketForDetail;
              setSelectedTicketForDetail(null);
              setSelectedTicketForRate(current);
            }}
          />
        )}
      </Modal>

      <RatingModal
        isOpen={!!selectedTicketForRate}
        onClose={() => setSelectedTicketForRate(null)}
        ticket={selectedTicketForRate}
        onRated={loadTickets}
      />
    </div>
  );
};