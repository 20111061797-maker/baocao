# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY backend/ProductionDashboard.Api.csproj ./backend/
RUN dotnet restore ./backend/ProductionDashboard.Api.csproj

# Copy backend source and publish
COPY backend/ ./backend/
RUN dotnet publish ./backend/ProductionDashboard.Api.csproj -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Copy published binaries
COPY --from=build /app/publish .

# Copy factory Excel files for automatic seeder initialization
COPY "Bao_Cao_Tong_Hop_San_Luong_Nhan_Luc_NG (1).xlsx" /app/
COPY "KIỂM KÊ D6(1111).xlsx" /app/
COPY "KiemKe_VatTu_D6_2026-10-08.xlsx" /app/

ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ProductionDashboard.Api.dll"]
