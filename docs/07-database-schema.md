# 7. Database Schema

[← Kembali ke Daftar Isi](./README.md)

---

## 7.1 Daftar Tabel (26 Model)

| Kategori | Model | Deskripsi |
|----------|-------|-----------|
| **User & Auth** | `User` | Data pengguna (email, password hash, Google ID, admin flag, ban status) |
| **Tim** | `Team` | Data tim kerja |
| | `TeamMember` | Keanggotaan tim (relasi user-team dengan role) |
| | `TeamInvitation` | Undangan bergabung ke tim |
| **Proyek** | `Project` | Proyek dalam tim |
| | `ProjectMember` | Keanggotaan proyek |
| **Tugas** | `Task` | Tugas/task dengan status, prioritas, estimasi |
| | `TaskAssignee` | Penugasan pengguna ke tugas |
| | `Label` | Label/tag untuk kategorisasi tugas |
| | `TaskLabel` | Relasi tugas-label (many-to-many) |
| | `TaskDependency` | Dependensi antar tugas |
| | `TaskComment` | Komentar pada tugas |
| | `TaskActivity` | Log aktivitas/perubahan pada tugas |
| **AI** | `UserAIKey` | API key AI pengguna (terenkripsi AES-256-GCM) |
| | `AIUsageLog` | Log penggunaan AI (token, biaya, provider) |
| | `AiChat` | Sesi chat AI |
| | `AiChatMessage` | Pesan dalam chat AI |
| **Brainstorm** | `BrainstormSession` | Sesi brainstorming AI |
| | `BrainstormMessage` | Pesan dalam sesi brainstorm |
| **Perencanaan** | `SprintPlan` | Rencana sprint |
| | `Goal` | Objektif/target |
| | `CalendarEvent` | Event kalender |
| **Konten** | `Note` | Catatan |
| | `NoteHistory` | Riwayat versi catatan |
| | `Diagram` | Data diagram visual |
| | `Discussion` | Thread diskusi |
| | `DiscussionReply` | Balasan diskusi |
| **Sistem** | `Notification` | Notifikasi pengguna |
| | `SystemSetting` | Pengaturan sistem (key-value per kategori) |

---

## 7.2 Enum yang Digunakan

| Enum | Nilai | Digunakan Pada |
|------|-------|---------------|
| `TeamRole` | OWNER, ADMIN, MEMBER | TeamMember, TeamInvitation, ProjectMember |
| `InvitationStatus` | PENDING, ACCEPTED, EXPIRED, REVOKED | TeamInvitation |
| `AIProviderEnum` | OPENAI, CLAUDE, GEMINI, GROQ, MISTRAL, DEEPSEEK, OPENROUTER, OLLAMA, COPILOT, CUSTOM | UserAIKey |
| `BrainstormMode` | BRAINSTORM, DEBATE, ANALYSIS, FREEFORM | BrainstormSession |
| `MessageRole` | USER, ASSISTANT, SYSTEM | BrainstormMessage, AiChatMessage |
| `TaskStatus` | TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED | Task |
| `TaskPriority` | URGENT, HIGH, MEDIUM, LOW | Task |
| `SprintStatus` | DRAFT, ACTIVE, COMPLETED, ARCHIVED | SprintPlan |
| `DiagramType` | ERD, FLOWCHART, ARCHITECTURE, SEQUENCE, MINDMAP, USERFLOW, FREEFORM, COMPONENT | Diagram |
| `EventType` | TASK_DEADLINE, SPRINT_MILESTONE, BRAINSTORM_SESSION, CUSTOM_EVENT, MEETING | CalendarEvent |
| `GoalStatus` | NOT_STARTED, IN_PROGRESS, COMPLETED | Goal |

---

## 7.3 Detail Atribut Per Model

### User
| Atribut | Tipe | Keterangan |
|---------|------|------------|
| id | String (CUID) | Primary Key |
| email | String | Unique, untuk login |
| passwordHash | String? | Hash password (bcrypt), nullable untuk akun Google-only |
| googleId | String? | Unique, ID Google untuk OAuth |
| name | String | Nama pengguna |
| avatarUrl | String? | URL avatar |
| isAdmin | Boolean | Flag admin (default: false) |
| isBanned | Boolean | Flag banned (default: false) |
| banReason | String? | Alasan ban |
| bannedAt | DateTime? | Waktu di-ban |
| createdAt | DateTime | Waktu dibuat |
| updatedAt | DateTime | Waktu terakhir diupdate |

### Team
| Atribut | Tipe | Keterangan |
|---------|------|------------|
| id | String (CUID) | Primary Key |
| name | String | Nama tim |
| description | String? | Deskripsi tim |
| ownerId | String | FK ke User (pemilik tim) |
| createdAt | DateTime | Waktu dibuat |
| updatedAt | DateTime | Waktu terakhir diupdate |

### Task
| Atribut | Tipe | Keterangan |
|---------|------|------------|
| id | String (CUID) | Primary Key |
| teamId | String | FK ke Team |
| projectId | String? | FK ke Project |
| sprintId | String? | FK ke SprintPlan |
| title | String | Judul tugas |
| description | String? | Deskripsi (Text) |
| status | TaskStatus | Status tugas (enum) |
| priority | TaskPriority | Prioritas tugas (enum) |
| startDate | DateTime? | Tanggal mulai |
| dueDate | DateTime? | Tanggal tenggat |
| completedAt | DateTime? | Waktu selesai |
| createdBy | String | FK ke User (pembuat) |
| estimation | Int? | Estimasi waktu (menit) |
| timeSpent | Int? | Waktu yang dihabiskan (menit) |
| orderIndex | Int | Urutan di board (default: 0) |
| createdAt | DateTime | Waktu dibuat |
| updatedAt | DateTime | Waktu terakhir diupdate |

### BrainstormSession
| Atribut | Tipe | Keterangan |
|---------|------|------------|
| id | String (CUID) | Primary Key |
| teamId | String | FK ke Team |
| projectId | String? | FK ke Project |
| createdBy | String | FK ke User |
| title | String | Judul sesi |
| mode | BrainstormMode | Mode brainstorm (enum) |
| context | String? | Konteks/deskripsi (Text) |
| isActive | Boolean | Status aktif (default: true) |
| whiteboardData | Json? | Data whiteboard canvas |
| flowData | Json? | Data flow canvas |
| createdAt | DateTime | Waktu dibuat |
| updatedAt | DateTime | Waktu terakhir diupdate |

### BrainstormMessage
| Atribut | Tipe | Keterangan |
|---------|------|------------|
| id | String (CUID) | Primary Key |
| sessionId | String | FK ke BrainstormSession |
| userId | String? | FK ke User (null untuk AI) |
| role | MessageRole | Peran pengirim (USER/ASSISTANT/SYSTEM) |
| content | String | Isi pesan (Text) |
| isPinned | Boolean | Apakah di-pin (default: false) |
| fileUrl | String? | URL file lampiran |
| fileName | String? | Nama file |
| fileType | String? | Tipe file |
| isEdited | Boolean | Apakah sudah diedit (default: false) |

---

[← Sebelumnya: Halaman Web](./06-halaman-web.md) | [Selanjutnya: Autentikasi & Keamanan →](./08-autentikasi-keamanan.md)
