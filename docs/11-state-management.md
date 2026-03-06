# 11. State Management

[← Kembali ke Daftar Isi](./README.md)

---

## 11.1 Zustand Stores (Client-side State)

| Store | Key State | Deskripsi |
|-------|-----------|-----------|
| `useAuthStore` | `user`, `tokens`, `isAuthenticated` | Menyimpan data autentikasi. Persistensi via localStorage (`brainforge_tokens`, `brainforge_user`). Menangani hidrasi JWT, pengecekan expiry, login/logout. |
| `useTeamStore` | `teams`, `activeTeam` | Menyimpan pilihan tim aktif. Persisten ke localStorage. Otomatis memilih tim pertama. |
| `useProjectStore` | `projects`, `activeProject` | Menyimpan pilihan proyek aktif dalam tim. Persisten ke localStorage. Melacak jumlah (tasks, sessions, diagrams, goals). |

---

## 11.2 Server State (React Query)

TanStack React Query digunakan untuk:
- **Data fetching** — Mengambil data dari API
- **Caching** — Menyimpan cache response API
- **Background refetching** — Memperbarui data secara otomatis
- **Optimistic updates** — Update UI sebelum respons server (misalnya drag & drop task)
- **Query invalidation** — Menghapus cache setelah mutation (buat/update/hapus)

---

[← Sebelumnya: Real-time Socket](./10-realtime-socket.md) | [Selanjutnya: Infrastruktur & Deployment →](./12-infrastruktur-deployment.md)
