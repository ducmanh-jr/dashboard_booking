// Controllers/PartnersController.cs
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
public class PartnersController : ControllerBase
{
    private readonly IPartnerService _service;
    private readonly IMapper _mapper;

    public PartnersController(IPartnerService service, IMapper mapper)
    {
        _service = service;
        _mapper = mapper;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<PartnerResponseDto>>> GetAll()
    {
        var partners = await _service.GetAllAsync();
        return Ok(_mapper.Map<IEnumerable<PartnerResponseDto>>(partners));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<PartnerResponseDto>> Get(long id)
    {
        var partner = await _service.GetByIdAsync(id);
        if (partner == null) return NotFound();
        return Ok(_mapper.Map<PartnerResponseDto>(partner));
    }

    [HttpPost]
    public async Task<ActionResult<PartnerResponseDto>> Create([FromBody] PartnerCreateDto dto)
    {
        var partner = _mapper.Map<Partner>(dto);
        var created = await _service.CreateAsync(partner);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, _mapper.Map<PartnerResponseDto>(created));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PartnerResponseDto>> Update(long id, [FromBody] PartnerCreateDto dto)
    {
        var partner = _mapper.Map<Partner>(dto);
        var updated = await _service.UpdateAsync(id, partner);
        if (updated == null) return NotFound();
        return Ok(_mapper.Map<PartnerResponseDto>(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var result = await _service.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}
