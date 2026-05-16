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
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-base font-bold leading-tight text-slate-950">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
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

        <div className="grid min-h-0 lg:grid-cols-[380px_1fr]">
          <aside className="border-b bg-slate-50 lg:border-b-0 lg:border-r">
            <div className="p-4">
              <div className="overflow-hidden rounded-lg border bg-slate-100">
                {hotelFront ? (
                  <img src={hotelFront} alt={room.name} className="h-64 w-full object-cover lg:h-72" />
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm font-bold text-slate-400 lg:h-72">Chưa có ảnh</div>
                )}
              </div>

              {gallery.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {gallery.map((image, index) => (
                    <div key={`${image.url}-${index}`} className="aspect-square overflow-hidden rounded-md border bg-slate-100">
                      <img src={image.url} alt={image.caption || room.name} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div className="flex gap-3 rounded-md border bg-white p-3">
                  <MiniIcon>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10.5h.01" />
                    </svg>
                  </MiniIcon>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Địa chỉ</div>
                    <div className="mt-1 text-sm leading-5 text-slate-700">{room.address}</div>
                  </div>
                </div>

                {qualityHints.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <div className="text-[11px] font-bold uppercase text-amber-800">Gợi ý cải thiện hồ sơ</div>
                    <ul className="mt-2 space-y-1 text-xs text-amber-800">
                      {qualityHints.map((hint) => (
                        <li key={hint}>• {hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="max-h-[calc(100vh-112px)] overflow-y-auto">
            <div className="space-y-6 p-4 sm:p-5">
              {room.pendingRequest && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Khách sạn đang có yêu cầu {room.pendingRequest.action === "delete" ? "xóa" : "cập nhật"} chờ admin duyệt.
                </div>
              )}

              {room.status === "rejected" && room.rejectReason && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Lý do từ chối: {room.rejectReason}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <InfoTile label="Sức chứa" value={`${room.capacity} khách`} />
                <InfoTile label="Diện tích" value={room.area ? `${room.area} m²` : "-"} />
                <InfoTile label="Phí nền tảng" value={`${room.platformFeePct}%`} />
                <InfoTile label="Khuyến mãi" value={fmtPercent(room.promotionPct)} />
              </div>

              <section className="space-y-3">
                <SectionTitle>Giới thiệu</SectionTitle>
                {room.description ? (
                  <div className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                    {room.description}
                  </div>
                ) : (
                  <EmptyState>Chưa có mô tả khách sạn. Nên bổ sung mô tả rõ về vị trí, tiện nghi và trải nghiệm lưu trú.</EmptyState>
                )}
              </section>

              <section className="space-y-3">
                <SectionTitle>Các loại phòng ({room.prices.length})</SectionTitle>
                <div className="grid gap-3">
                  {room.prices.map((price, index) => (
                    <button
                      key={`${price.label}-${index}`}
                      type="button"
                      onClick={() => setSelectedRoomPrice(price)}
                      className="group grid w-full gap-4 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-primary hover:bg-[#fbfbff] sm:grid-cols-[120px_1fr_auto]"
                    >
                      <div className="h-24 overflow-hidden rounded-md border bg-slate-100">
                        {price.imageUrls?.[0] ? (
                          <img src={price.imageUrls[0]} alt={price.label} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[11px] font-bold text-slate-400">Chưa có ảnh</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-base font-bold text-slate-950">{price.label}</h5>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {price.totalInventory ?? 0} phòng
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{price.area || "-"} m²</span>
                          <span>{price.capacity || "-"} khách</span>
                          <span>{price.bedInfo || "Chưa có thông tin giường"}</span>
                        </div>
                        {price.amenities && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {price.amenities.split(",").slice(0, 4).map((item) => (
                              <span key={item} className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
                                {item.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-end justify-between gap-3 sm:block sm:text-right">
                        <div>
                          <div className="text-lg font-bold text-primary">{fmtVnd(price.pricePerNight)}</div>
                          <div className="text-[11px] text-slate-500">/ đêm</div>
                        </div>
                        <div className="mt-3 text-xs font-bold text-primary opacity-80">Xem chi tiết</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <SectionTitle>Tiện ích chung</SectionTitle>
                  {room.amenities.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {room.amenities
                        .filter(a => !a.toLowerCase().includes("agoda source"))
                        .map((item) => (
                          <div key={item} className="rounded-md border bg-white px-3 py-2 text-sm text-slate-700">
                            {item}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <EmptyState>Chưa có tiện ích chung.</EmptyState>
                  )}
                </div>

                <div className="space-y-3">
                  <SectionTitle>Điểm nổi bật</SectionTitle>
                  {room.highlights.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {room.highlights
                        .filter(h => !h.toLowerCase().includes("agoda source"))
                        .map((item) => (
                          <span key={item} className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                            {item}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <EmptyState>Chưa có điểm nổi bật.</EmptyState>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle>Chính sách</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoTile label="Nhận / trả phòng" value={`${room.policy.checkInTime} - ${room.policy.checkOutTime}`} />
                  <InfoTile
                    label="Hủy phòng"
                    value={room.policy.refundable ? "Có hoàn tiền" : "Không hoàn tiền"}
                    hint={room.policy.refundable && room.policy.freeCancelHours ? `Miễn phí trước ${room.policy.freeCancelHours} giờ` : undefined}
                  />
                  <InfoTile
                    label="Quy định"
                    value={`${room.policy.petAllowed ? "Có" : "Không"} thú cưng / ${room.policy.smokingAllowed ? "Có" : "Không"} hút thuốc`}
                  />
                </div>
              </section>
            </div>
          </main>
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
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">{selectedRoomPrice.label}</h3>
                <div className="mt-1 text-sm font-bold text-primary">{fmtVnd(selectedRoomPrice.pricePerNight)} / đêm</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomPrice(null)}
                className="flex h-9 w-9 items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50"
                aria-label="Đóng chi tiết loại phòng"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {selectedRoomPrice.imageUrls.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedRoomPrice.imageUrls.slice(0, 4).map((url, index) => (
                    <div key={`${url}-${index}`} className="aspect-video overflow-hidden rounded-md border bg-slate-100">
                      <img src={url} alt={selectedRoomPrice.label} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <InfoTile label="Diện tích" value={selectedRoomPrice.area ? `${selectedRoomPrice.area} m²` : "-"} />
                <InfoTile label="Sức chứa" value={selectedRoomPrice.capacity ? `${selectedRoomPrice.capacity} khách` : "-"} />
                <InfoTile label="Số lượng" value={selectedRoomPrice.totalInventory ?? 0} />
                <InfoTile label="Giường" value={selectedRoomPrice.bedInfo || "-"} />
              </div>

              {selectedRoomPrice.amenities && (
                <div className="mt-5 space-y-3">
                  <SectionTitle>Tiện ích phòng</SectionTitle>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedRoomPrice.amenities.split(",").map((item) => (
                      <div key={item} className="rounded-md border bg-white px-3 py-2 text-sm text-slate-700">
                        {item.trim()}
                      </div>
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
