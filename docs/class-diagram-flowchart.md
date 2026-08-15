# Class Diagram dan Flowchart

Dokumen ini disusun dari struktur folder dan kode sumber project PanganTerkini. Karena sebagian besar backend memakai pola functional module Express, class diagram berikut memetakan entity database, DTO/shared types, service object, helper, dan client class yang benar-benar ada di folder project.

## Struktur Folder Utama

```text
apps/
  web/                  Next.js PWA untuk pengguna, petani, dan pembeli
  admin/                Vite React dashboard admin
  mobile/               Skeleton Flutter mobile dan offline sync
services/
  api/                  Express API, Prisma, domain routes, auth, harga
  realtime/             Socket.IO gateway lelang
  worker/               BullMQ worker untuk job async
  scraper/              FastAPI scraper Bapanas dan PIHPS
  ml-anomaly/           FastAPI microservice deteksi anomali
packages/
  shared-types/         DTO dan shared contract
  validation/           Zod schema validasi request
  config/               Komoditas, kecamatan, threshold anomali
  ui/                   Helper UI ringan
infra/
  nginx/                Reverse proxy
  prometheus/           Monitoring config
  grafana/              Dashboard placeholder
```

## Class Diagram Domain

```mermaid
classDiagram
direction LR

class UserRole {
  <<enumeration>>
  PETANI
  TENGKULAK
  ADMIN
  PENYULUH
}

class VerificationStatus {
  <<enumeration>>
  PENDING
  OTP_VERIFIED
  GAPOKTAN_VERIFIED
  KTP_VERIFIED
  KTP_REJECTED
}

class PriceSource {
  <<enumeration>>
  WEB
  WHATSAPP
  MOBILE
  SCRAPER
  ADMIN
}

class PriceStatus {
  <<enumeration>>
  LOW
  NORMAL
  HIGH
  INSUFFICIENT_DATA
}

class AuctionStatus {
  <<enumeration>>
  DRAFT
  OPEN
  CLOSED
  CANCELLED
}

class User {
  +String id
  +String name
  +String username
  +String phone
  +String email
  +UserRole role
  +VerificationStatus verificationStatus
  +String gapoktanId
  +DateTime createdAt
  +DateTime updatedAt
}

class Gapoktan {
  +String id
  +String name
  +String district
  +String village
  +DateTime createdAt
}

class PriceReport {
  +String id
  +String commodity
  +Int pricePerKg
  +Float volumeKg
  +String district
  +String village
  +PriceSource source
  +Decimal latitude
  +Decimal longitude
  +Float zScore
  +PriceStatus status
  +String reporterId
  +DateTime createdAt
}

class PriceReference {
  +String id
  +String commodity
  +Int pricePerKg
  +String source
  +String province
  +String regency
  +DateTime sampledAt
  +DateTime createdAt
}

class Auction {
  +String id
  +String commodity
  +Float quantityKg
  +Int floorPrice
  +String district
  +AuctionStatus status
  +String ownerId
  +DateTime createdAt
  +DateTime closedAt
}

class Bid {
  +String id
  +String auctionId
  +String bidderId
  +Int pricePerKg
  +Float quantityKg
  +DateTime createdAt
}

class Transaction {
  +String id
  +String auctionId
  +String buyerId
  +String sellerId
  +String status
  +Int totalAmount
  +DateTime createdAt
  +DateTime updatedAt
}

class Rating {
  +String id
  +String authorId
  +String targetId
  +Int score
  +String note
  +String performanceLabel
  +String benefitTitle
  +Int benefitValue
  +String benefitStatus
  +DateTime createdAt
}

class Receipt {
  +String id
  +String transactionId
  +String pdfUrl
  +Boolean whatsappSent
  +DateTime createdAt
}

class GroupBuyingOrder {
  +String id
  +String commodity
  +Float targetKg
  +Float committedKg
  +String pickupPoint
  +DateTime deadlineAt
  +String status
  +DateTime createdAt
}

class GroupBuyingCommitment {
  +String id
  +String orderId
  +String buyerId
  +Float kg
  +DateTime createdAt
}

class NotificationLog {
  +String id
  +String channel
  +String target
  +Json payload
  +String status
  +DateTime createdAt
}

Gapoktan "1" --> "0..*" User : memiliki anggota
UserRole ..> User
VerificationStatus ..> User
PriceSource ..> PriceReport
PriceStatus ..> PriceReport
AuctionStatus ..> Auction

User "1" --> "0..*" PriceReport : membuat laporan
User "1" --> "0..*" Auction : membuka lelang
Auction "1" --> "0..*" Bid : menerima bid
User "1" --> "0..*" Bid : mengirim bid
Auction "1" --> "0..1" Transaction : menghasilkan
User "1" --> "0..*" Transaction : buyer
User "1" --> "0..*" Transaction : seller
Transaction "1" --> "0..1" Receipt : punya nota
User "1" --> "0..*" Rating : memberi rating
User "1" --> "0..*" Rating : menerima rating
GroupBuyingOrder "1" --> "0..*" GroupBuyingCommitment : diisi komitmen
User "1" --> "0..*" GroupBuyingCommitment : membuat komitmen
```

## ERD Database

ERD berikut mengikuti model Prisma di `services/api/prisma/schema.prisma`.

```mermaid
erDiagram
  GAPOKTAN ||--o{ USER : memiliki
  USER ||--o{ PRICE_REPORT : membuat
  USER ||--o{ AUCTION : membuka
  AUCTION ||--o{ BID : menerima
  USER ||--o{ BID : mengirim
  AUCTION ||--o| TRANSACTION : menghasilkan
  USER ||--o{ TRANSACTION : membeli
  USER ||--o{ TRANSACTION : menjual
  TRANSACTION ||--o| RECEIPT : memiliki
  USER ||--o{ RATING : memberi
  USER ||--o{ RATING : menerima
  GROUP_BUYING_ORDER ||--o{ GROUP_BUYING_COMMITMENT : berisi
  USER ||--o{ GROUP_BUYING_COMMITMENT : berkomitmen

  USER {
    string id PK
    string name
    string username UK
    string passwordHash
    string phone UK
    string email UK
    string contactMethod
    string ktpImageName
    string ktpImageDataUrl
    string ktpRejectionReason
    string role
    string verificationStatus
    string gapoktanId FK
    datetime createdAt
    datetime updatedAt
  }

  GAPOKTAN {
    string id PK
    string name
    string district
    string village
    datetime createdAt
  }

  PRICE_REPORT {
    string id PK
    string commodity
    int pricePerKg
    float volumeKg
    string district
    string village
    string source
    decimal latitude
    decimal longitude
    float zScore
    string status
    string reporterId FK
    datetime createdAt
  }

  PRICE_REFERENCE {
    string id PK
    string commodity
    int pricePerKg
    string source
    string province
    string regency
    datetime sampledAt
    datetime createdAt
  }

  AUCTION {
    string id PK
    string commodity
    float quantityKg
    int floorPrice
    string district
    string status
    string ownerId FK
    datetime createdAt
    datetime closedAt
  }

  BID {
    string id PK
    string auctionId FK
    string bidderId FK
    int pricePerKg
    float quantityKg
    datetime createdAt
  }

  TRANSACTION {
    string id PK
    string auctionId FK
    string buyerId FK
    string sellerId FK
    string status
    int totalAmount
    datetime createdAt
    datetime updatedAt
  }

  RATING {
    string id PK
    string authorId FK
    string targetId FK
    int score
    string note
    string performanceLabel
    string benefitTitle
    string benefitDescription
    int benefitValue
    string benefitStatus
    datetime createdAt
  }

  RECEIPT {
    string id PK
    string transactionId FK
    string pdfUrl
    boolean whatsappSent
    datetime createdAt
  }

  GROUP_BUYING_ORDER {
    string id PK
    string commodity
    float targetKg
    float committedKg
    string pickupPoint
    datetime deadlineAt
    string status
    datetime createdAt
  }

  GROUP_BUYING_COMMITMENT {
    string id PK
    string orderId FK
    string buyerId FK
    float kg
    datetime createdAt
  }

  NOTIFICATION_LOG {
    string id PK
    string channel
    string target
    json payload
    string status
    datetime createdAt
  }
```

Catatan:

- `PRICE_REFERENCE` berdiri sendiri sebagai tabel referensi harga dari PIHPS/Bapanas.
- `NOTIFICATION_LOG` berdiri sendiri sebagai tabel audit broadcast/notifikasi.
- Kolom bertanda `UK` adalah unique key, sedangkan `FK` adalah foreign key.
- Relasi `AUCTION` ke `TRANSACTION` dan `TRANSACTION` ke `RECEIPT` dibuat satu-ke-satu lewat foreign key yang unik di Prisma.

## Class Diagram Layer Aplikasi

```mermaid
classDiagram
direction TB

class PanganTerkiniApi {
  <<Express app>>
  +health()
  +metrics()
  +mountRoutes()
}

class AuthRoutes {
  <<Router>>
  +requestOtp()
  +verifyOtp()
  +registerPetani()
  +loginPetani()
  +loginAdmin()
  +adminMe()
}

class UsersRoutes {
  <<Router>>
  +me()
  +submitFarmerApplication()
  +listFarmerApplications()
  +approveApplication()
  +rejectApplication()
}

class HargaRoutes {
  <<Router>>
  +listReports()
  +createReport()
  +dashboardStats()
  +referencePrices()
  +syncReferencePrices()
  +heatmap()
}

class FeatureRoutes {
  <<Routers>>
  +anomalyRoutes()
  +earlyWarningRoutes()
  +hppRoutes()
  +lelangRoutes()
  +transaksiRoutes()
  +ratingRoutes()
  +eNotaRoutes()
  +groupBuyingRoutes()
  +notificationRoutes()
  +whatsappRoutes()
}

class HargaRepository {
  <<service object>>
  +listReports()
  +monthlyReportingDashboard()
  +farmerPerformanceForUser()
  +createReport()
  +referencePrices()
  +syncReferencePrices()
  +anomalyForCommodity()
  +heatmap()
  +lowPriceWarnings()
  +dashboardStats()
}

class AnomalyService {
  <<helper>>
  +detectZScore()
  +detectIqr()
  +detectMad()
  +calculateHpp()
}

class AuthTokenService {
  <<helper>>
  +signAuthToken()
  +readBearerToken()
  +verifyAuthToken()
}

class PrismaClient {
  <<database client>>
  +user
  +priceReport
  +priceReference
  +auction
  +bid
  +transaction
  +rating
}

class ValidationSchemas {
  <<Zod schemas>>
  +priceReportSchema
  +hppInputSchema
  +petaniRegisterSchema
  +adminLoginSchema
  +farmerKtpApplicationSchema
  +anomalyDetectSchema
}

class WebApiModule {
  <<Next.js client API>>
  +registerPetani()
  +loginPetani()
  +postPriceReport()
  +getHeatmapPoints()
  +createAuction()
  +createAuctionBid()
  +commitGroupBuyingOrder()
  +getTransactions()
}

class PetaniSessionStore {
  <<browser localStorage>>
  +getStoredPetaniSession()
  +savePetaniSession()
  +clearPetaniSession()
}

class AdminDashboardApp {
  <<React app>>
  +loginAdmin()
  +loadStats()
  +renderVerificationQueue()
  +renderFarmerRatingPanel()
}

class BidService {
  <<Socket.IO service>>
  -Map bids
  +list(auctionId)
  +create(input)
  +winner(auctionId)
}

class AuctionGateway {
  <<Socket.IO gateway>>
  +registerAuctionGateway(io, bidService)
}

class WorkerHandlers {
  <<BullMQ handlers>>
  +syncOfflinePriceDraft()
  +processVideoEvidence()
  +calculateAnomalyJob()
  +sendNotificationJob()
}

class ScraperService {
  <<FastAPI service>>
  +scrapeBapanas()
  +scrapePihps()
  +scrapePihpsReferences()
  +syncPrices()
}

class PriceReference {
  <<Prisma model>>
  +commodity
  +pricePerKg
  +sampledAt
}

class DetectionPayload {
  <<Pydantic model>>
  +list values
  +float value
}

class MlAnomalyService {
  <<FastAPI service>>
  +detect(payload)
  +zscore()
  +iqrStatus()
  +madStatus()
}

class MobileApiClient {
  <<Flutter class>>
  +String baseUrl
  +submitPrice(payload)
}

class PriceDraftStore {
  <<Flutter class>>
  -List drafts
  +save(draft)
  +all()
}

class SyncQueue {
  <<Flutter class>>
  +PriceDraftStore store
  +MobileApiClient apiClient
  +flush()
}

PanganTerkiniApi --> AuthRoutes
PanganTerkiniApi --> UsersRoutes
PanganTerkiniApi --> HargaRoutes
PanganTerkiniApi --> FeatureRoutes
PanganTerkiniApi --> HargaRepository
PanganTerkiniApi --> AuthTokenService
PanganTerkiniApi --> PrismaClient

AuthRoutes --> ValidationSchemas
AuthRoutes --> AuthTokenService
AuthRoutes --> PrismaClient
UsersRoutes --> ValidationSchemas
UsersRoutes --> AuthTokenService
UsersRoutes --> PrismaClient
HargaRoutes --> ValidationSchemas
HargaRoutes --> AuthTokenService
HargaRoutes --> HargaRepository
HargaRepository --> PrismaClient
HargaRepository --> AnomalyService
HargaRepository --> ScraperService
FeatureRoutes --> HargaRepository
FeatureRoutes --> AnomalyService
FeatureRoutes --> AuthTokenService
FeatureRoutes --> PrismaClient

WebApiModule --> PanganTerkiniApi
WebApiModule --> PetaniSessionStore
AdminDashboardApp --> PanganTerkiniApi
AuctionGateway --> BidService
WorkerHandlers --> PrismaClient
ScraperService --> PriceReference
MlAnomalyService --> DetectionPayload
SyncQueue --> PriceDraftStore
SyncQueue --> MobileApiClient
MobileApiClient --> PanganTerkiniApi
```

## Flowchart Arsitektur Folder dan Service

```mermaid
flowchart TD
  subgraph Apps["apps"]
    Web["apps/web<br/>Next.js PWA"]
    Admin["apps/admin<br/>React admin"]
    Mobile["apps/mobile<br/>Flutter skeleton"]
  end

  subgraph Services["services"]
    Api["services/api<br/>Express REST API"]
    Realtime["services/realtime<br/>Socket.IO lelang"]
    Worker["services/worker<br/>BullMQ async jobs"]
    Scraper["services/scraper<br/>FastAPI PIHPS/Bapanas"]
    ML["services/ml-anomaly<br/>FastAPI anomaly"]
  end

  subgraph Packages["packages"]
    SharedTypes["shared-types<br/>DTO contract"]
    Validation["validation<br/>Zod schemas"]
    Config["config<br/>komoditas dan threshold"]
    Ui["ui<br/>helper UI"]
  end

  subgraph Infra["infra dan docker"]
    Nginx["nginx gateway"]
    Postgres["PostgreSQL/PostGIS"]
    Redis["Redis"]
    Minio["MinIO"]
    Monitoring["Prometheus/Grafana"]
  end

  User["Petani / pembeli / admin"] --> Nginx
  Nginx --> Web
  Nginx --> Api
  Nginx --> Realtime
  User --> Mobile
  Admin --> Api
  Web --> Api
  Mobile --> Api
  Web --> Realtime

  Api --> Postgres
  Api --> Redis
  Api --> Scraper
  Api --> Minio
  Worker --> Redis
  Worker --> Postgres
  Worker --> Minio
  Realtime --> Redis
  Scraper --> Postgres

  Api --> SharedTypes
  Api --> Validation
  Api --> Config
  Web --> SharedTypes
  Web --> Ui
  Admin --> SharedTypes
  Monitoring --> Api
```

## Flowchart Verifikasi dan Input Harga Petani

```mermaid
flowchart TD
  Start([Mulai]) --> Register["Pengguna daftar / login"]
  Register --> BaseRole["Akun tersimpan sebagai TENGKULAK atau user non-admin"]
  BaseRole --> SubmitKtp["Ajukan KTP lewat /api/users/me/farmer-application"]
  SubmitKtp --> AdminReview["Admin membuka VerificationQueue"]
  AdminReview --> Decision{KTP valid?}
  Decision -- Tidak --> Reject["Role tetap TENGKULAK<br/>status KTP_REJECTED"]
  Decision -- Ya --> Approve["Role menjadi PETANI<br/>status KTP_VERIFIED"]

  Approve --> InputSource{Sumber input harga}
  InputSource -- Web petani --> WebForm["PriceInputForm"]
  InputSource -- WhatsApp --> WaWebhook["/api/whatsapp/webhook"]
  InputSource -- Mobile sync --> MobileSync["Mobile ApiClient / SyncQueue"]

  WebForm --> ApiReport["POST /api/harga/reports"]
  MobileSync --> ApiReport
  WaWebhook --> RepoCreate["hargaRepository.createReport()"]
  ApiReport --> AuthCheck{Token PETANI<br/>KTP_VERIFIED?}
  AuthCheck -- Tidak --> Denied["401 / 403"]
  AuthCheck -- Ya --> Validate["priceReportSchema"]
  Validate --> RepoCreate

  RepoCreate --> PeerPrices["Ambil 60 harga peer dari PriceReport"]
  RepoCreate --> Reference["Ambil PriceReference PIHPS terbaru"]
  PeerPrices --> Detect["detectZScore + detectIqr + detectMad"]
  Reference --> Detect
  Detect --> Status["Tentukan status LOW / NORMAL / HIGH / INSUFFICIENT_DATA"]
  Status --> Save["Simpan PriceReport ke PostgreSQL"]
  Save --> Response["Kirim response ke client"]
  Save --> Heatmap["GET /api/harga/heatmap"]
  Save --> Warning["GET /api/early-warning"]
  Save --> Points["Poin kinerja dan voucher petani"]
  Response --> End([Selesai])
```

## Flowchart Sinkronisasi Harga Referensi PIHPS

```mermaid
flowchart TD
  Start([Mulai]) --> Trigger{Pemicu}
  Trigger -- Admin/API --> SyncEndpoint["POST /api/harga/reference/sync"]
  Trigger -- Scraper lifespan --> AutoRefresh["PIHPS auto refresh berkala"]

  SyncEndpoint --> ApiRepo["hargaRepository.syncReferencePrices()"]
  ApiRepo --> ForceFetch["GET scraper /scrape/pihps?force=true"]
  AutoRefresh --> ScraperFetch["Scraper ambil data PIHPS/BI"]
  ForceFetch --> ScraperFetch
  ScraperFetch --> Normalize["Normalisasi komoditas, harga, provinsi, kabupaten, sampledAt"]
  Normalize --> Valid{Item valid?}
  Valid -- Tidak --> Skipped["skipped + 1"]
  Valid -- Ya --> Existing{Sudah ada PriceReference<br/>untuk sampledAt yang sama?}
  Existing -- Ya --> Update["Update pricePerKg"]
  Existing -- Tidak --> Create["Create PriceReference"]
  Update --> Result["Return fetched, created, updated, skipped, saved"]
  Create --> Result
  Skipped --> Result
  Result --> ReferenceApi["GET /api/harga/reference membaca data tersimpan<br/>fallback ke cache scraper"]
  ReferenceApi --> End([Selesai])
```

## Flowchart Lelang dan Transaksi

```mermaid
flowchart TD
  Start([Mulai]) --> Farmer["Petani KTP_VERIFIED login"]
  Farmer --> CreateAuction["POST /api/lelang<br/>buat Auction status OPEN"]
  CreateAuction --> ListAuction["GET /api/lelang<br/>Web AuctionTicker menampilkan lelang"]

  Buyer["Pembeli / tengkulak login"] --> Bid["POST /api/lelang/:id/bids"]
  ListAuction --> Bid
  Bid --> ValidateBid{Bid valid dan<br/>lebih tinggi dari harga sekarang?}
  ValidateBid -- Tidak --> BidRejected["422 ditolak"]
  ValidateBid -- Ya --> SaveBid["Simpan Bid ke PostgreSQL"]
  SaveBid --> RefreshAuction["Client refresh daftar bid"]

  RealtimeJoin["Client join Socket.IO room auction:id"] --> SocketBid["auction:bid"]
  SocketBid --> BidService["BidService.create() in-memory"]
  BidService --> Broadcast["Broadcast auction:bid-created"]

  RefreshAuction --> CloseAuction["Petani menutup lelang<br/>POST /api/lelang/:id/close"]
  Broadcast --> CloseSocket["auction:close"]
  CloseAuction --> Winner{Ada bid tertinggi?}
  Winner -- Tidak --> CloseOnly["Auction CLOSED tanpa transaksi"]
  Winner -- Ya --> Transaction["Upsert Transaction<br/>WAITING_CONFIRMATION"]
  Transaction --> Transactions["GET /api/transaksi"]
  Transactions --> Nota["POST /api/e-nota"]
  CloseOnly --> End([Selesai])
  Nota --> End
```

## Flowchart Group Buying

```mermaid
flowchart TD
  Start([Mulai]) --> OpenOrder["POST /api/group-buying<br/>buat GroupBuyingOrder status OPEN"]
  OpenOrder --> ListOrder["GET /api/group-buying"]
  ListOrder --> BuyerCommit["User login commit kg<br/>POST /api/group-buying/:id/commit"]
  BuyerCommit --> Auth{Role TENGKULAK<br/>atau PETANI terverifikasi?}
  Auth -- Tidak --> Denied["401 ditolak"]
  Auth -- Ya --> ValidateKg{kg valid dan target belum penuh?}
  ValidateKg -- Tidak --> Rejected["422 / 404"]
  ValidateKg -- Ya --> CreateCommitment["Create GroupBuyingCommitment"]
  CreateCommitment --> UpdateOrder["Update committedKg"]
  UpdateOrder --> Ready{committedKg >= targetKg?}
  Ready -- Ya --> StatusReady["status READY"]
  Ready -- Tidak --> StatusOpen["status OPEN"]
  StatusReady --> Response["Return order terbaru"]
  StatusOpen --> Response
  Response --> End([Selesai])
```

## Flowchart Admin Monitoring dan Reward Petani

```mermaid
flowchart TD
  Start([Mulai]) --> AdminLogin["POST /api/auth/admin/login"]
  AdminLogin --> Token["Simpan admin token di localStorage"]
  Token --> Dashboard["Admin App load /api/harga/stats"]
  Dashboard --> Queue["VerificationQueue load /api/users/farmer-applications"]
  Dashboard --> RatingPanel["FarmerRatingPanel load /api/rating/farmers"]

  RatingPanel --> MonthlyDashboard["hargaRepository.monthlyReportingDashboard()"]
  MonthlyDashboard --> Reports["Ambil PriceReport bulan berjalan"]
  Reports --> Points["Hitung poin: HIGH=10, NORMAL=8, lainnya=0"]
  Points --> Voucher{Poin >= threshold voucher?}
  Voucher -- Ya --> AutoVoucher["Reward otomatis CONFIRMED"]
  Voucher -- Tidak --> ManualReview["Admin dapat memberi review manual"]
  ManualReview --> CreateRating["POST /api/rating/farmers/:id/reviews"]
  CreateRating --> Notification["Jika ada benefit, create NotificationLog"]
  AutoVoucher --> Response["Dashboard menampilkan performa petani"]
  Notification --> Response
  Response --> End([Selesai])
```
