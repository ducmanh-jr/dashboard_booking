// Models/Entities/Partner.cs
using System.Collections.Generic;

namespace Nowayhome.CoreApi.Models.Entities;

public class Partner
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ICollection<Room> Rooms { get; set; } = new List<Room>();
}
