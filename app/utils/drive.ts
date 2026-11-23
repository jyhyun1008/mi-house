import type { DriveFile } from '~/types/misskey'

/** Upload a file to the owner's drive (multipart; the token goes in the form body). */
export async function uploadDriveFile(host: string, token: string, file: File): Promise<DriveFile> {
  const fd = new FormData()
  fd.append('i', token)
  fd.append('file', file)
  fd.append('name', file.name)
  const res = await fetch(`https://${normalizeHost(host)}/api/drive/files/create`, {
    method: 'POST',
    body: fd,
    redirect: 'error',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(120_000),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error?.message ?? `업로드 실패 (${res.status})`)
  return body as DriveFile
}
