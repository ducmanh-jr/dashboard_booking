const fs = require('fs');

const dataStr = fs.readFileSync('src/mocks/hotels.js', 'utf8');

// Use regex to find the exported array and evaluate it safely
const match = dataStr.match(/export const hotelsMockData = (\[[\s\S]*\]);/);
if (!match) {
  console.log("Could not parse data");
  process.exit(1);
}

// We can just use a regex replace or evaluate it. Since the file contains a JS object array, 
// the easiest way is to modify the objects and rewrite.
// Actually, since there are comments inside, let's just do a series of regex replacements on each object block,
// or we can stringify a new array and format it.

// Let's require the module first (needs to be transpiled or we can just require if it's node compatible, but it has ES6 export).
// So let's convert `export const` to `module.exports` temporarily.
fs.writeFileSync('temp_hotels.cjs', dataStr.replace('export const hotelsMockData', 'module.exports.hotelsMockData'));
const hotels = require('./temp_hotels.cjs').hotelsMockData;

const paymentOptionsList = ["Hủy miễn phí", "Thanh toán tại nơi ở", "Đặt trước trả tiền sau", "Thanh toán ngay", "Không cần thẻ tín dụng"];
const bedTypesList = ["Giường đôi lớn", "Giường đơn lớn", "Hai giường đơn", "Giường tầng", "Giường đơn 1 người"];

const randElements = (arr, max) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * max) + 1);
};

hotels.forEach(h => {
  // Add payment options
  h.paymentOptions = randElements(paymentOptionsList, 3);
  
  // Add distances
  h.distanceToBeach = parseFloat((Math.random() * 5).toFixed(1)); // Usually hotels are within 5km, but let's say up to 20km
  h.distanceToCenter = parseFloat((Math.random() * 15).toFixed(1));
  
  // Add guest rating
  // Typically 5-10
  h.guestRating = parseFloat(((Math.random() * 4) + 6).toFixed(1)); 

  // Area
  let area = "Khác";
  if (h.location.includes("Bãi Cháy")) area = "Bãi Cháy";
  else if (h.location.includes("Tuần Châu")) area = "Tuần Châu";
  else if (h.location.includes("Hòn Gai") || h.location.includes("Đảo Rều")) area = "Hòn Gai";
  else if (h.location.includes("Sơn Trà")) area = "Sơn Trà";
  else if (h.location.includes("Ngũ Hành Sơn")) area = "Ngũ Hành Sơn";
  else if (h.location.includes("Hải Châu")) area = "Hải Châu";
  h.area = area;

  // Bed types
  h.bedTypes = randElements(bedTypesList, 2);
});

// Now we need to stringify and write back, preserving the overall structure.
// Since JSON.stringify will lose comments, it's a bit sad, but it will work perfectly.
const newContent = `// === hotels.js - Dữ liệu giả lập (mock data) các khách sạn ===
// Chứa danh sách khách sạn
// Dữ liệu này được sử dụng bởi: SearchResults, RoomDetail, Payment

export const hotelsMockData = ${JSON.stringify(hotels, null, 2)};
`;

fs.writeFileSync('src/mocks/hotels.js', newContent);
fs.unlinkSync('temp_hotels.cjs');
console.log("Done");
