import React, { useState, useEffect, useRef } from 'react';
import { Ticket, SupplyItem } from '../../types';
import { Modal } from '../common/Modal';
import { Printer, Grid, Tag, RotateCcw, Sparkles } from 'lucide-react';

interface TicketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  draftNotes?: string;
  draftSupplies?: SupplyItem[];
  draftScheduledAt?: string;
  draftStatus?: string;
  technicianName?: string;
}

type PrintLayout = 'a4_4up' | 'single_sticker';
type FillMode = 'prefill' | 'blank_dots';

export const TicketPrintModal: React.FC<TicketPrintModalProps> = ({
  isOpen,
  onClose,
  ticket,
  draftNotes,
  technicianName,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Mặc định in 1 miếng nhỏ (in tem dán)
  const [layout, setLayout] = useState<PrintLayout>('single_sticker');
  // Số lượng bản in trên tờ A4 (1, 2, hoặc 4 ô)
  const [slotsCount, setSlotsCount] = useState<1 | 2 | 4>(4);
  // Chế độ điền sẵn hay để dấu chấm ghi tay
  const [fillMode, setFillMode] = useState<FillMode>('prefill');

  // Các trường dữ liệu đúng theo mẫu "Phiếu kiểm tra - Bộ phận Công nghệ thông tin"
  const [unitName, setUnitName] = useState('');
  const [machineModel, setMachineModel] = useState('');
  const [machineConfig, setMachineConfig] = useState('');
  const [machineCondition, setMachineCondition] = useState('');
  const [inspectDate, setInspectDate] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [showTicketCode, setShowTicketCode] = useState(true);

  const getTodayStr = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const applyPrefill = () => {
    if (!ticket) return;
    setFillMode('prefill');
    setUnitName(ticket.departmentName || '');
    setMachineModel('');
    setMachineConfig('');
    const note = (draftNotes !== undefined ? draftNotes : (ticket.processNote || ticket.technicalNotes || '')).trim();
    const cond = note ? `${ticket.title} — ${note}` : (ticket.description || ticket.title || '');
    setMachineCondition(cond);
    setInspectDate(getTodayStr());
    setInspectorName(ticket.assigneeName || technicianName || '');
  };

  const applyBlankDots = () => {
    setFillMode('blank_dots');
    setUnitName('');
    setMachineModel('');
    setMachineConfig('');
    setMachineCondition('');
    setInspectDate('');
    setInspectorName('');
  };

  useEffect(() => {
    if (ticket && isOpen) {
      applyPrefill();
    }
  }, [ticket, draftNotes, isOpen]);

  if (!ticket) return null;

  const handleTriggerPrint = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const is4Up = layout === 'a4_4up';

    const renderSlipHtml = (isEmptySlot = false) => {
      if (isEmptySlot) {
        return `<div class="slip empty-slot"></div>`;
      }

      const unitVal = unitName.trim();
      const modelVal = machineModel.trim();
      const configVal = machineConfig.trim();
      const condVal = machineCondition.trim();
      const dateVal = inspectDate.trim();
      const inspectorVal = inspectorName.trim();

      return `
        <div class="slip">
          <div class="slip-header">
            <div class="slip-title">Phiếu kiểm tra</div>
            <div class="slip-subtitle">Bộ phận Công nghệ thông tin</div>
            ${showTicketCode && ticket.code ? `<div class="slip-code">Mã phiếu: ${ticket.code}</div>` : ''}
          </div>

          <div class="slip-body">
            <div class="field-row">
              <span class="field-label">Đơn vị:</span>
              ${
                unitVal
                  ? `<span class="field-value">${unitVal}</span>`
                  : `<span class="field-dots">.............................................</span>`
              }
            </div>

            <div class="field-row">
              <span class="field-label">Dòng máy:</span>
              ${
                modelVal
                  ? `<span class="field-value">${modelVal}</span>`
                  : `<span class="field-dots">.........................................</span>`
              }
            </div>

            <div class="field-row">
              <span class="field-label">Cấu hình:</span>
              ${
                configVal
                  ? `<span class="field-value">${configVal}</span>`
                  : `<span class="field-dots">..........................................</span>`
              }
            </div>

            <div class="field-block">
              <div class="field-label" style="margin-bottom: 2px;">Tình trạng máy:</div>
              ${
                condVal
                  ? `<div class="cond-value">${condVal}</div>`
                  : `
                    <div class="dot-line">.................................................................................................................</div>
                    <div class="dot-line">.................................................................................................................</div>
                    <div class="dot-line">.................................................................................................................</div>
                  `
              }
            </div>

            <div class="field-row" style="margin-top: 6px;">
              <span class="field-label">Ngày kiểm tra:</span>
              ${
                dateVal
                  ? `<span class="field-value">${dateVal}</span>`
                  : `<span class="field-dots">.../.../....</span>`
              }
            </div>

            <div class="field-row">
              <span class="field-label">Cán bộ kiểm tra:</span>
              ${
                inspectorVal
                  ? `<span class="field-value">${inspectorVal}</span>`
                  : `<span class="field-dots">...................................</span>`
              }
            </div>
          </div>
        </div>
      `;
    };

    const bodyHtml = is4Up
      ? `
        <div class="grid-4up">
          ${[0, 1, 2, 3].map((idx) => renderSlipHtml(idx >= slotsCount)).join('')}
        </div>
      `
      : `
        <div class="single-sticker-wrap">
          ${renderSlipHtml(false)}
        </div>
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Phiếu kiểm tra - ${ticket.code}</title>
        <style>
          @page {
            size: ${is4Up ? 'A4 landscape' : '105mm 74mm'};
            margin: ${is4Up ? '8mm' : '3mm'};
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Lưới 4 miếng trên 1 tờ A4 */
          .grid-4up {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            width: 100%;
            height: calc(100vh - 2px);
            border: 1.5px solid #222;
          }
          .grid-4up .slip {
            border: 1px solid #222;
            padding: 14px 18px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .grid-4up .empty-slot {
            border: 1px dashed #ccc;
          }

          /* Chế độ in 1 tem dán rời */
          .single-sticker-wrap {
            width: 100%;
            max-width: 100mm;
            margin: 0 auto;
          }
          .single-sticker-wrap .slip {
            border: 1.5px solid #000;
            padding: 10px 12px;
            border-radius: 4px;
          }

          .slip-header {
            text-align: center;
            margin-bottom: 10px;
          }
          .slip-title {
            font-size: ${is4Up ? '15pt' : '12.5pt'};
            font-weight: 700;
            line-height: 1.25;
          }
          .slip-subtitle {
            font-size: ${is4Up ? '11.5pt' : '9.5pt'};
            font-style: italic;
            margin-top: 2px;
          }
          .slip-code {
            font-size: ${is4Up ? '9.5pt' : '8pt'};
            font-family: monospace;
            margin-top: 2px;
            color: #333;
          }

          .slip-body {
            font-size: ${is4Up ? '12.5pt' : '10pt'};
            line-height: ${is4Up ? '1.65' : '1.45'};
          }
          .field-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
            margin-bottom: 2px;
          }
          .field-label {
            font-weight: 700;
            white-space: nowrap;
          }
          .field-value {
            font-weight: 600;
            border-bottom: 1px dotted #333;
            flex: 1;
            padding-bottom: 1px;
          }
          .field-dots {
            color: #222;
            overflow: hidden;
            white-space: nowrap;
            flex: 1;
          }
          .field-block {
            margin: 4px 0;
          }
          .cond-value {
            border-bottom: 1px dotted #333;
            min-height: ${is4Up ? '64px' : '44px'};
            line-height: 1.5;
            padding: 2px 0;
            word-break: break-word;
          }
          .dot-line {
            overflow: hidden;
            white-space: nowrap;
            color: #222;
            line-height: ${is4Up ? '1.6' : '1.4'};
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 200);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Component hiển thị 1 ô phiếu kiểm tra trên màn hình Preview
  const renderPreviewSlip = (index: number, isEmpty = false) => {
    if (isEmpty) {
      return (
        <div
          key={index}
          className="border border-dashed border-neutral-300 bg-neutral-50/50 p-4 flex items-center justify-center text-xs text-neutral-400 italic min-h-[230px]"
        >
          Ô trống (Không in)
        </div>
      );
    }

    return (
      <div
        key={index}
        className="border border-neutral-800 bg-white p-4 sm:p-5 text-neutral-900 flex flex-col justify-between shadow-2xs"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {/* Tiêu đề giữa giống hệt mẫu */}
        <div className="text-center mb-3">
          <div className="font-bold text-sm sm:text-base text-neutral-900 leading-snug">
            Phiếu kiểm tra
          </div>
          <div className="italic text-xs text-neutral-700">
            Bộ phận Công nghệ thông tin
          </div>
          {showTicketCode && ticket.code && (
            <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
              Mã phiếu: {ticket.code}
            </div>
          )}
        </div>

        {/* Nội dung các dòng */}
        <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold shrink-0">Đơn vị:</span>
            {unitName.trim() ? (
              <span className="font-semibold border-b border-dotted border-neutral-500 flex-1 truncate">
                {unitName}
              </span>
            ) : (
              <span className="text-neutral-500 tracking-wider overflow-hidden whitespace-nowrap flex-1">
                .............................................
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="font-bold shrink-0">Dòng máy:</span>
            {machineModel.trim() ? (
              <span className="font-semibold border-b border-dotted border-neutral-500 flex-1 truncate">
                {machineModel}
              </span>
            ) : (
              <span className="text-neutral-500 tracking-wider overflow-hidden whitespace-nowrap flex-1">
                .........................................
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="font-bold shrink-0">Cấu hình:</span>
            {machineConfig.trim() ? (
              <span className="font-semibold border-b border-dotted border-neutral-500 flex-1 truncate">
                {machineConfig}
              </span>
            ) : (
              <span className="text-neutral-500 tracking-wider overflow-hidden whitespace-nowrap flex-1">
                ..........................................
              </span>
            )}
          </div>

          <div className="pt-0.5">
            <div className="font-bold">Tình trạng máy:</div>
            {machineCondition.trim() ? (
              <div className="text-xs font-medium border-b border-dotted border-neutral-500 py-1 min-h-[48px] line-clamp-3">
                {machineCondition}
              </div>
            ) : (
              <div className="text-neutral-500 tracking-wider leading-5 overflow-hidden">
                <div className="truncate">................................................................................................</div>
                <div className="truncate">................................................................................................</div>
                <div className="truncate">................................................................................................</div>
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="font-bold shrink-0">Ngày kiểm tra:</span>
            {inspectDate.trim() ? (
              <span className="font-semibold">{inspectDate}</span>
            ) : (
              <span className="text-neutral-500">.../.../....</span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="font-bold shrink-0">Cán bộ kiểm tra:</span>
            {inspectorName.trim() ? (
              <span className="font-semibold border-b border-dotted border-neutral-500 flex-1 truncate">
                {inspectorName}
              </span>
            ) : (
              <span className="text-neutral-500 tracking-wider overflow-hidden whitespace-nowrap flex-1">
                ...................................
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="In Phiếu Kiểm Tra Thiết Bị (Tem Dán / A4 4 Miếng)"
      subtitle={`Mã phiếu: ${ticket.code} — Bộ phận Công nghệ thông tin`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* 1. Chọn kiểu in: 1 miếng tem dán vs 4 miếng trên 1 A4 */}
        <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLayout('single_sticker')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  layout === 'single_sticker'
                    ? 'bg-[#B71C1C] text-white border-[#B71C1C] shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                In 1 miếng nhỏ (In tem dán)
              </button>

              <button
                type="button"
                onClick={() => setLayout('a4_4up')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  layout === 'a4_4up'
                    ? 'bg-[#B71C1C] text-white border-[#B71C1C] shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Khổ A4 chia 4 miếng (2x2)
              </button>
            </div>

            {/* Nút tự điền hoặc để trống chấm ghi tay */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={applyPrefill}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                  fillMode === 'prefill'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                Tự điền từ phiếu
              </button>
              <button
                type="button"
                onClick={applyBlankDots}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                  fillMode === 'blank_dots'
                    ? 'bg-neutral-800 text-white border-neutral-800'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                Để trống ghi tay (...)
              </button>
            </div>
          </div>

          {/* Tùy chọn phụ khi in A4 4 miếng */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-200/80 text-xs">
            {layout === 'a4_4up' ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-600">Số miếng cần in trên tờ A4:</span>
                {([4, 2, 1] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSlotsCount(n)}
                    className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer ${
                      slotsCount === n
                        ? 'bg-red-50 text-[#B71C1C] border-[#B71C1C]'
                        : 'bg-white text-neutral-600 border-neutral-300'
                    }`}
                  >
                    {n} miếng
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-neutral-500 text-[11px]">
                
              </div>
            )}

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-neutral-700 font-medium">
              <input
                type="checkbox"
                checked={showTicketCode}
                onChange={(e) => setShowTicketCode(e.target.checked)}
                className="rounded border-neutral-300 text-[#B71C1C] focus:ring-[#B71C1C]"
              />
              <span>Kèm mã phiếu ({ticket.code})</span>
            </label>
          </div>

          {/* Các ô nhập nhanh nội dung in lên tem */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Đơn vị:
              </label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Để trống = hiện dòng chấm ......"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:border-[#B71C1C] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Dòng máy:
              </label>
              <input
                type="text"
                value={machineModel}
                onChange={(e) => setMachineModel(e.target.value)}
                placeholder="VD: PC Dell Optiplex / HP ProBook..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:border-[#B71C1C] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Cấu hình:
              </label>
              <input
                type="text"
                value={machineConfig}
                onChange={(e) => setMachineConfig(e.target.value)}
                placeholder="VD: i5-12500 / RAM 16GB / SSD 512G"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:border-[#B71C1C] outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Tình trạng máy:
              </label>
              <input
                type="text"
                value={machineCondition}
                onChange={(e) => setMachineCondition(e.target.value)}
                placeholder="Để trống = hiện 3 hàng chấm (................................) để ghi tay"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:border-[#B71C1C] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Ngày kiểm tra:
              </label>
              <input
                type="text"
                value={inspectDate}
                onChange={(e) => setInspectDate(e.target.value)}
                placeholder=".../.../...."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:border-[#B71C1C] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Cán bộ kiểm tra:
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Để trống = hiện dòng chấm ......"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:border-[#B71C1C] outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Khung Xem Trước (Preview) */}
        <div className="bg-neutral-200/70 p-4 rounded-2xl border border-neutral-300 max-h-[52vh] overflow-y-auto">
          <div ref={printAreaRef}>
            {layout === 'a4_4up' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 border border-neutral-800 bg-white shadow-sm">
                {[0, 1, 2, 3].map((idx) => renderPreviewSlip(idx, idx >= slotsCount))}
              </div>
            ) : (
              <div className="max-w-sm mx-auto">
                {renderPreviewSlip(0, false)}
              </div>
            )}
          </div>
        </div>

        {/* 3. Nút bấm In */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <span className="text-xs text-neutral-500">
            {layout === 'a4_4up'
              ? `Đang chọn: In ${slotsCount} miếng trên 1 tờ A4 (cắt/bóc dán lên máy)`
              : 'Đang chọn: In 1 tem rời nhỏ gọn (dùng cho máy in tem nhãn / decal)'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#FFD700]" />
              <span>
                {layout === 'a4_4up' ? 'IN KHỔ A4 (4 MIẾNG)' : 'IN TEM DÁN NGAY'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
