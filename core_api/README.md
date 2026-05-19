# Nowayhome Core API

Welcome to the production-ready **ASP.NET Core Web API** built with **.NET 10** for the **Nowayhome Booking Dashboard**! 

This Web API strictly follows all technical requirements and is fully integrated with Entity Framework Core, SQL Server, JWT Authentication, and a modern **Scalar API Reference UI** (replacing legacy Swashbuckle/Swagger).

---

## 🚀 Key Features
- **Modern .NET 10 Stack**: Utilizes the latest C# features, top-level statements, and native OpenAPI document generation.
- **Secure Password Hashing**: Utilizes industry-standard `BCrypt.Net` to safely hash passwords.
- **Relational Domain Models**: Real models mapped using EF Core Fluent API for `Users`, `Partners`, `Rooms`, and `Bookings`.
- **JWT Authentication**: Secure REST endpoints protected via Token Bearer authentication.
- **Scalar API Reference UI**: Out-of-the-box beautiful, dark-mode-first interactive API documentation at `/scalar/v1`.
- **High-Quality Test Suite**: Standard-compliant unit & integration testing with `xUnit` and `Moq`.
- **Dockerized Ready**: Fully configured `Dockerfile` and `docker-compose.yml` to spin up SQL Server 2022 and the API automatically.
- **CI/CD Pipeline**: GitHub Actions workflow (`ci.yml`) to automatically restore, build, test, and publish images.

---

## 🛠️ Getting Started

### 1. Requirements
Ensure you have the following installed:
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/) (optional, for localized container deployment)

---

### 2. Configuration & Secrets
Edit `core_api/appsettings.json` or define environment variables to configure key settings:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=NowayhomeDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  },
  "Jwt": {
    "Key": "SuperSecretKeyForDevelopmentOnlyChangeInProduction",
    "Issuer": "NowayhomeIssuer",
    "Audience": "NowayhomeAudience",
    "ExpiresInMinutes": 60
  }
}
```

---

### 3. Spin Up Local DB & Run API (Via Docker Compose)
The easiest way to start both SQL Server and the API is using Docker Compose:
```bash
# Start SQL Server and Web API
docker-compose up --build -d
```
The API will be available at `http://localhost:8080` with the Scalar UI API documentation at `http://localhost:8080/scalar/v1`.

---

### 4. Running Migrations Locally (EF Core CLI)
If you prefer running the app locally outside containerization and have SQL Server/LocalDB running on your host machine:
```bash
# Apply EF Core migrations to update local database schema
dotnet ef database update -p core_api/core_api.csproj -s core_api/core_api.csproj
```

---

### 5. Running the Application
To run the API project:
```bash
dotnet run --project core_api/core_api.csproj
```
Access the interactive API explorer at:
`http://localhost:5242/scalar/v1` (or your configured launch port).

---

### 6. Running Unit & Integration Tests
We have fully tested our models and services with a dedicated test project using in-memory databases and mocks. Run the following command:
```bash
dotnet test
```

---

## 📂 Project Structure
```
├── .github/workflows/ci.yml    # CI/CD pipeline
├── core_api/
│   ├── Controllers/            # Auth, Users, Partners, Rooms, Bookings REST endpoints
│   ├── Data/                   # AppDbContext and relationships config
│   ├── Mappings/               # AutoMapper DTO profiles
│   ├── Models/
│   │   ├── Entities/           # Relational EF Core database entities
│   │   └── DTOs/               # Input/Output DTO models (AllDtos.cs)
│   ├── Services/               # Core business services & interfaces
│   ├── Migrations/             # EF Core Migration files
│   ├── Program.cs              # Native .NET 10 Pipeline configuration
│   ├── Dockerfile              # Docker compilation and deployment stages
│   └── appsettings.json        # DB Connections and JWT secrets
├── core_api.Tests/             # xUnit + Moq testing project
└── docker-compose.yml          # Container configuration for DB and App
```

---

## 🔒 Security Practices
- **Password Protection**: Passwords are securely hashed with a salt factor using `BCrypt`. Plain text passwords are **never** stored in the database.
- **REST Validation**: Controller inputs use DTOs to restrict direct Entity model mutation.
- **Endpoint Protection**: Use `[Authorize]` attributes to limit controller access to authenticated users only.
