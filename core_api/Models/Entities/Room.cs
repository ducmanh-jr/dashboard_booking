// Models/Entities/Room.cs
using System.Collections.Generic;

namespace Nowayhome.CoreApi.Models.Entities;

public class Room
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public long PartnerId { get; set; }
    public Partner? Partner { get; set; }
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
