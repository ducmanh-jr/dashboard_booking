// Mappings/MappingProfile.cs
using AutoMapper;
using Nowayhome.CoreApi.Models.DTOs;
using Nowayhome.CoreApi.Models.Entities;

namespace Nowayhome.CoreApi.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // User
        CreateMap<User, UserResponseDto>();
        CreateMap<UserCreateDto, User>();
        // Partner
        CreateMap<Partner, PartnerResponseDto>();
        CreateMap<PartnerCreateDto, Partner>();
        // Room
        CreateMap<Room, RoomResponseDto>();
        CreateMap<RoomCreateDto, Room>();
        // Booking
        CreateMap<Booking, BookingResponseDto>();
        CreateMap<BookingCreateDto, Booking>();
    }
}
