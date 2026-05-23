// Models/Entities/Booking.cs
using System;

namespace Nowayhome.CoreApi.Models.Entities;

public class Booking
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public User? User { get; set; }
    public long RoomId { get; set; }
    public Room? Room { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Confirmed, Cancelled
}
