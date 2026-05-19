// Controllers/UsersController.cs
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
public class UsersController : ControllerBase
{
    private readonly IUserService _service;
    private readonly IMapper _mapper;

    public UsersController(IUserService service, IMapper mapper)
    {
        _service = service;
        _mapper = mapper;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll([FromQuery] string? search = null, [FromQuery] int? limit = null)
    {
        var users = await _service.GetAllAsync(search, limit);
        return Ok(_mapper.Map<IEnumerable<UserResponseDto>>(users));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponseDto>> Get(long id)
    {
        var user = await _service.GetByIdAsync(id);
        if (user == null) return NotFound();
        return Ok(_mapper.Map<UserResponseDto>(user));
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponseDto>> Create([FromBody] UserCreateDto dto)
    {
        var user = _mapper.Map<User>(dto);
        user.PasswordHash = dto.Password;
        var created = await _service.CreateAsync(user);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, _mapper.Map<UserResponseDto>(created));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UserResponseDto>> Update(long id, [FromBody] UserCreateDto dto)
    {
        var user = _mapper.Map<User>(dto);
        user.PasswordHash = dto.Password;
        var updated = await _service.UpdateAsync(id, user);
        if (updated == null) return NotFound();
        return Ok(_mapper.Map<UserResponseDto>(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var result = await _service.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}
