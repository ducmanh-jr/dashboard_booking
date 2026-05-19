using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nowayhome.CoreApi.Data;
using Nowayhome.CoreApi.Models.Entities;
using Nowayhome.CoreApi.Services.Interfaces;

namespace Nowayhome.CoreApi.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    public UserService(AppDbContext context) => _context = context;

    public async Task<User> CreateAsync(User user)
    {
        if (!string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);
        }
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var entity = await _context.Users.FindAsync(id);
        if (entity == null) return false;
        _context.Users.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<User>> GetAllAsync(string? search = null, int? limit = null)
    {
        var query = _context.Users.AsNoTracking().AsQueryable();
        
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u => u.Username.Contains(search) || u.Email.Contains(search));
        }
        
        if (limit.HasValue && limit.Value > 0)
        {
            query = query.Take(limit.Value);
        }
        
        return await query.ToListAsync();
    }

    public async Task<User?> GetByIdAsync(long id) => await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);

    public async Task<User?> UpdateAsync(long id, User user)
    {
        var existing = await _context.Users.FindAsync(id);
        if (existing == null) return null;
        existing.Username = user.Username;
        existing.Email = user.Email;
        if (!string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);
        }
        existing.Role = user.Role;
        await _context.SaveChangesAsync();
        return existing;
    }
}
