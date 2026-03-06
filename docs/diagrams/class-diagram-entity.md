# Class Diagram — Database Entity

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

> Diagram ini menampilkan model utama beserta atribut dan relasi. Untuk keterbacaan, ditampilkan model-model inti.

```mermaid
classDiagram
    class User {
        +String id (CUID)
        +String email
        +String name
        +String? password
        +String? googleId
        +String? avatar
        +Boolean isAdmin
        +Boolean isBanned
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Team {
        +String id (CUID)
        +String name
        +String? description
        +String? logo
        +String ownerId
        +DateTime createdAt
    }

    class TeamMember {
        +String id (CUID)
        +String teamId
        +String userId
        +TeamRole role
        +DateTime joinedAt
    }

    class Project {
        +String id (CUID)
        +String name
        +String? description
        +String? color
        +String? icon
        +String teamId
        +String createdById
        +DateTime createdAt
    }

    class Task {
        +String id (CUID)
        +String title
        +String? description
        +TaskStatus status
        +TaskPriority priority
        +Int orderIndex
        +DateTime? dueDate
        +DateTime? startDate
        +String projectId
        +String? parentId
        +String createdById
    }

    class TaskLabel {
        +String id (CUID)
        +String name
        +String color
        +String projectId
    }

    class TaskComment {
        +String id (CUID)
        +String content
        +String taskId
        +String userId
        +DateTime createdAt
    }

    class BrainstormSession {
        +String id (CUID)
        +String title
        +BrainstormMode mode
        +String? systemPrompt
        +Json? whiteboardData
        +Json? flowData
        +String projectId
        +String createdById
    }

    class BrainstormMessage {
        +String id (CUID)
        +String content
        +MessageRole role
        +Boolean isPinned
        +String? fileUrl
        +String sessionId
        +String? userId
    }

    class Diagram {
        +String id (CUID)
        +String title
        +DiagramType type
        +String content
        +String projectId
        +String createdById
    }

    class Sprint {
        +String id (CUID)
        +String name
        +String? goal
        +SprintStatus status
        +DateTime startDate
        +DateTime endDate
        +String projectId
    }

    class SprintTask {
        +String id (CUID)
        +String title
        +SprintTaskStatus status
        +Int storyPoints
        +String sprintId
    }

    class Note {
        +String id (CUID)
        +String title
        +String content
        +String projectId
        +String createdById
    }

    class NoteVersion {
        +String id (CUID)
        +String title
        +String content
        +Int version
        +String noteId
    }

    class CalendarEvent {
        +String id (CUID)
        +String title
        +String? description
        +DateTime startDate
        +DateTime? endDate
        +String? color
        +Boolean isAllDay
        +String projectId
    }

    class Goal {
        +String id (CUID)
        +String title
        +String? description
        +GoalStatus status
        +GoalPriority priority
        +Int progress
        +String projectId
    }

    class Discussion {
        +String id (CUID)
        +String title
        +String content
        +String? category
        +Boolean isPinned
        +String projectId
        +String createdById
    }

    class AiKey {
        +String id (CUID)
        +String provider
        +String encryptedKey
        +String? label
        +Boolean isActive
        +String userId
        +String teamId
    }

    class AiUsageLog {
        +String id (CUID)
        +String provider
        +String model
        +String feature
        +Int tokensUsed
        +Float? cost
        +String userId
        +String teamId
    }

    class AIChat {
        +String id (CUID)
        +String title
        +String userId
        +String teamId
    }

    class AIChatMessage {
        +String id (CUID)
        +String content
        +MessageRole role
        +String? provider
        +String? model
        +String chatId
    }

    User "1" --> "*" TeamMember : memiliki
    User "1" --> "*" Team : membuat (owner)
    Team "1" --> "*" TeamMember : memiliki
    Team "1" --> "*" Project : memiliki
    Project "1" --> "*" Task : memiliki
    Project "1" --> "*" BrainstormSession : memiliki
    Project "1" --> "*" Diagram : memiliki
    Project "1" --> "*" Sprint : memiliki
    Project "1" --> "*" Note : memiliki
    Project "1" --> "*" CalendarEvent : memiliki
    Project "1" --> "*" Goal : memiliki
    Project "1" --> "*" Discussion : memiliki
    Task "1" --> "*" TaskComment : memiliki
    Task "*" --> "*" TaskLabel : many-to-many
    Task "1" --> "*" Task : subtask (parentId)
    BrainstormSession "1" --> "*" BrainstormMessage : memiliki
    Sprint "1" --> "*" SprintTask : memiliki
    Note "1" --> "*" NoteVersion : memiliki
    User "1" --> "*" AiKey : memiliki
    User "1" --> "*" AiUsageLog : memiliki
    User "1" --> "*" AIChat : memiliki
    AIChat "1" --> "*" AIChatMessage : memiliki
```

---

### Penjelasan

| Model | Deskripsi |
|-------|-----------|
| **User** | Model utama pengguna. Menyimpan kredensial, status admin/ban. |
| **Team** | Tim kerja yang dibuat oleh User (owner). |
| **TeamMember** | Relasi many-to-many User ↔ Team dengan role (OWNER/ADMIN/MEMBER). |
| **Project** | Proyek di bawah team. Container untuk task, brainstorm, diagram, dll. |
| **Task** | Tugas/task dengan status Kanban, prioritas, dan subtask support. |
| **BrainstormSession** | Sesi brainstorm AI dengan whiteboard dan flow data. |
| **BrainstormMessage** | Pesan dalam sesi brainstorm (user atau AI). |
| **Diagram** | Diagram visual (8 tipe: flowchart, sequence, erd, dll). |
| **Sprint** | Sprint planning dengan periode waktu. |
| **SprintTask** | Task di dalam sprint dengan story points. |
| **Note** | Catatan dengan version history support. |
| **CalendarEvent** | Event kalender. |
| **Goal** | Objektif/goal dengan progress tracking. |
| **Discussion** | Thread diskusi dalam proyek. |
| **AiKey** | API key terenkripsi (BYOK) per user per team. |
| **AiUsageLog** | Log penggunaan AI (provider, model, token, cost). |
| **AIChat** | Sesi AI chat mandiri (di luar brainstorm). |
| **AIChatMessage** | Pesan dalam sesi AI chat. |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
