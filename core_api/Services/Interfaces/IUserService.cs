using System.Collections.Generic;
using System.Threading.Tasks;
using Nowayhome.CoreApi.Models.Entities;

namespace Nowayhome.CoreApi.Services.Interfaces;

public interface IUserService
{
    Task<IEnumerable<User>> GetAllAsync(string? search = null, int? limit = null);
    Task<User?> GetByIdAsync(long id);
    Task<User> CreateAsync(User user);
    Task<User?> UpdateAsync(long id, User user);
    Task<bool> DeleteAsync(long id);
}

public interface IPartnerService
{
    Task<IEnumerable<Partner>> GetAllAsync();
    Task<Partner?> GetByIdAsync(long id);
    Task<Partner> CreateAsync(Partner partner);
    Task<Partner?> UpdateAsync(long id, Partner partner);
    Task<bool> DeleteAsync(long id);
}

public interface IRoomService
{
    Task<IEnumerable<Room>> GetAllAsync(string? search = null, int? limit = null);
    Task<Room?> GetByIdAsync(long id);
    Task<Room> CreateAsync(Room room);
    Task<Room?> UpdateAsync(long id, Room room);
    Task<bool> DeleteAsync(long id);
}

public interface IBookingService
{
    Task<IEnumerable<Booking>> GetAllAsync(int? limit = null);
    Task<Booking?> GetByIdAsync(long id);
    Task<Booking> CreateAsync(Booking booking);
    Task<Booking?> UpdateAsync(long id, Booking booking);
    Task<bool> DeleteAsync(long id);
}
