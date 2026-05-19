// Controllers/BookingsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using Nowayhome.CoreApi.Models.DTOs;
using Nowayhome.CoreApi.Models.Entities;
using Nowayhome.CoreApi.Services.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Nowayhome.CoreApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _service;
    private readonly IMapper _mapper;

    public BookingsController(IBookingService service, IMapper mapper)
    {
        _service = service;
        _mapper = mapper;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<BookingResponseDto>>> GetAll([FromQuery] int? limit = null)
    {
        var bookings = await _service.GetAllAsync(limit);
        return Ok(_mapper.Map<IEnumerable<BookingResponseDto>>(bookings));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<BookingResponseDto>> Get(long id)
    {
        var booking = await _service.GetByIdAsync(id);
        if (booking == null) return NotFound();
        return Ok(_mapper.Map<BookingResponseDto>(booking));
    }

    [HttpPost]
    public async Task<ActionResult<BookingResponseDto>> Create([FromBody] BookingCreateDto dto)
    {
        var booking = _mapper.Map<Booking>(dto);
        var created = await _service.CreateAsync(booking);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, _mapper.Map<BookingResponseDto>(created));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<BookingResponseDto>> Update(long id, [FromBody] BookingCreateDto dto)
    {
        var booking = _mapper.Map<Booking>(dto);
        var updated = await _service.UpdateAsync(id, booking);
        if (updated == null) return NotFound();
        return Ok(_mapper.Map<BookingResponseDto>(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var result = await _service.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}
