using System;

namespace Nowayhome.CoreApi.Models.DTOs;

// Auth DTOs
public class RegisterRequestDto
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "Customer";
}

public class LoginRequestDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

// User DTOs
public class UserResponseDto
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class UserCreateDto
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "Customer";
}

// Partner DTOs
public class PartnerResponseDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class PartnerCreateDto
{
    public string Name { get; set; } = string.Empty;
}

// Room DTOs
public class RoomResponseDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public long PartnerId { get; set; }
}

public class RoomCreateDto
{
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public long PartnerId { get; set; }
}

// Booking DTOs
public class BookingResponseDto
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long RoomId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Pending";
}

public class BookingCreateDto
{
    public long UserId { get; set; }
    public long RoomId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Pending";
}
