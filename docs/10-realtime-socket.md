# 10. Real-time Communication (Socket.IO)

[← Kembali ke Daftar Isi](./README.md)

---

## Namespace: `/brainstorm`

### Event Client → Server

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `join-session` | `{ sessionId, user }` | Bergabung ke room brainstorm |
| `leave-session` | `sessionId` | Keluar dari room |
| `whiteboard:draw` | `{ sessionId, element }` | Menggambar elemen di whiteboard |
| `whiteboard:undo` | `{ sessionId }` | Undo aksi terakhir di whiteboard |
| `whiteboard:clear` | `{ sessionId }` | Bersihkan whiteboard |
| `flow:node-add` | `{ sessionId, node }` | Tambah node di flow canvas |
| `flow:node-update` | `{ sessionId, node }` | Update/pindah node di flow |
| `flow:node-delete` | `{ sessionId, nodeId }` | Hapus node di flow |
| `flow:edge-add` | `{ sessionId, edge }` | Tambah edge/koneksi di flow |
| `flow:edge-delete` | `{ sessionId, edgeId }` | Hapus edge di flow |

### Event Server → Client

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `presence:members` | `PresenceMember[]` | Update daftar anggota yang online di room |
| `whiteboard:draw` | `element` | Broadcast aksi gambar ke anggota lain |
| `whiteboard:undo` | — | Broadcast undo ke anggota lain |
| `whiteboard:clear` | — | Broadcast clear ke anggota lain |
| `flow:node-add` | `node` | Broadcast penambahan node |
| `flow:node-update` | `node` | Broadcast perubahan node |
| `flow:node-delete` | `nodeId` | Broadcast penghapusan node |
| `flow:edge-add` | `edge` | Broadcast penambahan edge |
| `flow:edge-delete` | `edgeId` | Broadcast penghapusan edge |

---

[← Sebelumnya: Integrasi AI](./09-integrasi-ai.md) | [Selanjutnya: State Management →](./11-state-management.md)
