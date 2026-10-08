# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ProductionDashboard.Api.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish ProductionDashboard.Api.csproj -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

COPY "Bao_Cao_Tong_Hop_San_Luong_Nhan_Luc_NG (1).xlsx" /app/
COPY "KIỂM KÊ D6(1111).xlsx" /app/
COPY "KiemKe_VatTu_D6_2026-10-08.xlsx" /app/

ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ProductionDashboard.Api.dll"]
