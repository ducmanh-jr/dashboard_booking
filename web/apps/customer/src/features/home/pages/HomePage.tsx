import { SearchBox } from "@/shared/components/SearchBox";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

export function HomePage() {
  return (
    <div>
      <section className="border-b bg-secondary">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <div className="grid md:grid-cols-[1fr_360px] gap-6 items-center">
            <div className="space-y-5">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-normal">Đặt phòng khách sạn nhanh và gọn</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">Nhập điểm đến, ngày ở và số khách. Web chỉ hiển thị khách sạn đã được admin duyệt active.</p>
              </div>
              <SearchBox />
            </div>
            <img src={fallbackImage} alt="Khách sạn" className="hidden md:block w-full aspect-[4/3] object-cover rounded-lg border" />
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-8 grid gap-3 md:grid-cols-3">
        {["Tìm phòng nhanh", "Giá rõ ràng", "Thanh toán tại khách sạn"].map((item) => (
          <div key={item} className="bg-card border rounded-lg p-4">
            <div className="font-semibold">{item}</div>
            <div className="text-sm text-muted-foreground mt-1">Thiết kế tối giản để khách đặt phòng không bị rối.</div>
          </div>
        ))}
      </section>
    </div>
  );
}
