import { useMemo, useState } from "react";
import { Price, Room } from "../../../../shared/types";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtVnd(value: number) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;
}

function fmtPercent(value: number) {
  return `${Math.abs(Number(value || 0))}%`;
}

function statusLabel(status: string) {
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Đã từ chối";
  return "Chờ duyệt";
}

function statusTone(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-950">
      <span className="h-5 w-1 rounded-full bg-primary" />
      {children}
    </h4>
  );
}

function MiniIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eef2ff] text-primary">
      {children}
    </span>
  );
}

function InfoTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100/50">
      <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-[13.5px] font-extrabold leading-none text-slate-800">{value}</div>
      {hint && <div className="mt-1 text-[10px] font-semibold text-slate-500 leading-none">{hint}</div>}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {children}
    </div>
  );
}

export function RoomDetailModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const [selectedRoomPrice, setSelectedRoomPrice] = useState<Price | null>(null);
  const hotelFront = room.images.find((img) => img.category === "hotel_front")?.url || room.images[0]?.url;
  const gallery = room.images.slice(0, 5);
  const shortDescription = !room.description || room.description.trim().length < 80;

  const qualityHints = useMemo(() => {
    const hints: string[] = [];
    if (shortDescription) hints.push("Mô tả khách sạn còn ngắn");
    if (room.images.length < 5) hints.push("Nên bổ sung tối thiểu 5 ảnh");
    if (room.prices.some((price) => !price.imageUrls?.length)) hints.push("Một số loại phòng chưa có ảnh");
    if (!room.policy.cancellationNote && !room.policy.otherRules) hints.push("Chính sách lưu trú còn thiếu chi tiết");
    return hints;
  }, [room, shortDescription]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className="mb-8 flex w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur-md sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", statusTone(room.status))}>
                {statusLabel(room.status)}
              </span>
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                {room.roomType}
              </span>
              {room.pendingRequest && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                  Có yêu cầu chờ duyệt
                </span>
              )}
            </div>
            <h3 className="mt-1 truncate text-lg font-bold text-slate-950">{room.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid min-h-0 lg:grid-cols-[300px_1fr_310px] divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          <aside className="max-h-[calc(100vh-112px)] overflow-y-auto bg-slate-50/40 p-4 space-y-5">
             <div className="overflow-hidden rounded-md border border-slate-200/60 bg-slate-100 shadow-sm">
               {hotelFront ? (
                 <img src={hotelFront} alt={room.name} className="h-44 w-full object-cover sm:h-52 lg:h-44" />
               ) : (
                 <div className="flex h-44 items-center justify-center text-xs font-bold text-slate-400 sm:h-52 lg:h-44">Chưa có ảnh</div>
               )}
             </div>

             {gallery.length > 1 && (
               <div className="grid grid-cols-5 gap-1">
                 {gallery.map((image, index) => (
                   <div key={`${image.url}-${index}`} className="aspect-square overflow-hidden rounded bg-slate-100 border border-slate-200/60 transition hover:border-primary/50">
                     <img src={image.url} alt={image.caption || room.name} className="h-full w-full object-cover" />
                   </div>
                 ))}
               </div>
             )}

             <div className="space-y-3.5 px-1 py-2">
               <div>
                 <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Địa chỉ</div>
                 <div className="mt-1 text-xs font-semibold leading-normal text-slate-800">{room.address}</div>
               </div>
               
               {room.city && (
                 <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                   <span className="text-slate-400">Thành phố</span>
                   <span className="font-semibold text-slate-700">{room.city}</span>
                 </div>
               )}
               
               <div className="flex justify-between items-center text-xs pt-1">
                 <span className="text-slate-400">Tọa độ GPS</span>
                 <span className="font-mono text-[10px] text-slate-500 bg-slate-100/60 px-1.5 py-0.5 rounded">{room.latitude.toFixed(5)}, {room.longitude.toFixed(5)}</span>
               </div>
             </div>

             <div className="space-y-3 px-1 py-2 border-t border-slate-100 pt-4">
               <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Chính sách lưu trú</div>
               
               <div className="space-y-2 text-xs">
                 <div className="flex justify-between">
                   <span className="text-slate-500">Nhận/Trả phòng</span>
                   <span className="font-medium text-slate-800">{room.policy.checkInTime} - {room.policy.checkOutTime}</span>
                 </div>
                 
                 <div className="flex justify-between">
                   <span className="text-slate-500">Hủy phòng</span>
                   <span className={cn("font-medium", room.policy.refundable ? "text-emerald-600" : "text-amber-600")}>
                     {room.policy.refundable ? "Có hoàn tiền" : "Không hoàn tiền"}
                   </span>
                 </div>
                 {room.policy.refundable && room.policy.freeCancelHours && (
                   <div className="text-[10px] text-slate-400 text-right -mt-1">
                     Miễn phí trước {room.policy.freeCancelHours} giờ
                   </div>
                 )}
                 
                 <div className="flex justify-between pt-1 border-t border-slate-55">
                   <span className="text-slate-500">Thú cưng</span>
                   <span className="font-medium text-slate-700">{room.policy.petAllowed ? "Cho phép" : "Không cho phép"}</span>
                 </div>
                 
                 <div className="flex justify-between">
                   <span className="text-slate-500">Hút thuốc</span>
                   <span className="font-medium text-slate-700">{room.policy.smokingAllowed ? "Cho phép" : "Không cho phép"}</span>
                 </div>
               </div>
             </div>

             {qualityHints.length > 0 && (
               <div className="rounded-lg border border-amber-200/50 bg-amber-50/30 p-3 shadow-xs">
                 <div className="text-[9.5px] font-bold uppercase tracking-wider text-amber-800">Gợi ý cải thiện hồ sơ</div>
                 <ul className="mt-1.5 space-y-1 text-[11px] text-amber-850 font-medium">
                   {qualityHints.map((hint) => (
                     <li key={hint} className="flex items-start gap-1">
                       <span className="text-amber-400">•</span>
                       <span>{hint}</span>
                     </li>
                   ))}
                 </ul>
               </div>
             )}
          </aside>

          <main className="max-h-[calc(100vh-112px)] overflow-y-auto p-4 sm:p-5 space-y-5">
             {room.pendingRequest && (
               <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-3 text-xs text-amber-900 font-semibold shadow-xs">
                 Khách sạn đang có yêu cầu {room.pendingRequest.action === "delete" ? "xóa" : "cập nhật"} chờ admin duyệt.
               </div>
             )}

             {room.status === "rejected" && room.rejectReason && (
               <div className="rounded-lg border border-red-200 bg-red-50/40 p-3 text-xs text-red-700 font-semibold shadow-xs">
                 Lý do từ chối: {room.rejectReason}
               </div>
             )}

             <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
               <InfoTile label="Sức chứa" value={`${room.capacity} khách`} />
               <InfoTile label="Diện tích" value={room.area ? `${room.area} m²` : "-"} />
               <InfoTile label="Phí nền tảng" value={`${room.platformFeePct}%`} />
               <InfoTile label="Khuyến mãi" value={fmtPercent(room.promotionPct)} />
             </div>

             <section className="space-y-2">
               <SectionTitle>Giới thiệu</SectionTitle>
               {room.description ? (
                 <div className="rounded-lg border border-slate-200/60 bg-white p-3.5 text-xs leading-5 text-slate-700 shadow-xs">
                   {room.description}
                 </div>
               ) : (
                 <EmptyState>Chưa có mô tả khách sạn. Nên bổ sung mô tả rõ về vị trí, tiện nghi và trải nghiệm lưu trú.</EmptyState>
               )}
             </section>

             <section className="space-y-2.5">
               <SectionTitle>Các loại phòng ({room.prices.length})</SectionTitle>
               <div className="grid gap-2">
                 {room.prices.map((price, index) => (
                   <button
                     key={`${price.label}-${index}`}
                     type="button"
                     onClick={() => setSelectedRoomPrice(price)}
                     className="group grid w-full gap-3 rounded-lg border border-slate-200/60 bg-white p-2.5 text-left shadow-xs transition hover:border-primary hover:bg-[#fbfbff] sm:grid-cols-[80px_1fr_auto] items-center"
                   >
                     <div className="h-12 overflow-hidden rounded bg-slate-100 border border-slate-200/30 flex-shrink-0">
                       {price.imageUrls?.[0] ? (
                         <img src={price.imageUrls[0]} alt={price.label} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                       ) : (
                         <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-400">Chưa có ảnh</div>
                       )}
                     </div>

                     <div className="min-w-0">
                       <div className="flex flex-wrap items-center gap-1.5">
                         <h5 className="text-[12.5px] font-bold text-slate-900">{price.label}</h5>
                         <span className="rounded bg-slate-100/80 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-500">
                           {price.totalInventory ?? 0} phòng
                         </span>
                       </div>
                       <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400 font-semibold">
                         <span>{price.area || "-"} m²</span>
                         <span>{price.capacity || "-"} khách</span>
                         <span className="truncate">{price.bedInfo || "Chưa có thông tin giường"}</span>
                       </div>
                     </div>

                     <div className="flex items-center justify-between gap-3 sm:block sm:text-right mt-1 sm:mt-0">
                       <div>
                         <div className="text-[13px] font-extrabold text-primary">{fmtVnd(price.pricePerNight)}</div>
                         <div className="text-[8.5px] text-slate-400 leading-none">/ đêm</div>
                       </div>
                       <div className="mt-1 text-[9.5px] font-bold text-primary opacity-80 group-hover:underline">Xem chi tiết</div>
                     </div>
                   </button>
                 ))}
               </div>
             </section>
          </main>

          <aside className="max-h-[calc(100vh-112px)] overflow-y-auto bg-slate-50/20 p-4 space-y-5">
             <div className="space-y-2">
               <SectionTitle>Tiện ích chung</SectionTitle>
               {room.amenities.length > 0 ? (
                 <div className="flex flex-wrap gap-1">
                   {room.amenities
                     .filter(a => !a.toLowerCase().includes("agoda source"))
                     .map((item) => (
                       <span key={item} className="rounded bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-650">
                         {item}
                       </span>
                     ))}
                 </div>
               ) : (
                 <EmptyState>Chưa có tiện ích chung.</EmptyState>
               )}
             </div>

             <div className="space-y-2">
               <SectionTitle>Điểm nổi bật</SectionTitle>
               {room.highlights.length > 0 ? (
                 <div className="flex flex-wrap gap-1">
                   {room.highlights
                     .filter(h => !h.toLowerCase().includes("agoda source"))
                     .map((item) => (
                       <span key={item} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[9.5px] font-bold text-indigo-600">
                         {item}
                       </span>
                     ))}
                 </div>
               ) : (
                 <EmptyState>Chưa có điểm nổi bật.</EmptyState>
               )}
             </div>

             <div className="space-y-2 border-t pt-4 border-slate-100/60">
               <SectionTitle>Kết nối giao thông</SectionTitle>
               {room.transportConnections && room.transportConnections.length > 0 ? (
                 <div className="space-y-2.5 pr-1">
                   {room.transportConnections.map((item, index) => (
                     <div key={index} className="flex items-center justify-between text-[11px] text-slate-600">
                       <div className="min-w-0 flex-1 pr-3 truncate">
                         <span className="font-semibold text-slate-800">{item.name}</span>
                         {item.note && <span className="ml-1 text-[9.5px] text-slate-400">({item.note})</span>}
                       </div>
                       <span className="font-bold text-indigo-650 bg-indigo-50/50 px-1.5 py-0.5 rounded text-[9.5px] shrink-0">{item.distance}</span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <EmptyState>Chưa có kết nối giao thông.</EmptyState>
               )}
             </div>

             <div className="space-y-2 border-t pt-4 border-slate-100/60">
               <SectionTitle>Địa điểm lân cận</SectionTitle>
               {room.nearbyPlaces && room.nearbyPlaces.length > 0 ? (
                 <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                   {room.nearbyPlaces.map((item, index) => (
                     <div key={index} className="flex items-center justify-between text-[11px] text-slate-600">
                       <div className="min-w-0 flex-1 pr-3 truncate">
                         <span className="font-semibold text-slate-800">{item.name}</span>
                         <span className="ml-1.5 text-[9px] text-slate-400 bg-slate-100 border border-slate-200/50 px-1 py-0.2 rounded font-medium">
                           {item.type}
                         </span>
                       </div>
                       <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9.5px] shrink-0">
                         {item.distanceM >= 1000 ? `${(item.distanceM / 1000).toFixed(1)} km` : `${item.distanceM} m`}
                       </span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <EmptyState>Chưa có địa điểm lân cận.</EmptyState>
               )}
             </div>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-slate-50 px-4 py-3 sm:px-5">
          <div className="text-xs text-slate-500">Thông tin chi tiết dùng để đối tác kiểm tra hồ sơ trước khi gửi duyệt hoặc cập nhật.</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            Đóng
          </button>
        </div>
      </div>

      {selectedRoomPrice && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onClick={() => setSelectedRoomPrice(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 bg-slate-50/20">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedRoomPrice.label}</h3>
                <div className="mt-0.5 text-sm font-extrabold text-primary">{fmtVnd(selectedRoomPrice.pricePerNight)} <span className="text-[10px] text-slate-400 font-semibold">/ đêm</span></div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomPrice(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Đóng chi tiết loại phòng"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5">
              {selectedRoomPrice.imageUrls.length > 0 && (
                <div>
                  {selectedRoomPrice.imageUrls.length === 1 && (
                    <div className="overflow-hidden rounded-lg border border-slate-200/50 bg-slate-50 shadow-xs">
                      <img src={selectedRoomPrice.imageUrls[0]} alt={selectedRoomPrice.label} className="h-60 w-full object-cover" />
                    </div>
                  )}
                  {selectedRoomPrice.imageUrls.length === 2 && (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedRoomPrice.imageUrls.map((url, idx) => (
                        <div key={idx} className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200/50 bg-slate-50 shadow-xs">
                          <img src={url} alt={selectedRoomPrice.label} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedRoomPrice.imageUrls.length >= 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-2">
                      <div className="overflow-hidden rounded-lg border border-slate-200/50 bg-slate-50 shadow-xs">
                        <img src={selectedRoomPrice.imageUrls[0]} alt={selectedRoomPrice.label} className="h-56 md:h-[260px] w-full object-cover" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                        <div className="overflow-hidden rounded-lg border border-slate-200/50 bg-slate-50 shadow-xs h-[110px] md:h-[126px]">
                          <img src={selectedRoomPrice.imageUrls[1]} alt={selectedRoomPrice.label} className="h-full w-full object-cover" />
                        </div>
                        <div className="overflow-hidden rounded-lg border border-slate-200/50 bg-slate-50 shadow-xs h-[110px] md:h-[126px]">
                          <img src={selectedRoomPrice.imageUrls[2] || selectedRoomPrice.imageUrls[0]} alt={selectedRoomPrice.label} className="h-full w-full object-cover" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
                <InfoTile label="Diện tích" value={selectedRoomPrice.area ? `${selectedRoomPrice.area} m²` : "-"} />
                <InfoTile label="Sức chứa" value={selectedRoomPrice.capacity ? `${selectedRoomPrice.capacity} khách` : "-"} />
                <InfoTile label="Số lượng" value={selectedRoomPrice.totalInventory ?? 0} />
                <InfoTile label="Giường" value={selectedRoomPrice.bedInfo || "-"} />
              </div>

              {selectedRoomPrice.amenities && (
                <div className="space-y-2 border-t pt-4 border-slate-100">
                  <SectionTitle>Tiện ích phòng</SectionTitle>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedRoomPrice.amenities.split(",").map((item) => (
                      <span key={item} className="rounded bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-650">
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
