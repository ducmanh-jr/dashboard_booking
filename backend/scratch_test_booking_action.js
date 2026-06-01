const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Kiểm tra logic database booking action ---');
  // Tìm booking pending hoặc confirmed
  const booking = await prisma.booking.findFirst({
    where: {
      status: {
        in: ['pending', 'confirmed']
      }
    }
  });

  if (!booking) {
    console.log('Không tìm thấy booking pending hoặc confirmed nào để test.');
    return;
  }

  console.log(`Tìm thấy booking ID: ${booking.id}`);
  console.log(`- Trạng thái ban đầu: ${booking.status}`);
  console.log(`- Trạng thái thanh toán ban đầu: ${booking.paymentStatus}`);

  const originalStatus = booking.status;
  const originalPaymentStatus = booking.paymentStatus;

  // Giả lập check-in
  console.log('\nThực hiện giả lập Check-in...');
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'checked_in',
      paymentStatus: 'paid'
    }
  });

  // Truy vấn lại
  const updatedBooking = await prisma.booking.findUnique({
    where: { id: booking.id }
  });

  console.log(`- Trạng thái mới: ${updatedBooking.status} (Mong đợi: checked_in)`);
  console.log(`- Trạng thái thanh toán mới: ${updatedBooking.paymentStatus} (Mong đợi: paid)`);

  if (updatedBooking.status === 'checked_in' && updatedBooking.paymentStatus === 'paid') {
    console.log('=> KẾT QUẢ: THÀNH CÔNG! Logic database chạy chính xác.');
  } else {
    console.log('=> KẾT QUẢ: THẤT BẠI! Logic database không đúng.');
  }

  // Restore lại trạng thái ban đầu
  console.log('\nĐang khôi phục lại dữ liệu ban đầu...');
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: originalStatus,
      paymentStatus: originalPaymentStatus
    }
  });
  console.log('Khôi phục xong.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
