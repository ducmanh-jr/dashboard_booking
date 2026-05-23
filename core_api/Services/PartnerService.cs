using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nowayhome.CoreApi.Data;
using Nowayhome.CoreApi.Models.Entities;
using Nowayhome.CoreApi.Services.Interfaces;

namespace Nowayhome.CoreApi.Services;

public class PartnerService : IPartnerService
{
    private readonly AppDbContext _context;
    public PartnerService(AppDbContext context) => _context = context;

    public async Task<Partner> CreateAsync(Partner partner)
    {
        _context.Partners.Add(partner);
        await _context.SaveChangesAsync();
        return partner;
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var entity = await _context.Partners.FindAsync(id);
        if (entity == null) return false;
        _context.Partners.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Partner>> GetAllAsync() => await _context.Partners.AsNoTracking().ToListAsync();

    public async Task<Partner?> GetByIdAsync(long id) => await _context.Partners.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Partner?> UpdateAsync(long id, Partner partner)
    {
        var existing = await _context.Partners.FindAsync(id);
        if (existing == null) return null;
        existing.Name = partner.Name;
        await _context.SaveChangesAsync();
        return existing;
    }
}
