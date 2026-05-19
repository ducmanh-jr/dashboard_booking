using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nowayhome.CoreApi.Data;
using Nowayhome.CoreApi.Models.Entities;
using Nowayhome.CoreApi.Services.Interfaces;

namespace Nowayhome.CoreApi.Services;

public class RoomService : IRoomService
{
    private readonly AppDbContext _context;
    public RoomService(AppDbContext context) => _context = context;

    public async Task<Room> CreateAsync(Room room)
    {
        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();
        return room;
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var entity = await _context.Rooms.FindAsync(id);
        if (entity == null) return false;
        _context.Rooms.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Room>> GetAllAsync(string? search = null, int? limit = null)
    {
        var query = _context.Rooms.AsNoTracking().AsQueryable();
        
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(r => r.Name.Contains(search));
        }
        
        if (limit.HasValue && limit.Value > 0)
        {
            query = query.Take(limit.Value);
        }
        
        return await query.ToListAsync();
    }

    public async Task<Room?> GetByIdAsync(long id) => await _context.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);

    public async Task<Room?> UpdateAsync(long id, Room room)
    {
        var existing = await _context.Rooms.FindAsync(id);
        if (existing == null) return null;
        existing.Name = room.Name;
        existing.Capacity = room.Capacity;
        existing.PartnerId = room.PartnerId;
        await _context.SaveChangesAsync();
        return existing;
    }
}
