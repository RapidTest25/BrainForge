# Activity Diagram — Diagram (AI-Powered Diagramming)

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

> Fitur **Diagram** memungkinkan user membuat diagram secara manual atau di-generate otomatis oleh AI. Mendukung 8 tipe diagram dan terintegrasi dengan editor **draw.io** untuk editing visual. AI menghasilkan nodes dan edges yang langsung bisa diedit di draw.io.

```mermaid
flowchart TD
    A([Mulai]) --> B["User buka halaman /diagrams"]
    B --> C["Fetch daftar diagram
    GET /teams/:teamId/diagrams"]
    C --> D["Tampilkan daftar diagram
    dengan thumbnail, tipe, waktu"]
    
    D --> E{"Aksi yang dipilih?"}
    
    E -->|Buat Manual| F["Klik tombol New Diagram"]
    F --> G["Dialog Create Diagram:
    Input title, pilih type,
    input description opsional"]
    G --> G1{"Pilih tipe diagram"}
    G1 -->|Flowchart| G2["Process flows dan decisions"]
    G1 -->|ERD| G3["Database relationships"]
    G1 -->|Mind Map| G4["Brainstorm dan organize"]
    G1 -->|Architecture| G5["System design"]
    G1 -->|Sequence| G6["Interaction flows"]
    G1 -->|Component| G7["Module structure"]
    G1 -->|Userflow| G8["User journey flow"]
    G1 -->|Freeform| G9["Diagram bebas"]
    
    G2 --> H["POST /teams/:teamId/diagrams
    title, type, description"]
    G3 --> H
    G4 --> H
    G5 --> H
    G6 --> H
    G7 --> H
    G8 --> H
    G9 --> H
    
    H --> I["Backend: prisma.diagram.create
    data kosong: nodes dan edges empty"]
    I --> J["Buka editor draw.io"]
    
    E -->|AI Generate| K["Klik tombol AI Generate"]
    K --> L["Dialog AI Generate:
    Input title, pilih type,
    tulis deskripsi prompt"]
    L --> M["Pilih AI Provider dan Model"]
    M --> N["POST /teams/:teamId/diagrams/ai-generate
    provider, model, title, prompt, type"]
    
    N --> O["Backend: Bangun system prompt
    khusus per tipe diagram"]
    O --> P["Kirim ke AI Provider:
    system prompt + user prompt"]
    P --> Q["AI menghasilkan JSON:
    nodes array + edges array"]
    Q --> R{"Parse JSON berhasil?"}
    
    R -->|Ya| S["Simpan diagram ke database
    prisma.diagram.create
    dengan data nodes dan edges"]
    R -->|Tidak| T["Error: AI Parse Error
    Tampilkan pesan error"]
    T --> E
    
    S --> J
    
    E -->|Buka Existing| U["Klik diagram dari daftar"]
    U --> V["Fetch detail diagram
    GET /diagrams/:diagramId"]
    V --> J
    
    J --> W["Load draw.io editor via iframe
    embed.diagrams.net"]
    W --> X{"Format data diagram?"}
    
    X -->|XML format| Y["Load XML ke draw.io"]
    X -->|Legacy nodes dan edges| Z["Convert nodes+edges
    ke draw.io XML format"]
    Z --> Y
    X -->|Data kosong| AA["Editor kosong siap pakai"]
    
    Y --> AB["User edit diagram
    di draw.io editor"]
    AA --> AB
    
    AB --> AC{"Aksi di editor?"}
    
    AC -->|Save| AD["draw.io kirim event save
    dengan XML data"]
    AD --> AE["PATCH /diagrams/:diagramId
    data: xml string"]
    AE --> AF["Backend: Update diagram
    prisma.diagram.update"]
    AF --> AG["Toast: Diagram saved"]
    AG --> AB
    
    AC -->|Exit| AH["draw.io kirim event exit"]
    AH --> D
    
    AC -->|Delete| AI["Klik tombol delete"]
    AI --> AJ["Dialog konfirmasi delete"]
    AJ -->|Konfirmasi| AK["DELETE /diagrams/:diagramId"]
    AK --> AL["Backend: prisma.diagram.delete"]
    AL --> D
    AJ -->|Batal| AB
    
    E -->|Search| AM["Filter diagram by title"]
    AM --> D
    
    E -->|Selesai| AN([Selesai])
```

---

### Penjelasan Alur

| Langkah | Deskripsi |
|---------|-----------|
| 1 | User membuka halaman `/diagrams` dan melihat daftar semua diagram di team/project |
| 2 | User bisa membuat diagram manual baru, generate dengan AI, atau membuka diagram existing |
| 3 | **Manual**: User mengisi title, memilih tipe (8 opsi), dan deskripsi opsional → diagram kosong dibuat |
| 4 | **AI Generate**: User mengisi prompt deskripsi → AI menghasilkan nodes dan edges dalam format JSON |
| 5 | AI menggunakan **system prompt khusus** per tipe diagram (aturan posisi, label, edge berbeda per tipe) |
| 6 | Diagram dibuka di editor **draw.io** (embed via iframe) dengan dukungan dark mode |
| 7 | Data legacy (nodes/edges JSON) otomatis dikonversi ke format draw.io XML |
| 8 | User bisa edit visual di draw.io, lalu save → data XML disimpan ke database |
| 9 | User bisa delete diagram dengan konfirmasi dialog |

### Tipe Diagram yang Didukung

| Tipe | Deskripsi | Aturan AI |
|------|-----------|-----------|
| **FLOWCHART** | Process flows dan decisions | Posisi top-to-bottom, decision node berakhir "?", edge label: Yes/No |
| **ERD** | Entity Relationship Diagram | Setiap node = tabel DB, description = daftar kolom, edge label: 1:N, 1:1, N:M |
| **MINDMAP** | Brainstorm dan organize | Node central di tengah, branch radiate outward, radius 200px dan 350px |
| **ARCHITECTURE** | System design | Nodes = services/layers, posisi logical layers: top=presentation, bottom=data |
| **SEQUENCE** | Interaction flows | Nodes horizontal di y:30, edges = messages: POST, SELECT, 200 OK |
| **COMPONENT** | Module structure | Nodes = software modules, edge labels: uses, implements, depends on |
| **USERFLOW** | User journey flow | Alur perjalanan pengguna dalam sistem |
| **FREEFORM** | Diagram bebas | Tidak ada aturan khusus, bentuk bebas |

### Integrasi draw.io

| Event | Arah | Deskripsi |
|-------|------|-----------|
| `configure` | draw.io → App | Editor minta konfigurasi theme (dark/light) |
| `init` | draw.io → App | Editor siap, app kirim data diagram (XML) |
| `load` | App → draw.io | App mengirim XML untuk ditampilkan di editor |
| `save` | draw.io → App | User save di editor, app simpan XML ke backend |
| `status` | App → draw.io | App konfirmasi save berhasil ke editor |
| `exit` | draw.io → App | User keluar dari editor, kembali ke daftar |

### API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/teams/:teamId/diagrams` | Daftar semua diagram (optional: projectId) |
| `POST` | `/teams/:teamId/diagrams` | Buat diagram manual baru |
| `GET` | `/teams/:teamId/diagrams/:diagramId` | Detail diagram + data |
| `PATCH` | `/teams/:teamId/diagrams/:diagramId` | Update diagram (title, data XML) |
| `DELETE` | `/teams/:teamId/diagrams/:diagramId` | Hapus diagram |
| `POST` | `/teams/:teamId/diagrams/ai-generate` | Generate diagram dengan AI |

### Format Data Diagram

```json
{
  "nodes": [
    {
      "id": "1",
      "type": "default",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Node Name",
        "description": "Optional description"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "label": "relationship"
    }
  ]
}
```

Setelah user edit di draw.io, data disimpan dalam format XML:

```json
{
  "xml": "<mxGraphModel><root>...</root></mxGraphModel>"
}
```

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
