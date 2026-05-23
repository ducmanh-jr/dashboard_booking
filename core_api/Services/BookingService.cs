using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nowayhome.CoreApi.Data;
using Nowayhome.CoreApi.Models.Entities;
using Nowayhome.CoreApi.Services.Interfaces;

namespace Nowayhome.CoreApi.Services;

public class BookingService : IBookingService
{
    private readonly AppDbContext _context;
    public BookingService(AppDbContext context) => _context = context;

    public async Task<Booking> CreateAsync(Booking booking)
    {
        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();
        return booking;
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var entity = await _context.Bookings.FindAsync(id);
        if (entity == null) return false;
        _context.Bookings.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Booking>> GetAllAsync(int? limit = null)
    {
        var query = _context.Bookings.AsNoTracking().AsQueryable();
        
        if (limit.HasValue && limit.Value > 0)
        {
            query = query.Take(limit.Value);
        }
        
        return await query.ToListAsync();
    }

    public async Task<Booking?> GetByIdAsync(long id) => await _context.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);

    public async Task<Booking?> UpdateAsync(long id, Booking booking)
    {
        var existing = await _context.Bookings.FindAsync(id);
        if (existing == null) return null;
        existing.StartDate = booking.StartDate;
        existing.EndDate = booking.EndDate;
        existing.Status = booking.Status;
        existing.UserId = booking.UserId;
        existing.RoomId = booking.RoomId;
        await _context.SaveChangesAsync();
        return existing;
    }
}
