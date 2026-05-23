// Controllers/RoomsController.cs
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
public class RoomsController : ControllerBase
{
    private readonly IRoomService _service;
    private readonly IMapper _mapper;

    public RoomsController(IRoomService service, IMapper mapper)
    {
        _service = service;
        _mapper = mapper;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<RoomResponseDto>>> GetAll([FromQuery] string? search = null, [FromQuery] int? limit = null)
    {
        var rooms = await _service.GetAllAsync(search, limit);
        return Ok(_mapper.Map<IEnumerable<RoomResponseDto>>(rooms));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<RoomResponseDto>> Get(long id)
    {
        var room = await _service.GetByIdAsync(id);
        if (room == null) return NotFound();
        return Ok(_mapper.Map<RoomResponseDto>(room));
    }

    [HttpPost]
    public async Task<ActionResult<RoomResponseDto>> Create([FromBody] RoomCreateDto dto)
    {
        var room = _mapper.Map<Room>(dto);
        var created = await _service.CreateAsync(room);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, _mapper.Map<RoomResponseDto>(created));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<RoomResponseDto>> Update(long id, [FromBody] RoomCreateDto dto)
    {
        var room = _mapper.Map<Room>(dto);
        var updated = await _service.UpdateAsync(id, room);
        if (updated == null) return NotFound();
        return Ok(_mapper.Map<RoomResponseDto>(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var result = await _service.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}
