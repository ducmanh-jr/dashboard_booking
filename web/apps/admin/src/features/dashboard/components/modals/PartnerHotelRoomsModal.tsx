import { useState, useEffect, useRef } from "react";
import { fetchPartnerRooms } from "../../../../api/partnersApi";
import { deleteRoom } from "../../../../api/roomsApi";
import { Room, RoomChangeRequest } from "../../../../shared/types";
import { RoomEditModal } from "./RoomEditModal";

function fmtVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function RequestPayloadPreview({ request }: { request: RoomChangeRequest | null }) {
  if (!request) return null;
  if (request.action === "delete") {
    return (
      <div className="mt-4 border rounded-lg p-4 bg-amber-50 border-amber-200 text-sm text-amber-800">
        Đối tác đã gửi yêu cầu xóa phòng này.
      </div>
    );
  }

  const payload = request.payload || {};
  const prices = Array.isArray(payload.prices) ? payload.prices : [];
  const amenities = Array.isArray(payload.amenities) ? payload.amenities : [];
  const nearbyPlaces = Array.isArray(payload.nearbyPlaces) ? payload.nearbyPlaces : [];

  return (
    <div className="mt-4 border rounded-lg p-4 space-y-3">
      <div className="font-semibold">Nội dung đối tác gửi để duyệt</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Tên:</span> {payload.name || "-"}</div>
        <div><span className="text-muted-foreground">Loại:</span> {payload.roomType || "-"}</div>
        <div><span className="text-muted-foreground">Sức chứa:</span> {payload.capacity || "-"}</div>
        <div><span className="text-muted-foreground">Diện tích:</span> {payload.area ?? "-"} m²</div>
        <div><span className="text-muted-foreground">Phí nền tảng:</span> {payload.platformFeePct ?? "-"}%</div>
        <div><span className="text-muted-foreground">Khuyến mãi:</span> {payload.promotionPct ?? "-"}%</div>
        <div className="col-span-2"><span className="text-muted-foreground">Địa chỉ:</span> {payload.address || "-"}</div>
      </div>
      {payload.description && <div className="text-sm text-muted-foreground">{payload.description}</div>}
      <div>
        <div className="text-sm font-medium mb-1">Danh sách phòng mới</div>
        <div className="space-y-3">
          {prices.length === 0 && <div className="text-sm text-muted-foreground">Không có dữ liệu phòng</div>}
          {prices.map((price: any, index: number) => (
            <div key={index} className="border rounded-md p-3 bg-muted/10">
              <div className="flex justify-between font-medium text-sm">
                <span>{price.label}</span>
                <span className="text-primary font-semibold">{fmtVnd(Number(price.pricePerNight) || 0)}/đêm</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground mt-2 border-t pt-2">
                <div>• Diện tích: {price.area || "-"} m2</div>
                <div>• Sức chứa: {price.capacity || "-"} người</div>
                {price.amenities && <div className="col-span-2 italic">• Tiện ích: {price.amenities.split(",").filter((a: string) => !a.toLowerCase().includes("agoda source")).join(", ")}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Tiện ích</div>
        <div className="flex flex-wrap gap-1">
          {amenities.length === 0 && <span className="text-sm text-muted-foreground">Không có</span>}
          {amenities.reduce((acc: React.ReactNode[], item: string, index: number) => {
            if (!item.toLowerCase().includes("agoda source")) {
              acc.push(<span key={index} className="text-xs px-2 py-0.5 rounded bg-secondary">{item}</span>);
            }
            return acc;
          }, [])}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Địa điểm lân cận ({nearbyPlaces.length})</div>
        <ul className="text-xs space-y-0.5 max-h-40 overflow-y-auto">
          {nearbyPlaces.map((place: any, index: number) => (
            <li key={index}>• {place.name} <span className="text-muted-foreground">({place.type}, {place.distanceM}m)</span></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Điểm nổi bật</div>
        <div className="flex flex-wrap gap-1">
          {(payload.highlights || []).length === 0 && <span className="text-sm text-muted-foreground">Không có</span>}
          {(payload.highlights || [])
            .filter((item: string) => !item.toLowerCase().includes("agoda source"))
            .map((item: string, index: number) => <span key={index} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{item}</span>)}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Kết nối giao thông</div>
        <ul className="text-xs space-y-1">
          {(payload.transportConnections || []).length === 0 && <li className="text-muted-foreground">Không có dữ liệu</li>}
          {(payload.transportConnections || []).map((tc: any, index: number) => (
            <li key={index}>• <span className="font-medium">{tc.name}</span>: {tc.distance} {tc.note && <span className="text-muted-foreground italic">({tc.note})</span>}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PartnerHotelRoomsModal({ partner, onClose }: { partner: any; onClose: () => void }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const result = await fetchPartnerRooms(partner.id);
      setList(result.rooms);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeRoom(room: any) {
    if (!confirm(`Xóa khách sạn "${room.name}"?`)) return;
    try {
      await deleteRoom(room.id);
      await load();
      setDetail(null);
    } catch (error: any) {
      alert(error.message);
    }
  }

  useEffect(() => {
    load();
  }, [partner]);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 pt-10 z-50 overflow-y-auto" 
        onClick={onClose}
        role="button"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div 
          className="bg-card border rounded-lg p-6 w-full max-w-5xl my-8" 
          onClick={e => e.stopPropagation()}
          role="presentation"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Khách sạn của {partner.fullName}</h3>
            <button onClick={onClose} className="px-3 py-1.5 rounded-md border">Đóng</button>
          </div>
          {err && <div className="text-sm text-destructive mb-2">{err}</div>}
          {loading ? (
            <div className="text-muted-foreground">Đang tải...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-left sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5">Khách sạn</th>
                  <th className="px-4 py-2.5">Hạng sao</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5">Giá thấp nhất</th>
                  <th className="px-4 py-2.5">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Không có dữ liệu</td></tr>
                )}
                {list.map(room => {
                  const minPrice = room.prices.length ? Math.min(...room.prices.map((p: any) => p.pricePerNight)) : 0;
                  return (
                    <tr key={room.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{room.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{room.roomType.includes("sao") ? room.roomType : `${room.roomType} sao`}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{room.status}</span>
                      </td>
                      <td className="px-4 py-3">{fmtVnd(minPrice)}</td>
                      <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                        <button onClick={() => { setDetail(room); }} className="px-2 py-1 text-xs rounded border hover:bg-accent">Chi tiết</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detail && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 pt-10 z-[60] overflow-y-auto" 
          onClick={() => setDetail(null)}
          role="button"
          tabIndex={-1}
          onKeyDown={(e) => e.key === "Escape" && setDetail(null)}
        >
          <div 
            className="bg-card border rounded-lg w-full max-w-6xl my-8 flex flex-col h-[85vh] overflow-hidden shadow-2xl" 
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <div className="p-6 border-b shrink-0 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-primary">{detail.name}</h3>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <span>{detail.city || detail.partnerHotelName}</span>
                  <span>•</span>
                  <span>{detail.roomType.includes("sao") ? detail.roomType : `${detail.roomType} sao`}</span>
                </div>
              </div>
              <div className="flex gap-3">
                {!detail.pendingRequest && (
                  <>
                    <button onClick={() => { setEditing(detail); setDetail(null); }} className="px-3 py-1.5 rounded-md border text-sm hover:bg-accent">Sửa</button>
                    <button onClick={() => removeRoom(detail)} className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm">Xóa</button>
                  </>
                )}
                <button onClick={() => setDetail(null)} className="p-2 hover:bg-accent rounded-full">
                  <span className="text-xl leading-none">×</span>
                </button>
              </div>
            </div>

            <div className="flex border-b overflow-x-auto no-scrollbar bg-card shrink-0 px-2 items-center justify-between">
              <div className="flex">
                {[
                  { id: "overview", label: "Tổng quan" },
                  { id: "rooms", label: "Phòng nghỉ" },
                  { id: "facilities", label: "Cơ sở vật chất" },
                  { id: "location", label: "Vị trí" },
                  { id: "policy", label: "Chính sách" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      const el = document.getElementById(`modal-sec-${tab.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="px-5 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                Về đầu trang ^
              </button>
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto p-6 space-y-12 scroll-smooth">
              <section id="modal-sec-overview" className="space-y-6">
                <h4 className="text-lg font-semibold border-b pb-2 text-primary">Tổng quan</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-muted/10 text-center">
                    <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Đối tác</div>
                    <div className="font-semibold text-primary truncate">{detail.partnerEmail}</div>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/10 text-center">
                    <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Trạng thái</div>
                    <div className="font-semibold text-primary">{detail.pendingRequest ? "Đang có yêu cầu" : detail.status}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-sm">Mô tả khách sạn</h5>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{detail.description || "Chưa có mô tả"}</p>
                </div>

                {detail.highlights && detail.highlights.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-sm">Điểm nổi bật</h5>
                    <div className="flex flex-wrap gap-2">
                      {detail.highlights
                        .filter((h: string) => !h.toLowerCase().includes("agoda source"))
                        .map((item: string, index: number) => (
                          <span key={index} className="text-xs px-3 py-1.5 rounded-full border bg-card shadow-sm">
                            {item}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h5 className="font-semibold text-sm">Ảnh khách sạn ({detail.images?.length || 0})</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detail.images.map((img: any, index: number) => (
                      <div key={index} className="aspect-video rounded-lg overflow-hidden border group relative">
                        <img src={img.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <span className="text-[10px] text-white bg-black/40 px-2 py-0.5 rounded">{img.category || "Khác"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {detail.pendingRequest && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-semibold mb-2">Dự kiến thay đổi (Yêu cầu mới):</div>
                    <RequestPayloadPreview request={detail.pendingRequest} />
                  </div>
                )}
              </section>

              <section id="modal-sec-rooms" className="space-y-6">
                <h4 className="text-lg font-semibold border-b pb-2 text-primary">Phòng nghỉ</h4>
                <div className="grid gap-4">
                  {detail.prices.map((price: any, index: number) => (
                    <div key={index} className="border rounded-lg overflow-hidden hover:border-primary transition-all shadow-sm bg-card flex flex-col md:flex-row group">
                      {(price.imageUrls?.length > 0 || price.imageUrl) && (
                        <div className="md:w-64 aspect-video md:aspect-square shrink-0 border-b md:border-b-0 md:border-r overflow-hidden bg-muted/10 relative">
                          <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
                            {(price.imageUrls?.length > 0 ? price.imageUrls : [price.imageUrl]).map((url: string, uIdx: number) => (
                              <img key={uIdx} src={url} alt={price.label} className="w-full h-full object-cover shrink-0 snap-start transition-transform duration-500 group-hover:scale-105" />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-semibold text-lg group-hover:text-primary transition-colors">{price.label}</h5>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">Diện tích: {price.area || "-"} m2</span>
                                <span className="flex items-center gap-1">Tối đa: {price.capacity || "-"} người</span>
                                {price.bedInfo && <span className="text-primary font-medium flex items-center gap-1">Giường: {price.bedInfo}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-primary font-semibold text-lg">{fmtVnd(price.pricePerNight)}</div>
                              <div className="text-[10px] text-muted-foreground">/ đêm</div>
                            </div>
                          </div>
                          {price.amenities && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {price.amenities.split(",").filter((a: string) => !a.toLowerCase().includes("agoda source")).map((a: string, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                  {a.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section id="modal-sec-facilities" className="space-y-6">
                <h4 className="text-lg font-semibold border-b pb-2 text-primary">Cơ sở vật chất</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {detail.amenities
                    .filter((a: string) => !a.toLowerCase().includes("agoda source"))
                    .map((item: string, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-4 rounded-lg border bg-muted/10 shadow-sm hover:border-primary/20 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                        <span className="text-sm font-medium">{item}</span>
                      </div>
                    ))}
                </div>
              </section>

              <section id="modal-sec-location" className="space-y-8">
                <h4 className="text-lg font-semibold border-b pb-2 text-primary">Vị trí</h4>
                <div className="space-y-4">
                  <h5 className="font-semibold text-xl">{detail.city || "Vị trí khách sạn"}</h5>
                  <p className="text-muted-foreground text-sm">{detail.address}</p>
                  <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                    <div className="px-3 py-1 rounded border">Lat: {detail.latitude}</div>
                    <div className="px-3 py-1 rounded border">Long: {detail.longitude}</div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-xl text-foreground">Đi đâu gần đây</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <h6 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2">Giao thông & Tiện ích</h6>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {detail.nearbyPlaces.filter((p: any) => ["Sân bay", "Ga tàu", "Bến xe", "Y tế", "Nhà thuốc", "Ngân hàng", "ATM", "Cây xăng", "Chợ", "TTTM", "Siêu thị", "Tiện lợi"].includes(p.type)).map((place: any, idx: number) => (
                          <div key={idx} className="flex gap-3">
                            <div>
                              <div className="text-sm font-medium leading-tight">{place.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold tracking-tighter opacity-60">{place.type} · {place.distanceM >= 1000 ? `${(place.distanceM / 1000).toFixed(1)} km` : `${place.distanceM} m`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h6 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2">Địa danh nổi tiếng</h6>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {detail.nearbyPlaces.filter((p: any) => p.type === "Du lịch").map((place: any, idx: number) => (
                          <div key={idx} className="flex gap-3">
                            <div>
                              <div className="text-sm font-medium leading-tight">{place.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold tracking-tighter opacity-60">{place.distanceM >= 1000 ? `${(place.distanceM / 1000).toFixed(1)} km` : `${place.distanceM} m`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h6 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2">Địa danh gần đây</h6>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {detail.nearbyPlaces.filter((p: any) => !["Sân bay", "Ga tàu", "Bến xe", "Y tế", "Nhà thuốc", "Ngân hàng", "ATM", "Cây xăng", "Chợ", "TTTM", "Siêu thị", "Tiện lợi", "Du lịch"].includes(p.type)).map((place: any, idx: number) => (
                          <div key={idx} className="flex gap-3">
                            <div>
                              <div className="text-sm font-medium leading-tight">{place.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold tracking-tighter opacity-60">{place.type} · {place.distanceM >= 1000 ? `${(place.distanceM / 1000).toFixed(1)} km` : `${place.distanceM} m`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="modal-sec-policy" className="space-y-6 pb-10">
                <h4 className="text-lg font-semibold border-b pb-2 text-primary">Chính sách</h4>
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/10">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Giờ nhận phòng</div>
                      <div className="font-medium">{detail.policy.checkInTime || "--:--"}</div>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/10">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Giờ trả phòng</div>
                      <div className="font-medium">{detail.policy.checkOutTime || "--:--"}</div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-lg border flex items-center justify-between">
                      <span className="font-medium">Hoàn tiền</span>
                      <span className={`text-xs font-semibold ${detail.policy.refundable ? "text-green-600" : "text-destructive"}`}>
                        {detail.policy.refundable ? "CÓ" : "KHÔNG"}
                      </span>
                    </div>
                    <div className="p-4 rounded-lg border flex items-center justify-between">
                      <span className="font-medium">Vật nuôi</span>
                      <span className={`text-xs font-semibold ${detail.policy.petAllowed ? "text-green-600" : "text-destructive"}`}>
                        {detail.policy.petAllowed ? "CHO PHÉP" : "KHÔNG"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <RoomEditModal
          room={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { await load(); }}
        />
      )}
    </>
  );
}






