# Nowayhome Core API

ASP.NET Core Web API phu tro cho dashboard Nowayhome, cau hinh theo PostgreSQL va EF Core provider `Npgsql.EntityFrameworkCore.PostgreSQL`.

## Chay local

```powershell
cd C:\Users\Admin\ducmanhjr\1.0\can_lam\core_api
docker compose up -d database
dotnet run
```

Connection string mac dinh:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=nowayhome;Username=nowayhome;Password=nowayhome;"
  }
}
```

## Kiem tra

```powershell
dotnet test core_api.Tests\core_api.Tests.csproj
```

API explorer nam tai `/scalar/v1` khi chay moi truong development.
