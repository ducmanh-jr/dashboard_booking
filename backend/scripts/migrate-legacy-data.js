const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU LEGACY ---');
  
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    }
  });

  console.log(`Tìm thấy tổng cộng ${properties.length} khách sạn.`);
  let successCount = 0;
  
  for (const property of properties) {
    const sourceId = property.id.toString();
    
    try {
      // 1. Lấy dữ liệu transport connections từ legacy_source_rows của properties
      const propertyRows = await prisma.$queryRaw`
        SELECT payload
        FROM legacy_source_rows
        WHERE source_table = 'properties'
          AND source_id = ${sourceId}
        LIMIT 1
      `;
      
      let transportConnections = null;
      if (propertyRows.length > 0) {
        const payload = propertyRows[0].payload;
        const propPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const transportJson = propPayload?.transport_connections_json;
        if (transportJson) {
          const parsed = typeof transportJson === 'string' ? JSON.parse(transportJson) : transportJson;
          const rows = Array.isArray(parsed) ? parsed : typeof parsed === 'string' ? parsed.split('|') : [];
          transportConnections = rows
            .map((item) => {
              if (typeof item === 'string') {
                const [name, distance] = item.split(':').map((part) => part.trim());
                return name ? { name, distance: distance || '' } : null;
              }
              if (item && typeof item === 'object') {
                return {
                  name: String(item.name || ''),
                  distance: String(item.distance || ''),
                };
              }
              return null;
            })
            .filter(Boolean);
        }
      }
      
      // 2. Lấy dữ liệu nearby places từ legacy_source_rows của property_nearby_places
      const nearbyRows = await prisma.$queryRaw`
        SELECT payload
        FROM legacy_source_rows
        WHERE source_table = 'property_nearby_places'
          AND payload->>'property_id' = ${sourceId}
        ORDER BY (payload->>'distance_m')::int ASC NULLS LAST
      `;
      
      let nearbyPlaces = null;
      if (nearbyRows.length > 0) {
        nearbyPlaces = nearbyRows
          .map((row) => {
            const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
            const name = payload?.name;
            if (!name) return null;
            
            const distanceM = Number(payload.distance_m ?? payload.distanceM ?? 0);
            const distanceText = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)}km` : `${distanceM}m`;
            
            return {
              name,
              type: payload.category || payload.type || 'poi',
              distanceM,
              distance: distanceText,
              lat: Number(payload.latitude ?? payload.lat ?? 0),
              lon: Number(payload.longitude ?? payload.lon ?? 0),
            };
          })
          .filter(Boolean);
      }
      
      // 3. Cập nhật vào bảng properties nếu có dữ liệu
      if (transportConnections || nearbyPlaces) {
        await prisma.property.update({
          where: { id: property.id },
          data: {
            transportConnections: transportConnections || undefined,
            nearbyPlaces: nearbyPlaces || undefined,
          }
        });
        successCount++;
        if (successCount % 50 === 0 || successCount === 1) {
          console.log(`[Đang chạy] Đã cập nhật xong ${successCount}/${properties.length} khách sạn...`);
        }
      }
    } catch (e) {
      console.error(`Lỗi khi đồng bộ khách sạn ID ${sourceId} (${property.name}):`, e);
    }
  }

  console.log(`--- ĐỒNG BỘ HOÀN TẤT ---`);
  console.log(`Đã cập nhật thành công: ${successCount}/${properties.length} khách sạn.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
