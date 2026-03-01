export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ApiError(res.status, `HTTP_${res.status}`, body || res.statusText);
    }
    return res;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof TypeError) throw new NetworkError('네트워크 연결을 확인해주세요.');
    throw err;
  }
}
