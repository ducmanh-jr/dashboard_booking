// Models/Entities/User.cs
using System;
using System.Collections.Generic;

namespace Nowayhome.CoreApi.Models.Entities;

public class User
{
    public long Id { get; set; }
    public string Uuid { get; set; } = Guid.NewGuid().ToString();
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Customer"; // Admin, Partner, Customer
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
